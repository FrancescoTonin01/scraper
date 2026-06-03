import type { GeoResult } from '../types.js';

export async function geocodeCity(city: string): Promise<GeoResult | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', city);
    url.searchParams.set('countrycodes', 'it');
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'CarAggregatorMVP/1.0',
        Accept: 'application/json',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || data.length === 0) return null;

    const first = data[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    let postcode: string | undefined = first.address?.postcode;
    const region: string | undefined = first.address?.state ?? undefined;

    // If no postcode from forward geocode, try reverse geocode at the coordinates
    if (!postcode) {
      postcode = await reverseGeocodePostcode(lat, lon);
    }

    return { lat, lon, postcode, region };
  } catch (err) {
    console.error('[geocode] Error geocoding city:', err);
    return null;
  }
}

async function reverseGeocodePostcode(lat: number, lon: number): Promise<string | undefined> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('format', 'json');
    url.searchParams.set('zoom', '16');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'CarAggregatorMVP/1.0',
        Accept: 'application/json',
      },
    });

    if (!res.ok) return undefined;
    const data = await res.json();
    return data?.address?.postcode ?? undefined;
  } catch {
    return undefined;
  }
}
