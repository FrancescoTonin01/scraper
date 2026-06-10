import type { CarListing, GeoResult, SearchFilters } from '../types.js';
import { getMakeSlug, getModelSlug } from '../data/modelSlugs.js';

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

function buildUrl(make: string, model: string, geo: GeoResult | null, page: number): string {
  const makePath = getMakeSlug(make);
  const modelPath = getModelSlug(make, model, 'subito');
  const regionSlug = getRegionSlug(geo);
  const base = `https://www.subito.it/annunci-${regionSlug}/vendita/auto/${encodeURIComponent(makePath)}/${encodeURIComponent(modelPath)}/`;
  if (page > 1) return `${base}?o=${page}`;
  return base;
}

function buildFallbackUrl(make: string, model: string, geo: GeoResult | null, page: number): string {
  const makePath = getMakeSlug(make);
  const regionSlug = getRegionSlug(geo);
  const base = `https://www.subito.it/annunci-${regionSlug}/vendita/auto/${encodeURIComponent(makePath)}/`;
  const params = new URLSearchParams({ q: model });
  if (page > 1) params.set('o', String(page));
  return `${base}?${params.toString()}`;
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

type UrlBuilder = (make: string, model: string, geo: GeoResult | null, page: number) => string;

async function fetchSubitoPages(
  urlBuilder: UrlBuilder,
  make: string,
  model: string,
  geo: GeoResult | null,
  maxPages: number,
): Promise<CarListing[]> {
  const listings: CarListing[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = urlBuilder(make, model, geo, page);
    console.log(`[subito] Page ${page}: ${url}`);

    try {
      const res = await fetch(url, { headers: SUBITO_HEADERS });

      if (!res.ok) {
        console.log(`[subito] HTTP ${res.status} on page ${page}, stopping.`);
        break;
      }

      const html = await res.text();
      const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
      if (!match) {
        console.log(`[subito] No __NEXT_DATA__ found on page ${page}, stopping.`);
        break;
      }

      const data = JSON.parse(match[1]);
      const items = data?.props?.pageProps?.initialState?.items;
      const ads: SubitoAd[] = items?.originalList ?? [];

      if (ads.length === 0) {
        console.log(`[subito] No ads on page ${page}, stopping.`);
        break;
      }

      for (const ad of ads) {
        if (ad.kind !== 'AdItem') continue;
        const listing = parseSubitoAd(ad);
        if (listing) listings.push(listing);
      }

      if (page >= (items?.totalPages ?? 1)) {
        console.log(`[subito] Reached last page (${page}).`);
        break;
      }
    } catch (err) {
      console.error(`[subito] Error fetching page ${page}:`, err);
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
): Promise<CarListing[]> {
  console.log(`[subito] Fetching up to ${maxPages} pages (region: ${geo?.region ?? 'italia'})...`);

  let allListings = await fetchSubitoPages(buildUrl, make, model, geo, maxPages);

  // Fallback: if model path returned nothing, retry with query-based search
  if (allListings.length === 0) {
    console.log(`[subito] Model path returned 0 results, retrying with ?q=${model} fallback...`);
    const fallbackListings = await fetchSubitoPages(buildFallbackUrl, make, model, geo, maxPages);
    // Filter by model name in title to avoid false positives
    const modelLower = model.toLowerCase();
    allListings = fallbackListings.filter((l) => l.title.toLowerCase().includes(modelLower));
    console.log(`[subito] Fallback found ${fallbackListings.length} total, ${allListings.length} matching "${model}"`);
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
