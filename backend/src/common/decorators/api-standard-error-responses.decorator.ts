import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto, ApiValidationErrorResponseDto } from '../dto/api-error-response.dto';

type ApiStandardErrorOptions = {
  badRequest?: boolean;
  unauthorized?: boolean;
  forbidden?: boolean;
  notFound?: boolean;
};

export function ApiStandardErrorResponses(
  options: ApiStandardErrorOptions = {},
): ClassDecorator & MethodDecorator {
  const decorators = [];

  if (options.badRequest) {
    decorators.push(ApiBadRequestResponse({ type: ApiValidationErrorResponseDto }));
  }

  if (options.unauthorized) {
    decorators.push(ApiUnauthorizedResponse({ type: ApiErrorResponseDto }));
  }

  if (options.forbidden) {
    decorators.push(ApiForbiddenResponse({ type: ApiErrorResponseDto }));
  }

  if (options.notFound) {
    decorators.push(ApiNotFoundResponse({ type: ApiErrorResponseDto }));
  }

  return applyDecorators(...decorators);
}
