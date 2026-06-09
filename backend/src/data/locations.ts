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
