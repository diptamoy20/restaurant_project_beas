import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TableResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  restaurantId!: number;

  @ApiProperty({ example: 'Downtown Spice Hub' })
  restaurantName!: string;

  @ApiProperty({ example: 'Table 1' })
  tableNumber!: string;

  @ApiProperty({ example: 4 })
  capacity!: number;

  @ApiPropertyOptional({ example: 'tbl_abc123', nullable: true })
  tableToken!: string | null;

  @ApiPropertyOptional({
    example: 'https://order.example.com/table/tbl_abc123',
    nullable: true,
  })
  qrCodeUrl!: string | null;

  @ApiProperty({ example: true })
  hasQr!: boolean;

  @ApiProperty({ example: false })
  hasActiveSession!: boolean;

  @ApiPropertyOptional({ example: 'ACTIVE', nullable: true })
  activeSessionStatus!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class TableResolutionResponseDto {
  @ApiProperty({ example: 1 })
  restaurantId!: number;

  @ApiProperty({ example: 'Downtown Spice Hub' })
  restaurantName!: string;

  @ApiPropertyOptional({ example: 'Authentic Indian cuisine', nullable: true })
  restaurantDescription!: string | null;

  @ApiProperty({ example: 1 })
  tableId!: number;

  @ApiProperty({ example: 'Table 1' })
  tableNumber!: string;

  @ApiProperty({ example: 1 })
  sessionId!: number;

  @ApiProperty({ example: 'sess_xyz789' })
  sessionToken!: string;
}

export class TableSessionResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  restaurantId!: number;

  @ApiProperty({ example: 'Downtown Spice Hub' })
  restaurantName!: string;

  @ApiProperty({ example: 1 })
  tableId!: number;

  @ApiProperty({ example: 'Table 1' })
  tableNumber!: string;

  @ApiProperty({ example: 'sess_xyz789' })
  sessionToken!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty()
  startedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  endedAt!: Date | null;

  @ApiProperty({ example: 3 })
  orderCount!: number;
}
