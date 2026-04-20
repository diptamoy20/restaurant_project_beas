import { ApiProperty } from '@nestjs/swagger';

export class DashboardResponseDto {
  @ApiProperty({ example: 42 })
  totalOrders!: number;

  @ApiProperty({ example: 18 })
  totalUsers!: number;

  @ApiProperty({ example: 2 })
  totalRestaurants!: number;

  @ApiProperty({ example: 15480 })
  totalRevenue!: number;
}
