import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';

import { DeliveryTrackingLogDto } from './delivery-tracking-log.dto';

export class DeliveryLocationUpdateResponseDto {
  @IsString()
  message!: string;

  @ValidateNested()
  @Type(() => DeliveryTrackingLogDto)
  tracking!: DeliveryTrackingLogDto;
}
