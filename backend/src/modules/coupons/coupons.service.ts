import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';

import {
  BulkCreateCouponsDto,
  CouponQueryDto,
  CouponResponseDto,
  CreateCouponDto,
  UpdateCouponDto,
} from './dto/coupon.dto';
import {
  evaluateCouponForCheckout,
  getCouponCategorySortOrder,
} from '../../common/coupon/coupon-checkout.util';
import {
  buildPaginationMeta,
  normalizePagination,
  PaginatedResult,
  toPrismaPagination,
} from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { AvailableCouponResponseDto } from '../billing/dto/checkout-quote.dto';

@Injectable()
export class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  async list(query: CouponQueryDto): Promise<PaginatedResult<CouponResponseDto>> {
    const pagination = normalizePagination(query, { limit: 20, maxLimit: 100 });
    const where: Prisma.CouponWhereInput = {};

    if (query.restaurantId) {
      where.OR = [{ restaurantId: query.restaurantId }, { restaurantId: null }];
    }
    if (query.status === 'active') {
      where.isActive = true;
    } else if (query.status === 'inactive') {
      where.isActive = false;
    }
    if (query.search?.trim()) {
      where.code = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [total, coupons] = await Promise.all([
      this.prisma.coupon.count({ where }),
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { usages: true } } },
        ...toPrismaPagination(pagination),
      }),
    ]);

    return {
      items: coupons.map((coupon) => this.mapCoupon(coupon, coupon._count.usages)),
      ...buildPaginationMeta(total, pagination),
    };
  }

  async get(id: number): Promise<CouponResponseDto> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { usages: true } } },
    });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return this.mapCoupon(coupon, coupon._count.usages);
  }

  async create(payload: CreateCouponDto): Promise<CouponResponseDto> {
    const data = this.validateAndNormalize(payload) as Prisma.CouponUncheckedCreateInput;
    const coupon = await this.handleCouponWrite(() =>
      this.prisma.coupon.create({
        data,
        include: { _count: { select: { usages: true } } },
      }),
    );

    return this.mapCoupon(coupon, coupon._count.usages);
  }

  async createBulk(payload: BulkCreateCouponsDto): Promise<CouponResponseDto[]> {
    const restaurantIds = [...new Set(payload.restaurantIds)];
    const existingRestaurants = await this.prisma.restaurant.findMany({
      where: { id: { in: restaurantIds } },
      select: { id: true },
    });

    if (existingRestaurants.length !== restaurantIds.length) {
      throw new BadRequestException('One or more selected restaurants are invalid');
    }

    const { restaurantIds: _restaurantIds, restaurantId: _restaurantId, ...basePayload } = payload;
    const baseData = this.validateAndNormalize(basePayload) as Prisma.CouponUncheckedCreateInput;
    const coupons = await this.handleCouponWrite(() =>
      this.prisma.$transaction(
        restaurantIds.map((restaurantId) =>
          this.prisma.coupon.create({
            data: { ...baseData, restaurantId },
            include: { _count: { select: { usages: true } } },
          }),
        ),
      ),
    );

    return coupons.map((coupon) => this.mapCoupon(coupon, coupon._count.usages));
  }

  async update(id: number, payload: UpdateCouponDto): Promise<CouponResponseDto> {
    await this.get(id);
    const data = this.validateAndNormalize(payload, true) as Prisma.CouponUncheckedUpdateInput;
    const coupon = await this.handleCouponWrite(() =>
      this.prisma.coupon.update({
        where: { id },
        data,
        include: { _count: { select: { usages: true } } },
      }),
    );

    return this.mapCoupon(coupon, coupon._count.usages);
  }

  async remove(id: number): Promise<CouponResponseDto> {
    await this.get(id);
    const usageCount = await this.prisma.couponUsage.count({ where: { couponId: id } });
    const coupon =
      usageCount > 0
        ? await this.prisma.coupon.update({
            where: { id },
            data: { isActive: false },
            include: { _count: { select: { usages: true } } },
          })
        : await this.prisma.coupon.delete({
            where: { id },
            include: { _count: { select: { usages: true } } },
          });

    return this.mapCoupon(coupon, coupon._count.usages);
  }

  async listAvailableForCheckout(params: {
    restaurantId: number;
    userId: number;
    subtotalAmount?: number;
  }): Promise<AvailableCouponResponseDto[]> {
    const now = new Date();
    const subtotalAmount = this.billingService.roundMoney(params.subtotalAmount ?? 0);
    const coupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [{ restaurantId: params.restaurantId }, { restaurantId: null }],
      },
      include: {
        _count: { select: { usages: true } },
        usages: {
          where: { userId: params.userId },
          select: { id: true },
        },
      },
      orderBy: [{ restaurantId: 'desc' }, { createdAt: 'desc' }],
    });

    const restaurantCoupons = coupons.filter(
      (coupon) => coupon.restaurantId === params.restaurantId,
    );
    const restaurantCodes = new Set(restaurantCoupons.map((coupon) => coupon.code));
    const effectiveCoupons = [
      ...restaurantCoupons,
      ...coupons.filter(
        (coupon) => coupon.restaurantId === null && !restaurantCodes.has(coupon.code),
      ),
    ];

    return effectiveCoupons
      .map((coupon) => {
        const evaluation = evaluateCouponForCheckout({
          coupon,
          subtotalAmount,
          userUsageCount: coupon.usages.length,
          totalUsageCount: coupon._count.usages,
          roundMoney: (value) => this.billingService.roundMoney(value),
          now,
        });

        return {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          maxDiscountAmount: coupon.maxDiscountAmount,
          minOrderAmount: coupon.minOrderAmount,
          status: evaluation.status,
          category: evaluation.category,
          eligible: evaluation.eligible,
          message: evaluation.message,
          reason: evaluation.message,
          usageCount: evaluation.usageCount,
          usageLimit: evaluation.usageLimit,
          estimatedDiscount: evaluation.eligible
            ? this.estimateDiscount(coupon, subtotalAmount)
            : 0,
        };
      })
      .sort(
        (a, b) =>
          getCouponCategorySortOrder(a.category) - getCouponCategorySortOrder(b.category) ||
          Number(b.eligible) - Number(a.eligible) ||
          b.estimatedDiscount - a.estimatedDiscount,
      );
  }

  private validateAndNormalize(
    payload: CreateCouponDto | UpdateCouponDto,
    partial = false,
  ): Prisma.CouponUncheckedCreateInput | Prisma.CouponUncheckedUpdateInput {
    const code = this.billingService.normalizeCouponCode(payload.code);
    const discountType = payload.discountType;
    const discountValue = payload.discountValue;
    const startsAt = payload.startsAt ? new Date(payload.startsAt) : undefined;
    const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : undefined;

    if (!partial && !code) {
      throw new BadRequestException('Coupon code is required');
    }
    if (payload.startsAt && Number.isNaN(startsAt?.getTime())) {
      throw new BadRequestException('Coupon start date is invalid');
    }
    if (payload.expiresAt && Number.isNaN(expiresAt?.getTime())) {
      throw new BadRequestException('Coupon expiry date is invalid');
    }
    if (startsAt && expiresAt && expiresAt <= startsAt) {
      throw new BadRequestException('Coupon expiry must be after start date');
    }
    if (discountType === 'PERCENTAGE' && discountValue !== undefined && discountValue > 100) {
      throw new BadRequestException('Percentage coupon cannot exceed 100');
    }

    return {
      restaurantId: payload.restaurantId === undefined ? undefined : (payload.restaurantId ?? null),
      code: code ?? undefined,
      description: payload.description,
      discountType,
      discountValue,
      maxDiscountAmount: payload.maxDiscountAmount,
      minOrderAmount: payload.minOrderAmount,
      startsAt,
      expiresAt,
      usageLimitTotal: payload.usageLimitTotal,
      usageLimitPerUser: payload.usageLimitPerUser,
      isActive: payload.isActive,
    };
  }

  private mapCoupon(coupon: Coupon, usageCount: number): CouponResponseDto {
    return {
      id: coupon.id,
      restaurantId: coupon.restaurantId,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      minOrderAmount: coupon.minOrderAmount,
      startsAt: coupon.startsAt,
      expiresAt: coupon.expiresAt,
      usageLimitTotal: coupon.usageLimitTotal,
      usageLimitPerUser: coupon.usageLimitPerUser,
      isActive: coupon.isActive,
      usageCount,
    };
  }

  private estimateDiscount(
    coupon: Pick<Coupon, 'discountType' | 'discountValue' | 'maxDiscountAmount'>,
    subtotalAmount: number,
  ): number {
    const raw =
      coupon.discountType === 'PERCENTAGE'
        ? (subtotalAmount * coupon.discountValue) / 100
        : coupon.discountValue;
    const capped =
      coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined
        ? Math.min(raw, coupon.maxDiscountAmount)
        : raw;

    return this.billingService.roundMoney(Math.min(capped, subtotalAmount));
  }

  private async handleCouponWrite<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Coupon code already exists for this restaurant scope');
      }

      throw error;
    }
  }
}
