export type CarListing = {
  source: "autoscout" | "subito";
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
  priceRating?: "great" | "good" | "fair" | "high" | "unknown";
  estimatedMarketPrice?: number | null;
  priceDeltaPercent?: number | null;
  scoreConfidence?: "high" | "medium" | "low";
  scoreReasons?: string[];
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
};
