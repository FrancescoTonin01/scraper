import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { scrapeAutoScout } from './scrapers/autoscout.js';
import { scrapeSubito } from './scrapers/subito.js';
import { geocodeCity } from './utils/geocode.js';
import { isValidMake, isValidModelForMake } from './data/makes.js';
import { isValidLocation } from './data/locations.js';
import type { CarListing, SearchResponse } from './types.js';

const app = express();
const PORT = process.env.PORT ?? 4000;

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// --------------- In-memory cache ---------------
type CacheEntry = {
  listings: CarListing[];
  timestamp: number;
  warnings: string[];
};

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_PAGES_PER_SOURCE = 3;

function getCacheKey(make: string, model: string, location?: string, radius?: number, yearFrom?: number, yearTo?: number, kmMax?: number, fuel?: string): string {
  return `${make}|${model}|${location ?? ''}|${radius ?? 100}|${yearFrom ?? ''}|${yearTo ?? ''}|${kmMax ?? ''}|${fuel ?? ''}`.toLowerCase();
}

function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of searchCache) {
    if (now - entry.timestamp > CACHE_TTL) searchCache.delete(key);
  }
}

// --------------- Validation ---------------
const SORT_OPTIONS = ['price_asc', 'price_desc', 'year_desc', 'year_asc', 'km_asc', 'km_desc'] as const;
type SortOption = typeof SORT_OPTIONS[number];

function sortListings(listings: CarListing[], sort: SortOption): CarListing[] {
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

const searchSchema = z.object({
  make: z.string().min(1, 'make is required'),
  model: z.string().min(1, 'model is required'),
  location: z.string().optional(),
  locationType: z.enum(['region', 'city']).optional(),
  radius: z.coerce.number().min(1).max(500).default(100),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(20),
  sort: z.enum(SORT_OPTIONS).default('price_asc'),
  yearFrom: z.coerce.number().min(1900).max(2030).optional(),
  yearTo: z.coerce.number().min(1900).max(2030).optional(),
  kmMax: z.coerce.number().min(0).optional(),
  fuel: z.string().optional(),
});

app.get('/api/search', async (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid parameters',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { make, model, location, locationType, radius, page, pageSize, sort, yearFrom, yearTo, kmMax, fuel } = parsed.data;

  // Validate make/model/location against known data
  if (!isValidMake(make)) {
    res.status(400).json({ error: `Marca "${make}" non trovata. Controlla il nome e riprova.` });
    return;
  }
  if (!isValidModelForMake(make, model)) {
    res.status(400).json({ error: `Modello "${model}" non disponibile per ${make}. Controlla il nome e riprova.` });
    return;
  }
  if (location && !isValidLocation(location)) {
    res.status(400).json({ error: `Località "${location}" non trovata. Inserisci una regione o provincia italiana valida.` });
    return;
  }

  const isRegionSearch = locationType === 'region';
  console.log(`\n[search] make=${make} model=${model} location=${location ?? 'Tutta Italia'} type=${locationType ?? 'auto'} radius=${isRegionSearch ? 'N/A' : radius + 'km'} page=${page} sort=${sort} yearFrom=${yearFrom ?? '-'} yearTo=${yearTo ?? '-'} kmMax=${kmMax ?? '-'} fuel=${fuel ?? '-'}`);

  // Geocode location if provided
  let geo = null;
  if (location) {
    geo = await geocodeCity(location);
    if (geo) {
      console.log(`[search] Geocoded "${location}" → lat=${geo.lat}, lon=${geo.lon}, zip=${geo.postcode}, region=${geo.region}`);
    } else {
      console.log(`[search] Could not geocode "${location}" — searching without location filter`);
    }
  }

  // Check cache
  const cacheKey = getCacheKey(make, model, location, radius, yearFrom, yearTo, kmMax, fuel);
  const cached = searchCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[search] Serving from cache (${cached.listings.length} listings)`);
    const sorted = sortListings(cached.listings, sort);
    const total = sorted.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paginatedResults = sorted.slice(start, start + pageSize);

    const response: SearchResponse = {
      results: paginatedResults,
      total,
      page,
      totalPages,
      ...(cached.warnings.length > 0 && { warnings: cached.warnings }),
    };
    res.json(response);
    return;
  }

  // Run scrapers in parallel, each scraping multiple pages
  const warnings: string[] = [];
  const filters = { yearFrom, yearTo, kmMax, fuel };
  // For region searches, pass null geo to AutoScout (no zip/radius filtering)
  const autoscoutGeo = isRegionSearch ? null : geo;
  const [autoscoutResult, subitoResult] = await Promise.allSettled([
    scrapeAutoScout(make, model, autoscoutGeo, radius, MAX_PAGES_PER_SOURCE, filters),
    scrapeSubito(make, model, geo, MAX_PAGES_PER_SOURCE, filters),
  ]);

  let allListings: CarListing[] = [];

  if (autoscoutResult.status === 'fulfilled') {
    allListings.push(...autoscoutResult.value);
  } else {
    console.error('[search] AutoScout scraper failed:', autoscoutResult.reason);
    warnings.push('AutoScout24 scraping failed — showing partial results');
  }

  if (subitoResult.status === 'fulfilled') {
    allListings.push(...subitoResult.value);
  } else {
    console.error('[search] Subito scraper failed:', subitoResult.reason);
    warnings.push('Subito.it scraping failed — showing partial results');
  }

  if (allListings.length === 0 && warnings.length === 2) {
    res.status(500).json({ error: 'Both scrapers failed', warnings });
    return;
  }

  // Store in cache
  searchCache.set(cacheKey, { listings: allListings, timestamp: Date.now(), warnings });
  cleanExpiredCache();

  // Sort & paginate
  const sorted = sortListings(allListings, sort);
  const total = sorted.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paginatedResults = sorted.slice(start, start + pageSize);

  const response: SearchResponse = {
    results: paginatedResults,
    total,
    page,
    totalPages,
    ...(warnings.length > 0 && { warnings }),
  };

  res.json(response);
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🚗 Car Aggregator API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Search: http://localhost:${PORT}/api/search?make=BMW&model=i5\n`);
});
