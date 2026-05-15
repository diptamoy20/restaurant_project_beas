import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserAddressDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 3 })
  userId!: number;

  @ApiProperty({ example: 'Home' })
  label!: string;

  @ApiProperty({ example: '12 MG Road, Bengaluru' })
  address!: string;

  @ApiPropertyOptional({ example: 'Bengaluru', nullable: true })
  city!: string | null;

  @ApiPropertyOptional({ example: 'Karnataka', nullable: true })
  state!: string | null;

  @ApiProperty({ example: 12.9716 })
  latitude!: number;

  @ApiProperty({ example: 77.5946 })
  longitude!: number;

  @ApiProperty({ example: true })
  isDefault!: boolean;
}
