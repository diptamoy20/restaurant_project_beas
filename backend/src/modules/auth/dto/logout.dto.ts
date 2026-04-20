import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    minLength: 20,
    description: 'Optional refresh token to revoke when access token is not available',
  })
  @IsOptional()
  @IsString()
  @MinLength(20)
  refreshToken?: string;
}
