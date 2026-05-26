import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

import { Role } from '../../../common/enums/role.enum';

export class AuthUserDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiPropertyOptional({ example: 'Admin User', nullable: true })
  @IsOptional()
  @IsString()
  name!: string | null;

  @ApiPropertyOptional({ example: 'admin@example.com', nullable: true })
  @IsOptional()
  @IsString()
  email!: string | null;

  @ApiPropertyOptional({ example: '+919900000002', nullable: true })
  @IsOptional()
  @IsString()
  phone!: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/profile.jpg', nullable: true })
  @IsOptional()
  @IsString()
  profileImageUrl!: string | null;

  @ApiProperty({ enum: Role, example: Role.ADMIN })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({ example: { dashboard: ['view'], orders: ['view'] } })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, string[]>;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'jwt-token' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'jwt-token' })
  @IsString()
  accessToken!: string;

  @ApiProperty({ example: 'refresh-jwt-token' })
  @IsString()
  refreshToken!: string;

  @ApiProperty({ example: 'Bearer' })
  @IsString()
  tokenType!: string;

  @ApiProperty({ example: '2026-04-27T12:00:00.000Z', format: 'date-time' })
  @IsString()
  refreshTokenExpiresAt!: string;

  @ApiProperty({ type: () => AuthUserDto })
  @Type(() => AuthUserDto)
  user!: AuthUserDto;
}
