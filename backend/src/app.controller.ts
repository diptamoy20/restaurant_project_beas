import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { HealthResponseDto } from './dto/health-response.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  getHealth(): HealthResponseDto {
    return this.appService.getHealth();
  }
}
