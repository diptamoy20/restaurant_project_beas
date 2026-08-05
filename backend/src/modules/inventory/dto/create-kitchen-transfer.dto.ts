import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class TransferItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  itemId!: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;
}

export class CreateKitchenTransferDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsOptional()
  restaurantId?: number;

  @ApiPropertyOptional({ example: 'Morning prep replenishment' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [TransferItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items!: TransferItemDto[];
}
