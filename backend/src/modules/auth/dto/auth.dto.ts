import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class RegisterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^\+?[1-9]\d{7,14}$/)
  phone?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class LoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^\+?[1-9]\d{7,14}$/)
  phone?: string;

  @IsString()
  password!: string;
}

export class RoleLoginDto extends LoginDto {
  @IsString()
  @IsIn([Role.ADMIN, Role.MANAGER, Role.CUSTOMER, Role.DELIVERY_BOY])
  role!: Role;
}
