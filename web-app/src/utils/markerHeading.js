/** Adjust if the rider image asset does not face north (0°) by default. */
export const MARKER_ICON_HEADING_OFFSET = 0;

const MIN_MOVEMENT_DEGREES = 1e-5;
const MIN_ROTATION_DELTA_DEGREES = 0.5;
const DEFAULT_ROTATION_DURATION_MS = 450;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

export function normalizeHeading(heading) {
  const value = Number(heading);

  if (!Number.isFinite(value)) {
    return null;
  }

  return ((value % 360) + 360) % 360;
}

export function shortestAngleDelta(fromHeading, toHeading) {
  const from = normalizeHeading(fromHeading);
  const to = normalizeHeading(toHeading);

  if (from == null || to == null) {
    return 0;
  }

  return ((to - from + 540) % 360) - 180;
}

function lerpAngle(fromHeading, toHeading, progress) {
  const from = normalizeHeading(fromHeading);
  const to = normalizeHeading(toHeading);

  if (from == null || to == null) {
    return to;
  }

  const delta = shortestAngleDelta(from, to);
  return normalizeHeading(from + delta * progress);
}

function easeOutCubic(progress) {
  return 1 - (1 - progress) ** 3;
}

function coordinatesEqual(left, right, epsilon = MIN_MOVEMENT_DEGREES) {
  if (!left || !right) {
    return false;
  }

  return (
    Math.abs(left[0] - right[0]) < epsilon &&
    Math.abs(left[1] - right[1]) < epsilon
  );
}

function movementDistanceDegrees(fromCoordinates, toCoordinates) {
  const latDiff = fromCoordinates[1] - toCoordinates[1];
  const lngDiff = fromCoordinates[0] - toCoordinates[0];
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
}

/**
 * Bearing in degrees clockwise from north for map marker rotation.
 * Coordinates are [longitude, latitude].
 */
export function calculateBearing(fromCoordinates, toCoordinates) {
  if (!fromCoordinates || !toCoordinates) {
    return null;
  }

  const [fromLng, fromLat] = fromCoordinates;
  const [toLng, toLat] = toCoordinates;

  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);
  const deltaLng = toRadians(toLng - fromLng);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  return normalizeHeading(toDegrees(Math.atan2(y, x)));
}

/**
 * Resolves the marker heading for a location update.
 * Prefers backend heading; otherwise derives bearing from consecutive GPS points.
 */
export function resolveMarkerHeading({
  previousCoordinates,
  nextCoordinates,
  backendHeading,
  lastHeading,
}) {
  const normalizedBackendHeading = normalizeHeading(backendHeading);

  if (normalizedBackendHeading != null) {
    return normalizedBackendHeading;
  }

  if (!previousCoordinates || !nextCoordinates) {
    return lastHeading ?? null;
  }

  if (coordinatesEqual(previousCoordinates, nextCoordinates)) {
    return lastHeading ?? null;
  }

  if (movementDistanceDegrees(previousCoordinates, nextCoordinates) < MIN_MOVEMENT_DEGREES) {
    return lastHeading ?? null;
  }

  return calculateBearing(previousCoordinates, nextCoordinates);
}

/**
 * MapLibre positions markers via transform on the root element.
 * Rotation must be applied to an inner element so it is not overwritten.
 */
export function createHeadingAnimator(element) {
  let animationFrameId = null;
  let currentHeading = null;

  const cancel = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const applyHeading = (heading) => {
    element.style.transform = `rotate(${heading}deg)`;
  };

  const setImmediate = (heading) => {
    cancel();

    const normalized = normalizeHeading(heading);

    if (normalized == null) {
      element.style.transform = "";
      currentHeading = null;
      return;
    }

    const visualHeading = normalizeHeading(normalized + MARKER_ICON_HEADING_OFFSET);
    currentHeading = visualHeading;
    applyHeading(visualHeading);
  };

  const animateTo = (targetHeading, options = {}) => {
    const normalizedTarget = normalizeHeading(targetHeading);

    if (normalizedTarget == null) {
      setImmediate(null);
      return 0;
    }

    const visualTarget = normalizeHeading(normalizedTarget + MARKER_ICON_HEADING_OFFSET);

    if (currentHeading == null) {
      setImmediate(normalizedTarget);
      return 0;
    }

    const delta = Math.abs(shortestAngleDelta(currentHeading, visualTarget));

    if (delta < MIN_ROTATION_DELTA_DEGREES) {
      currentHeading = visualTarget;
      applyHeading(visualTarget);
      return 0;
    }

    cancel();

    const durationMs = options.durationMs ?? DEFAULT_ROTATION_DURATION_MS;
    const startHeading = currentHeading;
    const startedAt = performance.now();

    const step = (timestamp) => {
      const progress = Math.min((timestamp - startedAt) / durationMs, 1);
      const eased = easeOutCubic(progress);
      const nextHeading = lerpAngle(startHeading, visualTarget, eased);

      if (nextHeading != null) {
        currentHeading = nextHeading;
        applyHeading(nextHeading);
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
        return;
      }

      currentHeading = visualTarget;
      animationFrameId = null;
    };

    animationFrameId = requestAnimationFrame(step);
    return durationMs;
  };

  return {
    animateTo,
    setImmediate,
    cancel,
    getHeading: () => currentHeading,
  };
}
