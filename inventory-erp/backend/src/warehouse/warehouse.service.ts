import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BranchStoreRequestStatus,
  GrnStatus,
  LedgerRefType,
  PoStatus,
  StockStatus,
  WarehouseTransferStatus,
} from '@prisma/client';

import { CreateGrnDto } from './dto/create-grn.dto';
import { CreatePoDto } from './dto/create-po.dto';
import { IntegrationService } from '../integration/integration.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WarehouseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationService: IntegrationService,
  ) {}

  // ── Warehouse Helpers ─────────────────────────────────────────────────────

  private async getDefaultWarehouse() {
    const warehouse = await this.prisma.warehouse.findFirst({ orderBy: { name: 'asc' } });
    if (!warehouse)
      throw new NotFoundException(
        'No warehouse configured. Please create a Central Warehouse first.',
      );
    return warehouse;
  }

  // ── Overview & Dashboard ──────────────────────────────────────────────────

  async getOverview() {
    const warehouse = await this.getDefaultWarehouse();

    const [
      warehouseStock,
      pendingPos,
      pendingDeliveries,
      pendingGrns,
      pendingStoreRequests,
      pendingTransfers,
      lowStockItems,
      totalInventoryValue,
    ] = await Promise.all([
      this.prisma.warehouseInventory.findMany({
        where: { warehouseId: warehouse.id },
        include: { ingredient: true },
      }),
      this.prisma.purchaseOrder.count({
        where: { status: { in: [PoStatus.DRAFT, PoStatus.PENDING_APPROVAL] } },
      }),
      this.prisma.purchaseOrder.count({
        where: {
          status: {
            in: [
              PoStatus.APPROVED,
              PoStatus.SENT,
              PoStatus.SUPPLIER_CONFIRMED,
              PoStatus.GRN_CREATED,
              PoStatus.RECEIVING,
            ],
          },
        },
      }),
      this.prisma.goodsReceiptNote.count(),
      this.prisma.branchStoreRequest.count({
        where: { status: BranchStoreRequestStatus.PENDING },
      }),
      this.prisma.warehouseTransfer.count({
        where: {
          status: { in: [WarehouseTransferStatus.PENDING, WarehouseTransferStatus.APPROVED] },
        },
      }),
      this.prisma.warehouseInventory.findMany({
        where: { warehouseId: warehouse.id, availableQuantity: { lte: 50 } },
        include: { ingredient: true },
      }),
      this.prisma.warehouseInventory.aggregate({
        where: { warehouseId: warehouse.id },
        _sum: { availableQuantity: true },
      }),
    ]);

    const totalStock = warehouseStock.reduce((sum, item) => sum + item.availableQuantity, 0);

    return {
      warehouse: { id: warehouse.id, name: warehouse.name, location: warehouse.location },
      kpis: {
        totalItems: warehouseStock.length,
        totalStock,
        pendingPurchaseOrders: pendingPos,
        pendingDeliveries,
        pendingGrns,
        pendingStoreRequests,
        pendingDispatches: pendingTransfers,
        lowStockAlerts: lowStockItems.length,
        totalInventoryValue: totalInventoryValue._sum?.availableQuantity ?? 0,
      },
    };
  }

  async getDashboard(warehouseId?: number) {
    const warehouse = await this.getDefaultWarehouse();
    const wid = warehouseId || warehouse.id;
    const warehouseFilter = { warehouseId: wid };

    const [
      warehouseStock,
      pendingPos,
      approvedPos,
      pendingGrns,
      pendingStoreRequests,
      pendingTransfers,
      lowStockItems,
      recentGrns,
      recentLedger,
      recentStoreRequests,
    ] = await Promise.all([
      this.prisma.warehouseInventory.findMany({
        where: warehouseFilter,
        include: { ingredient: { include: { category: true } } },
      }),
      this.prisma.purchaseOrder.count({
        where: { status: { in: [PoStatus.DRAFT, PoStatus.PENDING_APPROVAL] } },
      }),
      this.prisma.purchaseOrder.count({
        where: {
          status: {
            in: [
              PoStatus.APPROVED,
              PoStatus.SENT,
              PoStatus.SUPPLIER_CONFIRMED,
              PoStatus.GRN_CREATED,
              PoStatus.RECEIVING,
            ],
          },
        },
      }),
      this.prisma.goodsReceiptNote.count(),
      this.prisma.branchStoreRequest.count({
        where: { status: BranchStoreRequestStatus.PENDING },
      }),
      this.prisma.warehouseTransfer.count({
        where: {
          status: { in: [WarehouseTransferStatus.PENDING, WarehouseTransferStatus.APPROVED] },
        },
      }),
      this.prisma.warehouseInventory.findMany({
        where: { ...warehouseFilter, availableQuantity: { lte: 50 } },
        include: { ingredient: true },
      }),
      this.prisma.goodsReceiptNote.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          purchaseOrder: { include: { supplier: true } },
          items: { include: { ingredient: true } },
        },
      }),
      this.prisma.stockLedger.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        where: { locationType: 'WAREHOUSE', locationId: wid },
        include: { ingredient: true, user: { select: { name: true } } },
      }),
      this.prisma.branchStoreRequest.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { ingredient: true } },
          requestedBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    const totalStock = warehouseStock.reduce((sum, item) => sum + item.availableQuantity, 0);

    return {
      kpis: {
        totalItems: warehouseStock.length,
        totalStock,
        pendingPurchaseOrders: pendingPos,
        approvedPurchaseOrders: approvedPos,
        pendingGrns,
        pendingStoreRequestsCount: pendingStoreRequests,
        pendingDispatches: pendingTransfers,
        lowStockAlerts: lowStockItems.length,
      },
      lowStockItems: lowStockItems.map((item) => ({
        id: item.id,
        ingredient: item.ingredient.name,
        sku: item.ingredient.sku,
        availableQuantity: item.availableQuantity,
        unit: item.ingredient.unit,
      })),
      recentStock: warehouseStock.slice(0, 10).map((item) => ({
        id: item.id,
        ingredient: item.ingredient.name,
        sku: item.ingredient.sku,
        availableQuantity: item.availableQuantity,
        unit: item.ingredient.unit,
        category: item.ingredient.category?.name,
      })),
      recentGrns: recentGrns.map((grn) => ({
        id: grn.id,
        grnNumber: grn.grnNumber,
        poNumber: grn.purchaseOrder?.poNumber,
        supplier: grn.purchaseOrder?.supplier?.companyName,
        date: grn.receivedDate,
        itemCount: grn.items.length,
      })),
      recentLedger: recentLedger.map((entry) => ({
        id: entry.id,
        ingredient: entry.ingredient?.name,
        quantity: entry.quantity,
        beforeQuantity: entry.beforeQuantity,
        afterQuantity: entry.afterQuantity,
        refType: entry.refType,
        timestamp: entry.timestamp,
        user: entry.user?.name,
      })),
      recentStoreRequests: recentStoreRequests.map((req) => ({
        id: req.id,
        requestNumber: req.requestNumber,
        restaurantId: req.restaurantId,
        status: req.status,
        requestedBy: req.requestedBy?.name,
        itemCount: req.items.length,
        createdAt: req.createdAt,
      })),
    };
  }

  async getInventory(warehouseId?: number) {
    const warehouse = await this.getDefaultWarehouse();
    return this.prisma.warehouseInventory.findMany({
      where: { warehouseId: warehouseId || warehouse.id },
      include: {
        warehouse: true,
        ingredient: { include: { category: true } },
      },
      orderBy: { ingredient: { name: 'asc' } },
    });
  }

  // ── Purchase Orders ───────────────────────────────────────────────────────

  async createPo(userId: number, dto: CreatePoDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (!supplier.isActive) throw new BadRequestException('Supplier is inactive');

    const ingredientIds = dto.items.map((i) => i.ingredientId);
    const existingIngredients = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds } },
      select: { id: true },
    });
    const existingIds = new Set(existingIngredients.map((i) => i.id));
    const missingIds = ingredientIds.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      throw new BadRequestException(`Ingredient(s) not found: ${missingIds.join(', ')}`);
    }

    const prefix = supplier.poPrefix || 'PO';
    const year = new Date().getFullYear();
    const existingCount = await this.prisma.purchaseOrder.count();
    const seq = String(existingCount + 1).padStart(5, '0');
    const poNumber = `${prefix}-${year}-${seq}`;

    let totalAmount = 0;
    const itemsData = dto.items.map((item) => {
      const totalPrice = item.quantity * item.unitPrice;
      totalAmount += totalPrice;
      return {
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice,
      };
    });

    return this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: dto.supplierId,
        status: PoStatus.DRAFT,
        totalAmount,
        notes: dto.notes,
        poDate: new Date(),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        purpose: dto.purpose || 'REPLENISHMENT',
        priority: dto.priority || 'MEDIUM',
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
        paymentTerms: dto.paymentTerms || supplier.paymentTerms,
        createdById: userId,
        items: { create: itemsData },
      },
      include: {
        items: { include: { ingredient: true } },
        supplier: true,
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async checkAndExpirePos() {
    const now = new Date();
    const expired = await this.prisma.purchaseOrder.findMany({
      where: {
        validUntil: { lte: now, not: null },
        status: {
          notIn: [PoStatus.EXPIRED, PoStatus.CLOSED, PoStatus.CANCELLED, PoStatus.REJECTED],
        },
      },
      select: { id: true },
    });
    if (expired.length > 0) {
      await this.prisma.purchaseOrder.updateMany({
        where: { id: { in: expired.map((p) => p.id) } },
        data: { status: PoStatus.EXPIRED, expiredAt: now },
      });
    }
    return { expired: expired.length };
  }

  async getPos() {
    return this.prisma.purchaseOrder.findMany({
      include: {
        items: { include: { ingredient: true } },
        supplier: true,
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
        grns: { select: { id: true, grnNumber: true, items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPo(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: { include: { ingredient: true } },
        supplier: true,
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
        grns: {
          include: { items: { include: { ingredient: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async getPoDocument(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: { ingredient: { include: { category: true, brand: true, tax: true } } },
        },
        supplier: true,
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');

    const warehouse = await this.getDefaultWarehouse();

    const company = {
      name: 'Beas Restaurant Group',
      address: warehouse.location,
      phone: '+91-9876543210',
      email: 'accounts@beasrestaurant.com',
      gstNumber: '27AABCT1234F1Z5',
    };

    const items = po.items.map((item) => {
      const taxRate = item.ingredient.tax?.rate ?? 0;
      const lineTotal = item.quantity * item.unitPrice;
      const taxAmount = lineTotal * (taxRate / 100);
      return {
        sku: item.ingredient.sku,
        name: item.ingredient.name,
        unit: item.ingredient.unit,
        category: item.ingredient.category?.name || '—',
        brand: item.ingredient.brand?.name || '—',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate,
        taxAmount,
        lineTotal,
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const totalTax = items.reduce((sum, i) => sum + i.taxAmount, 0);
    const grandTotal = subtotal + totalTax;

    return {
      company,
      po: {
        id: po.id,
        poNumber: po.poNumber,
        status: po.status,
        poDate: po.poDate,
        orderDate: po.orderDate,
        validUntil: po.validUntil,
        purpose: po.purpose,
        priority: po.priority,
        expectedDeliveryDate: po.expectedDeliveryDate,
        paymentTerms: po.paymentTerms || po.supplier.paymentTerms,
        notes: po.notes,
        createdAt: po.createdAt,
      },
      supplier: {
        companyName: po.supplier.companyName,
        supplierCode: po.supplier.supplierCode,
        contactPerson: po.supplier.contactPerson,
        mobile: po.supplier.mobile,
        email: po.supplier.email,
        address: po.supplier.address,
        gstNumber: po.supplier.gstNumber,
      },
      items,
      totals: { subtotal, totalTax, grandTotal },
      createdBy: po.createdBy,
      approvedBy: po.approvedBy,
    };
  }

  async updatePo(id: number, dto: Partial<CreatePoDto>) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== PoStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT purchase orders can be edited');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.items && dto.items.length > 0) {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

        let totalAmount = 0;
        const itemsData = dto.items.map((item) => {
          const totalPrice = item.quantity * item.unitPrice;
          totalAmount += totalPrice;
          return {
            purchaseOrderId: id,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice,
          };
        });

        await tx.purchaseOrderItem.createMany({ data: itemsData });

        return tx.purchaseOrder.update({
          where: { id },
          data: {
            totalAmount,
            notes: dto.notes ?? po.notes,
            paymentTerms: dto.paymentTerms ?? po.paymentTerms,
            validUntil: dto.validUntil ? new Date(dto.validUntil) : po.validUntil,
            purpose: dto.purpose ?? po.purpose,
            priority: dto.priority ?? po.priority,
            expectedDeliveryDate: dto.expectedDeliveryDate
              ? new Date(dto.expectedDeliveryDate)
              : po.expectedDeliveryDate,
          },
          include: { items: { include: { ingredient: true } }, supplier: true },
        });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          notes: dto.notes ?? po.notes,
          paymentTerms: dto.paymentTerms ?? po.paymentTerms,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : po.validUntil,
          purpose: dto.purpose ?? po.purpose,
          priority: dto.priority ?? po.priority,
          expectedDeliveryDate: dto.expectedDeliveryDate
            ? new Date(dto.expectedDeliveryDate)
            : po.expectedDeliveryDate,
        },
        include: { items: { include: { ingredient: true } }, supplier: true },
      });
    });
  }

  private async checkPoExpiry(po: { id: number; validUntil: Date | null; status: string }) {
    if (po.validUntil && new Date() > po.validUntil && po.status !== PoStatus.EXPIRED) {
      await this.prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: PoStatus.EXPIRED, expiredAt: new Date() },
      });
      throw new BadRequestException(
        'This Purchase Order has expired and cannot be processed further',
      );
    }
    return po;
  }

  async submitPo(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== PoStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT purchase orders can be submitted. Current status: ${po.status}`,
      );
    }
    await this.checkPoExpiry(po);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PoStatus.PENDING_APPROVAL, submittedAt: new Date() },
    });
  }

  async approvePo(id: number, userId: number) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== PoStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Only PENDING_APPROVAL purchase orders can be approved. Current status: ${po.status}`,
      );
    }
    await this.checkPoExpiry(po);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PoStatus.APPROVED, approvedById: userId, approvedAt: new Date() },
    });
  }

  async rejectPo(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== PoStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Only PENDING_APPROVAL purchase orders can be rejected. Current status: ${po.status}`,
      );
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PoStatus.REJECTED },
    });
  }

  async sendPo(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== PoStatus.APPROVED) {
      throw new BadRequestException(
        `Only APPROVED purchase orders can be sent. Current status: ${po.status}`,
      );
    }
    await this.checkPoExpiry(po);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PoStatus.SENT, sentAt: new Date() },
    });
  }

  async supplierConfirmPo(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== PoStatus.SENT) {
      throw new BadRequestException(
        `Only SENT purchase orders can be confirmed. Current status: ${po.status}`,
      );
    }
    await this.checkPoExpiry(po);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PoStatus.SUPPLIER_CONFIRMED, confirmedAt: new Date() },
    });
  }

  async supplierDeclinePo(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== PoStatus.SENT) {
      throw new BadRequestException(
        `Only SENT purchase orders can be declined by supplier. Current status: ${po.status}`,
      );
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PoStatus.REJECTED, supplierDeclinedAt: new Date() },
    });
  }

  async cancelPo(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== PoStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT purchase orders can be cancelled. Current status: ${po.status}`,
      );
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PoStatus.CANCELLED },
    });
  }

  async closePo(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true, grns: { include: { items: true } } },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== PoStatus.RECEIVED) {
      throw new BadRequestException(
        `Only RECEIVED purchase orders can be closed. Current status: ${po.status}`,
      );
    }

    const allReceived = po.items.every((poItem) => {
      const totalReceived = po.grns.reduce((sum, grn) => {
        const grnItem = grn.items.find((gi) => gi.ingredientId === poItem.ingredientId);
        return sum + (grnItem?.quantityReceived || 0);
      }, 0);
      return totalReceived >= poItem.quantity;
    });

    if (!allReceived) {
      throw new BadRequestException('Cannot close: not all items have been fully received');
    }

    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: PoStatus.CLOSED } });
  }

  // ── Goods Receipt Notes ───────────────────────────────────────────────────

  async getGrns() {
    return this.prisma.goodsReceiptNote.findMany({
      include: {
        purchaseOrder: { include: { supplier: true } },
        receivedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: { include: { ingredient: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGrnById(id: number) {
    const grn = await this.prisma.goodsReceiptNote.findUnique({
      where: { id },
      include: {
        purchaseOrder: { include: { supplier: true } },
        receivedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: { include: { ingredient: true } },
      },
    });
    if (!grn) throw new NotFoundException('GRN not found');
    return grn;
  }

  async getGrnsByPoId(poId: number) {
    return this.prisma.goodsReceiptNote.findMany({
      where: { purchaseOrderId: poId },
      include: {
        receivedBy: { select: { id: true, name: true } },
        items: { include: { ingredient: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createGrn(userId: number, dto: CreateGrnDto) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: dto.purchaseOrderId },
      include: { items: true, supplier: true },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');

    const allowedStatuses: PoStatus[] = [
      PoStatus.SUPPLIER_CONFIRMED,
      PoStatus.GRN_CREATED,
      PoStatus.RECEIVING,
    ];
    if (!allowedStatuses.includes(po.status as PoStatus)) {
      throw new BadRequestException(
        `Goods receipt can only be processed for SUPPLIER_CONFIRMED/GRN_CREATED/RECEIVING POs. Current status: ${po.status}`,
      );
    }

    const warehouse = await this.getDefaultWarehouse();
    const grnYear = new Date().getFullYear();
    const grnCount = await this.prisma.goodsReceiptNote.count();
    const grnSeq = String(grnCount + 1).padStart(5, '0');
    const grnNumber = `GRN-${grnYear}-${grnSeq}`;

    return this.prisma.$transaction(async (tx) => {
      const grnItems: Array<{
        ingredientId: number;
        quantityReceived: number;
        quantityRejected: number;
        acceptedQuantity: number;
        damagedQuantity: number;
      }> = [];

      for (const item of dto.items) {
        const poItem = po.items.find((pi) => pi.ingredientId === item.ingredientId);
        if (!poItem) {
          throw new BadRequestException(
            `Ingredient ID ${item.ingredientId} is not part of this Purchase Order`,
          );
        }

        const previousGrns = await tx.goodsReceiptNote.findMany({
          where: { purchaseOrderId: dto.purchaseOrderId },
          include: { items: true },
        });
        const previouslyReceived = previousGrns.reduce((sum, g) => {
          const gi = g.items.find((i) => i.ingredientId === item.ingredientId);
          return sum + (gi?.quantityReceived || 0);
        }, 0);

        const remaining = poItem.quantity - previouslyReceived;
        if (item.quantityReceived > remaining) {
          throw new BadRequestException(
            `Cannot receive ${item.quantityReceived} of ingredient ${item.ingredientId}. Only ${remaining} remaining (ordered: ${poItem.quantity}, previously received: ${previouslyReceived})`,
          );
        }

        const rejected = item.quantityRejected || 0;
        const damaged = item.damagedQuantity || 0;
        const accepted = item.quantityReceived - rejected - damaged;

        if (accepted < 0) {
          throw new BadRequestException(
            `Accepted quantity cannot be negative for ingredient ${item.ingredientId}`,
          );
        }

        grnItems.push({
          ingredientId: item.ingredientId,
          quantityReceived: item.quantityReceived,
          quantityRejected: rejected,
          acceptedQuantity: accepted,
          damagedQuantity: damaged,
        });
      }

      const grn = await tx.goodsReceiptNote.create({
        data: {
          grnNumber,
          purchaseOrderId: dto.purchaseOrderId,
          receivedById: userId,
          invoiceNumber: dto.invoiceNumber || null,
          deliveryChallan: dto.deliveryChallan || null,
          vehicleNumber: dto.vehicleNumber || null,
          notes: dto.notes || null,
          items: {
            create: grnItems.map((i) => ({
              ingredientId: i.ingredientId,
              quantityReceived: i.quantityReceived,
              quantityRejected: i.quantityRejected,
              acceptedQuantity: i.acceptedQuantity,
              damagedQuantity: i.damagedQuantity,
            })),
          },
        },
        include: { items: { include: { ingredient: true } } },
      });

      for (const item of grnItems) {
        const ingredient = await tx.ingredient.findUnique({ where: { id: item.ingredientId } });
        if (!ingredient) throw new NotFoundException(`Ingredient ${item.ingredientId} not found`);

        const whInventory = await tx.warehouseInventory.findUnique({
          where: {
            warehouseId_ingredientId: {
              warehouseId: warehouse.id,
              ingredientId: item.ingredientId,
            },
          },
        });

        const beforeQty = whInventory?.availableQuantity ?? 0;
        const afterQty = beforeQty + item.acceptedQuantity;

        await tx.warehouseInventory.upsert({
          where: {
            warehouseId_ingredientId: {
              warehouseId: warehouse.id,
              ingredientId: item.ingredientId,
            },
          },
          update: { availableQuantity: afterQty },
          create: {
            warehouseId: warehouse.id,
            ingredientId: item.ingredientId,
            availableQuantity: afterQty,
          },
        });

        await tx.stockLedger.create({
          data: {
            ingredientId: item.ingredientId,
            locationType: 'WAREHOUSE',
            locationId: warehouse.id,
            refType: LedgerRefType.GOODS_RECEIPT,
            referenceId: grnNumber,
            quantity: item.acceptedQuantity,
            beforeQuantity: beforeQty,
            afterQuantity: afterQty,
            unit: ingredient.unit,
            userId,
          },
        });
      }

      const updatedGrnItems = await tx.goodsReceiptNoteItem.findMany({
        where: { goodsReceiptNoteId: grn.id },
        include: { ingredient: true },
      });

      const totalReceivedAllGrns = await this.computeTotalReceived(tx, dto.purchaseOrderId);
      const allFullyReceived = po.items.every((poItem) => {
        return (totalReceivedAllGrns[poItem.ingredientId] || 0) >= poItem.quantity;
      });

      const newStatus = allFullyReceived ? PoStatus.RECEIVED : PoStatus.RECEIVING;
      await tx.purchaseOrder.update({
        where: { id: dto.purchaseOrderId },
        data: { status: newStatus },
      });

      return { ...grn, items: updatedGrnItems };
    });
  }

  private async computeTotalReceived(tx: any, poId: number) {
    const allGrns = await tx.goodsReceiptNote.findMany({
      where: { purchaseOrderId: poId },
      include: { items: true },
    });
    const totals: Record<number, number> = {};
    for (const grn of allGrns) {
      for (const item of grn.items) {
        totals[item.ingredientId] = (totals[item.ingredientId] || 0) + item.quantityReceived;
      }
    }
    return totals;
  }

  // ── GRN Skeleton (Phase 6) ──────────────────────────────────────────────

  async createGrnSkeleton(userId: number, poId: number) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: { include: { ingredient: true } } },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');
    if (po.status !== PoStatus.SUPPLIER_CONFIRMED && po.status !== PoStatus.RECEIVING) {
      throw new BadRequestException(
        `Can only create GRN from SUPPLIER_CONFIRMED or RECEIVING PO. Current status: ${po.status}`,
      );
    }

    const grnYear = new Date().getFullYear();
    const grnCount = await this.prisma.goodsReceiptNote.count();
    const grnSeq = String(grnCount + 1).padStart(5, '0');
    const grnNumber = `GRN-${grnYear}-${grnSeq}`;

    return this.prisma.$transaction(async (tx) => {
      const grn = await tx.goodsReceiptNote.create({
        data: {
          grnNumber,
          purchaseOrderId: poId,
          receivedById: userId,
          status: GrnStatus.PENDING_RECEIPT,
          notes: `Auto-created skeleton from PO ${po.poNumber}`,
          items: {
            create: po.items.map((poItem) => ({
              ingredientId: poItem.ingredientId,
              quantityReceived: 0,
              quantityRejected: 0,
              acceptedQuantity: 0,
              damagedQuantity: 0,
            })),
          },
        },
        include: { items: { include: { ingredient: true } } },
      });

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: PoStatus.RECEIVING },
      });

      return grn;
    });
  }

  // ── GRN Approval (Phase 8) ─────────────────────────────────────────────

  async approveGrn(
    userId: number,
    grnId: number,
    items: {
      ingredientId: number;
      quantityReceived: number;
      quantityRejected?: number;
      damagedQuantity?: number;
      rejectionReason?: string;
      damageReason?: string;
      remarks?: string;
    }[],
  ) {
    const grn = await this.prisma.goodsReceiptNote.findUnique({
      where: { id: grnId },
      include: { items: true, purchaseOrder: { include: { items: true, supplier: true } } },
    });
    if (!grn) throw new NotFoundException('GRN not found');
    if (grn.status !== GrnStatus.PENDING_RECEIPT) {
      throw new BadRequestException(
        `Can only approve PENDING_RECEIPT GRNs. Current status: ${grn.status}`,
      );
    }

    const warehouse = await this.getDefaultWarehouse();
    const now = new Date();
    const invYear = now.getFullYear();
    const invSeq = String(grn.id).padStart(5, '0');
    const invoiceNumber = `INV-GRN-${invYear}-${invSeq}`;

    return this.prisma.$transaction(async (tx) => {
      const grnItems: Array<{
        id: number;
        ingredientId: number;
        quantityReceived: number;
        quantityRejected: number;
        acceptedQuantity: number;
        damagedQuantity: number;
        rejectionReason: string | null;
        damageReason: string | null;
        remarks: string | null;
      }> = [];

      for (const input of items) {
        const grnItem = grn.items.find((gi) => gi.ingredientId === input.ingredientId);
        if (!grnItem) {
          throw new BadRequestException(`Ingredient ${input.ingredientId} is not in this GRN`);
        }

        const poItem = grn.purchaseOrder.items.find((pi) => pi.ingredientId === input.ingredientId);
        if (!poItem) {
          throw new BadRequestException(
            `Ingredient ${input.ingredientId} is not in the Purchase Order`,
          );
        }

        const previousGrns = await tx.goodsReceiptNote.findMany({
          where: { purchaseOrderId: grn.purchaseOrderId, id: { not: grnId } },
          include: { items: true },
        });
        const previouslyReceived = previousGrns.reduce((sum, g) => {
          const gi = g.items.find((i) => i.ingredientId === input.ingredientId);
          return sum + (gi?.quantityReceived || 0);
        }, 0);

        const remaining = poItem.quantity - previouslyReceived;
        if (input.quantityReceived > remaining) {
          throw new BadRequestException(
            `Cannot receive ${input.quantityReceived} of ingredient ${input.ingredientId}. Only ${remaining} remaining.`,
          );
        }

        const rejected = input.quantityRejected || 0;
        const damaged = input.damagedQuantity || 0;
        const accepted = input.quantityReceived - rejected - damaged;

        if (accepted < 0) {
          throw new BadRequestException(
            `Accepted quantity cannot be negative for ingredient ${input.ingredientId}`,
          );
        }

        grnItems.push({
          id: grnItem.id,
          ingredientId: input.ingredientId,
          quantityReceived: input.quantityReceived,
          quantityRejected: rejected,
          acceptedQuantity: accepted,
          damagedQuantity: damaged,
          rejectionReason: input.rejectionReason || null,
          damageReason: input.damageReason || null,
          remarks: input.remarks || null,
        });
      }

      for (const item of grnItems) {
        await tx.goodsReceiptNoteItem.update({
          where: { id: item.id },
          data: {
            quantityReceived: item.quantityReceived,
            quantityRejected: item.quantityRejected,
            acceptedQuantity: item.acceptedQuantity,
            damagedQuantity: item.damagedQuantity,
            rejectionReason: item.rejectionReason,
            damageReason: item.damageReason,
            remarks: item.remarks,
          },
        });
      }

      for (const item of grnItems) {
        if (item.acceptedQuantity <= 0) continue;

        const ingredient = await tx.ingredient.findUnique({ where: { id: item.ingredientId } });
        if (!ingredient) throw new NotFoundException(`Ingredient ${item.ingredientId} not found`);

        const whInventory = await tx.warehouseInventory.findUnique({
          where: {
            warehouseId_ingredientId: {
              warehouseId: warehouse.id,
              ingredientId: item.ingredientId,
            },
          },
        });

        const beforeQty = whInventory?.availableQuantity ?? 0;
        const afterQty = beforeQty + item.acceptedQuantity;

        await tx.warehouseInventory.upsert({
          where: {
            warehouseId_ingredientId: {
              warehouseId: warehouse.id,
              ingredientId: item.ingredientId,
            },
          },
          update: { availableQuantity: afterQty },
          create: {
            warehouseId: warehouse.id,
            ingredientId: item.ingredientId,
            availableQuantity: afterQty,
          },
        });

        await tx.stockLedger.create({
          data: {
            ingredientId: item.ingredientId,
            locationType: 'WAREHOUSE',
            locationId: warehouse.id,
            refType: LedgerRefType.GOODS_RECEIPT,
            referenceId: grn.grnNumber,
            quantity: item.acceptedQuantity,
            beforeQuantity: beforeQty,
            afterQuantity: afterQty,
            unit: ingredient.unit,
            userId,
          },
        });
      }

      await tx.goodsReceiptNote.update({
        where: { id: grnId },
        data: {
          status: GrnStatus.COMPLETED,
          approvedAt: now,
          approvedById: userId,
          invoiceNumber,
          invoiceGeneratedAt: now,
        },
      });

      const totalReceivedAllGrns = await this.computeTotalReceived(tx, grn.purchaseOrderId);
      const po = grn.purchaseOrder;
      const allFullyReceived = po.items.every((poItem) => {
        return (totalReceivedAllGrns[poItem.ingredientId] || 0) >= poItem.quantity;
      });

      const newStatus = allFullyReceived ? PoStatus.RECEIVED : PoStatus.RECEIVING;
      await tx.purchaseOrder.update({
        where: { id: grn.purchaseOrderId },
        data: { status: newStatus },
      });

      return tx.goodsReceiptNote.findUnique({
        where: { id: grnId },
        include: {
          items: { include: { ingredient: true } },
          purchaseOrder: { include: { supplier: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      });
    });
  }

  async getGrnInvoice(grnId: number) {
    const grn = await this.prisma.goodsReceiptNote.findUnique({
      where: { id: grnId },
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
            items: {
              include: { ingredient: { include: { category: true, brand: true, tax: true } } },
            },
          },
        },
        receivedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        items: {
          include: { ingredient: { include: { category: true, brand: true, tax: true } } },
        },
      },
    });
    if (!grn) throw new NotFoundException('GRN not found');
    if (grn.status !== GrnStatus.COMPLETED) {
      throw new BadRequestException('Invoice is only available for COMPLETED GRNs');
    }

    const warehouse = await this.getDefaultWarehouse();
    const po = grn.purchaseOrder;

    const company = {
      name: 'Beas Restaurant Group',
      address: warehouse.location,
      phone: '+91-9876543210',
      email: 'accounts@beasrestaurant.com',
      gstNumber: '27AABCT1234F1Z5',
    };

    const items = grn.items.map((grnItem) => {
      const poItem = po.items.find((pi) => pi.ingredientId === grnItem.ingredientId);
      const unitPrice = poItem?.unitPrice || 0;
      const lineTotal = grnItem.acceptedQuantity * unitPrice;
      const taxRate = grnItem.ingredient.tax?.rate ?? 0;
      const taxAmount = lineTotal * (taxRate / 100);
      return {
        sku: grnItem.ingredient.sku,
        name: grnItem.ingredient.name,
        unit: grnItem.ingredient.unit,
        category: grnItem.ingredient.category?.name || '—',
        brand: grnItem.ingredient.brand?.name || '—',
        orderedQuantity: poItem?.quantity || 0,
        quantityReceived: grnItem.quantityReceived,
        acceptedQuantity: grnItem.acceptedQuantity,
        quantityRejected: grnItem.quantityRejected,
        damagedQuantity: grnItem.damagedQuantity,
        unitPrice,
        lineTotal,
        taxRate,
        taxAmount,
        rejectionReason: grnItem.rejectionReason,
        damageReason: grnItem.damageReason,
        remarks: grnItem.remarks,
      };
    });

    const totalItems = items.length;
    const totalOrdered = items.reduce((s, i) => s + i.orderedQuantity, 0);
    const totalReceived = items.reduce((s, i) => s + i.quantityReceived, 0);
    const totalAccepted = items.reduce((s, i) => s + i.acceptedQuantity, 0);
    const totalRejected = items.reduce((s, i) => s + i.quantityRejected, 0);
    const totalDamaged = items.reduce((s, i) => s + i.damagedQuantity, 0);
    const totalAmount = items.reduce((s, i) => s + i.lineTotal, 0);

    return {
      company,
      invoice: {
        invoiceNumber: grn.invoiceNumber,
        grnNumber: grn.grnNumber,
        poNumber: po.poNumber,
        status: grn.status,
        invoiceDate: grn.invoiceGeneratedAt,
        approvedAt: grn.approvedAt,
        notes: grn.notes,
      },
      supplier: {
        companyName: po.supplier.companyName,
        supplierCode: po.supplier.supplierCode,
        contactPerson: po.supplier.contactPerson,
        mobile: po.supplier.mobile,
        email: po.supplier.email,
        address: po.supplier.address,
        gstNumber: po.supplier.gstNumber,
      },
      warehouse: {
        name: warehouse.name,
        address: warehouse.location,
        phone: company.phone,
        email: company.email,
      },
      items,
      totals: {
        totalItems,
        totalOrdered,
        totalReceived,
        totalAccepted,
        totalRejected,
        totalDamaged,
        totalAmount,
      },
      receivedBy: grn.receivedBy,
      approvedBy: grn.approvedBy,
    };
  }

  // ── Stock Adjustment ──────────────────────────────────────────────────────

  async adjustStock(
    userId: number,
    dto: { ingredientId: number; newQuantity: number; reason: string },
  ) {
    const warehouse = await this.getDefaultWarehouse();

    const whInventory = await this.prisma.warehouseInventory.findUnique({
      where: {
        warehouseId_ingredientId: { warehouseId: warehouse.id, ingredientId: dto.ingredientId },
      },
    });

    const ingredient = await this.prisma.ingredient.findUnique({ where: { id: dto.ingredientId } });
    if (!ingredient) throw new NotFoundException('Ingredient not found');

    const beforeQty = whInventory?.availableQuantity ?? 0;
    const afterQty = dto.newQuantity;
    const adjustmentQty = afterQty - beforeQty;

    return this.prisma.$transaction(async (tx) => {
      await tx.warehouseInventory.upsert({
        where: {
          warehouseId_ingredientId: { warehouseId: warehouse.id, ingredientId: dto.ingredientId },
        },
        update: { availableQuantity: afterQty },
        create: {
          warehouseId: warehouse.id,
          ingredientId: dto.ingredientId,
          availableQuantity: afterQty,
        },
      });

      await tx.stockLedger.create({
        data: {
          ingredientId: dto.ingredientId,
          locationType: 'WAREHOUSE',
          locationId: warehouse.id,
          refType: LedgerRefType.ADJUSTMENT,
          referenceId: `ADJ-${Date.now().toString().slice(-6)}`,
          quantity: adjustmentQty,
          beforeQuantity: beforeQty,
          afterQuantity: afterQty,
          unit: ingredient.unit,
          userId,
        },
      });

      return { adjusted: true, beforeQuantity: beforeQty, afterQuantity: afterQty };
    });
  }

  // ── Store Requests ────────────────────────────────────────────────────────

  async getStoreRequests() {
    const [requests, transfers] = await Promise.all([
      this.prisma.branchStoreRequest.findMany({
        include: {
          items: { include: { ingredient: true } },
          requestedBy: { select: { id: true, name: true } },
          fulfilledBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.warehouseTransfer.findMany({
        include: {
          warehouse: true,
          requestedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const transferBySuffix = new Map<string, (typeof transfers)[number]>();
    for (const transfer of transfers) {
      const suffix = transfer.transferNumber.split('-').pop()?.slice(-6);
      if (suffix) transferBySuffix.set(suffix, transfer);
    }

    const restaurantDetailsMap = await this.integrationService.getRestaurantIdDetailsMap();

    return requests.map((request) => {
      const suffix = request.requestNumber.split('-').pop()?.slice(-6) || '';
      const transfer = transferBySuffix.get(suffix);
      const restaurant = restaurantDetailsMap.get(request.restaurantId);

      return {
        ...request,
        restaurantName: restaurant?.name ?? null,
        restaurantSlug: restaurant?.slug ?? null,
        transferNumber: transfer?.transferNumber ?? null,
        transferStatus: transfer?.status ?? null,
        transferWarehouse: transfer?.warehouse?.name ?? null,
      };
    });
  }

  async approveStoreRequest(requestId: number, userId: number) {
    const request = await this.prisma.branchStoreRequest.findUnique({
      where: { id: requestId },
      include: { items: { include: { ingredient: true } } },
    });
    if (!request) throw new NotFoundException('Branch store request not found');
    if (request.status !== BranchStoreRequestStatus.PENDING) {
      throw new BadRequestException(`Request is not PENDING. Current status: ${request.status}`);
    }

    const warehouse = await this.getDefaultWarehouse();
    const requestNumberSuffix = request.requestNumber.split('-').pop() || '';
    const transferNumber = `WTR-SR${requestNumberSuffix}`;

    return this.prisma.$transaction(async (tx) => {
      const approved = await tx.branchStoreRequest.update({
        where: { id: requestId },
        data: { status: BranchStoreRequestStatus.APPROVED, approvedAt: new Date() },
      });

      const transfer = await tx.warehouseTransfer.create({
        data: {
          transferNumber,
          warehouseId: warehouse.id,
          restaurantId: request.restaurantId,
          status: WarehouseTransferStatus.PENDING,
          requestedById: userId,
          notes: `Auto-generated from store request ${request.requestNumber}`,
          items: {
            create: request.items.map((item) => ({
              ingredientId: item.ingredientId,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: { include: { ingredient: true } }, warehouse: true },
      });

      const updatedRequest = await tx.branchStoreRequest.update({
        where: { id: requestId },
        data: { status: BranchStoreRequestStatus.TRANSFER_CREATED },
      });

      return { request: updatedRequest, approved, transfer };
    });
  }

  async rejectStoreRequest(requestId: number, userId: number) {
    const request = await this.prisma.branchStoreRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Branch store request not found');
    if (request.status !== BranchStoreRequestStatus.PENDING) {
      throw new BadRequestException(`Request is not PENDING. Current status: ${request.status}`);
    }
    return this.prisma.branchStoreRequest.update({
      where: { id: requestId },
      data: { status: BranchStoreRequestStatus.REJECTED, fulfilledById: userId },
    });
  }

  // ── Outbound Transfers ────────────────────────────────────────────────────

  async getOutboundTransfers() {
    const transfers = await this.prisma.warehouseTransfer.findMany({
      include: {
        items: { include: { ingredient: true } },
        warehouse: true,
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (transfers.length === 0) return transfers;

    const restaurantDetailsMap = await this.integrationService.getRestaurantIdDetailsMap();

    return transfers.map((transfer) => {
      const restaurant = restaurantDetailsMap.get(transfer.restaurantId);
      return {
        ...transfer,
        restaurantName: restaurant?.name ?? null,
        restaurantSlug: restaurant?.slug ?? null,
      };
    });
  }

  async createOutboundTransfer(
    userId: number,
    dto: {
      restaurantId: number;
      items: { ingredientId: number; quantity: number }[];
      notes?: string;
    },
  ) {
    const warehouse = await this.getDefaultWarehouse();
    if (!dto.items || dto.items.length === 0)
      throw new BadRequestException('At least one item is required');

    const transferNumber = `WTR-${Date.now().toString().slice(-6)}`;

    return this.prisma.warehouseTransfer.create({
      data: {
        transferNumber,
        warehouseId: warehouse.id,
        restaurantId: dto.restaurantId,
        requestedById: userId,
        notes: dto.notes || null,
        items: {
          create: dto.items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: { include: { ingredient: true } }, warehouse: true },
    });
  }

  async approveOutboundTransfer(transferId: number, userId: number) {
    const transfer = await this.prisma.warehouseTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });
    if (!transfer) throw new NotFoundException('Outbound transfer not found');
    if (transfer.status !== WarehouseTransferStatus.PENDING) {
      throw new BadRequestException(`Transfer is not PENDING. Current status: ${transfer.status}`);
    }
    return this.prisma.warehouseTransfer.update({
      where: { id: transferId },
      data: { status: WarehouseTransferStatus.APPROVED, approvedById: userId },
      include: {
        items: { include: { ingredient: true } },
        warehouse: true,
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
  }

  async dispatchOutboundTransfer(transferId: number, userId: number) {
    const transfer = await this.prisma.warehouseTransfer.findUnique({
      where: { id: transferId },
      include: { items: { include: { ingredient: true } } },
    });
    if (!transfer) throw new NotFoundException('Outbound transfer not found');
    if (transfer.status !== WarehouseTransferStatus.APPROVED) {
      throw new BadRequestException(
        `Transfer must be APPROVED before dispatch. Current status: ${transfer.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        const whStock = await tx.warehouseInventory.findUnique({
          where: {
            warehouseId_ingredientId: {
              warehouseId: transfer.warehouseId,
              ingredientId: item.ingredientId,
            },
          },
        });
        if (!whStock || whStock.availableQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient warehouse stock for "${item.ingredient.name}". Available: ${whStock?.availableQuantity ?? 0}, Requested: ${item.quantity}`,
          );
        }

        const whBefore = whStock.availableQuantity;
        const whAfter = whBefore - item.quantity;

        await tx.warehouseInventory.update({
          where: { id: whStock.id },
          data: { availableQuantity: whAfter },
        });

        await tx.stockLedger.create({
          data: {
            ingredientId: item.ingredientId,
            locationType: 'WAREHOUSE',
            locationId: transfer.warehouseId,
            refType: LedgerRefType.TRANSFER,
            referenceId: transfer.transferNumber,
            quantity: -item.quantity,
            beforeQuantity: whBefore,
            afterQuantity: whAfter,
            unit: item.ingredient.unit,
            userId,
          },
        });

        const storeStock = await tx.storeInventory.findUnique({
          where: {
            restaurantId_ingredientId: {
              restaurantId: transfer.restaurantId,
              ingredientId: item.ingredientId,
            },
          },
        });

        const storeBefore = storeStock?.availableQuantity ?? 0;
        const storeAfter = storeBefore + item.quantity;
        const storeMin = storeStock?.minimumStock ?? 10;
        const newStoreStatus: StockStatus =
          storeAfter <= 0
            ? StockStatus.OUT_OF_STOCK
            : storeAfter <= storeMin
              ? StockStatus.LOW_STOCK
              : StockStatus.HEALTHY;

        if (storeStock) {
          await tx.storeInventory.update({
            where: { id: storeStock.id },
            data: { availableQuantity: storeAfter, status: newStoreStatus },
          });
        } else {
          await tx.storeInventory.create({
            data: {
              restaurantId: transfer.restaurantId,
              ingredientId: item.ingredientId,
              availableQuantity: storeAfter,
              minimumStock: storeMin,
              maximumStock: 200,
              reorderLevel: storeMin + 5,
              status: newStoreStatus,
            },
          });
        }

        await tx.stockLedger.create({
          data: {
            ingredientId: item.ingredientId,
            locationType: 'STORE',
            locationId: transfer.restaurantId,
            refType: LedgerRefType.TRANSFER,
            referenceId: transfer.transferNumber,
            quantity: item.quantity,
            beforeQuantity: storeBefore,
            afterQuantity: storeAfter,
            unit: item.ingredient.unit,
            userId,
          },
        });
      }

      const updatedTransfer = await tx.warehouseTransfer.update({
        where: { id: transferId },
        data: {
          status: WarehouseTransferStatus.COMPLETED,
          dispatchedById: userId,
          dispatchedAt: new Date(),
        },
        include: { items: { include: { ingredient: true } }, warehouse: true },
      });

      const lastSix = transfer.transferNumber.split('-').pop()?.slice(-6) || '';
      const linkedRequest = await tx.branchStoreRequest.findFirst({
        where: {
          restaurantId: transfer.restaurantId,
          requestNumber: { endsWith: lastSix },
          status: {
            in: [BranchStoreRequestStatus.APPROVED, BranchStoreRequestStatus.TRANSFER_CREATED],
          },
        },
      });

      if (linkedRequest) {
        await tx.branchStoreRequest.update({
          where: { id: linkedRequest.id },
          data: {
            status: BranchStoreRequestStatus.DISPATCHED,
            fulfilledById: userId,
          },
        });
        await tx.branchStoreRequest.update({
          where: { id: linkedRequest.id },
          data: {
            status: BranchStoreRequestStatus.COMPLETED,
            completedAt: new Date(),
          },
        });

        const completedRequest = await tx.branchStoreRequest.findUnique({
          where: { id: linkedRequest.id },
        });
        return { transfer: updatedTransfer, linkedRequest: completedRequest };
      }

      return { transfer: updatedTransfer, linkedRequest: null };
    });
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  async getReports(warehouseId?: number) {
    const warehouse = await this.getDefaultWarehouse();
    const wid = warehouseId || warehouse.id;

    const [valuation, recentLedger, lowStockItems] = await Promise.all([
      this.prisma.warehouseInventory.aggregate({
        where: { warehouseId: wid },
        _sum: { availableQuantity: true },
        _count: true,
      }),
      this.prisma.stockLedger.findMany({
        take: 20,
        orderBy: { timestamp: 'desc' },
        where: { locationType: 'WAREHOUSE', locationId: wid },
        include: { ingredient: true, user: { select: { name: true } } },
      }),
      this.prisma.warehouseInventory.findMany({
        where: { warehouseId: wid, availableQuantity: { lte: 50 } },
        include: { ingredient: true },
      }),
    ]);

    return {
      valuation: {
        totalItems: valuation._count,
        totalQuantity: valuation._sum?.availableQuantity ?? 0,
      },
      recentLedger: recentLedger.map((entry) => ({
        id: entry.id,
        ingredient: entry.ingredient?.name,
        quantity: entry.quantity,
        beforeQuantity: entry.beforeQuantity,
        afterQuantity: entry.afterQuantity,
        refType: entry.refType,
        referenceId: entry.referenceId,
        timestamp: entry.timestamp,
        user: entry.user?.name,
      })),
      lowStockItems: lowStockItems.map((item) => ({
        id: item.id,
        ingredient: item.ingredient.name,
        sku: item.ingredient.sku,
        availableQuantity: item.availableQuantity,
        minimumStock: item.ingredient.minimumStock,
        unit: item.ingredient.unit,
      })),
    };
  }

  // ── Warehouse CRUD ────────────────────────────────────────────────────────

  async getWarehouses() {
    return this.prisma.warehouse.findMany({ orderBy: { name: 'asc' } });
  }

  async createWarehouse(name: string, location: string) {
    const existing = await this.prisma.warehouse.findUnique({ where: { name } });
    if (existing) throw new BadRequestException('Warehouse name already exists');
    return this.prisma.warehouse.create({ data: { name, location } });
  }
}
