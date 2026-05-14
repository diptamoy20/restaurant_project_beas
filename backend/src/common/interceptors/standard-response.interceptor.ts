import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';

import { API_RESPONSE_KEY } from '../decorators/api-response-key.decorator';
import { ApiSuccessResponse, isApiSuccessResponse } from '../dto/api-response.dto';

type StandardResponse<T> =
  | ApiSuccessResponse<T>
  | ApiSuccessResponse<unknown>
  | ({ success: true; message: string } & Record<string, unknown>);

@Injectable()
export class StandardResponseInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<T>> {
    const request = context.switchToHttp().getRequest<{
      url?: string;
      headers?: Record<string, string | string[] | undefined>;
    }>();

    const url = request?.url ?? '';
    const acceptHeader = request?.headers?.accept;
    const accept = Array.isArray(acceptHeader) ? acceptHeader.join(',') : (acceptHeader ?? '');

    if (
      url.includes('/api/docs') ||
      url.includes('/api/openapi.json') ||
      accept.includes('text/html')
    ) {
      return next.handle() as Observable<StandardResponse<T>>;
    }

    const responseKey = this.reflector.getAllAndOverride<string>(API_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((data) => {
        if (isApiSuccessResponse(data)) {
          return data;
        }

        return {
          success: true,
          message: 'Success',
          [responseKey || 'data']: (data === undefined ? null : data) as T,
        };
      }),
    );
  }
}
