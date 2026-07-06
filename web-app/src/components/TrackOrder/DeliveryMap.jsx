import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import riderMarkerUrl from "../../assets/delivery-rider-marker.png";
import { fetchRouteGeometry } from "../../utils/deliveryRoute";
import {
  resolveRestaurantLocation,
  shouldDrawDeliveryRoute,
  toCoordinates,
} from "../../utils/trackOrder";

const DEFAULT_CENTER = [88.3639, 22.5726];
const ANIMATION_MS = 900;
const ROUTE_SOURCE_ID = "delivery-route";
const ROUTE_LAYER_ID = "delivery-route-line";

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function easeOutCubic(progress) {
  return 1 - (1 - progress) ** 3;
}

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
  tracking,
  destination,
  orderStatus,
  focusSignal = 0,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const restaurantMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const animationRef = useRef(null);
  const markerPositionRef = useRef(null);
  const routeRequestRef = useRef(0);
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      riderMarkerRef.current?.remove();
      restaurantMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      riderMarkerRef.current = null;
      restaurantMarkerRef.current = null;
      destinationMarkerRef.current = null;
      markerPositionRef.current = null;
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

    const updateRoute = async () => {
      const requestId = routeRequestRef.current + 1;
      routeRequestRef.current = requestId;

      if (!showRoute) {
        if (map.getLayer(ROUTE_LAYER_ID)) {
          map.removeLayer(ROUTE_LAYER_ID);
        }
        if (map.getSource(ROUTE_SOURCE_ID)) {
          map.removeSource(ROUTE_SOURCE_ID);
        }
        return;
      }

      const routeFeature = await fetchRouteGeometry(restaurant, destination);

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

    if (map.isStyleLoaded()) {
      updateRoute();
    } else {
      map.once("load", updateRoute);
    }

    return () => {
      routeRequestRef.current += 1;
    };
  }, [
    destination?.latitude,
    destination?.longitude,
    restaurant?.latitude,
    restaurant?.longitude,
    showRoute,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const riderMarker = riderMarkerRef.current;

    if (!map || !riderMarker) {
      return;
    }

    const riderElement = riderMarker.getElement();
    const nextCoordinates = toCoordinates(markerLocation);

    if (!nextCoordinates) {
      riderMarker.remove();
      markerPositionRef.current = null;
      riderElement.style.transform = "";
      return;
    }

    const heading = Number(markerLocation?.heading);

    if (Number.isFinite(heading)) {
      riderElement.style.transform = `rotate(${heading}deg)`;
    } else {
      riderElement.style.transform = "";
    }

    const startCoordinates = markerPositionRef.current ?? nextCoordinates;

    if (!markerPositionRef.current) {
      riderMarker.setLngLat(nextCoordinates).addTo(map);
      markerPositionRef.current = nextCoordinates;
      return;
    }

    if (
      startCoordinates[0] === nextCoordinates[0] &&
      startCoordinates[1] === nextCoordinates[1]
    ) {
      return;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startedAt = performance.now();

    const animate = (timestamp) => {
      const progress = Math.min((timestamp - startedAt) / ANIMATION_MS, 1);
      const eased = easeOutCubic(progress);
      const longitude = lerp(startCoordinates[0], nextCoordinates[0], eased);
      const latitude = lerp(startCoordinates[1], nextCoordinates[1], eased);

      riderMarker.setLngLat([longitude, latitude]);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      markerPositionRef.current = nextCoordinates;
      animationRef.current = null;
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [markerLocation?.heading, markerLocation?.latitude, markerLocation?.longitude]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const focusCoordinates = [];

    if (showRoute) {
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
    } else {
      const riderCoordinates = toCoordinates(markerLocation);
      const restaurantCoordinates = toCoordinates(restaurant);

      if (riderCoordinates) {
        focusCoordinates.push(riderCoordinates);
      } else if (restaurantCoordinates) {
        focusCoordinates.push(restaurantCoordinates);
      }
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

  const showWaitingMessage =
    orderStatus === "ON_THE_WAY" && !markerLocation;

  return (
    <div className="track-map-shell">
      <div ref={containerRef} className="track-map-canvas" aria-label="Delivery map" />
      {showWaitingMessage ? (
        <div className="track-map-empty">
          <p>
            Waiting for the rider&apos;s live GPS signal. Restaurant, destination, and route are
            shown on the map.
          </p>
        </div>
      ) : null}
    </div>
  );
}
