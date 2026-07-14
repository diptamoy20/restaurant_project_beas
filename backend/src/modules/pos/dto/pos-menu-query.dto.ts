import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PosMenuQueryDto {
  @ApiPropertyOptional({
    description: 'Search menu items by name (case-insensitive, partial match)',
    example: 'burger',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
