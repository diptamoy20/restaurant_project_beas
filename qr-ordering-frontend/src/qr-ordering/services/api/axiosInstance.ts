import axios, { AxiosError } from 'axios';

import type { ApiErrorShape } from '../../types/api.types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(
  /\/$/,
  '',
);

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getApiErrorMessage(error: unknown): ApiErrorShape {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string | string[] }>;
    const responseMessage = axiosError.response?.data?.message;
    const message = Array.isArray(responseMessage)
      ? responseMessage.join(', ')
      : responseMessage || axiosError.message || 'Something went wrong';

    return {
      message,
      status: axiosError.response?.status,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Something went wrong' };
}
