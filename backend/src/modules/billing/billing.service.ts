import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { calculateDeliveryFee, DeliveryFeeBreakdown } from '../../common/utils/delivery-fee.util';
import { PrismaService } from '../../prisma/prisma.service';
import { LocationService } from '../location/location.service';

type PricingClient = PrismaService | Prisma.TransactionClient;

export type BillingQuoteItemInput = {
  menuItemId: number;
  variantId?: number;
  quantity: number;
  addons?: {
    addonGroupId: number;
    addonOptionId: number;
  }[];
};

export type BillingQuoteInput = {
  restaurantId: number;
  userId?: number | null;
  addressId?: number | null;
  deliveryCoordinates?: {
    lat: number;
    lng: number;
  } | null;
  orderType?: string;
  items: BillingQuoteItemInput[];
  couponCode?: string | null;
  tipAmount?: number;
  manualDiscountAmount?: number;
  allowManualDiscount?: boolean;
};

export type BillingQuoteLineItem = {
  menuItemId: number;
  variantId: number | null;
  name: string;
  quantity: number;
  mrpUnitPrice: number;
  unitPrice: number;
  basePrice: number;
  addonTotal: number;
  menuDiscountAmount: number;
  totalPrice: number;
  addons: {
    addonGroupId: number;
    addonOptionId: number;
    addonGroupName: string;
    addonOptionName: string;
    addonOptionPrice: number;
    quantity: number;
  }[];
};

export type BillingQuote = {
  restaurantId: number;
  currency: 'INR';
  items: BillingQuoteLineItem[];
  mrpSubtotal: number;
  subtotalAmount: number;
  menuDiscountAmount: number;
  couponId: number | null;
  couponCode: string | null;
  couponDiscountAmount: number;
  manualDiscountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  deliveryCharge: number;
  deliveryFee: number;
  packagingCharge: number;
  deliveryDistanceKm: number | null;
  distanceKm: number | null;
  estimatedDeliveryMinutes: number;
  freeDeliveryMinAmount: number | null;
  minimumOrderAmount: number | null;
  isDeliveryAvailable: boolean;
  deliveryFeeBreakdown: DeliveryFeeBreakdown;
  deliveryUnavailableReason: string | null;
  tipAmount: number;
  finalAmount: number;
};

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
  ) {}

  async calculateQuote(
    input: BillingQuoteInput,
    client: PricingClient = this.prisma,
  ): Promise<BillingQuote> {
    if (!input.items.length) {
      throw new BadRequestException('At least one item is required');
    }

    const restaurant = await client.restaurant.findUnique({
      where: { id: input.restaurantId },
      select: {
        id: true,
        isActive: true,
        gstEnabled: true,
        gstRate: true,
        latitude: true,
        longitude: true,
        deliveryEnabled: true,
        deliveryRadiusKm: true,
        deliveryBaseFee: true,
        deliveryBaseDistanceKm: true,
        deliveryPerKmFee: true,
        deliveryFeeMin: true,
        deliveryFeeCap: true,
        freeDeliveryMinAmount: true,
        packagingCharge: true,
      },
    });

    if (!restaurant || !restaurant.isActive) {
      throw new NotFoundException('Restaurant not found or inactive');
    }

    const menuItemIds = [...new Set(input.items.map((item) => item.menuItemId))];
    const menuItems = await client.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      include: {
        variants: true,
        addonGroups: {
          include: {
            options: true,
          },
        },
      },
    });
    const menuItemById = new Map(menuItems.map((item) => [item.id, item]));

    const items = input.items.map((item) => {
      const menuItem = menuItemById.get(item.menuItemId);
      if (!menuItem || !menuItem.isAvailable) {
        throw new BadRequestException(`Menu item ${item.menuItemId} is not available`);
      }
      if (menuItem.restaurantId !== input.restaurantId) {
        throw new BadRequestException('Cart contains menu items from another restaurant');
      }

      const variant = item.variantId
        ? menuItem.variants.find((candidate) => candidate.id === item.variantId)
        : null;
      if (item.variantId && !variant) {
        throw new BadRequestException(`Variant ${item.variantId} is not valid for this item`);
      }

      const addons = this.resolveSelectedAddons(item, menuItem);
      const addonTotal = addons.reduce((sum, addon) => sum + addon.addonOptionPrice, 0);
      const mrpBasePrice = variant?.price ?? menuItem.price;
      const discountedBasePrice =
        !variant &&
        menuItem.discountPrice &&
        menuItem.discountPrice > 0 &&
        menuItem.discountPrice < menuItem.price
          ? menuItem.discountPrice
          : mrpBasePrice;
      const mrpUnitPrice = this.roundMoney(mrpBasePrice + addonTotal);
      const unitPrice = this.roundMoney(discountedBasePrice + addonTotal);
      const totalPrice = this.roundMoney(unitPrice * item.quantity);

      return {
        menuItemId: item.menuItemId,
        variantId: item.variantId ?? null,
        name: menuItem.name,
        quantity: item.quantity,
        mrpUnitPrice,
        unitPrice,
        basePrice: discountedBasePrice,
        addonTotal,
        menuDiscountAmount: this.roundMoney((mrpUnitPrice - unitPrice) * item.quantity),
        totalPrice,
        addons,
      };
    });

    const mrpSubtotal = this.roundMoney(
      items.reduce((sum, item) => sum + item.mrpUnitPrice * item.quantity, 0),
    );
    const subtotalAmount = this.roundMoney(items.reduce((sum, item) => sum + item.totalPrice, 0));
    const menuDiscountAmount = this.roundMoney(
      items.reduce((sum, item) => sum + item.menuDiscountAmount, 0),
    );
    const coupon = await this.resolveCoupon(input, subtotalAmount, client);
    const couponDiscountAmount = coupon ? this.calculateCouponDiscount(coupon, subtotalAmount) : 0;
    const manualDiscountAmount = input.allowManualDiscount
      ? this.roundMoney(input.manualDiscountAmount ?? 0)
      : 0;

    if (manualDiscountAmount < 0 || manualDiscountAmount > subtotalAmount - couponDiscountAmount) {
      throw new BadRequestException('Manual discount amount is not valid for this order');
    }

    const taxableAmount = this.roundMoney(
      subtotalAmount - couponDiscountAmount - manualDiscountAmount,
    );
    const gstRate = restaurant.gstEnabled ? this.roundMoney(restaurant.gstRate) : 0;
    const taxAmount = this.roundMoney((taxableAmount * gstRate) / 100);
    const cgstAmount = this.roundMoney(taxAmount / 2);
    const sgstAmount = this.roundMoney(taxAmount - cgstAmount);
    const igstAmount = 0;
    const deliveryFee = await this.calculateDelivery(input, restaurant, subtotalAmount, client);
    const tipAmount = this.roundMoney(input.tipAmount ?? 0);

    if (tipAmount < 0 || tipAmount > 10000) {
      throw new BadRequestException('Tip amount is not valid for this order');
    }

    if (input.orderType === 'DELIVERY' && !deliveryFee.isDeliveryAvailable) {
      throw new BadRequestException(
        deliveryFee.deliveryUnavailableReason ?? 'Delivery unavailable',
      );
    }

    return {
      restaurantId: input.restaurantId,
      currency: 'INR',
      items,
      mrpSubtotal,
      subtotalAmount,
      menuDiscountAmount,
      couponId: coupon?.id ?? null,
      couponCode: coupon?.code ?? null,
      couponDiscountAmount,
      manualDiscountAmount,
      taxableAmount,
      gstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      taxAmount,
      deliveryCharge: deliveryFee.deliveryCharge,
      deliveryFee: deliveryFee.deliveryCharge,
      packagingCharge: deliveryFee.packagingCharge,
      deliveryDistanceKm: deliveryFee.deliveryDistanceKm,
      distanceKm: deliveryFee.deliveryDistanceKm,
      estimatedDeliveryMinutes: deliveryFee.estimatedDeliveryMinutes,
      freeDeliveryMinAmount: deliveryFee.deliveryFeeBreakdown.freeDeliveryMinAmount,
      minimumOrderAmount: deliveryFee.minimumOrderAmount ?? null,
      isDeliveryAvailable: deliveryFee.isDeliveryAvailable,
      deliveryFeeBreakdown: deliveryFee.deliveryFeeBreakdown,
      deliveryUnavailableReason: deliveryFee.deliveryUnavailableReason,
      tipAmount,
      finalAmount: this.roundMoney(
        taxableAmount +
          taxAmount +
          deliveryFee.deliveryCharge +
          deliveryFee.packagingCharge +
          tipAmount,
      ),
    };
  }

  roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  normalizeCouponCode(code?: string | null): string | null {
    const normalized = code?.trim().toUpperCase();
    return normalized || null;
  }

  private async resolveCoupon(
    input: BillingQuoteInput,
    subtotalAmount: number,
    client: PricingClient,
  ): Promise<{
    id: number;
    code: string;
    discountType: string;
    discountValue: number;
    maxDiscountAmount: number | null;
  } | null> {
    const couponCode = this.normalizeCouponCode(input.couponCode);
    if (!couponCode) {
      return null;
    }

    const coupon =
      (await client.coupon.findFirst({
        where: { code: couponCode, restaurantId: input.restaurantId },
      })) ??
      (await client.coupon.findFirst({
        where: { code: couponCode, restaurantId: null },
      }));
    const now = new Date();

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Coupon is invalid or inactive');
    }
    if (coupon.restaurantId && coupon.restaurantId !== input.restaurantId) {
      throw new BadRequestException('Coupon is not valid for this restaurant');
    }
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException('Coupon is not active yet');
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new BadRequestException('Coupon has expired');
    }
    if (
      coupon.minOrderAmount !== null &&
      coupon.minOrderAmount !== undefined &&
      subtotalAmount < coupon.minOrderAmount
    ) {
      throw new BadRequestException(
        `Minimum order amount for this coupon is Rs. ${coupon.minOrderAmount}`,
      );
    }

    if (coupon.usageLimitTotal) {
      const totalUsage = await client.couponUsage.count({ where: { couponId: coupon.id } });
      if (totalUsage >= coupon.usageLimitTotal) {
        throw new BadRequestException('Coupon usage limit reached');
      }
    }

    if (coupon.usageLimitPerUser && input.userId) {
      const userUsage = await client.couponUsage.count({
        where: { couponId: coupon.id, userId: input.userId },
      });
      if (userUsage >= coupon.usageLimitPerUser) {
        throw new BadRequestException('You have already used this coupon');
      }
    }

    return coupon;
  }

  private calculateCouponDiscount(
    coupon: {
      discountType: string;
      discountValue: number;
      maxDiscountAmount: number | null;
    },
    subtotalAmount: number,
  ): number {
    const rawDiscount =
      coupon.discountType === 'PERCENTAGE'
        ? (subtotalAmount * coupon.discountValue) / 100
        : coupon.discountValue;
    const cappedDiscount =
      coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined
        ? Math.min(rawDiscount, coupon.maxDiscountAmount)
        : rawDiscount;

    return this.roundMoney(Math.min(cappedDiscount, subtotalAmount));
  }

  private async calculateDelivery(
    input: BillingQuoteInput,
    restaurant: {
      latitude: number;
      longitude: number;
      deliveryEnabled: boolean;
      deliveryRadiusKm: number;
      deliveryBaseFee: number;
      deliveryBaseDistanceKm: number;
      deliveryPerKmFee: number;
      deliveryFeeMin: number | null;
      deliveryFeeCap: number | null;
      freeDeliveryMinAmount: number | null;
      packagingCharge: number;
    },
    subtotalAmount: number,
    client: PricingClient,
  ): Promise<
    ReturnType<typeof calculateDeliveryFee> & {
      minimumOrderAmount: number | null;
      estimatedDeliveryMinutes: number;
    }
  > {
    if (input.orderType !== 'DELIVERY') {
      return {
        isDeliveryAvailable: true,
        deliveryCharge: 0,
        packagingCharge: 0,
        deliveryDistanceKm: null,
        deliveryUnavailableReason: null,
        deliveryFeeBreakdown: {
          distanceKm: null,
          baseFee: 0,
          baseDistanceKm: 0,
          extraDistanceKm: 0,
          extraUnits: 0,
          perKmFee: 0,
          deliveryCharge: 0,
          packagingCharge: 0,
          freeDeliveryApplied: false,
          freeDeliveryMinAmount: null,
        },
        minimumOrderAmount: null,
        estimatedDeliveryMinutes: 0,
      };
    }

    if (!input.addressId || !input.userId) {
      throw new BadRequestException('Delivery address is required');
    }

    const address = await client.userAddress.findFirst({
      where: { id: input.addressId, userId: input.userId },
      select: { latitude: true, longitude: true },
    });

    if (!address) {
      throw new BadRequestException('Selected address does not belong to this customer');
    }

    const deliveryCoordinates = this.resolveDeliveryCoordinates(input.deliveryCoordinates, address);
    const deliveryQuote = await this.locationService.getRestaurantDeliveryQuote(
      input.restaurantId,
      deliveryCoordinates.lat,
      deliveryCoordinates.lng,
      {
        subtotalAmount,
        enforceMinimumOrderAmount: true,
      },
    );

    return {
      isDeliveryAvailable: deliveryQuote.deliveryAvailable,
      deliveryCharge: deliveryQuote.deliveryFee,
      packagingCharge: deliveryQuote.packagingCharge ?? 0,
      deliveryDistanceKm: deliveryQuote.distanceKm,
      deliveryUnavailableReason: deliveryQuote.deliveryUnavailableReason ?? null,
      deliveryFeeBreakdown: deliveryQuote.deliveryFeeBreakdown as DeliveryFeeBreakdown,
      minimumOrderAmount: deliveryQuote.minimumOrderAmount ?? null,
      estimatedDeliveryMinutes: deliveryQuote.estimatedDeliveryTimeMinutes,
    };
  }

  private resolveDeliveryCoordinates(
    coordinates: BillingQuoteInput['deliveryCoordinates'],
    fallbackAddress: { latitude: number; longitude: number },
  ): { lat: number; lng: number } {
    if (
      coordinates &&
      Number.isFinite(coordinates.lat) &&
      Number.isFinite(coordinates.lng) &&
      coordinates.lat >= -90 &&
      coordinates.lat <= 90 &&
      coordinates.lng >= -180 &&
      coordinates.lng <= 180
    ) {
      return coordinates;
    }

    return {
      lat: fallbackAddress.latitude,
      lng: fallbackAddress.longitude,
    };
  }

  private resolveSelectedAddons(
    item: BillingQuoteItemInput,
    menuItem: Prisma.MenuItemGetPayload<{
      include: {
        variants: true;
        addonGroups: {
          include: {
            options: true;
          };
        };
      };
    }>,
  ): BillingQuoteLineItem['addons'] {
    const selections = item.addons ?? [];
    const selectionsByGroup = new Map<number, typeof selections>();

    for (const selection of selections) {
      const bucket = selectionsByGroup.get(selection.addonGroupId) ?? [];
      bucket.push(selection);
      selectionsByGroup.set(selection.addonGroupId, bucket);
    }

    for (const group of menuItem.addonGroups.filter((candidate) => candidate.isActive)) {
      const groupSelections = selectionsByGroup.get(group.id) ?? [];
      const minSelect = group.isRequired
        ? Math.max(group.minSelect ?? 1, 1)
        : (group.minSelect ?? 0);
      const maxSelect = group.selectionType === 'SINGLE' ? 1 : group.maxSelect;

      if (groupSelections.length < minSelect) {
        throw new BadRequestException(
          `Please select at least ${minSelect} option(s) for ${group.name}`,
        );
      }
      if (maxSelect !== null && maxSelect !== undefined && groupSelections.length > maxSelect) {
        throw new BadRequestException(
          `Please select no more than ${maxSelect} option(s) for ${group.name}`,
        );
      }
    }

    return selections.map((selection) => {
      const group = menuItem.addonGroups.find(
        (candidate) => candidate.id === selection.addonGroupId,
      );
      if (!group || !group.isActive) {
        throw new BadRequestException(
          `Add-on group ${selection.addonGroupId} is not valid for this item`,
        );
      }

      const option = group.options.find((candidate) => candidate.id === selection.addonOptionId);
      if (!option || !option.isAvailable) {
        throw new BadRequestException(`Add-on option ${selection.addonOptionId} is not available`);
      }

      return {
        addonGroupId: group.id,
        addonOptionId: option.id,
        addonGroupName: group.name,
        addonOptionName: option.name,
        addonOptionPrice: option.price,
        quantity: 1,
      };
    });
  }
}
