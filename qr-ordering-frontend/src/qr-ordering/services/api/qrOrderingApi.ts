import { axiosInstance } from './axiosInstance';
import type { QRMenuResponse } from '../../types/menu.types';
import type { QRCreateOrderPayload, QRCreateOrderResponse } from '../../types/order.types';

function unwrapData<T>(response: { data: T | { data?: T } }): T {
  if (
    response.data &&
    typeof response.data === 'object' &&
    'data' in response.data &&
    response.data.data
  ) {
    return response.data.data;
  }

  return response.data as T;
}

export interface TableResolutionResponse {
  restaurantId: number;
  restaurantName: string;
  restaurantDescription?: string | null;
  tableId: number;
  tableNumber: string;
  sessionId: number;
  sessionToken: string;
}

export async function resolveTableToken(token: string): Promise<TableResolutionResponse> {
  const response = await axiosInstance.get<TableResolutionResponse | { data: TableResolutionResponse }>(
    `/table/${token}`,
  );

  return unwrapData<TableResolutionResponse>(response);
}

export async function getQRMenu(restaurantId: number, tableId: number): Promise<QRMenuResponse> {
  const response = await axiosInstance.get<QRMenuResponse | { data: QRMenuResponse }>(
    `/qr/menu/${restaurantId}/${tableId}`,
  );

  return unwrapData<QRMenuResponse>(response);
}

export async function placeQROrder(
  payload: QRCreateOrderPayload,
): Promise<QRCreateOrderResponse> {
  const response = await axiosInstance.post<QRCreateOrderResponse | { data: QRCreateOrderResponse }>(
    '/qr/order',
    payload,
  );

  return unwrapData<QRCreateOrderResponse>(response);
}
