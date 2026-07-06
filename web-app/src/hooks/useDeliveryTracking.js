import { useCallback, useEffect, useRef, useState } from "react";

import { deliveryTrackingApi } from "../services/deliveryTrackingApi";
import { deliveryTrackingSocket } from "../services/deliveryTrackingSocket";
import { mergeTrackingSocketUpdate } from "../utils/trackOrder";

export function useDeliveryTracking(orderId, open) {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socketState, setSocketState] = useState("idle");
  const trackingRef = useRef(null);

  const applyTracking = useCallback((nextTracking) => {
    trackingRef.current = nextTracking;
    setTracking(nextTracking);
  }, []);

  useEffect(() => {
    if (!open || !orderId) {
      return undefined;
    }

    let cancelled = false;
    let unsubscribe = () => {};

    const loadTracking = async () => {
      setLoading(true);
      setError(null);
      setSocketState("connecting");

      try {
        const snapshot = await deliveryTrackingApi.getTracking(orderId);

        if (!cancelled) {
          applyTracking(snapshot);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message ?? "Unable to load tracking.");
          setSocketState("error");
        }
        return;
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }

      if (cancelled) {
        return;
      }

      unsubscribe = deliveryTrackingSocket.subscribe(orderId, {
        onSnapshot: (snapshot) => {
          if (!cancelled) {
            applyTracking(snapshot);
            setError(null);
          }
        },
        onOrderUpdated: (payload) => {
          if (!cancelled) {
            setTracking((current) => {
              const merged = mergeTrackingSocketUpdate(
                current ?? trackingRef.current,
                payload,
              );
              trackingRef.current = merged;
              return merged;
            });
          }
        },
        onConnectionChange: (state) => {
          if (!cancelled) {
            setSocketState(state);
          }
        },
        onError: (message) => {
          if (!cancelled) {
            setError(message);
          }
        },
      });
    };

    loadTracking();

    return () => {
      cancelled = true;
      unsubscribe();
      setSocketState("idle");
    };
  }, [applyTracking, open, orderId]);

  return {
    tracking,
    loading,
    error,
    socketState,
    isReconnecting: socketState === "connecting" || socketState === "error",
    isSocketReady: socketState === "ready" || socketState === "connected",
  };
}
