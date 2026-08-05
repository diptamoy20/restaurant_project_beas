import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class MovementItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  ingredientId!: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;
}

export class CreateTransferDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId!: number;

  @ApiPropertyOptional({ example: 'Kitchen refill' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [MovementItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MovementItemDto)
  items!: MovementItemDto[];
}

export class CreateStoreRequestDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId!: number;

  @ApiPropertyOptional({ example: 'Weekly store replenishment request' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [MovementItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MovementItemDto)
  items!: MovementItemDto[];
}
