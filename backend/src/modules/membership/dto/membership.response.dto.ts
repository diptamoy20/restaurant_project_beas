import { IsNumber, IsObject, IsString } from 'class-validator';

export class MembershipTierDto {
  @IsNumber()
  id!: number;

  @IsString()
  name!: string;
}

export class MembershipResponseDto {
  @IsNumber()
  id!: number;

  @IsNumber()
  userId!: number;

  @IsObject()
  tier!: MembershipTierDto;
}
