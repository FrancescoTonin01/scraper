import type { SearchResponse } from './types.js';

type SearchDebug = NonNullable<SearchResponse['debug']>;
export type SearchDebugTimings = SearchDebug['timingsMs'];
export type CacheDebugStatus = 'hit' | 'miss' | 'bypass';

export function createSearchTimings(): SearchDebugTimings {
  return {
    total: 0,
    geocode: 0,
    regionTargets: 0,
    autoscout: 0,
    subito: 0,
    postProcess: 0,
  };
}

export function nowMs(): number {
  return Date.now();
}

export function elapsedMs(start: number): number {
  return Date.now() - start;
}

export async function measure<T>(timings: SearchDebugTimings, key: keyof SearchDebugTimings, fn: () => Promise<T>): Promise<T> {
  const start = nowMs();
  try {
    return await fn();
  } finally {
    timings[key] += elapsedMs(start);
  }
}

export function withDebug(
  response: SearchResponse,
  debugEnabled: boolean,
  cache: CacheDebugStatus,
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
