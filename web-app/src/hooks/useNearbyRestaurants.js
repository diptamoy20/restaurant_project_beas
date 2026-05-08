import { useCallback, useEffect, useRef, useState } from "react";
import { getNearbyRestaurants } from "../services/locationApi";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function useNearbyRestaurants(location, options = {}) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(Boolean(location));
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  const fetchRestaurants = useCallback(
    async (signal) => {
      if (!location) {
        setRestaurants([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getNearbyRestaurants({
          lat: location.lat,
          lng: location.lng,
          radiusKm: options.radiusKm ?? 12,
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          signal,
        });

        setRestaurants(Array.isArray(response) ? response : []);
      } catch (requestError) {
        if (requestError.name === "AbortError") {
          return;
        }

        setError(
          requestError.message || "Nearby restaurants could not be loaded.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [location, options.limit, options.page, options.radiusKm],
  );

  useEffect(() => {
    const controller = new AbortController();

    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      fetchRestaurants(controller.signal);
    }, 300);

    const refreshId = window.setInterval(() => {
      fetchRestaurants(controller.signal);
    }, REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearTimeout(debounceRef.current);
      window.clearInterval(refreshId);
    };
  }, [fetchRestaurants]);

  return {
    restaurants,
    loading,
    error,
    refresh: () => fetchRestaurants(new AbortController().signal),
  };
}
