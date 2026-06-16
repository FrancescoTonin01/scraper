import type { AutoScoutSearchTarget } from './scrapers/autoscout.js';
import { scoreListings } from './searchResults.js';
import type { CarListing, SearchFilters, SearchResponse } from './types.js';
import { dedupeListings } from './utils/listings.js';

type SearchDebug = NonNullable<SearchResponse['debug']>;

export type SearchChunk = {
  listings: CarListing[];
  warnings: string[];
  sourceCounts: SearchDebug['sourceCounts'];
  startPage: number;
  endPage: number;
};

export type SearchSnapshot = {
  id: string;
  version: number;
  listings: CarListing[];
  warnings: string[];
  sourceCounts: SearchDebug['sourceCounts'];
  depth: number;
  partial: boolean;
  timestamp: number;
};

export type SearchState = {
  timestamp: number;
  chunks: Map<string, SearchChunk>;
  snapshots: SearchSnapshot[];
  background?: Promise<void>;
  targets?: AutoScoutSearchTarget[];
};

export const INITIAL_SNAPSHOT_PAGES = 4;
export const BACKGROUND_CHUNK_SIZE = 4;
export const BACKGROUND_MAX_PAGES = 16;
export const PARTIAL_REFRESH_AFTER_MS = 2500;
export const REGION_AUTOSCOUT_RADIUS_KM = 200;

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const searchStates = new Map<string, SearchState>();
const snapshotIndex = new Map<string, { cacheKey: string; snapshot: SearchSnapshot }>();
let snapshotSeq = 0;

export function getCacheKey(
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

export function getSearchState(cacheKey: string): SearchState | undefined {
  return searchStates.get(cacheKey);
}

export function setSearchState(cacheKey: string, state: SearchState): void {
  searchStates.set(cacheKey, state);
}

export function clearSearchState(cacheKey: string): void {
  const existing = searchStates.get(cacheKey);
  if (existing) {
    for (const snapshot of existing.snapshots) snapshotIndex.delete(snapshot.id);
    searchStates.delete(cacheKey);
  }
}

export function cleanExpiredCache(): void {
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

export function createSnapshotId(): string {
  snapshotSeq += 1;
  return `snap_${Date.now().toString(36)}_${snapshotSeq.toString(36)}`;
}

export function getLatestSnapshot(state: SearchState): SearchSnapshot | undefined {
  return state.snapshots[state.snapshots.length - 1];
}

export function getChunkKey(startPage: number, endPage: number): string {
  return `${startPage}-${endPage}`;
}

export function createEmptyState(): SearchState {
  return {
    timestamp: Date.now(),
    chunks: new Map(),
    snapshots: [],
  };
}

export function getIndexedSnapshot(snapshotId: string): { cacheKey: string; snapshot: SearchSnapshot } | undefined {
  return snapshotIndex.get(snapshotId);
}

export function createSnapshot(cacheKey: string, state: SearchState, depth: number, partial: boolean): SearchSnapshot {
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

function uniqueWarnings(chunks: SearchChunk[]): string[] {
  return [...new Set(chunks.flatMap((chunk) => chunk.warnings))];
}
