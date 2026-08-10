import { Injectable, Logger } from '@nestjs/common';
import {
  BranchStoreRequestStatus,
  KitchenRequestStatus,
  LedgerRefType,
  RequestSource,
  StockStatus,
  TransferStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);
  private readonly rmsBaseUrl = process.env.RMS_URL || 'http://localhost:4000';

  constructor(private readonly prisma: PrismaService) {}

  private async fetchRestaurantList(): Promise<
    Array<{
      id: number;
      name: string;
      slug: string;
      address?: string;
      city?: string;
      imageUrl?: string;
      isActive?: boolean;
      cuisineType?: string;
    }>
  > {
    try {
      const res = await fetch(`${this.rmsBaseUrl}/api/restaurants?limit=50&offset=0`, {
        headers: { 'X-Client-Type': 'web' },
      });
      if (!res.ok) {
        this.logger.warn(`RMS returned ${res.status} for GET /api/restaurants`);
        return [];
      }
      const body = await res.json();
      return body?.data?.items || body?.items || body?.data || [];
    } catch (err) {
      this.logger.warn(
        `Failed to reach RMS at ${this.rmsBaseUrl}: ${err instanceof Error ? err.message : err}`,
      );
      return [];
    }
  }

  async getRestaurants() {
    // 1. Fetch restaurants from the Restaurant Management System
    const rmsRestaurants = await this.fetchRestaurantList();
    if (rmsRestaurants.length === 0) return this.buildRestaurantCards([]);

    // 2. Fetch operational metrics from Inventory ERP for all restaurants
    const rmsIds = rmsRestaurants.map((r) => r.id);

    const [storeStock, kitchenStock, pendingRequests] = await Promise.all([
      this.prisma.storeInventory.findMany({
        where: { restaurantId: { in: rmsIds } },
        select: { restaurantId: true, availableQuantity: true, minimumStock: true, status: true },
      }),
      this.prisma.kitchenInventory.findMany({
        where: { restaurantId: { in: rmsIds } },
        select: { restaurantId: true, availableQuantity: true, minimumStock: true, status: true },
      }),
      this.prisma.branchStoreRequest.groupBy({
        by: ['restaurantId'],
        where: { status: BranchStoreRequestStatus.PENDING },
        _count: { id: true },
      }),
    ]);

    // 3. Aggregate metrics per restaurant
    const metricsMap = new Map<
      number,
      {
        storeStatus: string;
        kitchenStatus: string;
        pendingRequests: number;
        lowStock: number;
      }
    >();

    for (const id of rmsIds) {
      metricsMap.set(id, {
        storeStatus: 'Healthy',
        kitchenStatus: 'Healthy',
        pendingRequests: 0,
        lowStock: 0,
      });
    }

    for (const row of storeStock) {
      const m = metricsMap.get(row.restaurantId);
      if (!m) continue;
      if (row.status === 'OUT_OF_STOCK' || row.status === 'LOW_STOCK') {
        m.storeStatus = row.status === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Low Stock';
      }
      if (row.status === 'LOW_STOCK' || row.status === 'OUT_OF_STOCK') m.lowStock++;
    }

    for (const row of kitchenStock) {
      const m = metricsMap.get(row.restaurantId);
      if (!m) continue;
      if (row.status === 'OUT_OF_STOCK' || row.status === 'LOW_STOCK') {
        m.kitchenStatus = row.status === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Low Stock';
      }
      if (row.status === 'LOW_STOCK' || row.status === 'OUT_OF_STOCK') m.lowStock++;
    }

    for (const row of pendingRequests) {
      const m = metricsMap.get(row.restaurantId);
      if (m) m.pendingRequests = row._count.id;
    }

    // 4. Merge RMS data with inventory metrics
    return this.buildRestaurantCards(rmsRestaurants, metricsMap);
  }

  private buildRestaurantCards(
    restaurants: Array<{
      id: number;
      name: string;
      slug: string;
      address?: string;
      city?: string;
      imageUrl?: string;
      isActive?: boolean;
      cuisineType?: string;
    }>,
    metricsMap?: Map<
      number,
      {
        storeStatus: string;
        kitchenStatus: string;
        pendingRequests: number;
        lowStock: number;
      }
    >,
  ) {
    return restaurants.map((r) => {
      const metrics = metricsMap?.get(r.id);
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        address: r.address || null,
        city: r.city || null,
        imageUrl: r.imageUrl || null,
        isActive: r.isActive ?? true,
        cuisineType: r.cuisineType || null,
        storeStatus: metrics?.storeStatus || '—',
        kitchenStatus: metrics?.kitchenStatus || '—',
        pendingRequests: metrics?.pendingRequests ?? 0,
        lowStock: metrics?.lowStock ?? 0,
      };
    });
  }

  async getRestaurantBySlug(slug: string): Promise<{
    id: number;
    name: string;
    slug: string;
    address?: string;
    city?: string;
    imageUrl?: string;
    isActive?: boolean;
    cuisineType?: string;
  } | null> {
    const items = await this.fetchRestaurantList();
    return items.find((r) => r.slug === slug) || null;
  }

  async getRestaurantIdNameMap(): Promise<Map<number, string>> {
    const items = await this.fetchRestaurantList();
    return new Map(items.map((r) => [r.id, r.name]));
  }

  async getRestaurantIdDetailsMap(): Promise<Map<number, { name: string; slug: string | null }>> {
    const items = await this.fetchRestaurantList();
    return new Map(items.map((r) => [r.id, { name: r.name, slug: r.slug ?? null }]));
  }

  async getMenuCatalog(restaurantId: number): Promise<{
    restaurantId: number;
    categories: Array<{ id: number; restaurantId: number; name: string; itemCount: number }>;
    items: Array<{
      id: number;
      name: string;
      categoryId: number;
      isAvailable: boolean;
      price: number | null;
      imageUrl: string | null;
    }>;
  }> {
    const empty = { restaurantId, categories: [], items: [] };
    try {
      const res = await fetch(
        `${this.rmsBaseUrl}/api/menu/restaurant/${restaurantId}?limit=50&offset=0`,
        { headers: { 'X-Client-Type': 'web' } },
      );
      if (!res.ok) {
        this.logger.warn(`RMS returned ${res.status} for GET /api/menu/restaurant/${restaurantId}`);
        return empty;
      }
      const body = await res.json();
      const data = body?.data || body || {};

      const categories = Array.isArray(data.categories)
        ? data.categories.map(
            (c: { id: number; restaurantId?: number; name: string; items?: unknown[] }) => ({
              id: c.id,
              restaurantId: c.restaurantId ?? restaurantId,
              name: c.name,
              itemCount: Array.isArray(c.items) ? c.items.length : 0,
            }),
          )
        : [];

      const items = Array.isArray(data.items)
        ? data.items.map(
            (item: {
              id: number;
              name: string;
              categoryId: number;
              isAvailable?: boolean;
              price?: number;
              imageUrl?: string | null;
            }) => ({
              id: item.id,
              name: item.name,
              categoryId: item.categoryId,
              isAvailable: item.isAvailable ?? true,
              price: item.price ?? null,
              imageUrl: item.imageUrl ?? null,
            }),
          )
        : [];

      return { restaurantId, categories, items };
    } catch (err) {
      this.logger.warn(
        `Failed to fetch menu catalog for restaurant ${restaurantId}: ${err instanceof Error ? err.message : err}`,
      );
      return empty;
    }
  }

  async getKitchenRequests(restaurantId: number) {
    return this.prisma.kitchenRequest.findMany({
      where: { restaurantId },
      include: {
        items: { include: { ingredient: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createKitchenRequest(dto: {
    restaurantId: number;
    requestedById: number;
    notes?: string;
    items: Array<{ ingredientId: number; quantity: number }>;
  }) {
    const requestNumber = `KR-${Date.now().toString().slice(-6)}`;

    return this.prisma.kitchenRequest.create({
      data: {
        requestNumber,
        restaurantId: dto.restaurantId,
        status: KitchenRequestStatus.PENDING,
        requestedById: dto.requestedById,
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

  async getKitchenTransfers(restaurantId: number) {
    return this.prisma.kitchenTransfer.findMany({
      where: { restaurantId },
      include: {
        items: { include: { ingredient: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDashboard(restaurantId: number) {
    const [
      storeItems,
      kitchenItems,
      pendingRequests,
      pendingTransfers,
      lowStockStore,
      lowStockKitchen,
    ] = await Promise.all([
      this.prisma.storeInventory.findMany({ where: { restaurantId } }),
      this.prisma.kitchenInventory.findMany({ where: { restaurantId } }),
      this.prisma.kitchenRequest.count({
        where: { restaurantId, status: KitchenRequestStatus.PENDING },
      }),
      this.prisma.kitchenTransfer.count({
        where: { restaurantId, status: TransferStatus.PENDING },
      }),
      this.prisma.storeInventory.findMany({
        where: { restaurantId, status: { in: [StockStatus.LOW_STOCK, StockStatus.OUT_OF_STOCK] } },
      }),
      this.prisma.kitchenInventory.findMany({
        where: { restaurantId, status: { in: [StockStatus.LOW_STOCK, StockStatus.OUT_OF_STOCK] } },
      }),
    ]);

    const storeValue = storeItems.reduce(
      (s, i) => s + i.availableQuantity * (i.ingredientId ? 1 : 0),
      0,
    );
    const kitchenValue = kitchenItems.reduce(
      (s, i) => s + i.availableQuantity * (i.ingredientId ? 1 : 0),
      0,
    );

    return {
      storeInventoryValue: Math.round(storeValue * 100) / 100,
      kitchenInventoryValue: Math.round(kitchenValue * 100) / 100,
      totalStoreItems: storeItems.length,
      totalKitchenItems: kitchenItems.length,
      lowStockStoreItems: lowStockStore.length,
      lowStockKitchenItems: lowStockKitchen.length,
      pendingKitchenRequests: pendingRequests,
      pendingKitchenTransfers: pendingTransfers,
    };
  }

  async getConsumption(restaurantId: number) {
    return this.prisma.stockLedger.findMany({
      where: {
        locationType: 'KITCHEN',
        locationId: restaurantId,
        refType: LedgerRefType.RECIPE_CONSUMPTION,
      },
      include: { ingredient: true },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }

  async getKitchenStock(restaurantId: number) {
    return this.prisma.kitchenInventory.findMany({
      where: { restaurantId },
      include: { ingredient: true },
    });
  }

  async checkAvailability(restaurantId: number, menuItemId: number, quantity: number) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { restaurantId_menuItemId: { restaurantId, menuItemId } },
      include: { ingredients: { include: { ingredient: true } } },
    });

    if (!recipe || !recipe.isActive) {
      // If no recipe is defined, we assume it does not require inventory tracking
      return { available: true, message: 'No inventory recipe mapped' };
    }

    const checks = [];
    let isAvailable = true;

    for (const item of recipe.ingredients) {
      const needed = item.quantity * quantity * (1 + (item.wastagePct || 0) / 100);

      const kitchenStock = await this.prisma.kitchenInventory.findUnique({
        where: {
          restaurantId_ingredientId: {
            restaurantId,
            ingredientId: item.ingredientId,
          },
        },
      });

      const current = kitchenStock?.availableQuantity ?? 0;
      const status = current >= needed;
      if (!status) isAvailable = false;

      checks.push({
        ingredientId: item.ingredientId,
        name: item.ingredient.name,
        needed,
        current,
        status,
      });
    }

    return { available: isAvailable, checks };
  }

  async consumeRecipe(dto: {
    restaurantId: number;
    orderId: string;
    orderItems: Array<{ menuItemId: number; quantity: number }>;
  }) {
    const { restaurantId, orderId, orderItems } = dto;

    // 1. Idempotency Check: check if order was already consumed in StockLedger
    const existingLedger = await this.prisma.stockLedger.findFirst({
      where: {
        locationType: 'KITCHEN',
        locationId: restaurantId,
        refType: LedgerRefType.RECIPE_CONSUMPTION,
        referenceId: orderId,
      },
    });

    if (existingLedger) {
      return {
        success: true,
        message: 'Order recipe ingredients already consumed (idempotent bypass)',
      };
    }

    const consumptionLog: Array<{ ingredientId: number; name: string; quantity: number }> = [];

    // Run in a secure database transaction
    return this.prisma.$transaction(async (tx) => {
      for (const item of orderItems) {
        const recipe = await tx.recipe.findUnique({
          where: { restaurantId_menuItemId: { restaurantId, menuItemId: item.menuItemId } },
          include: { ingredients: { include: { ingredient: true } } },
        });

        if (!recipe || !recipe.isActive) continue;

        for (const reqIng of recipe.ingredients) {
          // Calculate needed quantity taking wastage into account
          const factor = 1 + (reqIng.wastagePct || 0) / 100;
          const totalQty = reqIng.quantity * item.quantity * factor;

          // Deduct from Kitchen Inventory
          const kitchenStock = await tx.kitchenInventory.findUnique({
            where: {
              restaurantId_ingredientId: {
                restaurantId,
                ingredientId: reqIng.ingredientId,
              },
            },
          });

          const beforeQty = kitchenStock?.availableQuantity ?? 0;
          const afterQty = Math.max(0, beforeQty - totalQty);
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
              data: {
                availableQuantity: afterQty,
                status: newStatus,
              },
            });
          } else {
            await tx.kitchenInventory.create({
              data: {
                restaurantId,
                ingredientId: reqIng.ingredientId,
                availableQuantity: afterQty,
                minimumStock: minStock,
                status: newStatus,
              },
            });
          }

          // Log in stock ledger
          await tx.stockLedger.create({
            data: {
              ingredientId: reqIng.ingredientId,
              locationType: 'KITCHEN',
              locationId: restaurantId,
              refType: LedgerRefType.RECIPE_CONSUMPTION,
              referenceId: orderId,
              quantity: -totalQty,
              beforeQuantity: beforeQty,
              afterQuantity: afterQty,
              unit: reqIng.ingredient.unit,
            },
          });

          consumptionLog.push({
            ingredientId: reqIng.ingredientId,
            name: reqIng.ingredient.name,
            quantity: totalQty,
          });

          // 2. Low Stock Automation Trigger: if kitchen inventory goes below safety threshold
          if (newStatus === StockStatus.LOW_STOCK || newStatus === StockStatus.OUT_OF_STOCK) {
            // Auto create a pending Kitchen Request (kitchen -> store) if one doesn't exist already
            const existingPendingRequest = await tx.kitchenRequest.findFirst({
              where: {
                restaurantId,
                status: KitchenRequestStatus.PENDING,
                items: {
                  some: { ingredientId: reqIng.ingredientId },
                },
              },
            });

            if (!existingPendingRequest) {
              const requestNumber = `KR-AUTO-${Date.now().toString().slice(-6)}`;
              // Let's get the first active Super Admin or Store Manager to set as requestedById
              const systemUser = await tx.user.findFirst({
                where: { isActive: true },
              });

              if (systemUser) {
                await tx.kitchenRequest.create({
                  data: {
                    requestNumber,
                    restaurantId,
                    status: KitchenRequestStatus.PENDING,
                    requestSource: RequestSource.AUTO,
                    requestedById: systemUser.id,
                    notes: `Auto-generated: Kitchen stock for "${reqIng.ingredient.name}" fell below minimum (${minStock} ${reqIng.ingredient.unit})`,
                    items: {
                      create: [
                        {
                          ingredientId: reqIng.ingredientId,
                          quantity: 50, // default refill batch quantity
                        },
                      ],
                    },
                  },
                });
              }
            }
          }
        }
      }

      return { success: true, orderId, consumedItems: consumptionLog };
    });
  }
}
