import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class KitchenRequestItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  ingredientId!: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;
}

export class CreateKitchenRequestDto {
  @ApiProperty({ type: [KitchenRequestItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KitchenRequestItemDto)
  items!: KitchenRequestItemDto[];

  @ApiPropertyOptional({ example: 'Weekly kitchen ingredient request' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class KitchenTransferItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  ingredientId!: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;
}

export class CreateKitchenTransferDto {
  @ApiProperty({ type: [KitchenTransferItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KitchenTransferItemDto)
  items!: KitchenTransferItemDto[];

  @ApiPropertyOptional({ example: 'Urgent kitchen refill' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateWasteDto {
  @ApiProperty({ example: 3 })
  @IsNumber()
  ingredientId!: number;

  @ApiProperty({ example: 2.5 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty({ example: 'SPOILAGE' })
  @IsString()
  @IsNotEmpty()
  wasteType!: string;

  @ApiPropertyOptional({ example: 'Tomatoes spoiled in cold storage' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BranchStoreRequestItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  ingredientId!: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;
}

export class CreateBranchStoreRequestDto {
  @ApiProperty({ type: [BranchStoreRequestItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchStoreRequestItemDto)
  items!: BranchStoreRequestItemDto[];

  @ApiPropertyOptional({ example: 'Weekly store room refill request' })
  @IsString()
  @IsOptional()
  notes?: string;
}
