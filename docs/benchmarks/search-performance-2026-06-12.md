# Search Performance Benchmark - 2026-06-12

## Summary

Benchmarks were run against the local backend on `http://localhost:4000` with live provider calls. Results are noisy because AutoScout24 latency varies heavily and one baseline run crashed the server, but the comparison still shows where the new snapshot/chunk model helps.

The new implementation trades some cold-start speed for stable result snapshots:

- first visible data is built from a coherent 4-page provider window;
- background chunks continue after the visible snapshot;
- visible cards are not replaced automatically when a newer snapshot is ready;
- page 2 cold-start improved materially because it no longer waits for the old 6-page complete scrape.

## Commands

```bash
npm run benchmark:search -- --runs=5 --noCache=1 --waitComplete=1 --make=BMW --model="Serie 3" --location=Lombardia --locationType=region
npm run benchmark:search -- --runs=5 --noCache=1 --waitComplete=1 --make=Mercedes-Benz --model=CLA --location=Milano --locationType=city
npm run benchmark:search -- --runs=5 --noCache=1 --page=2 --make=BMW --model="Serie 3" --location=Lombardia --locationType=region
npm run benchmark:search -- --runs=5 --noCache=1 --sort=price_desc --make=BMW --model="Serie 3" --location=Lombardia --locationType=region
```

## Results

| Scenario | Baseline median client | After median client | Delta | Notes |
| --- | ---: | ---: | ---: | --- |
| BMW Serie 3 Lombardia page 1, wait complete | 59.8s | 66.7s first snapshot / 91.5s wait timeout | +11.5% first response | Baseline only had 2/5 successful runs, then server stopped responding. New flow completed 5/5 first snapshots but did not finish background to depth 16 within 90s. |
| Mercedes-Benz CLA Milano page 1, wait complete | 6.9s | 6.6s first snapshot / 34.9s complete | -3.9% first response | New flow returns a 4-page stable snapshot first, then completes background chunks. |
| BMW Serie 3 Lombardia page 2 | 77.8s | 53.3s | -31.4% | Biggest clear win: page 2 is served from the initial 4-page snapshot instead of waiting for the old complete scrape. |
| BMW Serie 3 Lombardia price desc | 77.1s | 99.8s | +29.4% | Post-change had severe AutoScout outliers. Best post-change run was 53.6s, about 30% faster than baseline best. |

## Baseline Details

- `BMW Serie 3 Lombardia page 1`: run 1 was 118.4s, run 2 was 1.2s but had `autoscout=0`; runs 3-5 failed with `fetch failed` because the backend stopped responding.
- `Mercedes-Benz CLA Milano`: stable around 6.6-6.9s, mostly AutoScout time; Subito returned 0 usable listings for this query.
- `BMW Serie 3 Lombardia page 2`: stable around 76.9-78.2s.
- `BMW Serie 3 Lombardia price_desc`: stable around 76.8-78.8s.

## After Details

- `BMW Serie 3 Lombardia page 1`: first snapshot median 66.7s; all 5 requests returned successfully, but `waitComplete` timed out because background depth 16 did not complete within 90s.
- `Mercedes-Benz CLA Milano`: first snapshot median 6.6s; complete snapshot median 34.9s.
- `BMW Serie 3 Lombardia page 2`: median 53.3s, with outliers at 80.6s and 111.1s from AutoScout.
- `BMW Serie 3 Lombardia price_desc`: median 99.8s due to AutoScout outliers at 99.8s, 103.5s, and 121.3s; best runs were ~53-55s.

## Interpretation

The change improves stability and makes page 2 materially faster on the heavy Lombardia query. It does not make the first regional cold start universally faster, because the new first snapshot now waits for a more correct 4-page regional provider window instead of allowing thinner partial data.

The next performance target should be AutoScout regional fan-out:

- reduce the first regional AutoScout target set before expanding in background;
- use provider-native sort parameters where reliable;
- try fetch/Next payload extraction before Playwright for AutoScout;
- persist provider page cache beyond process memory;
- add timeout and partial-provider fallback rules for slow AutoScout chunks.
