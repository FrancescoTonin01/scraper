type RegionData = {
  region: string;
  provinces: string[];
};

const ITALIAN_REGIONS: RegionData[] = [
  {
    region: "Abruzzo",
    provinces: ["L'Aquila", "Chieti", "Pescara", "Teramo"],
  },
  {
    region: "Basilicata",
    provinces: ["Potenza", "Matera"],
  },
  {
    region: "Calabria",
    provinces: ["Catanzaro", "Cosenza", "Crotone", "Reggio Calabria", "Vibo Valentia"],
  },
  {
    region: "Campania",
    provinces: ["Napoli", "Avellino", "Benevento", "Caserta", "Salerno"],
  },
  {
    region: "Emilia-Romagna",
    provinces: ["Bologna", "Ferrara", "Forlì-Cesena", "Modena", "Parma", "Piacenza", "Ravenna", "Reggio Emilia", "Rimini"],
  },
  {
    region: "Friuli Venezia Giulia",
    provinces: ["Trieste", "Gorizia", "Pordenone", "Udine"],
  },
  {
    region: "Lazio",
    provinces: ["Roma", "Frosinone", "Latina", "Rieti", "Viterbo"],
  },
  {
    region: "Liguria",
    provinces: ["Genova", "Imperia", "La Spezia", "Savona"],
  },
  {
    region: "Lombardia",
    provinces: ["Milano", "Bergamo", "Brescia", "Como", "Cremona", "Lecco", "Lodi", "Mantova", "Monza e Brianza", "Pavia", "Sondrio", "Varese"],
  },
  {
    region: "Marche",
    provinces: ["Ancona", "Ascoli Piceno", "Fermo", "Macerata", "Pesaro e Urbino"],
  },
  {
    region: "Molise",
    provinces: ["Campobasso", "Isernia"],
  },
  {
    region: "Piemonte",
    provinces: ["Torino", "Alessandria", "Asti", "Biella", "Cuneo", "Novara", "Verbano-Cusio-Ossola", "Vercelli"],
  },
  {
    region: "Puglia",
    provinces: ["Bari", "Barletta-Andria-Trani", "Brindisi", "Foggia", "Lecce", "Taranto"],
  },
  {
    region: "Sardegna",
    provinces: ["Cagliari", "Nuoro", "Oristano", "Sassari", "Sud Sardegna"],
  },
  {
    region: "Sicilia",
    provinces: ["Palermo", "Agrigento", "Caltanissetta", "Catania", "Enna", "Messina", "Ragusa", "Siracusa", "Trapani"],
  },
  {
    region: "Toscana",
    provinces: ["Firenze", "Arezzo", "Grosseto", "Livorno", "Lucca", "Massa-Carrara", "Pisa", "Pistoia", "Prato", "Siena"],
  },
  {
    region: "Trentino-Alto Adige",
    provinces: ["Trento", "Bolzano"],
  },
  {
    region: "Umbria",
    provinces: ["Perugia", "Terni"],
  },
  {
    region: "Valle d'Aosta",
    provinces: ["Aosta"],
  },
  {
    region: "Veneto",
    provinces: ["Venezia", "Belluno", "Padova", "Rovigo", "Treviso", "Verona", "Vicenza"],
  },
];

/**
 * Returns a flat list of location options for the Combobox.
 * Regions come first (standalone), then provinces formatted as "City (Region)".
 */
export function getLocationOptions(): string[] {
  const options: string[] = [];

  // Add all regions first
  for (const { region } of ITALIAN_REGIONS) {
    options.push(region);
  }

  // Add provinces with region suffix
  for (const { region, provinces } of ITALIAN_REGIONS) {
    for (const province of provinces) {
      options.push(`${province} (${region})`);
    }
  }

  return options;
}

/**
 * Extracts the city/region name from a location option string.
 * "Milano (Lombardia)" → "Milano"
 * "Lombardia" → "Lombardia"
 */
export function extractLocationName(option: string): string {
  const match = option.match(/^(.+?)\s*\(/);
  return match ? match[1] : option;
}

/**
 * Returns true if the given location string is a region name (not a province).
 */
export function isRegion(location: string): boolean {
  return ITALIAN_REGIONS.some(
    (r) => r.region.toLowerCase() === location.trim().toLowerCase()
  );
}

/**
 * Smart-resolve a user's partial/plain text input to the canonical option string.
 * "Padova" → "Padova (Veneto)", "Veneto" → "Veneto", "xyz" → null
 */
export function resolveLocationInput(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  const allOptions = getLocationOptions();

  // Exact match first (case-insensitive)
  const exact = allOptions.find((o) => o.toLowerCase() === trimmed);
  if (exact) return exact;

  // Match by city name (before parenthesis)
  const byCity = allOptions.find((o) => {
    const city = extractLocationName(o);
    return city.toLowerCase() === trimmed;
  });
  if (byCity) return byCity;

  return null;
}
