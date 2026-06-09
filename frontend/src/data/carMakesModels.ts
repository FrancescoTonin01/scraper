export type CarMake = {
  name: string;
  models: string[];
};

export const CAR_MAKES_MODELS: CarMake[] = [
  {
    name: "Abarth",
    models: ["124 Spider", "500", "595", "695", "Grande Punto", "Punto Evo"],
  },
  {
    name: "Alfa Romeo",
    models: [
      "147", "156", "159", "166", "4C", "Giulia", "Giulietta",
      "MiTo", "Spider", "Stelvio", "Tonale",
    ],
  },
  {
    name: "Audi",
    models: [
      "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8",
      "e-tron", "e-tron GT", "Q2", "Q3", "Q4 e-tron", "Q5",
      "Q7", "Q8", "RS3", "RS4", "RS5", "RS6", "RS7",
      "S3", "S4", "S5", "TT",
    ],
  },
  {
    name: "BMW",
    models: [
      "i3", "i4", "i5", "i7", "iX", "iX1", "iX3",
      "Serie 1", "Serie 2", "Serie 3", "Serie 4", "Serie 5",
      "Serie 6", "Serie 7", "Serie 8",
      "116", "118", "120", "218", "220", "225",
      "316", "318", "320", "325", "330", "335", "340",
      "420", "430", "440",
      "520", "525", "530", "540",
      "630", "640",
      "730", "740", "750",
      "840", "850",
      "X1", "X2", "X3", "X4", "X5", "X6", "X7",
      "Z3", "Z4",
      "M2", "M3", "M4", "M5",
    ],
  },
  {
    name: "Citroën",
    models: [
      "Berlingo", "C1", "C2", "C3", "C3 Aircross", "C4",
      "C4 Cactus", "C4 Picasso", "C5", "C5 Aircross", "C5 X",
      "DS3", "DS4", "DS5", "ë-C4", "Jumpy", "Spacetourer",
    ],
  },
  {
    name: "Cupra",
    models: ["Ateca", "Born", "Formentor", "Leon", "Tavascan"],
  },
  {
    name: "Dacia",
    models: [
      "Dokker", "Duster", "Jogger", "Logan", "Sandero",
      "Sandero Stepway", "Spring",
    ],
  },
  {
    name: "DS",
    models: ["DS 3", "DS 3 Crossback", "DS 4", "DS 7", "DS 9"],
  },
  {
    name: "Fiat",
    models: [
      "500", "500C", "500L", "500X", "600", "Bravo", "Doblò",
      "Ducato", "Fiorino", "Grande Punto", "Idea", "Multipla",
      "New Panda", "Panda", "Punto", "Punto Evo", "Qubo",
      "Scudo", "Sedici", "Stilo", "Tipo", "Ulysse",
    ],
  },
  {
    name: "Ford",
    models: [
      "B-Max", "C-Max", "EcoSport", "Edge", "Explorer",
      "Fiesta", "Focus", "Galaxy", "Ka", "Ka+", "Kuga",
      "Mondeo", "Mustang", "Mustang Mach-E", "Puma", "Ranger",
      "S-Max", "Tourneo Connect", "Tourneo Custom", "Transit",
    ],
  },
  {
    name: "Honda",
    models: [
      "Civic", "CR-V", "e", "HR-V", "Jazz", "ZR-V",
    ],
  },
  {
    name: "Hyundai",
    models: [
      "Bayon", "i10", "i20", "i30", "i40", "IONIQ",
      "IONIQ 5", "IONIQ 6", "Kona", "Santa Fe", "Tucson",
    ],
  },
  {
    name: "Jaguar",
    models: ["E-Pace", "F-Pace", "F-Type", "I-Pace", "XE", "XF"],
  },
  {
    name: "Jeep",
    models: [
      "Avenger", "Cherokee", "Compass", "Grand Cherokee",
      "Renegade", "Wrangler",
    ],
  },
  {
    name: "Kia",
    models: [
      "Ceed", "EV6", "EV9", "Niro", "Picanto", "ProCeed",
      "Sorento", "Sportage", "Stinger", "Stonic", "XCeed",
    ],
  },
  {
    name: "Lancia",
    models: ["Delta", "Musa", "Ypsilon"],
  },
  {
    name: "Land Rover",
    models: [
      "Defender", "Discovery", "Discovery Sport",
      "Range Rover", "Range Rover Evoque", "Range Rover Sport",
      "Range Rover Velar",
    ],
  },
  {
    name: "Lexus",
    models: ["CT", "IS", "LC", "NX", "RX", "UX"],
  },
  {
    name: "Mazda",
    models: ["2", "3", "6", "CX-3", "CX-30", "CX-5", "CX-60", "MX-5", "MX-30"],
  },
  {
    name: "Mercedes-Benz",
    models: [
      "Classe A", "Classe B", "Classe C", "Classe E", "Classe G",
      "Classe S", "Classe V", "CLA", "CLS", "EQA", "EQB", "EQC",
      "EQE", "EQS", "GLA", "GLB", "GLC", "GLE", "GLS",
      "Sprinter", "Vito",
    ],
  },
  {
    name: "Mini",
    models: [
      "Clubman", "Countryman", "Hatch 3 porte", "Hatch 5 porte",
      "John Cooper Works", "One", "Cooper", "Cooper S",
    ],
  },
  {
    name: "Mitsubishi",
    models: [
      "ASX", "Eclipse Cross", "L200", "Outlander",
      "Pajero", "Space Star",
    ],
  },
  {
    name: "Nissan",
    models: [
      "Ariya", "Juke", "Leaf", "Micra", "Navara", "Note",
      "Qashqai", "Townstar", "X-Trail",
    ],
  },
  {
    name: "Opel",
    models: [
      "Adam", "Astra", "Combo", "Corsa", "Crossland",
      "Grandland", "Insignia", "Karl", "Meriva", "Mokka",
      "Vivaro", "Zafira",
    ],
  },
  {
    name: "Peugeot",
    models: [
      "108", "2008", "208", "3008", "308", "408", "5008",
      "508", "Partner", "Rifter", "Traveller", "e-208", "e-2008",
    ],
  },
  {
    name: "Porsche",
    models: [
      "718 Boxster", "718 Cayman", "718 Spyder",
      "911", "911 Carrera", "911 Targa", "911 Turbo", "911 GT3", "911 GT3 RS", "911 GT2 RS",
      "Boxster", "Cayman",
      "Cayenne", "Cayenne Coupé",
      "Macan", "Macan T",
      "Panamera", "Panamera Sport Turismo",
      "Taycan", "Taycan Cross Turismo",
    ],
  },
  {
    name: "Renault",
    models: [
      "Arkana", "Austral", "Captur", "Clio", "Espace",
      "Kadjar", "Kangoo", "Koleos", "Megane", "Megane E-Tech",
      "Scenic", "Talisman", "Trafic", "Twingo", "ZOE",
    ],
  },
  {
    name: "Seat",
    models: [
      "Arona", "Ateca", "Ibiza", "Leon", "Tarraco",
    ],
  },
  {
    name: "Škoda",
    models: [
      "Enyaq", "Fabia", "Kamiq", "Karoq", "Kodiaq",
      "Octavia", "Scala", "Superb",
    ],
  },
  {
    name: "Smart",
    models: ["EQ fortwo", "fortwo", "forfour", "#1", "#3"],
  },
  {
    name: "Suzuki",
    models: [
      "Across", "Baleno", "Ignis", "Jimny", "S-Cross",
      "Swift", "Vitara",
    ],
  },
  {
    name: "Tesla",
    models: ["Model 3", "Model S", "Model X", "Model Y"],
  },
  {
    name: "Toyota",
    models: [
      "Aygo", "Aygo X", "bZ4X", "C-HR", "Camry",
      "Corolla", "GR86", "Highlander", "Hilux",
      "Land Cruiser", "Mirai", "Proace", "RAV4",
      "Supra", "Yaris", "Yaris Cross",
    ],
  },
  {
    name: "Volkswagen",
    models: [
      "Arteon", "Caddy", "Golf", "ID.3", "ID.4", "ID.5",
      "ID.7", "Multivan", "Passat", "Polo", "T-Cross",
      "T-Roc", "Taigo", "Tiguan", "Touareg", "Touran",
      "Transporter", "Up!",
    ],
  },
  {
    name: "Volvo",
    models: [
      "C40", "EX30", "EX90", "S60", "S90", "V40",
      "V60", "V90", "XC40", "XC60", "XC90",
    ],
  },
];

export function getMakeNames(): string[] {
  return CAR_MAKES_MODELS.map((m) => m.name);
}

export function getModelsForMake(makeName: string): string[] {
  const make = CAR_MAKES_MODELS.find(
    (m) => m.name.toLowerCase() === makeName.toLowerCase()
  );
  return make?.models ?? [];
}
