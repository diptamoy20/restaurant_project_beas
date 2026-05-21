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
    const request = context.getRequest<{ requestId?: string; method?: string; url?: string }>();
    const response = context.getResponse<{
      status: (statusCode: number) => { json: (body: ApiErrorResponse) => void };
    }>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = request?.requestId ?? 'unknown-request-id';
    const message = this.extractMessage(exception, status);
    const requestContext = `${request?.method ?? 'UNKNOWN'} ${request?.url ?? 'UNKNOWN_URL'} requestId=${requestId}`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${requestContext} ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (this.shouldLogAsDebug(request?.method, request?.url, message)) {
      this.logger.debug(`${requestContext} ${message}`);
    } else if (
      exception instanceof UnauthorizedException ||
      exception instanceof ForbiddenException ||
      exception instanceof BadRequestException
    ) {
      this.logger.warn(`${requestContext} ${message}`);
    }

    response.status(status).json({
      success: false,
      message: `${message} (requestId: ${requestId})`,
    });
  }

  private extractMessage(exception: unknown, status: number): string {
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'Internal server error';
    }

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

  private shouldLogAsDebug(
    method: string | undefined,
    url: string | undefined,
    message: string,
  ): boolean {
    return (
      method === 'POST' &&
      (url === '/api/auth/refresh' || url === '/auth/refresh') &&
      message === 'Refresh token expired'
    );
  }
}
