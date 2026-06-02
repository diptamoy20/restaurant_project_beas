import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SendOtpResponseDto {
  @ApiProperty({
    example: 'OTP sent successfully',
  })
  @IsString()
  message!: string;

  @ApiProperty({
    example: '483921',
  })
  @IsString()
  otp!: string;
}
