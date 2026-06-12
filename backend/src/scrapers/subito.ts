import type { CarListing, GeoResult, SearchFilters } from '../types.js';
import { getMakeSlug, getModelSlug, isListingRelevantToModel } from '../data/modelSlugs.js';
import { getRegionForProvince } from '../data/locations.js';
import type { SortOption } from '../searchResults.js';

// Map Italian region names (from Nominatim) to Subito URL slugs
const REGION_SLUGS: Record<string, string> = {
  'Abruzzo': 'abruzzo',
  'Basilicata': 'basilicata',
  'Calabria': 'calabria',
  'Campania': 'campania',
  'Emilia-Romagna': 'emilia-romagna',
  'Friuli-Venezia Giulia': 'friuli-venezia-giulia',
  'Friuli Venezia Giulia': 'friuli-venezia-giulia',
  'Lazio': 'lazio',
  'Liguria': 'liguria',
  'Lombardia': 'lombardia',
  'Lombardy': 'lombardia',
  'Marche': 'marche',
  'Molise': 'molise',
  'Piemonte': 'piemonte',
  'Piedmont': 'piemonte',
  'Puglia': 'puglia',
  'Apulia': 'puglia',
  'Sardegna': 'sardegna',
  'Sardinia': 'sardegna',
  'Sicilia': 'sicilia',
  'Sicily': 'sicilia',
  'Toscana': 'toscana',
  'Tuscany': 'toscana',
  'Trentino-Alto Adige': 'trentino-alto-adige',
  'Trentino-Alto Adige/Südtirol': 'trentino-alto-adige',
  'Umbria': 'umbria',
  "Valle d'Aosta": 'valle-d-aosta',
  "Valle d'Aosta/Vallée d'Aoste": 'valle-d-aosta',
  'Veneto': 'veneto',
};

function getRegionSlug(geo: GeoResult | null): string {
  if (!geo?.region) return 'italia';
  if (REGION_SLUGS[geo.region]) return REGION_SLUGS[geo.region];
  const lower = geo.region.toLowerCase();
  for (const [key, slug] of Object.entries(REGION_SLUGS)) {
    if (key.toLowerCase() === lower) return slug;
  }
  return 'italia';
}

const PROVINCE_SLUG_OVERRIDES: Record<string, string> = {
  'monza e brianza': 'monza',
};

function slugifyProvince(province: string): string {
  const lower = province.toLowerCase();
  if (PROVINCE_SLUG_OVERRIDES[lower]) return PROVINCE_SLUG_OVERRIDES[lower];
  return lower
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getProvinceSlug(location: string | undefined, geo: GeoResult | null): string | null {
  if (!location) return null;
  if (!getRegionForProvince(location)) return null;
  const regionSlug = getRegionSlug(geo);
  if (regionSlug === 'italia') return null;
  return slugifyProvince(location);
}

function getSubitoOrder(sort: SortOption | undefined): string | null {
  if (sort === 'price_asc') return 'priceasc';
  if (sort === 'price_desc') return 'pricedesc';
  return null;
}

function appendSubitoQuery(base: string, page: number, sort?: SortOption, extra?: Record<string, string>): string {
  const params = new URLSearchParams(extra);
  const order = getSubitoOrder(sort);
  if (order) params.set('order', order);
  if (page > 1) params.set('o', String(page));
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function buildSubitoUrl(make: string, model: string, geo: GeoResult | null, page: number, location?: string, sort?: SortOption): string {
  const makePath = getMakeSlug(make);
  const modelPath = getModelSlug(make, model, 'subito');
  const regionSlug = getRegionSlug(geo);
  const provinceSlug = getProvinceSlug(location, geo);
  const locationPath = provinceSlug ? `${provinceSlug}/` : '';
  const base = `https://www.subito.it/annunci-${regionSlug}/vendita/auto/${locationPath}${encodeURIComponent(makePath)}/${encodeURIComponent(modelPath)}/`;
  return appendSubitoQuery(base, page, sort);
}

export function buildSubitoFallbackUrl(make: string, model: string, geo: GeoResult | null, page: number, location?: string, sort?: SortOption): string {
  const makePath = getMakeSlug(make);
  const regionSlug = getRegionSlug(geo);
  const provinceSlug = getProvinceSlug(location, geo);
  const locationPath = provinceSlug ? `${provinceSlug}/` : '';
  const base = `https://www.subito.it/annunci-${regionSlug}/vendita/auto/${locationPath}${encodeURIComponent(makePath)}/`;
  return appendSubitoQuery(base, page, sort, { q: model });
}

function getFeatureValue(features: Record<string, unknown>, key: string): string | null {
  const feat = features?.[key] as { values?: { value?: string }[] } | undefined;
  return feat?.values?.[0]?.value ?? null;
}

interface SubitoAd {
  kind: string;
  subject?: string;
  features?: Record<string, unknown>;
  geo?: {
    town?: { value?: string };
    city?: { shortName?: string };
  };
  images?: { cdnBaseUrl?: string }[];
  urls?: { default?: string };
}

function parseSubitoAd(ad: SubitoAd): CarListing | null {
  if (!ad.subject || !ad.urls?.default) return null;

  const features = ad.features ?? {};

  // Price
  const priceStr = getFeatureValue(features, '/price');
  const priceNum = priceStr ? parseInt(priceStr.replace(/[^0-9]/g, ''), 10) : null;
  const price = priceNum && !isNaN(priceNum) ? priceNum : null;

  // Year
  const yearStr = getFeatureValue(features, '/year');
  const yearNum = yearStr ? parseInt(yearStr, 10) : null;
  const year = yearNum && !isNaN(yearNum) ? yearNum : null;

  // Mileage — "/mileage_scalar" gives exact value like "65200 Km"
  const mileageStr = getFeatureValue(features, '/mileage_scalar');
  let mileage: number | null = null;
  if (mileageStr) {
    const kmMatch = mileageStr.replace(/\./g, '').match(/(\d+)/);
    if (kmMatch) mileage = parseInt(kmMatch[1], 10);
  }

  // Fuel & transmission
  const fuel = getFeatureValue(features, '/fuel');
  const transmission = getFeatureValue(features, '/gearbox');

  // City
  const town = ad.geo?.town?.value;
  const province = ad.geo?.city?.shortName;
  const city = town && province ? `${town} (${province})` : town ?? null;

  // Image (append Subito CDN resize rule)
  const imageUrl = ad.images?.[0]?.cdnBaseUrl
    ? `${ad.images[0].cdnBaseUrl}?rule=gallery-desktop-2x-auto`
    : null;

  return {
    source: 'subito',
    title: ad.subject,
    price,
    mileage,
    year,
    fuel,
    transmission,
    city,
    imageUrl,
    originalUrl: ad.urls.default,
  };
}

const SUBITO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

type UrlBuilder = (make: string, model: string, geo: GeoResult | null, page: number, location?: string, sort?: SortOption) => string;

const SUBITO_PAGE_CONCURRENCY = 3;

async function runLimited<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}

type SubitoPageResult = {
  page: number;
  listings: CarListing[];
  ok: boolean;
  totalPages: number;
};

async function fetchSubitoPage(
  urlBuilder: UrlBuilder,
  make: string,
  model: string,
  geo: GeoResult | null,
  page: number,
  location?: string,
  sort?: SortOption,
): Promise<SubitoPageResult> {
  const url = urlBuilder(make, model, geo, page, location, sort);
  console.log(`[subito] Page ${page}: ${url}`);

  try {
    const res = await fetch(url, { headers: SUBITO_HEADERS });

    if (!res.ok) {
      console.log(`[subito] HTTP ${res.status} on page ${page}.`);
      return { page, listings: [], ok: false, totalPages: page };
    }

    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
    if (!match) {
      console.log(`[subito] No __NEXT_DATA__ found on page ${page}.`);
      return { page, listings: [], ok: false, totalPages: page };
    }

    const data = JSON.parse(match[1]);
    const items = data?.props?.pageProps?.initialState?.items;
    const ads: SubitoAd[] = items?.originalList ?? [];

    if (ads.length === 0) {
      console.log(`[subito] No ads on page ${page}.`);
      return { page, listings: [], ok: false, totalPages: items?.totalPages ?? page };
    }

    const listings = ads
      .filter((ad) => ad.kind === 'AdItem')
      .map((ad) => parseSubitoAd(ad))
      .filter((listing): listing is CarListing => listing !== null);

    return {
      page,
      listings,
      ok: true,
      totalPages: items?.totalPages ?? page,
    };
  } catch (err) {
    console.error(`[subito] Error fetching page ${page}:`, err);
    return { page, listings: [], ok: false, totalPages: page };
  }
}

async function fetchSubitoPages(
  urlBuilder: UrlBuilder,
  make: string,
  model: string,
  geo: GeoResult | null,
  startPage: number,
  endPage: number,
  location?: string,
  sort?: SortOption,
): Promise<CarListing[]> {
  const listings: CarListing[] = [];
  const pages = Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
  const pageResults = await runLimited(pages, SUBITO_PAGE_CONCURRENCY, (page) => (
    fetchSubitoPage(urlBuilder, make, model, geo, page, location, sort)
  ));

  for (const result of pageResults.sort((a, b) => a.page - b.page)) {
    if (!result.ok || result.page > result.totalPages) break;
    listings.push(...result.listings);

    if (result.page >= result.totalPages) {
      console.log(`[subito] Reached last page (${result.page}).`);
      break;
    }
  }

  return listings;
}

export async function scrapeSubito(
  make: string,
  model: string,
  geo: GeoResult | null = null,
  maxPages: number = 1,
  filters?: SearchFilters,
  location?: string,
  sort?: SortOption,
): Promise<CarListing[]> {
  return scrapeSubitoPageRange(make, model, geo, 1, maxPages, filters, location, sort);
}

export async function scrapeSubitoPageRange(
  make: string,
  model: string,
  geo: GeoResult | null = null,
  startPage: number = 1,
  endPage: number = 1,
  filters?: SearchFilters,
  location?: string,
  sort?: SortOption,
): Promise<CarListing[]> {
  const provinceSlug = getProvinceSlug(location, geo);
  console.log(`[subito] Fetching pages ${startPage}-${endPage} (region: ${geo?.region ?? 'italia'}${provinceSlug ? `, province: ${provinceSlug}` : ''})...`);

  let allListings = await fetchSubitoPages(buildSubitoUrl, make, model, geo, startPage, endPage, location, sort);

  // Fallback: if model path returned nothing, retry with query-based search
  if (allListings.length === 0 && startPage === 1) {
    console.log(`[subito] Model path returned 0 results, retrying with ?q=${model} fallback...`);
    const fallbackListings = await fetchSubitoPages(buildSubitoFallbackUrl, make, model, geo, startPage, endPage, location, sort);
    allListings = fallbackListings.filter((l) => isListingRelevantToModel(make, model, l.title));
    console.log(`[subito] Fallback found ${fallbackListings.length} total, ${allListings.length} matching "${model}"`);
  }

  if (provinceSlug && allListings.length === 0 && startPage === 1) {
    console.log(`[subito] Province path returned 0 matching results, falling back to regional search...`);
    const regionalListings = await fetchSubitoPages(buildSubitoUrl, make, model, geo, startPage, endPage, undefined, sort);
    allListings = regionalListings;
  }

  // Apply post-scrape filters
  let filtered = allListings;
  if (filters) {
    if (filters.yearFrom) {
      filtered = filtered.filter((l) => l.year != null && l.year >= filters.yearFrom!);
    }
    if (filters.yearTo) {
      filtered = filtered.filter((l) => l.year != null && l.year <= filters.yearTo!);
    }
    if (filters.kmMax) {
      filtered = filtered.filter((l) => l.mileage != null && l.mileage <= filters.kmMax!);
    }
    if (filters.priceFrom) {
      filtered = filtered.filter((l) => l.price != null && l.price >= filters.priceFrom!);
    }
    if (filters.priceTo) {
      filtered = filtered.filter((l) => l.price != null && l.price <= filters.priceTo!);
    }
    if (filters.fuel) {
      const fuelLower = filters.fuel.toLowerCase();
      filtered = filtered.filter((l) => {
        if (!l.fuel) return false;
        const listingFuel = l.fuel.toLowerCase();
        if (fuelLower === 'ibrida') return listingFuel.includes('ibrida') || listingFuel.includes('elettrica/');
        return listingFuel.includes(fuelLower);
      });
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = filtered.filter((l) => {
    if (seen.has(l.originalUrl)) return false;
    seen.add(l.originalUrl);
    return true;
  });

  console.log(`[subito] Found ${unique.length} unique listings total`);
  return unique;
}
