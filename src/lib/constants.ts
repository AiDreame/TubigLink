// AquaLink PH — Philippines-specific constants

export const APP_NAME = "AquaLink PH";
export const APP_TAGLINE = "Tubig, delivered!";

// PH Regions
export const PH_REGIONS = [
  "NCR — National Capital Region",
  "CAR — Cordillera Administrative Region",
  "Region I — Ilocos Region",
  "Region II — Cagayan Valley",
  "Region III — Central Luzon",
  "Region IV-A — CALABARZON",
  "Region IV-B — MIMAROPA",
  "Region V — Bicol Region",
  "Region VI — Western Visayas",
  "Region VII — Central Visayas",
  "Region VIII — Eastern Visayas",
  "Region IX — Zamboanga Peninsula",
  "Region X — Northern Mindanao",
  "Region XI — Davao Region",
  "Region XII — SOCCSKSARGEN",
  "Region XIII — Caraga",
  "BARMM — Bangsamoro Autonomous Region in Muslim Mindanao",
];

// ─── CITY LISTS BY REGION ─────────────────────────────

// NCR — National Capital Region
export const METRO_MANILA_CITIES = [
  "Manila", "Quezon City", "Caloocan", "Pasig", "Makati",
  "Taguig", "Mandaluyong", "Muntinlupa", "Pasay", "Paranaque",
  "Marikina", "Las Pinas", "Valenzuela", "Malabon", "Navotas",
  "San Juan",
];

// CAR — Cordillera Administrative Region
export const CAR_CITIES = [
  "Baguio", "Bontoc", "La Trinidad", "Tabuk", "Lagawe",
];

// Region I — Ilocos Region
export const REGION_1_CITIES = [
  "Dagupan", "San Carlos", "Laoag", "Vigan", "Alaminos",
  "Urdaneta", "Batac", "Candon",
];

// Region II — Cagayan Valley
export const REGION_2_CITIES = [
  "Tuguegarao", "Santiago", "Cauayan", "Ilagan", "Bayombong",
];

// Region III — Central Luzon
export const REGION_3_CITIES = [
  "Angeles", "Olongapo", "San Fernando", "Tarlac", "Cabanatuan",
  "Balanga", "Malolos", "Meycauayan", "San Jose del Monte", "Gapan",
  "Mabalacat",
];

// Region IV-A — CALABARZON
export const REGION_4A_CITIES = [
  "Batangas", "Lipa", "Tanauan", "Lucena", "San Pablo",
  "Santa Rosa", "Calamba", "Bacoor", "Dasmariñas", "Imus",
  "General Trias", "Cavite", "Antipolo", "Binangonan", "Taytay",
  "Tanay", "Sto. Tomas",
];

// Region IV-B — MIMAROPA
export const REGION_4B_CITIES = [
  "Calapan", "Puerto Princesa", "Romblon", "Boac",
];

// Region V — Bicol Region
export const REGION_5_CITIES = [
  "Legazpi", "Naga", "Iriga", "Tabaco", "Sorsogon",
  "Masbate", "Daet", "Ligao",
];

// Region VI — Western Visayas
export const REGION_6_CITIES = [
  "Iloilo City", "Bacolod", "Silay", "Bago", "Roxas",
  "Kalibo", "Passi", "Himamaylan", "Kabankalan", "Talisay",
  "Escalante", "Sagay", "San Carlos", "Victorias",
];

// Region VII — Central Visayas
export const REGION_7_CITIES = [
  "Cebu City", "Mandaue", "Lapu-Lapu", "Talisay", "Toledo",
  "Dumaguete", "Tagbilaran", "Bogo", "Carcar", "Danao",
  "Naga", "San Fernando", "Guihulngan", "Bayawan", "Tanjay",
];

// Region VIII — Eastern Visayas
export const REGION_8_CITIES = [
  "Tacloban", "Ormoc", "Calbayog", "Catbalogan", "Maasin",
  "Borongan",
];

// Region IX — Zamboanga Peninsula
export const REGION_9_CITIES = [
  "Zamboanga City", "Pagadian", "Dipolog", "Dapitan", "Isabela",
];

// Region X — Northern Mindanao
export const REGION_10_CITIES = [
  "Cagayan de Oro", "Iligan", "Malaybalay", "Valencia", "Ozamiz",
  "Oroquieta", "Tangub", "Gingoog", "El Salvador",
];

// Region XI — Davao Region
export const REGION_11_CITIES = [
  "Davao City", "Tagum", "Mati", "Digos", "Samal",
  "Panabo",
];

// Backward compatibility aliases
export const MINDANAO_CITIES = [...REGION_11_CITIES, ...REGION_10_CITIES.slice(0, 1), "General Santos"];
export const CEBU_CITIES = [...REGION_7_CITIES];

// Region XII — SOCCSKSARGEN
export const REGION_12_CITIES = [
  "General Santos", "Koronadal", "Tacurong", "Kidapawan", "Cotabato City",
];

// Region XIII — Caraga
export const REGION_13_CITIES = [
  "Butuan", "Surigao", "Tandag", "Bislig", "Bayugan",
  "Cabadbaran",
];

// BARMM — Bangsamoro Autonomous Region
export const BARMM_CITIES = [
  "Marawi", "Jolo", "Lamitan",
];

// ─── CITIES BY REGION (grouped) ────────────────────────

export const CITIES_BY_REGION: Record<string, { cities: string[]; label: string; tagline: string }> = {
  "ncr": {
    label: "Metro Manila",
    tagline: "Metro Manila's trusted water delivery service",
    cities: METRO_MANILA_CITIES,
  },
  "car": {
    label: "Cordillera Administrative Region",
    tagline: "Mountain-fresh water from the Cordilleras",
    cities: CAR_CITIES,
  },
  "region-1": {
    label: "Ilocos Region",
    tagline: "Ilocos' finest water stations, delivered to your door",
    cities: REGION_1_CITIES,
  },
  "region-2": {
    label: "Cagayan Valley",
    tagline: "Pure water from the Valley",
    cities: REGION_2_CITIES,
  },
  "region-3": {
    label: "Central Luzon",
    tagline: "Central Luzon's reliable water delivery",
    cities: REGION_3_CITIES,
  },
  "region-4a": {
    label: "CALABARZON",
    tagline: "CALABARZON's trusted water stations",
    cities: REGION_4A_CITIES,
  },
  "region-4b": {
    label: "MIMAROPA",
    tagline: "Fresh water from the islands",
    cities: REGION_4B_CITIES,
  },
  "region-5": {
    label: "Bicol Region",
    tagline: "Bicol's finest water delivery service",
    cities: REGION_5_CITIES,
  },
  "region-6": {
    label: "Western Visayas",
    tagline: "Water delivery across Western Visayas",
    cities: REGION_6_CITIES,
  },
  "region-7": {
    label: "Central Visayas",
    tagline: "Central Visayas' trusted water stations",
    cities: REGION_7_CITIES,
  },
  "region-8": {
    label: "Eastern Visayas",
    tagline: "Reliable water delivery in Eastern Visayas",
    cities: REGION_8_CITIES,
  },
  "region-9": {
    label: "Zamboanga Peninsula",
    tagline: "Fresh water from the Peninsula",
    cities: REGION_9_CITIES,
  },
  "region-10": {
    label: "Northern Mindanao",
    tagline: "Northern Mindanao's finest water",
    cities: REGION_10_CITIES,
  },
  "region-11": {
    label: "Davao Region",
    tagline: "Davao's freshest water, on-demand",
    cities: REGION_11_CITIES,
  },
  "region-12": {
    label: "SOCCSKSARGEN",
    tagline: "Pure water from SOCCSKSARGEN",
    cities: REGION_12_CITIES,
  },
  "region-13": {
    label: "Caraga",
    tagline: "Caraga's trusted water delivery",
    cities: REGION_13_CITIES,
  },
  "barmm": {
    label: "Bangsamoro",
    tagline: "Bangsamoro's reliable water stations",
    cities: BARMM_CITIES,
  },
};

// ─── ALL SUPPORTED CITIES (for city selector dropdown) ──

export const ALL_SUPPORTED_CITIES = [
  // NCR
  { id: "Manila", region: "ncr", label: "Manila" },
  { id: "Quezon City", region: "ncr", label: "Quezon City" },
  { id: "Makati", region: "ncr", label: "Makati" },
  { id: "Taguig", region: "ncr", label: "Taguig" },
  { id: "Pasig", region: "ncr", label: "Pasig" },
  { id: "Mandaluyong", region: "ncr", label: "Mandaluyong" },
  { id: "Muntinlupa", region: "ncr", label: "Muntinlupa" },
  { id: "Pasay", region: "ncr", label: "Pasay" },
  { id: "Paranaque", region: "ncr", label: "Parañaque" },
  { id: "Marikina", region: "ncr", label: "Marikina" },
  { id: "Caloocan", region: "ncr", label: "Caloocan" },
  { id: "Las Pinas", region: "ncr", label: "Las Piñas" },
  { id: "Valenzuela", region: "ncr", label: "Valenzuela" },
  { id: "Malabon", region: "ncr", label: "Malabon" },
  { id: "Navotas", region: "ncr", label: "Navotas" },
  { id: "San Juan", region: "ncr", label: "San Juan" },
  // CAR
  { id: "Baguio", region: "car", label: "Baguio" },
  { id: "Bontoc", region: "car", label: "Bontoc" },
  { id: "La Trinidad", region: "car", label: "La Trinidad" },
  { id: "Tabuk", region: "car", label: "Tabuk" },
  { id: "Lagawe", region: "car", label: "Lagawe" },
  // Region I
  { id: "Dagupan", region: "region-1", label: "Dagupan" },
  { id: "San Carlos", region: "region-1", label: "San Carlos (Pangasinan)" },
  { id: "Laoag", region: "region-1", label: "Laoag" },
  { id: "Vigan", region: "region-1", label: "Vigan" },
  { id: "Alaminos", region: "region-1", label: "Alaminos" },
  { id: "Urdaneta", region: "region-1", label: "Urdaneta" },
  { id: "Batac", region: "region-1", label: "Batac" },
  { id: "Candon", region: "region-1", label: "Candon" },
  // Region II
  { id: "Tuguegarao", region: "region-2", label: "Tuguegarao" },
  { id: "Santiago", region: "region-2", label: "Santiago" },
  { id: "Cauayan", region: "region-2", label: "Cauayan" },
  { id: "Ilagan", region: "region-2", label: "Ilagan" },
  { id: "Bayombong", region: "region-2", label: "Bayombong" },
  // Region III
  { id: "Angeles", region: "region-3", label: "Angeles" },
  { id: "Olongapo", region: "region-3", label: "Olongapo" },
  { id: "San Fernando", region: "region-3", label: "San Fernando (Pampanga)" },
  { id: "Tarlac", region: "region-3", label: "Tarlac" },
  { id: "Cabanatuan", region: "region-3", label: "Cabanatuan" },
  { id: "Balanga", region: "region-3", label: "Balanga" },
  { id: "Malolos", region: "region-3", label: "Malolos" },
  { id: "Meycauayan", region: "region-3", label: "Meycauayan" },
  { id: "San Jose del Monte", region: "region-3", label: "San Jose del Monte" },
  { id: "Gapan", region: "region-3", label: "Gapan" },
  { id: "Mabalacat", region: "region-3", label: "Mabalacat" },
  // Region IV-A
  { id: "Batangas", region: "region-4a", label: "Batangas" },
  { id: "Lipa", region: "region-4a", label: "Lipa" },
  { id: "Tanauan", region: "region-4a", label: "Tanauan" },
  { id: "Lucena", region: "region-4a", label: "Lucena" },
  { id: "San Pablo", region: "region-4a", label: "San Pablo" },
  { id: "Santa Rosa", region: "region-4a", label: "Santa Rosa" },
  { id: "Calamba", region: "region-4a", label: "Calamba" },
  { id: "Bacoor", region: "region-4a", label: "Bacoor" },
  { id: "Dasmariñas", region: "region-4a", label: "Dasmariñas" },
  { id: "Imus", region: "region-4a", label: "Imus" },
  { id: "General Trias", region: "region-4a", label: "General Trias" },
  { id: "Cavite", region: "region-4a", label: "Cavite" },
  { id: "Antipolo", region: "region-4a", label: "Antipolo" },
  { id: "Binangonan", region: "region-4a", label: "Binangonan" },
  { id: "Taytay", region: "region-4a", label: "Taytay" },
  { id: "Tanay", region: "region-4a", label: "Tanay" },
  { id: "Sto. Tomas", region: "region-4a", label: "Sto. Tomas" },
  // Region IV-B
  { id: "Calapan", region: "region-4b", label: "Calapan" },
  { id: "Puerto Princesa", region: "region-4b", label: "Puerto Princesa" },
  { id: "Romblon", region: "region-4b", label: "Romblon" },
  { id: "Boac", region: "region-4b", label: "Boac" },
  // Region V
  { id: "Legazpi", region: "region-5", label: "Legazpi" },
  { id: "Naga", region: "region-5", label: "Naga" },
  { id: "Iriga", region: "region-5", label: "Iriga" },
  { id: "Tabaco", region: "region-5", label: "Tabaco" },
  { id: "Sorsogon", region: "region-5", label: "Sorsogon" },
  { id: "Masbate", region: "region-5", label: "Masbate" },
  { id: "Daet", region: "region-5", label: "Daet" },
  { id: "Ligao", region: "region-5", label: "Ligao" },
  // Region VI
  { id: "Iloilo City", region: "region-6", label: "Iloilo City" },
  { id: "Bacolod", region: "region-6", label: "Bacolod" },
  { id: "Silay", region: "region-6", label: "Silay" },
  { id: "Bago", region: "region-6", label: "Bago" },
  { id: "Roxas", region: "region-6", label: "Roxas" },
  { id: "Kalibo", region: "region-6", label: "Kalibo" },
  { id: "Passi", region: "region-6", label: "Passi" },
  { id: "Himamaylan", region: "region-6", label: "Himamaylan" },
  { id: "Kabankalan", region: "region-6", label: "Kabankalan" },
  { id: "Talisay", region: "region-6", label: "Talisay (Negros Occ.)" },
  { id: "Escalante", region: "region-6", label: "Escalante" },
  { id: "Sagay", region: "region-6", label: "Sagay" },
  { id: "San Carlos", region: "region-6", label: "San Carlos (Negros Occ.)" },
  { id: "Victorias", region: "region-6", label: "Victorias" },
  // Region VII
  { id: "Cebu City", region: "region-7", label: "Cebu City" },
  { id: "Mandaue", region: "region-7", label: "Mandaue" },
  { id: "Lapu-Lapu", region: "region-7", label: "Lapu-Lapu" },
  { id: "Talisay", region: "region-7", label: "Talisay (Cebu)" },
  { id: "Toledo", region: "region-7", label: "Toledo" },
  { id: "Dumaguete", region: "region-7", label: "Dumaguete" },
  { id: "Tagbilaran", region: "region-7", label: "Tagbilaran" },
  { id: "Bogo", region: "region-7", label: "Bogo" },
  { id: "Carcar", region: "region-7", label: "Carcar" },
  { id: "Danao", region: "region-7", label: "Danao" },
  { id: "Naga", region: "region-7", label: "Naga (Cebu)" },
  { id: "San Fernando", region: "region-7", label: "San Fernando (Cebu)" },
  { id: "Guihulngan", region: "region-7", label: "Guihulngan" },
  { id: "Bayawan", region: "region-7", label: "Bayawan" },
  { id: "Tanjay", region: "region-7", label: "Tanjay" },
  // Region VIII
  { id: "Tacloban", region: "region-8", label: "Tacloban" },
  { id: "Ormoc", region: "region-8", label: "Ormoc" },
  { id: "Calbayog", region: "region-8", label: "Calbayog" },
  { id: "Catbalogan", region: "region-8", label: "Catbalogan" },
  { id: "Maasin", region: "region-8", label: "Maasin" },
  { id: "Borongan", region: "region-8", label: "Borongan" },
  // Region IX
  { id: "Zamboanga City", region: "region-9", label: "Zamboanga City" },
  { id: "Pagadian", region: "region-9", label: "Pagadian" },
  { id: "Dipolog", region: "region-9", label: "Dipolog" },
  { id: "Dapitan", region: "region-9", label: "Dapitan" },
  { id: "Isabela", region: "region-9", label: "Isabela" },
  // Region X
  { id: "Cagayan de Oro", region: "region-10", label: "Cagayan de Oro" },
  { id: "Iligan", region: "region-10", label: "Iligan" },
  { id: "Malaybalay", region: "region-10", label: "Malaybalay" },
  { id: "Valencia", region: "region-10", label: "Valencia" },
  { id: "Ozamiz", region: "region-10", label: "Ozamiz" },
  { id: "Oroquieta", region: "region-10", label: "Oroquieta" },
  { id: "Tangub", region: "region-10", label: "Tangub" },
  { id: "Gingoog", region: "region-10", label: "Gingoog" },
  { id: "El Salvador", region: "region-10", label: "El Salvador" },
  // Region XI
  { id: "Davao City", region: "region-11", label: "Davao City" },
  { id: "Tagum", region: "region-11", label: "Tagum" },
  { id: "Mati", region: "region-11", label: "Mati" },
  { id: "Digos", region: "region-11", label: "Digos" },
  { id: "Samal", region: "region-11", label: "Samal" },
  { id: "Panabo", region: "region-11", label: "Panabo" },
  // Region XII
  { id: "General Santos", region: "region-12", label: "General Santos" },
  { id: "Koronadal", region: "region-12", label: "Koronadal" },
  { id: "Tacurong", region: "region-12", label: "Tacurong" },
  { id: "Kidapawan", region: "region-12", label: "Kidapawan" },
  { id: "Cotabato City", region: "region-12", label: "Cotabato City" },
  // Region XIII
  { id: "Butuan", region: "region-13", label: "Butuan" },
  { id: "Surigao", region: "region-13", label: "Surigao" },
  { id: "Tandag", region: "region-13", label: "Tandag" },
  { id: "Bislig", region: "region-13", label: "Bislig" },
  { id: "Bayugan", region: "region-13", label: "Bayugan" },
  { id: "Cabadbaran", region: "region-13", label: "Cabadbaran" },
  // BARMM
  { id: "Marawi", region: "barmm", label: "Marawi" },
  { id: "Jolo", region: "barmm", label: "Jolo" },
  { id: "Lamitan", region: "barmm", label: "Lamitan" },
];

// Default city
export const DEFAULT_CITY = "Manila";

// Common barangay sample (for dropdown/autocomplete)
export const SAMPLE_BARANGAYS: Record<string, string[]> = {
  // ── NCR ──
  Manila: [
    "Barangay 1", "Barangay 2", "Ermita", "Intramuros", "Malate",
    "Paco", "Pandacan", "Port Area", "Quiapo", "Sampaloc",
    "San Andres", "San Miguel", "San Nicolas", "Santa Ana",
    "Santa Cruz", "Santa Mesa", "Tondo",
  ],
  "Quezon City": [
    "Bagong Lipunan", "Bagumbayan", "Balingasa", "Bgy. Capitol",
    "Commonwealth", "Cubao", "Diliman", "Kamuning",
    "Loyola Heights", "New Manila", "Project 4", "Roxas District",
    "San Francisco del Monte", "Santa Mesa Heights", "South Triangle",
    "Tandang Sora", "UP Campus", "White Plains",
  ],
  Makati: [
    "Bel-Air", "Bangkal", "Dasmariñas", "Forbes Park", "Guadalupe Nuevo",
    "Guadalupe Viejo", "Kasilawan", "La Paz", "Legazpi Village",
    "Magallanes", "Olympia", "Palanan", "Pembo", "Pinagkaisahan",
    "Pio del Pilar", "Poblacion", "Salcedo Village", "San Antonio",
    "San Isidro", "San Lorenzo", "Santa Cruz", "Singkamas",
    "Tejeros", "Urdaneta", "Valenzuela",
  ],
  Taguig: [
    "Bagumbayan", "Bambang", "Calzada", "Central Bicutan", "Central Signal",
    "Fort Bonifacio", "Hagonoy", "Ibayo-Tipas", "Katuparan",
    "Ligid-Tipas", "Lower Bicutan", "Maharlika", "Napindan",
    "New Lower Bicutan", "North Daang Hari", "Palar", "Pinagsama",
    "San Miguel", "Santa Ana", "South Daang Hari", "Tanyag",
    "Upper Bicutan", "Ususan", "Wawa",
  ],
  Pasig: [
    "Bagong Ilog", "Bagong Katipunan", "Bambang", "Buting",
    "Caniogan", "Dela Paz", "Kalawaan", "Kapasigan",
    "Kapitolyo", "Malinao", "Manggahan", "Maybunga",
    "Oranbo", "Palatiw", "Pinagbuhatan", "Poblacion",
    "Rosario", "Sagad", "San Antonio", "San Joaquin",
    "San Jose", "San Miguel", "Santolan", "Santa Cruz",
    "Santa Lucia", "Santo Tomas", "Sumilang", "Ugong",
  ],
  Mandaluyong: [
    "Addition Hills", "Bagong Silang", "Barangka Drive", "Barangka Ibaba",
    "Barangka Ilaya", "Barangka Itaas", "Buayang Bato", "Daang Bakal",
    "Hagdan Bato Libis", "Hagdan Bato Itaas", "Hulo", "Mabini-J. Rizal",
    "Malamig", "Mount Samat", "Namayan", "New Zañiga",
    "Old Zañiga", "Pag-asa", "Pleasant Hills", "Poblacion",
    "San Juan", "San Martin De Porres", "San Vicente", "Santolan",
    "Vergara", "Wack-Wack Greenhills",
  ],
  Muntinlupa: [
    "Alabang", "Ayala Alabang", "Bayanan", "Buli", "Cupang",
    "New Alabang Village", "Poblacion", "Putatan", "Sucat",
    "Tunasan",
  ],
  Pasay: [
    "Barangay 1-183", "Don Carlos", "Malibay", "Maricaban",
    "San Isidro", "San Jose", "San Rafael", "Santa Clara",
    "Santa Cruz", "Santo Niño", "Villamor Air Base",
  ],
  "Paranaque": [
    "Baclaran", "Barangay Sun Valley", "Don Bosco", "Don Galo",
    "La Huerta", "Merville", "Moonwalk", "San Antonio",
    "San Dionisio", "San Isidro", "San Martin de Porres",
    "San Valentin", "Santa Monica", "Sto. Niño", "Tambo",
    "Vitalez",
  ],
  Marikina: [
    "Barangka", "Calumpang", "Concepcion Dos", "Concepcion Uno",
    "Fortune", "Industrial Valley", "Jesus De La Peña", "Malanday",
    "Marikina Heights", "Nangka", "Parang", "San Roque",
    "Santa Elena", "Santo Niño", "Tañong", "Tumana",
  ],
  Caloocan: [
    "Bagong Barrio", "Bagong Silang", "Barangay 1-188", "Camarin",
    "Deparo", "Kaybiga", "Libis", "Llano", "Maypajo",
    "Morning Breeze", "Potrero", "Sangandaan", "Tala",
  ],
  "Las Pinas": [
    "Almanza Dos", "Almanza Uno", "BF International Village", "CAA",
    "Daniel Fajardo", "Elias Aldana", "Ilaya", "Manuyo Dos",
    "Manuyo Uno", "Pamplona Dos", "Pamplona Uno", "Pilar",
    "Pulang Lupa Dos", "Pulang Lupa Uno", "Talon Dos", "Talon Kuatro",
    "Talon Singko", "Talon Tres", "Talon Uno", "Zapata",
  ],
  Valenzuela: [
    "Arkong Bato", "Bagbaguin", "Balangkas", "Bignay", "Dalandanan",
    "Isla", "Karuhatan", "Lingunan", "Mabolo", "Malanday",
    "Malinta", "Mapulang Lupa", "Maysan", "Palasan", "Parada",
    "Pariancillo", "Paso De Blas", "Poblacion", "Polo", "Punturin",
    "Rincon", "Tagalag", "Ugong", "Veinte Reales",
  ],
  Malabon: [
    "Acacia", "Baritan", "Bayan-bayanan", "Catmon", "Concepcion",
    "Dampalit", "Flores", "Hulong Duhat", "Ibaba", "Longos",
    "Maysilo", "Muzon", "Niugan", "Panghulo", "Potrero",
    "San Agustin", "San Jose", "San Juan", "San Vicente",
    "Santiago", "Santolan", "Tañong", "Tinajeros", "Tonsuya",
  ],
  Navotas: [
    "Bagumbayan North", "Bagumbayan South", "Bangkulasi", "Daanghari",
    "Navotas East", "Navotas West", "San Jose", "San Rafael Village",
    "San Roque", "Sipac-Almacen", "Tangos", "Tanza",
  ],
  "San Juan": [
    "Addition Hills", "Balong-bato", "Barangay Balong-bato", "Batasan",
    "Corazon de Jesus", "Ermitaño", "Halo-halo", "Isabelita",
    "Kabayanan", "Little Baguio", "Maybunga", "Pedro Cruz",
    "Progreso", "Rivera", "Salapan", "San Perfecto",
    "Santa Lucia", "Tibagan", "West Crame",
  ],

  // ── CAR ──
  Baguio: [
    "Alfonso Tabora", "Ambiong", "Andres Bonifacio", "Apugan",
    "Asin", "Atok Trail", "Aurora Hill", "Bakakeng",
    "Balsigan", "Bayabas", "Bayan Park", "BGH Compound",
    "Brookside", "Brookspoint", "Burnham", "Cabinet Hill",
    "Camp Allen", "Camp 7", "Camp 8", "Campo Filipino",
    "City Camp", "Dizon Subdivision", "Dontogan", "Fairview",
    "Ferdinand", "Fort del Pilar", "Gabriela Silang", "Gibraltar",
    "Greenwater", "Guisad", "Holy Ghost", "Honeymoon",
    "Imelda", "Irisan", "Kabayanihan", "Kayang",
    "Kias", "Legarda", "Liwanag-Loakan", "Loakan",
    "Lourdes Subdivision", "Lucban", "Lukban", "Magsaysay",
    "Marcos Highway", "Middle Quezon Hill", "Military Cut-off",
    "Mines View", "Mirador", "Modern Site", "MRR-Queen of Peace",
    "New Lucban", "Outlook Drive", "Pacdal", "Pinsao",
    "Polo Field", "Pucsusan", "Quezon Hill", "Quirino Hill",
    "Rizal Monument", "Rock Quarry", "Saint Joseph Village",
    "San Antonio", "San Luis", "San Roque Village", "San Vicente",
    "Sanitary Camp", "Santa Escolastica", "Seged", "Session Road",
    "Slaughter House", "SLU-SVP", "South Drive", "Sto. Niño",
    "Sto. Tomas", "Taslag", "Trancoville", "Upper Quezon Hill",
    "Victoria Village", "Wagang",
  ],
  "La Trinidad": [
    "Alapang", "Ambiong", "Bahong", "Balili", "Beckel",
    "Betag", "Bineng", "Cruz", "Lubas", "Pico",
    "Poblacion", "Puguis", "Shilan", "Tawang", "Wangal",
  ],
  Bontoc: [
    "Alab Proper", "Alab Oriente", "Balili", "Bayyo", "Bontoc Ili",
    "Caneo", "Dalican", "Dantay", "Gonogon", "Guinaang",
    "Mainit", "Maligcong", "Masla", "Poblacion", "Samoki",
    "Talubin", "Tocucan",
  ],

  // ── Region I ──
  Dagupan: [
    "Arellano", "Bacayao Norte", "Bacayao Sur", "Barangay I-IV",
    "Bocac", "Bonuan Boquig", "Bonuan Binloc", "Bonuan Gueset",
    "Calmay", "Carael", "Caranglaan", "Herrero", "Lasip",
    "Lucao", "Malibong", "Mamalingling", "Mangin", "Mayombo",
    "Pantal", "Poblacion", "Pogo Grande", "Pogo Chico", "Pugaro",
    "Salapingao", "Salisay", "Tambac", "Tapuac", "Tebeng",
  ],
  Laoag: [
    "Barangay 1-15", "Barit", "Bgy. San Mateo", "Bgy. Santa Cayetana",
    "Buttong", "Caaoacan", "Cabungaan", "Calayab", "Camangaan",
    "Cataban", "Gabu Norte", "Gabu Sur", "La Paz", "La Paz Sur",
    "Lataag", "Madiladig", "Mangato", "Nangalisan", "Navotas",
    "Nuestra Señora de Consolacion", "Nuestra Señora de Soledad",
    "Nuestra Señora de la Paz", "Nuestra Señora del Rosario",
    "Pila", "San Agustin", "San Francisco", "San Isidro",
    "San Jose", "San Lorenzo", "San Mateo", "San Pedro",
    "San Vicente", "Santa Angela", "Santa Balbina", "Santa Cayetana",
    "Santa Joaquina", "Santa Marcela", "Santa Maria", "Santa Rosa",
    "Santo Tomas", "Suyo", "Talingaan", "Villamar",
  ],
  Vigan: [
    "Barangay 1-9", "Ayusan Norte", "Ayusan Sur", "Baracbac",
    "Barangay", "Bedbed", "Bigbiga", "Binongan", "Bulala",
    "Cabaritan", "Calampinao", "Camangaan", "Capangpangan",
    "Casilagan", "Catangtangan", "Caoayan", "Danuman", "Gabaldon",
    "Guerrero", "Imus", "Lapaz", "Linder", "Mabanbanag",
    "Mabini", "Magsaysay", "Mangla", "Paduya", "Pagburnayan",
    "Pagdumayan", "Pagsanahan", "Palale", "Pandaan", "Pandayan",
    "Pantay Daya", "Pantay Fatima", "Pantay Laud", "Paoa",
    "Paratong", "Parparia", "Pongol", "Purok", "Quirino",
    "Rang-ay", "Rizal", "Rugao", "Salindeg", "San Jose",
    "San Julian", "San Pedro", "San Vicente", "Santa Catalina",
    "Santa Cruz", "Santa Elena", "Santa Maria", "Santa Monica",
    "Santa Rosa", "Santa Teresita", "Santiago", "Sidiran",
    "Sulvec", "Surong", "Tamag", "Tamarind", "Tanchang",
    "Tay-ac", "Tornillo", "Villamar",
  ],

  // ── Region II ──
  Tuguegarao: [
    "Annafunan", "Atulayan", "Baggabag", "Bagumbayan", "Balzain",
    "Buntun", "Caggay", "Capatan", "Carig", "Caritan Centro",
    "Caritan Norte", "Caritan Sur", "Cataggaman", "Cataggaman Nuevo",
    "Cataggaman Pardo", "Centro 1-10", "Cugay", "Dodan",
    "Gosi", "Larion", "Libag", "Linao", "Lingaling",
    "Lungon", "Nambalan", "Nangalisan", "Namabbalan", "Pallua",
    "Pengue", "San Gabriel", "Sical", "Tagga", "Tanza",
    "Ugac", "Ugac Sur", "Urbano",
  ],
  Santiago: [
    "Ambalatungan", "Annib", "Bangad", "Barangay 1-9", "Batal",
    "Buenavista", "Cabulay", "Calao", "Calauan", "Casambalangan",
    "Centro East", "Centro West", "Dibay", "Dingading", "Dubinan East",
    "Dubinan West", "Echague", "Ganano", "Gatbo", "Lucban",
    "Mabini", "Malabing", "Malasin", "Malico", "Minante",
    "Nabbuan", "Nagbitin", "Nagrumboan", "Namnama", "Nungnungan",
    "Paddad", "Paddanan", "Pagala", "Palanan", "Pangal",
    "Patul", "Poblacion", "Rizal", "Rosario", "Sagana",
    "Salinas", "San Luis", "San Pascual", "Santa Rosa",
    "Santo Tomas", "Sibranto", "Sinili", "Tagaytay", "Tarang",
    "Villa", "Villa Gonzaga", "Villa Rey",
  ],

  // ── Region III ──
  Angeles: [
    "Agapito del Rosario", "Amsic", "Anunas", "Balibago",
    "Capaya", "Claro M. Recto", "Cuayan", "Cutcut", "Cutud",
    "Lourdes Sur", "Lourdes Sur East", "Malabanias", "Margot",
    "Marisol", "Mining", "Ninoy Aquino", "Pampang", "Pandanan",
    "Pulung Cacutud", "Pulungbulo", "Pulung Maragul", "Salapungan",
    "San Jose", "San Juan", "San Lorenzo", "San Martin",
    "San Miguel", "San Nicolas", "Santa Maria", "Santa Teresita",
    "Santo Cristo", "Santo Domingo", "Santo Rosario", "Sapalibutad",
    "Sapangbato", "Tabun", "Virgen Delos Remedios",
  ],
  Olongapo: [
    "Asinan", "Banicain", "Barretto", "East Bajac-Bajac", "East Tapinac",
    "Gordon Heights", "Kalaklan", "Mabayuan", "New Cabalan",
    "New Ilalim", "New Kababae", "New Kalalake", "Old Cabalan",
    "Pag-asa", "Santa Rita", "West Bajac-Bajac", "West Tapinac",
  ],
  "San Fernando": [
    "Alasas", "Baliti", "Bulaon", "Calulut", "Dela Paz Norte",
    "Dela Paz Sur", "Del Carmen", "Del Pilar", "Del Rosario",
    "Dolores", "Juliana", "Lara", "Lourdes", "Maimpis",
    "Magliman", "Malino", "Malpitic", "Pandaras", "Panipuan",
    "Pulung Bulu", "Quebiauan", "Saguin", "San Agustin",
    "San Felipe", "San Isidro", "San Jose", "San Juan",
    "San Nicolas", "San Pedro", "San Roque", "San Vicente",
    "Santo Niño", "Santo Rosario", "Sapalibutad", "Sindalan",
    "Telabastagan",
  ],

  // ── Region IV-A ──
  Antipolo: [
    "Bagong Nayon", "Barangay 1-11", "Beverly Hills", "Calawis",
    "Cupang", "Dalig", "Dela Paz", "Inarawan", "Mahabang Parang",
    "Mambugan", "Mangga", "Mayamot", "Muntindilaw", "Pag-asa",
    "San Isidro", "San Jose", "San Juan", "San Luis",
    "San Roque", "Santa Cruz", "Santo Niño", "Sumulong Hills",
  ],
  "Santa Rosa": [
    "Aplaya", "Balibago", "Caingin", "Dila", "Dita",
    "Don Jose", "Kanluran", "Labas", "Macabling", "Malitlit",
    "Malusak", "Market Area", "Poblacion", "Pulong Santa Cruz",
    "Santo Domingo", "Sinalhan", "Tagapo", "Tungkong Mangga",
  ],
  Calamba: [
    "Bagong Kalsada", "Banlic", "Barandal", "Barangay 1-7", "Bubuyan",
    "Buclad", "Burol", "Camaligan", "Canlubang", "Halang",
    "Hornalan", "Kay-Anlog", "La Mesa", "Laguerta", "Lawin",
    "Lecheria", "Lingga", "Looc", "Mabato", "Majada Labas",
    "Makiling", "Mapagong", "Masili", "Maunong", "Mayapa",
    "Milagrosa", "Paciano", "Palile", "Parian", "Pungo",
    "Punta", "Puting Lupa", "Real", "Sampiruhan", "San Cristobal",
    "San Jose", "San Juan", "San Miguel", "San Pablo",
    "San Pedro", "Santa Rosa", "Santo Tomas", "Selong",
    "Sirang Lupa", "Tulo", "Ulango", "Wawa",
  ],
  Batangas: [
    "Alangilan", "Balagtas", "Balete", "Banaba Center", "Banaba East",
    "Banaba West", "Barangay 1-24", "Bilogo", "Bolbok", "Bukal",
    "Calicanto", "Catandala", "Conde Labac", "Cumba", "Cuta",
    "Dalig", "Dela Paz", "Dela Punta", "Dita", "Dolor",
    "Gulod Itaas", "Gulod Labac", "Haligue", "Ilijan", "Kumintang Ibaba",
    "Kumintang Ilaya", "Libjo", "Liponpon", "Mabacong", "Malitam",
    "Maricaban", "Mataas na Lupa", "Niugan", "Pagkilatan", "Paharang East",
    "Paharang West", "Pallocan East", "Pallocan West", "Pinamucan",
    "Pinamucan Ibaba", "Pinamucan Ilaya", "Sampaga", "San Agapito",
    "San Agustin East", "San Agustin West", "San Antonio", "San Isidro",
    "San Jose", "San Juan", "San Miguel", "San Pedro", "San Simon",
    "Santa Clara", "Santa Rita", "Santa Teresita", "Santo Niño",
    "Santo Tomas", "Sorosoro", "Tabangao", "Tabangao Ambulong",
    "Talahib", "Tulo", "Tulo Pook",
  ],

  // ── Region V ──
  Legazpi: [
    "Arimbay", "Bagacay", "Bagumbayan", "Banquerohan", "Bariw",
    "Bigaa", "Bogtong", "Bogtong", "Buenavista", "Buyuan",
    "Cagbacong", "Cagbariw", "Cagsawa", "Carayan", "Dap-dap",
    "Dinagaan", "Dita", "Em's Barrio", "Estanza", "Gogon",
    "Homapon", "Illa", "Imalnod", "Kapantawan", "Kawit-East Washington",
    "Lacag", "Lambayong", "Libon", "Ligban", "Mabinit",
    "Mariawa", "Mariroc", "Matagbac", "Mati", "Moro",
    "Ormo", "Osiao", "Padang", "Palanog", "Pawa",
    "Pinaric", "Puro", "Rawis", "Sabang", "San Francisco",
    "San Joaquin", "San Juan", "San Miguel", "San Roque",
    "San Vicente", "Santa Cruz", "Santo Domingo", "Santo Niño",
    "Sawangan", "Tagas", "Taysan", "Tula-tula",
    "Tuburan", "Upper Banquerohan", "Villahermosa",
  ],
  Naga: [
    "Abella", "Bagumbayan Norte", "Bagumbayan Sur", "Balatas",
    "Calauag", "Cararayan", "Carolina", "Concepcion Grande",
    "Concepcion Pequeña", "Dayangdang", "Del Rosario", "Dinaga",
    "Gabardino", "Igualdad", "Lerma", "Liboton", "Mabolo",
    "Magsaysay", "Naga View", "Pacol", "Panicuason", "Peñafrancia",
    "Sabang", "San Felipe", "San Francisco", "San Isidro",
    "San Jose", "San Juan", "San Miguel", "San Nicolas",
    "San Pedro", "San Rafael", "San Ramon", "San Roque",
    "San Vicente", "Santa Cruz", "Santa Elena", "Santa Isabel",
    "Santa Maria", "Santo Domingo", "Santo Niño", "Sta. Teresita",
    "Tabuco", "Tinago", "Triangulo", "Ward 1-27",
  ],

  // ── Region VI ──
  "Iloilo City": [
    "Arevalo", "Benedicto", "Burgos", "Calaparan", "Concepcion",
    "Cochero", "Dayao", "Dungon", "East Baluarte", "East Timawa",
    "Ed Ganzon", "General Hughes", "Hipodromo", "Inday",
    "Jalandoni", "Jaro", "Lapuz", "Ledesma", "Legaspi",
    "Loboc", "Lourdes", "Mabini", "Magsaysay", "Molo",
    "Molo", "Montes", "Muelle Loney", "Nabitasan", "Nonoy",
    "North Avanceña", "North Baluarte", "North Fundidor", "Ortiz",
    "OSMENA", "Our Lady Of Lourdes", "Pala-Pala", "Pati",
    "President Roxas", "Rizal", "Rizal Estanzuela", "Rosario",
    "San Agustin", "San Antonio", "San Felix", "San Isidro",
    "San Jose", "San Juan", "San Nicolas", "San Pedro",
    "San Rafael", "Santa Cruz", "Santa Filomena", "Santa Rosa",
    "Santo Domingo", "Santo Niño", "Santo Rosario", "Simeon",
    "Sinikway", "Tabucan", "Tanza", "Tanza Baybay", "Timawa",
    "Veterans Village", "Villa Anita", "West Habog", "West Timawa",
    "Yulo",
  ],
  Bacolod: [
    "Alijis", "Banago", "Barangay 1-41", "Bata", "Burgos",
    "Cabug", "Carmen", "Castro", "Dioscoro", "Dumlog",
    "El Pardo", "Estefania", "Felisa", "Granada", "Handumanan",
    "Kalawag", "Lata", "Lopez Jaena", "Mandalinggan", "Mansilingan",
    "Maranon", "Monte Vista", "Muhon", "Natoy", "Pahanocoy",
    "Punta Taytay", "Punta Tabuc", "Salvacion", "Singcang",
    "Sum-ag", "Taculing", "Tangub", "Villamonte", "Vista Alegre",
  ],

  // ── Region VII ── (existing Cebu, Mandaue, Lapu-Lapu kept)
  "Cebu City": [
    "Adlaon", "Agsungot", "Apas", "Bacayan", "Banilad",
    "Basak Pardo", "Basak San Nicolas", "Binaliw", "Bonbon",
    "Buhisan", "Bulacao Pardo", "Camputhaw", "Capitol Site",
    "Carreta", "Cogon Ramos", "Day-as", "Ermita", "Guadalupe",
    "Guba", "Hipodromo", "Inayawan", "Kalunasan", "Kamputhaw",
    "Kasambagan", "Lahug", "Lorega", "Lusaran", "Luz",
    "Mabolo", "Malubog", "Mambaling", "Pahina Central", "Parian",
    "Pit-os", "Poblacion Pardo", "Pulangbato", "Pung-ol-Sibugay",
    "Sambag I", "Sambag II", "San Antonio", "San Jose",
    "San Nicolas", "Sapangdaku", "Sawang Calero", "Sirao",
    "Suba", "Tabunan", "Taptap", "Tisa", "To-ong",
    "Urgello", "V. Rama",
  ],
  Mandaue: [
    "Alang-alang", "Bakilid", "Banilad", "Basak", "Cabancalan",
    "Cambaro", "Canduman", "Casili", "Casuntingan", "Centro",
    "Cubacub", "Guizo", "Ibabao-Estancia", "Jagobiao", "Labogon",
    "Looc", "Maguikay", "Mantuyong", "Opao", "Pagsabungan",
    "Pakna-an", "Poblacion", "Subangdaku", "Tabok", "Tawason",
    "Tingub", "Tipolo", "Umapad",
  ],
  "Lapu-Lapu": [
    "Agus", "Babak", "Bankal", "Baring", "Basak", "Buang",
    "Calawisan", "Canjulao", "Caw-oy", "Cawhagan", "Caubian",
    "Gun-ob", "Ibo", "Looc", "Mactan", "Maribago",
    "Marigondon", "Pajac", "Pajo", "Pangan-an", "Poblacion",
    "Punta Engaño", "Pusok", "Sabang", "Sacsac", "San Vicente",
    "Santa Rosa", "Subabasbas", "Talima", "Tingo", "Tungasan",
    "Walis Walis",
  ],
  Dumaguete: [
    "Bagacay", "Bajumpandan", "Balugo", "Banilad", "Bantolinao",
    "Batinguel", "Buenavista", "Cadawinonan", "Camanjac", "Candau-ay",
    "Cantil-e", "Daroy", "Elias", "Hibbard", "Junob",
    "Looc", "Magsaysay", "Mangnao", "Mantuyong", "Motong",
    "Piapi", "Poblacion 1-8", "Pulangtubig", "Tabuc-tubig",
    "Taclobo", "Talay",
  ],
  Tagbilaran: [
    "Antipolo", "Bo-ol", "Bool", "Cogon", "Dao", "Dampas",
    "Dampas", "Dampas District", "Danglag", "Graham Avenue",
    "Manga", "Mansasa", "Poblacion 1-3", "San Isidro",
    "Sto. Niño", "Talisay", "Tiptip", "Ubujan",
  ],

  // ── Region VIII ──
  Tacloban: [
    "Anibong", "Apitong", "Barangay 1-109", "Baras", "Basper",
    "Bayanihan", "Buenavista", "Bugo", "Caibaan", "Calanipawan",
    "Candahug", "Cogon", "Costa Brava", "Del Rey", "Diit",
    "El Reposo", "Ground", "Habus", "Igot", "Lower Nula",
    "Marasbaras", "Nula", "Nula", "Nula", "Palanog",
    "Pamplona", "Pao", "Pawing", "PHHC", "Pitogo",
    "Poblacion", "Quarry", "Sabang", "Sagkahan", "Salvacion",
    "San Fernando", "San Jose", "San Roque", "Santa Elena",
    "Santo Domingo", "Santo Niño", "Saoit", "Sidong", "Suraw",
    "Tagapuro", "Tigbao", "V and G", "Villa", "Villa Cristina",
    "Villa Isabel", "Viste",
  ],
  Ormoc: [
    "Alas-as", "Alang-alang", "Albuera", "Alta Vista", "Antipolo",
    "Astorga", "Baha-bahandi", "Bagong Lipunan", "Bairan", "Batuan",
    "Buenavista", "Buri", "Cabadbaran", "Cabulihan", "Cagbuhangin",
    "Camp Downes", "Can-adieng", "Can-untog", "Cantong", "Cogon",
    "Concepcion", "Cruz", "Curva", "Danao", "Don Felipe",
    "Don Joaquin", "Don Vicente", "Doña Feliza", "Doña Luisa",
    "Doña Maria", "East", "Esperanza", "Gabaldon", "Green Valley",
    "Guba", "Hibunawon", "Hugpa", "Ipil", "Joaquin",
    "Lao", "Laray", "Linao", "Liloan", "Luz",
    "Mabato", "Mabini", "Macabug", "Mag-atas", "Malatbalat",
    "Manhan", "Masarayao", "Mas-in", "Maya", "Meadow",
    "Miyam", "Naga", "Naungan", "Padre", "Patag",
    "Poblacion", "Rizal", "Salvacion", "San Antonio", "San Dionisio",
    "San Eduardo", "San Isidro", "San Jose", "San Juan",
    "San Pablo", "San Pedro", "San Vicente", "Santa Fe",
    "Santa Maria", "Santo Niño", "Sugod", "Tabon", "Talisay",
    "Tigbao", "Tuguib", "Valencia", "Villa",
  ],

  // ── Region IX ──
  "Zamboanga City": [
    "Arena Blanco", "Ayala", "Baliwasan", "Barangay 1-200",
    "Boalan", "Bolong", "Buenavista", "Bunguiao", "Busay",
    "Cabaluay", "Cabatangan", "Cacao", "Calabasa", "Calarian",
    "Camino Nuevo", "Campo Islam", "Canelar", "Capisan", "Cawit",
    "Culianan", "Curuan", "Dita", "Divisoria", "Dulian",
    "Dulian", "Dulian", "Dumanquilas", "Guiwan", "Kasanyangan",
    "La Paz", "Labuan", "Lapakan", "Latuan", "Licomo",
    "Limpapa", "Lubigan", "Lunzuran", "Mabuhay", "Maasin",
    "Magdalena", "Malagutay", "Mampang", "Manalipa", "Mangusu",
    "Manicahan", "Mariki", "Mercedes", "Muti", "Pamucutan",
    "Pangapuyan", "Pasonanca", "Patalon", "Putik", "Quiniput",
    "Recodo", "Rio Hondo", "Salaan", "San Jose", "San Jose Cawa-Cawa",
    "San Roque", "Santa Catalina", "Santa Maria", "Santo Niño",
    "Sibulao", "Sinubong", "Tagasilay", "Taguiti", "Talabaan",
    "Talisayan", "Talon-talon", "Taluksangay", "Tetuan", "Tictapul",
    "Tigbalabag", "Tolosa", "Tugbungan", "Tumalutab", "Tumitus",
    "Victoria", "Vitali", "Zambowood",
  ],
  Pagadian: [
    "Balangasan", "Banale", "Bogo", "Bomba", "Buadi",
    "Buenavista", "Bulatok", "Bulawan", "Dumagoc", "Gatas",
    "Kagawasan", "Kahayagan", "Kalasan", "Kawit", "Lapogan",
    "Las Nieves", "Laya", "Lourdes", "Lower Panalsalan", "Lower Sibatang",
    "Lumbag", "Malbang", "Manga", "Murdoc", "Napolan",
    "Neogan", "Poblacion", "San Francisco", "San Jose", "San Pedro",
    "Santa Lucia", "Santa Maria", "Santo Niño", "Sawmill", "Senote",
    "Sinonoc", "Sta. Catalina", "Sta. Cruz", "Sta. Lucia",
    "Sto. Niño", "Tahak", "Talisay", "Tiguma", "Tuburan",
    "Tulbong", "Upper Panalsalan", "Upper Sibatang", "White Beach",
  ],

  // ── Region X ── (existing CDO kept)
  "Cagayan de Oro": [
    "Balulang", "Barangay 1-40", "Bugo", "Camaman-an", "Canitoan",
    "Carmen", "Consolacion", "Cugman", "Dahilig", "Dansolihon",
    "F.S. Catanico", "Gusa", "Indahag", "Iponan", "Kauswagan",
    "Lapasan", "Lumbia", "Macabalan", "Macasandig", "Nazareth",
    "Pagalungan", "Patag", "Puerto", "Puntod", "Tablon",
    "Taglimao", "Tignapoloan", "Tuburan", "Tumapon",
  ],
  Iligan: [
    "Abuno", "Acmac", "Bagong Silang", "Bonbonon", "Buru-un",
    "Dalipuga", "Dulag", "Hinaplanon", "Kiwanan", "Lanipao",
    "Mahayahay", "Mainit", "Mandulog", "Maria Cristina", "Pala-o",
    "Panoroganan", "Poblacion", "Rogongon", "San Miguel",
    "San Roque", "Santiago", "Saray", "Suarez", "Tambilag",
    "Tibanga", "Tipanoy", "Tomayomo", "Tominobo", "Tubod",
    "Ubaldo D. Laya", "Upper Hinaplanon", "Villaverde",
    "Yllana",
  ],

  // ── Region XI ── (existing Davao kept)
  "Davao City": [
    "Agdao", "Baguio", "Buhangin", "Bunawan", "Calinan",
    "Catalunan Grande", "Catalunan Pequeño", "Divisoria", "Ecoland",
    "Ilang", "Inayangan", "Lacson", "Lapu-Lapu", "Leon Garcia",
    "Ma-a", "Magtuod", "Mahayag", "Malabog", "Malagos",
    "Mandug", "Mintal", "Mudiang", "Mulig", "Pañalum",
    "Pansud", "Puan", "San Isidro", "Sasa", "Talomo",
    "Tibungco", "Toril", "Ubalde", "Wangan",
  ],
  Tagum: [
    "Apokon", "Bincungan", "Busan", "Canocotan", "Cuambogan",
    "La Filipina", "Magdum", "Madaum", "Mankilam", "New Balamban",
    "Nueva Fuerza", "Pagsabangan", "Pandapan", "Rizal", "San Agustin",
    "San Isidro", "San Miguel", "San Pedro", "San Vicente",
    "Santa Cruz", "Santo Niño", "Socorro", "Sumilihon", "Tibugbog",
    "Visayan Village",
  ],

  // ── Region XII ── (existing GenSan kept)
  "General Santos": [
    "Apopong", "Baluan", "Batungcong", "Biyo", "Buayan",
    "Bula", "Calumpang", "City Heights", "Conel", "Dadiangas East",
    "Dadiangas North", "Dadiangas South", "Dadiangas West", "Fatima",
    "Katangawan", "Labangal", "Lagao", "Ligaya", "Mabuhay",
    "Olympog", "Poblacion", "San Isidro", "San Jose", "Siguel",
    "Sinawal", "Tambler", "Tinagacan", "Upper Labay",
  ],
  "Cotabato City": [
    "Bagua", "Kalanganan", "Mother Barangay", "Mother Bagua",
    "Mother Kalanganan", "Mother Poblacion", "Mother Rosary Heights",
    "Poblacion", "Rosary Heights 1-13", "Tamontaka 1-3",
  ],

  // ── Region XIII ──
  Butuan: [
    "Agao", "Agsao", "Agusan Pequeño", "Amparo", "Ampayon",
    "Anticala", "Antongalon", "Aupagan", "Baan KM 3", "Babag",
    "Bading", "Bancasi", "Banza", "Baobaoan", "Basag",
    "Bayanihan", "Bilay", "Bit-os", "Bitan-agan", "Bobon",
    "Boni", "Bugsukan", "Buhangin", "Cabatan", "Cabusao",
    "Cagbuhangin", "Cagbunga", "Calamani", "Camanchiles", "Camas",
    "Caniyan", "Carmen", "Causwagan", "Cebu", "Charito",
    "Chao", "Cogong", "Colonia", "Concepcion", "Cubay",
    "De Oro", "Dagohoy", "Datu", "De Oro", "Dulag",
    "El Rio", "Esperanza", "Filipinas", "Golden", "Gracia",
    "Guadalupe", "Humilog", "Iran", "Jabonga", "Jaliobong",
    "Kapa", "Kauswagan", "Kinamlutan", "Lapipa", "Lapogan",
    "Las Pinas", "Lemon", "Lianga", "Limaha", "Lino",
    "Lumbocan", "Mabini", "Magsaysay", "Mahay", "Mahogany",
    "Manat", "Manga", "Marcos", "Mata", "Mawab",
    "Mercado", "Minglanilla", "Obrero", "Ondoy", "Otek",
    "Pagatpatan", "Pangabugan", "Pigdaulan", "Poblacion", "Rizal",
    "Sagrada", "Salvacion", "San Ignacio", "San Jose", "San Mateo",
    "San Roque", "San Vicente", "Santa Ana", "Santo Niño",
    "Sawagan", "Sikatuna", "Silo", "Silongan", "Tablon",
    "Taguibo", "Taligaman", "Tandang Sora", "Tanggol", "Tinago",
    "Tongonan", "Tungao", "Tungod", "Ungap", "Villa",
    "Villa Kananga", "Villa Undo", "Walo",
  ],

  // ── BARMM ──
  Marawi: [
    "Amai", "Babato", "Bacolod", "Bacong", "Bacsay", "Bagigicon",
    "Bago", "Balagun", "Balob", "Basak", "Bato", "Baya",
    "Bolod", "Bubun", "Bubong", "Buadi", "Bubong", "Bubong",
    "Bubong", "Bubong", "Cadayonan", "Cadayonan", "Caloocan",
    "Camalig", "Campo", "Carpenter", "Dalama", "Dansalan",
    "Datu", "Datu", "Datu", "Datu", "Datu", "Datu",
    "Dinaig", "Domalan", "Dulay", "Dulay", "Dulay", "Dulay",
    "Gadongan", "Galor", "Gimbangan", "Gulay", "Gulay",
    "Gulay", "Gulay", "Gulay", "Gulay", "Gulay",
    "Iba", "Ilaya", "Iraya", "Kahayagan", "Kali", "Kalo",
    "Kambay", "Kanding", "Kandis", "Kapatagan", "Kauswagan",
    "Kawit", "Kendis", "Kilala", "Kulambog", "Kulambog",
    "Kulambog", "Lala", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
    "Lanao", "Lanao", "Lanao", "Lanao", "Lanao",
  ],
};

// Water product types
export const WATER_TYPES = [
  { id: "PURIFIED", label: "Purified", icon: "💧", description: "Filtered and purified drinking water" },
  { id: "MINERAL", label: "Mineral", icon: "⛰️", description: "Natural mineral water with essential minerals" },
  { id: "ALKALINE", label: "Alkaline", icon: "💎", description: "Alkaline water with pH 8+" },
];

// Product sizes
export const PRODUCT_SIZES = [
  { id: "5-gallon", label: "5 Gallons", desc: "Standard water container (~18.9L)" },
  { id: "1-gallon", label: "1 Gallon", desc: "Small container (~3.8L)" },
  { id: "500ml", label: "500ml Bottle", desc: "Single-serve bottle" },
];

// Order statuses
export const ORDER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

// Payment methods
export const PAYMENT_METHODS = [
  { id: "COD", label: "Cash on Delivery", icon: "💵", description: "Pay cash upon delivery" },
  { id: "GCASH", label: "GCash", icon: "📱", description: "Pay via GCash app" },
  { id: "CARD", label: "Credit/Debit Card", icon: "💳", description: "Pay with any card" },
  { id: "PAYMAYA", label: "PayMaya", icon: "🟣", description: "Pay via PayMaya" },
];

// Recurring schedule options
export const RECURRING_OPTIONS = [
  { id: "ONCE", label: "One-Time Delivery" },
  { id: "MON", label: "Every Monday" },
  { id: "WED", label: "Every Wednesday" },
  { id: "FRI", label: "Every Friday" },
  { id: "SAT", label: "Every Saturday" },
];

// Commission rate (for Phase 2, currently 0%)
export const PLATFORM_COMMISSION_RATE = 0;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;

// Map defaults (centered on Manila)
export const DEFAULT_CENTER = {
  lat: 14.5995,
  lng: 120.9842,
};
export const DEFAULT_ZOOM = 12;

// Filipino-friendly messages
export const MESSAGES = {
  welcome: "Welcome to AquaLink PH!",
  tagline: "Tubig sa iyong pintuan. Sulit, mabilis, at sigurado.",
  noStations: "Walang nakitang water station sa iyong lugar.",
  noStationProducts: "This station hasn't added products yet.",
  orderSuccess: "Order placed successfully! I-monitor ang iyong order.",
  orderFailed: "May error sa order. Please try again.",
  loginRequired: "Please log in to continue.",
  locationRequired: "Please enable location or enter your address.",
  // Home page
  heroTitle: "Tubig, delivered!",
  heroSubtitle: "Order purified, mineral, and alkaline drinking water from local refilling stations. Delivered to your door in minutes.",
  searchPlaceholder: "Enter your barangay or city...",
  detectingLocation: "Detecting your location...",
  nearLocation: "Near",
  howItWorks: "Paano ito gumagana?",
  step1Title: "Find a Station",
  step1Desc: "Browse water refilling stations near you.",
  step2Title: "Order Your Water",
  step2Desc: "Select your water type and schedule delivery.",
  step3Title: "Receive & Enjoy",
  step3Desc: "Get your water delivered right to your door.",
  chooseWater: "Pumili ng iyong tubig",
  nearStations: "Malapit na Stations",
  seeAll: "See All",
  noStationsFound: "No stations found yet. Be the first to list your station!",
  registerAsStation: "Register as a Water Station",
  ctaTitle: "May water station ka ba?",
  ctaDesc: "Join AquaLink PH and reach more customers. Free onboarding — no fees, no commitments.",
  ctaButton: "List Your Station Free",
  // Stations page
  allTypes: "All Types",
  searchStations: "Find a water station...",
  stationsNearby: "stations nearby",
  noStationsFiltered: "No stations found",
  noStationsFilteredDesc: "Try adjusting your filters or search terms",
  clearFilters: "Clear all filters",
  // Station detail
  menu: "Menu",
  aboutStation: "About the Station",
  openingHours: "Opening Hours",
  contact: "Contact",
  customerReviews: "Customer Reviews",
  noProducts: "No products available at the moment.",
  noReviews: "No reviews yet.",
  viewCart: "View Cart",
  goBack: "Go Back",
  // Cart
  myCart: "My Cart",
  cartEmpty: "Your cart is empty",
  cartEmptyDesc: "Looks like you haven't added any water to your cart yet.",
  browseStations: "Browse Stations",
  goHome: "Go Home",
  orderingFrom: "Ordering from",
  change: "Change",
  orderSummary: "Order Summary",
  deliveryDetails: "Delivery Details",
  paymentMethod: "Payment Method",
  subtotal: "Subtotal",
  deliveryFee: "Delivery Fee",
  free: "FREE",
  total: "Total",
  placeOrder: "Place Order",
  processing: "Processing...",
  // Orders
  myOrders: "My Orders",
  ongoing: "Ongoing",
  history: "History",
  noActiveOrders: "No active orders",
  orderWaterNow: "Order water now",
  noPastOrders: "No past orders",
  orderDetails: "Order Details",
  trackOrder: "Track Order",
  orderItems: "Order Items",
  deliveryAddress: "Delivery Address",
  backToOrders: "Back to Order History",
  support: "Support",
  // Profile
  myAddresses: "My Addresses",
  orderHistory: "Order History",
  notifications: "Notifications",
  paymentMethods: "Payment Methods",
  settings: "Settings",
  helpSupport: "Help & Support",
  logOut: "Log Out",
  // Auth
  welcomeBack: "Welcome to AquaLink PH",
  loginDesc: "Log in to order your water delivery",
  phoneNumber: "Phone Number",
  password: "Password",
  logIn: "Log In",
  loggingIn: "Logging in...",
  loginWithOtp: "Log in with OTP",
  otpSent: "OTP sent to your phone (demo: 123456)",
  enterOtp: "Enter the OTP sent to",
  changeNumber: "Change number",
  otpCode: "OTP Code",
  verifyOtp: "Verify OTP",
  verifying: "Verifying...",
  noAccount: "Don't have an account?",
  signUp: "Sign up",
  haveAccount: "Already have an account?",
  // Register
  joinTitle: "Join AquaLink PH",
  joinDesc: "Start ordering or selling water delivery",
  customer: "Customer",
  waterStation: "Water Station",
  fullName: "Full Name",
  emailOptional: "Email (optional)",
  createAccount: "Create Account",
  creatingAccount: "Creating account...",
  registerStation: "Register Your Station",
  ownerName: "Your Full Name",
  stationName: "Water Station Name",
  stationAddress: "Station Address",
  city: "City",
  // Error states
  errorTitle: "May error na nangyari",
  errorDesc: "Hindi makuha ang data. Pakisubukan muli.",
  retry: "Subukan Muli",
  stationNotFound: "Station not found",
  orderNotFound: "Order not found",
  // Dashboard
  goodDay: "Magandang araw! 👋",
  dashboardSubtitle: "Here's what's happening with your water station today.",
  totalRevenue: "Total Revenue",
  totalOrders: "Total Orders",
  customers: "Customers",
  avgDelivery: "Avg. Delivery",
  recentOrders: "Recent Orders",
  ordersToday: "You have {count} orders today.",
  viewAllOrders: "View All Orders",
  stationStatus: "Station Status",
  realTimePerformance: "Real-time performance",
  operatingHours: "Operating Hours",
  stationOnline: "Station Online",
  lowStockAlert: "Low Stock Alert",
  quickActions: "Quick Actions",
  addProduct: "Add Product",
  editStation: "Edit Station",
  // Admin
  systemOverview: "System Overview",
  globalMetrics: "Global performance metrics for AquaLink PH.",
  totalStations: "Total Stations",
  totalUsers: "Total Users",
  activeAreas: "Active Areas",
  criticalAlerts: "Critical Alerts",
  requiringAttention: "Requiring immediate attention",
  growthAnalytics: "Growth Analytics",
  // Customer Dashboard (/my)
  myDashboard: "My Dashboard",
  welcomeUser: "Magandang araw, {name}! 👋",
  activeOrder: "Active Order",
  activeOrders: "Active Orders",
  noActiveOrdersDesc: "Wala kang active na order. Mag-order na!",
  viewAll: "View All",
  orderAgain: "Order Again",
  reordering: "Reordering...",
  quickLinks: "Quick Links",
  myScheduled: "Scheduled Deliveries",
  myPaymentMethods: "Payment Methods",
  noOrdersYet: "Wala ka pang order",
  noOrdersYetDesc: "Mag-order na ng tubig mula sa mga kalapit na water station.",
  loadingDashboard: "Loading your dashboard...",
  orderStats: "Order Stats",
  reorderSuccess: "Order placed successfully! Maaari mong i-monitor ang iyong order.",
  reorderFailed: "May error sa pag-reorder. Pakisubukan muli.",
  upcomingDeliveries: "Upcoming Deliveries",
  deliveredOrders: "Recent Orders",
  deliveryTo: "Deliver to",
  orderNumber: "Order #",
};