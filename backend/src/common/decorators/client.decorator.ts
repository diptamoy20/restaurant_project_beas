import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiUnauthorizedResponse } from '@nestjs/swagger';

export const ALLOW_WEB_KEY = 'allowWeb';

export const AllowWeb = (): ClassDecorator & MethodDecorator =>
  applyDecorators(
    SetMetadata(ALLOW_WEB_KEY, true),
    ApiBearerAuth('access-token'),
    ApiHeader({
      name: 'X-Client-Type',
      required: true,
      schema: {
        type: 'string',
        enum: ['web', 'mobile'],
      },
      description:
        'Required. Set web for browser access. Set mobile for mobile app requests; mobile requests require Authorization: Bearer <token>.',
    }),
    ApiUnauthorizedResponse({
      description:
        'Missing/invalid X-Client-Type, or mobile request without a valid Authorization: Bearer <token>.',
    }),
  );
