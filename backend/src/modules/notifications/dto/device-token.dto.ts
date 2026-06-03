import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({
    example: 'fcm-registration-token',
  })
  @IsString()
  @MaxLength(4096)
  token!: string;

  @ApiPropertyOptional({
    example: 'android',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;
}

export class UnregisterDeviceTokenDto {
  @ApiProperty({
    example: 'fcm-registration-token',
  })
  @IsString()
  @MaxLength(4096)
  token!: string;
}

export class DeviceTokenResponseDto {
  @ApiProperty({
    example: 'Device token registered successfully',
  })
  message!: string;
}
