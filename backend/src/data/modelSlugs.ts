/**
 * Per-scraper URL slug overrides for models whose names don't map
 * to valid URL paths via the naive `toLowerCase().replace(/\s+/g, '-')` conversion.
 *
 * Key structure: SLUG_OVERRIDES[makeLower][modelLower] = { autoscout, subito }
 * Either field can be omitted to fall back to the default conversion.
 */

type SlugOverride = {
  autoscout?: string;
  subito?: string;
};

type TokenSequence = string[];

const SLUG_OVERRIDES: Record<string, Record<string, SlugOverride>> = {
  bmw: {
    // Series-level models — AutoScout requires "(tutto)" suffix
    'serie 1': { autoscout: 'serie-1-(tutto)' },
    'serie 2': { autoscout: 'serie-2-(tutto)' },
    'serie 3': { autoscout: 'serie-3-(tutto)' },
    'serie 4': { autoscout: 'serie-4-(tutto)' },
    'serie 5': { autoscout: 'serie-5-(tutto)' },
    'serie 6': { autoscout: 'serie-6-(tutto)' },
    'serie 7': { autoscout: 'serie-7-(tutto)' },
    'serie 8': { autoscout: 'serie-8-(tutto)' },
    // Numeric sub-models — Subito groups them under the parent series
    '114': { subito: 'serie-1' },
    '116': { subito: 'serie-1' },
    '118': { subito: 'serie-1' },
    '120': { subito: 'serie-1' },
    '125': { subito: 'serie-1' },
    '130': { subito: 'serie-1' },
    '135': { subito: 'serie-1' },
    '214': { subito: 'serie-2' },
    '216': { subito: 'serie-2' },
    '218': { subito: 'serie-2' },
    '220': { subito: 'serie-2' },
    '225': { subito: 'serie-2' },
    '316': { subito: 'serie-3' },
    '318': { subito: 'serie-3' },
    '320': { subito: 'serie-3' },
    '325': { subito: 'serie-3' },
    '328': { subito: 'serie-3' },
    '330': { subito: 'serie-3' },
    '335': { subito: 'serie-3' },
    '340': { subito: 'serie-3' },
    '418': { subito: 'serie-4' },
    '420': { subito: 'serie-4' },
    '425': { subito: 'serie-4' },
    '430': { subito: 'serie-4' },
    '435': { subito: 'serie-4' },
    '440': { subito: 'serie-4' },
    '518': { subito: 'serie-5' },
    '520': { subito: 'serie-5' },
    '525': { subito: 'serie-5' },
    '530': { subito: 'serie-5' },
    '535': { subito: 'serie-5' },
    '540': { subito: 'serie-5' },
    '550': { subito: 'serie-5' },
    '630': { subito: 'serie-6' },
    '640': { subito: 'serie-6' },
    '650': { subito: 'serie-6' },
    '730': { subito: 'serie-7' },
    '740': { subito: 'serie-7' },
    '750': { subito: 'serie-7' },
    '760': { subito: 'serie-7' },
    '840': { subito: 'serie-8' },
    '850': { subito: 'serie-8' },
  },
  'mercedes-benz': {
    'classe a': { autoscout: 'classe-a-(tutto)' },
    'classe b': { autoscout: 'classe-b-(tutto)' },
    'classe c': { autoscout: 'classe-c-(tutto)' },
    'classe e': { autoscout: 'classe-e-(tutto)' },
    'classe g': { autoscout: 'classe-g-(tutto)' },
    'classe s': { autoscout: 'classe-s-(tutto)' },
    'classe v': { autoscout: 'classe-v-(tutto)' },
  },
  porsche: {
    // Sub-variants map to parent model for broader results
    '911 carrera': { autoscout: '911-(tutto)', subito: '911' },
    '911 targa': { autoscout: '911-(tutto)', subito: '911' },
    '911 turbo': { autoscout: '911-(tutto)', subito: '911' },
    '911 gt3': { autoscout: '911-(tutto)', subito: '911' },
    '911 gt3 rs': { autoscout: '911-(tutto)', subito: '911' },
    '911 gt2 rs': { autoscout: '911-(tutto)', subito: '911' },
    '911': { autoscout: '911-(tutto)' },
    '718 boxster': { autoscout: '718-boxster-(tutto)' },
    '718 cayman': { autoscout: '718-cayman-(tutto)' },
    '718 spyder': { autoscout: '718-spyder-(tutto)', subito: '718' },
    'cayenne coupé': { autoscout: 'cayenne-(tutto)', subito: 'cayenne' },
    'cayenne': { autoscout: 'cayenne-(tutto)' },
    'macan t': { autoscout: 'macan-(tutto)', subito: 'macan' },
    'macan': { autoscout: 'macan-(tutto)' },
    'panamera sport turismo': { autoscout: 'panamera-(tutto)', subito: 'panamera' },
    'panamera': { autoscout: 'panamera-(tutto)' },
    'taycan cross turismo': { autoscout: 'taycan-(tutto)', subito: 'taycan' },
    'taycan': { autoscout: 'taycan-(tutto)' },
  },
};

/**
 * Returns the correct URL slug for a given make/model on a specific scraper source.
 * Falls back to the naive `toLowerCase().replace(/\s+/g, '-')` conversion if no override exists.
 */
export function getModelSlug(make: string, model: string, source: 'autoscout' | 'subito'): string {
  const makeLower = make.toLowerCase().replace(/\s+/g, '-');
  const modelLower = model.toLowerCase();
  const override = SLUG_OVERRIDES[makeLower]?.[modelLower];

  if (override) {
    const slug = source === 'autoscout' ? override.autoscout : override.subito;
    if (slug) return slug;
  }

  // Default naive conversion
  return model.toLowerCase().replace(/\s+/g, '-');
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(/\s+/) : [];
}

function tokenMatches(token: string, expected: string): boolean {
  if (token === expected) return true;
  if (/^\d+$/.test(expected)) return new RegExp(`^${expected}[a-z]+$`).test(token);
  if (/^[a-z]{1,4}$/.test(expected)) return new RegExp(`^${expected}\\d+[a-z]*$`).test(token);
  return false;
}

function hasSubsequence(tokens: string[], sequence: TokenSequence): boolean {
  if (sequence.length === 0 || sequence.length > tokens.length) return false;

  for (let i = 0; i <= tokens.length - sequence.length; i++) {
    let matches = true;
    for (let j = 0; j < sequence.length; j++) {
      if (!tokenMatches(tokens[i + j], sequence[j])) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }

  return false;
}

function bmwSeriesForNumericModel(modelLower: string): string | null {
  const bmwOverrides = SLUG_OVERRIDES.bmw;
  const subitoSlug = bmwOverrides?.[modelLower]?.subito;
  const match = subitoSlug?.match(/^serie-(\d)$/);
  return match?.[1] ?? null;
}

function bmwNumericModelsForSeries(series: string): string[] {
  return Object.entries(SLUG_OVERRIDES.bmw ?? {})
    .filter(([, override]) => override.subito === `serie-${series}`)
    .map(([model]) => model);
}

function porscheVariantSequences(modelLower: string): TokenSequence[] {
  const tokens = tokenize(modelLower);
  const variantTokens = tokens.filter((token) => token !== 'tutto');

  if (variantTokens.length === 0) return [];

  // Keep parent searches broad, but variant searches must contain the variant
  // tokens (e.g. "911 gt3"), otherwise a parent URL would leak every 911.
  return [variantTokens];
}

function acceptedModelSequences(make: string, model: string): TokenSequence[] {
  const makeSlug = getMakeSlug(make);
  const modelLower = normalizeText(model);
  const baseTokens = tokenize(model);
  const sequences: TokenSequence[] = [];

  if (baseTokens.length > 0) sequences.push(baseTokens);

  if (makeSlug === 'bmw') {
    const seriesMatch = modelLower.match(/^serie\s+(\d)$/);
    if (seriesMatch) {
      const series = seriesMatch[1];
      sequences.push(...bmwNumericModelsForSeries(series).map((numericModel) => [numericModel]));
    } else {
      const series = bmwSeriesForNumericModel(modelLower);
      if (series) {
        // Accept a generic parent-series title only when it does not expose a
        // sibling engine code. If a title says "320", it should not satisfy "318".
        sequences.push(['serie', series]);
      }
    }
  }

  if (makeSlug === 'mercedes-benz') {
    const classMatch = modelLower.match(/^classe\s+([a-z])$/);
    if (classMatch) {
      sequences.push([classMatch[1]]);
    }
  }

  if (makeSlug === 'porsche') {
    sequences.push(...porscheVariantSequences(modelLower));
  }

  const seen = new Set<string>();
  return sequences.filter((sequence) => {
    const key = sequence.join('\u0000');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasKnownBmwSiblingCode(tokens: string[], requestedModel: string): boolean {
  const requestedLower = normalizeText(requestedModel);
  const series = bmwSeriesForNumericModel(requestedLower);
  if (!series) return false;

  return bmwNumericModelsForSeries(series).some((numericModel) => {
    return numericModel !== requestedLower && tokens.some((token) => tokenMatches(token, numericModel));
  });
}

/**
 * Returns true when a scraped title is relevant to the requested make/model.
 * Matching is token-based on normalized text, so short model codes such as
 * CLA/CLE/EQA only match whole tokens and do not bleed into similar codes.
 */
export function isListingRelevantToModel(make: string, model: string, title: string): boolean {
  const titleTokens = tokenize(title);
  if (titleTokens.length === 0) return false;

  const makeSlug = getMakeSlug(make);
  const modelLower = normalizeText(model);
  const sequences = acceptedModelSequences(make, model);

  for (const sequence of sequences) {
    if (!hasSubsequence(titleTokens, sequence)) continue;

    if (makeSlug === 'bmw' && bmwSeriesForNumericModel(modelLower) && sequence[0] === 'serie') {
      return !hasKnownBmwSiblingCode(titleTokens, model);
    }

    return true;
  }

  return false;
}

/**
 * Returns the correct URL slug for a make name.
 * Handles special characters (e.g., "Škoda" → "skoda").
 */
export function getMakeSlug(make: string): string {
  return make
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip diacritics
    .replace(/\s+/g, '-');
}
