import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class MenuVariantDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Regular' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 189 })
  @IsNumber()
  price!: number;
}
