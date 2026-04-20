import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { Role } from '../../../common/enums/role.enum';

export class RegisterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ValidateIf((o) => !o.email)
  @Matches(/^\+?[1-9]\d{7,14}$/)
  phone?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class LoginDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ValidateIf((o) => !o.email)
  @Matches(/^\+?[1-9]\d{7,14}$/)
  phone?: string;

  @IsString()
  password!: string;
}

export class RoleLoginDto extends LoginDto {
  @IsEnum(Role)
  role!: Role;
}
