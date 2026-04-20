import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

import { ApiSuccessResponse, isApiSuccessResponse } from '../dto/api-response.dto';

@Injectable()
export class StandardResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T> | ApiSuccessResponse<unknown>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T> | ApiSuccessResponse<unknown>> {
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
      return next.handle() as Observable<ApiSuccessResponse<T> | ApiSuccessResponse<unknown>>;
    }

    return next.handle().pipe(
      map((data) => {
        if (isApiSuccessResponse(data)) {
          return data;
        }

        return {
          success: true,
          message: 'Success',
          data: (data === undefined ? null : data) as T,
        };
      }),
    );
  }
}
