import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class KitchenDisplayItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  menuItemId!: number;

  @ApiProperty({ example: 'Chicken Biryani' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity!: number;

  @ApiProperty({ example: 289 })
  @IsNumber()
  unitPrice!: number;

  @ApiProperty({ example: 578 })
  @IsNumber()
  totalPrice!: number;

  @ApiPropertyOptional({ example: 'Large', nullable: true })
  @IsOptional()
  @IsString()
  variant!: string | null;

  @ApiPropertyOptional({
    example: 'Large, Extra Cheese',
    nullable: true,
    description: 'Variant and add-on selections acting as special instructions',
  })
  @IsOptional()
  @IsString()
  instructions!: string | null;

  @ApiPropertyOptional({
    example: '2026-07-31T09:00:00.000Z',
    nullable: true,
    description: 'Time the order entered PREPARING (used to compute elapsed time)',
  })
  @IsOptional()
  @IsString()
  startedAt!: string | null;
}

export class KitchenDisplayOrderDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'ORD-1001' })
  @IsString()
  orderNumber!: string;

  @ApiProperty({ example: 'PREPARING' })
  @IsString()
  status!: string;

  @ApiProperty({ example: 'DINE_IN' })
  @IsString()
  orderType!: string;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsNumber()
  tableId!: number | null;

  @ApiPropertyOptional({ example: 'T1', nullable: true })
  @IsOptional()
  @IsString()
  table!: string | null;

  @ApiPropertyOptional({ example: 'Surojit Bera', nullable: true })
  @IsOptional()
  @IsString()
  customerName!: string | null;

  @ApiPropertyOptional({ example: '9876543210', nullable: true })
  @IsOptional()
  @IsString()
  customerPhone!: string | null;

  @ApiPropertyOptional({
    example: "Please make it less spicy and don't add onion.",
    nullable: true,
    description: 'Special cooking instructions for the kitchen.',
  })
  @IsOptional()
  @IsString()
  kitchenNote!: string | null;

  @ApiProperty({ example: '2026-07-31T08:58:00.000Z' })
  @IsString()
  orderTime!: string;

  @ApiPropertyOptional({ example: '2026-07-31T09:00:00.000Z', nullable: true })
  @IsOptional()
  @IsString()
  startedAt!: string | null;

  @ApiProperty({ example: 12, description: 'Minutes elapsed since order entered PREPARING' })
  @IsNumber()
  elapsedMinutes!: number;

  @ApiProperty({ type: () => KitchenDisplayItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KitchenDisplayItemDto)
  items!: KitchenDisplayItemDto[];
}
