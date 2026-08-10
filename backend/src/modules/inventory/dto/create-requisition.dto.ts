import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

import { TransferItemDto } from './create-kitchen-transfer.dto';

export class CreateRequisitionDto {
  @ApiPropertyOptional({ example: 'Weekly store restock from warehouse' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [TransferItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items!: TransferItemDto[];
}
