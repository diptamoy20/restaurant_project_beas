import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PosOrderListQueryDto {
  @ApiPropertyOptional({
    description: 'Search by order number or customer phone',
    example: 'ORD-3012273',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['PENDING', 'PAID', 'FAILED'],
    description: 'Filter by payment status',
  })
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'PAID', 'FAILED'])
  paymentStatus?: string;

  @ApiPropertyOptional({
    enum: ['CASH', 'CARD', 'UPI', 'WALLET', 'RAZORPAY'],
    description: 'Filter by payment method',
  })
  @IsOptional()
  @IsString()
  @IsIn(['CASH', 'CARD', 'UPI', 'WALLET', 'RAZORPAY'])
  paymentMethod?: string;

  @ApiPropertyOptional({
    enum: [
      'PENDING',
      'ACCEPTED',
      'PREPARING',
      'ON_THE_WAY',
      'DELIVERED',
      'CANCELLED',
      'SERVED',
      'PLACED',
    ],
    description: 'Filter by order status',
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'PENDING',
    'ACCEPTED',
    'PREPARING',
    'ON_THE_WAY',
    'DELIVERED',
    'CANCELLED',
    'SERVED',
    'PLACED',
  ])
  orderStatus?: string;

  @ApiPropertyOptional({
    enum: ['DINE_IN', 'TAKEAWAY'],
    description: 'Filter by order type',
  })
  @IsOptional()
  @IsString()
  @IsIn(['DINE_IN', 'TAKEAWAY'])
  orderType?: string;

  @ApiPropertyOptional({
    description: 'Filter by exact date (YYYY-MM-DD). Overrides startDate/endDate.',
    example: '2026-07-16',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Start date for range filter (YYYY-MM-DD)',
    example: '2026-07-01',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for range filter (YYYY-MM-DD)',
    example: '2026-07-16',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: ['createdAt', 'finalAmount'],
    default: 'createdAt',
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'finalAmount'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'Sort order',
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';
}
