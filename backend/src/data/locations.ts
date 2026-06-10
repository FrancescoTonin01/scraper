type RegionData = {
  region: string;
  provinces: string[];
};

const ITALIAN_REGIONS: RegionData[] = [
  { region: 'Abruzzo', provinces: ["L'Aquila", 'Chieti', 'Pescara', 'Teramo'] },
  { region: 'Basilicata', provinces: ['Potenza', 'Matera'] },
  { region: 'Calabria', provinces: ['Catanzaro', 'Cosenza', 'Crotone', 'Reggio Calabria', 'Vibo Valentia'] },
  { region: 'Campania', provinces: ['Napoli', 'Avellino', 'Benevento', 'Caserta', 'Salerno'] },
  { region: 'Emilia-Romagna', provinces: ['Bologna', 'Ferrara', 'Forlì-Cesena', 'Modena', 'Parma', 'Piacenza', 'Ravenna', 'Reggio Emilia', 'Rimini'] },
  { region: 'Friuli Venezia Giulia', provinces: ['Trieste', 'Gorizia', 'Pordenone', 'Udine'] },
  { region: 'Lazio', provinces: ['Roma', 'Frosinone', 'Latina', 'Rieti', 'Viterbo'] },
  { region: 'Liguria', provinces: ['Genova', 'Imperia', 'La Spezia', 'Savona'] },
  { region: 'Lombardia', provinces: ['Milano', 'Bergamo', 'Brescia', 'Como', 'Cremona', 'Lecco', 'Lodi', 'Mantova', 'Monza e Brianza', 'Pavia', 'Sondrio', 'Varese'] },
  { region: 'Marche', provinces: ['Ancona', 'Ascoli Piceno', 'Fermo', 'Macerata', 'Pesaro e Urbino'] },
  { region: 'Molise', provinces: ['Campobasso', 'Isernia'] },
  { region: 'Piemonte', provinces: ['Torino', 'Alessandria', 'Asti', 'Biella', 'Cuneo', 'Novara', 'Verbano-Cusio-Ossola', 'Vercelli'] },
  { region: 'Puglia', provinces: ['Bari', 'Barletta-Andria-Trani', 'Brindisi', 'Foggia', 'Lecce', 'Taranto'] },
  { region: 'Sardegna', provinces: ['Cagliari', 'Nuoro', 'Oristano', 'Sassari', 'Sud Sardegna'] },
  { region: 'Sicilia', provinces: ['Palermo', 'Agrigento', 'Caltanissetta', 'Catania', 'Enna', 'Messina', 'Ragusa', 'Siracusa', 'Trapani'] },
  { region: 'Toscana', provinces: ['Firenze', 'Arezzo', 'Grosseto', 'Livorno', 'Lucca', 'Massa-Carrara', 'Pisa', 'Pistoia', 'Prato', 'Siena'] },
  { region: 'Trentino-Alto Adige', provinces: ['Trento', 'Bolzano'] },
  { region: 'Umbria', provinces: ['Perugia', 'Terni'] },
  { region: "Valle d'Aosta", provinces: ['Aosta'] },
  { region: 'Veneto', provinces: ['Venezia', 'Belluno', 'Padova', 'Rovigo', 'Treviso', 'Verona', 'Vicenza'] },
];

const PROVINCE_CODE_TO_REGION: Record<string, string> = {
  AG: 'Sicilia',
  AL: 'Piemonte',
  AN: 'Marche',
  AO: "Valle d'Aosta",
  AP: 'Marche',
  AQ: 'Abruzzo',
  AR: 'Toscana',
  AT: 'Piemonte',
  AV: 'Campania',
  BA: 'Puglia',
  BG: 'Lombardia',
  BI: 'Piemonte',
  BL: 'Veneto',
  BN: 'Campania',
  BO: 'Emilia-Romagna',
  BR: 'Puglia',
  BS: 'Lombardia',
  BT: 'Puglia',
  BZ: 'Trentino-Alto Adige',
  CA: 'Sardegna',
  CB: 'Molise',
  CE: 'Campania',
  CH: 'Abruzzo',
  CL: 'Sicilia',
  CN: 'Piemonte',
  CO: 'Lombardia',
  CR: 'Lombardia',
  CS: 'Calabria',
  CT: 'Sicilia',
  CZ: 'Calabria',
  EN: 'Sicilia',
  FC: 'Emilia-Romagna',
  FE: 'Emilia-Romagna',
  FG: 'Puglia',
  FI: 'Toscana',
  FM: 'Marche',
  FR: 'Lazio',
  GE: 'Liguria',
  GO: 'Friuli Venezia Giulia',
  GR: 'Toscana',
  IM: 'Liguria',
  IS: 'Molise',
  KR: 'Calabria',
  LC: 'Lombardia',
  LE: 'Puglia',
  LI: 'Toscana',
  LO: 'Lombardia',
  LT: 'Lazio',
  LU: 'Toscana',
  MB: 'Lombardia',
  MC: 'Marche',
  ME: 'Sicilia',
  MI: 'Lombardia',
  MN: 'Lombardia',
  MO: 'Emilia-Romagna',
  MS: 'Toscana',
  MT: 'Basilicata',
  NA: 'Campania',
  NO: 'Piemonte',
  NU: 'Sardegna',
  OR: 'Sardegna',
  PA: 'Sicilia',
  PC: 'Emilia-Romagna',
  PD: 'Veneto',
  PE: 'Abruzzo',
  PG: 'Umbria',
  PI: 'Toscana',
  PN: 'Friuli Venezia Giulia',
  PO: 'Toscana',
  PR: 'Emilia-Romagna',
  PT: 'Toscana',
  PU: 'Marche',
  PV: 'Lombardia',
  PZ: 'Basilicata',
  RA: 'Emilia-Romagna',
  RC: 'Calabria',
  RE: 'Emilia-Romagna',
  RG: 'Sicilia',
  RI: 'Lazio',
  RM: 'Lazio',
  RN: 'Emilia-Romagna',
  RO: 'Veneto',
  SA: 'Campania',
  SI: 'Toscana',
  SO: 'Lombardia',
  SP: 'Liguria',
  SR: 'Sicilia',
  SS: 'Sardegna',
  SU: 'Sardegna',
  SV: 'Liguria',
  TA: 'Puglia',
  TE: 'Abruzzo',
  TN: 'Trentino-Alto Adige',
  TO: 'Piemonte',
  TP: 'Sicilia',
  TR: 'Umbria',
  TS: 'Friuli Venezia Giulia',
  TV: 'Veneto',
  UD: 'Friuli Venezia Giulia',
  VA: 'Lombardia',
  VB: 'Piemonte',
  VC: 'Piemonte',
  VE: 'Veneto',
  VI: 'Veneto',
  VR: 'Veneto',
  VT: 'Lazio',
  VV: 'Calabria',
};

// Pre-build lowercase lookup set for all valid locations (regions + provinces)
const validLocationsLower = new Set<string>();
for (const { region, provinces } of ITALIAN_REGIONS) {
  validLocationsLower.add(region.toLowerCase());
  for (const province of provinces) {
    validLocationsLower.add(province.toLowerCase());
  }
}

export function isValidLocation(location: string): boolean {
  return validLocationsLower.has(location.toLowerCase());
}

export function getRegionNames(): string[] {
  return ITALIAN_REGIONS.map((r) => r.region);
}

export function getProvinceNames(): string[] {
  return ITALIAN_REGIONS.flatMap((r) => r.provinces);
}

export function getProvincesForRegion(region: string): string[] {
  const r = ITALIAN_REGIONS.find(
    (r) => r.region.toLowerCase() === region.toLowerCase()
  );
  return r ? r.provinces : [];
}

/**
 * Check if a city string (as scraped, e.g. "Milano", "Bergamo")
 * belongs to the given region by matching against province names.
 */
export function isCityInRegion(city: string, region: string): boolean {
  const provinces = getProvincesForRegion(region);
  if (provinces.length === 0) return false;
  const cityLower = city.toLowerCase();
  const provinceNameMatches = provinces.some((p) => cityLower.includes(p.toLowerCase()) || p.toLowerCase().includes(cityLower));
  if (provinceNameMatches) return true;

  const codeMatches = city.matchAll(/(?:^|[\s(-])([A-Z]{2})(?:$|[\s)\]-])/g);
  for (const match of codeMatches) {
    if (PROVINCE_CODE_TO_REGION[match[1]]?.toLowerCase() === region.toLowerCase()) {
      return true;
    }
  }

  return false;
}
