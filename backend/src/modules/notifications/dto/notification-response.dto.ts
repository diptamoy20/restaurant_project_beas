import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

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
