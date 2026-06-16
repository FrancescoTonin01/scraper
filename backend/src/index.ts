import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { scrapeAutoScoutPageRange, scrapeAutoScoutTargetsPageRange, type AutoScoutSearchTarget } from './scrapers/autoscout.js';
import { scrapeSubitoPageRange } from './scrapers/subito.js';
import { geocodeCity } from './utils/geocode.js';
import { isValidMake, isValidModelForMake } from './data/makes.js';
import { isValidLocation, isCityInRegion } from './data/locations.js';
import { isListingRelevantToModel } from './data/modelSlugs.js';
import { paginateListings, type SortOption } from './searchResults.js';
import { dedupeListings } from './utils/listings.js';
import { searchSchema } from './http/schemas.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerAlertRoutes } from './routes/alerts.js';
import { registerFeedbackRoutes } from './routes/feedback.js';
import {
  BACKGROUND_CHUNK_SIZE,
  BACKGROUND_MAX_PAGES,
  INITIAL_SNAPSHOT_PAGES,
  PARTIAL_REFRESH_AFTER_MS,
  REGION_AUTOSCOUT_RADIUS_KM,
  clearSearchState,
  createEmptyState,
  createSnapshot,
  getCacheKey,
  getChunkKey,
  getIndexedSnapshot,
  getLatestSnapshot,
  getSearchState,
  setSearchState,
  type SearchChunk,
  type SearchSnapshot,
  type SearchState,
} from './searchSession.js';
import {
  createSearchTimings,
  measure,
  nowMs,
  withDebug,
  type CacheDebugStatus,
  type SearchDebugTimings,
} from './searchTelemetry.js';
import type { CarListing, GeoResult, SearchFilters, SearchResponse } from './types.js';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT ?? 4000;

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

type SearchDebug = NonNullable<SearchResponse['debug']>;

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

app.get('/api/search', async (req, res) => {
  const requestStarted = nowMs();
  const timings = createSearchTimings();

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
      clearSearchState(cacheKey);
    }

    let state = getSearchState(cacheKey);
    if (!state) {
      state = createEmptyState();
      setSearchState(cacheKey, state);
    }

    let snapshot: SearchSnapshot;
    let cacheDebug: CacheDebugStatus = bypassCache ? 'bypass' : 'hit';

    if (snapshotId) {
      const indexed = getIndexedSnapshot(snapshotId);
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

const ADMIN_KEY = process.env.ADMIN_KEY ?? '';
registerAlertRoutes(app, prisma);
registerFeedbackRoutes(app, prisma);
registerAdminRoutes(app, prisma, ADMIN_KEY);

app.listen(PORT, () => {
  console.log(`\n🚗 Car Aggregator API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Search: http://localhost:${PORT}/api/search?make=BMW&model=i5\n`);
});
