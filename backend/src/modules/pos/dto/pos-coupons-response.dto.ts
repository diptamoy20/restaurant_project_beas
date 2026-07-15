import { ApiProperty } from '@nestjs/swagger';

import { AvailableCouponResponseDto } from '../../billing/dto/checkout-quote.dto';

export class PosCouponsResponseDto {
  @ApiProperty({ type: () => AvailableCouponResponseDto, isArray: true })
  coupons!: AvailableCouponResponseDto[];
}
