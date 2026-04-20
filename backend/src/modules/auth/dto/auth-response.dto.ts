import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

import { Role } from '../../../common/enums/role.enum';

export class AuthUserDto {
  @IsNumber()
  id!: number;

  @IsOptional()
  @IsString()
  name!: string | null;

  @IsOptional()
  @IsString()
  email!: string | null;

  @IsOptional()
  @IsString()
  phone!: string | null;

  @IsArray()
  @IsEnum(Role, { each: true })
  roles!: Role[];
}

export class AuthResponseDto {
  @IsString()
  accessToken!: string;

  @IsString()
  tokenType!: string;

  @Type(() => AuthUserDto)
  user!: AuthUserDto;
}
