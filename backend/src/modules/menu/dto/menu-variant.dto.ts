import { IsNumber, IsString } from 'class-validator';

export class MenuVariantDto {
  @IsNumber()
  id!: number;

  @IsString()
  name!: string;

  @IsNumber()
  price!: number;
}
