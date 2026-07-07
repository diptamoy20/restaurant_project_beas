import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import riderMarkerUrl from "../../assets/delivery-rider-marker.png";
import { fetchRouteGeometry } from "../../utils/deliveryRoute";
import { createMarkerAnimator } from "../../utils/mapMarkerAnimation";
import {
  resolveRestaurantLocation,
  shouldDrawDeliveryRoute,
  toCoordinates,
} from "../../utils/trackOrder";

const DEFAULT_CENTER = [88.3639, 22.5726];
const ROUTE_SOURCE_ID = "delivery-route";
const ROUTE_LAYER_ID = "delivery-route-line";
const ROUTE_DEBOUNCE_MS = 600;

function createPinElement(className, label) {
  const element = document.createElement("div");
  element.className = className;
  element.innerHTML = `<span>${label}</span>`;
  return element;
}

function createRiderElement() {
  const element = document.createElement("div");
  element.className = "track-map-rider-marker";
  const image = document.createElement("img");
  image.src = riderMarkerUrl;
  image.alt = "Delivery rider";
  image.draggable = false;
  element.appendChild(image);
  return element;
}

function fitMapToPoints(map, coordinates) {
  if (!map || coordinates.length === 0) {
    return;
  }

  if (coordinates.length === 1) {
    map.easeTo({
      center: coordinates[0],
      zoom: Math.max(map.getZoom(), 14),
      duration: 600,
    });
    return;
  }

  const bounds = coordinates.reduce(
    (nextBounds, coordinate) => nextBounds.extend(coordinate),
    new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
  );

  map.fitBounds(bounds, {
    padding: { top: 72, right: 72, bottom: 72, left: 72 },
    duration: 700,
    maxZoom: 15,
  });
}

export function DeliveryMap({
  markerLocation,
  routeOrigin,
  tracking,
  destination,
  orderStatus,
  focusSignal = 0,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const riderAnimatorRef = useRef(null);
  const restaurantMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const routeRequestRef = useRef(0);
  const routeDebounceRef = useRef(null);
  const restaurant = resolveRestaurantLocation(tracking);
  const showRoute = shouldDrawDeliveryRoute(orderStatus);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return undefined;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: DEFAULT_CENTER,
      zoom: 12,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    riderMarkerRef.current = new maplibregl.Marker({
      element: createRiderElement(),
      anchor: "center",
    });
    riderAnimatorRef.current = createMarkerAnimator(riderMarkerRef.current);

    restaurantMarkerRef.current = new maplibregl.Marker({
      element: createPinElement("track-map-pin track-map-pin--restaurant", "R"),
      anchor: "bottom",
    });

    destinationMarkerRef.current = new maplibregl.Marker({
      element: createPinElement("track-map-pin track-map-pin--destination", "D"),
      anchor: "bottom",
    });

    mapRef.current = map;

    return () => {
      if (routeDebounceRef.current) {
        clearTimeout(routeDebounceRef.current);
      }

      riderAnimatorRef.current?.cancel();
      riderMarkerRef.current?.remove();
      restaurantMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      riderMarkerRef.current = null;
      riderAnimatorRef.current = null;
      restaurantMarkerRef.current = null;
      destinationMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const restaurantMarker = restaurantMarkerRef.current;
    const destinationMarker = destinationMarkerRef.current;

    if (!map || !restaurantMarker || !destinationMarker) {
      return;
    }

    const restaurantCoordinates = toCoordinates(restaurant);
    const destinationCoordinates = toCoordinates(destination);

    if (restaurantCoordinates) {
      restaurantMarker.setLngLat(restaurantCoordinates).addTo(map);
    } else {
      restaurantMarker.remove();
    }

    if (destinationCoordinates) {
      destinationMarker.setLngLat(destinationCoordinates).addTo(map);
    } else {
      destinationMarker.remove();
    }
  }, [
    destination?.latitude,
    destination?.longitude,
    restaurant?.latitude,
    restaurant?.longitude,
  ]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return undefined;
    }

    const clearRoute = () => {
      if (map.getLayer(ROUTE_LAYER_ID)) {
        map.removeLayer(ROUTE_LAYER_ID);
      }
      if (map.getSource(ROUTE_SOURCE_ID)) {
        map.removeSource(ROUTE_SOURCE_ID);
      }
    };

    const updateRoute = async () => {
      const requestId = routeRequestRef.current + 1;
      routeRequestRef.current = requestId;

      if (!showRoute || !routeOrigin) {
        clearRoute();
        return;
      }

      const routeFeature = await fetchRouteGeometry(routeOrigin, destination);

      if (requestId !== routeRequestRef.current || !mapRef.current) {
        return;
      }

      if (!routeFeature) {
        return;
      }

      const existingSource = map.getSource(ROUTE_SOURCE_ID);

      if (existingSource) {
        existingSource.setData(routeFeature);
      } else {
        map.addSource(ROUTE_SOURCE_ID, {
          type: "geojson",
          data: routeFeature,
        });

        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: "line",
          source: ROUTE_SOURCE_ID,
          paint: {
            "line-color": "#1a472a",
            "line-width": 5,
            "line-opacity": 0.82,
          },
        });
      }
    };

    if (routeDebounceRef.current) {
      clearTimeout(routeDebounceRef.current);
    }

    routeDebounceRef.current = setTimeout(() => {
      if (map.isStyleLoaded()) {
        updateRoute();
      } else {
        map.once("load", updateRoute);
      }
    }, ROUTE_DEBOUNCE_MS);

    return () => {
      routeRequestRef.current += 1;

      if (routeDebounceRef.current) {
        clearTimeout(routeDebounceRef.current);
        routeDebounceRef.current = null;
      }
    };
  }, [
    destination?.latitude,
    destination?.longitude,
    routeOrigin?.latitude,
    routeOrigin?.longitude,
    showRoute,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const riderMarker = riderMarkerRef.current;
    const riderAnimator = riderAnimatorRef.current;

    if (!map || !riderMarker || !riderAnimator) {
      return;
    }

    const riderElement = riderMarker.getElement();
    const nextCoordinates = toCoordinates(markerLocation);

    if (!nextCoordinates) {
      riderAnimator.setImmediate(null, map);
      riderElement.style.transform = "";
      return;
    }

    const heading = Number(markerLocation?.heading);

    if (Number.isFinite(heading)) {
      riderElement.style.transform = `rotate(${heading}deg)`;
    } else {
      riderElement.style.transform = "";
    }

    riderAnimator.animateTo(nextCoordinates, map);
  }, [markerLocation?.heading, markerLocation?.latitude, markerLocation?.longitude]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const focusCoordinates = [];
    const restaurantCoordinates = toCoordinates(restaurant);
    const destinationCoordinates = toCoordinates(destination);
    const riderCoordinates = toCoordinates(markerLocation);

    if (restaurantCoordinates) {
      focusCoordinates.push(restaurantCoordinates);
    }

    if (destinationCoordinates) {
      focusCoordinates.push(destinationCoordinates);
    }

    if (riderCoordinates) {
      focusCoordinates.push(riderCoordinates);
    }

    if (focusCoordinates.length === 0) {
      return;
    }

    if (map.isStyleLoaded()) {
      fitMapToPoints(map, focusCoordinates);
    } else {
      map.once("load", () => fitMapToPoints(map, focusCoordinates));
    }
  }, [
    focusSignal,
    markerLocation?.latitude,
    markerLocation?.longitude,
    restaurant?.latitude,
    restaurant?.longitude,
    destination?.latitude,
    destination?.longitude,
    orderStatus,
    showRoute,
  ]);

  return (
    <div className="track-map-shell">
      <div ref={containerRef} className="track-map-canvas" aria-label="Delivery map" />
    </div>
  );
}
