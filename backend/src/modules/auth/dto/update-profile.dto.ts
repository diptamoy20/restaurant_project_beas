import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Alice Customer' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'alice@example.com' })
  @IsOptional()
  @ValidateIf((payload) => payload.email !== '')
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+919911112222' })
  @IsOptional()
  @ValidateIf((payload) => payload.phone !== '')
  @Matches(/^\+?[1-9]\d{7,14}$/)
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/profile.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  profileImageUrl?: string;
}
