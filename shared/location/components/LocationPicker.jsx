import { useEffect, useRef, useState } from 'react';
import { loadGoogleMapsPlaces, readPlaceAddress } from '../lib/googleMaps.js';
import { reverseGeocode, searchLocations } from '../lib/nominatim.js';
import { CurrentLocationIcon } from './CurrentLocationIcon.jsx';
import { OpenStreetMapPicker } from './OpenStreetMapPicker.jsx';

const defaultMapCenter = { latitude: 12.9716, longitude: 77.5946 };

function getCoordinateOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function hasValidCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

const emptyLocation = {
  address: '',
  city: '',
  state: '',
  latitude: '',
  longitude: '',
};

export function LocationPicker({
  value = emptyLocation,
  onChange,
  showAddressField = true,
  showCityField = true,
  showStateField = true,
  showCoordinates = false,
  addressLabel = 'Selected address',
  searchPlaceholder,
  requestCurrentLocationOnMount = true,
  className = '',
  error = '',
}) {
  const autocompleteInputRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const [mapsMessage, setMapsMessage] = useState('');
  const [mapsReady, setMapsReady] = useState(false);
  const [mapProvider, setMapProvider] = useState('google');
  const [searchText, setSearchText] = useState('');
  const [osmResults, setOsmResults] = useState([]);
  const [osmSearching, setOsmSearching] = useState(false);

  const hasSelectedCoordinates = hasValidCoordinates(value.latitude, value.longitude);

  const emitChange = (patch) => {
    onChange?.({
      ...emptyLocation,
      ...value,
      ...patch,
    });
  };

  useEffect(() => {
    if (mapProvider !== 'google' || !mapsReady || !markerRef.current) {
      return;
    }

    const lat = Number(value.latitude);
    const lng = Number(value.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const position = { lat, lng };
    markerRef.current.setPosition(position);
    markerRef.current.setVisible(true);
    mapRef.current?.panTo(position);
  }, [value.latitude, value.longitude, mapProvider, mapsReady]);

  useEffect(() => {
    let autocomplete;
    let active = true;
    const fallbackCenter = { lat: defaultMapCenter.latitude, lng: defaultMapCenter.longitude };
    const initialLat = Number(value.latitude);
    const initialLng = Number(value.longitude);

    loadGoogleMapsPlaces()
      .then((google) => {
        if (!active || !autocompleteInputRef.current || !mapContainerRef.current) {
          return;
        }

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

        if (
          requestCurrentLocationOnMount &&
          !hasValidCoordinates(value.latitude, value.longitude)
        ) {
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
          emitChange(nextAddress);
        });
      })
      .catch(() => {
        if (active) {
          setMapProvider('osm');
          setMapsReady(true);
          setMapsMessage('Testing map enabled with OpenStreetMap. Use Google Maps for production.');

          if (
            requestCurrentLocationOnMount &&
            !hasValidCoordinates(value.latitude, value.longitude)
          ) {
            requestCurrentLocation();
          }
        }
      });

    return () => {
      active = false;
      autocomplete = null;
    };
  }, [requestCurrentLocationOnMount]);

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
        emitChange(nextCoordinates);
        return;
      }

      const nextAddress = readPlaceAddress(results[0]);
      setMapsMessage(message);
      emitChange({
        address: nextAddress.address || value.address,
        city: nextAddress.city || value.city,
        state: nextAddress.state || value.state,
        ...nextCoordinates,
      });
    });
  };

  const applyOpenStreetMapCoordinates = async (latitude, longitude, message) => {
    emitChange({ latitude, longitude });

    try {
      const nextAddress = await reverseGeocode(latitude, longitude);
      setMapsMessage(message);
      emitChange({
        address: nextAddress.address || value.address,
        city: nextAddress.city || value.city,
        state: nextAddress.state || value.state,
        latitude,
        longitude,
      });
    } catch {
      setMapsMessage(message);
    }
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

  const searchOpenStreetMap = async () => {
    const query = searchText.trim();

    if (!query) {
      setMapsMessage('Enter an address to search.');
      return;
    }

    setOsmSearching(true);
    setOsmResults([]);

    try {
      const results = await searchLocations(query);
      setOsmResults(results);

      if (results.length === 0) {
        setMapsMessage('No address found. Try a more specific search.');
      }
    } catch {
      setMapsMessage('OpenStreetMap search is unavailable right now.');
    } finally {
      setOsmSearching(false);
    }
  };

  const selectOpenStreetMapResult = (result) => {
    if (!hasValidCoordinates(result.latitude, result.longitude)) {
      setMapsMessage('Selected map result is missing coordinates.');
      return;
    }

    emitChange({
      address: result.address || value.address,
      city: result.city,
      state: result.state,
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setOsmResults([]);
    setMapsMessage('Testing map address selected');
  };

  const resolvedSearchPlaceholder =
    searchPlaceholder ||
    (mapProvider === 'osm'
      ? 'Search address with free test map'
      : 'Search and select from Google Maps');

  return (
    <div className={`location-picker ${className}`.trim()}>
      <label className="location-picker-field location-picker-wide">
        <span>Search location</span>
        <div className="address-map-search-row">
          <input
            ref={autocompleteInputRef}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={resolvedSearchPlaceholder}
          />
          {mapProvider === 'osm' ? (
            <button type="button" className="location-picker-ghost-button" onClick={searchOpenStreetMap}>
              {osmSearching ? 'Searching...' : 'Search'}
            </button>
          ) : null}
        </div>
      </label>

      {mapProvider === 'osm' && osmResults.length > 0 ? (
        <div className="address-osm-results location-picker-wide">
          {osmResults.map((result) => (
            <button
              key={result.id}
              type="button"
              className="address-osm-result"
              onClick={() => selectOpenStreetMapResult(result)}
            >
              {result.address}
            </button>
          ))}
        </div>
      ) : null}

      <div className="address-map-picker location-picker-wide">
        {mapProvider === 'osm' ? (
          <OpenStreetMapPicker
            latitude={getCoordinateOrDefault(value.latitude, defaultMapCenter.latitude)}
            longitude={getCoordinateOrDefault(value.longitude, defaultMapCenter.longitude)}
            hasMarker={hasSelectedCoordinates}
            onPick={(latitude, longitude) =>
              applyOpenStreetMapCoordinates(latitude, longitude, 'Map location selected')
            }
          />
        ) : (
          <div ref={mapContainerRef} className="address-map-canvas" />
        )}
        {!mapsReady ? (
          <div className="address-map-empty">Loading map...</div>
        ) : null}
        {mapProvider === 'osm' ? (
          <div className="address-map-tip">Tap the map to pick location</div>
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

      {showAddressField ? (
        <label className="location-picker-field location-picker-wide">
          <span>{addressLabel}</span>
          <textarea
            value={value.address}
            onChange={(event) => emitChange({ address: event.target.value })}
            placeholder="Select a location from the map"
            rows={3}
          />
        </label>
      ) : null}

      {showCityField || showStateField ? (
        <div className="location-picker-grid">
          {showCityField ? (
            <label className="location-picker-field">
              <span>City</span>
              <input
                value={value.city}
                onChange={(event) => emitChange({ city: event.target.value })}
              />
            </label>
          ) : null}

          {showStateField ? (
            <label className="location-picker-field">
              <span>State</span>
              <input
                value={value.state}
                onChange={(event) => emitChange({ state: event.target.value })}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {showCoordinates && hasSelectedCoordinates ? (
        <p className="location-picker-coordinates">
          {Number(value.latitude).toFixed(6)}, {Number(value.longitude).toFixed(6)}
        </p>
      ) : null}

      {mapsMessage ? <p className="location-picker-hint">{mapsMessage}</p> : null}
      {error ? <p className="location-picker-error">{error}</p> : null}
    </div>
  );
}
