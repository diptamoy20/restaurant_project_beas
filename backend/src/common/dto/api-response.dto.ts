export type ApiSuccessResponse<TData = unknown> = {
  success: true;
  message: string;
  data: TData;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
};

export function isApiSuccessResponse<TData = unknown>(
  value: unknown,
): value is ApiSuccessResponse<TData> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const response = value as Partial<ApiSuccessResponse<TData>>;
  return response.success === true && typeof response.message === 'string' && 'data' in response;
}
