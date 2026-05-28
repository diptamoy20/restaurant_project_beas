import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class AssignDeliveryAgentDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  agentId!: number;
}
