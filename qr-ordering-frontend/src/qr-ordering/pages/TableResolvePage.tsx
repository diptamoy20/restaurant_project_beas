import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { StateMessage } from '../components/common/StateMessage';
import { SplashScreen } from '../components/common/SplashScreen';
import { useCart } from '../hooks/useCart';
import { getApiErrorMessage } from '../services/api/axiosInstance';
import { resolveTableToken } from '../services/api/qrOrderingApi';

export function TableResolvePage() {
  const navigate = useNavigate();
  const { token } = useParams();
  const { setOrderContext } = useCart();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('This QR link is invalid. Please scan the table QR again.');
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      try {
        const data = await resolveTableToken(token);

        if (cancelled) {
          return;
        }

        setOrderContext({
          restaurant: {
            id: data.restaurantId,
            name: data.restaurantName,
            description: data.restaurantDescription ?? undefined,
            tableId: data.tableId,
            tableName: data.tableNumber,
          },
          restaurantId: data.restaurantId,
          tableId: data.tableId,
          tableLabel: data.tableNumber,
          sessionId: data.sessionId,
          sessionToken: data.sessionToken,
        });

        navigate(`/menu/${data.restaurantId}/${data.tableId}`, { replace: true });
      } catch (resolveError) {
        if (!cancelled) {
          setError(getApiErrorMessage(resolveError).message);
        }
      }
    };

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [navigate, setOrderContext, token]);

  if (error) {
    return (
      <StateMessage
        actionLabel="Reload"
        message={error}
        onAction={() => window.location.reload()}
        title="Unable to open table"
      />
    );
  }

  return <SplashScreen />;
}
