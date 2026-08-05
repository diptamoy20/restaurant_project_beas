import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LedgerRefType, Prisma, StockStatus, TransferStatus } from '@prisma/client';

import { CreateMaterialReturnDto, CreateWasteLogDto } from './dto/reporting.dto';
import { IntegrationService } from '../integration/integration.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationService: IntegrationService,
  ) {}

  // Waste Management
  async logWaste(userId: number, dto: CreateWasteLogDto) {
    const ingredient = await this.prisma.ingredient.findUnique({ where: { id: dto.ingredientId } });
    if (!ingredient) throw new NotFoundException('Ingredient not found');

    // Deduct waste from Kitchen Inventory
    const kitchenStock = await this.prisma.kitchenInventory.findUnique({
      where: {
        restaurantId_ingredientId: {
          restaurantId: dto.restaurantId,
          ingredientId: dto.ingredientId,
        },
      },
    });

    const beforeQty = kitchenStock?.availableQuantity ?? 0;
    const afterQty = Math.max(0, beforeQty - dto.quantity);
    const minStock = kitchenStock?.minimumStock ?? 5;
    const newStatus: StockStatus =
      afterQty <= 0
        ? StockStatus.OUT_OF_STOCK
        : afterQty <= minStock
          ? StockStatus.LOW_STOCK
          : StockStatus.HEALTHY;

    return this.prisma.$transaction(async (tx) => {
      if (kitchenStock) {
        await tx.kitchenInventory.update({
          where: { id: kitchenStock.id },
          data: { availableQuantity: afterQty, status: newStatus },
        });
      } else {
        await tx.kitchenInventory.create({
          data: {
            restaurantId: dto.restaurantId,
            ingredientId: dto.ingredientId,
            availableQuantity: afterQty,
            minimumStock: minStock,
            status: newStatus,
          },
        });
      }

      const waste = await tx.wasteLog.create({
        data: {
          restaurantId: dto.restaurantId,
          ingredientId: dto.ingredientId,
          quantity: dto.quantity,
          wasteType: dto.wasteType,
          notes: dto.notes || null,
          loggedById: userId,
        },
      });

      // Stock Ledger entry
      await tx.stockLedger.create({
        data: {
          ingredientId: dto.ingredientId,
          locationType: 'KITCHEN',
          locationId: dto.restaurantId,
          refType: LedgerRefType.WASTE,
          referenceId: `WASTE-${waste.id}`,
          quantity: -dto.quantity,
          beforeQuantity: beforeQty,
          afterQuantity: afterQty,
          unit: ingredient.unit,
          userId,
        },
      });

      return waste;
    });
  }

  async getWasteLogs(restaurantId?: number) {
    return this.prisma.wasteLog.findMany({
      where: restaurantId ? { restaurantId } : undefined,
      include: {
        ingredient: true,
        loggedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Material Returns
  async createReturn(dto: CreateMaterialReturnDto) {
    const returnNumber = `RET-${Date.now().toString().slice(-6)}`;

    return this.prisma.materialReturn.create({
      data: {
        returnNumber,
        fromType: dto.fromType,
        toType: dto.toType,
        restaurantId: dto.restaurantId,
        warehouseId: dto.warehouseId || null,
        ingredientId: dto.ingredientId,
        quantity: dto.quantity,
        reason: dto.reason,
        isApproved: false,
      },
      include: { ingredient: true },
    });
  }

  async getReturns(restaurantId?: number) {
    const returns = await this.prisma.materialReturn.findMany({
      where: restaurantId ? { restaurantId } : undefined,
      include: { ingredient: true, warehouse: true },
      orderBy: { createdAt: 'desc' },
    });

    if (returns.length === 0) return returns;

    const restaurantDetailsMap = await this.integrationService.getRestaurantIdDetailsMap();

    return returns.map((ret) => {
      const restaurant = restaurantDetailsMap.get(ret.restaurantId);
      return {
        ...ret,
        restaurantName: restaurant?.name ?? null,
        restaurantSlug: restaurant?.slug ?? null,
      };
    });
  }

  async approveReturn(returnId: number, userId: number) {
    const ret = await this.prisma.materialReturn.findUnique({
      where: { id: returnId },
      include: { ingredient: true },
    });
    if (!ret) throw new NotFoundException('Return record not found');
    if (ret.isApproved) throw new BadRequestException('Return is already approved');

    return this.prisma.$transaction(async (tx) => {
      // 1. Deduct from Source
      if (ret.fromType === 'KITCHEN') {
        const kitchenStock = await tx.kitchenInventory.findUnique({
          where: {
            restaurantId_ingredientId: {
              restaurantId: ret.restaurantId,
              ingredientId: ret.ingredientId,
            },
          },
        });
        if (kitchenStock) {
          const before = kitchenStock.availableQuantity;
          const after = Math.max(0, before - ret.quantity);
          await tx.kitchenInventory.update({
            where: { id: kitchenStock.id },
            data: { availableQuantity: after },
          });

          await tx.stockLedger.create({
            data: {
              ingredientId: ret.ingredientId,
              locationType: 'KITCHEN',
              locationId: ret.restaurantId,
              refType: LedgerRefType.MATERIAL_RETURN,
              referenceId: ret.returnNumber,
              quantity: -ret.quantity,
              beforeQuantity: before,
              afterQuantity: after,
              unit: ret.ingredient.unit,
              userId,
            },
          });
        }
      } else if (ret.fromType === 'STORE') {
        const storeStock = await tx.storeInventory.findUnique({
          where: {
            restaurantId_ingredientId: {
              restaurantId: ret.restaurantId,
              ingredientId: ret.ingredientId,
            },
          },
        });
        if (storeStock) {
          const before = storeStock.availableQuantity;
          const after = Math.max(0, before - ret.quantity);
          await tx.storeInventory.update({
            where: { id: storeStock.id },
            data: { availableQuantity: after },
          });

          await tx.stockLedger.create({
            data: {
              ingredientId: ret.ingredientId,
              locationType: 'STORE',
              locationId: ret.restaurantId,
              refType: LedgerRefType.MATERIAL_RETURN,
              referenceId: ret.returnNumber,
              quantity: -ret.quantity,
              beforeQuantity: before,
              afterQuantity: after,
              unit: ret.ingredient.unit,
              userId,
            },
          });
        }
      }

      // 2. Add to Target
      if (ret.toType === 'STORE') {
        const storeStock = await tx.storeInventory.findUnique({
          where: {
            restaurantId_ingredientId: {
              restaurantId: ret.restaurantId,
              ingredientId: ret.ingredientId,
            },
          },
        });
        const before = storeStock?.availableQuantity ?? 0;
        const after = before + ret.quantity;

        if (storeStock) {
          await tx.storeInventory.update({
            where: { id: storeStock.id },
            data: { availableQuantity: after },
          });
        } else {
          await tx.storeInventory.create({
            data: {
              restaurantId: ret.restaurantId,
              ingredientId: ret.ingredientId,
              availableQuantity: after,
              minimumStock: 10,
              status: StockStatus.HEALTHY,
            },
          });
        }

        await tx.stockLedger.create({
          data: {
            ingredientId: ret.ingredientId,
            locationType: 'STORE',
            locationId: ret.restaurantId,
            refType: LedgerRefType.MATERIAL_RETURN,
            referenceId: ret.returnNumber,
            quantity: ret.quantity,
            beforeQuantity: before,
            afterQuantity: after,
            unit: ret.ingredient.unit,
            userId,
          },
        });
      } else if (ret.toType === 'WAREHOUSE') {
        if (!ret.warehouseId)
          throw new BadRequestException(
            'Target warehouseId must be specified for warehouse returns',
          );
        const whStock = await tx.warehouseInventory.findUnique({
          where: {
            warehouseId_ingredientId: {
              warehouseId: ret.warehouseId,
              ingredientId: ret.ingredientId,
            },
          },
        });
        const before = whStock?.availableQuantity ?? 0;
        const after = before + ret.quantity;

        if (whStock) {
          await tx.warehouseInventory.update({
            where: { id: whStock.id },
            data: { availableQuantity: after },
          });
        } else {
          await tx.warehouseInventory.create({
            data: {
              warehouseId: ret.warehouseId,
              ingredientId: ret.ingredientId,
              availableQuantity: after,
            },
          });
        }

        await tx.stockLedger.create({
          data: {
            ingredientId: ret.ingredientId,
            locationType: 'WAREHOUSE',
            locationId: ret.warehouseId,
            refType: LedgerRefType.MATERIAL_RETURN,
            referenceId: ret.returnNumber,
            quantity: ret.quantity,
            beforeQuantity: before,
            afterQuantity: after,
            unit: ret.ingredient.unit,
            userId,
          },
        });
      }

      return tx.materialReturn.update({
        where: { id: returnId },
        data: { isApproved: true },
      });
    });
  }

  // Stock Ledger — the single immutable audit trail for every inventory movement.
  // Entries are only ever inserted by business events (GRN, transfers, returns,
  // waste, consumption, adjustments). This API only reads and enriches them.
  async getStockLedger(query: any = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder: 'asc' | 'desc' = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.StockLedgerWhereInput = {};

    if (query.warehouseId) {
      where.locationType = 'WAREHOUSE';
      where.locationId = Number(query.warehouseId);
    } else if (query.restaurantId) {
      where.locationId = Number(query.restaurantId);
      where.locationType =
        query.locationType && ['STORE', 'KITCHEN'].includes(query.locationType)
          ? query.locationType
          : { in: ['STORE', 'KITCHEN'] };
    } else if (query.locationType) {
      where.locationType = query.locationType;
    }

    if (query.ingredientId) where.ingredientId = Number(query.ingredientId);

    if (query.refType) where.refType = query.refType;

    if (query.dateFrom || query.dateTo) {
      where.timestamp = {};
      if (query.dateFrom) where.timestamp.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const nextDay = new Date(query.dateTo);
        nextDay.setDate(nextDay.getDate() + 1);
        where.timestamp.lt = nextDay;
      }
    }

    if (query.movementType) {
      if (query.movementType === 'IN') {
        where.refType = { not: LedgerRefType.ADJUSTMENT };
        where.quantity = { gt: 0 };
      } else if (query.movementType === 'OUT') {
        where.refType = { not: LedgerRefType.ADJUSTMENT };
        where.quantity = { lt: 0 };
      } else if (query.movementType === 'ADJUSTMENT') {
        where.refType = LedgerRefType.ADJUSTMENT;
      }
    }

    if (query.search) {
      where.OR = [
        { referenceId: { contains: query.search, mode: 'insensitive' } },
        { ingredient: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    const allowedSorts: Record<string, Prisma.StockLedgerOrderByWithRelationInput> = {
      timestamp: { timestamp: sortOrder },
      quantity: { quantity: sortOrder },
      referenceId: { referenceId: sortOrder },
      locationType: { locationType: sortOrder },
      ingredientName: { ingredient: { name: sortOrder } },
      movementType: { quantity: sortOrder },
    };

    const orderBy = allowedSorts[sortBy] || allowedSorts.timestamp;

    const [total, rows, inAgg, outAgg, adjAgg] = await Promise.all([
      this.prisma.stockLedger.count({ where }),
      this.prisma.stockLedger.findMany({
        where,
        include: {
          ingredient: { include: { category: true } },
          user: { select: { id: true, name: true, role: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.stockLedger.aggregate({
        where: { ...where, quantity: { gt: 0 }, refType: this.nonAdjustmentRef(where) },
        _sum: { quantity: true },
      }),
      this.prisma.stockLedger.aggregate({
        where: { ...where, quantity: { lt: 0 }, refType: this.nonAdjustmentRef(where) },
        _sum: { quantity: true },
      }),
      this.prisma.stockLedger.aggregate({
        where: { ...where, refType: LedgerRefType.ADJUSTMENT },
        _sum: { quantity: true },
      }),
    ]);

    const items = await this.enrichLedgerRows(rows);

    const totalIn = inAgg._sum.quantity ?? 0;
    const totalOut = outAgg._sum.quantity ?? 0;
    const totalAdjustment = adjAgg._sum.quantity ?? 0;

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      summary: {
        totalRows: total,
        totalIn,
        totalOut: Math.abs(totalOut),
        totalAdjustment,
        netChange: totalIn + totalOut + totalAdjustment,
      },
    };
  }

  private nonAdjustmentRef(where: Prisma.StockLedgerWhereInput): any {
    return where.refType && where.refType !== LedgerRefType.ADJUSTMENT
      ? where.refType
      : { not: LedgerRefType.ADJUSTMENT };
  }

  private async enrichLedgerRows(rows: any[]) {
    if (rows.length === 0) return rows;

    const pageReferenceIds = [
      ...new Set(rows.filter((r) => r.referenceId).map((r) => r.referenceId)),
    ];
    const correlationRows = pageReferenceIds.length
      ? await this.prisma.stockLedger.findMany({
          where: { referenceId: { in: pageReferenceIds } },
          select: {
            id: true,
            referenceId: true,
            ingredientId: true,
            quantity: true,
            locationType: true,
            locationId: true,
          },
        })
      : [];

    const locationRows = [...rows, ...correlationRows];
    const warehouseIds = [
      ...new Set(
        locationRows.filter((r) => r.locationType === 'WAREHOUSE').map((r) => r.locationId),
      ),
    ];
    const restaurantIds = [
      ...new Set(
        locationRows.filter((r) => r.locationType !== 'WAREHOUSE').map((r) => r.locationId),
      ),
    ];

    const warehouses = warehouseIds.length
      ? await this.prisma.warehouse.findMany({
          where: { id: { in: warehouseIds } },
          select: { id: true, name: true },
        })
      : [];
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));

    const restaurantMap = restaurantIds.length
      ? await this.integrationService.getRestaurantIdDetailsMap()
      : new Map<number, { name: string; slug: string | null }>();

    const groupMap = new Map<string, any[]>();
    const seenIds = new Set<number>();
    for (const row of locationRows) {
      if (!row.referenceId || seenIds.has(row.id)) continue;
      seenIds.add(row.id);
      const key = `${row.referenceId}|${row.ingredientId}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(row);
    }

    return rows.map((row) => {
      const isWarehouse = row.locationType === 'WAREHOUSE';
      const restaurant = isWarehouse ? null : restaurantMap.get(row.locationId);
      const locationName = isWarehouse
        ? (warehouseMap.get(row.locationId) ?? null)
        : (restaurant?.name ?? null);

      const movementType =
        row.refType === LedgerRefType.ADJUSTMENT
          ? 'ADJUSTMENT'
          : row.quantity > 0
            ? 'IN'
            : row.quantity < 0
              ? 'OUT'
              : 'ADJUSTMENT';

      const group = row.referenceId
        ? groupMap.get(`${row.referenceId}|${row.ingredientId}`)
        : undefined;
      const sourceEntry = (group || []).find((g) => g.quantity < 0);
      const destEntry = (group || []).find((g) => g.quantity > 0);

      let sourceLocation: any;
      let destinationLocation: any;

      if (sourceEntry && destEntry) {
        sourceLocation = this.locationLabel(sourceEntry, warehouseMap, restaurantMap);
        destinationLocation = this.locationLabel(destEntry, warehouseMap, restaurantMap);
      } else {
        const self = this.locationLabel(row, warehouseMap, restaurantMap);
        switch (row.refType) {
          case LedgerRefType.GOODS_RECEIPT:
            sourceLocation = { type: 'PURCHASE', name: 'Supplier / Purchase Order' };
            destinationLocation = self;
            break;
          case LedgerRefType.WASTE:
            sourceLocation = self;
            destinationLocation = { type: 'WASTE', name: 'Waste / Disposal' };
            break;
          case LedgerRefType.RECIPE_CONSUMPTION:
            sourceLocation = self;
            destinationLocation = { type: 'COST_CENTER', name: 'Cost Center Kitchen' };
            break;
          case LedgerRefType.ADJUSTMENT:
            sourceLocation = self;
            destinationLocation = self;
            break;
          default:
            sourceLocation = self;
            destinationLocation = self;
        }
      }

      const category = row.ingredient?.category ?? null;

      return {
        id: row.id,
        transactionNumber: row.referenceId,
        referenceId: row.referenceId,
        refType: row.refType,
        transactionType: this.refTypeLabel(row.refType),
        timestamp: row.timestamp,
        createdAt: row.timestamp,
        ingredientId: row.ingredientId,
        ingredient: {
          id: row.ingredient?.id ?? row.ingredientId,
          name: row.ingredient?.name ?? `Ingredient #${row.ingredientId}`,
          sku: row.ingredient?.sku ?? null,
          unit: row.ingredient?.unit ?? row.unit,
          category: category ? { id: category.id, name: category.name } : null,
        },
        categoryName: category?.name ?? null,
        unit: row.unit,
        locationType: row.locationType,
        locationId: row.locationId,
        locationName,
        warehouseId: isWarehouse ? row.locationId : null,
        warehouseName: isWarehouse ? locationName : null,
        restaurantId: isWarehouse ? null : row.locationId,
        restaurantName: isWarehouse ? null : locationName,
        quantity: row.quantity,
        changeQuantity: row.quantity,
        beforeQuantity: row.beforeQuantity,
        afterQuantity: row.afterQuantity,
        movementType,
        sourceLocation,
        destinationLocation,
        batchNumber: null,
        remarks: null,
        userId: row.userId,
        user: row.user ? { id: row.user.id, name: row.user.name, role: row.user.role } : null,
        userName: row.user?.name ?? 'System Integration',
      };
    });
  }

  private locationLabel(
    row: any,
    warehouseMap: Map<number, string>,
    restaurantMap: Map<number, { name: string; slug: string | null }>,
  ) {
    if (row.locationType === 'WAREHOUSE') {
      return {
        type: 'WAREHOUSE',
        name: warehouseMap.get(row.locationId) ?? `Warehouse #${row.locationId}`,
      };
    }
    const restaurant = restaurantMap.get(row.locationId);
    return {
      type: row.locationType,
      name: restaurant?.name ?? `${row.locationType} #${row.locationId}`,
    };
  }

  private refTypeLabel(refType: LedgerRefType): string {
    const labels: Record<string, string> = {
      PURCHASE: 'Purchase',
      GOODS_RECEIPT: 'Goods Receipt (GRN)',
      TRANSFER: 'Transfer',
      RECIPE_CONSUMPTION: 'Recipe Consumption',
      MATERIAL_RETURN: 'Material Return',
      WASTE: 'Waste',
      ADJUSTMENT: 'Stock Adjustment',
      OPENING_STOCK: 'Opening Stock',
    };
    return labels[refType] ?? refType;
  }

  // Dashboard Stats
  async getDashboardStats() {
    const warehouseStock = await this.prisma.warehouseInventory.findMany({
      include: { ingredient: true },
    });

    const storeStock = await this.prisma.storeInventory.findMany({
      include: { ingredient: true },
    });

    const kitchenStock = await this.prisma.kitchenInventory.findMany({
      include: { ingredient: true },
    });

    const pendingTransfers = await this.prisma.kitchenTransfer.count({
      where: { status: TransferStatus.PENDING },
    });

    // Check low stock levels across store & kitchen
    const lowStockCount =
      storeStock.filter(
        (s) => s.status === StockStatus.LOW_STOCK || s.status === StockStatus.OUT_OF_STOCK,
      ).length +
      kitchenStock.filter(
        (k) => k.status === StockStatus.LOW_STOCK || k.status === StockStatus.OUT_OF_STOCK,
      ).length;

    // Retrieve active ingredients, suppliers and POs
    const activeIngredientsCount = await this.prisma.ingredient.count({
      where: { isActive: true },
    });
    const suppliersCount = await this.prisma.supplier.count({ where: { isActive: true } });
    const pendingPosCount = await this.prisma.purchaseOrder.count({
      where: { status: { in: ['DRAFT', 'PENDING_APPROVAL'] } },
    });

    // Recent activities
    const recentActivities = await this.prisma.stockLedger.findMany({
      take: 8,
      include: { ingredient: true, user: true },
      orderBy: { timestamp: 'desc' },
    });

    return {
      kpis: {
        totalWarehouseItems: warehouseStock.length,
        totalStoreItems: storeStock.length,
        pendingTransfersCount: pendingTransfers,
        lowStockAlertsCount: lowStockCount,
        activeIngredientsCount,
        suppliersCount,
        pendingPosCount,
      },
      recentActivities: recentActivities.map((l) => ({
        id: l.id,
        ingredient: l.ingredient.name,
        qty: l.quantity,
        before: l.beforeQuantity,
        after: l.afterQuantity,
        unit: l.unit,
        refType: l.refType,
        refId: l.referenceId,
        location: `${l.locationType} (ID: ${l.locationId})`,
        user: l.user?.name ?? 'System Integration',
        time: l.timestamp,
      })),
    };
  }

  // Reports
  async getInventoryValuationReport() {
    const storeStock = await this.prisma.storeInventory.findMany({
      include: { ingredient: true },
    });

    // Get prices mapped to suppliers to determine cost valuation
    const supplierPrices = await this.prisma.supplierIngredientPrice.findMany();
    const priceMap = new Map<number, number>();
    supplierPrices.forEach((p) => {
      priceMap.set(p.ingredientId, p.price);
    });

    return storeStock.map((item) => {
      const avgPrice = priceMap.get(item.ingredientId) ?? 50; // fallback default price
      return {
        ingredientId: item.ingredientId,
        name: item.ingredient.name,
        sku: item.ingredient.sku,
        unit: item.ingredient.unit,
        availableQuantity: item.availableQuantity,
        unitCost: avgPrice,
        totalValuation: item.availableQuantity * avgPrice,
      };
    });
  }

  // Quick Seed helper to pre-fill test ingredients and recipes
  async seedDemoData() {
    await this.prisma.category.createMany({
      data: [
        { name: 'Grains' },
        { name: 'Vegetables' },
        { name: 'Dairy' },
        { name: 'Meat' },
        { name: 'Spices' },
      ],
      skipDuplicates: true,
    });

    const categoryGrains = await this.prisma.category.findFirst({ where: { name: 'Grains' } });
    const categoryMeat = await this.prisma.category.findFirst({ where: { name: 'Meat' } });
    const categorySpices = await this.prisma.category.findFirst({ where: { name: 'Spices' } });

    if (!categoryGrains || !categoryMeat || !categorySpices) {
      return { seeded: false, message: 'Categories seeding failed' };
    }

    const rice = await this.prisma.ingredient.upsert({
      where: { sku: 'ING-RICE' },
      update: {},
      create: {
        sku: 'ING-RICE',
        name: 'Basmati Rice',
        categoryId: categoryGrains.id,
        unit: 'KG',
        minimumStock: 10,
        maximumStock: 100,
        reorderLevel: 25,
      },
    });

    const chicken = await this.prisma.ingredient.upsert({
      where: { sku: 'ING-CHICKEN' },
      update: {},
      create: {
        sku: 'ING-CHICKEN',
        name: 'Fresh Chicken',
        categoryId: categoryMeat.id,
        unit: 'KG',
        minimumStock: 5,
        maximumStock: 50,
        reorderLevel: 15,
      },
    });

    const spice = await this.prisma.ingredient.upsert({
      where: { sku: 'ING-BIR-SPICE' },
      update: {},
      create: {
        sku: 'ING-BIR-SPICE',
        name: 'Biryani Spice Mix',
        categoryId: categorySpices.id,
        unit: 'GM',
        minimumStock: 500,
        maximumStock: 5000,
        reorderLevel: 1000,
      },
    });

    // Create a mock active recipe for Biryani (menu item ID 1 as placeholder)
    await this.prisma.recipe.upsert({
      where: { restaurantId_menuItemId: { restaurantId: 1, menuItemId: 1 } },
      update: {},
      create: {
        restaurantId: 1,
        categoryId: null,
        menuItemId: 1,
        menuItemName: 'Hyderabadi Chicken Biryani',
        yieldQuantity: 1,
        ingredients: {
          create: [
            { ingredientId: rice.id, quantity: 0.25, unit: 'KG', wastagePct: 2 },
            { ingredientId: chicken.id, quantity: 0.3, unit: 'KG', wastagePct: 5 },
            { ingredientId: spice.id, quantity: 30, unit: 'GM', wastagePct: 0 },
          ],
        },
      },
    });

    // Seed a default warehouse
    const warehouse = await this.prisma.warehouse.upsert({
      where: { name: 'Main Distribution Center' },
      update: {},
      create: {
        name: 'Main Distribution Center',
        location: 'Zone 4, Warehouse Ring Road',
      },
    });

    // Initialize some store and warehouse inventory stock
    await this.prisma.warehouseInventory.upsert({
      where: {
        warehouseId_ingredientId: {
          warehouseId: warehouse.id,
          ingredientId: rice.id,
        },
      },
      update: {},
      create: {
        warehouseId: warehouse.id,
        ingredientId: rice.id,
        availableQuantity: 500,
      },
    });

    await this.prisma.storeInventory.upsert({
      where: {
        restaurantId_ingredientId: {
          restaurantId: 1,
          ingredientId: rice.id,
        },
      },
      update: {},
      create: {
        restaurantId: 1,
        ingredientId: rice.id,
        availableQuantity: 50,
        minimumStock: 10,
        maximumStock: 100,
        reorderLevel: 25,
      },
    });

    await this.prisma.kitchenInventory.upsert({
      where: {
        restaurantId_ingredientId: {
          restaurantId: 1,
          ingredientId: rice.id,
        },
      },
      update: {},
      create: {
        restaurantId: 1,
        ingredientId: rice.id,
        availableQuantity: 15,
        minimumStock: 5,
        status: StockStatus.HEALTHY,
      },
    });

    return {
      seeded: true,
      message: 'Demo ingredients, recipe, warehouse, and stock balances initialized',
    };
  }
}
