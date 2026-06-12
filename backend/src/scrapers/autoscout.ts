import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { CarListing, GeoResult, SearchFilters } from '../types.js';
import { getMakeSlug, getModelSlug } from '../data/modelSlugs.js';
import type { SortOption } from '../searchResults.js';

// Map fuel filter values to AutoScout24 URL parameter codes
const FUEL_MAP: Record<string, string> = {
  benzina: 'B',
  diesel: 'D',
  elettrica: 'E',
  gpl: 'L',
  metano: 'M',
  ibrida: '2', // Ibrida benzina; '3' = ibrida diesel
};

const AUTOSCOUT_CONTEXT_OPTIONS = {
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  locale: 'it-IT',
};
const AUTOSCOUT_PAGE_CONCURRENCY = 2;

let browserPromise: Promise<Browser> | null = null;

async function getSharedBrowser(): Promise<Browser> {
  if (browserPromise) {
    const browser = await browserPromise;
    if (browser.isConnected()) return browser;
    browserPromise = null;
  }

  browserPromise = chromium.launch({ headless: true });
  return browserPromise;
}

async function createSearchContext(): Promise<BrowserContext> {
  const browser = await getSharedBrowser();
  return browser.newContext(AUTOSCOUT_CONTEXT_OPTIONS);
}

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

async function resetSharedBrowser(): Promise<void> {
  const browser = browserPromise ? await browserPromise.catch(() => null) : null;
  browserPromise = null;

  if (browser?.isConnected()) {
    await browser.close().catch(() => undefined);
  }
}

export async function closeAutoScoutBrowser(): Promise<void> {
  await resetSharedBrowser();
}

export type AutoScoutSearchTarget = {
  label: string;
  geo: GeoResult | null;
  radius: number;
};

type AutoScoutVehicleDetail = {
  data?: string;
  iconName?: string;
  ariaLabel?: string;
};

type AutoScoutJsonListing = {
  images?: string[];
  price?: {
    priceFormatted?: string;
  };
  url?: string;
  vehicle?: {
    make?: string;
    model?: string;
    modelVersionInput?: string;
    transmission?: string;
    fuel?: string;
    mileageInKm?: string;
  };
  location?: {
    city?: string;
  };
  tracking?: {
    firstRegistration?: string;
    mileage?: string;
    price?: string;
  };
  vehicleDetails?: AutoScoutVehicleDetail[];
};

export function buildUrl(
  make: string,
  model: string,
  geo: GeoResult | null,
  radius: number,
  page: number,
  filters?: SearchFilters,
  sort?: SortOption,
): string {
  const makePath = getMakeSlug(make);
  const modelPath = getModelSlug(make, model, 'autoscout');
  const base = `https://www.autoscout24.it/lst/${encodeURIComponent(makePath)}/${encodeURIComponent(modelPath)}`;

  const params = new URLSearchParams({
    sort: sort === 'price_asc' || sort === 'price_desc' ? 'price' : 'standard',
    desc: sort === 'price_desc' ? '1' : '0',
    ustate: 'N,U',
    size: '20',
    page: String(page),
    cy: 'I',
    atype: 'C',
  });

  if (geo?.postcode) {
    params.set('zip', geo.postcode);
    params.set('zipr', String(radius));
  } else if (geo) {
    params.set('lat', String(geo.lat));
    params.set('lon', String(geo.lon));
    params.set('zipr', String(radius));
  }

  // Advanced filters
  if (filters?.yearFrom) params.set('fregfrom', String(filters.yearFrom));
  if (filters?.yearTo) params.set('fregto', String(filters.yearTo));
  if (filters?.kmMax) params.set('kmto', String(filters.kmMax));
  if (filters?.priceFrom) params.set('pricefrom', String(filters.priceFrom));
  if (filters?.priceTo) params.set('priceto', String(filters.priceTo));
  if (filters?.fuel) {
    const fuelCode = FUEL_MAP[filters.fuel.toLowerCase()];
    if (fuelCode) params.set('fuel', fuelCode);
  }

  return `${base}?${params.toString()}`;
}

export function parsePrice(text: string | null): number | null {
  if (!text) return null;
  // Match Italian price format: 1-3 digits optionally followed by .XXX groups
  // This avoids capturing footnote markers appended to the price (e.g. "14.4001" → 14400)
  const match = text.match(/(\d{1,3}(?:\.\d{3})*)/);
  if (!match) return null;
  const num = parseInt(match[1].replace(/\./g, ''), 10);
  return isNaN(num) ? null : num;
}

/** Parse date (MM/YYYY) and mileage from concatenated text like "01/20265 km" */
export function parseDateAndMileage(text: string): { year: number | null; mileage: number | null } {
  // Primary: match MM/YYYY immediately followed by mileage digits + "km"
  const combined = text.match(/(\d{2})\/(\d{4})([\d.]*\d)\s*km/i);
  if (combined) {
    return {
      year: parseInt(combined[2], 10),
      mileage: parseInt(combined[3].replace(/\./g, ''), 10),
    };
  }

  // Fallback: extract year and mileage separately
  const yearMatch = text.match(/(\d{2})\/(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[2], 10) : null;

  // Look for standalone mileage pattern (digits with dot-separators + km)
  const kmMatch = text.match(/(?:^|[^\d/])([\d.]+)\s*km/i);
  let mileage: number | null = null;
  if (kmMatch) {
    const raw = kmMatch[1].replace(/\./g, '');
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num < 1_000_000) mileage = num;
  }

  return { year, mileage };
}

export function parseFuel(text: string | null): string | null {
  if (!text) return null;
  const fuels = ['Elettrica/Benzina', 'Elettrica/Diesel', 'Benzina', 'Diesel', 'GPL', 'Metano', 'Elettrica', 'Ibrida'];
  for (const fuel of fuels) {
    if (text.includes(fuel)) return fuel;
  }
  return null;
}

export function extractCity(text: string): string | null {
  // AutoScout format: "IT-{ZIP} {City} - {Province} - {Code}" or "IT-{ZIP} {City} - {Code}"
  const match = text.match(/IT-\d{5}\s+(.+?)(?:\s+-\s+[A-Za-zÀ-ÿ\s'.-]+)?\s+-\s+([A-Z]{2})/);
  if (match) return `${match[1].trim()} (${match[2]})`;

  // Simpler fallback: "IT-{ZIP} {City}"
  const simple = text.match(/IT-\d{5}\s+([A-Za-zÀ-ÿ\s'.-]+?)(?:\s*[-\[+]|$)/);
  if (simple) return simple[1].trim();

  return null;
}

function getVehicleDetail(listing: AutoScoutJsonListing, label: string): string | null {
  const detail = listing.vehicleDetails?.find((item) => item.ariaLabel === label || item.iconName === label);
  return detail?.data ?? null;
}

function parseNumberText(text: string | null | undefined): number | null {
  if (!text) return null;
  const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? null : num;
}

function parseRegistrationYear(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = text.match(/(?:\d{2})[-/](\d{4})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  return isNaN(year) ? null : year;
}

function normalizeAutoScoutImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.includes('autoscout24.net')) {
    return imageUrl
      .replace(/_\d+x\d+\./, '_1280x960.')
      .replace(/\/\d+x\d+\.webp$/, '/1280x960.webp');
  }
  return imageUrl;
}

function getImageArea(imageUrl: string): number {
  const match = imageUrl.match(/(?:_|\/)(\d{2,4})x(\d{2,4})(?:\.|\/)/);
  if (!match) return 0;
  return Number(match[1]) * Number(match[2]);
}

function selectBestAutoScoutImage(images: string[] | undefined): string | null {
  if (!images || images.length === 0) return null;
  const best = [...images].sort((a, b) => getImageArea(b) - getImageArea(a))[0];
  return normalizeAutoScoutImageUrl(best);
}

function formatAutoScoutCity(city: string | null | undefined): string | null {
  if (!city) return null;
  const withProvinceCode = city.match(/^(.+?)\s+-\s+.+?\s+-\s+([A-Z]{2})$/);
  if (withProvinceCode) return `${withProvinceCode[1].trim()} (${withProvinceCode[2]})`;
  return city.trim();
}

function buildAutoScoutTitle(listing: AutoScoutJsonListing): string {
  const parts = [
    listing.vehicle?.make,
    listing.vehicle?.model,
    listing.vehicle?.modelVersionInput,
  ].filter((part): part is string => Boolean(part?.trim()));

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function parseAutoScoutJsonListing(listing: AutoScoutJsonListing): CarListing | null {
  if (!listing.url) return null;

  const title = buildAutoScoutTitle(listing);
  if (!title) return null;

  const registration = listing.tracking?.firstRegistration ?? getVehicleDetail(listing, 'Anno');
  const mileage = parseNumberText(listing.tracking?.mileage ?? listing.vehicle?.mileageInKm ?? getVehicleDetail(listing, 'Chilometraggio'));
  const price = parseNumberText(listing.tracking?.price) ?? parsePrice(listing.price?.priceFormatted ?? null);
  const href = listing.url.startsWith('http') ? listing.url : `https://www.autoscout24.it${listing.url}`;

  return {
    source: 'autoscout',
    title,
    price,
    mileage,
    year: parseRegistrationYear(registration),
    fuel: listing.vehicle?.fuel ?? getVehicleDetail(listing, 'Carburante'),
    transmission: listing.vehicle?.transmission ?? getVehicleDetail(listing, 'Cambio'),
    city: formatAutoScoutCity(listing.location?.city),
    imageUrl: selectBestAutoScoutImage(listing.images),
    originalUrl: href,
  };
}

export function parseAutoScoutNextData(raw: string | null): CarListing[] {
  if (!raw) return [];

  try {
    const data = JSON.parse(raw);
    const listings: AutoScoutJsonListing[] = data?.props?.pageProps?.listings ?? [];
    return listings
      .map((listing) => parseAutoScoutJsonListing(listing))
      .filter((listing): listing is CarListing => listing !== null);
  } catch {
    return [];
  }
}

async function scrapePage(browserPage: Page): Promise<CarListing[]> {
  try {
    await browserPage.waitForSelector('article', { timeout: 10000 });
  } catch {
    return [];
  }

  const nextData = await browserPage.locator('script#__NEXT_DATA__').textContent({ timeout: 5000 }).catch(() => null);
  const jsonListings = parseAutoScoutNextData(nextData);
  if (jsonListings.length > 0) return jsonListings;

  const listings = await browserPage.$$eval('article', (articles) => {
    return articles.map((article) => {
      const linkEl = article.querySelector('a[href*="/annunci/"], a[href*="/offerte/"]') ||
                     article.querySelector('a[href^="https://www.autoscout24.it/annunci/"]');
      if (!linkEl) return null;
      const href = linkEl.getAttribute('href') ?? '';
      const fullUrl = href.startsWith('http') ? href : `https://www.autoscout24.it${href}`;

      const titleEl = article.querySelector('h2') || article.querySelector('[data-testid="title"]');
      const title = titleEl?.textContent?.trim() ?? '';

      const priceEl = article.querySelector('[data-testid="price"]') ||
                      article.querySelector('p[class*="Price"]') ||
                      article.querySelector('span[class*="Price"]');
      const priceText = priceEl?.textContent?.trim() ?? null;

      // Try to get high-res image from <picture> srcset, data-src, or img src
      let imageUrl: string | null = null;
      const sourceEl = article.querySelector('picture source[type="image/webp"]');
      if (sourceEl) {
        const srcset = sourceEl.getAttribute('srcset');
        if (srcset) {
          // Pick the largest from srcset (last entry or highest resolution)
          const urls = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
          imageUrl = urls[urls.length - 1] || null;
        }
      }
      if (!imageUrl) {
        const imgEl = article.querySelector('img');
        imageUrl = imgEl?.getAttribute('data-src') ?? imgEl?.getAttribute('src') ?? null;
      }
      // Upscale AutoScout CDN thumbnails to larger size for better quality
      if (imageUrl && imageUrl.includes('autoscout24.net')) {
        imageUrl = imageUrl.replace(/_\d+x\d+\./, '_1280x960.');
      }

      const metaText = article.textContent ?? '';

      // Extract transmission from multiple sources:
      // 1) Title-level keywords like "Auto" (short for automatico), "Steptronic", etc.
      // 2) Full article text for "Cambio automatico" / "Cambio manuale"
      let transmissionText: string | null = null;
      const titleText = (article.querySelector('h2')?.textContent ?? '').toLowerCase();
      const metaLower = metaText.toLowerCase();

      // Check title for short keywords (safe — title is small, no false matches)
      const titleHasAuto = /\bauto\b/.test(titleText) || /\bautomatico\b/.test(titleText) || /\bautomatica\b/.test(titleText) || /\bsteptronic\b/.test(titleText) || /\bdsg\b/.test(titleText) || /\bpdk\b/.test(titleText) || /\bs[ -]?tronic\b/.test(titleText) || /\btiptronic\b/.test(titleText);
      // Check full text for structured "Cambio ..." fields
      const textHasAuto = /cambio\s+automatico/.test(metaLower) || /\bautomatico\b/.test(metaLower) || /\bautomatica\b/.test(metaLower) || /\bsteptronic\b/.test(metaLower) || /\bdsg\b/.test(metaLower) || /\bpdk\b/.test(metaLower) || /\bs[ -]?tronic\b/.test(metaLower) || /\btiptronic\b/.test(metaLower);

      if (titleHasAuto || textHasAuto) {
        transmissionText = 'Automatico';
      } else if (/\bmanuale\b/.test(titleText) || /cambio\s+manuale/.test(metaLower) || /\bmanuale\b/.test(metaLower)) {
        transmissionText = 'Manuale';
      }

      return { title, priceText, imageUrl, originalUrl: fullUrl, metaText, transmissionText };
    });
  });

  return listings
    .filter((l): l is NonNullable<typeof l> => l !== null && !!l.title && !!l.originalUrl)
    .map((l) => {
      const { year, mileage } = parseDateAndMileage(l.metaText);
      // Use structured transmission from DOM extraction
      const transmission = l.transmissionText;
      return {
        source: 'autoscout' as const,
        title: l.title,
        price: parsePrice(l.priceText),
        mileage,
        year,
        fuel: parseFuel(l.metaText),
        transmission,
        city: extractCity(l.metaText),
        imageUrl: l.imageUrl,
        originalUrl: l.originalUrl,
      };
    });
}

type AutoScoutPageJob = {
  target: AutoScoutSearchTarget;
  page: number;
};

type AutoScoutPageResult = {
  targetLabel: string;
  page: number;
  listings: CarListing[];
};

async function scrapeAutoScoutPageJob(
  context: BrowserContext,
  make: string,
  model: string,
  filters: SearchFilters | undefined,
  sort: SortOption | undefined,
  job: AutoScoutPageJob,
): Promise<AutoScoutPageResult> {
  const browserPage = await context.newPage();
  const url = buildUrl(make, model, job.target.geo, job.target.radius, job.page, filters, sort);
  console.log(`[autoscout] Page ${job.page} (${job.target.label}): ${url}`);

  try {
    await browserPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await browserPage.waitForTimeout(1500);

    const listings = await scrapePage(browserPage);
    if (listings.length === 0) {
      console.log(`[autoscout] No listings on page ${job.page} for ${job.target.label}.`);
    }

    return {
      targetLabel: job.target.label,
      page: job.page,
      listings,
    };
  } finally {
    await browserPage.close().catch(() => undefined);
  }
}

export async function scrapeAutoScout(
  make: string,
  model: string,
  geo: GeoResult | null,
  radius: number,
  maxPages: number = 1,
  filters?: SearchFilters,
  sort?: SortOption,
): Promise<CarListing[]> {
  const label = geo?.postcode ? `zip ${geo.postcode}` : 'italia';
  return scrapeAutoScoutTargetsPageRange(make, model, [{ label, geo, radius }], 1, maxPages, filters, sort);
}

export async function scrapeAutoScoutTargets(
  make: string,
  model: string,
  targets: AutoScoutSearchTarget[],
  maxPages: number = 1,
  filters?: SearchFilters,
  sort?: SortOption,
): Promise<CarListing[]> {
  return scrapeAutoScoutTargetsPageRange(make, model, targets, 1, maxPages, filters, sort);
}

export async function scrapeAutoScoutPageRange(
  make: string,
  model: string,
  geo: GeoResult | null,
  radius: number,
  startPage: number,
  endPage: number,
  filters?: SearchFilters,
  sort?: SortOption,
): Promise<CarListing[]> {
  const label = geo?.postcode ? `zip ${geo.postcode}` : 'italia';
  return scrapeAutoScoutTargetsPageRange(make, model, [{ label, geo, radius }], startPage, endPage, filters, sort);
}

export async function scrapeAutoScoutTargetsPageRange(
  make: string,
  model: string,
  targets: AutoScoutSearchTarget[],
  startPage: number,
  endPage: number,
  filters?: SearchFilters,
  sort?: SortOption,
): Promise<CarListing[]> {
  const maxPages = Math.max(startPage, endPage);
  const firstPage = Math.max(1, startPage);
  console.log(`[autoscout] Scraping ${targets.length} target(s), up to ${maxPages} pages each...`);

  let context: BrowserContext | null = null;

  try {
    context = await createSearchContext();
    const allListings: CarListing[] = [];
    const jobs: AutoScoutPageJob[] = [];

    for (const target of targets) {
      console.log(`[autoscout] Target: ${target.label}`);
      for (let page = firstPage; page <= endPage; page++) {
        jobs.push({ target, page });
      }
    }

    const pageResults = await runLimited(jobs, AUTOSCOUT_PAGE_CONCURRENCY, (job) => (
      scrapeAutoScoutPageJob(context!, make, model, filters, sort, job)
    ));

    for (const result of pageResults.sort((a, b) => (
      a.targetLabel.localeCompare(b.targetLabel) || a.page - b.page
    ))) {
      allListings.push(...result.listings);
    }

    const seen = new Set<string>();
    const unique = allListings.filter((listing) => {
      if (seen.has(listing.originalUrl)) return false;
      seen.add(listing.originalUrl);
      return true;
    });

    console.log(`[autoscout] Found ${unique.length} unique listings total`);
    return unique;
  } catch (err) {
    console.error('[autoscout] Scraping error:', err);
    await resetSharedBrowser();
    throw err;
  } finally {
    if (context) await context.close().catch(() => undefined);
  }
}
