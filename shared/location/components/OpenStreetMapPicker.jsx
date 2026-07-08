import { useEffect, useRef, useState } from 'react';
import { latLngToPoint, pointToLatLng, tileSize } from '../lib/mapMath.js';

export function OpenStreetMapPicker({ latitude, longitude, hasMarker, onPick }) {
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const [zoom, setZoom] = useState(18);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [center, setCenter] = useState({ latitude, longitude });

  useEffect(() => {
    setCenter({ latitude, longitude });
  }, [latitude, longitude]);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const centerPoint = latLngToPoint(center.latitude, center.longitude, zoom);
  const topLeft = {
    x: centerPoint.x - size.width / 2,
    y: centerPoint.y - size.height / 2,
  };
  const tileMinX = Math.floor(topLeft.x / tileSize);
  const tileMaxX = Math.floor((topLeft.x + size.width) / tileSize);
  const tileMinY = Math.floor(topLeft.y / tileSize);
  const tileMaxY = Math.floor((topLeft.y + size.height) / tileSize);
  const tileLimit = 2 ** zoom;
  const tiles = [];

  for (let x = tileMinX; x <= tileMaxX; x += 1) {
    for (let y = tileMinY; y <= tileMaxY; y += 1) {
      if (y < 0 || y >= tileLimit) {
        continue;
      }

      const wrappedX = ((x % tileLimit) + tileLimit) % tileLimit;
      tiles.push({
        key: `${zoom}-${x}-${y}`,
        src: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
        left: x * tileSize - topLeft.x,
        top: y * tileSize - topLeft.y,
      });
    }
  }

  const markerPoint = latLngToPoint(latitude, longitude, zoom);

  const pickFromEvent = (event) => {
    const bounds = containerRef.current.getBoundingClientRect();
    const point = {
      x: topLeft.x + event.clientX - bounds.left,
      y: topLeft.y + event.clientY - bounds.top,
    };
    const nextLocation = pointToLatLng(point, zoom);
    onPick(nextLocation.latitude, nextLocation.longitude);
  };

  const handlePointerDown = (event) => {
    if (event.target.closest('.osm-map-control')) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCenterPoint: centerPoint,
      moved: false,
    };
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      drag.moved = true;
    }

    const nextCenter = pointToLatLng(
      {
        x: drag.startCenterPoint.x - dx,
        y: drag.startCenterPoint.y - dy,
      },
      zoom,
    );
    setCenter(nextCenter);
  };

  const handlePointerUp = (event) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;

    if (!drag.moved) {
      pickFromEvent(event);
    }
  };

  const changeZoom = (nextZoom) => {
    setZoom(Math.max(3, Math.min(19, nextZoom)));
  };

  return (
    <div
      ref={containerRef}
      className="osm-map-canvas"
      role="application"
      aria-label="OpenStreetMap location picker"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {tiles.map((tile) => (
        <img
          key={tile.key}
          className="osm-map-tile"
          src={tile.src}
          alt=""
          draggable="false"
          style={{
            left: `${tile.left}px`,
            top: `${tile.top}px`,
          }}
        />
      ))}
      {hasMarker ? (
        <div
          className="osm-map-marker"
          style={{
            left: `${markerPoint.x - topLeft.x}px`,
            top: `${markerPoint.y - topLeft.y}px`,
          }}
        />
      ) : null}
      <div className="osm-map-controls">
        <button
          type="button"
          className="osm-map-control"
          aria-label="Zoom in"
          onClick={() => changeZoom(zoom + 1)}
        >
          +
        </button>
        <button
          type="button"
          className="osm-map-control"
          aria-label="Zoom out"
          onClick={() => changeZoom(zoom - 1)}
        >
          -
        </button>
      </div>
    </div>
  );
}
