import {
  Body,
  Controller,
  BadRequestException,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';

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
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const PROFILE_IMAGE_UPLOAD_DIR = join(process.cwd(), 'uploads', 'profile-images');
const PROFILE_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function ensureProfileImageUploadDir(): void {
  if (!existsSync(PROFILE_IMAGE_UPLOAD_DIR)) {
    mkdirSync(PROFILE_IMAGE_UPLOAD_DIR, { recursive: true });
  }
}

function sanitizeProfileImageFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '');
}

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
    const response = await this.authService.login(payload);

    if (!response.data.user.roles.includes(payload.role)) {
      throw new ForbiddenException(`User does not have the ${payload.role} role`);
    }

    return response;
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
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (
          _request: unknown,
          _file: Express.Multer.File,
          callback: (error: Error | null, destination: string) => void,
        ) => {
          ensureProfileImageUploadDir();
          callback(null, PROFILE_IMAGE_UPLOAD_DIR);
        },
        filename: (
          _request: unknown,
          file: Express.Multer.File,
          callback: (error: Error | null, filename: string) => void,
        ) => {
          const extension = extname(file.originalname).toLowerCase() || '.jpg';
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
          callback(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
      fileFilter: (
        _request: unknown,
        file: Express.Multer.File,
        callback: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        if (!PROFILE_IMAGE_MIME_TYPES.has(file.mimetype)) {
          callback(new BadRequestException('Only JPG, PNG, WEBP, or GIF images are allowed'), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload current authenticated user profile image' })
  @ApiOkResponse({ type: AuthUserDto })
  @ApiStandardErrorResponses({ badRequest: true, unauthorized: true })
  uploadProfileImage(
    @Req() request: { user: AuthenticatedUser },
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<AuthSuccessResponse<AuthUserDto>> {
    if (!file) {
      throw new BadRequestException('Profile image is required');
    }

    return this.authService.updateProfileImage(
      request.user,
      `/api/auth/profile-image/${file.filename}`,
    );
  }

  @Public()
  @Get('profile-image/:filename')
  getProfileImage(@Param('filename') filename: string, @Res() response: Response): void {
    const safeFilename = sanitizeProfileImageFilename(filename);

    if (!safeFilename || safeFilename !== filename) {
      throw new BadRequestException('Invalid profile image');
    }

    response.sendFile(safeFilename, { root: PROFILE_IMAGE_UPLOAD_DIR });
  }
}
