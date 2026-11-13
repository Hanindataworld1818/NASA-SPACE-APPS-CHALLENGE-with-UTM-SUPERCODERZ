export type MissionSiteId = 'moon' | 'mars';

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
  title: string;
  organism: string;
  mission: string;
  keyFinding: string;
  kidLesson: string;
  gameplayLink: string;
  sourceUrl: string;
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
    accessionId: 'OSD-242 / RAD-MSL',
    title: 'Astronaut Radiation Dosimetry & DNA Repair Under Deep Space Ionizing Radiation',
    organism: 'Human Crew & Biological Dosimeters (Curiosity RAD & ISS Bio-Monitors)',
    mission: 'Mars Science Laboratory (Curiosity RAD) & NASA OSDR',
    keyFinding:
      'Deep-space Galactic Cosmic Rays deliver ~0.64 to 1.1 mSv per day, while a single unshielded Solar Particle Event (SPE) can add 20–50+ mSv in hours, damaging cells.',
    kidLesson:
      'Hydrogen-rich water walls and magnetic shields block fast solar protons! Keeping crew dose below 50 mSv protects astronaut DNA.',
    gameplayLink: 'Radiation Vault Water-Wall Alignment & Dose Meter (mSv)',
    sourceUrl: 'https://osdr.nasa.gov/bio/repo/',
  },
  {
    accessionId: 'MOXIE / ISS-ECLSS',
    title: 'Environmental Control and Life Support System (ECLSS) & Water Electrolysis',
    organism: 'Human Crew Metabolic Loop (0.84 kg O2/day per astronaut)',
    mission: 'ISS ECLSS & Mars Perseverance MOXIE',
    keyFinding:
      'Splitting water (2H2O -> 2H2 + O2) and scrubbing CO2 requires continuous electrical power (~1.5–2.5 kW). Turning off life support to save power causes CO2 buildup within hours.',
    kidLesson:
      'Breathing in space isn’t free! Every breath needs electricity to split water molecules and clean out carbon dioxide.',
    gameplayLink: 'O2 Scrubber & Electrolyzer Power Trade-Off',
    sourceUrl: 'https://www.nasa.gov/reference/eclss/',
  },
];

/**
 * Fetches live recent Solar Flares from NASA's public DONKI API to enrich the NASA Science Inspector
 * while keeping gameplay deterministic and fallback-safe.
 */
export async function fetchLiveNasaDonkiFlares(): Promise<{
  status: 'live' | 'archive';
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
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const url = `https://api.nasa.gov/DONKI/FLR?startDate=${startStr}&endDate=${endStr}&api_key=DEMO_KEY`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return {
        status: 'live',
        events: data.slice(-5).reverse().map((item: Record<string, unknown>) => ({
          flrID: String(item.flrID || 'DONKI-FLR'),
          beginTime: String(item.beginTime || ''),
          peakTime: String(item.peakTime || ''),
          classType: String(item.classType || 'M1.0'),
          sourceLocation: String(item.sourceLocation || 'Active Sunspot'),
          link: String(item.link || 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/'),
        })),
      };
    }
  } catch {
    // Graceful fallback to verified historical NASA DONKI records when offline or DEMO_KEY rate-limited
  }

  return {
    status: 'archive',
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
