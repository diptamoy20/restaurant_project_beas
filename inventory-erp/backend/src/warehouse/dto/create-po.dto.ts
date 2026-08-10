import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

const PURPOSES = [
  'REPLENISHMENT',
  'NEW_PRODUCT',
  'EMERGENCY',
  'BULK_ORDER',
  'SEASONAL',
  'OTHER',
] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export class PoItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  ingredientId!: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty({ example: 120 })
  @IsNumber()
  @Min(0.01)
  unitPrice!: number;
}

export class CreatePoDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  supplierId!: number;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional({ example: 'Net 30' })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ example: 'REPLENISHMENT', enum: PURPOSES })
  @IsString()
  @IsIn(PURPOSES)
  @IsOptional()
  purpose?: string;

  @ApiPropertyOptional({ example: 'MEDIUM', enum: PRIORITIES })
  @IsString()
  @IsIn(PRIORITIES)
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ example: 'PO notes and delivery terms' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [PoItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PoItemDto)
  items!: PoItemDto[];
}
