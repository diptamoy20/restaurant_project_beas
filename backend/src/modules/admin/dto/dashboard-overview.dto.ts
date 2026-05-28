import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, ValidateNested } from 'class-validator';

export type DashboardRange = 'today' | '7d' | '30d';

export class DashboardOverviewQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  restaurantId?: number;

  @ApiPropertyOptional({ enum: ['today', '7d', '30d'], example: 'today' })
  @IsOptional()
  @IsIn(['today', '7d', '30d'])
  range?: DashboardRange;
}

export class DashboardFilterDto {
  @ApiPropertyOptional({ example: 1, nullable: true })
  restaurantId!: number | null;

  @ApiProperty({ enum: ['today', '7d', '30d'], example: 'today' })
  range!: DashboardRange;
}

export class DashboardKpisDto {
  @ApiProperty({ example: 15480 })
  revenue!: number;

  @ApiProperty({ example: 42 })
  orders!: number;

  @ApiProperty({ example: 368 })
  averageOrderValue!: number;

  @ApiProperty({ example: 5 })
  pendingOrders!: number;

  @ApiProperty({ example: 28 })
  completedOrders!: number;

  @ApiProperty({ example: 2 })
  cancelledOrders!: number;

  @ApiProperty({ example: 3 })
  activeRestaurants!: number;

  @ApiProperty({ example: 4 })
  availableDeliveryBoys!: number;
}

export class DashboardTrendPointDto {
  @ApiProperty({ example: '10 AM' })
  label!: string;

  @ApiProperty({ example: 1200 })
  value!: number;
}

export class DashboardOrdersTrendPointDto {
  @ApiProperty({ example: '10 AM' })
  label!: string;

  @ApiProperty({ example: 8 })
  orders!: number;

  @ApiProperty({ example: 5 })
  delivery!: number;

  @ApiProperty({ example: 2 })
  dineIn!: number;

  @ApiProperty({ example: 1 })
  qr!: number;
}

export class DashboardRestaurantRevenueDto {
  @ApiProperty({ example: 1 })
  restaurantId!: number;

  @ApiProperty({ example: 'Downtown Spice' })
  restaurantName!: string;

  @ApiProperty({ example: 48000 })
  revenue!: number;
}

export class DashboardOrderTypeSplitDto {
  @ApiProperty({ example: 'DELIVERY' })
  type!: string;

  @ApiProperty({ example: 80 })
  count!: number;
}

export class DashboardPaymentMethodSplitDto {
  @ApiProperty({ example: 'COD' })
  method!: string;

  @ApiProperty({ example: 40 })
  count!: number;

  @ApiProperty({ example: 12000 })
  amount!: number;
}

export class DashboardRestaurantPerformanceDto {
  @ApiProperty({ example: 1 })
  restaurantId!: number;

  @ApiProperty({ example: 'Downtown Spice' })
  restaurantName!: string;

  @ApiProperty({ example: 120 })
  orders!: number;

  @ApiProperty({ example: 48000 })
  revenue!: number;

  @ApiProperty({ example: 400 })
  averageOrderValue!: number;

  @ApiProperty({ example: 4 })
  pending!: number;

  @ApiProperty({ example: 3 })
  cancelled!: number;

  @ApiProperty({ example: 'Active' })
  status!: string;
}

export class DashboardAttentionOrderDto {
  @ApiProperty({ example: 101 })
  orderId!: number;

  @ApiProperty({ example: 'ORD-101' })
  orderNumber!: string;

  @ApiProperty({ example: 'Downtown Spice' })
  restaurantName!: string;

  @ApiPropertyOptional({ example: 'Rahul', nullable: true })
  customerName!: string | null;

  @ApiProperty({ example: 'Delivery not assigned' })
  issue!: string;

  @ApiProperty({ example: 18 })
  ageMinutes!: number;
}

export class DashboardTopSellingItemDto {
  @ApiProperty({ example: 1 })
  itemId!: number;

  @ApiProperty({ example: 'Paneer Pizza' })
  itemName!: string;

  @ApiProperty({ example: 'Downtown Spice' })
  restaurantName!: string;

  @ApiProperty({ example: 42 })
  quantitySold!: number;

  @ApiProperty({ example: 12600 })
  revenue!: number;
}

export class DashboardRestaurantOptionDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Downtown Spice' })
  name!: string;
}

export class DashboardOverviewResponseDto {
  @ApiProperty({ type: () => DashboardFilterDto })
  @ValidateNested()
  @Type(() => DashboardFilterDto)
  filters!: DashboardFilterDto;

  @ApiProperty({ type: () => DashboardKpisDto })
  @ValidateNested()
  @Type(() => DashboardKpisDto)
  kpis!: DashboardKpisDto;

  @ApiProperty({ type: () => DashboardTrendPointDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardTrendPointDto)
  revenueTrend!: DashboardTrendPointDto[];

  @ApiProperty({ type: () => DashboardOrdersTrendPointDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardOrdersTrendPointDto)
  ordersTrend!: DashboardOrdersTrendPointDto[];

  @ApiProperty({ type: () => DashboardRestaurantRevenueDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardRestaurantRevenueDto)
  revenueByRestaurant!: DashboardRestaurantRevenueDto[];

  @ApiProperty({ type: () => DashboardOrderTypeSplitDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardOrderTypeSplitDto)
  orderTypeSplit!: DashboardOrderTypeSplitDto[];

  @ApiProperty({ type: () => DashboardPaymentMethodSplitDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardPaymentMethodSplitDto)
  paymentMethodSplit!: DashboardPaymentMethodSplitDto[];

  @ApiProperty({ type: () => DashboardRestaurantPerformanceDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardRestaurantPerformanceDto)
  restaurantPerformance!: DashboardRestaurantPerformanceDto[];

  @ApiProperty({ type: () => DashboardAttentionOrderDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardAttentionOrderDto)
  ordersNeedingAttention!: DashboardAttentionOrderDto[];

  @ApiProperty({ type: () => DashboardTopSellingItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardTopSellingItemDto)
  topSellingItems!: DashboardTopSellingItemDto[];

  @ApiProperty({ type: () => DashboardRestaurantOptionDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardRestaurantOptionDto)
  restaurants!: DashboardRestaurantOptionDto[];
}
