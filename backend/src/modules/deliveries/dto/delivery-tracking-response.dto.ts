import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

import { DeliveryAgentDto } from './delivery-agent.dto';
import { DeliveryTrackingLogDto } from './delivery-tracking-log.dto';
import { OrderSummaryDto } from './order-summary.dto';

export class DeliveryTrackingResponseDto {
  @IsNumber()
  deliveryId!: number;

  @IsString()
  status!: string;

  @ValidateNested()
  @Type(() => DeliveryAgentDto)
  agent!: DeliveryAgentDto | null;

  @ValidateNested()
  @Type(() => OrderSummaryDto)
  order!: OrderSummaryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryTrackingLogDto)
  latestLocation?: DeliveryTrackingLogDto | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryTrackingLogDto)
  trackingHistory!: DeliveryTrackingLogDto[];
}
