import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString } from 'class-validator';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 401 })
  @IsNumber()
  statusCode!: number;

  @ApiProperty({ example: 'Unauthorized' })
  @IsString()
  message!: string;

  @ApiProperty({ example: 'Unauthorized' })
  @IsString()
  error!: string;
}

export class ApiValidationErrorResponseDto {
  @ApiProperty({ example: 400 })
  @IsNumber()
  statusCode!: number;

  @ApiProperty({
    example: ['email must be an email', 'password must be longer than or equal to 6 characters'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  message!: string[];

  @ApiProperty({ example: 'Bad Request' })
  @IsString()
  error!: string;
}
