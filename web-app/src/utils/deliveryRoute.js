import { isValidCoordinate } from "./trackOrder";

const OSRM_BASE_URL = (
  import.meta.env.VITE_ROUTING_BASE_URL || "https://router.project-osrm.org"
).replace(/\/$/, "");

export async function fetchRouteGeometry(origin, destination) {
  if (
    !isValidCoordinate(origin?.latitude, origin?.longitude) ||
    !isValidCoordinate(destination?.latitude, destination?.longitude)
  ) {
    return null;
  }

  const url =
    `${OSRM_BASE_URL}/route/v1/driving/` +
    `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
    "?alternatives=false&steps=false&overview=full&geometries=geojson";

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const coordinates = payload?.routes?.[0]?.geometry?.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return null;
    }

    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates,
      },
    };
  } catch {
    return null;
  }
}
