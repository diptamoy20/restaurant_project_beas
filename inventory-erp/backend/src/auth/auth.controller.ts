import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';

@ApiTags('ERP Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'ERP login for authorized role users' })
  login(@Body() dto: any) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('seed')
  @ApiOperation({
    summary: 'Seed initial SUPER_ADMIN user (admin@erp.com / admin123) if none exists',
  })
  seed() {
    return this.authService.seedSuperAdmin();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile data' })
  getProfile(@Req() req: any) {
    return req.user;
  }
}
