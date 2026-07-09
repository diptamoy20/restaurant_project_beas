import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import riderMarkerUrl from "../../assets/delivery-rider-marker.png";
import { fetchRouteGeometry } from "../../utils/deliveryRoute";
import { createHeadingAnimator, normalizeHeading, resolveMarkerHeading } from "../../utils/markerHeading";
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
const AUTO_FOLLOW_RESUME_MS = 30_000;

function createPinElement(className, label) {
  const element = document.createElement("div");
  element.className = className;
  element.innerHTML = `<span>${label}</span>`;
  return element;
}

function createRiderMarkerElements() {
  const root = document.createElement("div");
  root.className = "track-map-rider-marker";

  const rotationLayer = document.createElement("div");
  rotationLayer.className = "track-map-rider-marker__rotate";

  const image = document.createElement("img");
  image.src = riderMarkerUrl;
  image.alt = "Delivery rider";
  image.draggable = false;
  rotationLayer.appendChild(image);
  root.appendChild(rotationLayer);

  return { root, rotationLayer };
}

function fitMapToPoints(map, coordinates, onProgrammaticMove) {
  if (!map || coordinates.length === 0) {
    return;
  }

  onProgrammaticMove?.();

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

function easeMapToRider(map, coordinates, onProgrammaticMove) {
  if (!map || !coordinates) {
    return;
  }

  onProgrammaticMove?.();
  map.easeTo({
    center: coordinates,
    zoom: Math.max(map.getZoom(), 14),
    duration: 800,
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
  const headingAnimatorRef = useRef(null);
  const lastHeadingRef = useRef(null);
  const restaurantMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const routeRequestRef = useRef(0);
  const routeDebounceRef = useRef(null);
  const followPausedRef = useRef(false);
  const resumeFollowTimerRef = useRef(null);
  const programmaticMoveRef = useRef(false);
  const programmaticMoveEndHandlerRef = useRef(null);
  const latestRiderCoordinatesRef = useRef(null);
  const lastFocusSignalRef = useRef(focusSignal);
  const hasInitialFitRef = useRef(false);
  const markProgrammaticMoveRef = useRef(() => {});
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
            tileSize: 500,
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

    const { root: riderRoot, rotationLayer } = createRiderMarkerElements();

    riderMarkerRef.current = new maplibregl.Marker({
      element: riderRoot,
      anchor: "center",
    });
    riderAnimatorRef.current = createMarkerAnimator(riderMarkerRef.current);
    headingAnimatorRef.current = createHeadingAnimator(rotationLayer);

    restaurantMarkerRef.current = new maplibregl.Marker({
      element: createPinElement("track-map-pin track-map-pin--restaurant", "R"),
      anchor: "bottom",
    });

    destinationMarkerRef.current = new maplibregl.Marker({
      element: createPinElement("track-map-pin track-map-pin--destination", "D"),
      anchor: "bottom",
    });

    const markProgrammaticMove = () => {
      programmaticMoveRef.current = true;

      if (programmaticMoveEndHandlerRef.current) {
        map.off("moveend", programmaticMoveEndHandlerRef.current);
      }

      const handleMoveEnd = () => {
        programmaticMoveRef.current = false;
        programmaticMoveEndHandlerRef.current = null;
      };

      programmaticMoveEndHandlerRef.current = handleMoveEnd;
      map.once("moveend", handleMoveEnd);
    };

    markProgrammaticMoveRef.current = markProgrammaticMove;

    const clearResumeFollowTimer = () => {
      if (resumeFollowTimerRef.current) {
        clearTimeout(resumeFollowTimerRef.current);
        resumeFollowTimerRef.current = null;
      }
    };

    const resumeAutoFollow = () => {
      followPausedRef.current = false;
      clearResumeFollowTimer();

      const riderCoordinates =
        latestRiderCoordinatesRef.current ??
        riderAnimatorRef.current?.getSettledPosition() ??
        riderAnimatorRef.current?.getCurrentPosition();

      if (!riderCoordinates) {
        return;
      }

      easeMapToRider(map, riderCoordinates, markProgrammaticMove);
    };

    const pauseAutoFollow = () => {
      if (programmaticMoveRef.current) {
        return;
      }

      followPausedRef.current = true;
      clearResumeFollowTimer();

      resumeFollowTimerRef.current = setTimeout(() => {
        resumeFollowTimerRef.current = null;
        resumeAutoFollow();
      }, AUTO_FOLLOW_RESUME_MS);
    };

    const handleUserMapInteraction = (event) => {
      // User gestures include originalEvent. Programmatic easeTo/fitBounds do not.
      if (event.type === "dragstart" || event.originalEvent) {
        pauseAutoFollow();
      }
    };

    const handleZoomControlClick = (event) => {
      if (
        event.target.closest(".maplibregl-ctrl-zoom-in, .maplibregl-ctrl-zoom-out")
      ) {
        pauseAutoFollow();
      }
    };

    map.on("dragstart", handleUserMapInteraction);
    map.on("zoomstart", handleUserMapInteraction);
    map.on("rotatestart", handleUserMapInteraction);
    map.on("pitchstart", handleUserMapInteraction);
    map.getContainer().addEventListener("click", handleZoomControlClick, true);

    mapRef.current = map;

    return () => {
      clearResumeFollowTimer();

      if (routeDebounceRef.current) {
        clearTimeout(routeDebounceRef.current);
      }

      map.off("dragstart", handleUserMapInteraction);
      map.off("zoomstart", handleUserMapInteraction);
      map.off("rotatestart", handleUserMapInteraction);
      map.off("pitchstart", handleUserMapInteraction);
      map.getContainer().removeEventListener("click", handleZoomControlClick, true);

      if (programmaticMoveEndHandlerRef.current) {
        map.off("moveend", programmaticMoveEndHandlerRef.current);
        programmaticMoveEndHandlerRef.current = null;
      }

      riderAnimatorRef.current?.cancel();
      headingAnimatorRef.current?.cancel();
      riderMarkerRef.current?.remove();
      restaurantMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      riderMarkerRef.current = null;
      riderAnimatorRef.current = null;
      headingAnimatorRef.current = null;
      lastHeadingRef.current = null;
      restaurantMarkerRef.current = null;
      destinationMarkerRef.current = null;
      followPausedRef.current = false;
      programmaticMoveRef.current = false;
      latestRiderCoordinatesRef.current = null;
      hasInitialFitRef.current = false;
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
    const headingAnimator = headingAnimatorRef.current;

    if (!map || !riderMarker || !riderAnimator || !headingAnimator) {
      return;
    }

    const nextCoordinates = toCoordinates(markerLocation);

    if (!nextCoordinates) {
      latestRiderCoordinatesRef.current = null;
      riderAnimator.setImmediate(null, map);
      headingAnimator.setImmediate(null);
      lastHeadingRef.current = null;
      return;
    }

    latestRiderCoordinatesRef.current = nextCoordinates;

    const previousCoordinates =
      riderAnimator.getCurrentPosition() ?? riderAnimator.getSettledPosition();
    const backendHeading = markerLocation?.heading;
    const hasBackendHeading = normalizeHeading(backendHeading) != null;
    const targetHeading = resolveMarkerHeading({
      previousCoordinates,
      nextCoordinates,
      backendHeading,
      lastHeading: lastHeadingRef.current,
    });

    const movementDurationMs = riderAnimator.animateTo(nextCoordinates, map, {
      onProgress: (currentCoordinates, startCoordinates) => {
        if (hasBackendHeading) {
          return;
        }

        const progressHeading = resolveMarkerHeading({
          previousCoordinates: startCoordinates,
          nextCoordinates: currentCoordinates,
          backendHeading: null,
          lastHeading: lastHeadingRef.current,
        });

        if (progressHeading != null) {
          headingAnimator.setImmediate(progressHeading);
          lastHeadingRef.current = progressHeading;
        }
      },
    });

    if (targetHeading != null) {
      lastHeadingRef.current = targetHeading;

      if (hasBackendHeading || movementDurationMs === 0) {
        headingAnimator.animateTo(targetHeading, {
          durationMs: movementDurationMs > 0 ? movementDurationMs : undefined,
        });
      }
    }
  }, [markerLocation?.heading, markerLocation?.latitude, markerLocation?.longitude]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const focusRequested = focusSignal !== lastFocusSignalRef.current;
    lastFocusSignalRef.current = focusSignal;

    if (focusRequested) {
      followPausedRef.current = false;

      if (resumeFollowTimerRef.current) {
        clearTimeout(resumeFollowTimerRef.current);
        resumeFollowTimerRef.current = null;
      }
    }

    if (followPausedRef.current && !focusRequested) {
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

    const applyCamera = () => {
      if (followPausedRef.current && !focusRequested) {
        return;
      }

      if (focusRequested || !hasInitialFitRef.current) {
        fitMapToPoints(map, focusCoordinates, markProgrammaticMoveRef.current);
        hasInitialFitRef.current = true;
        return;
      }

      if (riderCoordinates) {
        easeMapToRider(map, riderCoordinates, markProgrammaticMoveRef.current);
      }
    };

    if (map.isStyleLoaded()) {
      applyCamera();
    } else {
      map.once("load", applyCamera);
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
