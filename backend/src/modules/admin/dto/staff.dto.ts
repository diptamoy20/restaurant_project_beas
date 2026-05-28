import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { Role } from '../../../common/enums/role.enum';

const PHONE_VALIDATION_MESSAGE =
  'Enter a valid phone number using digits only, with optional country code. Example: +919900000005 or 9900000005';

export class CreateStaffUserDto {
  @ApiPropertyOptional({ example: 'Ravi Kumar' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'ravi.delivery@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @ValidateIf((payload) => payload.email !== undefined && payload.email !== '')
  @IsEmail({}, { message: 'Enter a valid email address, for example ravi.delivery@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+919900000005' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf(
    (payload) =>
      payload.role === Role.DELIVERY_BOY || (payload.phone !== undefined && payload.phone !== ''),
  )
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: PHONE_VALIDATION_MESSAGE })
  phone?: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;

  @ApiProperty({ enum: Role, example: Role.DELIVERY_BOY })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({ example: { orders: ['view'] } })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, string[]>;
}

export class UpdateStaffUserDto {
  @ApiPropertyOptional({ example: 'Ravi Kumar' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'ravi.delivery@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @ValidateIf((payload) => payload.email !== undefined && payload.email !== '')
  @IsEmail({}, { message: 'Enter a valid email address, for example ravi.delivery@example.com' })
  email?: string | null;

  @ApiPropertyOptional({ example: '+919900000005' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((payload) => payload.phone !== undefined && payload.phone !== '')
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: PHONE_VALIDATION_MESSAGE })
  phone?: string | null;

  @ApiPropertyOptional({ enum: Role, example: Role.MANAGER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: { orders: ['view'] } })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, string[]>;
}

export class UpdateStaffPermissionsDto {
  @ApiProperty({ example: 'ravi.delivery@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Enter a valid email address, for example ravi.delivery@example.com' })
  email!: string;

  @ApiProperty({ example: { orders: ['view'] } })
  @IsObject()
  permissions!: Record<string, string[]>;
}

export class UpdateStaffPasswordDto {
  @ApiProperty({ example: 'password123', minLength: 6 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;
}

export class UpdateStaffStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive!: boolean;
}

export class StaffDeliveryAgentDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Ravi Kumar' })
  name!: string;

  @ApiProperty({ example: '+919900000005' })
  phone!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isAvailable!: boolean;
}

export class StaffUserDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiPropertyOptional({ example: 'Ravi Kumar', nullable: true })
  name!: string | null;

  @ApiPropertyOptional({ example: 'ravi.delivery@example.com', nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ example: '+919900000005', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty({ enum: Role, example: Role.DELIVERY_BOY })
  role!: Role;

  @ApiProperty({ example: { orders: ['view'] } })
  permissions!: Record<string, string[]>;

  @ApiPropertyOptional({ type: () => StaffDeliveryAgentDto, nullable: true })
  @Type(() => StaffDeliveryAgentDto)
  deliveryAgent!: StaffDeliveryAgentDto | null;
}
