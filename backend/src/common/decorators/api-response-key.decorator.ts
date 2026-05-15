import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const API_RESPONSE_KEY = 'apiResponseKey';

export const ApiResponseKey = (key: string): CustomDecorator<string> =>
  SetMetadata(API_RESPONSE_KEY, key);
