import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CartItemResponseDto } from './dto/cart-item-response.dto';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { PrismaService } from '../../prisma/prisma.service';

type CartItemWithMenu = Prisma.CartItemGetPayload<{
  include: {
    restaurant: true;
    menuItem: {
      include: {
        category: true;
      };
    };

    variant: true;
  };
}>;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: number): Promise<CartItemResponseDto[]> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
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
        updatedAt: 'desc',
      },
    });

    return cartItems.map((item) => this.mapCartItem(item));
  }

  async addToCart(userId: number, payload: CreateCartItemDto): Promise<CartItemResponseDto> {
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

    const selectedVariant = payload.variantId
      ? menuItem.variants.find((variant) => variant.id === payload.variantId)
      : null;

    if (payload.variantId && !selectedVariant) {
      throw new BadRequestException('Selected variant is not available for this menu item');
    }

    // const authoritativePrice = selectedVariant?.price ?? this.getMenuItemPrice(menuItem);

    const unitPrice = selectedVariant?.price ?? this.getMenuItemPrice(menuItem);

    // const addOnsPrice = this.getAddOnsPrice(payload.addOns);

    // const finalUnitPrice = unitPrice + addOnsPrice;

    const addOnsPrice = await this.calculateAddOnsTotal(payload.addOns);

    const finalUnitPrice = unitPrice + addOnsPrice;

    const cartItem = await this.prisma.$transaction(async (transaction) => {
      // const existingItem = await transaction.cartItem.findFirst({
      //   where: {
      //     userId,
      //     menuItemId: payload.menuItemId,
      //     variantId: payload.variantId ?? null,
      //   },
      // });

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
          // data: {
          //   quantity: existingItem.quantity + payload.quantity,
          //   price: authoritativePrice,
          // },

          data: {
            quantity: existingItem.quantity + payload.quantity,

            price: finalUnitPrice * (existingItem.quantity + payload.quantity),

            addOns: payload.addOns
              ? (payload.addOns as unknown as Prisma.InputJsonArray)
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
        // data: {
        //   userId,
        //   menuItemId: payload.menuItemId,
        //   variantId: payload.variantId,
        //   quantity: payload.quantity,
        //   price: authoritativePrice,
        // },
        data: {
          userId,
          restaurantId: menuItem.restaurantId,
          menuItemId: payload.menuItemId,
          variantId: payload.variantId ?? null,
          quantity: payload.quantity,
          // price: authoritativePrice,
          price: finalUnitPrice * payload.quantity,
          addOns: payload.addOns
            ? (payload.addOns as unknown as Prisma.InputJsonArray)
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

    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: cartItem.menuItemId },
      include: {
        variants: true,
      },
    });

    if (!menuItem || !menuItem.isAvailable) {
      throw new BadRequestException('Menu item is not available');
    }

    const selectedVariant = cartItem.variantId
      ? menuItem.variants.find((variant) => variant.id === cartItem.variantId)
      : null;
    // const authoritativePrice = selectedVariant?.price ?? this.getMenuItemPrice(menuItem);
    const unitPrice = selectedVariant?.price ?? this.getMenuItemPrice(menuItem);

    const addOnsPrice = await this.calculateAddOnsTotal(
      (payload.addOns ?? cartItem.addOns ?? []) as {
        addonOptionId: number;
        quantity: number;
      }[],
    );

    const finalUnitPrice = unitPrice + addOnsPrice;

    const updatedItem: CartItemWithMenu = await this.prisma.cartItem.update({
      where: { id: cartItem.id },
      // data: {
      //   quantity: payload.quantity,
      //   price: authoritativePrice,
      // },

      data: {
        quantity: payload.quantity,
        price: finalUnitPrice * payload.quantity,
        addOns: payload.addOns
          ? (payload.addOns as unknown as Prisma.InputJsonArray)
          : (cartItem.addOns ?? Prisma.JsonNull),
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

  private mapCartItem(item: CartItemWithMenu): CartItemResponseDto {
    return {
      id: item.id,

      userId: item.userId,

      restaurantId: item.restaurantId,

      menuItemId: item.menuItemId,

      variantId: item.variantId,

      quantity: item.quantity,

      price: item.price,

      addOns: (item.addOns as CartItemResponseDto['addOns']) ?? null,

      createdAt: item.createdAt,

      updatedAt: item.updatedAt,

      menuItem: item.menuItem,

      variant: item.variant,
    };
  }

  // private getAddOnsPrice(addOns?: { price: number }[] | null): number {
  //   if (!addOns?.length) {
  //     return 0;
  //   }

  //   return addOns.reduce((sum, addon) => sum + Number(addon.price || 0), 0);
  // }

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
