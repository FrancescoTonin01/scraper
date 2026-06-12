import { describe, it, expect } from 'vitest';
import {
  buildUrl,
  parsePrice,
  parseDateAndMileage,
  parseFuel,
  extractCity,
  parseAutoScoutJsonListing,
  parseAutoScoutNextData,
} from '../scrapers/autoscout.js';

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

  it('uses coordinates and radius when no postcode is present', () => {
    const url = buildUrl('BMW', 'Serie 3', {
      lat: 45.43461,
      lon: 12.33891,
      region: 'Veneto',
    }, 200, 1);

    expect(url).toContain('lat=45.43461');
    expect(url).toContain('lon=12.33891');
    expect(url).toContain('zipr=200');
    expect(url).not.toContain('zip=');
  });
});

describe('parseAutoScoutJsonListing', () => {
  it('parses listing data from AutoScout __NEXT_DATA__ payload', () => {
    const listing = parseAutoScoutJsonListing({
      images: ['https://prod.pictures.autoscout24.net/listing-images/example.jpg/250x188.webp'],
      price: { priceFormatted: '€ 10.000' },
      url: '/annunci/bmw-316-316d-touring-business-advantage-diesel-grigio-abc',
      vehicle: {
        make: 'BMW',
        model: '316',
        modelVersionInput: '316d Touring Business Advantage',
        transmission: 'Automatico',
        fuel: 'Diesel',
        mileageInKm: '210.949 km',
      },
      location: {
        city: 'Caronno Pertusella - Varese - VA',
      },
      tracking: {
        firstRegistration: '07-2019',
        mileage: '210949',
        price: '10000',
      },
      vehicleDetails: [
        { data: '07/2019', ariaLabel: 'Anno' },
      ],
    });

    expect(listing).toMatchObject({
      source: 'autoscout',
      title: 'BMW 316 316d Touring Business Advantage',
      price: 10000,
      mileage: 210949,
      year: 2019,
      fuel: 'Diesel',
      transmission: 'Automatico',
      city: 'Caronno Pertusella (VA)',
      originalUrl: 'https://www.autoscout24.it/annunci/bmw-316-316d-touring-business-advantage-diesel-grigio-abc',
    });
    expect(listing?.imageUrl).toBe('https://prod.pictures.autoscout24.net/listing-images/example.jpg/1280x960.webp');
  });

  it('returns null when JSON listing has no usable URL or title', () => {
    expect(parseAutoScoutJsonListing({ vehicle: { make: 'BMW' } })).toBeNull();
    expect(parseAutoScoutJsonListing({ url: '/annunci/example' })).toBeNull();
  });
});

describe('parseAutoScoutNextData', () => {
  it('extracts listings from AutoScout page props', () => {
    const raw = JSON.stringify({
      props: {
        pageProps: {
          listings: [
            {
              url: '/annunci/bmw-320-example',
              vehicle: {
                make: 'BMW',
                model: '320',
                modelVersionInput: 'd Touring',
              },
            },
          ],
        },
      },
    });

    expect(parseAutoScoutNextData(raw)).toHaveLength(1);
    expect(parseAutoScoutNextData(raw)[0].title).toBe('BMW 320 d Touring');
  });

  it('returns an empty array for invalid JSON', () => {
    expect(parseAutoScoutNextData('{')).toEqual([]);
  });
});
