import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { AiService } from './ai.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
  ) {}

  @Public()
  @Post('chat')
  async chat(
    @Body('message') message: string,
    @Body('restaurantId') restaurantId?: number,
  ) {
    return this.aiService.chat(
      message,
      restaurantId
        ? Number(restaurantId)
        : undefined,
    );
  }
}