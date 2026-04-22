import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { HealthResponseDto } from './dto/health-response.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  async getHealth(): Promise<HealthResponseDto> {
    return this.appService.getHealth();
  }
}
