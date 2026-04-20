import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsObject, IsString } from 'class-validator';

export class MembershipTierDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Gold' })
  @IsString()
  name!: string;
}

export class MembershipResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  userId!: number;

  @ApiProperty({ type: () => MembershipTierDto })
  @IsObject()
  tier!: MembershipTierDto;
}
