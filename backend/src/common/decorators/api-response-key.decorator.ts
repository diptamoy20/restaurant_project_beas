import { SetMetadata } from '@nestjs/common';

export const API_RESPONSE_KEY = 'apiResponseKey';

export const ApiResponseKey = (key: string) => SetMetadata(API_RESPONSE_KEY, key);
