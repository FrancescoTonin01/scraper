import { describe, expect, it } from 'vitest';
import { canServeCachedSearch, paginateListings, scoreListings, sortListings } from '../searchResults.js';
import type { CarListing } from '../types.js';

const listings: CarListing[] = [
  {
    source: 'autoscout',
    title: 'Car A',
    price: 30000,
    mileage: 70000,
    year: 2020,
    originalUrl: 'https://example.com/a',
  },
  {
    source: 'subito',
    title: 'Car B',
    price: 20000,
    mileage: 90000,
    year: 2022,
    originalUrl: 'https://example.com/b',
  },
  {
    source: 'autoscout',
    title: 'Car C',
    price: 40000,
    mileage: 30000,
    year: 2019,
    originalUrl: 'https://example.com/c',
  },
];

describe('sortListings', () => {
  it('sorts complete result sets by supported fields', () => {
    expect(sortListings(listings, 'price_asc').map((listing) => listing.title)).toEqual(['Car B', 'Car A', 'Car C']);
    expect(sortListings(listings, 'price_desc').map((listing) => listing.title)).toEqual(['Car C', 'Car A', 'Car B']);
    expect(sortListings(listings, 'year_desc').map((listing) => listing.title)).toEqual(['Car B', 'Car A', 'Car C']);
    expect(sortListings(listings, 'km_asc').map((listing) => listing.title)).toEqual(['Car C', 'Car A', 'Car B']);
  });
});

describe('paginateListings', () => {
  it('omits totals and page counts for partial responses', () => {
    const response = paginateListings(listings, [], 1, 2, 'price_asc', true, 2500);

    expect(response.results.map((listing) => listing.title)).toEqual(['Car B', 'Car A']);
    expect(response.partial).toBe(true);
    expect(response.hasNextPage).toBe(true);
    expect(response.refreshAfterMs).toBe(2500);
    expect(response.total).toBeUndefined();
    expect(response.totalPages).toBeUndefined();
  });

  it('includes totals and page counts for complete responses', () => {
    const response = paginateListings(listings, [], 1, 2, 'price_desc', false);

    expect(response.results.map((listing) => listing.title)).toEqual(['Car C', 'Car A']);
    expect(response.partial).toBeUndefined();
    expect(response.hasNextPage).toBe(true);
    expect(response.total).toBe(3);
    expect(response.totalPages).toBe(2);
  });
});

describe('scoreListings', () => {
  it('adds deal metadata when enough comparable prices exist', () => {
    const scored = scoreListings([
      ...listings,
      {
        source: 'subito',
        title: 'Car D',
        price: 21000,
        mileage: 80000,
        year: 2021,
        fuel: 'Diesel',
        originalUrl: 'https://example.com/d',
      },
      {
        source: 'autoscout',
        title: 'Car E',
        price: 22000,
        mileage: 85000,
        year: 2021,
        fuel: 'Diesel',
        originalUrl: 'https://example.com/e',
      },
      {
        source: 'subito',
        title: 'Car F',
        price: 23000,
        mileage: 82000,
        year: 2021,
        fuel: 'Diesel',
        originalUrl: 'https://example.com/f',
      },
      {
        source: 'autoscout',
        title: 'Car G',
        price: 24000,
        mileage: 82000,
        year: 2021,
        fuel: 'Diesel',
        originalUrl: 'https://example.com/g',
      },
      {
        source: 'subito',
        title: 'Car H',
        price: 16000,
        mileage: 81000,
        year: 2021,
        fuel: 'Diesel',
        originalUrl: 'https://example.com/h',
      },
    ]);

    const cheapListing = scored.find((listing) => listing.title === 'Car H');
    expect(cheapListing?.dealScore).toBeGreaterThan(70);
    expect(cheapListing?.priceRating).toMatch(/great|good/);
    expect(cheapListing?.estimatedMarketPrice).toBeGreaterThan(0);
  });

  it('marks listings without price as unknown', () => {
    const scored = scoreListings([{
      source: 'autoscout',
      title: 'No price',
      price: null,
      originalUrl: 'https://example.com/no-price',
    }]);

    expect(scored[0].priceRating).toBe('unknown');
    expect(scored[0].dealScore).toBeNull();
  });
});

describe('canServeCachedSearch', () => {
  it('allows partial cache only after the minimum default-sort depth is loaded', () => {
    expect(canServeCachedSearch(true, 1, 'price_asc', 2, listings.length, 4, 4)).toBe(true);
    expect(canServeCachedSearch(true, 2, 'price_asc', 2, listings.length, 4, 4)).toBe(true);
    expect(canServeCachedSearch(true, 1, 'price_asc', 2, listings.length, 3, 4)).toBe(false);
    expect(canServeCachedSearch(true, 2, 'price_asc', 20, listings.length, 4, 4)).toBe(false);
    expect(canServeCachedSearch(true, 1, 'price_desc', 2, listings.length, 4, 4)).toBe(false);
    expect(canServeCachedSearch(true, 4, 'price_asc', 1, listings.length, 4, 4)).toBe(false);
    expect(canServeCachedSearch(true, 5, 'price_asc', 1, listings.length, 4, 4)).toBe(false);
  });

  it('allows complete cache for every supported sorting and page', () => {
    expect(canServeCachedSearch(false, 1, 'year_desc', 20, listings.length, 0, 4)).toBe(true);
    expect(canServeCachedSearch(false, 3, 'km_asc', 20, listings.length, 0, 4)).toBe(true);
  });
});
