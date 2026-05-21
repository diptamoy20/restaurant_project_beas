import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class SearchRestaurantsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'pizza' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  q!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
}
