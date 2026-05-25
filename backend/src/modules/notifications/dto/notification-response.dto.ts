import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsString, ValidateNested } from 'class-validator';

import { PaginationMetaDto } from '../../../common/dto/pagination.dto';

export class NotificationResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  userId!: number;

  @ApiProperty({ example: 'Order on the way' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Your order is out for delivery and will arrive soon.' })
  @IsString()
  message!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isRead!: boolean;
}

export class PaginatedNotificationResponseDto extends PaginationMetaDto {
  @ApiProperty({ type: () => NotificationResponseDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationResponseDto)
  items!: NotificationResponseDto[];
}
