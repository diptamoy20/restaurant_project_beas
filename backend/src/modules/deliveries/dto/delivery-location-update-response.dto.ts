import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';

import { DeliveryTrackingLogDto } from './delivery-tracking-log.dto';

export class DeliveryLocationUpdateResponseDto {
  @ApiProperty({ example: 'Delivery location updated' })
  @IsString()
  message!: string;

  @ApiProperty({ type: () => DeliveryTrackingLogDto })
  @ValidateNested()
  @Type(() => DeliveryTrackingLogDto)
  tracking!: DeliveryTrackingLogDto;
}
