import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRestaurantTableDto {
  @ApiProperty({ example: 'T1', description: 'Table number or identifier' })
  @IsNotEmpty()
  @IsString()
  tableNumber!: string;

  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Table status for QR ordering' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'qr-table-t1', description: 'Optional custom QR code label' })
  @IsOptional()
  @IsString()
  qrCode?: string;
}

export class UpdateRestaurantTableDto {
  @ApiPropertyOptional({ example: 'T1', description: 'Table number or identifier' })
  @IsOptional()
  @IsString()
  tableNumber?: string;

  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Table status for QR ordering' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'qr-table-t1', description: 'Optional custom QR code label' })
  @IsOptional()
  @IsString()
  qrCode?: string;
}

export class RestaurantTableResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId!: number;

  @ApiProperty({ example: 'T1' })
  @IsString()
  tableNumber!: string;

  @ApiPropertyOptional({ example: 'qr-table-t1', nullable: true })
  @IsOptional()
  @IsString()
  qrCode!: string | null;

  @ApiPropertyOptional({ example: 'ACTIVE', nullable: true })
  @IsOptional()
  @IsString()
  status!: string | null;
}

export class RestaurantTableQrResponseDto {
  @ApiProperty({ example: 'https://example.com/menu/1/2' })
  @IsString()
  qrUrl!: string;
}
