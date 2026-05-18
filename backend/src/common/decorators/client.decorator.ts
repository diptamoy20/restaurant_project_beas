import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

export const ALLOW_WEB_KEY = 'allowWeb';

export const AllowWeb = (): ClassDecorator & MethodDecorator =>
  applyDecorators(
    SetMetadata(ALLOW_WEB_KEY, true),
    ApiHeader({
      name: 'X-Client-Type',
      required: false,
      schema: {
        type: 'string',
        enum: ['web', 'mobile'],
      },
      description:
        'Leave empty or set web for public web access. Set mobile for mobile app requests; mobile requests require Authorization: Bearer <token>.',
    }),
  );
