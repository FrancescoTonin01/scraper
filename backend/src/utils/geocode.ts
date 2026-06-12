import type { GeoResult } from '../types.js';

type CacheEntry = {
  value: GeoResult | null;
  timestamp: number;
};

const GEOCODE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const geocodeCache = new Map<string, CacheEntry>();

const KNOWN_GEOCODES: Record<string, GeoResult> = {
  lombardia: { lat: 45.5703694, lon: 9.7732524, postcode: '20122', region: 'Lombardia' },
  milano: { lat: 45.4641943, lon: 9.1896346, postcode: '20122', region: 'Lombardia' },
  bergamo: { lat: 45.6982642, lon: 9.6772698, postcode: '24121', region: 'Lombardia' },
  brescia: { lat: 45.5399305, lon: 10.2204212, postcode: '25121', region: 'Lombardia' },
  como: { lat: 45.8080416, lon: 9.0851793, postcode: '22100', region: 'Lombardia' },
  cremona: { lat: 45.133249, lon: 10.0226511, postcode: '26100', region: 'Lombardia' },
  lecco: { lat: 45.8565698, lon: 9.3976704, postcode: '23900', region: 'Lombardia' },
  lodi: { lat: 45.3097228, lon: 9.5037159, postcode: '26900', region: 'Lombardia' },
  mantova: { lat: 45.1564168, lon: 10.7913751, postcode: '46100', region: 'Lombardia' },
  'monza e brianza': { lat: 45.5845001, lon: 9.2744485, postcode: '20900', region: 'Lombardia' },
  pavia: { lat: 45.1860043, lon: 9.1546375, postcode: '27100', region: 'Lombardia' },
  sondrio: { lat: 46.1698583, lon: 9.8787674, postcode: '23100', region: 'Lombardia' },
  varese: { lat: 45.8176046, lon: 8.8263844, postcode: '21100', region: 'Lombardia' },
};

function normalizeCacheKey(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function readCache(key: string): GeoResult | null | undefined {
  const cached = geocodeCache.get(key);
  if (!cached) return undefined;

  if (Date.now() - cached.timestamp > GEOCODE_CACHE_TTL) {
    geocodeCache.delete(key);
    return undefined;
  }

  return cached.value;
}

function writeCache(key: string, value: GeoResult | null): GeoResult | null {
  geocodeCache.set(key, { value, timestamp: Date.now() });
  return value;
}

export function clearGeocodeCache(): void {
  geocodeCache.clear();
}

export function getGeocodeCacheSize(): number {
  return geocodeCache.size;
}

export async function geocodeCity(city: string): Promise<GeoResult | null> {
  const cacheKey = normalizeCacheKey(city);
  const cached = readCache(cacheKey);
  if (cached !== undefined) return cached;

  const known = KNOWN_GEOCODES[cacheKey];
  if (known) return writeCache(cacheKey, known);

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

    if (!res.ok) return writeCache(cacheKey, null);

    const data = await res.json();
    if (!data || data.length === 0) return writeCache(cacheKey, null);

    const first = data[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    let postcode: string | undefined = first.address?.postcode;
    const region: string | undefined = first.address?.state ?? undefined;

    // If no postcode from forward geocode, try reverse geocode at the coordinates
    if (!postcode) {
      postcode = await reverseGeocodePostcode(lat, lon);
    }

    return writeCache(cacheKey, { lat, lon, postcode, region });
  } catch (err) {
    console.error('[geocode] Error geocoding city:', err);
    return writeCache(cacheKey, null);
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
