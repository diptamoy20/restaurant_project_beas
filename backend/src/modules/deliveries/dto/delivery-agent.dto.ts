import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class DeliveryAgentDto {
  @IsNumber()
  id!: number;

  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsBoolean()
  isAvailable!: boolean;
}
