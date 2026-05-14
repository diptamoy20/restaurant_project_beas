import { useEffect, useRef, useState } from 'react';
import { loadGoogleMapsPlaces, readPlaceAddress } from '../../lib/googleMaps';

const emptyForm = {
  label: 'Home',
  address: '',
  city: '',
  state: '',
  latitude: '',
  longitude: '',
  isDefault: false,
};

const addressTypes = ['Home', 'Work', 'Other'];
const defaultMapCenter = { latitude: 12.9716, longitude: 77.5946 };

function getCoordinateOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function AddressForm({
  initialAddress,
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = 'Save address',
}) {
  const autocompleteInputRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [mapsMessage, setMapsMessage] = useState('');
  const [mapsReady, setMapsReady] = useState(false);
  const [mapProvider, setMapProvider] = useState('google');
  const [searchText, setSearchText] = useState('');
  const [osmResults, setOsmResults] = useState([]);
  const [osmSearching, setOsmSearching] = useState(false);

  useEffect(() => {
    setForm({
      label: initialAddress?.label ?? 'Home',
      address: initialAddress?.address ?? '',
      city: initialAddress?.city ?? '',
      state: initialAddress?.state ?? '',
      latitude: initialAddress?.latitude ?? '',
      longitude: initialAddress?.longitude ?? '',
      isDefault: initialAddress?.isDefault ?? false,
    });
  }, [initialAddress]);

  useEffect(() => {
    let autocomplete;
    let active = true;
    const fallbackCenter = { lat: 12.9716, lng: 77.5946 };

    loadGoogleMapsPlaces()
      .then((google) => {
        if (!active || !autocompleteInputRef.current || !mapContainerRef.current) {
          return;
        }

        const initialLat = Number(initialAddress?.latitude);
        const initialLng = Number(initialAddress?.longitude);
        const center =
          Number.isFinite(initialLat) && Number.isFinite(initialLng)
            ? { lat: initialLat, lng: initialLng }
            : fallbackCenter;

        geocoderRef.current = new google.maps.Geocoder();
        setMapProvider('google');
        mapRef.current = new google.maps.Map(mapContainerRef.current, {
          center,
          zoom: Number.isFinite(initialLat) && Number.isFinite(initialLng) ? 16 : 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        markerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position:
            Number.isFinite(initialLat) && Number.isFinite(initialLng) ? center : undefined,
          draggable: true,
          visible: Number.isFinite(initialLat) && Number.isFinite(initialLng),
        });
        setMapsReady(true);

        mapRef.current.addListener('click', (event) => {
          if (event.latLng) {
            applyMapLocation(google, event.latLng, 'Map location selected');
          }
        });

        markerRef.current.addListener('dragend', (event) => {
          if (event.latLng) {
            applyMapLocation(google, event.latLng, 'Map location selected');
          }
        });

        if (!initialAddress?.latitude || !initialAddress?.longitude) {
          requestCurrentLocation(google);
        }

        autocomplete = new google.maps.places.Autocomplete(autocompleteInputRef.current, {
          fields: ['address_components', 'formatted_address', 'geometry', 'name'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const nextAddress = readPlaceAddress(place);

          if (!nextAddress.address || nextAddress.latitude === '' || nextAddress.longitude === '') {
            setMapsMessage('Choose a complete address from the Google Maps suggestions.');
            return;
          }

          const location = place.geometry.location;
          markerRef.current.setPosition(location);
          markerRef.current.setVisible(true);
          mapRef.current.panTo(location);
          mapRef.current.setZoom(16);
          setMapsMessage('Map address selected');
          setForm((current) => ({
            ...current,
            ...nextAddress,
          }));
        });
      })
      .catch(() => {
        if (active) {
          setMapProvider('osm');
          setMapsReady(true);
          setMapsMessage('Testing map enabled with OpenStreetMap. Use Google Maps for production.');

          if (!initialAddress?.latitude || !initialAddress?.longitude) {
            requestCurrentLocation();
          }
        }
      });

    return () => {
      active = false;
      autocomplete = null;
    };
  }, [initialAddress]);

  const applyMapLocation = (google, location, message, zoom = 16) => {
    markerRef.current?.setPosition(location);
    markerRef.current?.setVisible(true);
    mapRef.current?.panTo(location);
    mapRef.current?.setZoom(zoom);

    const nextCoordinates = {
      latitude: location.lat(),
      longitude: location.lng(),
    };

    geocoderRef.current?.geocode({ location }, (results, status) => {
      if (status !== google.maps.GeocoderStatus.OK || !results?.[0]) {
        setMapsMessage(message);
        setForm((current) => ({
          ...current,
          ...nextCoordinates,
        }));
        return;
      }

      const nextAddress = readPlaceAddress(results[0]);
      setMapsMessage(message);
      setForm((current) => ({
        ...current,
        address: nextAddress.address || current.address,
        city: nextAddress.city || current.city,
        state: nextAddress.state || current.state,
        ...nextCoordinates,
      }));
    });
  };

  const requestCurrentLocation = (google) => {
    if (!navigator.geolocation) {
      setMapsMessage('Current location is unavailable in this browser.');
      return;
    }

    setMapsMessage('Finding your current location...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        if (google) {
          const location = new google.maps.LatLng(latitude, longitude);
          applyMapLocation(google, location, 'Current location selected', 18);
          return;
        }

        await applyOpenStreetMapCoordinates(latitude, longitude, 'Current location selected');
      },
      () => {
        setMapsMessage('Allow location access or search your address manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  const applyOpenStreetMapCoordinates = async (latitude, longitude, message) => {
    setForm((current) => ({
      ...current,
      latitude,
      longitude,
    }));

    try {
      const params = new URLSearchParams({
        lat: String(latitude),
        lon: String(longitude),
        format: 'jsonv2',
        addressdetails: '1',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
      const result = await response.json();
      const city =
        result.address?.city ||
        result.address?.town ||
        result.address?.village ||
        result.address?.county ||
        '';
      const state = result.address?.state || '';

      setForm((current) => ({
        ...current,
        address: result.display_name || current.address,
        city: city || current.city,
        state: state || current.state,
        latitude,
        longitude,
      }));
      setMapsMessage(message);
    } catch {
      setMapsMessage(message);
    }
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const searchOpenStreetMap = async () => {
    const query = searchText.trim();

    if (!query) {
      setFormError('Enter an address to search.');
      return;
    }

    setFormError('');
    setOsmSearching(true);
    setOsmResults([]);

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '5',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      const results = await response.json();
      setOsmResults(Array.isArray(results) ? results : []);

      if (!Array.isArray(results) || results.length === 0) {
        setMapsMessage('No address found. Try a more specific search.');
      }
    } catch {
      setMapsMessage('OpenStreetMap search is unavailable right now.');
    } finally {
      setOsmSearching(false);
    }
  };

  const selectOpenStreetMapResult = (result) => {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    const city =
      result.address?.city ||
      result.address?.town ||
      result.address?.village ||
      result.address?.county ||
      '';
    const state = result.address?.state || '';

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setFormError('Selected map result is missing coordinates.');
      return;
    }

    setForm((current) => ({
      ...current,
      address: result.display_name || current.address,
      city,
      state,
      latitude,
      longitude,
    }));
    setOsmResults([]);
    setMapsMessage('Testing map address selected');
  };

  const hasSelectedCoordinates =
    Number.isFinite(Number(form.latitude)) && Number.isFinite(Number(form.longitude));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (!form.address.trim()) {
      setFormError('Address is required.');
      return;
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setFormError('Select an address from Google Maps before saving.');
      return;
    }

    await onSubmit({
      label: form.label,
      address: form.address.trim(),
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      latitude,
      longitude,
      isDefault: form.isDefault,
    });
  };

  return (
    <form className="address-form" onSubmit={handleSubmit}>
      <div className="address-form-grid">
        <div className="address-type-field">
          <span>Address type</span>
          <div className="address-type-segment" role="radiogroup" aria-label="Address type">
            {addressTypes.map((type) => (
              <button
                key={type}
                type="button"
                className={form.label === type ? 'address-type-option active' : 'address-type-option'}
                role="radio"
                aria-checked={form.label === type}
                onClick={() => updateField('label', type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <label className="address-form-wide">
          <span>Search address</span>
          <div className="address-map-search-row">
            <input
              ref={autocompleteInputRef}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={
                mapProvider === 'osm'
                  ? 'Search address with free test map'
                  : 'Search and select from Google Maps'
              }
            />
            {mapProvider === 'osm' ? (
              <button type="button" className="ghost-button" onClick={searchOpenStreetMap}>
                {osmSearching ? 'Searching...' : 'Search'}
              </button>
            ) : null}
          </div>
        </label>

        {mapProvider === 'osm' && osmResults.length > 0 ? (
          <div className="address-osm-results address-form-wide">
            {osmResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                className="address-osm-result"
                onClick={() => selectOpenStreetMapResult(result)}
              >
                {result.display_name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="address-map-picker address-form-wide">
          {mapProvider === 'osm' ? (
            <OpenStreetMapPicker
              latitude={getCoordinateOrDefault(form.latitude, defaultMapCenter.latitude)}
              longitude={getCoordinateOrDefault(form.longitude, defaultMapCenter.longitude)}
              hasMarker={hasSelectedCoordinates}
              onPick={(latitude, longitude) =>
                applyOpenStreetMapCoordinates(latitude, longitude, 'Map location selected')
              }
            />
          ) : (
            <div ref={mapContainerRef} className="address-map-canvas" />
          )}
          {!mapsReady ? (
            <div className="address-map-empty">
              Google Maps will appear here when it is configured.
            </div>
          ) : null}
          {mapProvider === 'osm' ? (
            <div className="address-map-tip">Tap the map to pick address</div>
          ) : null}
          <button
            type="button"
            className="address-current-location-button"
            aria-label="Use current location"
            title="Use current location"
            onClick={() => requestCurrentLocation(window.google?.maps ? window.google : undefined)}
          >
            <CurrentLocationIcon />
          </button>
        </div>

        <label className="address-form-wide">
          <span>Selected address</span>
          <textarea
            value={form.address}
            onChange={(event) => updateField('address', event.target.value)}
            placeholder="Select an address from the map"
            rows={3}
          />
        </label>

        <label>
          <span>City</span>
          <input value={form.city} onChange={(event) => updateField('city', event.target.value)} />
        </label>

        <label>
          <span>State</span>
          <input
            value={form.state}
            onChange={(event) => updateField('state', event.target.value)}
          />
        </label>

        <input type="hidden" value={form.latitude} readOnly />
        <input type="hidden" value={form.longitude} readOnly />
      </div>

      <label className="address-default-toggle">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(event) => updateField('isDefault', event.target.checked)}
        />
        <span>Make this my default address</span>
      </label>

      {mapsMessage ? <p className="form-hint">{mapsMessage}</p> : null}
      {formError ? <p className="form-error">{formError}</p> : null}

      <div className="address-form-actions">
        {onCancel ? (
          <button type="button" className="ghost-button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function CurrentLocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 2c.5 0 .9.4.9.9v1.2a8 8 0 0 1 7 7h1.2a.9.9 0 1 1 0 1.8h-1.2a8 8 0 0 1-7 7v1.2a.9.9 0 1 1-1.8 0v-1.2a8 8 0 0 1-7-7H2.9a.9.9 0 1 1 0-1.8h1.2a8 8 0 0 1 7-7V2.9c0-.5.4-.9.9-.9Zm0 3.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm0 3.1a3.1 3.1 0 1 1 0 6.2 3.1 3.1 0 0 1 0-6.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

const tileSize = 256;

function clampLatitude(latitude) {
  return Math.max(-85.05112878, Math.min(85.05112878, latitude));
}

function latLngToPoint(latitude, longitude, zoom) {
  const scale = tileSize * 2 ** zoom;
  const sinLatitude = Math.sin((clampLatitude(latitude) * Math.PI) / 180);

  return {
    x: ((longitude + 180) / 360) * scale,
    y:
      (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) *
      scale,
  };
}

function pointToLatLng(point, zoom) {
  const scale = tileSize * 2 ** zoom;
  const longitude = (point.x / scale) * 360 - 180;
  const latitude =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * point.y) / scale))) * 180) / Math.PI;

  return { latitude, longitude };
}

function OpenStreetMapPicker({ latitude, longitude, hasMarker, onPick }) {
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
      aria-label="OpenStreetMap address picker"
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
