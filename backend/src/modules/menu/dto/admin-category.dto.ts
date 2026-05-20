import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminCategoryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId!: number;

  @ApiProperty({ example: 'Main Course' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Chef specials and meal plates', nullable: true })
  @IsOptional()
  description?: string | null;

  @ApiProperty({ example: 12 })
  @IsNumber()
  activeItemCount!: number;

  @ApiProperty({ example: 14 })
  @IsNumber()
  totalItemCount!: number;
}

export class CreateAdminCategoryDto {
  @ApiProperty({ example: 'Main Course' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: 'Chef specials and meal plates' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateAdminCategoryDto {
  @ApiPropertyOptional({ example: 'Main Course' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 'Chef specials and meal plates' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
