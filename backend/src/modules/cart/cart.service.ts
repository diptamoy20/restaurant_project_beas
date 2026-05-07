import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItemResponseDto } from './dto/cart-item-response.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: number): Promise<CartItemResponseDto[]> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        menuItem: true,
        variant: true,
      },
    });

    return cartItems.map((item) => this.mapCartItem(item));
  }

  async addToCart(userId: number, payload: CreateCartItemDto): Promise<CartItemResponseDto> {
    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        menuItemId: payload.menuItemId,
        variantId: payload.variantId || null,
      },
    });

    let cartItem;
    if (existingItem) {
      // Update quantity if item already exists
      cartItem = await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + payload.quantity,
        },
        include: {
          menuItem: true,
          variant: true,
        },
      });
    } else {
      // Create new cart item
      cartItem = await this.prisma.cartItem.create({
        data: {
          userId,
          menuItemId: payload.menuItemId,
          variantId: payload.variantId,
          quantity: payload.quantity,
          price: payload.price,
        },
        include: {
          menuItem: true,
          variant: true,
        },
      });
    }

    return this.mapCartItem(cartItem);
  }

  async updateCartItem(
    userId: number,
    menuItemId: number,
    payload: UpdateCartItemDto,
  ): Promise<CartItemResponseDto> {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        menuItemId,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    const updatedItem = await this.prisma.cartItem.update({
      where: { id: cartItem.id },
      data: {
        quantity: payload.quantity,
        price: payload.price,
      },
      include: {
        menuItem: true,
        variant: true,
      },
    });

    return this.mapCartItem(updatedItem);
  }

  async removeFromCart(userId: number, menuItemId: number): Promise<void> {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        menuItemId,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItem.id },
    });
  }

  async clearCart(userId: number): Promise<void> {
    await this.prisma.cartItem.deleteMany({
      where: { userId },
    });
  }

  private mapCartItem(item: any): CartItemResponseDto {
    return {
      id: item.id,
      userId: item.userId,
      menuItemId: item.menuItemId,
      variantId: item.variantId,
      quantity: item.quantity,
      price: item.price,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      menuItem: item.menuItem,
      variant: item.variant,
    };
  }
}
