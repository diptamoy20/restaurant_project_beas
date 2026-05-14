import { useEffect, useState } from 'react';

import { getApiErrorMessage } from '../services/api/axiosInstance';
import { getQRMenu } from '../services/api/qrOrderingApi';
import type { QRMenuResponse } from '../types/menu.types';

interface UseMenuState {
  data: QRMenuResponse | null;
  isLoading: boolean;
  error: string;
}

export function useMenu(restaurantId: number | null, tableId: number | null): UseMenuState {
  const [state, setState] = useState<UseMenuState>({
    data: null,
    isLoading: true,
    error: '',
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchMenu() {
      if (!restaurantId || !tableId) {
        setState({
          data: null,
          isLoading: false,
          error: 'This QR link is invalid. Please scan the table QR again.',
        });
        return;
      }

      setState((current) => ({ ...current, isLoading: true, error: '' }));

      try {
        const data = await getQRMenu(restaurantId, tableId);
        if (isMounted) {
          setState({ data, isLoading: false, error: '' });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            data: null,
            isLoading: false,
            error: getApiErrorMessage(error).message,
          });
        }
      }
    }

    void fetchMenu();

    return () => {
      isMounted = false;
    };
  }, [restaurantId, tableId]);

  return state;
}
