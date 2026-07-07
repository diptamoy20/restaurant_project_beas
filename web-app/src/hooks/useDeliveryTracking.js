import { useCallback, useEffect, useRef, useState } from "react";

import { deliveryTrackingApi } from "../services/deliveryTrackingApi";
import { deliveryTrackingSocket } from "../services/deliveryTrackingSocket";
import {
  isLiveDriverGpsLocation,
  mergeDriverLocation,
} from "../utils/driverLocation";
import {
  mergeTrackingSocketUpdate,
  resolveOrderStatus,
} from "../utils/trackOrder";

function mergeTrackingSnapshot(current, snapshot) {
  if (!snapshot) {
    return current;
  }

  if (!current) {
    return snapshot;
  }

  return {
    ...current,
    ...snapshot,
    order: snapshot.order
      ? {
          ...current.order,
          ...snapshot.order,
          itemsSummary: current.order?.itemsSummary ?? snapshot.order?.itemsSummary,
          items: current.order?.items ?? snapshot.order?.items,
        }
      : current.order,
    restaurant: snapshot.restaurant ?? current.restaurant,
    customer: snapshot.customer ?? current.customer,
    agent: snapshot.agent ?? current.agent,
    trackingHistory: snapshot.trackingHistory ?? current.trackingHistory,
    status: snapshot.status ?? current.status,
  };
}

function seedLiveGpsFromLocation(location, applyLiveDriverLocation) {
  if (!isLiveDriverGpsLocation(location)) {
    return;
  }

  applyLiveDriverLocation(location);
}

export function useDeliveryTracking(orderId, open) {
  const [tracking, setTracking] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [hasLiveDriverGps, setHasLiveDriverGps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socketState, setSocketState] = useState("idle");
  const trackingRef = useRef(null);
  const hasLiveDriverGpsRef = useRef(false);
  const unsubscribeRef = useRef(() => {});
  const trackingStoppedRef = useRef(false);

  const applyLiveDriverLocation = useCallback((incoming) => {
    if (!isLiveDriverGpsLocation(incoming)) {
      return;
    }

    hasLiveDriverGpsRef.current = true;
    setHasLiveDriverGps(true);
    setDriverLocation((current) => {
      const next = mergeDriverLocation(current, incoming);
      return next === current ? current : next;
    });
  }, []);

  const applyTracking = useCallback((nextTracking) => {
    trackingRef.current = nextTracking;
    setTracking(nextTracking);
  }, []);

  const applySocketLocation = useCallback(
    (incoming) => {
      applyLiveDriverLocation(incoming);
    },
    [applyLiveDriverLocation],
  );

  useEffect(() => {
    if (!open || !orderId) {
      return undefined;
    }

    let cancelled = false;
    hasLiveDriverGpsRef.current = false;
    trackingStoppedRef.current = false;
    setDriverLocation(null);
    setHasLiveDriverGps(false);

    const loadTracking = async () => {
      setLoading(true);
      setError(null);
      setSocketState("connecting");

      try {
        const snapshot = await deliveryTrackingApi.getTracking(orderId);

        if (!cancelled) {
          applyTracking(snapshot);
          seedLiveGpsFromLocation(snapshot?.latestLocation ?? null, applyLiveDriverLocation);
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

      const unsubscribe = deliveryTrackingSocket.subscribe(orderId, {
        onSnapshot: (snapshot) => {
          if (cancelled) {
            return;
          }

          setTracking((current) => {
            const merged = mergeTrackingSnapshot(current ?? trackingRef.current, snapshot);
            trackingRef.current = merged;
            return merged;
          });
          setError(null);
          applySocketLocation(snapshot?.latestLocation ?? null);
        },
        onOrderUpdated: (payload) => {
          if (cancelled) {
            return;
          }

          setTracking((current) => {
            const merged = mergeTrackingSocketUpdate(
              current ?? trackingRef.current,
              payload,
            );
            trackingRef.current = merged;
            return merged;
          });
          applySocketLocation(payload?.latestLocation ?? null);
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

      unsubscribeRef.current = unsubscribe;
    };

    loadTracking();

    return () => {
      cancelled = true;
      unsubscribeRef.current();
      unsubscribeRef.current = () => {};
      setSocketState("idle");
    };
  }, [applyLiveDriverLocation, applySocketLocation, applyTracking, open, orderId]);

  useEffect(() => {
    const orderStatus = resolveOrderStatus(tracking, null);

    if (!tracking || orderStatus !== "DELIVERED" || trackingStoppedRef.current) {
      return;
    }

    trackingStoppedRef.current = true;
    unsubscribeRef.current();
    unsubscribeRef.current = () => {};
    setSocketState("idle");
  }, [tracking, tracking?.order?.status, tracking?.status]);

  return {
    tracking,
    driverLocation,
    hasLiveDriverGps,
    loading,
    error,
    socketState,
    isReconnecting: socketState === "connecting" || socketState === "error",
    isSocketReady: socketState === "ready" || socketState === "connected",
  };
}
