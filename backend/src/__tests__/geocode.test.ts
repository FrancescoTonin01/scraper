import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearGeocodeCache, geocodeCity, getGeocodeCacheSize } from '../utils/geocode.js';

afterEach(() => {
  clearGeocodeCache();
  vi.unstubAllGlobals();
});

describe('geocodeCity cache', () => {
  it('serves known Lombardia locations without calling Nominatim', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(geocodeCity('Milano')).resolves.toMatchObject({
      postcode: '20122',
      region: 'Lombardia',
    });
    await expect(geocodeCity('Lombardia')).resolves.toMatchObject({
      region: 'Lombardia',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(getGeocodeCacheSize()).toBe(2);
  });

  it('caches Nominatim results for non-seeded locations', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: '44.4949',
          lon: '11.3426',
          address: {
            postcode: '40121',
            state: 'Emilia-Romagna',
          },
        },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(geocodeCity('Bologna')).resolves.toEqual({
      lat: 44.4949,
      lon: 11.3426,
      postcode: '40121',
      region: 'Emilia-Romagna',
    });
    await expect(geocodeCity('bologna')).resolves.toMatchObject({
      postcode: '40121',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getGeocodeCacheSize()).toBe(1);
  });

  it('caches failed lookups to avoid repeated slow calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(geocodeCity('Not A Real Place')).resolves.toBeNull();
    await expect(geocodeCity('not a real place')).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
