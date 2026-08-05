import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  InventoryTransactionType,
  InventoryType,
  RequisitionStatus,
  StockStatus,
  TransferStatus,
} from '@prisma/client';

import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateKitchenTransferDto, TransferItemDto } from './dto/create-kitchen-transfer.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to resolve restaurant ID (default to first active restaurant if not specified)
   */
  private async getEffectiveRestaurantId(restaurantId?: number): Promise<number> {
    if (restaurantId) return restaurantId;
    const first = await this.prisma.restaurant.findFirst({ select: { id: true } });
    if (!first) throw new NotFoundException('No active restaurant found');
    return first.id;
  }

  /**
   * Inventory Dashboard Summary Metrics & Recent Activity Feed
   */
  async getDashboard(restaurantIdParam?: number) {
    const restaurantId = await this.getEffectiveRestaurantId(restaurantIdParam);

    const [
      storeItems,
      kitchenItems,
      totalItems,
      pendingRequisitionsCount,
      pendingTransfersCount,
      todayConsumptionLogs,
      recentLedgerLogs,
    ] = await Promise.all([
      this.prisma.storeInventory.findMany({
        where: { restaurantId },
        include: { item: true },
      }),
      this.prisma.kitchenInventory.findMany({
        where: { restaurantId },
        include: { item: true },
      }),
      this.prisma.inventoryItem.count({ where: { restaurantId, isActive: true } }),
      this.prisma.restaurantRequisition.count({
        where: { restaurantId, status: RequisitionStatus.PENDING },
      }),
      this.prisma.kitchenTransfer.count({
        where: { restaurantId, status: TransferStatus.PENDING },
      }),
      this.prisma.kitchenConsumptionLog.findMany({
        where: {
          restaurantId,
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        include: { item: true, recipe: true },
      }),
      this.prisma.inventoryTransactionLedger.findMany({
        where: { restaurantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { item: true },
      }),
    ]);

    // Calculate total values
    const storeInventoryValue = storeItems.reduce(
      (sum, s) => sum + s.availableQuantity * (s.item.costPrice || 0),
      0,
    );
    const kitchenInventoryValue = kitchenItems.reduce(
      (sum, k) => sum + k.availableQuantity * (k.item.costPrice || 0),
      0,
    );

    const lowStockItemsCount =
      storeItems.filter((s) => s.status === StockStatus.LOW_STOCK).length +
      kitchenItems.filter((k) => k.status === StockStatus.LOW_STOCK).length;

    const outOfStockItemsCount =
      storeItems.filter((s) => s.status === StockStatus.OUT_OF_STOCK).length +
      kitchenItems.filter((k) => k.status === StockStatus.OUT_OF_STOCK).length;

    const todayIngredientConsumptionCount = todayConsumptionLogs.reduce(
      (sum, log) => sum + log.quantityConsumed,
      0,
    );

    return {
      storeInventoryValue: Math.round(storeInventoryValue * 100) / 100,
      kitchenInventoryValue: Math.round(kitchenInventoryValue * 100) / 100,
      totalInventoryItems: totalItems,
      lowStockItems: lowStockItemsCount,
      outOfStockItems: outOfStockItemsCount,
      pendingRequisitions: pendingRequisitionsCount,
      pendingKitchenTransfers: pendingTransfersCount,
      todayIngredientConsumption: Math.round(todayIngredientConsumptionCount * 100) / 100,
      todayWaste: 0,
      recentActivities: recentLedgerLogs.map((log) => ({
        id: log.id,
        item: log.item.name,
        inventoryType: log.inventoryType,
        transactionType: log.transactionType,
        quantity: log.quantity,
        unit: log.unit,
        createdAt: log.createdAt,
      })),
    };
  }

  /**
   * List Store Inventory Items
   */
  async listStoreInventory(
    restaurantIdParam?: number,
    query?: { search?: string; category?: string; status?: string },
  ) {
    const restaurantId = await this.getEffectiveRestaurantId(restaurantIdParam);

    const items = await this.prisma.storeInventory.findMany({
      where: {
        restaurantId,
        ...(query?.status ? { status: query.status as StockStatus } : {}),
        item: {
          ...(query?.category ? { category: query.category } : {}),
          ...(query?.search
            ? {
                name: { contains: query.search, mode: 'insensitive' },
              }
            : {}),
        },
      },
      include: {
        item: true,
      },
      orderBy: { item: { name: 'asc' } },
    });

    return items.map((s) => ({
      id: s.id,
      itemId: s.itemId,
      name: s.item.name,
      sku: s.item.sku,
      category: s.item.category,
      unit: s.item.unit,
      costPrice: s.item.costPrice,
      availableQuantity: s.availableQuantity,
      reservedQuantity: s.reservedQuantity,
      minimumStock: s.minimumStock,
      maximumStock: s.maximumStock,
      reorderLevel: s.reorderLevel,
      status: s.status,
      updatedAt: s.updatedAt,
    }));
  }

  /**
   * List Kitchen Inventory Items
   */
  async listKitchenInventory(
    restaurantIdParam?: number,
    query?: { search?: string; status?: string },
  ) {
    const restaurantId = await this.getEffectiveRestaurantId(restaurantIdParam);

    const items = await this.prisma.kitchenInventory.findMany({
      where: {
        restaurantId,
        ...(query?.status ? { status: query.status as StockStatus } : {}),
        item: {
          ...(query?.search
            ? {
                name: { contains: query.search, mode: 'insensitive' },
              }
            : {}),
        },
      },
      include: {
        item: true,
      },
      orderBy: { item: { name: 'asc' } },
    });

    return items.map((k) => ({
      id: k.id,
      itemId: k.itemId,
      name: k.item.name,
      category: k.item.category,
      unit: k.item.unit,
      availableQuantity: k.availableQuantity,
      minimumStock: k.minimumStock,
      status: k.status,
      updatedAt: k.updatedAt,
    }));
  }

  /**
   * Create an Inventory Item & initialize Store + Kitchen Stock balances
   */
  async createInventoryItem(restaurantIdParam: number | undefined, dto: CreateInventoryItemDto) {
    const restaurantId = await this.getEffectiveRestaurantId(restaurantIdParam);

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          restaurantId,
          name: dto.name,
          sku: dto.sku,
          category: dto.category || 'General',
          unit: dto.unit || 'KG',
          costPrice: dto.costPrice || 0,
        },
      });

      const storeStock = dto.initialStoreStock || 0;
      const storeMin = dto.storeMinStock || 10;
      const storeStatus: StockStatus =
        storeStock <= 0
          ? StockStatus.OUT_OF_STOCK
          : storeStock <= storeMin
            ? StockStatus.LOW_STOCK
            : StockStatus.HEALTHY;

      await tx.storeInventory.create({
        data: {
          restaurantId,
          itemId: item.id,
          availableQuantity: storeStock,
          minimumStock: storeMin,
          maximumStock: dto.storeMaxStock || 200,
          reorderLevel: dto.storeReorderLevel || 15,
          status: storeStatus,
        },
      });

      const kitchenStock = dto.initialKitchenStock || 0;
      const kitchenMin = dto.kitchenMinStock || 5;
      const kitchenStatus: StockStatus =
        kitchenStock <= 0
          ? StockStatus.OUT_OF_STOCK
          : kitchenStock <= kitchenMin
            ? StockStatus.LOW_STOCK
            : StockStatus.HEALTHY;

      await tx.kitchenInventory.create({
        data: {
          restaurantId,
          itemId: item.id,
          availableQuantity: kitchenStock,
          minimumStock: kitchenMin,
          status: kitchenStatus,
        },
      });

      // Log store receipt ledger if stock > 0
      if (storeStock > 0) {
        await tx.inventoryTransactionLedger.create({
          data: {
            restaurantId,
            inventoryType: InventoryType.STORE,
            itemId: item.id,
            transactionType: InventoryTransactionType.STORE_RECEIVE_WAREHOUSE,
            quantity: storeStock,
            beforeQuantity: 0,
            afterQuantity: storeStock,
            unit: item.unit,
            referenceId: 'INITIAL_STOCK',
          },
        });
      }

      if (kitchenStock > 0) {
        await tx.inventoryTransactionLedger.create({
          data: {
            restaurantId,
            inventoryType: InventoryType.KITCHEN,
            itemId: item.id,
            transactionType: InventoryTransactionType.KITCHEN_RECEIVE,
            quantity: kitchenStock,
            beforeQuantity: 0,
            afterQuantity: kitchenStock,
            unit: item.unit,
            referenceId: 'INITIAL_STOCK',
          },
        });
      }

      return item;
    });
  }

  /**
   * List Recipes (Bill of Materials) for menu items
   */
  async listRecipes(restaurantIdParam?: number) {
    const restaurantId = await this.getEffectiveRestaurantId(restaurantIdParam);

    const recipes = await this.prisma.recipe.findMany({
      where: { restaurantId, isActive: true },
      include: {
        menuItem: { select: { id: true, name: true, price: true, imageUrl: true } },
        ingredients: {
          include: {
            item: true,
          },
        },
      },
      orderBy: { menuItem: { name: 'asc' } },
    });

    // Also fetch menu items that don't have a recipe defined yet
    const menuItems = await this.prisma.menuItem.findMany({
      where: { restaurantId, isAvailable: true },
      select: { id: true, name: true, price: true, imageUrl: true },
    });

    const configuredMap = new Map(recipes.map((r) => [r.menuItemId, r]));

    return menuItems.map((m) => {
      const recipe = configuredMap.get(m.id);
      return {
        menuItemId: m.id,
        menuItemName: m.name,
        price: m.price,
        imageUrl: m.imageUrl,
        recipeId: recipe?.id ?? null,
        recipeName: recipe?.name ?? `${m.name} Recipe`,
        hasRecipe: Boolean(recipe),
        yieldQuantity: recipe?.yieldQuantity ?? 1,
        ingredients:
          recipe?.ingredients.map((ing) => ({
            id: ing.id,
            itemId: ing.itemId,
            itemName: ing.item.name,
            quantity: ing.quantity,
            unit: ing.unit,
            costPrice: ing.item.costPrice,
          })) ?? [],
      };
    });
  }

  /**
   * Create or Update Recipe for MenuItem
   */
  async createOrUpdateRecipe(restaurantIdParam: number | undefined, dto: CreateRecipeDto) {
    const restaurantId = await this.getEffectiveRestaurantId(restaurantIdParam);

    const existingMenuItem = await this.prisma.menuItem.findUnique({
      where: { id: dto.menuItemId },
    });
    if (!existingMenuItem) throw new NotFoundException('Menu item not found');

    return this.prisma.$transaction(async (tx) => {
      let recipe = await tx.recipe.findFirst({
        where: { restaurantId, menuItemId: dto.menuItemId },
      });

      if (recipe) {
        recipe = await tx.recipe.update({
          where: { id: recipe.id },
          data: {
            name: dto.name,
            yieldQuantity: dto.yieldQuantity || 1,
            ingredients: {
              deleteMany: {},
              create: dto.ingredients.map((ing) => ({
                itemId: ing.itemId,
                quantity: ing.quantity,
                unit: ing.unit,
              })),
            },
          },
        });
      } else {
        recipe = await tx.recipe.create({
          data: {
            restaurantId,
            menuItemId: dto.menuItemId,
            name: dto.name,
            yieldQuantity: dto.yieldQuantity || 1,
            ingredients: {
              create: dto.ingredients.map((ing) => ({
                itemId: ing.itemId,
                quantity: ing.quantity,
                unit: ing.unit,
              })),
            },
          },
        });
      }

      return recipe;
    });
  }

  /**
   * Create Kitchen Transfer (Store -> Kitchen)
   */
  async createKitchenTransfer(
    restaurantIdParam: number | undefined,
    userId: number,
    dto: CreateKitchenTransferDto,
  ) {
    const restaurantId = await this.getEffectiveRestaurantId(restaurantIdParam);
    const transferNumber = `KT-${Date.now().toString().slice(-6)}`;

    return this.prisma.kitchenTransfer.create({
      data: {
        restaurantId,
        transferNumber,
        requestedByUserId: userId,
        notes: dto.notes,
        status: TransferStatus.PENDING,
        items: {
          create: dto.items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        items: { include: { item: true } },
      },
    });
  }

  /**
   * Approve & Issue Kitchen Stock Transfer
   * Business Rules:
   * - Reduce Store Inventory.
   * - Increase Kitchen Inventory.
   * - Insert transaction in Store ledger.
   * - Insert transaction in Kitchen ledger.
   * - Validate Store Low Stock -> auto-create Restaurant Requisition if store reaches min stock.
   */
  async approveKitchenTransfer(transferId: number, userId: number) {
    const transfer = await this.prisma.kitchenTransfer.findUnique({
      where: { id: transferId },
      include: { items: { include: { item: true } } },
    });

    if (!transfer) throw new NotFoundException('Kitchen transfer request not found');
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException(`Transfer is already ${transfer.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      for (const tItem of transfer.items) {
        // Fetch current Store Inventory balance
        const storeInv = await tx.storeInventory.findUnique({
          where: { itemId: tItem.itemId },
        });

        if (!storeInv || storeInv.availableQuantity < tItem.quantity) {
          throw new BadRequestException(
            `Insufficient Store stock for ingredient "${tItem.item.name}". Available: ${storeInv?.availableQuantity ?? 0}, Requested: ${tItem.quantity}`,
          );
        }

        // 1. Deduct Store Inventory
        const storeBefore = storeInv.availableQuantity;
        const storeAfter = storeBefore - tItem.quantity;
        const newStoreStatus: StockStatus =
          storeAfter <= 0
            ? StockStatus.OUT_OF_STOCK
            : storeAfter <= storeInv.minimumStock
              ? StockStatus.LOW_STOCK
              : StockStatus.HEALTHY;

        await tx.storeInventory.update({
          where: { id: storeInv.id },
          data: {
            availableQuantity: storeAfter,
            status: newStoreStatus,
          },
        });

        // Store Transaction Ledger
        await tx.inventoryTransactionLedger.create({
          data: {
            restaurantId: transfer.restaurantId,
            inventoryType: InventoryType.STORE,
            itemId: tItem.itemId,
            transactionType: InventoryTransactionType.KITCHEN_ISSUE,
            referenceId: transfer.transferNumber,
            quantity: -tItem.quantity,
            beforeQuantity: storeBefore,
            afterQuantity: storeAfter,
            unit: tItem.item.unit,
            performedByUserId: userId,
          },
        });

        // 2. Increase Kitchen Inventory
        const kitchenInv = await tx.kitchenInventory.findUnique({
          where: { itemId: tItem.itemId },
        });

        const kitchenBefore = kitchenInv?.availableQuantity ?? 0;
        const kitchenAfter = kitchenBefore + tItem.quantity;
        const kitchenMin = kitchenInv?.minimumStock ?? 0;
        const newKitchenStatus: StockStatus =
          kitchenAfter <= 0
            ? StockStatus.OUT_OF_STOCK
            : kitchenAfter <= kitchenMin
              ? StockStatus.LOW_STOCK
              : StockStatus.HEALTHY;

        if (kitchenInv) {
          await tx.kitchenInventory.update({
            where: { id: kitchenInv.id },
            data: {
              availableQuantity: kitchenAfter,
              status: newKitchenStatus,
            },
          });
        } else {
          await tx.kitchenInventory.create({
            data: {
              restaurantId: transfer.restaurantId,
              itemId: tItem.itemId,
              availableQuantity: kitchenAfter,
              minimumStock: 5,
              status: newKitchenStatus,
            },
          });
        }

        // Kitchen Transaction Ledger
        await tx.inventoryTransactionLedger.create({
          data: {
            restaurantId: transfer.restaurantId,
            inventoryType: InventoryType.KITCHEN,
            itemId: tItem.itemId,
            transactionType: InventoryTransactionType.KITCHEN_RECEIVE,
            referenceId: transfer.transferNumber,
            quantity: tItem.quantity,
            beforeQuantity: kitchenBefore,
            afterQuantity: kitchenAfter,
            unit: tItem.item.unit,
            performedByUserId: userId,
          },
        });

        // 3. Store Requisition Suggestion check: if Store stock reached low stock level
        if (
          newStoreStatus === StockStatus.LOW_STOCK ||
          newStoreStatus === StockStatus.OUT_OF_STOCK
        ) {
          const reqNum = `REQ-AUTO-${Date.now().toString().slice(-6)}`;
          await tx.restaurantRequisition.create({
            data: {
              restaurantId: transfer.restaurantId,
              requisitionNumber: reqNum,
              status: RequisitionStatus.PENDING,
              isAutoGenerated: true,
              notes: `Auto-generated requisition: Store stock for ${tItem.item.name} fell below minimum (${storeInv.minimumStock} ${tItem.item.unit})`,
              items: {
                create: [
                  {
                    itemId: tItem.itemId,
                    quantity: (storeInv.maximumStock || 100) - storeAfter,
                  },
                ],
              },
            },
          });
        }
      }

      // Update transfer status
      return tx.kitchenTransfer.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.APPROVED,
          approvedByUserId: userId,
        },
        include: { items: { include: { item: true } } },
      });
    });
  }

  /**
   * List Kitchen Transfers
   */
  async listKitchenTransfers(restaurantIdParam?: number) {
    const restaurantId = await this.getEffectiveRestaurantId(restaurantIdParam);

    return this.prisma.kitchenTransfer.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { item: true } },
      },
    });
  }

  /**
   * CORE BUSINESS LOGIC: Automatic Kitchen Inventory Consumption on PREPARING order status
   */
  async consumeOrderRecipeIngredients(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                recipes: {
                  where: { isActive: true },
                  include: {
                    ingredients: {
                      include: { item: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      this.logger.warn(`Order #${orderId} not found for recipe consumption.`);
      return;
    }

    // Check if consumption already logged for this order to prevent double deduction
    const existingLogCount = await this.prisma.kitchenConsumptionLog.count({
      where: { orderId },
    });
    if (existingLogCount > 0) {
      this.logger.log(`Order #${order.orderNumber} recipe ingredients already consumed.`);
      return;
    }

    this.logger.log(`Executing automatic recipe consumption for Order #${order.orderNumber}...`);

    await this.prisma.$transaction(async (tx) => {
      for (const orderItem of order.items) {
        const recipe = orderItem.menuItem.recipes[0];
        if (!recipe || !recipe.ingredients.length) {
          this.logger.log(
            `No active recipe configured for Menu Item "${orderItem.menuItem.name}". Skipping ingredient deduction.`,
          );
          continue;
        }

        for (const ing of recipe.ingredients) {
          // Calculate requirement: (ing.quantity * orderItem.quantity) / recipe.yieldQuantity
          const totalRequirement =
            (ing.quantity * orderItem.quantity) / (recipe.yieldQuantity || 1);

          const kitchenInv = await tx.kitchenInventory.findUnique({
            where: { itemId: ing.itemId },
            include: { item: true },
          });

          const currentQty = kitchenInv?.availableQuantity ?? 0;
          const afterQty = Math.max(0, currentQty - totalRequirement);
          const minStock = kitchenInv?.minimumStock ?? 0;

          const newStatus: StockStatus =
            afterQty <= 0
              ? StockStatus.OUT_OF_STOCK
              : afterQty <= minStock
                ? StockStatus.LOW_STOCK
                : StockStatus.HEALTHY;

          // Update Kitchen Inventory
          if (kitchenInv) {
            await tx.kitchenInventory.update({
              where: { id: kitchenInv.id },
              data: {
                availableQuantity: afterQty,
                status: newStatus,
              },
            });
          } else {
            await tx.kitchenInventory.create({
              data: {
                restaurantId: order.restaurantId,
                itemId: ing.itemId,
                availableQuantity: afterQty,
                minimumStock: 5,
                status: newStatus,
              },
            });
          }

          // Write Kitchen Consumption Log
          await tx.kitchenConsumptionLog.create({
            data: {
              restaurantId: order.restaurantId,
              orderId: order.id,
              menuItemId: orderItem.menuItemId,
              recipeId: recipe.id,
              itemId: ing.itemId,
              quantityConsumed: totalRequirement,
              beforeQuantity: currentQty,
              afterQuantity: afterQty,
              unit: ing.unit,
            },
          });

          // Write Kitchen Inventory Transaction Ledger
          await tx.inventoryTransactionLedger.create({
            data: {
              restaurantId: order.restaurantId,
              inventoryType: InventoryType.KITCHEN,
              itemId: ing.itemId,
              transactionType: InventoryTransactionType.RECIPE_CONSUMPTION,
              orderId: order.id,
              recipeId: recipe.id,
              referenceId: order.orderNumber,
              quantity: -totalRequirement,
              beforeQuantity: currentQty,
              afterQuantity: afterQty,
              unit: ing.unit,
            },
          });

          // AUTOMATIC LOW STOCK DETECTION & KITCHEN TRANSFER REQUISITION SUGGESTION
          if (newStatus === StockStatus.LOW_STOCK || newStatus === StockStatus.OUT_OF_STOCK) {
            this.logger.warn(
              `Low stock detected for Kitchen Ingredient "${ing.item.name}". Auto-generating Kitchen Transfer Suggestion.`,
            );

            const transferNum = `KT-AUTO-${Date.now().toString().slice(-6)}`;
            await tx.kitchenTransfer.create({
              data: {
                restaurantId: order.restaurantId,
                transferNumber: transferNum,
                status: TransferStatus.PENDING,
                notes: `Auto-suggested transfer: Kitchen stock for "${ing.item.name}" reached low stock (${afterQty} ${ing.unit}) after Order #${order.orderNumber}`,
                items: {
                  create: [
                    {
                      itemId: ing.itemId,
                      quantity: Math.max(10, minStock * 3), // Replenish target
                    },
                  ],
                },
              },
            });
          }
        }
      }
    });

    this.logger.log(`Completed recipe consumption for Order #${order.orderNumber}.`);
  }

  /**
   * List Consumption History Logs
   */
  async listConsumptionHistory(restaurantIdParam?: number) {
    const restaurantId = await this.getEffectiveRestaurantId(restaurantIdParam);

    const logs = await this.prisma.kitchenConsumptionLog.findMany({
      where: { restaurantId },
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: {
        item: true,
        recipe: {
          include: { menuItem: true },
        },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      orderId: log.orderId,
      menuItemName: log.recipe.menuItem.name,
      recipeName: log.recipe.name,
      ingredientName: log.item.name,
      quantityConsumed: log.quantityConsumed,
      unit: log.unit,
      beforeQuantity: log.beforeQuantity,
      afterQuantity: log.afterQuantity,
      timestamp: log.timestamp,
    }));
  }

  /**
   * List Transaction Ledgers
   */
  async listTransactionLedger(restaurantIdParam?: number, inventoryType?: InventoryType) {
    const restaurantId = await this.getEffectiveRestaurantId(restaurantIdParam);

    return this.prisma.inventoryTransactionLedger.findMany({
      where: {
        restaurantId,
        ...(inventoryType ? { inventoryType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        item: true,
      },
    });
  }

  /**
   * List Restaurant Requisitions (Store -> Warehouse)
   */
  async listRequisitions(restaurantIdParam?: number) {
    const restaurantId = await this.getEffectiveRestaurantId(restaurantIdParam);

    return this.prisma.restaurantRequisition.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { item: true } },
      },
    });
  }

  /**
   * Create Store -> Warehouse Requisition
   */
  async createRequisition(
    restaurantIdParam: number | undefined,
    userId: number,
    dto: CreateRequisitionDto,
  ) {
    const restaurantId = await this.getEffectiveRestaurantId(restaurantIdParam);
    const requisitionNumber = `REQ-${Date.now().toString().slice(-6)}`;

    return this.prisma.restaurantRequisition.create({
      data: {
        restaurantId,
        requisitionNumber,
        requestedByUserId: userId,
        notes: dto.notes,
        status: RequisitionStatus.PENDING,
        items: {
          create: dto.items.map((i: TransferItemDto) => ({
            itemId: i.itemId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        items: { include: { item: true } },
      },
    });
  }

  /**
   * Seed Sample Inventory Items & Recipes if inventory is empty
   */
  async seedSampleInventoryData(restaurantIdParam?: number) {
    const restaurantId = await this.getEffectiveRestaurantId(restaurantIdParam);

    const existingCount = await this.prisma.inventoryItem.count({ where: { restaurantId } });
    if (existingCount > 0) return { seeded: false, message: 'Inventory items already exist.' };

    const sampleItems = [
      {
        name: 'Basmati Rice',
        category: 'Grains',
        unit: 'KG',
        costPrice: 90,
        storeQty: 100,
        storeMin: 20,
        kitchenQty: 25,
        kitchenMin: 5,
      },
      {
        name: 'Chicken Breast',
        category: 'Poultry',
        unit: 'KG',
        costPrice: 220,
        storeQty: 80,
        storeMin: 15,
        kitchenQty: 18,
        kitchenMin: 5,
      },
      {
        name: 'Cooking Oil',
        category: 'Oils & Fats',
        unit: 'L',
        costPrice: 140,
        storeQty: 50,
        storeMin: 10,
        kitchenQty: 10,
        kitchenMin: 2,
      },
      {
        name: 'Table Salt',
        category: 'Spices & Condiments',
        unit: 'KG',
        costPrice: 20,
        storeQty: 30,
        storeMin: 5,
        kitchenQty: 5,
        kitchenMin: 1,
      },
      {
        name: 'Garam Masala',
        category: 'Spices & Condiments',
        unit: 'GM',
        costPrice: 0.5,
        storeQty: 5000,
        storeMin: 1000,
        kitchenQty: 1000,
        kitchenMin: 200,
      },
      {
        name: 'Fresh Vegetables',
        category: 'Produce',
        unit: 'KG',
        costPrice: 50,
        storeQty: 40,
        storeMin: 10,
        kitchenQty: 12,
        kitchenMin: 3,
      },
      {
        name: 'Paneer / Cottage Cheese',
        category: 'Dairy',
        unit: 'KG',
        costPrice: 320,
        storeQty: 25,
        storeMin: 5,
        kitchenQty: 8,
        kitchenMin: 2,
      },
    ];

    const createdItemsMap = new Map<string, number>();

    for (const item of sampleItems) {
      const created = await this.createInventoryItem(restaurantId, {
        name: item.name,
        category: item.category,
        unit: item.unit,
        costPrice: item.costPrice,
        initialStoreStock: item.storeQty,
        storeMinStock: item.storeMin,
        storeMaxStock: item.storeQty * 2,
        initialKitchenStock: item.kitchenQty,
        kitchenMinStock: item.kitchenMin,
      });
      createdItemsMap.set(item.name, created.id);
    }

    // Connect sample recipes to existing menu items
    const menuItems = await this.prisma.menuItem.findMany({ where: { restaurantId } });

    for (const menuItem of menuItems) {
      const nameLower = menuItem.name.toLowerCase();
      const ingredients: { itemId: number; quantity: number; unit: string }[] = [];

      if (nameLower.includes('biryani') || nameLower.includes('rice')) {
        const riceId = createdItemsMap.get('Basmati Rice');
        const oilId = createdItemsMap.get('Cooking Oil');
        const saltId = createdItemsMap.get('Table Salt');
        const spicesId = createdItemsMap.get('Garam Masala');

        if (riceId) ingredients.push({ itemId: riceId, quantity: 0.25, unit: 'KG' });
        if (oilId) ingredients.push({ itemId: oilId, quantity: 0.02, unit: 'L' });
        if (saltId) ingredients.push({ itemId: saltId, quantity: 0.005, unit: 'KG' });
        if (spicesId) ingredients.push({ itemId: spicesId, quantity: 10, unit: 'GM' });

        if (nameLower.includes('chicken')) {
          const chickenId = createdItemsMap.get('Chicken Breast');
          if (chickenId) ingredients.push({ itemId: chickenId, quantity: 0.2, unit: 'KG' });
        }
      } else if (nameLower.includes('paneer') || nameLower.includes('cottage')) {
        const paneerId = createdItemsMap.get('Paneer / Cottage Cheese');
        const oilId = createdItemsMap.get('Cooking Oil');
        const spicesId = createdItemsMap.get('Garam Masala');
        if (paneerId) ingredients.push({ itemId: paneerId, quantity: 0.18, unit: 'KG' });
        if (oilId) ingredients.push({ itemId: oilId, quantity: 0.03, unit: 'L' });
        if (spicesId) ingredients.push({ itemId: spicesId, quantity: 15, unit: 'GM' });
      } else {
        const vegId = createdItemsMap.get('Fresh Vegetables');
        const saltId = createdItemsMap.get('Table Salt');
        if (vegId) ingredients.push({ itemId: vegId, quantity: 0.15, unit: 'KG' });
        if (saltId) ingredients.push({ itemId: saltId, quantity: 0.003, unit: 'KG' });
      }

      if (ingredients.length > 0) {
        await this.createOrUpdateRecipe(restaurantId, {
          menuItemId: menuItem.id,
          name: `${menuItem.name} Standard Recipe`,
          yieldQuantity: 1,
          ingredients,
        });
      }
    }

    return { seeded: true, message: 'Sample inventory items and recipes seeded successfully.' };
  }
}
