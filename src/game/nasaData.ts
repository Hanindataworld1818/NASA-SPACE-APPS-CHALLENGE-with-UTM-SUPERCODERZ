export type MissionSiteId = 'moon' | 'mars';

export type OutpostMapVariant = 'classic' | 'frontier';

export interface OutpostMapDesignMeta {
  id: OutpostMapVariant;
  siteId: MissionSiteId;
  name: string;
  badge: string;
  tagline: string;
  terrainColor: string;
  terrainAccent: string;
  skyAccent: string;
}

export interface MissionSiteConfig {
  id: MissionSiteId;
  name: string;
  subtitle: string;
  location: string;
  missionProgram: string;
  commDelayMinutes: number;
  baseSolarKw: number;
  baselineRadMsvPerSol: number;
  gravityG: number;
  surfaceTempRange: string;
  atmosphereNote: string;
  primaryColor: string;
  terrainColor: string;
  terrainAccent: string;
  kidSummary: string;
}

export interface NasaDonkiEvent {
  id: string;
  sol: number;
  date: string;
  eventType: 'FLR' | 'SEP' | 'CME' | 'QUIET' | 'DUST';
  classType: string;
  sourceRegion: string;
  peakTimeUtc: string;
  speedKmPerSec: number;
  unshieldedDoseMsv: number;
  powerPenaltyKw: number;
  title: string;
  kidExplanation: string;
  engineeringTradeoffHint: string;
  nasaSourceUrl: string;
  isLiveApi?: boolean;
}

export interface NasaOsdrStudy {
  accessionId: string;
  categoryTag: 'plants' | 'radiation' | 'bone' | 'muscle' | 'immune' | 'sleep' | 'lifesupport';
  title: string;
  organism: string;
  mission: string;
  keyFinding: string;
  kidLesson: string;
  gameplayLink: string;
  sourceUrl: string;
}

export interface RadLabBenchmark {
  id: string;
  location: string;
  instrument: string;
  dailyDoseMsv: number;
  dailyDoseUgy: number;
  protectionLevel: string;
  kidNote: string;
  accentColor: string;
}

export interface MarsTrekLayer {
  id: string;
  label: string;
  instrument: string;
  layerPath: string;
  description: string;
}

export interface MarsTrekLandmark {
  id: string;
  name: string;
  missionTag: string;
  lat: number;
  lon: number;
  elevationMeters: number;
  tempRange: string;
  kidFact: string;
}

export interface MarsRoverPhoto {
  id: string;
  sol: number;
  earthDate: string;
  cameraName: string;
  title: string;
  caption: string;
  imgSrc: string;
}

export interface NasaApodSpotlight {
  status: 'live' | 'live-images-api' | 'archive';
  title: string;
  date: string;
  explanation: string;
  imageUrl: string;
  copyright: string;
}

export interface CsaStemActivity {
  id: string;
  titleEn: string;
  titleFr: string;
  ageRange: string;
  missionFocus: string;
  challengePrompt: string;
  kidTakeaway: string;
  sourceUrl: string;
}

export interface CsaFoodComparison {
  id: string;
  topic: string;
  moonMarsChallenge: string;
  earthArcticConnection: string;
  csaSolution: string;
}

export const MISSION_SITES: Record<MissionSiteId, MissionSiteConfig> = {
  moon: {
    id: 'moon',
    name: 'Artemis Base Camp',
    subtitle: 'Lunar South Pole · Shackleton Crater Rim',
    location: '89.9° S, 0.0° E (Moon)',
    missionProgram: 'NASA Artemis Surface Habitat',
    commDelayMinutes: 0.04, // ~1.3 seconds each way
    baseSolarKw: 6,
    baselineRadMsvPerSol: 1.1, // LRO CRaTER lunar surface dose equivalent (~380 mSv/yr)
    gravityG: 0.166,
    surfaceTempRange: '-180°C to -50°C in shadow',
    atmosphereNote: 'Zero atmosphere (Hard vacuum — zero natural radiation or micrometeoroid buffer)',
    primaryColor: '#38BDF8',
    terrainColor: '#1E293B',
    terrainAccent: '#334155',
    kidSummary:
      'Near-instant radio talk with Earth (1.3 sec), bright sunlit crater peaks, but NO atmosphere at all to block solar radiation!',
  },
  mars: {
    id: 'mars',
    name: 'Jezero Outpost Alpha',
    subtitle: 'Mars · Jezero Crater Delta',
    location: '18.38° N, 77.58° E (Mars)',
    missionProgram: 'NASA Moon-to-Mars Architecture',
    commDelayMinutes: 14.2, // up to 22 min one-way; ~14 min typical
    baseSolarKw: 6,
    baselineRadMsvPerSol: 0.64, // Curiosity RAD measured ~0.64 mSv/sol surface baseline
    gravityG: 0.38,
    surfaceTempRange: '-88°C to -12°C (Perseverance MEDA)',
    atmosphereNote: 'Thin CO2 atmosphere (1% of Earth) — dust storms can block 30-50% of solar power!',
    primaryColor: '#F97316',
    terrainColor: '#431407',
    terrainAccent: '#7C2D12',
    kidSummary:
      '14-minute radio delay to Earth means YOU must make emergency choices yourself! Watch out for red dust coating the solar panels.',
  },
};

export const OUTPOST_MAP_DESIGNS: Record<
  MissionSiteId,
  Record<OutpostMapVariant, OutpostMapDesignMeta>
> = {
  mars: {
    classic: {
      id: 'classic',
      siteId: 'mars',
      name: 'Jezero Delta Core',
      badge: 'Original Map',
      tagline: 'Ochre river delta plains, sandbag yards, Jezero picnic bench & Copter pad.',
      terrainColor: '#431407',
      terrainAccent: '#7C2D12',
      skyAccent: '#F97316',
    },
    frontier: {
      id: 'frontier',
      siteId: 'mars',
      name: 'Valles Canyon Rim',
      badge: 'New Ring Map',
      tagline: 'Crimson canyon chasm, full skybridge loop corridors, thermal vents & drill rig.',
      terrainColor: '#2B0C1E',
      terrainAccent: '#6B1D36',
      skyAccent: '#FB7185',
    },
  },
  moon: {
    classic: {
      id: 'classic',
      siteId: 'moon',
      name: 'Shackleton Rim Core',
      badge: 'Original Map',
      tagline: 'Bright ejecta craters, icy Shackleton H2O seam, Artemis flag & cryo chests.',
      terrainColor: '#1E293B',
      terrainAccent: '#334155',
      skyAccent: '#38BDF8',
    },
    frontier: {
      id: 'frontier',
      siteId: 'moon',
      name: 'Tranquillity Lava-Tube Ring',
      badge: 'New Ring Map',
      tagline: 'Indigo basalt maria, glowing lava-tube skylights, skyways & Earthrise deck.',
      terrainColor: '#0B132B',
      terrainAccent: '#1D2D50',
      skyAccent: '#22D3EE',
    },
  },
};

export function getOutpostMapDesign(
  siteId: MissionSiteId,
  mapVariant: OutpostMapVariant = 'classic'
): OutpostMapDesignMeta {
  return OUTPOST_MAP_DESIGNS[siteId][mapVariant] || OUTPOST_MAP_DESIGNS[siteId].classic;
}

/**
 * Curated real historical NASA DONKI (Space Weather Database Of Notifications,
 * Knowledge, Information) events & Mars MEDA environmental events mapped across the 7-Sol mission.
 */
export const CURATED_NASA_DONKI_SCHEDULE: NasaDonkiEvent[] = [
  {
    id: 'DONKI-2024-05-10-QUIET',
    sol: 1,
    date: '2024-05-10',
    eventType: 'QUIET',
    classType: 'C2.4 Background',
    sourceRegion: 'NOAA AR 13664',
    peakTimeUtc: '06:15 UTC',
    speedKmPerSec: 410,
    unshieldedDoseMsv: 2.0,
    powerPenaltyKw: 0,
    title: 'Calm Solar Wind · Nominal Outpost Boot',
    kidExplanation:
      'The Sun is calm today! Only gentle cosmic rays hit the outpost. Great day to test every workstation and grow food.',
    engineeringTradeoffHint:
      'Keep 1-2 kW on O2 and Hydroponics so your food and oxygen reserves build a safety cushion for future storms.',
    nasaSourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  },
  {
    id: 'DONKI-2024-05-11-M8',
    sol: 2,
    date: '2024-05-11',
    eventType: 'FLR',
    classType: 'M8.8 Solar Flare',
    sourceRegion: 'NOAA AR 13664',
    peakTimeUtc: '01:23 UTC',
    speedKmPerSec: 820,
    unshieldedDoseMsv: 14.0,
    powerPenaltyKw: 0,
    title: 'Medium Solar Flare Detected (Class M8.8)',
    kidExplanation:
      'NASA DONKI spotted a bright flash on the Sun! Fast protons are racing toward your outpost.',
    engineeringTradeoffHint:
      'Boost Radiation Shield to at least 2 kW today! That means borrowing 1 kW from Science or Hydroponics.',
    nasaSourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  },
  {
    id: 'MEDA-LRO-DUST-SHADOW',
    sol: 3,
    date: '2024-05-12',
    eventType: 'DUST',
    classType: 'Solar Attenuation -1 kW',
    sourceRegion: 'Surface Environmental Sensor',
    peakTimeUtc: '11:40 UTC',
    speedKmPerSec: 390,
    unshieldedDoseMsv: 2.5,
    powerPenaltyKw: 1,
    title: 'Electrostatic Dust & Crater Glare (-1 kW Power)',
    kidExplanation:
      'Fine space dust coated the outer solar panels, cutting your electricity supply by 1 kW until cleaned!',
    engineeringTradeoffHint:
      'Visit the EVA Airlock to wipe the solar panels (costs O2) OR run on reduced power by turning down non-essential rooms.',
    nasaSourceUrl: 'https://science.nasa.gov/mission/mars-2020-perseverance/mars-environmental-dynamics-analyzer/',
  },
  {
    id: 'DONKI-2024-05-14-X87',
    sol: 4,
    date: '2024-05-14',
    eventType: 'SEP',
    classType: 'X8.7 Extreme Flare + SEP',
    sourceRegion: 'NOAA AR 13664 (Record Cycle 25 Flare)',
    peakTimeUtc: '16:51 UTC',
    speedKmPerSec: 1750,
    unshieldedDoseMsv: 28.0,
    powerPenaltyKw: 0,
    title: 'ALERT: X8.7 Super Solar Flare & Particle Storm!',
    kidExplanation:
      'Real NASA Record Event! On May 14, 2024, sunspot AR 13664 unleashed an X8.7 flare—the strongest of Solar Cycle 25!',
    engineeringTradeoffHint:
      'CRITICAL TRADE-OFF: Divert 3 kW to Radiation Shield Vault AND calibrate shields, even if Crops and Science slow down tonight!',
    nasaSourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  },
  {
    id: 'DONKI-2024-05-15-RECOVERY',
    sol: 5,
    date: '2024-05-15',
    eventType: 'QUIET',
    classType: 'C3.1 Post-Storm Calm',
    sourceRegion: 'NOAA AR 13668',
    peakTimeUtc: '09:10 UTC',
    speedKmPerSec: 460,
    unshieldedDoseMsv: 2.2,
    powerPenaltyKw: 0,
    title: 'Post-Storm Recovery Window',
    kidExplanation:
      'The solar storm passed! After sheltering yesterday, your O2 scrubbers and Hydroponic crops need attention.',
    engineeringTradeoffHint:
      'Lower Shield power back to 1 kW and shift electricity into Hydroponics and O2 Electrolyzer to rebuild supplies.',
    nasaSourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  },
  {
    id: 'DONKI-2024-07-23-CME',
    sol: 6,
    date: '2024-07-23',
    eventType: 'CME',
    classType: 'Fast Halo CME + M5.2',
    sourceRegion: 'NOAA AR 13751',
    peakTimeUtc: '19:28 UTC',
    speedKmPerSec: 1320,
    unshieldedDoseMsv: 19.0,
    powerPenaltyKw: 1,
    title: 'Coronal Mass Ejection (CME) Magnetic Shockwave',
    kidExplanation:
      'A giant cloud of magnetized solar plasma is sweeping past! It shakes the power grid (-1 kW) and spikes radiation.',
    engineeringTradeoffHint:
      'Synchronize the Reactor Core breaker phases for +1 kW bonus power, and balance Shields vs Life Support carefully!',
    nasaSourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  },
  {
    id: 'DONKI-2024-08-01-FINAL',
    sol: 7,
    date: '2024-08-01',
    eventType: 'FLR',
    classType: 'M6.4 Flare · Final Uplink',
    sourceRegion: 'NOAA AR 13768',
    peakTimeUtc: '14:05 UTC',
    speedKmPerSec: 940,
    unshieldedDoseMsv: 12.0,
    powerPenaltyKw: 0,
    title: 'Final Sol: Moderate Flare During Deep Space Uplink',
    kidExplanation:
      'Last day of your training rotation! Earth needs your final Science transmission while a moderate M6.4 flare crackles.',
    engineeringTradeoffHint:
      'Balance Shielding (2 kW), O2 (2 kW), and Comms Dish (2 kW) to finish your mission safely and earn your Junior Astronaut Wings!',
    nasaSourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  },
];

export const NASA_OSDR_STUDIES: NasaOsdrStudy[] = [
  {
    accessionId: 'OSD-379 / GLDS-379',
    categoryTag: 'plants',
    title: 'Plant Growth in Authentic Apollo Lunar Regolith (Arabidopsis thaliana)',
    organism: 'Thale Cress & Space Crops (Paul, Ferl et al., 2022)',
    mission: 'Apollo 11, 12, 17 Samples · NASA OSDR',
    keyFinding:
      'Plants can sprout in real lunar dirt, but they show oxidative stress and grow slower unless supported with tailored LED light spectra and nutrient water.',
    kidLesson:
      'Space dirt is sharp and lacks nutrients! Our Hydroponic Bio-Dome uses tuned Red/Blue LEDs and recycled water so plants make both fresh food AND extra oxygen.',
    gameplayLink: 'Hydroponic Bio-Dome LED Spectrum Tuner & O2 Bonus',
    sourceUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-379',
  },
  {
    accessionId: 'OSD-342 / RR-19',
    categoryTag: 'bone',
    title: 'Protecting Skeletal Muscle & Bone Density During Microgravity Spaceflight',
    organism: 'Mus musculus (33 Days aboard ISS)',
    mission: 'International Space Station Rodent Research · NASA OSDR',
    keyFinding:
      'Without Earth gravity pulling on skeletons, spaceflight accelerates bone mineral loss and muscle weakening unless crews combine resistive exercise and targeted nutrition.',
    kidLesson:
      'Floating feels cool, but bones get sleepy in low gravity! Eating protein + Vitamin D & Calcium crops from the Bio-Dome keeps astronauts strong.',
    gameplayLink: 'CSA Space Nutrition Plate & EVA Fitness',
    sourceUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-342',
  },
  {
    accessionId: 'OSD-103 / RR-1',
    categoryTag: 'muscle',
    title: 'Muscle Fiber Adaptation & Recovery After Spaceflight',
    organism: 'Mus musculus & Human Crew Analogues',
    mission: 'SpaceX CRS / ISS Space Biology · NASA OSDR',
    keyFinding:
      'Weight-bearing calf and back muscles shrink fastest in microgravity and low Moon/Mars gravity (0.17g–0.38g), requiring high-energy meals (1,900–3,200 kcal/day).',
    kidLesson:
      'Moon gravity is 1/6th of Earth! Keeping Food Rations full gives your crew the energy needed for dusty EVA solar-panel repairs.',
    gameplayLink: 'Food Rations & Rover EVA Solar Cleaning',
    sourceUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-103',
  },
  {
    accessionId: 'OSD-530 / Twins-Immune',
    categoryTag: 'immune',
    title: 'Astronaut Immune System & Microbial Shift Under Isolation and Radiation',
    organism: 'Human Crew & Microbial Swabs',
    mission: 'ISS Environmental & Immune Monitoring · NASA OSDR',
    keyFinding:
      'Spaceflight stress, radiation, and closed cabin air alter immune white blood cells and cabin microbes, making clean O2 filters and fresh greens essential.',
    kidLesson:
      'Dirty cabin filters stress astronaut immune cells! Zapping grime in the O2 Electrolyzer Bay keeps the whole crew healthy.',
    gameplayLink: 'O2 Electrolyzer Bay Filter Zapper',
    sourceUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-530',
  },
  {
    accessionId: 'OSD-274 / Circadian',
    categoryTag: 'sleep',
    title: 'Circadian Rhythm, Sleep Cycles & Lighting Spectra on Mars Sols',
    organism: 'Drosophila & Human Crew Shift Studies',
    mission: 'ISS Solid-State Lighting & Mars 24h39m Sol Research · NASA OSDR',
    keyFinding:
      'A Martian Sol lasts 24 hours 39 minutes and lacks Earth blue sky cues. Blue-enriched morning lighting and strict rest cycles prevent crew fatigue mistakes.',
    kidLesson:
      'Notice the Next Sol (Sleep & Run Night) cycle! Resting your crew after completing tasks prevents careless breaker errors.',
    gameplayLink: 'Sol-by-Sol Sleep Cycle & Grow-Room Blue/Red LED Balance',
    sourceUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-274',
  },
  {
    accessionId: 'OSD-242 / RAD-MSL',
    categoryTag: 'radiation',
    title: 'Astronaut Radiation Dosimetry & DNA Repair Under Deep Space Ionizing Radiation',
    organism: 'Human Crew & Biological Dosimeters (Curiosity RAD & ISS DosTel)',
    mission: 'Mars Science Laboratory & NASA OSDR RadLab',
    keyFinding:
      'Deep-space Galactic Cosmic Rays deliver ~0.64 to 1.1 mSv per day, while an unshielded Solar Particle Event adds 20–50+ mSv in hours, damaging DNA.',
    kidLesson:
      'Hydrogen-rich water walls block fast solar protons! Keeping crew dose below 60 mSv protects astronaut DNA.',
    gameplayLink: 'Radiation Vault Water-Wall Pump & Lock Shield',
    sourceUrl: 'https://visualization.osdr.nasa.gov/radlab/gui/overview/',
  },
  {
    accessionId: 'MOXIE / ISS-ECLSS',
    categoryTag: 'lifesupport',
    title: 'Environmental Control and Life Support System (ECLSS) & Water Electrolysis',
    organism: 'Human Crew Metabolic Loop (0.84 kg O2/day per astronaut)',
    mission: 'ISS ECLSS & Mars Perseverance MOXIE',
    keyFinding:
      'Splitting water (2H2O -> 2H2 + O2) and scrubbing CO2 requires continuous electrical power (~1.5–2.5 kW).',
    kidLesson:
      'Breathing in space isn’t free! Every breath needs electricity to split water molecules and clean out carbon dioxide.',
    gameplayLink: 'O2 Scrubber & Power Grid Trade-Off',
    sourceUrl: 'https://www.nasa.gov/reference/eclss/',
  },
];

export const RADLAB_BENCHMARKS: RadLabBenchmark[] = [
  {
    id: 'earth-ground',
    location: 'Earth Surface (Sea Level)',
    instrument: 'Thick Atmosphere + Magnetic Field',
    dailyDoseMsv: 0.008,
    dailyDoseUgy: 2.4,
    protectionLevel: '99.5% Natural Shield',
    kidNote: 'Earth’s air blanket and magnetic bubble block almost all space radiation!',
    accentColor: '#10B981',
  },
  {
    id: 'iss-leo',
    location: 'ISS Low Earth Orbit (~400 km)',
    instrument: 'OSDR RadLab · DosTel1 / REM',
    dailyDoseMsv: 0.55,
    dailyDoseUgy: 245,
    protectionLevel: 'Earth Magnetosphere Partial Shield',
    kidNote: 'Inside Earth’s magnetic belt, astronauts still get ~70x more radiation than on Earth.',
    accentColor: '#38BDF8',
  },
  {
    id: 'mars-surface',
    location: 'Mars Surface (Jezero / Gale)',
    instrument: 'Curiosity RAD (RadLab Archive)',
    dailyDoseMsv: 0.64,
    dailyDoseUgy: 210,
    protectionLevel: 'Thin 1% CO2 Atmosphere + Planet Mass',
    kidNote: 'Mars’ body blocks rays from below, and its thin sky blocks a tiny fraction from above.',
    accentColor: '#F97316',
  },
  {
    id: 'moon-surface',
    location: 'Moon South Pole (Artemis)',
    instrument: 'Lunar LRO CRaTER',
    dailyDoseMsv: 1.1,
    dailyDoseUgy: 390,
    protectionLevel: 'Zero Atmosphere · High Exposure',
    kidNote: 'No air at all! Lunar habitats need thick water walls or regolith sandbags overhead.',
    accentColor: '#A855F7',
  },
];

export const MARS_TREK_LAYERS: MarsTrekLayer[] = [
  {
    id: 'viking',
    label: 'Viking True-Color Mosaic',
    instrument: 'NASA Viking Orbiter MDIM 2.1 (232m/px)',
    layerPath: 'Mars_Viking_MDIM21_ClrMosaic_global_232m',
    description: 'Authentic global red-iron oxide dust, dark basalt plains, and crater rims.',
  },
  {
    id: 'mola',
    label: 'MOLA Laser Elevation Map',
    instrument: 'Mars Global Surveyor MOLA Color Shaded (463m/px)',
    layerPath: 'Mars_MGS_MOLA_ClrShade_merge_global_463m',
    description: 'Purple/Blue = deep ancient ocean basins & craters; Red/White = giant volcanoes!',
  },
];

export const MARS_TREK_LANDMARKS: MarsTrekLandmark[] = [
  {
    id: 'jezero',
    name: 'Jezero Crater Delta (Your Outpost)',
    missionTag: 'Perseverance Rover · Mars 2020',
    lat: 18.38,
    lon: 77.58,
    elevationMeters: -2560,
    tempRange: '-88°C to -12°C',
    kidFact: 'Once held an ancient lake and river delta! Scientists hunt for ancient microbial fossils here.',
  },
  {
    id: 'gale',
    name: 'Gale Crater & Mount Sharp',
    missionTag: 'Curiosity Rover · RAD Dosimeter',
    lat: -5.4,
    lon: 137.8,
    elevationMeters: -4500,
    tempRange: '-82°C to 0°C',
    kidFact: 'Home to the Curiosity RAD sensor that measured the real 0.64 mSv/sol radiation baseline in this game!',
  },
  {
    id: 'olympus',
    name: 'Olympus Mons Shield Volcano',
    missionTag: 'Solar System’s Tallest Mountain',
    lat: 18.65,
    lon: -133.8,
    elevationMeters: 21229,
    tempRange: '-110°C to -30°C',
    kidFact: 'Nearly 3x taller than Mount Everest! Notice how dark white/red it glows on the MOLA Elevation map.',
  },
  {
    id: 'valles',
    name: 'Valles Marineris Grand Canyon',
    missionTag: '4,000 km Tectonic Rift',
    lat: -13.9,
    lon: -59.2,
    elevationMeters: -7000,
    tempRange: '-75°C to +5°C',
    kidFact: 'So deep and wide it would stretch all the way across Canada or the United States!',
  },
];

export function latLonToMarsTrekTile(
  lat: number,
  lon: number,
  zoom: number
): { col: number; row: number; maxCols: number; maxRows: number; fracX: number; fracY: number } {
  const z = Math.max(1, Math.min(4, Math.round(zoom)));
  const maxCols = Math.pow(2, z + 1);
  const maxRows = Math.pow(2, z);
  const normLon = ((lon + 180) % 360 + 360) % 360;
  const exactCol = (normLon / 360) * maxCols;
  const exactRow = (Math.max(0, Math.min(180, 90 - lat)) / 180) * maxRows;
  const col = Math.max(0, Math.min(maxCols - 1, Math.floor(exactCol)));
  const row = Math.max(0, Math.min(maxRows - 1, Math.floor(exactRow)));
  return {
    col,
    row,
    maxCols,
    maxRows,
    fracX: exactCol - col,
    fracY: exactRow - row,
  };
}

export function getMarsTrekTileUrl(
  layerPath: string,
  zoom: number,
  row: number,
  col: number,
  planet: 'Mars' | 'Moon' = 'Mars'
): string {
  return `/api/nasa/trek-tile?planet=${planet}&layer=${encodeURIComponent(layerPath)}&z=${zoom}&row=${row}&col=${col}`;
}

export const CSA_STEM_ACTIVITIES: CsaStemActivity[] = [
  {
    id: 'csa-food-moon',
    titleEn: 'Food Production on the Moon & Remote Areas',
    titleFr: 'Production alimentaire sur la Lune et en régions éloignées',
    ageRange: 'Ages 7–14',
    missionFocus: 'Controlled Environment Agriculture (CEA) & Nutrition',
    challengePrompt:
      'Design a closed-loop greenhouse that grows 1,900–3,200 kcal/day with recycled water and Red/Blue LEDs—without wasting electricity needed for oxygen.',
    kidTakeaway:
      'Fresh leafy greens boost astronaut Vitamin C and happiness, AND the same tech feeds northern Arctic communities like Nunavut year-round!',
    sourceUrl:
      'https://www.asc-csa.gc.ca/eng/educators/toolkit/food-production-on-the-moon-and-in-remote-areas.asp',
  },
  {
    id: 'csa-deep-space-food',
    titleEn: 'Deep Space Food Challenge & CANGrow Lab',
    titleFr: 'Défi de l’alimentation dans l’espace lointain (CANGrow)',
    ageRange: 'Ages 8–12',
    missionFocus: 'Sustainable Closed-Loop Food Systems',
    challengePrompt:
      'Can you grow crunchy Mizuna lettuce, Dwarf Wheat, and Astro Radishes using minimal water and zero soil dirt?',
    kidTakeaway:
      'Hydroponic misting recycles up to 95% of water! You practice this exact skill inside the AstroBase Bio-Dome mini-game.',
    sourceUrl:
      'https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp',
  },
  {
    id: 'csa-canadarm-eva',
    titleEn: 'Lunar Rover & Canadarm Surface Operations',
    titleFr: 'Opérations robotiques lunaires et sorties extravéhiculaires',
    ageRange: 'Ages 7–12',
    missionFocus: 'Robotics, Telemetry & EVA Safety',
    challengePrompt:
      'Inspect solar panels outside the habitat and clear static regolith dust while monitoring crew radiation exposure.',
    kidTakeaway:
      'Robotics like Canadarm3 and lunar rovers protect astronauts from stepping into dangerous solar flares!',
    sourceUrl:
      'https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp',
  },
];

export const CSA_MOON_TO_ARCTIC_COMPARISON: CsaFoodComparison[] = [
  {
    id: 'light',
    topic: 'Sunlight & Power Limits',
    moonMarsChallenge: 'Lunar nights last 14 Earth days; Mars dust storms dim sunlight by 30–50%.',
    earthArcticConnection: 'Arctic northern towns experience months of winter polar twilight.',
    csaSolution: 'High-efficiency Red (660nm) + Blue (450nm) LED grow arrays save >40% power.',
  },
  {
    id: 'water',
    topic: 'Water & Soil Scarcity',
    moonMarsChallenge: 'Lunar/Martian soil has sharp dust & perchlorates, and zero liquid rain.',
    earthArcticConnection: 'Permafrost ground cannot grow traditional outdoor farm crops in winter.',
    csaSolution: 'Closed-loop hydroponic misting recycles nearly every drop of moisture.',
  },
  {
    id: 'nutrition',
    topic: 'Fresh Vitamins & Crew Morale',
    moonMarsChallenge: 'Packaged space meals lose Vitamin C over months in transit to Mars.',
    earthArcticConnection: 'Fresh vegetables flown to remote communities are expensive and spoil quickly.',
    csaSolution: 'On-site Bio-Dome microgreens deliver crisp vitamins and boost mental wellbeing!',
  },
];

export const CSA_BILINGUAL_GLOSSARY: Array<{ en: string; fr: string; badge: string }> = [
  { en: 'Astronaut', fr: 'Astronaute', badge: 'Crew' },
  { en: 'Solar Flare', fr: 'Éruption solaire', badge: 'DONKI' },
  { en: 'Radiation Shield', fr: 'Bouclier antiradiation', badge: 'RadLab' },
  { en: 'Hydroponic Greenhouse', fr: 'Serre hydroponique', badge: 'Bio-Dome' },
  { en: 'Oxygen Electrolyzer', fr: 'Électrolyseur d’oxygène', badge: 'ECLSS' },
  { en: 'Mars Rover', fr: 'Astromobile martien', badge: 'EVA' },
];

export const CURATED_MARS_ROVER_PHOTOS: MarsRoverPhoto[] = [
  {
    id: 'curated-m2020-delta',
    sol: 1124,
    earthDate: '2024-04-18',
    cameraName: 'MASTCAM-Z',
    title: 'Jezero Crater Ancient River Delta',
    caption: 'Layered sedimentary rocks in Jezero Crater where Perseverance searches for ancient water.',
    imgSrc: 'https://images-assets.nasa.gov/image/PIA24331/PIA24331~medium.jpg',
  },
  {
    id: 'curated-m2020-rover',
    sol: 1210,
    earthDate: '2024-07-15',
    cameraName: 'NAVCAM',
    title: 'Perseverance Traversing Martian Regolith',
    caption: 'Fine iron-oxide dust coats Martian rocks and solar equipment—requiring EVA maintenance!',
    imgSrc: 'https://images-assets.nasa.gov/image/PIA24428/PIA24428~medium.jpg',
  },
];

/**
 * Server-proxied fetchers for live NASA Open APIs (/api/nasa/* keeps API keys off the client).
 */
export async function fetchLiveNasaDonkiFlares(): Promise<{
  status: 'live' | 'archive';
  cmeCount?: number;
  events: Array<{
    flrID: string;
    beginTime: string;
    peakTime: string;
    classType: string;
    sourceLocation: string;
    link: string;
  }>;
}> {
  try {
    const res = await fetch('/api/nasa/donki', { signal: AbortSignal.timeout(4500) });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'live' && Array.isArray(data.events) && data.events.length > 0) {
        return {
          status: 'live',
          cmeCount: Number(data.cmeCount || 0),
          events: data.events,
        };
      }
    }
  } catch {
    // Graceful fallback below
  }

  return {
    status: 'archive',
    cmeCount: 3,
    events: CURATED_NASA_DONKI_SCHEDULE.filter((e) => e.eventType !== 'QUIET').map((e) => ({
      flrID: e.id,
      beginTime: `${e.date}T00:00Z`,
      peakTime: `${e.date} ${e.peakTimeUtc}`,
      classType: e.classType,
      sourceLocation: e.sourceRegion,
      link: e.nasaSourceUrl,
    })),
  };
}

export async function fetchNasaApodSpotlight(): Promise<NasaApodSpotlight> {
  try {
    const res = await fetch('/api/nasa/apod', { signal: AbortSignal.timeout(4500) });
    if (res.ok) {
      const d = await res.json();
      if (d && d.title && d.imageUrl) {
        return d as NasaApodSpotlight;
      }
    }
  } catch {
    // Fallback below
  }

  return {
    status: 'archive',
    title: 'Perseverance Landing Site in Jezero Crater, Mars',
    date: '2024-05-14',
    explanation:
      'Orbital HiRISE imagery showing the ancient river delta inside Jezero Crater—selected by NASA mission planners for studying past habitability and surface radiation.',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA24331/PIA24331~medium.jpg',
    copyright: 'NASA / JPL-Caltech / University of Arizona',
  };
}

export async function fetchLiveMarsRoverPhotos(): Promise<{
  status: 'live' | 'archive';
  rover: string;
  photos: MarsRoverPhoto[];
}> {
  try {
    const res = await fetch('/api/nasa/mars-photos', { signal: AbortSignal.timeout(4500) });
    if (res.ok) {
      const d = await res.json();
      if (d && Array.isArray(d.photos) && d.photos.length > 0) {
        return { status: 'live', rover: d.rover || 'Perseverance', photos: d.photos };
      }
    }
  } catch {
    // Fallback below
  }
  return {
    status: 'archive',
    rover: 'Perseverance (Mars 2020 Archive)',
    photos: CURATED_MARS_ROVER_PHOTOS,
  };
}

export async function searchNasaOsdrStudies(query: string): Promise<{
  status: 'live' | 'archive';
  totalHits: number;
  studies: NasaOsdrStudy[];
}> {
  const cleanQ = query.trim();
  const localMatches = NASA_OSDR_STUDIES.filter((s) => {
    if (!cleanQ) return true;
    const hay = `${s.title} ${s.categoryTag} ${s.organism} ${s.keyFinding} ${s.kidLesson}`.toLowerCase();
    return hay.includes(cleanQ.toLowerCase());
  });

  if (!cleanQ) {
    return { status: 'archive', totalHits: NASA_OSDR_STUDIES.length, studies: NASA_OSDR_STUDIES };
  }

  try {
    const res = await fetch(`/api/nasa/osdr-search?q=${encodeURIComponent(cleanQ)}`, {
      signal: AbortSignal.timeout(4500),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.status === 'live' && Array.isArray(d.studies) && d.studies.length > 0) {
        const mapped: NasaOsdrStudy[] = d.studies.map((item: Record<string, string>) => ({
          accessionId: item.accessionId || 'OSD-LIVE',
          categoryTag: 'bone',
          title: item.title || 'NASA OSDR Space Biology Study',
          organism: item.organism || 'Spaceflight Organism',
          mission: item.mission || 'NASA OSDR Archive',
          keyFinding: item.keyFinding || 'Real published study from NASA Open Science Data Repository.',
          kidLesson:
            'Real NASA biologists publish this data openly so mission planners can keep astronauts healthy in deep space!',
          gameplayLink: 'AstroBase Life Support & Health Trade-Offs',
          sourceUrl: item.sourceUrl || 'https://osdr.nasa.gov/bio/repo/',
        }));
        return {
          status: 'live',
          totalHits: Number(d.totalHits || mapped.length),
          studies: [...localMatches, ...mapped].slice(0, 6),
        };
      }
    }
  } catch {
    // Fallback to curated local matches
  }

  return {
    status: 'archive',
    totalHits: localMatches.length,
    studies: localMatches.length > 0 ? localMatches : NASA_OSDR_STUDIES,
  };
}

export async function fetchRadLabTelemetry(): Promise<{
  status: 'live' | 'archive';
  sampleCount: number;
  issDosTelAvgUgyDay: number;
  samples: Array<{ timestamp: string; instrument: string; doseRateUgyPerDay: number }>;
}> {
  try {
    const res = await fetch('/api/nasa/radlab', { signal: AbortSignal.timeout(4800) });
    if (res.ok) {
      const d = await res.json();
      if (d && d.status === 'live' && Array.isArray(d.samples) && d.samples.length > 0) {
        return d;
      }
    }
  } catch {
    // Fallback below
  }

  return {
    status: 'archive',
    sampleCount: 120,
    issDosTelAvgUgyDay: 245.4,
    samples: [
      { timestamp: '2024-05-10 04:00Z', instrument: 'DosTel1', doseRateUgyPerDay: 218.2 },
      { timestamp: '2024-05-11 01:23Z', instrument: 'DosTel1 (M8.8)', doseRateUgyPerDay: 312.6 },
      { timestamp: '2024-05-11 16:40Z', instrument: 'DosTel1', doseRateUgyPerDay: 254.0 },
      { timestamp: '2024-05-12 09:15Z', instrument: 'DosTel1', doseRateUgyPerDay: 236.8 },
    ],
  };
}

export interface OutpostGallerySlide {
  id: string;
  title: string;
  zoneLabel: string;
  coordinates: string;
  elevationLabel: string;
  instrument: string;
  description: string;
  imageUrl: string;
  sourceTag: string;
}

const FALLBACK_MARS_GALLERY: OutpostGallerySlide[] = [
  {
    id: 'fallback-mars-jezero-delta',
    title: 'Jezero Crater Delta & Shoreline Reconnaissance',
    zoneLabel: 'Jezero Crater Delta (Your Outpost Landing Zone)',
    coordinates: '18.38° N, 77.58° E',
    elevationLabel: '-2,560 m Ancient Lake Basin',
    instrument: 'NASA Mars Trek · Viking MDIM 2.1 + MRO',
    description:
      'Orbital true-color view over Jezero Crater’s western fan delta where ancient Martian rivers once deposited clay minerals.',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA24331/PIA24331~medium.jpg',
    sourceTag: 'NASA Mars Trek Archive',
  },
  {
    id: 'fallback-mars-perseverance-drive',
    title: 'Perseverance Regolith & Solar Array Terrain',
    zoneLabel: 'Jezero Crater Floor · Traverse Zone',
    coordinates: '18.42° N, 77.49° E',
    elevationLabel: '-2,540 m Rocky Plains',
    instrument: 'NASA JPL Mars 2020 Navcam / Mastcam-Z',
    description:
      'Fine red iron-oxide dust drifts across basaltic ridges—exactly why AstroBase crews inspect satellites and solar panels on EVA.',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA24428/PIA24428~medium.jpg',
    sourceTag: 'NASA JPL Reconnaissance',
  },
];

const FALLBACK_MOON_GALLERY: OutpostGallerySlide[] = [
  {
    id: 'fallback-moon-shackleton',
    title: 'Shackleton Crater Rim · Lunar South Pole',
    zoneLabel: 'Artemis Base Camp (Your Chosen Landing Zone)',
    coordinates: '89.9° S, 0.0° E',
    elevationLabel: '+1,800 m Sunlit Ridge',
    instrument: 'NASA Moon Trek · LRO LROC + LOLA',
    description:
      'Permanent sunlit peaks overlook permanently shadowed crater floors holding frozen water ice for Electrolyzer oxygen.',
    imageUrl:
      '/api/nasa/trek-tile?planet=Moon&layer=Lunar_LRO_LROC-WAC_Mosaic_global_100m_June2013&z=2&row=3&col=4',
    sourceTag: 'NASA Moon Trek Archive',
  },
];

export async function fetchOutpostImageGallery(siteId: MissionSiteId): Promise<{
  status: 'live' | 'archive';
  siteId: MissionSiteId;
  slides: OutpostGallerySlide[];
}> {
  try {
    const res = await fetch(`/api/nasa/mars-trek-gallery?siteId=${encodeURIComponent(siteId)}`, {
      signal: AbortSignal.timeout(5500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.slides) && data.slides.length > 0) {
        return {
          status: data.status === 'live' ? 'live' : 'archive',
          siteId,
          slides: data.slides,
        };
      }
    }
  } catch {
    // Graceful fallback below
  }

  return {
    status: 'archive',
    siteId,
    slides: siteId === 'moon' ? FALLBACK_MOON_GALLERY : FALLBACK_MARS_GALLERY,
  };
}


