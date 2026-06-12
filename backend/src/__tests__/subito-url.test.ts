import { describe, expect, it } from 'vitest';
import { buildSubitoFallbackUrl, buildSubitoUrl } from '../scrapers/subito.js';
import type { GeoResult } from '../types.js';

const lombardiaGeo: GeoResult = {
  lat: 45.4641943,
  lon: 9.1896346,
  postcode: '20122',
  region: 'Lombardia',
};

describe('buildSubitoUrl', () => {
  it('uses province path when location is a province', () => {
    expect(buildSubitoUrl('BMW', 'Serie 3', lombardiaGeo, 1, 'Milano')).toBe(
      'https://www.subito.it/annunci-lombardia/vendita/auto/milano/bmw/serie-3/',
    );
  });

  it('adds price order to province paths when requested', () => {
    expect(buildSubitoUrl('BMW', 'Serie 3', lombardiaGeo, 1, 'Milano', 'price_asc')).toBe(
      'https://www.subito.it/annunci-lombardia/vendita/auto/milano/bmw/serie-3/?order=priceasc',
    );
    expect(buildSubitoUrl('BMW', 'Serie 3', lombardiaGeo, 2, 'Milano', 'price_desc')).toBe(
      'https://www.subito.it/annunci-lombardia/vendita/auto/milano/bmw/serie-3/?order=pricedesc&o=2',
    );
  });

  it('keeps regional path for region searches', () => {
    expect(buildSubitoUrl('BMW', 'Serie 3', lombardiaGeo, 2)).toBe(
      'https://www.subito.it/annunci-lombardia/vendita/auto/bmw/serie-3/?o=2',
    );
  });

  it('uses province path for query fallback URLs too', () => {
    expect(buildSubitoFallbackUrl('BMW', 'i5', lombardiaGeo, 1, 'Milano', 'price_asc')).toBe(
      'https://www.subito.it/annunci-lombardia/vendita/auto/milano/bmw/?q=i5&order=priceasc',
    );
  });
});
