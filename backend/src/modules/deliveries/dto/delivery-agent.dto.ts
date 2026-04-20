import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

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

  @ApiProperty({ example: false })
  @IsBoolean()
  isAvailable!: boolean;
}
