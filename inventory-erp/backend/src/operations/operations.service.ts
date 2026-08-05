import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  BranchStoreRequestStatus,
  KitchenRequestStatus,
  LedgerRefType,
  StockStatus,
  TransferStatus,
} from '@prisma/client';

import { IntegrationService } from '../integration/integration.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBranchStoreRequestDto,
  CreateKitchenRequestDto,
  CreateKitchenTransferDto,
  CreateWasteDto,
} from './dto/operations.dto';

@Injectable()
export class OperationsService {
  private readonly logger = new Logger(OperationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationService: IntegrationService,
  ) {}

  private async resolveRestaurantContext(slug: string) {
    const restaurant = await this.integrationService.getRestaurantBySlug(slug);
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with slug "${slug}" not found`);
    }
    return restaurant;
  }

  async getDashboard(slug: string) {
    const restaurant = await this.resolveRestaurantContext(slug);
    const restaurantId = restaurant.id;

    const [
      storeStock,
      kitchenStock,
      pendingKitchenRequests,
      pendingKitchenTransfers,
      recentKitchenRequests,
      recentKitchenTransfers,
      recentConsumption,
      wasteLogs,
    ] = await Promise.all([
      this.prisma.storeInventory.findMany({
        where: { restaurantId },
        include: { ingredient: { include: { category: true } } },
      }),
      this.prisma.kitchenInventory.findMany({
        where: { restaurantId },
        include: { ingredient: { include: { category: true } } },
      }),
      this.prisma.kitchenRequest.count({
        where: { restaurantId, status: KitchenRequestStatus.PENDING },
      }),
      this.prisma.kitchenTransfer.count({
        where: { restaurantId, status: TransferStatus.PENDING },
      }),
      this.prisma.kitchenRequest.findMany({
        where: { restaurantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { ingredient: true } },
          requestedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.kitchenTransfer.findMany({
        where: { restaurantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { ingredient: true } },
          requestedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.stockLedger.findMany({
        where: {
          locationType: 'KITCHEN',
          locationId: restaurantId,
          refType: LedgerRefType.RECIPE_CONSUMPTION,
        },
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: { ingredient: true },
      }),
      this.prisma.wasteLog.findMany({
        where: { restaurantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { ingredient: true },
      }),
    ]);

    const storeLowStock = storeStock.filter(
      (s) => s.status === StockStatus.LOW_STOCK || s.status === StockStatus.OUT_OF_STOCK,
    );
    const kitchenLowStock = kitchenStock.filter(
      (k) => k.status === StockStatus.LOW_STOCK || k.status === StockStatus.OUT_OF_STOCK,
    );

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        address: restaurant.address,
        city: restaurant.city,
        imageUrl: restaurant.imageUrl,
        cuisineType: restaurant.cuisineType,
      },
      kpis: {
        storeItems: storeStock.length,
        kitchenItems: kitchenStock.length,
        storeLowStock: storeLowStock.length,
        kitchenLowStock: kitchenLowStock.length,
        pendingKitchenRequests,
        pendingKitchenTransfers,
        totalWasteLogs: wasteLogs.length,
      },
      lowStockPreview: {
        store: storeLowStock.slice(0, 5).map((s) => ({
          ingredient: s.ingredient.name,
          available: s.availableQuantity,
          minimum: s.minimumStock,
          unit: s.ingredient.unit,
          status: s.status,
        })),
        kitchen: kitchenLowStock.slice(0, 5).map((k) => ({
          ingredient: k.ingredient.name,
          available: k.availableQuantity,
          minimum: k.minimumStock,
          unit: k.ingredient.unit,
          status: k.status,
        })),
      },
      recentKitchenRequests: recentKitchenRequests.map((r) => ({
        id: r.id,
        requestNumber: r.requestNumber,
        status: r.status,
        requestedBy: r.requestedBy?.name,
        itemCount: r.items.length,
        createdAt: r.createdAt,
      })),
      recentKitchenTransfers: recentKitchenTransfers.map((t) => ({
        id: t.id,
        transferNumber: t.transferNumber,
        status: t.status,
        requestedBy: t.requestedBy?.name,
        itemCount: t.items.length,
        createdAt: t.createdAt,
      })),
      recentConsumption: recentConsumption.map((c) => ({
        id: c.id,
        ingredient: c.ingredient?.name,
        quantity: c.quantity,
        unit: c.unit,
        timestamp: c.timestamp,
      })),
      recentWaste: wasteLogs.map((w) => ({
        id: w.id,
        ingredient: w.ingredient?.name,
        quantity: w.quantity,
        wasteType: w.wasteType,
        createdAt: w.createdAt,
      })),
    };
  }

  async getStoreInventory(slug: string) {
    const restaurant = await this.resolveRestaurantContext(slug);
    return this.prisma.storeInventory.findMany({
      where: { restaurantId: restaurant.id },
      include: { ingredient: { include: { category: true } } },
      orderBy: { ingredient: { name: 'asc' } },
    });
  }

  async getKitchenInventory(slug: string) {
    const restaurant = await this.resolveRestaurantContext(slug);
    return this.prisma.kitchenInventory.findMany({
      where: { restaurantId: restaurant.id },
      include: { ingredient: { include: { category: true } } },
      orderBy: { ingredient: { name: 'asc' } },
    });
  }

  async getKitchenRequests(slug: string) {
    const restaurant = await this.resolveRestaurantContext(slug);
    return this.prisma.kitchenRequest.findMany({
      where: { restaurantId: restaurant.id },
      include: {
        items: { include: { ingredient: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createKitchenRequest(slug: string, dto: CreateKitchenRequestDto, userId: number) {
    const restaurant = await this.resolveRestaurantContext(slug);
    const requestNumber = `KR-${Date.now().toString().slice(-6)}`;

    return this.prisma.kitchenRequest.create({
      data: {
        requestNumber,
        restaurantId: restaurant.id,
        status: KitchenRequestStatus.PENDING,
        requestedById: userId,
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: { include: { ingredient: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });
  }

  async approveKitchenRequest(requestId: number, userId: number) {
    const request = await this.prisma.kitchenRequest.findUnique({
      where: { id: requestId },
      include: { items: true },
    });

    if (!request) {
      throw new NotFoundException(`Kitchen request #${requestId} not found`);
    }

    if (request.status !== KitchenRequestStatus.PENDING) {
      throw new BadRequestException(`Kitchen request #${requestId} is not pending`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Approve the kitchen request
      const approved = await tx.kitchenRequest.update({
        where: { id: requestId },
        data: {
          status: KitchenRequestStatus.APPROVED,
          approvedById: userId,
        },
      });

      // Create a KitchenTransfer to move stock from store → kitchen
      const transferNumber = `KT-KR${request.requestNumber.slice(-6)}`;

      const transfer = await tx.kitchenTransfer.create({
        data: {
          transferNumber,
          restaurantId: request.restaurantId,
          status: TransferStatus.PENDING,
          requestedById: userId,
          notes: `Auto-created from approved kitchen request ${request.requestNumber}`,
          items: {
            create: request.items.map((item) => ({
              ingredientId: item.ingredientId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: { include: { ingredient: true } },
          requestedBy: { select: { id: true, name: true } },
        },
      });

      return { request: approved, transfer };
    });
  }

  async rejectKitchenRequest(slug: string, requestId: number, userId: number) {
    await this.resolveRestaurantContext(slug);
    const request = await this.prisma.kitchenRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException(`Kitchen request #${requestId} not found`);
    }
    if (request.status !== KitchenRequestStatus.PENDING) {
      throw new BadRequestException(`Kitchen request #${requestId} is not pending`);
    }
    return this.prisma.kitchenRequest.update({
      where: { id: requestId },
      data: { status: KitchenRequestStatus.REJECTED, approvedById: userId },
    });
  }

  async dispatchKitchenTransfer(slug: string, transferId: number, userId: number) {
    const restaurant = await this.resolveRestaurantContext(slug);
    const transfer = await this.prisma.kitchenTransfer.findUnique({
      where: { id: transferId },
      include: { items: { include: { ingredient: true } } },
    });
    if (!transfer) {
      throw new NotFoundException(`Kitchen transfer #${transferId} not found`);
    }
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException(
        `Kitchen transfer #${transferId} is not pending. Current status: ${transfer.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        const storeStock = await tx.storeInventory.findUnique({
          where: {
            restaurantId_ingredientId: {
              restaurantId: transfer.restaurantId,
              ingredientId: item.ingredientId,
            },
          },
        });

        if (!storeStock || storeStock.availableQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient store stock for "${item.ingredient?.name || `ingredient #${item.ingredientId}`}". Available: ${storeStock?.availableQuantity ?? 0}, Requested: ${item.quantity}`,
          );
        }

        const storeBefore = storeStock.availableQuantity;
        const storeAfter = storeBefore - item.quantity;
        const storeMin = storeStock.minimumStock;

        const storeStatus: StockStatus =
          storeAfter <= 0
            ? StockStatus.OUT_OF_STOCK
            : storeAfter <= storeMin
              ? StockStatus.LOW_STOCK
              : StockStatus.HEALTHY;

        await tx.storeInventory.update({
          where: { id: storeStock.id },
          data: { availableQuantity: storeAfter, status: storeStatus },
        });

        await tx.stockLedger.create({
          data: {
            ingredientId: item.ingredientId,
            locationType: 'STORE',
            locationId: transfer.restaurantId,
            refType: LedgerRefType.TRANSFER,
            referenceId: transfer.transferNumber,
            quantity: -item.quantity,
            beforeQuantity: storeBefore,
            afterQuantity: storeAfter,
            unit: item.ingredient?.unit || 'KG',
            userId,
          },
        });

        const kitchenStock = await tx.kitchenInventory.findUnique({
          where: {
            restaurantId_ingredientId: {
              restaurantId: transfer.restaurantId,
              ingredientId: item.ingredientId,
            },
          },
        });

        const kitchenBefore = kitchenStock?.availableQuantity ?? 0;
        const kitchenAfter = kitchenBefore + item.quantity;
        const kitchenMin = kitchenStock?.minimumStock ?? 5;

        const kitchenStatus: StockStatus =
          kitchenAfter <= 0
            ? StockStatus.OUT_OF_STOCK
            : kitchenAfter <= kitchenMin
              ? StockStatus.LOW_STOCK
              : StockStatus.HEALTHY;

        if (kitchenStock) {
          await tx.kitchenInventory.update({
            where: { id: kitchenStock.id },
            data: { availableQuantity: kitchenAfter, status: kitchenStatus },
          });
        } else {
          await tx.kitchenInventory.create({
            data: {
              restaurantId: transfer.restaurantId,
              ingredientId: item.ingredientId,
              availableQuantity: kitchenAfter,
              minimumStock: kitchenMin,
              status: kitchenStatus,
            },
          });
        }

        await tx.stockLedger.create({
          data: {
            ingredientId: item.ingredientId,
            locationType: 'KITCHEN',
            locationId: transfer.restaurantId,
            refType: LedgerRefType.TRANSFER,
            referenceId: transfer.transferNumber,
            quantity: item.quantity,
            beforeQuantity: kitchenBefore,
            afterQuantity: kitchenAfter,
            unit: item.ingredient?.unit || 'KG',
            userId,
          },
        });
      }

      const updatedTransfer = await tx.kitchenTransfer.update({
        where: { id: transferId },
        data: { status: TransferStatus.COMPLETED, approvedById: userId },
        include: {
          items: { include: { ingredient: true } },
          requestedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      });

      const requestNumberSuffix = transfer.transferNumber.replace(/^KT-(KR|AUTO)-/, '');
      const linkedRequest = await tx.kitchenRequest.findFirst({
        where: {
          restaurantId: transfer.restaurantId,
          requestNumber: { endsWith: requestNumberSuffix },
          status: KitchenRequestStatus.APPROVED,
        },
      });

      if (linkedRequest) {
        await tx.kitchenRequest.update({
          where: { id: linkedRequest.id },
          data: { status: KitchenRequestStatus.COMPLETED },
        });
      }

      return { transfer: updatedTransfer, linkedRequest };
    });
  }

  async rejectKitchenTransfer(slug: string, transferId: number, userId: number) {
    await this.resolveRestaurantContext(slug);
    const transfer = await this.prisma.kitchenTransfer.findUnique({
      where: { id: transferId },
    });
    if (!transfer) {
      throw new NotFoundException(`Kitchen transfer #${transferId} not found`);
    }
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException(`Kitchen transfer #${transferId} is not pending`);
    }
    return this.prisma.kitchenTransfer.update({
      where: { id: transferId },
      data: { status: TransferStatus.REJECTED, approvedById: userId },
    });
  }

  async getKitchenTransfers(slug: string) {
    const restaurant = await this.resolveRestaurantContext(slug);
    return this.prisma.kitchenTransfer.findMany({
      where: { restaurantId: restaurant.id },
      include: {
        items: { include: { ingredient: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createKitchenTransfer(slug: string, dto: CreateKitchenTransferDto, userId: number) {
    const restaurant = await this.resolveRestaurantContext(slug);
    const transferNumber = `KT-${Date.now().toString().slice(-6)}`;

    return this.prisma.kitchenTransfer.create({
      data: {
        transferNumber,
        restaurantId: restaurant.id,
        status: TransferStatus.PENDING,
        requestedById: userId,
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: { include: { ingredient: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });
  }

  async approveKitchenTransfer(transferId: number, userId: number) {
    const transfer = await this.prisma.kitchenTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });

    if (!transfer) {
      throw new NotFoundException(`Kitchen transfer #${transferId} not found`);
    }

    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException(`Kitchen transfer #${transferId} is not pending`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Deduct from store inventory and add to kitchen inventory
      for (const item of transfer.items) {
        // Deduct from store
        const storeStock = await tx.storeInventory.findUnique({
          where: {
            restaurantId_ingredientId: {
              restaurantId: transfer.restaurantId,
              ingredientId: item.ingredientId,
            },
          },
        });

        if (!storeStock || storeStock.availableQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient store stock for ingredient #${item.ingredientId}`,
          );
        }

        const storeBefore = storeStock.availableQuantity;
        const storeAfter = storeBefore - item.quantity;
        const storeMin = storeStock.minimumStock;

        const storeStatus: StockStatus =
          storeAfter <= 0
            ? StockStatus.OUT_OF_STOCK
            : storeAfter <= storeMin
              ? StockStatus.LOW_STOCK
              : StockStatus.HEALTHY;

        await tx.storeInventory.update({
          where: { id: storeStock.id },
          data: { availableQuantity: storeAfter, status: storeStatus },
        });

        // Ledger entry for store deduction
        await tx.stockLedger.create({
          data: {
            ingredientId: item.ingredientId,
            locationType: 'STORE',
            locationId: transfer.restaurantId,
            refType: LedgerRefType.TRANSFER,
            referenceId: transfer.transferNumber,
            quantity: -item.quantity,
            beforeQuantity: storeBefore,
            afterQuantity: storeAfter,
            unit:
              (await tx.ingredient.findUnique({ where: { id: item.ingredientId } }))?.unit || 'KG',
            userId,
          },
        });

        // Add to kitchen
        const kitchenStock = await tx.kitchenInventory.findUnique({
          where: {
            restaurantId_ingredientId: {
              restaurantId: transfer.restaurantId,
              ingredientId: item.ingredientId,
            },
          },
        });

        const kitchenBefore = kitchenStock?.availableQuantity ?? 0;
        const kitchenAfter = kitchenBefore + item.quantity;
        const kitchenMin = kitchenStock?.minimumStock ?? 5;

        const kitchenStatus: StockStatus =
          kitchenAfter <= 0
            ? StockStatus.OUT_OF_STOCK
            : kitchenAfter <= kitchenMin
              ? StockStatus.LOW_STOCK
              : StockStatus.HEALTHY;

        if (kitchenStock) {
          await tx.kitchenInventory.update({
            where: { id: kitchenStock.id },
            data: { availableQuantity: kitchenAfter, status: kitchenStatus },
          });
        } else {
          await tx.kitchenInventory.create({
            data: {
              restaurantId: transfer.restaurantId,
              ingredientId: item.ingredientId,
              availableQuantity: kitchenAfter,
              minimumStock: kitchenMin,
              status: kitchenStatus,
            },
          });
        }

        // Ledger entry for kitchen addition
        const ingredient = await tx.ingredient.findUnique({ where: { id: item.ingredientId } });
        await tx.stockLedger.create({
          data: {
            ingredientId: item.ingredientId,
            locationType: 'KITCHEN',
            locationId: transfer.restaurantId,
            refType: LedgerRefType.TRANSFER,
            referenceId: transfer.transferNumber,
            quantity: item.quantity,
            beforeQuantity: kitchenBefore,
            afterQuantity: kitchenAfter,
            unit: ingredient?.unit || 'KG',
            userId,
          },
        });
      }

      // Mark transfer as completed
      return tx.kitchenTransfer.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.COMPLETED,
          approvedById: userId,
        },
        include: {
          items: { include: { ingredient: true } },
          requestedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      });
    });
  }

  async getConsumption(slug: string) {
    const restaurant = await this.resolveRestaurantContext(slug);
    return this.prisma.stockLedger.findMany({
      where: {
        locationType: 'KITCHEN',
        locationId: restaurant.id,
        refType: LedgerRefType.RECIPE_CONSUMPTION,
      },
      include: {
        ingredient: { include: { category: true } },
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }

  async getWaste(slug: string) {
    const restaurant = await this.resolveRestaurantContext(slug);
    return this.prisma.wasteLog.findMany({
      where: { restaurantId: restaurant.id },
      include: {
        ingredient: true,
        loggedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWaste(slug: string, dto: CreateWasteDto, userId: number) {
    const restaurant = await this.resolveRestaurantContext(slug);

    return this.prisma.$transaction(async (tx) => {
      // Deduct from kitchen inventory
      const kitchenStock = await tx.kitchenInventory.findUnique({
        where: {
          restaurantId_ingredientId: {
            restaurantId: restaurant.id,
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

      if (kitchenStock) {
        await tx.kitchenInventory.update({
          where: { id: kitchenStock.id },
          data: { availableQuantity: afterQty, status: newStatus },
        });
      }

      // Ledger entry
      const ingredient = await tx.ingredient.findUnique({ where: { id: dto.ingredientId } });
      await tx.stockLedger.create({
        data: {
          ingredientId: dto.ingredientId,
          locationType: 'KITCHEN',
          locationId: restaurant.id,
          refType: LedgerRefType.WASTE,
          referenceId: `WASTE-${Date.now()}`,
          quantity: -dto.quantity,
          beforeQuantity: beforeQty,
          afterQuantity: afterQty,
          unit: ingredient?.unit || 'KG',
          userId,
        },
      });

      // Create waste log
      return tx.wasteLog.create({
        data: {
          restaurantId: restaurant.id,
          ingredientId: dto.ingredientId,
          quantity: dto.quantity,
          wasteType: dto.wasteType,
          notes: dto.notes,
          loggedById: userId,
        },
        include: {
          ingredient: true,
          loggedBy: { select: { id: true, name: true } },
        },
      });
    });
  }

  async getReports(slug: string) {
    const restaurant = await this.resolveRestaurantContext(slug);
    const restaurantId = restaurant.id;

    const [
      storeItems,
      kitchenItems,
      pendingBranchRequests,
      pendingKitchenRequests,
      pendingTransfers,
      totalWaste,
      consumptionTotal,
    ] = await Promise.all([
      this.prisma.storeInventory.aggregate({
        where: { restaurantId },
        _count: { id: true },
        _sum: { availableQuantity: true },
      }),
      this.prisma.kitchenInventory.aggregate({
        where: { restaurantId },
        _count: { id: true },
        _sum: { availableQuantity: true },
      }),
      this.prisma.branchStoreRequest.count({
        where: { restaurantId, status: BranchStoreRequestStatus.PENDING },
      }),
      this.prisma.kitchenRequest.count({
        where: { restaurantId, status: KitchenRequestStatus.PENDING },
      }),
      this.prisma.kitchenTransfer.count({
        where: { restaurantId, status: TransferStatus.PENDING },
      }),
      this.prisma.wasteLog.aggregate({
        where: { restaurantId },
        _count: { id: true },
        _sum: { quantity: true },
      }),
      this.prisma.stockLedger.aggregate({
        where: {
          locationType: 'KITCHEN',
          locationId: restaurantId,
          refType: LedgerRefType.RECIPE_CONSUMPTION,
        },
        _count: { id: true },
        _sum: { quantity: true },
      }),
    ]);

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
      },
      storeSummary: {
        totalItems: storeItems._count.id,
        totalQuantity: storeItems._sum.availableQuantity ?? 0,
      },
      kitchenSummary: {
        totalItems: kitchenItems._count.id,
        totalQuantity: kitchenItems._sum.availableQuantity ?? 0,
      },
      pendingRequests: {
        branchStoreRequests: pendingBranchRequests,
        kitchenRequests: pendingKitchenRequests,
        kitchenTransfers: pendingTransfers,
      },
      wasteSummary: {
        totalLogs: totalWaste._count.id,
        totalQuantity: totalWaste._sum.quantity ?? 0,
      },
      consumptionSummary: {
        totalEntries: consumptionTotal._count.id,
        totalQuantity: Math.abs(consumptionTotal._sum.quantity ?? 0),
      },
    };
  }

  async getStoreRequests(slug: string) {
    const restaurant = await this.resolveRestaurantContext(slug);
    const [requests, transfers] = await Promise.all([
      this.prisma.branchStoreRequest.findMany({
        where: { restaurantId: restaurant.id },
        include: {
          items: { include: { ingredient: true } },
          requestedBy: { select: { id: true, name: true } },
          fulfilledBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.warehouseTransfer.findMany({
        where: { restaurantId: restaurant.id },
        select: {
          transferNumber: true,
          status: true,
        },
      }),
    ]);

    const transferBySuffix = new Map<string, { transferNumber: string; status: string }>();
    for (const transfer of transfers) {
      const suffix = transfer.transferNumber.split('-').pop()?.slice(-6);
      if (suffix) transferBySuffix.set(suffix, transfer);
    }

    return requests.map((request) => {
      const suffix = request.requestNumber.split('-').pop()?.slice(-6) || '';
      const transfer = transferBySuffix.get(suffix);

      return {
        ...request,
        transferNumber: transfer?.transferNumber ?? null,
        transferStatus: transfer?.status ?? null,
      };
    });
  }

  async createStoreRequest(slug: string, dto: CreateBranchStoreRequestDto, userId: number) {
    const restaurant = await this.resolveRestaurantContext(slug);
    const requestNumber = `SR-${Date.now().toString().slice(-6)}`;

    return this.prisma.branchStoreRequest.create({
      data: {
        requestNumber,
        restaurantId: restaurant.id,
        status: BranchStoreRequestStatus.PENDING,
        isAutoGenerated: false,
        requestedById: userId,
        notes: dto.notes || null,
        items: {
          create: dto.items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: { include: { ingredient: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });
  }
}
