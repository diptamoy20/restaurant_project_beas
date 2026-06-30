import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class DeliveryTrackingVehicleDto {
  @ApiPropertyOptional({
    example: 'BIKE',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  vehicleType!: string | null;

  @ApiPropertyOptional({
    example: 'WB01AB1234',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  vehicleNumber!: string | null;

  @ApiPropertyOptional({
    example: 'Honda Shine',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  brand!: string | null;

  @ApiPropertyOptional({
    example: 'Black',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  color!: string | null;
}

export class DeliveryAgentDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Ravi Kumar' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '+919900000099' })
  @IsString()
  phone!: string;

  @ApiPropertyOptional({
    example: 'https://example.com/profile.jpg',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  profileImageUrl!: string | null;

  @ApiProperty({ example: false })
  @IsBoolean()
  isAvailable!: boolean;

  @ApiProperty({
    type: () => DeliveryTrackingVehicleDto,
    nullable: true,
  })
  @ValidateNested()
  @Type(() => DeliveryTrackingVehicleDto)
  vehicle!: DeliveryTrackingVehicleDto | null;
}
