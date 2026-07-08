export const tileSize = 256;

export function clampLatitude(latitude) {
  return Math.max(-85.05112878, Math.min(85.05112878, latitude));
}

export function latLngToPoint(latitude, longitude, zoom) {
  const scale = tileSize * 2 ** zoom;
  const sinLatitude = Math.sin((clampLatitude(latitude) * Math.PI) / 180);

  return {
    x: ((longitude + 180) / 360) * scale,
    y:
      (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) *
      scale,
  };
}

export function pointToLatLng(point, zoom) {
  const scale = tileSize * 2 ** zoom;
  const longitude = (point.x / scale) * 360 - 180;
  const latitude =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * point.y) / scale))) * 180) / Math.PI;

  return { latitude, longitude };
}
