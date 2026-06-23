import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CartResponseDto } from './dto/cart-response.dto';
import { StoredCartAddon } from './dto/cart-addon.dto';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  // async getCart(userId: number) {
  //   const cartItems = await this.prisma.cartItem.findMany({
  //     where: { userId },
  //     include: {
  //       menuItem: {
  //         include: {
  //           category: true,
  //         },
  //       },
  //       variant: true,
  //       restaurant: true,
  //     },
  //     orderBy: {
  //       updatedAt: 'desc',
  //     },
  //   });

  //   // return cartItems.map((item) => this.mapCartItem(item));

  //   const items = cartItems.map((item) => ({
  //     menuItemId: item.menuItemId,

  //     quantity: item.quantity,

  //     price: item.price,

  //     discount: item.menuItem.discountPrice,

  //     addOns: item.addOns ?? [],

  //     name: item.menuItem.name,

  //     description: item.menuItem.description,

  //     image: item.menuItem.imageUrl,

  //     ingredients: item.menuItem.ingredients,

  //     rating: item.menuItem.rating,

  //     bestSeller: item.menuItem.isBestSelling,
  //   }));

  //   return {
  //     userId,

  //     totalItems: items.reduce((sum, item) => sum + item.quantity, 0),

  //     subtotal: items.reduce((sum, item) => sum + item.price, 0),

  //     cartItems: items,
  //   };
  // }

  async getCart(userId: number): Promise<CartResponseDto> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        userId,
      },

      include: {
        menuItem: {
          include: {
            category: true,
          },
        },

        variant: true,

        restaurant: true,
      },

      orderBy: {
        id: 'asc',
      },
    });

    if (!cartItems.length) {
      return {
        userId,

        totalItems: 0,

        subtotal: 0,

        cartItems: [],
      };
    }

    const items = await Promise.all(
      cartItems.map(async (item) => {
        const unitPrice = item.price;
        const totalPrice = unitPrice * item.quantity;

        return {
          cartItemId: item.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: totalPrice,
          unitPrice: unitPrice,
          restaurantId: item.restaurantId,
          discount: item.menuItem.discountPrice,
          addOns: await this.enrichStoredAddOns(item.addOns),
          description: item.menuItem.description,
          image: item.menuItem.imageUrl,
          ingredients: item.menuItem.ingredients,
          rating: item.menuItem.rating,
          bestSeller: item.menuItem.isBestSelling,
          name: item.menuItem.name,
        };
      }),
    );

    return {
      userId,

      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),

      subtotal: items.reduce((sum, item) => sum + item.price, 0),

      cartItems: items,
    };
  }

  async addToCart(userId: number, payload: CreateCartItemDto): Promise<CartResponseDto> {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: payload.menuItemId },
      include: {
        category: true,
        variants: true,
      },
    });

    if (!menuItem || !menuItem.isAvailable) {
      throw new BadRequestException('Menu item is not available');
    }

    if (payload.restaurantId !== menuItem.restaurantId) {
      throw new BadRequestException('Restaurant ID conflict');
    }

    // Validation: Check if cart already has items from a different restaurant
    const existingCartItems = await this.prisma.cartItem.findMany({
      where: { userId },
    });

    const differentRestaurantItem = existingCartItems.find(
      (item) => item.restaurantId !== menuItem.restaurantId,
    );

    if (differentRestaurantItem) {
      throw new BadRequestException(
        'Your cart contains items from a different restaurant. Please clear your cart first.',
      );
    }

    const selectedVariant = payload.variantId
      ? menuItem.variants.find((variant) => variant.id === payload.variantId)
      : null;

    if (payload.variantId && !selectedVariant) {
      throw new BadRequestException('Selected variant is not available for this menu item');
    }

    const unitPrice = selectedVariant?.price ?? this.getMenuItemPrice(menuItem);

    const addOnsPrice = await this.calculateAddOnsTotal(payload.addOns);
    const normalizedAddOns = await this.normalizeAddOnsForStorage(payload.addOns);

    const finalUnitPrice = unitPrice + addOnsPrice;

    await this.prisma.$transaction(async (transaction) => {
      const existingItem = await transaction.cartItem.findFirst({
        where: {
          userId,
          menuItemId: payload.menuItemId,
          variantId: payload.variantId ?? null,
        },
        include: {
          restaurant: true,
          menuItem: {
            include: {
              category: true,
            },
          },
          variant: true,
        },
      });

      if (existingItem) {
        return transaction.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + payload.quantity,

            price: finalUnitPrice,

            addOns: normalizedAddOns.length
              ? (normalizedAddOns as unknown as Prisma.InputJsonArray)
              : (existingItem.addOns ?? Prisma.JsonNull),
          },
          include: {
            restaurant: true,
            menuItem: {
              include: {
                category: true,
              },
            },
            variant: true,
          },
        });
      }

      return transaction.cartItem.create({
        data: {
          userId,
          restaurantId: menuItem.restaurantId,
          menuItemId: payload.menuItemId,
          variantId: payload.variantId ?? null,
          quantity: payload.quantity,
          price: finalUnitPrice,
          addOns: normalizedAddOns.length
            ? (normalizedAddOns as unknown as Prisma.InputJsonArray)
            : Prisma.JsonNull,
        },
        include: {
          restaurant: true,
          menuItem: {
            include: {
              category: true,
            },
          },
          variant: true,
        },
      });
    });

    return this.getCart(userId);
  }

  async updateCartItem(
    userId: number,
    cartItemId: number,
    payload: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        userId,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    const menuItem = await this.prisma.menuItem.findUnique({
      where: {
        id: cartItem.menuItemId,
      },

      include: {
        variants: true,
      },
    });

    if (!menuItem) {
      throw new BadRequestException('Menu item not found');
    }

    const selectedVariant = cartItem.variantId
      ? menuItem.variants.find((v) => v.id === cartItem.variantId)
      : null;

    const unitPrice = selectedVariant?.price ?? this.getMenuItemPrice(menuItem);

    const addOnsInput = payload.addOns ?? (cartItem.addOns as StoredCartAddon[] | null) ?? [];
    const normalizedAddOns = await this.normalizeAddOnsForStorage(addOnsInput);
    const addOnsPrice = await this.calculateAddOnsTotal(normalizedAddOns);

    const finalPrice = unitPrice + addOnsPrice;
    const quantity = payload.quantity ?? cartItem.quantity;

    await this.prisma.cartItem.update({
      where: {
        id: cartItemId,
      },

      data: {
        quantity,

        price: finalPrice,

        addOns: normalizedAddOns.length
          ? (normalizedAddOns as unknown as Prisma.InputJsonArray)
          : (cartItem.addOns ?? Prisma.JsonNull),
      },
    });

    return this.getCart(userId);
  }

  // async removeFromCart(userId: number, menuItemId: number): Promise<void> {
  //   const cartItem = await this.prisma.cartItem.findFirst({
  //     where: {
  //       userId,
  //       menuItemId,
  //     },
  //   });

  //   if (!cartItem) {
  //     throw new NotFoundException('Cart item not found');
  //   }

  //   await this.prisma.cartItem.delete({
  //     where: { id: cartItem.id },
  //   });
  // }

  async clearCart(userId: number): Promise<void> {
    await this.prisma.cartItem.deleteMany({
      where: { userId },
    });
  }

  async removeFromCart(userId: number, cartItemId: number): Promise<CartResponseDto> {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        userId,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: {
        id: cartItemId,
      },
    });

    return this.getCart(userId);
  }

  // private getAddOnsPrice(addOns?: { price: number }[] | null): number {
  //   if (!addOns?.length) {
  //     return 0;
  //   }

  //   return addOns.reduce((sum, addon) => sum + Number(addon.price || 0), 0);
  // }

  private async normalizeAddOnsForStorage(
    addOns?: { addonGroupId?: number; addonOptionId: number; quantity?: number }[] | null,
  ): Promise<StoredCartAddon[]> {
    if (!addOns?.length) {
      return [];
    }

    const parsed = addOns
      .map((addon) => ({
        addonGroupId:
          addon.addonGroupId != null && Number(addon.addonGroupId) > 0
            ? Number(addon.addonGroupId)
            : undefined,
        addonOptionId: Number(addon.addonOptionId),
        quantity: Math.max(1, Number(addon.quantity ?? 1)),
      }))
      .filter((addon) => Number.isInteger(addon.addonOptionId) && addon.addonOptionId > 0);

    return this.enrichAddOnGroupIds(parsed);
  }

  private async enrichStoredAddOns(rawAddOns: Prisma.JsonValue | null): Promise<StoredCartAddon[]> {
    if (!Array.isArray(rawAddOns) || !rawAddOns.length) {
      return [];
    }

    const parsed = rawAddOns
      .map((addon) => {
        const record = addon as Record<string, unknown>;
        return {
          addonGroupId:
            record.addonGroupId != null && Number(record.addonGroupId) > 0
              ? Number(record.addonGroupId)
              : undefined,
          addonOptionId: Number(record.addonOptionId),
          quantity: Math.max(1, Number(record.quantity ?? 1)),
        };
      })
      .filter((addon) => Number.isInteger(addon.addonOptionId) && addon.addonOptionId > 0);

    return this.enrichAddOnGroupIds(parsed);
  }

  private async enrichAddOnGroupIds(
    addOns: { addonGroupId?: number; addonOptionId: number; quantity: number }[],
  ): Promise<StoredCartAddon[]> {
    if (!addOns.length) {
      return [];
    }

    const missingOptionIds = addOns
      .filter((addon) => !addon.addonGroupId)
      .map((addon) => addon.addonOptionId);

    const groupByOptionId = new Map<number, number>();

    if (missingOptionIds.length) {
      const options = await this.prisma.addonOption.findMany({
        where: { id: { in: missingOptionIds } },
        select: { id: true, groupId: true },
      });

      for (const option of options) {
        groupByOptionId.set(option.id, option.groupId);
      }
    }

    return addOns
      .map((addon) => ({
        addonGroupId: addon.addonGroupId ?? groupByOptionId.get(addon.addonOptionId),
        addonOptionId: addon.addonOptionId,
        quantity: addon.quantity,
      }))
      .filter(
        (addon): addon is StoredCartAddon =>
          addon.addonGroupId != null && addon.addonGroupId > 0 && addon.addonOptionId > 0,
      );
  }

  private async calculateAddOnsTotal(
    addOns?: { addonOptionId: number; quantity: number }[],
  ): Promise<number> {
    if (!addOns?.length) {
      return 0;
    }

    const optionIds = addOns.map((addon) => addon.addonOptionId);

    const addonOptions = await this.prisma.addonOption.findMany({
      where: {
        id: {
          in: optionIds,
        },
      },
      select: {
        id: true,
        price: true,
      },
    });

    return addOns.reduce((total, addon) => {
      const option = addonOptions.find((option) => option.id === addon.addonOptionId);

      return total + (option?.price ?? 0) * addon.quantity;
    }, 0);
  }

  private getMenuItemPrice(menuItem: { price: number; discountPrice: number | null }): number {
    return menuItem.discountPrice &&
      menuItem.discountPrice > 0 &&
      menuItem.discountPrice < menuItem.price
      ? menuItem.discountPrice
      : menuItem.price;
  }
}
