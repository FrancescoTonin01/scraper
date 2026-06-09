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
