import { describe, it, expect } from 'vitest';
import { buildUrl, parsePrice, parseDateAndMileage, parseFuel, extractCity } from '../scrapers/autoscout.js';

describe('parsePrice', () => {
  it('parses Italian formatted price', () => {
    expect(parsePrice('€ 14.400')).toBe(14400);
    expect(parsePrice('€ 1.234')).toBe(1234);
    expect(parsePrice('€ 100.000')).toBe(100000);
  });

  it('parses simple price', () => {
    expect(parsePrice('€ 500')).toBe(500);
    expect(parsePrice('999')).toBe(999);
  });

  it('handles footnote markers after price', () => {
    expect(parsePrice('14.4001')).toBe(14400);
  });

  it('returns null for null/empty/garbage', () => {
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('Prezzo su richiesta')).toBeNull();
  });
});

describe('parseDateAndMileage', () => {
  it('parses combined date+mileage', () => {
    expect(parseDateAndMileage('01/20265 km')).toEqual({
      year: 2026,
      mileage: 5,
    });
  });

  it('parses separate date and mileage', () => {
    expect(parseDateAndMileage('03/2021 · 45.000 km')).toEqual({
      year: 2021,
      mileage: 45000,
    });
  });

  it('parses date without mileage', () => {
    const result = parseDateAndMileage('06/2023');
    expect(result.year).toBe(2023);
  });

  it('parses mileage without date', () => {
    const result = parseDateAndMileage('120.000 km');
    expect(result.mileage).toBe(120000);
  });

  it('returns nulls for empty text', () => {
    expect(parseDateAndMileage('')).toEqual({ year: null, mileage: null });
  });
});

describe('parseFuel', () => {
  it('detects common fuel types', () => {
    expect(parseFuel('Benzina 1.6')).toBe('Benzina');
    expect(parseFuel('Diesel 2.0')).toBe('Diesel');
    expect(parseFuel('Elettrica')).toBe('Elettrica');
    expect(parseFuel('GPL')).toBe('GPL');
    expect(parseFuel('Metano')).toBe('Metano');
  });

  it('detects hybrid fuel types', () => {
    expect(parseFuel('Elettrica/Benzina')).toBe('Elettrica/Benzina');
    expect(parseFuel('Elettrica/Diesel')).toBe('Elettrica/Diesel');
  });

  it('returns null for null/unknown', () => {
    expect(parseFuel(null)).toBeNull();
    expect(parseFuel('Idrogeno')).toBeNull();
  });
});

describe('extractCity', () => {
  it('extracts city from AutoScout format', () => {
    expect(extractCity('IT-20100 Milano - Lombardia - MI')).toBe('Milano (MI)');
    expect(extractCity('IT-00100 Roma - Lazio - RM')).toBe('Roma (RM)');
  });

  it('extracts city from simple format', () => {
    expect(extractCity('IT-10100 Torino')).toBe('Torino');
  });

  it('returns null for unrecognized format', () => {
    expect(extractCity('somewhere')).toBeNull();
    expect(extractCity('')).toBeNull();
  });
});

describe('buildUrl', () => {
  it('adds price range filters to AutoScout URL', () => {
    const url = buildUrl('BMW', 'Serie 3', null, 100, 1, {
      priceFrom: 15000,
      priceTo: 30000,
    });

    expect(url).toContain('pricefrom=15000');
    expect(url).toContain('priceto=30000');
  });
});
