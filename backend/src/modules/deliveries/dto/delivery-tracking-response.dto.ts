import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DeliveryBoyCustomerDto } from './delivery-boy-response.dto';
import { DeliveryAgentDto } from './delivery-agent.dto';
import { DeliveryTrackingLogDto } from './delivery-tracking-log.dto';
import { OrderSummaryDto } from './order-summary.dto';

export class DeliveryTrackingResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  deliveryId!: number;

  @ApiProperty({ example: 'ON_THE_WAY' })
  @IsString()
  status!: string;

  @ApiProperty({ type: () => DeliveryAgentDto, nullable: true })
  @ValidateNested()
  @Type(() => DeliveryAgentDto)
  agent!: DeliveryAgentDto | null;

  @ApiProperty({ type: () => OrderSummaryDto })
  @ValidateNested()
  @Type(() => OrderSummaryDto)
  order!: OrderSummaryDto;

  @ApiPropertyOptional({ type: () => DeliveryTrackingLogDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryTrackingLogDto)
  latestLocation?: DeliveryTrackingLogDto | null;

  @ApiProperty({ type: () => DeliveryTrackingLogDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryTrackingLogDto)
  trackingHistory!: DeliveryTrackingLogDto[];

  @ApiPropertyOptional({
    type: () => DeliveryBoyCustomerDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryBoyCustomerDto)
  customer!: DeliveryBoyCustomerDto | null;
}
