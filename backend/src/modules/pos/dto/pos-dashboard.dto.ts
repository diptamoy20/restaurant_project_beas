import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class PosDashboardRestaurantDto {
  @ApiProperty({ example: 1, description: 'Restaurant ID' })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Pizza Palace', description: 'Restaurant name' })
  @IsString()
  name!: string;
}

export class PosDashboardSummaryDto {
  @ApiProperty({ example: 25, description: 'Number of POS orders today' })
  @IsNumber()
  todayOrders!: number;

  @ApiProperty({ example: 42000, description: 'Total revenue from POS orders (paid)' })
  @IsNumber()
  totalRevenue!: number;

  @ApiProperty({ example: 1200, description: 'Total number of POS orders' })
  @IsNumber()
  totalOrders!: number;

  @ApiProperty({ example: 1680, description: 'Average order value of paid POS orders' })
  @IsNumber()
  averageOrderValue!: number;
}

export class PosDashboardResponseDto {
  @ApiProperty({ type: () => PosDashboardRestaurantDto })
  restaurant!: PosDashboardRestaurantDto;

  @ApiProperty({ type: () => PosDashboardSummaryDto })
  summary!: PosDashboardSummaryDto;
}
