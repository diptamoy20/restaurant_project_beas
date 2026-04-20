import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({ example: 'Alice Customer' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'alice@example.com' })
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+919911112222' })
  @ValidateIf((o) => !o.email)
  @Matches(/^\+?[1-9]\d{7,14}$/)
  phone?: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class LoginDto {
  @ApiPropertyOptional({ example: 'customer@example.com' })
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+919900000001' })
  @ValidateIf((o) => !o.email)
  @Matches(/^\+?[1-9]\d{7,14}$/)
  phone?: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password!: string;
}

export class RoleLoginDto extends LoginDto {
  @ApiProperty({ enum: Role, example: Role.ADMIN })
  @IsEnum(Role)
  role!: Role;
}
