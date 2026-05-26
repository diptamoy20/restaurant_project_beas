import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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

export class CreateStaffUserDto {
  @ApiPropertyOptional({ example: 'Ravi Kumar' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'ravi.delivery@example.com' })
  @ValidateIf((payload) => !payload.phone)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+919900000005' })
  @ValidateIf((payload) => !payload.email || payload.role === Role.DELIVERY_BOY)
  @Matches(/^\+?[1-9]\d{7,14}$/)
  phone?: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: Role, example: Role.DELIVERY_BOY })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({ example: { orders: ['view'] } })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, string[]>;
}

export class UpdateStaffPermissionsDto {
  @ApiProperty({ example: 'ravi.delivery@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: { orders: ['view'] } })
  @IsObject()
  permissions!: Record<string, string[]>;
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

  @ApiProperty({ enum: Role, isArray: true, example: [Role.DELIVERY_BOY] })
  roles!: Role[];

  @ApiProperty({ example: { orders: ['view'] } })
  permissions!: Record<string, string[]>;

  @ApiPropertyOptional({ type: () => StaffDeliveryAgentDto, nullable: true })
  @Type(() => StaffDeliveryAgentDto)
  deliveryAgent!: StaffDeliveryAgentDto | null;
}
