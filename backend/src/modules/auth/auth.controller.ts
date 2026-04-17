import { Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RoleLoginDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() payload: RegisterDto) {
    return this.authService.register(payload);
  }

  @Public()
  @Post('login')
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Public()
  @Post('login/role')
  async loginByRole(@Body() payload: RoleLoginDto) {
    const response = await this.authService.login(payload);

    if (!response.user.roles.includes(payload.role)) {
      throw new ForbiddenException(`User does not have the ${payload.role} role`);
    }

    return response;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: { user: unknown }) {
    return request.user;
  }
}
