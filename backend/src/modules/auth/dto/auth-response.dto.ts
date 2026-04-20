import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

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

  @ApiProperty({ enum: Role, isArray: true, example: ['admin'] })
  @IsArray()
  @IsEnum(Role, { each: true })
  roles!: Role[];
}

export class AuthResponseDto {
  @ApiProperty({ example: 'jwt-token' })
  @IsString()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  @IsString()
  tokenType!: string;

  @ApiProperty({ type: () => AuthUserDto })
  @Type(() => AuthUserDto)
  user!: AuthUserDto;
}
