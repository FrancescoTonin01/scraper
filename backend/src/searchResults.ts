import type { CarListing, SearchResponse } from './types.js';

export const SORT_OPTIONS = ['price_asc', 'price_desc', 'year_desc', 'year_asc', 'km_asc', 'km_desc'] as const;
export type SortOption = typeof SORT_OPTIONS[number];

export const DEFAULT_SORT: SortOption = 'price_asc';
export const PARTIAL_NAV_PAGES = 4;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function scoreListings(listings: CarListing[]): CarListing[] {
  const pricedListings = listings.filter((listing) => listing.price != null && listing.price > 0);
  const fallbackMarketPrice = median(pricedListings.map((listing) => listing.price!));

  return listings.map((listing) => {
    if (!listing.price || !fallbackMarketPrice) {
      return {
        ...listing,
        dealScore: null,
        priceRating: 'unknown',
        estimatedMarketPrice: null,
        priceDeltaPercent: null,
        scoreConfidence: 'low',
        scoreReasons: ['Dati prezzo insufficienti'],
      };
    }

    const comparablePrices = pricedListings
      .filter((candidate) => {
        if (candidate.originalUrl === listing.originalUrl) return false;
        const sameYearBand = listing.year == null || candidate.year == null || Math.abs(candidate.year - listing.year) <= 2;
        const sameMileageBand = listing.mileage == null || candidate.mileage == null || Math.abs(candidate.mileage - listing.mileage) <= 50_000;
        const sameFuel = !listing.fuel || !candidate.fuel || candidate.fuel.toLowerCase() === listing.fuel.toLowerCase();
        return sameYearBand && sameMileageBand && sameFuel;
      })
      .map((candidate) => candidate.price!)
      .filter((price) => price > 0);

    const marketPrice = median(comparablePrices) ?? fallbackMarketPrice;
    const deltaPercent = Math.round(((listing.price - marketPrice) / marketPrice) * 100);
    const dealScore = clamp(Math.round(70 - deltaPercent * 1.8), 0, 100);
    const confidence = comparablePrices.length >= 8
      ? 'high'
      : comparablePrices.length >= 4
        ? 'medium'
        : 'low';

    const priceRating = confidence === 'low'
      ? 'unknown'
      : deltaPercent <= -12
        ? 'great'
        : deltaPercent <= -5
          ? 'good'
          : deltaPercent <= 10
            ? 'fair'
            : 'high';

    return {
      ...listing,
      dealScore,
      priceRating,
      estimatedMarketPrice: marketPrice,
      priceDeltaPercent: deltaPercent,
      scoreConfidence: confidence,
      scoreReasons: [
        `${comparablePrices.length} annunci comparabili`,
        `Prezzo stimato ${marketPrice.toLocaleString('it-IT')} EUR`,
      ],
    };
  });
}

export function sortListings(listings: CarListing[], sort: SortOption): CarListing[] {
  const sorted = [...listings];
  switch (sort) {
    case 'price_asc':
      return sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case 'price_desc':
      return sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    case 'year_desc':
      return sorted.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    case 'year_asc':
      return sorted.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
    case 'km_asc':
      return sorted.sort((a, b) => (a.mileage ?? Infinity) - (b.mileage ?? Infinity));
    case 'km_desc':
      return sorted.sort((a, b) => (b.mileage ?? 0) - (a.mileage ?? 0));
    default:
      return sorted;
  }
}

export function canServeCachedSearch(
  partial: boolean,
  page: number,
  sort: SortOption,
  pageSize: number,
  listingCount: number,
  loadedPages: number,
  requiredPartialPages: number,
): boolean {
  if (!partial) return true;
  if (sort !== DEFAULT_SORT || page > PARTIAL_NAV_PAGES) return false;
  if (loadedPages < requiredPartialPages) return false;
  return listingCount > (page - 1) * pageSize;
}

export function paginateListings(
  listings: CarListing[],
  warnings: string[],
  page: number,
  pageSize: number,
  sort: SortOption,
  partial = false,
  refreshAfterMs?: number,
): SearchResponse {
  const sorted = sortListings(listings, sort);
  const start = (page - 1) * pageSize;
  const paginatedResults = sorted.slice(start, start + pageSize);

  if (partial) {
    return {
      results: paginatedResults,
      page,
      ...(warnings.length > 0 && { warnings }),
      partial: true,
      hasNextPage: sorted.length > start + pageSize || page < PARTIAL_NAV_PAGES,
      ...(refreshAfterMs && { refreshAfterMs }),
    };
  }

  const total = sorted.length;
  const totalPages = Math.ceil(total / pageSize);

  return {
    results: paginatedResults,
    total,
    page,
    totalPages,
    hasNextPage: page < totalPages,
    ...(warnings.length > 0 && { warnings }),
  };
}
