import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';

export enum SocialLoginProvider {
  FIREBASE_GOOGLE = 'firebase_google',
  FIREBASE_FACEBOOK = 'firebase_facebook',
}

export class SocialLoginDto {
  @ApiProperty({ enum: SocialLoginProvider, example: SocialLoginProvider.FIREBASE_GOOGLE })
  @IsEnum(SocialLoginProvider)
  provider!: SocialLoginProvider;

  @ApiProperty({ example: 'firebase-id-token' })
  @IsString()
  @MinLength(1)
  idToken!: string;
}
