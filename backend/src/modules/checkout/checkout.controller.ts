import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/auth.types';
import { BillingService } from '../billing/billing.service';
import {
  AvailableCouponResponseDto,
  AvailableCouponsQueryDto,
  CheckoutQuoteRequestDto,
  CheckoutQuoteResponseDto,
} from '../billing/dto/checkout-quote.dto';
import { CouponsService } from '../coupons/coupons.service';

@Controller('checkout')
@ApiTags('Checkout')
@ApiBearerAuth('access-token')
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class CheckoutController {
  constructor(
    private readonly billingService: BillingService,
    private readonly couponsService: CouponsService,
  ) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER)
  @Get('coupons')
  @ApiOperation({ summary: 'List coupons available for checkout' })
  @ApiOkResponse({ type: AvailableCouponResponseDto, isArray: true })
  listCoupons(
    @Query() query: AvailableCouponsQueryDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<AvailableCouponResponseDto[]> {
    return this.couponsService.listAvailableForCheckout({
      restaurantId: query.restaurantId,
      userId: request.user.id,
      subtotalAmount: query.subtotalAmount,
    });
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER)
  @Post('quote')
  @ApiOperation({ summary: 'Calculate authoritative checkout totals with coupon and GST' })
  @ApiBody({ type: CheckoutQuoteRequestDto })
  @ApiOkResponse({ type: CheckoutQuoteResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  quote(
    @Body() payload: CheckoutQuoteRequestDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<CheckoutQuoteResponseDto> {
    return this.billingService.calculateQuote({
      restaurantId: payload.restaurantId,
      userId: request.user.id,
      couponCode: payload.couponCode,
      items: payload.items,
    });
  }
}
