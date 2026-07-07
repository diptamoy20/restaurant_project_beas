const MIN_DURATION_MS = 450;
const MAX_DURATION_MS = 1400;
const DEFAULT_DURATION_MS = 900;

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function easeOutCubic(progress) {
  return 1 - (1 - progress) ** 3;
}

function toLngLatArray(lngLat) {
  return [lngLat.lng, lngLat.lat];
}

function coordinatesEqual(left, right, epsilon = 1e-6) {
  return (
    Math.abs(left[0] - right[0]) < epsilon &&
    Math.abs(left[1] - right[1]) < epsilon
  );
}

function durationForDistance(start, end) {
  const latDiff = start[1] - end[1];
  const lngDiff = start[0] - end[0];
  const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

  if (distance < 1e-6) {
    return MIN_DURATION_MS;
  }

  const scaled = distance * 180_000;
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, scaled));
}

/**
 * Smoothly animates a MapLibre marker between coordinates.
 * Reuses the marker instance and cancels any in-flight animation.
 */
export function createMarkerAnimator(marker) {
  let animationFrameId = null;
  let settledPosition = null;

  const cancel = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const setImmediate = (coordinates, map) => {
    cancel();

    if (!coordinates) {
      marker.remove();
      settledPosition = null;
      return;
    }

    marker.setLngLat(coordinates).addTo(map);
    settledPosition = coordinates;
  };

  const animateTo = (targetCoordinates, map) => {
    if (!targetCoordinates) {
      cancel();
      marker.remove();
      settledPosition = null;
      return;
    }

    if (!settledPosition) {
      setImmediate(targetCoordinates, map);
      return;
    }

    const startCoordinates = marker.getElement().isConnected
      ? toLngLatArray(marker.getLngLat())
      : settledPosition;

    if (coordinatesEqual(startCoordinates, targetCoordinates)) {
      cancel();
      settledPosition = targetCoordinates;
      marker.setLngLat(targetCoordinates);
      return;
    }

    cancel();

    const durationMs = durationForDistance(startCoordinates, targetCoordinates);
    const startedAt = performance.now();

    const step = (timestamp) => {
      const progress = Math.min((timestamp - startedAt) / durationMs, 1);
      const eased = easeOutCubic(progress);
      const longitude = lerp(startCoordinates[0], targetCoordinates[0], eased);
      const latitude = lerp(startCoordinates[1], targetCoordinates[1], eased);

      marker.setLngLat([longitude, latitude]);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
        return;
      }

      settledPosition = targetCoordinates;
      animationFrameId = null;
    };

    animationFrameId = requestAnimationFrame(step);
  };

  return {
    animateTo,
    cancel,
    setImmediate,
  };
}
