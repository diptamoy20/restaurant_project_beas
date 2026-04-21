import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import { ApiErrorResponse } from '../dto/api-response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<{
      status: (statusCode: number) => { json: (body: ApiErrorResponse) => void };
    }>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = this.extractMessage(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(message, exception instanceof Error ? exception.stack : undefined);
    } else if (
      exception instanceof UnauthorizedException ||
      exception instanceof ForbiddenException ||
      exception instanceof BadRequestException
    ) {
      this.logger.warn(message);
    }

    response.status(status).json({
      success: false,
      message,
    });
  }

  private extractMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return response;
      }

      if (typeof response === 'object' && response !== null) {
        const payload = response as { message?: string | string[]; error?: string };

        if (Array.isArray(payload.message)) {
          return payload.message.join(', ');
        }

        if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
          return payload.message;
        }

        if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
          return payload.error;
        }
      }

      return exception.message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }
}
