import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { scrapeAutoScoutPageRange, scrapeAutoScoutTargetsPageRange, type AutoScoutSearchTarget } from './scrapers/autoscout.js';
import { scrapeSubitoPageRange } from './scrapers/subito.js';
import { geocodeCity } from './utils/geocode.js';
import { isValidMake, isValidModelForMake } from './data/makes.js';
import { isValidLocation, isCityInRegion } from './data/locations.js';
import { isListingRelevantToModel } from './data/modelSlugs.js';
import { buildAlertLookup, buildAlertSegmentKey, escapeCsvValue } from './utils/marketing.js';
import { paginateListings, scoreListings, SORT_OPTIONS, type SortOption } from './searchResults.js';
import type { CarListing, GeoResult, SearchFilters, SearchResponse } from './types.js';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT ?? 4000;

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// --------------- In-memory search snapshots ---------------
type SearchChunk = {
  listings: CarListing[];
  warnings: string[];
  sourceCounts: SearchDebug['sourceCounts'];
  startPage: number;
  endPage: number;
};

type SearchSnapshot = {
  id: string;
  version: number;
  listings: CarListing[];
  warnings: string[];
  sourceCounts: SearchDebug['sourceCounts'];
  depth: number;
  partial: boolean;
  timestamp: number;
};

type SearchState = {
  timestamp: number;
  chunks: Map<string, SearchChunk>;
  snapshots: SearchSnapshot[];
  background?: Promise<void>;
  targets?: AutoScoutSearchTarget[];
};

type SearchDebug = NonNullable<SearchResponse['debug']>;
type SearchDebugTimings = SearchDebug['timingsMs'];

const searchStates = new Map<string, SearchState>();
const snapshotIndex = new Map<string, { cacheKey: string; snapshot: SearchSnapshot }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const INITIAL_SNAPSHOT_PAGES = 4;
const BACKGROUND_CHUNK_SIZE = 4;
const BACKGROUND_MAX_PAGES = 16;
const PARTIAL_REFRESH_AFTER_MS = 2500;
const REGION_AUTOSCOUT_RADIUS_KM = 200;
let snapshotSeq = 0;

function getCacheKey(
  make: string,
  model: string,
  location?: string,
  locationType?: string,
  radius?: number,
  filters?: SearchFilters,
): string {
  return [
    make,
    model,
    location ?? '',
    locationType ?? '',
    radius ?? 100,
    filters?.yearFrom ?? '',
    filters?.yearTo ?? '',
    filters?.kmMax ?? '',
    filters?.priceFrom ?? '',
    filters?.priceTo ?? '',
    filters?.fuel ?? '',
  ].join('|').toLowerCase();
}

function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, state] of searchStates) {
    if (now - state.timestamp > CACHE_TTL) {
      for (const snapshot of state.snapshots) {
        snapshotIndex.delete(snapshot.id);
      }
      searchStates.delete(key);
    }
  }
}

function createSnapshotId(): string {
  snapshotSeq += 1;
  return `snap_${Date.now().toString(36)}_${snapshotSeq.toString(36)}`;
}

function getLatestSnapshot(state: SearchState): SearchSnapshot | undefined {
  return state.snapshots[state.snapshots.length - 1];
}

function uniqueWarnings(chunks: SearchChunk[]): string[] {
  return [...new Set(chunks.flatMap((chunk) => chunk.warnings))];
}

function getChunkKey(startPage: number, endPage: number): string {
  return `${startPage}-${endPage}`;
}

function createEmptyState(): SearchState {
  return {
    timestamp: Date.now(),
    chunks: new Map(),
    snapshots: [],
  };
}

function nowMs(): number {
  return Date.now();
}

function elapsedMs(start: number): number {
  return Date.now() - start;
}

async function measure<T>(timings: SearchDebugTimings, key: keyof SearchDebugTimings, fn: () => Promise<T>): Promise<T> {
  const start = nowMs();
  try {
    return await fn();
  } finally {
    timings[key] += elapsedMs(start);
  }
}

function withDebug(
  response: SearchResponse,
  debugEnabled: boolean,
  cache: 'hit' | 'miss' | 'bypass',
  timings: SearchDebugTimings,
  requestStarted: number,
  sourceCounts: SearchDebug['sourceCounts'],
): SearchResponse {
  if (!debugEnabled) return response;

  return {
    ...response,
    debug: {
      cache,
      timingsMs: {
        ...timings,
        total: elapsedMs(requestStarted),
      },
      sourceCounts,
    },
  };
}

// --------------- Validation ---------------
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

type ScrapeSearchArgs = {
  make: string;
  model: string;
  location?: string;
  radius: number;
  filters: SearchFilters;
  geo: GeoResult | null;
  isRegionSearch: boolean;
  sort: SortOption;
  startPage: number;
  endPage: number;
  targets?: AutoScoutSearchTarget[];
  timings?: SearchDebugTimings;
};

type ScrapeSearchResult = {
  listings: CarListing[];
  warnings: string[];
  sourceCounts: SearchDebug['sourceCounts'];
};

async function timed<T>(
  timings: SearchDebugTimings | undefined,
  key: keyof SearchDebugTimings,
  fn: () => Promise<T>,
): Promise<T> {
  if (!timings) return fn();
  return measure(timings, key, fn);
}

async function getRegionAutoScoutTargets(region: string): Promise<AutoScoutSearchTarget[]> {
  const geo = await geocodeCity(region);
  if (!geo) {
    console.log(`[search] Could not geocode region "${region}" for AutoScout region search`);
    return [];
  }

  return [{
    label: `${region} (${geo.lat},${geo.lon})`,
    geo: {
      lat: geo.lat,
      lon: geo.lon,
      region: geo.region,
    },
    radius: REGION_AUTOSCOUT_RADIUS_KM,
  }];
}

async function scrapeSearch(args: ScrapeSearchArgs): Promise<ScrapeSearchResult> {
  const {
    make,
    model,
    location,
    radius,
    filters,
    geo,
    isRegionSearch,
    sort,
    startPage,
    endPage,
    targets,
    timings,
  } = args;

  const warnings: string[] = [];
  const autoscoutPromise = isRegionSearch && location
    ? Promise.resolve(targets ?? []).then((resolvedTargets) => {
        if (resolvedTargets.length === 0) {
          console.log('[search] No province targets for AutoScout region search, falling back to all Italy');
          return timed(timings, 'autoscout', () => scrapeAutoScoutPageRange(make, model, null, radius, startPage, endPage, filters, sort));
        }
        return timed(timings, 'autoscout', () => scrapeAutoScoutTargetsPageRange(make, model, resolvedTargets, startPage, endPage, filters, sort));
      })
    : timed(timings, 'autoscout', () => scrapeAutoScoutPageRange(make, model, geo, radius, startPage, endPage, filters, sort));

  const [autoscoutResult, subitoResult] = await Promise.allSettled([
    autoscoutPromise,
    timed(timings, 'subito', () => scrapeSubitoPageRange(make, model, geo, startPage, endPage, filters, isRegionSearch ? undefined : location, sort)),
  ]);

  let allListings: CarListing[] = [];
  let autoscoutCount = 0;
  let subitoCount = 0;

  if (autoscoutResult.status === 'fulfilled') {
    autoscoutCount = autoscoutResult.value.length;
    allListings.push(...autoscoutResult.value);
  } else {
    console.error('[search] AutoScout scraper failed:', autoscoutResult.reason);
    warnings.push('AutoScout24 scraping failed — showing partial results');
  }

  if (subitoResult.status === 'fulfilled') {
    subitoCount = subitoResult.value.length;
    allListings.push(...subitoResult.value);
  } else {
    console.error('[search] Subito scraper failed:', subitoResult.reason);
    warnings.push('Subito.it scraping failed — showing partial results');
  }

  if (allListings.length === 0 && warnings.length === 2) {
    throw new Error('Both scrapers failed');
  }

  await timed(timings, 'postProcess', async () => {
    if (isRegionSearch && location) {
      const before = allListings.length;
      allListings = allListings.filter((l) => {
        if (l.source === 'subito') return true;
        if (!l.city) return false;
        return isCityInRegion(l.city, location);
      });
      allListings = dedupeListings(allListings);
      console.log(`[search] Region post-filter: ${before} → ${allListings.length} listings (region: ${location})`);
    } else {
      allListings = dedupeListings(allListings);
    }

    const beforeRelevance = allListings.length;
    allListings = allListings.filter((l) => isListingRelevantToModel(make, model, l.title));
    console.log(`[search] Model relevance filter: ${beforeRelevance} → ${allListings.length} listings (${make} ${model})`);

    const beforeDedupe = allListings.length;
    allListings = dedupeListings(allListings);
    console.log(`[search] Cross-source dedupe: ${beforeDedupe} → ${allListings.length} listings`);
  });

  return {
    listings: allListings,
    warnings,
    sourceCounts: {
      autoscout: autoscoutCount,
      subito: subitoCount,
      combined: allListings.length,
    },
  };
}

async function ensureTargets(
  state: SearchState,
  location: string | undefined,
  isRegionSearch: boolean,
  timings?: SearchDebugTimings,
): Promise<AutoScoutSearchTarget[] | undefined> {
  if (!isRegionSearch || !location) return undefined;
  if (state.targets) return state.targets;
  state.targets = await timed(timings, 'regionTargets', () => getRegionAutoScoutTargets(location));
  return state.targets;
}

async function fetchSearchChunk(
  state: SearchState,
  args: Omit<ScrapeSearchArgs, 'startPage' | 'endPage' | 'targets' | 'timings'>,
  startPage: number,
  endPage: number,
  timings?: SearchDebugTimings,
): Promise<SearchChunk> {
  const key = getChunkKey(startPage, endPage);
  const cached = state.chunks.get(key);
  if (cached) return cached;

  const targets = await ensureTargets(state, args.location, args.isRegionSearch, timings);
  const result = await scrapeSearch({
    ...args,
    startPage,
    endPage,
    targets,
    timings,
  });
  const chunk: SearchChunk = {
    ...result,
    startPage,
    endPage,
  };
  state.chunks.set(key, chunk);
  state.timestamp = Date.now();
  return chunk;
}

function createSnapshot(cacheKey: string, state: SearchState, depth: number, partial: boolean): SearchSnapshot {
  const chunks = [...state.chunks.values()]
    .filter((chunk) => chunk.endPage <= depth)
    .sort((a, b) => a.startPage - b.startPage);
  const listings = scoreListings(dedupeListings(chunks.flatMap((chunk) => chunk.listings)));
  const sourceCounts = {
    autoscout: listings.filter((listing) => listing.source === 'autoscout').length,
    subito: listings.filter((listing) => listing.source === 'subito').length,
    combined: listings.length,
  };
  const snapshot: SearchSnapshot = {
    id: createSnapshotId(),
    version: state.snapshots.length + 1,
    listings,
    warnings: uniqueWarnings(chunks),
    sourceCounts,
    depth,
    partial,
    timestamp: Date.now(),
  };
  state.snapshots.push(snapshot);
  state.timestamp = Date.now();
  snapshotIndex.set(snapshot.id, { cacheKey, snapshot });
  cleanExpiredCache();
  return snapshot;
}

async function ensureInitialSnapshot(
  cacheKey: string,
  state: SearchState,
  args: Omit<ScrapeSearchArgs, 'startPage' | 'endPage' | 'targets' | 'timings'>,
  timings?: SearchDebugTimings,
): Promise<SearchSnapshot> {
  const latest = getLatestSnapshot(state);
  if (latest) return latest;

  await fetchSearchChunk(state, args, 1, INITIAL_SNAPSHOT_PAGES, timings);
  return createSnapshot(cacheKey, state, INITIAL_SNAPSHOT_PAGES, true);
}

function startBackgroundChunks(
  cacheKey: string,
  state: SearchState,
  args: Omit<ScrapeSearchArgs, 'startPage' | 'endPage' | 'targets' | 'timings'>,
): void {
  if (state.background) return;
  if (getLatestSnapshot(state)?.partial === false) return;

  state.background = (async () => {
    for (let startPage = INITIAL_SNAPSHOT_PAGES + 1; startPage <= BACKGROUND_MAX_PAGES; startPage += BACKGROUND_CHUNK_SIZE) {
      const endPage = Math.min(startPage + BACKGROUND_CHUNK_SIZE - 1, BACKGROUND_MAX_PAGES);
      const chunk = await fetchSearchChunk(state, args, startPage, endPage);
      const partial = endPage < BACKGROUND_MAX_PAGES && chunk.listings.length > 0;
      const snapshot = createSnapshot(cacheKey, state, endPage, partial);
      console.log(`[search] Background snapshot v${snapshot.version} completed (depth=${snapshot.depth}, listings=${snapshot.listings.length}, partial=${snapshot.partial})`);
      if (chunk.listings.length === 0) break;
    }
  })()
    .catch((err) => {
      console.error('[search] Background refresh failed:', err);
    })
    .finally(() => {
      state.background = undefined;
    });
}

function withSnapshotMetadata(response: SearchResponse, state: SearchState, snapshot: SearchSnapshot): SearchResponse {
  const latest = getLatestSnapshot(state) ?? snapshot;
  return {
    ...response,
    snapshotId: snapshot.id,
    snapshotVersion: snapshot.version,
    latestSnapshotId: latest.id,
    latestSnapshotVersion: latest.version,
    hasUpdate: latest.version > snapshot.version,
  };
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
  priceFrom: z.coerce.number().min(0).optional(),
  priceTo: z.coerce.number().min(0).optional(),
  fuel: z.string().optional(),
  snapshotId: z.string().optional(),
  debug: z.enum(['1', 'true']).optional(),
  noCache: z.enum(['1', 'true']).optional(),
}).refine((data) => data.priceFrom == null || data.priceTo == null || data.priceFrom <= data.priceTo, {
  message: 'priceFrom must be less than or equal to priceTo',
  path: ['priceTo'],
});

app.get('/api/search', async (req, res) => {
  const requestStarted = nowMs();
  const timings: SearchDebugTimings = {
    total: 0,
    geocode: 0,
    regionTargets: 0,
    autoscout: 0,
    subito: 0,
    postProcess: 0,
  };

  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid parameters',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { make, model, location, locationType, radius, page, pageSize, sort, yearFrom, yearTo, kmMax, priceFrom, priceTo, fuel, snapshotId, debug, noCache } = parsed.data;
  const debugEnabled = debug === '1' || debug === 'true';
  const bypassCache = noCache === '1' || noCache === 'true';

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
  console.log(`\n[search] make=${make} model=${model} location=${location ?? 'Tutta Italia'} type=${locationType ?? 'auto'} radius=${isRegionSearch ? 'N/A' : radius + 'km'} page=${page} sort=${sort} yearFrom=${yearFrom ?? '-'} yearTo=${yearTo ?? '-'} kmMax=${kmMax ?? '-'} priceFrom=${priceFrom ?? '-'} priceTo=${priceTo ?? '-'} fuel=${fuel ?? '-'}`);

  // Geocode location if provided
  let geo: GeoResult | null = null;
  if (location) {
    geo = await measure(timings, 'geocode', () => geocodeCity(location));
    if (geo) {
      console.log(`[search] Geocoded "${location}" → lat=${geo.lat}, lon=${geo.lon}, zip=${geo.postcode}, region=${geo.region}`);
    } else {
      console.log(`[search] Could not geocode "${location}" — searching without location filter`);
    }
  }

  const filters = { yearFrom, yearTo, kmMax, priceFrom, priceTo, fuel };
  const cacheKey = getCacheKey(make, model, location, locationType, radius, filters);

  const searchArgs = {
    make,
    model,
    location,
    radius,
    filters,
    geo,
    isRegionSearch,
    sort,
  };

  try {
    if (bypassCache && !snapshotId) {
      const existing = searchStates.get(cacheKey);
      if (existing) {
        for (const snapshot of existing.snapshots) snapshotIndex.delete(snapshot.id);
        searchStates.delete(cacheKey);
      }
    }

    let state = searchStates.get(cacheKey);
    if (!state) {
      state = createEmptyState();
      searchStates.set(cacheKey, state);
    }

    let snapshot: SearchSnapshot;
    let cacheDebug: 'hit' | 'miss' | 'bypass' = bypassCache ? 'bypass' : 'hit';

    if (snapshotId) {
      const indexed = snapshotIndex.get(snapshotId);
      if (!indexed || indexed.cacheKey !== cacheKey) {
        res.status(404).json({ error: 'Snapshot expired or not found' });
        return;
      }
      snapshot = indexed.snapshot;
    } else {
      const hadSnapshot = Boolean(getLatestSnapshot(state));
      snapshot = await ensureInitialSnapshot(cacheKey, state, searchArgs, timings);
      cacheDebug = bypassCache ? 'bypass' : hadSnapshot ? 'hit' : 'miss';
    }

    if (snapshot.partial) {
      startBackgroundChunks(cacheKey, state, searchArgs);
    }

    const response = paginateListings(snapshot.listings, snapshot.warnings, page, pageSize, sort, snapshot.partial, PARTIAL_REFRESH_AFTER_MS);
    const withSnapshot = withSnapshotMetadata(response, state, snapshot);
    res.json(withDebug(withSnapshot, debugEnabled, cacheDebug, timings, requestStarted, snapshot.sourceCounts));
  } catch (err) {
    console.error('[search] Search failed:', err);
    res.status(500).json({ error: 'Both scrapers failed', warnings: ['AutoScout24 scraping failed', 'Subito.it scraping failed'] });
  }
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
