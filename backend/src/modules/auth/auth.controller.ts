import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
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
}
