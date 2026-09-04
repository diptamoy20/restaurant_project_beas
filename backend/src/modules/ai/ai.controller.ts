import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { AiService } from './ai.service';
import { Public } from '../../common/decorators/public.decorator';

interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
  ) {}

  @Public()
  @Post('chat')
  async chat(
    @Body('message') message: string,

    @Body('restaurantId')
    restaurantId?: number,

    @Body('history')
    history?: ChatHistoryMessage[],
  ) {
    return this.aiService.chat(
      message,
      restaurantId
        ? Number(restaurantId)
        : undefined,
      history ?? [],
    );
  }
}