type DebugPayload = {
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

type SearchResponse = {
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
  debug?: DebugPayload;
};

type RunResult = {
  run: number;
  ok: boolean;
  clientMs: number;
  status: number;
  total?: number;
  firstTotal?: number;
  warnings?: string[];
  partial?: boolean;
  firstPartial?: boolean;
  debug?: DebugPayload;
  completeClientMs?: number;
  snapshotVersion?: number;
  latestSnapshotVersion?: number;
  hasUpdate?: boolean;
  error?: string;
};

const args = new Map<string, string>();
for (const arg of process.argv.slice(2)) {
  const [key, value = ''] = arg.split('=');
  args.set(key.replace(/^--/, ''), value);
}

const runs = Number(args.get('runs') ?? '3');
const baseUrl = args.get('baseUrl') ?? process.env.API_BASE ?? 'http://localhost:4000';
const path = args.get('path') ?? '/api/search';
const noCache = args.get('noCache') ?? '1';
const waitComplete = args.get('waitComplete') === '1' || args.get('waitComplete') === 'true';
const maxWaitMs = Number(args.get('maxWaitMs') ?? '90000');

const params = new URLSearchParams({
  make: args.get('make') ?? 'BMW',
  model: args.get('model') ?? 'Serie 3',
  location: args.get('location') ?? 'Lombardia',
  locationType: args.get('locationType') ?? 'region',
  radius: args.get('radius') ?? '100',
  page: args.get('page') ?? '1',
  sort: args.get('sort') ?? 'price_asc',
  debug: '1',
});
if (noCache !== '0' && noCache !== 'false') params.set('noCache', noCache);

const url = `${baseUrl}${path}?${params.toString()}`;

function buildPollUrl(body: SearchResponse): string {
  const pollParams = new URLSearchParams(params);
  pollParams.delete('noCache');
  if (body.snapshotId) pollParams.set('snapshotId', body.snapshotId);
  return `${baseUrl}${path}?${pollParams.toString()}`;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function round(value: number): number {
  return Math.round(value);
}

function summarize(label: string, values: number[]): string {
  if (values.length === 0) return `${label}: n/a`;
  return `${label}: median=${round(median(values))}ms best=${round(Math.min(...values))}ms worst=${round(Math.max(...values))}ms`;
}

async function runBenchmark(run: number): Promise<RunResult> {
  const started = performance.now();
  try {
    const res = await fetch(url);
    const clientMs = performance.now() - started;
    const body = await res.json().catch(() => ({})) as SearchResponse & { error?: string };

    if (waitComplete && body.partial && res.ok) {
      let latest = body;
      let completeClientMs = clientMs;

      while (latest.partial && completeClientMs < maxWaitMs) {
        await new Promise((resolve) => setTimeout(resolve, latest.refreshAfterMs ?? 2500));
        const pollRes = await fetch(buildPollUrl(latest));
        latest = await pollRes.json().catch(() => ({})) as SearchResponse & { error?: string };
        completeClientMs = performance.now() - started;
        if (latest.hasUpdate && latest.latestSnapshotId) {
          latest = {
            ...latest,
            snapshotId: latest.latestSnapshotId,
            partial: true,
          };
        }
      }

      return {
        run,
        ok: res.ok,
        clientMs,
        completeClientMs,
        status: res.status,
        total: latest.total ?? body.total,
        firstTotal: body.total,
        warnings: latest.warnings ?? body.warnings,
        partial: latest.partial,
        firstPartial: body.partial,
        debug: latest.debug ?? body.debug,
        snapshotVersion: latest.snapshotVersion ?? body.snapshotVersion,
        latestSnapshotVersion: latest.latestSnapshotVersion ?? body.latestSnapshotVersion,
        hasUpdate: latest.hasUpdate,
        error: latest.partial ? 'Timed out waiting for complete results' : latest.error,
      };
    }

    return {
      run,
      ok: res.ok,
      clientMs,
      status: res.status,
      total: body.total,
      firstTotal: body.total,
      warnings: body.warnings,
      partial: body.partial,
      firstPartial: body.partial,
      debug: body.debug,
      snapshotVersion: body.snapshotVersion,
      latestSnapshotVersion: body.latestSnapshotVersion,
      hasUpdate: body.hasUpdate,
      error: body.error,
    };
  } catch (err) {
    return {
      run,
      ok: false,
      clientMs: performance.now() - started,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main(): Promise<void> {
  console.log(`Benchmark URL: ${url}`);
  console.log(`Runs: ${runs}`);

  const results: RunResult[] = [];
  for (let i = 1; i <= runs; i++) {
    const result = await runBenchmark(i);
    results.push(result);

    const debug = result.debug;
    const timing = debug
      ? `server=${debug.timingsMs.total}ms geocode=${debug.timingsMs.geocode}ms regionTargets=${debug.timingsMs.regionTargets}ms autoscout=${debug.timingsMs.autoscout}ms subito=${debug.timingsMs.subito}ms post=${debug.timingsMs.postProcess}ms cache=${debug.cache} sources=${debug.sourceCounts.autoscout}/${debug.sourceCounts.subito}/${debug.sourceCounts.combined}`
      : 'server=n/a';

    console.log(
      `Run ${result.run}: status=${result.status} ok=${result.ok} client=${round(result.clientMs)}ms${result.completeClientMs ? ` complete=${round(result.completeClientMs)}ms` : ''} firstTotal=${result.firstTotal ?? result.total ?? 'n/a'} firstPartial=${result.firstPartial ? 'true' : 'false'} total=${result.total ?? 'n/a'} partial=${result.partial ? 'true' : 'false'} snapshot=${result.snapshotVersion ?? 'n/a'} latest=${result.latestSnapshotVersion ?? 'n/a'} update=${result.hasUpdate ? 'true' : 'false'} ${timing}${result.error ? ` error=${result.error}` : ''}`,
    );
  }

  const successful = results.filter((result) => result.ok);
  console.log('');
  console.log('Summary');
  console.log(summarize('client', successful.map((result) => result.clientMs)));
  console.log(summarize('complete', successful.flatMap((result) => result.completeClientMs ? [result.completeClientMs] : [])));
  console.log(summarize('server', successful.flatMap((result) => result.debug ? [result.debug.timingsMs.total] : [])));
  console.log(summarize('autoscout', successful.flatMap((result) => result.debug ? [result.debug.timingsMs.autoscout] : [])));
  console.log(summarize('subito', successful.flatMap((result) => result.debug ? [result.debug.timingsMs.subito] : [])));
  console.log(summarize('geocode', successful.flatMap((result) => result.debug ? [result.debug.timingsMs.geocode + result.debug.timingsMs.regionTargets] : [])));

  if (successful.length !== results.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
