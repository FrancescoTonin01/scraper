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
};

export type SearchParams = {
  make: string;
  model: string;
  location?: string;
  radius?: number;
  page?: number;
  pageSize?: number;
};

export type GeoResult = {
  lat: number;
  lon: number;
  postcode?: string;
  region?: string;
};

export type SearchResponse = {
  results: CarListing[];
  total: number;
  page: number;
  totalPages: number;
  warnings?: string[];
};
