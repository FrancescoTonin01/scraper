export type CarListing = {
  source: 'autoscout' | 'subito';
  title: string;
  price: number | null;
  mileage?: number | null;
  year?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  city?: string | null;
  imageUrl?: string | null;
  originalUrl: string;
  dealScore?: number | null;
  priceRating?: 'great' | 'good' | 'fair' | 'high' | 'unknown';
  estimatedMarketPrice?: number | null;
  priceDeltaPercent?: number | null;
  scoreConfidence?: 'high' | 'medium' | 'low';
  scoreReasons?: string[];
};

export type SearchParams = {
  make: string;
  model: string;
  location?: string;
  radius?: number;
  page?: number;
  pageSize?: number;
  yearFrom?: number;
  yearTo?: number;
  kmMax?: number;
  priceFrom?: number;
  priceTo?: number;
  fuel?: string;
};

export type SearchFilters = {
  yearFrom?: number;
  yearTo?: number;
  kmMax?: number;
  priceFrom?: number;
  priceTo?: number;
  fuel?: string;
};

export type GeoResult = {
  lat: number;
  lon: number;
  postcode?: string;
  region?: string;
};

export type SearchResponse = {
  results: CarListing[];
  total?: number | null;
  page: number;
  totalPages?: number | null;
  warnings?: string[];
  partial?: boolean;
  hasNextPage?: boolean;
  refreshAfterMs?: number;
  snapshotId?: string;
  snapshotVersion?: number;
  latestSnapshotId?: string;
  latestSnapshotVersion?: number;
  hasUpdate?: boolean;
  debug?: {
    cache: 'hit' | 'miss' | 'bypass';
    timingsMs: {
      total: number;
      geocode: number;
      regionTargets: number;
      autoscout: number;
      subito: number;
      postProcess: number;
    };
    sourceCounts: {
      autoscout: number;
      subito: number;
      combined: number;
    };
  };
};
