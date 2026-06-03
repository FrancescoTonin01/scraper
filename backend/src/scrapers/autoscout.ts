import { chromium, type Browser, type Page } from 'playwright';
import type { CarListing, GeoResult } from '../types.js';

function buildUrl(
  make: string,
  model: string,
  geo: GeoResult | null,
  radius: number,
  page: number,
): string {
  const makePath = make.toLowerCase().replace(/\s+/g, '-');
  const modelPath = model.toLowerCase().replace(/\s+/g, '-');
  const base = `https://www.autoscout24.it/lst/${encodeURIComponent(makePath)}/${encodeURIComponent(modelPath)}`;

  const params = new URLSearchParams({
    sort: 'standard',
    desc: '0',
    ustate: 'N,U',
    size: '20',
    page: String(page),
    cy: 'I',
    atype: 'C',
  });

  if (geo?.postcode) {
    params.set('zip', geo.postcode);
    params.set('zipr', String(radius));
  }

  return `${base}?${params.toString()}`;
}

async function dismissCookies(page: Page): Promise<void> {
  try {
    const acceptBtn = page.locator('button:has-text("Accetta tutto"), button:has-text("Accept All")');
    await acceptBtn.first().click({ timeout: 5000 });
    await page.waitForTimeout(500);
  } catch {
    // Cookie banner not present or already dismissed
  }
}

function parsePrice(text: string | null): number | null {
  if (!text) return null;
  // Match Italian price format: 1-3 digits optionally followed by .XXX groups
  // This avoids capturing footnote markers appended to the price (e.g. "14.4001" → 14400)
  const match = text.match(/(\d{1,3}(?:\.\d{3})*)/);
  if (!match) return null;
  const num = parseInt(match[1].replace(/\./g, ''), 10);
  return isNaN(num) ? null : num;
}

/** Parse date (MM/YYYY) and mileage from concatenated text like "01/20265 km" */
function parseDateAndMileage(text: string): { year: number | null; mileage: number | null } {
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

function parseFuel(text: string | null): string | null {
  if (!text) return null;
  const fuels = ['Elettrica/Benzina', 'Elettrica/Diesel', 'Benzina', 'Diesel', 'GPL', 'Metano', 'Elettrica', 'Ibrida'];
  for (const fuel of fuels) {
    if (text.includes(fuel)) return fuel;
  }
  return null;
}

function extractCity(text: string): string | null {
  // AutoScout format: "IT-{ZIP} {City} - {Province} - {Code}" or "IT-{ZIP} {City} - {Code}"
  const match = text.match(/IT-\d{5}\s+(.+?)(?:\s+-\s+[A-Za-zÀ-ÿ\s]+)?(?:\s+-\s+[A-Za-z]{2})/);
  if (match) return match[1].trim();

  // Simpler fallback: "IT-{ZIP} {City}"
  const simple = text.match(/IT-\d{5}\s+([A-Za-zÀ-ÿ\s'.-]+?)(?:\s*[-\[+]|$)/);
  if (simple) return simple[1].trim();

  return null;
}

async function scrapePage(browserPage: Page): Promise<CarListing[]> {
  try {
    await browserPage.waitForSelector('article', { timeout: 10000 });
  } catch {
    return [];
  }

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

      const imgEl = article.querySelector('img');
      const imageUrl = imgEl?.getAttribute('src') ?? imgEl?.getAttribute('data-src') ?? null;

      const metaText = article.textContent ?? '';

      return { title, priceText, imageUrl, originalUrl: fullUrl, metaText };
    });
  });

  return listings
    .filter((l): l is NonNullable<typeof l> => l !== null && !!l.title && !!l.originalUrl)
    .map((l) => {
      const { year, mileage } = parseDateAndMileage(l.metaText);
      return {
        source: 'autoscout' as const,
        title: l.title,
        price: parsePrice(l.priceText),
        mileage,
        year,
        fuel: parseFuel(l.metaText),
        transmission: l.metaText.includes('Automatico')
          ? 'Automatico'
          : l.metaText.includes('Manuale')
            ? 'Manuale'
            : null,
        city: extractCity(l.metaText),
        imageUrl: l.imageUrl,
        originalUrl: l.originalUrl,
      };
    });
}

export async function scrapeAutoScout(
  make: string,
  model: string,
  geo: GeoResult | null,
  radius: number,
  maxPages: number = 1,
): Promise<CarListing[]> {
  console.log(`[autoscout] Scraping up to ${maxPages} pages...`);

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      locale: 'it-IT',
    });
    const browserPage = await context.newPage();
    const allListings: CarListing[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const url = buildUrl(make, model, geo, radius, page);
      console.log(`[autoscout] Page ${page}: ${url}`);

      await browserPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (page === 1) await dismissCookies(browserPage);
      await browserPage.waitForTimeout(1500);

      const pageListings = await scrapePage(browserPage);
      if (pageListings.length === 0) {
        console.log(`[autoscout] No listings on page ${page}, stopping.`);
        break;
      }

      allListings.push(...pageListings);
    }

    console.log(`[autoscout] Found ${allListings.length} listings total`);
    return allListings;
  } catch (err) {
    console.error('[autoscout] Scraping error:', err);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
}
