import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { Role } from '../../../common/enums/role.enum';

const PHONE_VALIDATION_MESSAGE =
  'Enter a valid phone number using digits only, with optional country code. Example: +919900000005 or 9900000005';
const VEHICLE_NUMBER_VALIDATION_MESSAGE =
  'Enter a valid vehicle number using letters, digits, spaces, or hyphens. Example: WB01AB1234';

export enum StaffDeliveryAgentGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum StaffDeliveryAgentVehicleType {
  BIKE = 'BIKE',
  SCOOTER = 'SCOOTER',
  CYCLE = 'CYCLE',
  CAR = 'CAR',
  OTHER = 'OTHER',
}

export class StaffDeliveryAgentProfileInputDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ example: 'Salt Lake, Sector 1, Kolkata' })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ example: '1997-10-09' })
  @ValidateIf(
    (payload) =>
      payload.dateOfBirth !== undefined &&
      payload.dateOfBirth !== null &&
      payload.dateOfBirth !== '',
  )
  @IsDateString({}, { message: 'Date of birth must be a valid date, for example 1997-10-09' })
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ enum: StaffDeliveryAgentGender, example: StaffDeliveryAgentGender.MALE })
  @ValidateIf(
    (payload) => payload.gender !== undefined && payload.gender !== null && payload.gender !== '',
  )
  @IsEnum(StaffDeliveryAgentGender)
  gender?: StaffDeliveryAgentGender | null;

  @ApiPropertyOptional({ example: '+919123456789' })
  @ValidateIf(
    (payload) =>
      payload.emergencyContact !== undefined &&
      payload.emergencyContact !== null &&
      payload.emergencyContact !== '',
  )
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: PHONE_VALIDATION_MESSAGE })
  emergencyContact?: string | null;

  @ApiPropertyOptional({
    enum: StaffDeliveryAgentVehicleType,
    example: StaffDeliveryAgentVehicleType.BIKE,
  })
  @ValidateIf(
    (payload) =>
      payload.vehicleType !== undefined &&
      payload.vehicleType !== null &&
      payload.vehicleType !== '',
  )
  @IsEnum(StaffDeliveryAgentVehicleType)
  vehicleType?: StaffDeliveryAgentVehicleType | null;

  @ApiPropertyOptional({ example: 'WB01AB1234' })
  @ValidateIf(
    (payload) =>
      payload.vehicleNumber !== undefined &&
      payload.vehicleNumber !== null &&
      payload.vehicleNumber !== '',
  )
  @Matches(/^[A-Za-z0-9 -]{4,20}$/, { message: VEHICLE_NUMBER_VALIDATION_MESSAGE })
  vehicleNumber?: string | null;

  @ApiPropertyOptional({ example: 'Honda Shine' })
  @IsOptional()
  @IsString()
  vehicleBrand?: string | null;

  @ApiPropertyOptional({ example: 'Black' })
  @IsOptional()
  @IsString()
  vehicleColor?: string | null;
}

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

  @ApiPropertyOptional({ example: 1 })
  @ValidateIf((payload) => payload.role === Role.POS_STAFF)
  @IsNumber({}, { message: 'Restaurant is required for POS staff' })
  restaurantId?: number;

  @ApiPropertyOptional({ example: { orders: ['view'] } })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, string[]>;

  @ApiPropertyOptional({ example: 'https://example.com/profile.jpg' })
  @IsOptional()
  @IsString()
  profileImageUrl?: string | null;

  @ApiPropertyOptional({ type: () => StaffDeliveryAgentProfileInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StaffDeliveryAgentProfileInputDto)
  deliveryAgent?: StaffDeliveryAgentProfileInputDto;
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

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber({}, { message: 'Restaurant is required for POS staff' })
  restaurantId?: number | null;

  @ApiPropertyOptional({ example: { orders: ['view'] } })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, string[]>;

  @ApiPropertyOptional({ example: 'https://example.com/profile.jpg' })
  @IsOptional()
  @IsString()
  profileImageUrl?: string | null;

  @ApiPropertyOptional({ type: () => StaffDeliveryAgentProfileInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StaffDeliveryAgentProfileInputDto)
  deliveryAgent?: StaffDeliveryAgentProfileInputDto;
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

  @ApiProperty({ example: false })
  @IsBoolean()
  isVerified!: boolean;

  @ApiPropertyOptional({ example: 'Salt Lake, Sector 1, Kolkata', nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ example: '1997-10-09', nullable: true })
  dateOfBirth!: string | null;

  @ApiPropertyOptional({ enum: StaffDeliveryAgentGender, example: StaffDeliveryAgentGender.MALE })
  gender!: string | null;

  @ApiPropertyOptional({ example: '+919123456789', nullable: true })
  emergencyContact!: string | null;

  @ApiPropertyOptional({
    enum: StaffDeliveryAgentVehicleType,
    example: StaffDeliveryAgentVehicleType.BIKE,
    nullable: true,
  })
  vehicleType!: string | null;

  @ApiPropertyOptional({ example: 'WB01AB1234', nullable: true })
  vehicleNumber!: string | null;

  @ApiPropertyOptional({ example: 'Honda Shine', nullable: true })
  vehicleBrand!: string | null;

  @ApiPropertyOptional({ example: 'Black', nullable: true })
  vehicleColor!: string | null;
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

  @ApiPropertyOptional({ example: 'https://example.com/profile.jpg', nullable: true })
  profileImageUrl!: string | null;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty({ enum: Role, example: Role.DELIVERY_BOY })
  role!: Role;

  @ApiPropertyOptional({ example: 1, nullable: true })
  restaurantId?: number | null;

  @ApiPropertyOptional({ example: 'Pizza Palace', nullable: true })
  restaurantName?: string | null;

  @ApiProperty({ example: { orders: ['view'] } })
  permissions!: Record<string, string[]>;

  @ApiPropertyOptional({ type: () => StaffDeliveryAgentDto, nullable: true })
  @Type(() => StaffDeliveryAgentDto)
  deliveryAgent!: StaffDeliveryAgentDto | null;
}
