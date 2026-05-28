import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Type,
  mixin,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import multer from 'multer';
import { Observable } from 'rxjs';

import {
  createImageUploadOptions,
  formatImageUploadLimit,
  getImageUploadMaxBytes,
} from './image-upload.options';

type MulterMiddleware = (
  request: unknown,
  response: unknown,
  callback: (error?: Error & { code?: string }) => void,
) => void;

export function ImageFileInterceptor(fieldName: string): Type<NestInterceptor> {
  @Injectable()
  class ImageFileMixinInterceptor implements NestInterceptor {
    constructor(private readonly configService: ConfigService) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
      const httpContext = context.switchToHttp();
      const request = httpContext.getRequest();
      const response = httpContext.getResponse();
      const maxBytes = getImageUploadMaxBytes(this.configService);
      const upload = multer(createImageUploadOptions(maxBytes)).single(
        fieldName,
      ) as MulterMiddleware;

      await new Promise<void>((resolve, reject) => {
        upload(request, response, (error) => {
          if (!error) {
            resolve();
            return;
          }

          if (error.code === 'LIMIT_FILE_SIZE') {
            reject(
              new BadRequestException(
                `Image must be ${formatImageUploadLimit(maxBytes)} or smaller`,
              ),
            );
            return;
          }

          reject(error);
        });
      });

      return next.handle();
    }
  }

  return mixin(ImageFileMixinInterceptor);
}
