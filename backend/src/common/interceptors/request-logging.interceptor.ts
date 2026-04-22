import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

type RequestWithId = {
  method?: string;
  originalUrl?: string;
  url?: string;
  requestId?: string;
};

type ResponseWithStatus = {
  statusCode?: number;
};

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<ResponseWithStatus>();

    const method = request?.method ?? 'UNKNOWN';
    const url = request?.originalUrl ?? request?.url ?? 'UNKNOWN_URL';
    const requestId = request?.requestId ?? 'unknown-request-id';
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startedAt;
          const statusCode = response?.statusCode ?? 200;
          this.logger.log(`${method} ${url} ${statusCode} ${durationMs}ms requestId=${requestId}`);
        },
        error: () => {
          const durationMs = Date.now() - startedAt;
          const statusCode = response?.statusCode ?? 500;
          this.logger.warn(`${method} ${url} ${statusCode} ${durationMs}ms requestId=${requestId}`);
        },
      }),
    );
  }
}
