let placesPromise = null;

export function loadGoogleMapsPlaces() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(new Error('Google Maps key is not configured'));
  }

  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps is unavailable'));
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  if (placesPromise) {
    return placesPromise;
  }

  placesPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-maps-places]');

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google));
      existingScript.addEventListener('error', () =>
        reject(new Error('Unable to load Google Maps')),
      );
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsPlaces = 'true';
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Unable to load Google Maps'));
    document.head.appendChild(script);
  });

  return placesPromise;
}

export function readPlaceAddress(place) {
  const components = place?.address_components ?? [];
  const byType = (type) =>
    components.find((component) => component.types.includes(type))?.long_name ?? '';

  const city =
    byType('locality') ||
    byType('postal_town') ||
    byType('administrative_area_level_3') ||
    byType('administrative_area_level_2');
  const state = byType('administrative_area_level_1');
  const location = place?.geometry?.location;

  return {
    address: place?.formatted_address || place?.name || '',
    city,
    state,
    latitude: typeof location?.lat === 'function' ? location.lat() : '',
    longitude: typeof location?.lng === 'function' ? location.lng() : '',
  };
}
