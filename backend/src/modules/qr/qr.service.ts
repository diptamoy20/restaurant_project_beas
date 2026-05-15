import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderSource } from '@prisma/client';

import { QRCreateOrderResponseDto } from './dto/qr-create-order-response.dto';
import { QRCreateOrderItemDto, QRCreateOrderDto } from './dto/qr-create-order.dto';
import { QRMenuResponseDto } from './dto/qr-menu-response.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CreateOrderType } from '../orders/types/create-order.type';

@Injectable()
export class QrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Get menu for QR ordering - validates restaurant and table, returns menu data
   */
  async getMenuForTable(restaurantId: number, tableId: number): Promise<QRMenuResponseDto> {
    // Validate restaurant exists and is active
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant || !restaurant.isActive) {
      throw new NotFoundException('Restaurant not found or inactive');
    }

    // Validate table exists and belongs to the restaurant
    const table = await this.prisma.restaurantTable.findUnique({
      where: { id: tableId },
    });

    if (!table || table.restaurantId !== restaurantId) {
      throw new NotFoundException('Table not found or does not belong to this restaurant');
    }

    // Get categories with menu items for this restaurant
    const categories = await this.prisma.category.findMany({
      where: {
        restaurantId,
        menuItems: {
          some: {
            isAvailable: true,
          },
        },
      },
      include: {
        menuItems: {
          where: {
            isAvailable: true,
          },
          include: {
            variants: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Map the data to response DTO
    const mappedCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description || undefined,
      items: category.menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || undefined,
        imageUrl: item.imageUrl || undefined,
        price: item.price,
        isAvailable: item.isAvailable,
        preparationTime: item.preparationTime || undefined,
        categoryId: item.categoryId,
        variants: item.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          price: variant.price,
          isAvailable: true, // Variants don't have availability flag, assume available
        })),
      })),
    }));

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        description: restaurant.description || undefined,
        tableId: table.id,
        tableName: table.tableNumber, // Use tableNumber instead of name
      },
      categories: mappedCategories,
    };
  }

  /**
   * Create QR order - delegates to centralized OrderService
   */
  async createQrOrder(orderData: QRCreateOrderDto): Promise<QRCreateOrderResponseDto> {
    // Validate restaurant and table (reuse validation logic)
    await this.getMenuForTable(orderData.restaurantId, orderData.tableId);

    // Prepare order payload for centralized OrderService
    const orderPayload: CreateOrderType = {
      userId: undefined, // Guest order - no user
      restaurantId: orderData.restaurantId,
      tableId: orderData.tableId,
      addressId: undefined, // No address for dine-in
      source: OrderSource.QR_DINE_IN,
      orderType: 'DINE_IN',
      paymentMethod: orderData.paymentMethod,
      discountAmount: 0,
      items: orderData.items.map((item) => ({
        menuItemId: item.menuItemId,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    };

    // Delegate to centralized OrderService
    const order = await this.ordersService.createOrder(orderPayload);

    // Calculate estimated time based on preparation times
    const estimatedTime = await this.calculateEstimatedTime(orderData.items);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      estimatedTime,
      finalAmount: order.finalAmount,
    };
  }

  /**
   * Calculate estimated preparation time based on menu items
   */
  private async calculateEstimatedTime(items: QRCreateOrderItemDto[]): Promise<number> {
    const menuItemIds = items.map((item) => item.menuItemId);

    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
      },
      select: {
        id: true,
        preparationTime: true,
      },
    });

    const menuItemPrepTimes = new Map(
      menuItems.map((item) => [item.id, item.preparationTime || 10]), // Default 10 minutes if not set
    );

    // Find the maximum preparation time among all items
    const maxPrepTime = Math.max(
      ...items.map((item) => menuItemPrepTimes.get(item.menuItemId) || 10),
    );

    // Add buffer time for order processing and serving
    return maxPrepTime + 5; // 5 minutes buffer
  }
}
