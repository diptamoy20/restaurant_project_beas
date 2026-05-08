import { useCallback, useMemo, useState } from "react";

const LOCATION_CACHE_KEY = "foodyply:user-location";
const LOCATION_CACHE_TTL_MS = 30 * 60 * 1000;

function readCachedLocation() {
  try {
    const rawValue = window.localStorage.getItem(LOCATION_CACHE_KEY);

    if (!rawValue) {
      return null;
    }

    const cached = JSON.parse(rawValue);
    const isFresh = Date.now() - cached.savedAt < LOCATION_CACHE_TTL_MS;

    if (
      !isFresh ||
      !Number.isFinite(cached.lat) ||
      !Number.isFinite(cached.lng)
    ) {
      window.localStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

function cacheLocation(location) {
  window.localStorage.setItem(
    LOCATION_CACHE_KEY,
    JSON.stringify({
      ...location,
      savedAt: Date.now(),
    }),
  );
}

function normalizeCoordinates({ lat, lng, source }) {
  const nextLat = Number(lat);
  const nextLng = Number(lng);

  if (!Number.isFinite(nextLat) || nextLat < -90 || nextLat > 90) {
    throw new Error("Enter a valid latitude between -90 and 90.");
  }

  if (!Number.isFinite(nextLng) || nextLng < -180 || nextLng > 180) {
    throw new Error("Enter a valid longitude between -180 and 180.");
  }

  return {
    lat: Number(nextLat.toFixed(6)),
    lng: Number(nextLng.toFixed(6)),
    source,
  };
}

function isLocalDevelopmentOrigin() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

async function getGeolocationPermissionState() {
  try {
    if (!navigator.permissions?.query) {
      return null;
    }

    const permission = await navigator.permissions.query({
      name: "geolocation",
    });

    return permission.state;
  } catch {
    return null;
  }
}

function getPermissionDeniedMessage() {
  if (!window.isSecureContext && !isLocalDevelopmentOrigin()) {
    return "Browser location only works on HTTPS or localhost. Open the app on localhost/HTTPS, or choose your location manually.";
  }

  return "Location is blocked for this site. Enable location in your browser site settings, then retry, or choose your location manually.";
}

export function getCachedUserLocation() {
  return readCachedLocation();
}

export function useUserLocation() {
  const cachedLocation = useMemo(() => readCachedLocation(), []);
  const [location, setLocation] = useState(cachedLocation);
  const [status, setStatus] = useState(cachedLocation ? "ready" : "idle");
  const [error, setError] = useState(null);
  const [permissionModalOpen, setPermissionModalOpen] =
    useState(!cachedLocation);

  const persistLocation = useCallback((nextLocation) => {
    cacheLocation(nextLocation);
    setLocation(nextLocation);
    setStatus("ready");
    setError(null);
    setPermissionModalOpen(false);
  }, []);

  const requestGpsLocation = useCallback(async () => {
    setError(null);

    if (!navigator.geolocation) {
      setStatus("unsupported");
      setError("Location is not supported in this browser.");
      return;
    }

    if (!window.isSecureContext && !isLocalDevelopmentOrigin()) {
      setStatus("unsupported");
      setError(getPermissionDeniedMessage());
      return;
    }

    const permissionState = await getGeolocationPermissionState();

    if (permissionState === "denied") {
      setStatus("denied");
      setError(getPermissionDeniedMessage());
      return;
    }

    setStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        persistLocation(
          normalizeCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            source: "gps",
          }),
        );
      },
      (geoError) => {
        const denied = geoError.code === geoError.PERMISSION_DENIED;
        setStatus(denied ? "denied" : "error");
        setError(
          denied
            ? getPermissionDeniedMessage()
            : "We could not detect your location. Please retry or choose it manually.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }, [persistLocation]);

  const chooseManualLocation = useCallback(
    ({ lat, lng }) => {
      try {
        persistLocation(normalizeCoordinates({ lat, lng, source: "manual" }));
      } catch (validationError) {
        setStatus("error");
        setError(validationError.message);
      }
    },
    [persistLocation],
  );

  const retry = useCallback(() => {
    setPermissionModalOpen(true);
    setError(null);
  }, []);

  const clearLocation = useCallback(() => {
    window.localStorage.removeItem(LOCATION_CACHE_KEY);
    setLocation(null);
    setStatus("idle");
    setError(null);
    setPermissionModalOpen(true);
  }, []);

  return {
    location,
    status,
    error,
    permissionModalOpen,
    setPermissionModalOpen,
    requestGpsLocation,
    chooseManualLocation,
    retry,
    clearLocation,
  };
}
