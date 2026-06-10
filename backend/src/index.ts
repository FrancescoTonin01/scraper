import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { scrapeAutoScout } from './scrapers/autoscout.js';
import { scrapeSubito } from './scrapers/subito.js';
import { geocodeCity } from './utils/geocode.js';
import { isValidMake, isValidModelForMake } from './data/makes.js';
import { isValidLocation, isCityInRegion } from './data/locations.js';
import { isListingRelevantToModel } from './data/modelSlugs.js';
import { buildAlertLookup, buildAlertSegmentKey, escapeCsvValue } from './utils/marketing.js';
import type { CarListing, SearchResponse } from './types.js';

const prisma = new PrismaClient();
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

function normalizeDedupeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dedupeListings(listings: CarListing[]): CarListing[] {
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

  // For region searches, post-filter AutoScout results to only include
  // listings whose city matches a province in the target region.
  if (isRegionSearch && location) {
    const before = allListings.length;
    allListings = allListings.filter((l) => {
      // Keep Subito results as-is (already region-filtered by URL slug)
      if (l.source === 'subito') return true;
      // AutoScout: keep only if city matches the region, or if no city info
      if (!l.city) return false;
      return isCityInRegion(l.city, location);
    });
    console.log(`[search] Region post-filter: ${before} → ${allListings.length} listings (region: ${location})`);
  }

  const beforeRelevance = allListings.length;
  allListings = allListings.filter((l) => isListingRelevantToModel(make, model, l.title));
  console.log(`[search] Model relevance filter: ${beforeRelevance} → ${allListings.length} listings (${make} ${model})`);

  const beforeDedupe = allListings.length;
  allListings = dedupeListings(allListings);
  console.log(`[search] Cross-source dedupe: ${beforeDedupe} → ${allListings.length} listings`);

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

// --------------- Alert subscription ---------------
const alertSchema = z.object({
  email: z.string().email('Email non valida'),
  make: z.string().min(1),
  model: z.string().min(1),
  location: z.string().optional(),
  radius: z.number().min(1).max(500).optional(),
  yearFrom: z.number().min(1900).max(2030).optional(),
  yearTo: z.number().min(1900).max(2030).optional(),
  kmMax: z.number().min(0).optional(),
  fuel: z.string().optional(),
});

app.post('/api/alerts', async (req, res) => {
  const parsed = alertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Dati non validi',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const data = buildAlertLookup(parsed.data);

  const existing = await prisma.alertSubscription.findFirst({
    where: {
      email: data.email,
      make: data.make,
      model: data.model,
      location: data.location ?? null,
      radius: data.radius ?? null,
      yearFrom: data.yearFrom ?? null,
      yearTo: data.yearTo ?? null,
      kmMax: data.kmMax ?? null,
      fuel: data.fuel ?? null,
      active: true,
    },
  });

  if (existing) {
    res.json({ message: 'Hai già salvato questa ricerca.' });
    return;
  }

  await prisma.alertSubscription.create({ data });
  console.log(`[alert] New subscription: ${data.email} → ${data.make} ${data.model}`);
  res.status(201).json({ message: 'Ricerca salvata. Ti avviseremo quando attiveremo gli alert.' });
});

// --------------- Feedback ---------------
const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  message: z.string().max(2000).optional(),
  page: z.string().max(500).optional(),
});

app.post('/api/feedback', async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Dati non validi',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  await prisma.feedback.create({ data: parsed.data });
  console.log(`[feedback] rating=${parsed.data.rating} page=${parsed.data.page ?? '/'}`);
  res.status(201).json({ message: 'Grazie per il tuo feedback!' });
});

// --------------- Admin endpoints ---------------
const ADMIN_KEY = process.env.ADMIN_KEY ?? '';

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!ADMIN_KEY || req.query.key !== ADMIN_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

app.get('/api/admin/feedback', requireAdmin, async (_req, res) => {
  const feedback = await prisma.feedback.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const stats = {
    total: feedback.length,
    avgRating: feedback.length > 0
      ? +(feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
      : 0,
  };
  res.json({ stats, feedback });
});

app.get('/api/admin/alerts', requireAdmin, async (_req, res) => {
  const alerts = await prisma.alertSubscription.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  const segments = new Map<string, { make: string; model: string; location: string; count: number }>();

  for (const alert of alerts) {
    const location = alert.location ?? 'Tutta Italia';
    const key = buildAlertSegmentKey({ make: alert.make, model: alert.model, location });
    const current = segments.get(key);
    if (current) {
      current.count += 1;
    } else {
      segments.set(key, {
        make: alert.make,
        model: alert.model,
        location,
        count: 1,
      });
    }
  }

  const stats = {
    total: alerts.length,
    uniqueEmails: new Set(alerts.map((a) => a.email)).size,
    active: alerts.filter((a) => a.active).length,
    topSegments: [...segments.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
  res.json({ stats, alerts });
});

app.get('/api/admin/alerts.csv', requireAdmin, async (_req, res) => {
  const alerts = await prisma.alertSubscription.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const headers = ['createdAt', 'email', 'make', 'model', 'location', 'radius', 'yearFrom', 'yearTo', 'kmMax', 'fuel', 'active'];
  const rows = alerts.map((alert) => [
    alert.createdAt.toISOString(),
    alert.email,
    alert.make,
    alert.model,
    alert.location ?? '',
    alert.radius ?? '',
    alert.yearFrom ?? '',
    alert.yearTo ?? '',
    alert.kmMax ?? '',
    alert.fuel ?? '',
    alert.active,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="autoradar-alerts.csv"');
  res.send(csv);
});

app.listen(PORT, () => {
  console.log(`\n🚗 Car Aggregator API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Search: http://localhost:${PORT}/api/search?make=BMW&model=i5\n`);
});
