function parseCityFromAddress(address = {}) {
  return (
    address.city ||
    address.town ||
    address.village ||
    address.county ||
    ''
  );
}

export async function reverseGeocode(latitude, longitude) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'jsonv2',
    addressdetails: '1',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
  const result = await response.json();

  return {
    address: result.display_name || '',
    city: parseCityFromAddress(result.address),
    state: result.address?.state || '',
    latitude,
    longitude,
  };
}

export async function searchLocations(query, limit = 5) {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(limit),
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  const results = await response.json();

  if (!Array.isArray(results)) {
    return [];
  }

  return results.map((result) => ({
    id: result.place_id,
    address: result.display_name || '',
    city: parseCityFromAddress(result.address),
    state: result.address?.state || '',
    latitude: Number(result.lat),
    longitude: Number(result.lon),
  }));
}
