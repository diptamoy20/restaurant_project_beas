import {
  Body,
  Controller,
  BadRequestException,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { AuthenticatedUser, AuthSuccessResponse } from './auth.types';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  RoleLoginDto,
} from './dto/auth.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ImageFileInterceptor } from '../../common/cloudinary/image-file.interceptor';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('auth')
@ApiTags('Auth')
@ApiBearerAuth('access-token')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register customer account' })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  register(@Body() payload: RegisterDto): Promise<AuthSuccessResponse<AuthResponseDto>> {
    return this.authService.register(payload);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email/phone and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiStandardErrorResponses({ badRequest: true })
  login(@Body() payload: LoginDto): Promise<AuthSuccessResponse<AuthResponseDto>> {
    return this.authService.login(payload);
  }

  @Public()
  @Post('social-login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with a Firebase social identity token' })
  @ApiBody({
    type: SocialLoginDto,
    examples: {
      google: {
        summary: 'Firebase Google login',
        value: {
          provider: 'firebase_google',
          idToken: 'firebase-google-id-token',
        },
      },
      facebook: {
        summary: 'Firebase Facebook login',
        value: {
          provider: 'firebase_facebook',
          idToken: 'firebase-facebook-id-token',
        },
      },
    },
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid social login token' })
  @ApiStandardErrorResponses({ badRequest: true, unauthorized: true, forbidden: true })
  socialLogin(@Body() payload: SocialLoginDto): Promise<AuthSuccessResponse<AuthResponseDto>> {
    return this.authService.socialLogin(payload);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a customer password reset link' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiStandardErrorResponses({ badRequest: true })
  forgotPassword(
    @Body() payload: ForgotPasswordDto,
  ): Promise<AuthSuccessResponse<{ resetRequested: boolean }>> {
    return this.authService.forgotPassword(payload);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset customer password with a secure token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiStandardErrorResponses({ badRequest: true, unauthorized: true })
  resetPassword(
    @Body() payload: ResetPasswordDto,
  ): Promise<AuthSuccessResponse<{ passwordReset: boolean }>> {
    return this.authService.resetPassword(payload);
  }

  @Public()
  @Post('login/role')
  @HttpCode(200)
  @ApiOperation({ summary: 'Role-aware login for admin/manager clients' })
  @ApiBody({ type: RoleLoginDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiForbiddenResponse({ description: 'User does not have requested role' })
  @ApiStandardErrorResponses({ badRequest: true, unauthorized: true })
  async loginByRole(@Body() payload: RoleLoginDto): Promise<AuthSuccessResponse<AuthResponseDto>> {
    return this.authService.login(payload, payload.role);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, unauthorized: true, forbidden: true })
  refresh(@Body() payload: RefreshTokenDto): Promise<AuthSuccessResponse<AuthResponseDto>> {
    return this.authService.refresh(payload);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke current refresh token' })
  @ApiBody({ type: LogoutDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
  logout(
    @Req() request: { user: AuthenticatedUser },
    @Body() payload: LogoutDto,
  ): Promise<AuthSuccessResponse<{ loggedOut: boolean }>> {
    return this.authService.logout(request.user, payload);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiOkResponse({ type: AuthUserDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiStandardErrorResponses({ unauthorized: true })
  me(@Req() request: { user: AuthenticatedUser }): Promise<AuthSuccessResponse<AuthUserDto>> {
    return this.authService.me(request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiOkResponse({ type: AuthUserDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiStandardErrorResponses({ badRequest: true, unauthorized: true })
  updateMe(
    @Req() request: { user: AuthenticatedUser },
    @Body() payload: UpdateProfileDto,
  ): Promise<AuthSuccessResponse<AuthUserDto>> {
    return this.authService.updateMe(request.user, payload);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/profile-image')
  @UseInterceptors(ImageFileInterceptor('image'))
  @ApiOperation({ summary: 'Upload current authenticated user profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({ type: AuthUserDto })
  @ApiStandardErrorResponses({ badRequest: true, unauthorized: true })
  uploadProfileImage(
    @Req() request: { user: AuthenticatedUser },
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<AuthSuccessResponse<AuthUserDto>> {
    if (!file) {
      throw new BadRequestException('Profile image is required');
    }

    return this.authService.updateProfileImage(request.user, file);
  }
}
