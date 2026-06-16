import type { CarListing, SearchFilters } from '../types.js';

export function normalizeDedupeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function dedupeListings(listings: CarListing[]): CarListing[] {
  const seenUrls = new Set<string>();
  const seenFingerprints = new Set<string>();

  return listings.filter((listing) => {
    if (seenUrls.has(listing.originalUrl)) return false;
    seenUrls.add(listing.originalUrl);

    const title = normalizeDedupeText(listing.title);
    const city = normalizeDedupeText(listing.city ?? '');
    const fingerprint = [
      title,
      listing.price ?? '',
      listing.year ?? '',
      listing.mileage ?? '',
      city,
    ].join('|');

    if (seenFingerprints.has(fingerprint)) return false;
    seenFingerprints.add(fingerprint);
    return true;
  });
}

export function dedupeListingsByOriginalUrl(listings: CarListing[]): CarListing[] {
  const seen = new Set<string>();
  return listings.filter((listing) => {
    if (seen.has(listing.originalUrl)) return false;
    seen.add(listing.originalUrl);
    return true;
  });
}

export function filterListingsBySearchFilters(listings: CarListing[], filters?: SearchFilters): CarListing[] {
  if (!filters) return listings;

  let filtered = listings;
  if (filters.yearFrom) {
    filtered = filtered.filter((listing) => listing.year != null && listing.year >= filters.yearFrom!);
  }
  if (filters.yearTo) {
    filtered = filtered.filter((listing) => listing.year != null && listing.year <= filters.yearTo!);
  }
  if (filters.kmMax) {
    filtered = filtered.filter((listing) => listing.mileage != null && listing.mileage <= filters.kmMax!);
  }
  if (filters.priceFrom) {
    filtered = filtered.filter((listing) => listing.price != null && listing.price >= filters.priceFrom!);
  }
  if (filters.priceTo) {
    filtered = filtered.filter((listing) => listing.price != null && listing.price <= filters.priceTo!);
  }
  if (filters.fuel) {
    const fuelLower = filters.fuel.toLowerCase();
    filtered = filtered.filter((listing) => {
      if (!listing.fuel) return false;
      const listingFuel = listing.fuel.toLowerCase();
      if (fuelLower === 'ibrida') return listingFuel.includes('ibrida') || listingFuel.includes('elettrica/');
      return listingFuel.includes(fuelLower);
    });
  }

  return filtered;
}
