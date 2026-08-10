import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class GrnItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  ingredientId!: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  quantityReceived!: number;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantityRejected?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  damagedQuantity?: number;
}

export class CreateGrnDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  purchaseOrderId!: number;

  @ApiPropertyOptional({ example: 'INV-2026-001' })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({ example: 'DC-456' })
  @IsString()
  @IsOptional()
  deliveryChallan?: string;

  @ApiPropertyOptional({ example: 'MH-12-AB-1234' })
  @IsString()
  @IsOptional()
  vehicleNumber?: string;

  @ApiPropertyOptional({ example: 'All items received in good condition' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [GrnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrnItemDto)
  items!: GrnItemDto[];
}
