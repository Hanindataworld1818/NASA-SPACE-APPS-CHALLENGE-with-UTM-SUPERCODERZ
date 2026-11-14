import {
  CURATED_NASA_DONKI_SCHEDULE,
  MISSION_SITES,
  MissionSiteId,
  NasaDonkiEvent,
  OutpostMapVariant,
} from './nasaData';

export type RoomId =
  | 'power'
  | 'lifesupport'
  | 'hydroponics'
  | 'foodlab'
  | 'shield'
  | 'eva'
  | 'comms'
  | 'academy';

export interface OutpostRoom {
  id: RoomId;
  name: string;
  shortLabel: string;
  kidRole: string;
  nasaSystemName: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  accentColor: string;
  consoleX: number;
  consoleY: number;
}

export const OUTPOST_WORLD_W = 2280;
export const OUTPOST_WORLD_H = 1320;

export const MESS_LOUNGE_ZONE = {
  id: 'mess_lounge',
  name: 'Crew Mess Cafe & Rest Lounge',
  x: 1615,
  y: 685,
  w: 540,
  h: 310,
  galleyBar: { x: 1712, y: 748 },
  diningTable: { x: 1825, y: 832 },
  danceFloor: { x: 2002, y: 742, w: 132, h: 124 },
  restPods: [
    { x: 1705, y: 946, label: 'Pod Alpha' },
    { x: 1882, y: 946, label: 'Pod Beta' },
  ],
  diningSeats: [
    { x: 1744, y: 804, facing: 1 },
    { x: 1906, y: 804, facing: -1 },
    { x: 1744, y: 858, facing: 1 },
    { x: 1906, y: 858, facing: -1 },
  ],
} as const;

export const FUTURE_EXPANSION_PLOT = {
  id: 'future_expansion',
  label: 'SECTOR B · FUTURE FOOD & HABITAT EXPANSION WING',
  x: 1615,
  y: 1045,
  w: 540,
  h: 190,
} as const;

export const OUTPOST_ROOMS: OutpostRoom[] = [
  {
    id: 'power',
    name: 'Reactor & Solar Grid',
    shortLabel: 'Power',
    kidRole: 'Plug & split electricity between rooms!',
    nasaSystemName: 'Kilopower Fission + Solar Array',
    x: 95,
    y: 120,
    w: 350,
    h: 255,
    color: '#1E293B',
    accentColor: '#F59E0B',
    consoleX: 270,
    consoleY: 235,
  },
  {
    id: 'lifesupport',
    name: 'O2 Electrolyzer Bay',
    shortLabel: 'O2 Bay',
    kidRole: 'Clean CO2 filters & make breathable air!',
    nasaSystemName: 'NASA ECLSS Water Electrolyzer',
    x: 615,
    y: 120,
    w: 350,
    h: 255,
    color: '#1E293B',
    accentColor: '#38BDF8',
    consoleX: 790,
    consoleY: 235,
  },
  {
    id: 'hydroponics',
    name: 'Hydroponic Bio-Dome',
    shortLabel: 'Bio-Dome',
    kidRole: 'Tune Red/Blue LEDs & harvest space crops!',
    nasaSystemName: 'NASA OSDR (OSD-379) Veggie Chamber',
    x: 1135,
    y: 120,
    w: 350,
    h: 255,
    color: '#1E293B',
    accentColor: '#10B981',
    consoleX: 1310,
    consoleY: 235,
  },
  {
    id: 'foodlab',
    name: 'Space Food Lab & Kitchen',
    shortLabel: 'Food Lab',
    kidRole: 'Simulate CSA crop nutrition, cook & feed crew!',
    nasaSystemName: 'CSA Moon-to-Arctic Food Lab & Galley',
    x: 1655,
    y: 120,
    w: 375,
    h: 255,
    color: '#1E293B',
    accentColor: '#FB7185',
    consoleX: 1842,
    consoleY: 235,
  },
  {
    id: 'shield',
    name: 'Radiation Shield Vault',
    shortLabel: 'Shields',
    kidRole: 'Block NASA DONKI solar flares with water walls!',
    nasaSystemName: 'DONKI Storm Shelter + Water Shield',
    x: 95,
    y: 695,
    w: 350,
    h: 255,
    color: '#1E293B',
    accentColor: '#A855F7',
    consoleX: 270,
    consoleY: 805,
  },
  {
    id: 'eva',
    name: 'Rover & EVA Airlock',
    shortLabel: 'EVA',
    kidRole: 'Wipe solar dust & drill ice cores outside!',
    nasaSystemName: 'Artemis / MEDA Surface Airlock',
    x: 615,
    y: 695,
    w: 350,
    h: 255,
    color: '#1E293B',
    accentColor: '#F97316',
    consoleX: 790,
    consoleY: 805,
  },
  {
    id: 'comms',
    name: 'Comms & Sound Deck',
    shortLabel: 'Comms',
    kidRole: 'Beam science to Earth, transcribe voice & play music!',
    nasaSystemName: 'Deep Space Network + Crew Jukebox',
    x: 1135,
    y: 695,
    w: 350,
    h: 255,
    color: '#1E293B',
    accentColor: '#EC4899',
    consoleX: 1310,
    consoleY: 805,
  },
  {
    id: 'academy',
    name: 'Academy Station',
    shortLabel: 'Academy',
    kidRole: 'Learn Mission Trainer lessons & play quiz games for marks + supplies!',
    nasaSystemName: 'Junior Astronaut Learning & Quiz Center',
    x: 95,
    y: 998,
    w: 350,
    h: 246,
    color: '#1E293B',
    accentColor: '#FACC15',
    consoleX: 270,
    consoleY: 1106,
  },
];

export interface PowerAllocation {
  lifesupport: number; // 0..3 kW
  shield: number;      // 0..3 kW
  hydroponics: number; // 0..3 kW
  comms: number;       // 0..3 kW
}

export interface DynamicMissionEvent {
  id: string;
  title: string;
  nasaSourceTag: string;
  alertLevel: 'warning' | 'critical';
  storyPrompt: string;
  kidLesson: string;
  optionA: {
    label: string;
    kidConsequence: string;
    deltas: {
      oxygen: number;
      food: number;
      radiationMsv: number;
      science: number;
      bonusPowerKw?: number;
    };
  };
  optionB: {
    label: string;
    kidConsequence: string;
    deltas: {
      oxygen: number;
      food: number;
      radiationMsv: number;
      science: number;
      bonusPowerKw?: number;
    };
  };
}

export const BUILTIN_DYNAMIC_EVENTS: DynamicMissionEvent[] = [
  {
    id: 'evt-solar-proton-spike',
    title: 'EMERGENCY MEETING: Sudden Solar Proton Spike!',
    nasaSourceTag: 'NASA DONKI SEP Alert · Sunspot AR 13664',
    alertLevel: 'critical',
    storyPrompt:
      'BEEP-BEEP! NASA DONKI sensors just spotted high-energy protons racing from the Sun! Should the crew move into the thick Water-Wall Shield Vault (costs extra power) or stay in the regular rooms to save electricity?',
    kidLesson:
      'Water is packed with hydrogen atoms that act like bumper cars to stop fast solar radiation particles!',
    optionA: {
      label: 'Activate Water-Wall Vault & Move Crew Inside',
      kidConsequence: '🛡️ Blocks radiation (+1 mSv only), but uses extra air & pauses Science (-8% O2, -5 Science)',
      deltas: {
        oxygen: -8,
        food: 0,
        radiationMsv: 1,
        science: -5,
      },
    },
    optionB: {
      label: 'Stay in Normal Rooms to Save Power & Keep Working',
      kidConsequence: '⚡ Saves O2 & earns +15 Science, but crew absorbs +16 mSv radiation dose!',
      deltas: {
        oxygen: 4,
        food: 0,
        radiationMsv: 16,
        science: 15,
      },
    },
  },
  {
    id: 'evt-co2-scrubber-valve',
    title: 'CREW ALERT: CO2 Scrubber Filter Frost-Up!',
    nasaSourceTag: 'NASA ISS ECLSS Life Support Telemetry',
    alertLevel: 'warning',
    storyPrompt:
      'Uh-oh! The main carbon dioxide filter in the Life Support bay is frosting over! Do we fire up the high-power heater to melt the ice fast, or let the Hydroponic plants help absorb the extra CO2 slowly?',
    kidLesson:
      'Just like on the International Space Station, machines and green plants can work as a team to keep cabin air fresh!',
    optionA: {
      label: 'Run High-Power Heater Purge',
      kidConsequence: '💨 Instant +14% Oxygen boost, but burns stored greenhouse rations (-8% Food)',
      deltas: {
        oxygen: 14,
        food: -8,
        radiationMsv: 0,
        science: 5,
      },
    },
    optionB: {
      label: 'Route Cabin Air Through Hydroponic Bio-Dome',
      kidConsequence: '🌱 Plants turn CO2 into +10% Food & +6% O2, but takes crew time (-5 Science)',
      deltas: {
        oxygen: 6,
        food: 10,
        radiationMsv: 0,
        science: -5,
      },
    },
  },
  {
    id: 'evt-regolith-dust-squall',
    title: 'SURFACE ALERT: Electrostatic Dust Squall on Solar Array!',
    nasaSourceTag: 'NASA Perseverance MEDA & Artemis Dust Lab',
    alertLevel: 'warning',
    storyPrompt:
      'Sticky space dust is blocking sunlight on Wing B of our solar panels! Do you send a crewmate outside in a spacesuit right now to brush it off, or wait and conserve spacesuit oxygen?',
    kidLesson:
      'Martian and lunar dust clings to solar panels with static electricity—cleaning it gives you power back, but every spacewalk uses precious oxygen and adds radiation exposure!',
    optionA: {
      label: 'Suit Up & Wipe Solar Panels Now (EVA)',
      kidConsequence: '⚡ +1 kW Bonus Power & +20 Science, but costs -10% O2 and +5 mSv surface radiation',
      deltas: {
        oxygen: -10,
        food: 0,
        radiationMsv: 5,
        science: 20,
        bonusPowerKw: 1,
      },
    },
    optionB: {
      label: 'Stay Inside & Ration Today’s Power',
      kidConsequence: '🛡️ Safe inside (+0 mSv, +5% O2 saved), but grow lamps dim (-8% Food)',
      deltas: {
        oxygen: 5,
        food: -8,
        radiationMsv: 0,
        science: 5,
      },
    },
  },
  {
    id: 'evt-osdr-crop-mutation',
    title: 'BIO-DOME DISCOVERY: Super-Sprout Dwarf Wheat!',
    nasaSourceTag: 'NASA OSDR Study OSD-379 Plant Biology',
    alertLevel: 'warning',
    storyPrompt:
      'Awesome news in the Bio-Dome! Tray #3 of our space wheat is sprouting super fast under the 660nm Red LEDs! Should we harvest it right now for crew dinner, or study its DNA for Earth scientists?',
    kidLesson:
      'NASA’s Open Science Data Repository (OSDR) studies how plants adapt their genes to grow in microgravity and lunar soil!',
    optionA: {
      label: 'Harvest Super-Sprouts for Crew Kitchen',
      kidConsequence: '🥗 +22% Fresh Food Rations & +6% O2, +5 Science',
      deltas: {
        oxygen: 6,
        food: 22,
        radiationMsv: 0,
        science: 5,
      },
    },
    optionB: {
      label: 'Sequence Plant DNA & Beam Data to Earth',
      kidConsequence: '🔬 +30 NASA Science Points, but smaller food harvest (+6% Food, -5% O2 for lab gear)',
      deltas: {
        oxygen: -5,
        food: 6,
        radiationMsv: 0,
        science: 30,
      },
    },
  },
];

export type CropIngredientId =
  | 'mizuna'
  | 'wheat'
  | 'radish'
  | 'berries'
  | 'microgreens'
  | 'spirulina';

export interface CropPantryInventory {
  mizuna: number;
  wheat: number;
  radish: number;
  berries: number;
  microgreens: number;
  spirulina: number;
  h2oDrops: number;
}

export interface GameStateSnapshot {
  siteId: MissionSiteId;
  mapVariant: OutpostMapVariant;
  sol: number; // 1 to 7
  maxSols: number;
  oxygen: number; // 0 to 100 (%)
  food: number; // 0 to 100 (%)
  radiationMsv: number; // 0 to 100 (danger threshold >= 60 mSv)
  maxSafeRadiationMsv: number;
  scienceScore: number;
  availablePowerKw: number;
  bonusPowerKw: number;
  powerAllocation: PowerAllocation;
  completedTasksToday: RoomId[];
  dailyEventResolved: boolean;
  pantry: CropPantryInventory;
  mealsCookedTotal: number;
  cropsHarvestedTotal: number;
  wallEScansCount: number;
}

export const SCIENCE_BOT_SCAN_TARGET = 10;

export function hasScienceBotBadge(wallEScansCount: number): boolean {
  return wallEScansCount >= SCIENCE_BOT_SCAN_TARGET;
}

export interface SolProjection {
  nextOxygen: number;
  oxygenDelta: number;
  nextFood: number;
  foodDelta: number;
  nextRadiationMsv: number;
  radiationDeltaMsv: number;
  nextScienceScore: number;
  scienceDelta: number;
  shieldEfficiencyPct: number;
  warnings: string[];
  tradeoffSummary: string;
}

export function getDonkiEventForSol(sol: number): NasaDonkiEvent {
  const index = Math.max(0, Math.min(CURATED_NASA_DONKI_SCHEDULE.length - 1, sol - 1));
  return CURATED_NASA_DONKI_SCHEDULE[index];
}

export function getTotalAllocatedPower(alloc: PowerAllocation): number {
  return alloc.lifesupport + alloc.shield + alloc.hydroponics + alloc.comms;
}

export function computeAvailablePowerKw(
  siteId: MissionSiteId,
  sol: number,
  bonusPowerKw: number
): number {
  const site = MISSION_SITES[siteId];
  const event = getDonkiEventForSol(sol);
  return Math.max(2, site.baseSolarKw - event.powerPenaltyKw + bonusPowerKw);
}

/**
 * Pure deterministic calculation of how today's Power Allocation, completed crew tasks,
 * and NASA DONKI Space Weather combine to change Oxygen, Food, Radiation Dose (mSv), and Science.
 * Every choice has a genuine trade-off.
 */
export function calculateSolOutcome(state: GameStateSnapshot): SolProjection {
  const site = MISSION_SITES[state.siteId];
  const event = getDonkiEventForSol(state.sol);
  const alloc = state.powerAllocation;
  const tasks = new Set(state.completedTasksToday);

  // 1. Oxygen calculation:
  // Crew consumes -16% O2 per Sol.
  // Each kW in Life Support produces +10% O2.
  // If Hydroponics has >= 1 kW, live plants produce +4% bonus O2 (NASA OSDR bio-regenerative loop).
  // Completing the 'lifesupport' scrubber task adds +8% O2.
  const crewO2Consumption = -16;
  const electrolyzerO2 = alloc.lifesupport * 10;
  const plantO2Bonus = alloc.hydroponics >= 1 ? 4 : 0;
  const taskO2Bonus = tasks.has('lifesupport') ? 8 : 0;
  const rawO2Delta = crewO2Consumption + electrolyzerO2 + plantO2Bonus + taskO2Bonus;
  const nextOxygen = Math.max(0, Math.min(100, Math.round(state.oxygen + rawO2Delta)));
  const oxygenDelta = nextOxygen - state.oxygen;

  // 2. Food / Hydroponics calculation:
  // Crew eats -14% Food rations per Sol.
  // Each kW in Hydroponics grows +9% Food.
  // Completing the 'hydroponics' LED tuner task adds +9% Food.
  const crewFoodConsumption = -14;
  const grownFood = alloc.hydroponics * 9;
  const taskFoodBonus = tasks.has('hydroponics') ? 9 : 0;
  const rawFoodDelta = crewFoodConsumption + grownFood + taskFoodBonus;
  const nextFood = Math.max(0, Math.min(100, Math.round(state.food + rawFoodDelta)));
  const foodDelta = nextFood - state.food;

  // 3. Radiation Shielding & Dose (mSv) calculation:
  // Each kW in Shield Vault blocks 28% of incoming solar flare radiation.
  // Completing the 'shield' alignment task adds +16% shielding efficiency (up to 92% max).
  const baseShieldPct = alloc.shield * 28 + (tasks.has('shield') ? 16 : 0);
  const shieldEfficiencyPct = Math.min(92, Math.max(0, baseShieldPct));
  const flareDoseAfterShield =
    event.unshieldedDoseMsv * (1 - shieldEfficiencyPct / 100);
  const rawRadDelta = Number(
    (site.baselineRadMsvPerSol + flareDoseAfterShield).toFixed(1)
  );
  const nextRadiationMsv = Number((state.radiationMsv + rawRadDelta).toFixed(1));

  // 4. Science & Mission Score calculation:
  // Each kW in Comms/Science generates +15 pts, plus +20 pts per completed workstation task.
  const commsScience = alloc.comms * 15;
  const taskScience = state.completedTasksToday.length * 20;
  const scienceDelta = commsScience + taskScience;
  const nextScienceScore = state.scienceScore + scienceDelta;

  const warnings: string[] = [];
  if (oxygenDelta < -5 || nextOxygen <= 35) {
    warnings.push('Low O2 Power! Add electricity to Life Support or clean O2 scrubbers.');
  }
  if (foodDelta < -5 || nextFood <= 35) {
    warnings.push('Crops are hungry for light! Add 1-2 kW to the Bio-Dome or harvest pods.');
  }
  if (rawRadDelta >= 10) {
    warnings.push(
      `Solar Flare Warning (+${rawRadDelta} mSv)! Boost Shield Vault power to block protons.`
    );
  }

  const tradeoffSummary =
    alloc.shield >= 2
      ? 'High Shield Power protects crew DNA from solar protons, leaving less power for Grow Lamps & Comms.'
      : alloc.hydroponics >= 2
      ? 'Bio-Dome Overdrive boosts Food & bonus O2, but leaves Radiation Shields thinner if a flare hits.'
      : 'Balanced Outpost Grid: steady O2 and crops, watch NASA DONKI alerts for sudden solar storms!';

  return {
    nextOxygen,
    oxygenDelta,
    nextFood,
    foodDelta,
    nextRadiationMsv,
    radiationDeltaMsv: rawRadDelta,
    nextScienceScore,
    scienceDelta,
    shieldEfficiencyPct,
    warnings,
    tradeoffSummary,
  };
}

export function checkMissionOutcome(state: GameStateSnapshot): {
  status: 'playing' | 'victory' | 'defeat';
  reason: string;
} {
  if (state.oxygen <= 0) {
    return {
      status: 'defeat',
      reason:
        'Oxygen Reserves Depleted (0%)! Without enough power to the O2 Electrolyzer, cabin air ran out.',
    };
  }
  if (state.food <= 0) {
    return {
      status: 'defeat',
      reason:
        'Food Rations Depleted (0%)! The Hydroponic Bio-Dome needed more LED light power and crop care.',
    };
  }
  if (state.radiationMsv >= state.maxSafeRadiationMsv) {
    return {
      status: 'defeat',
      reason: `Radiation Limit Exceeded (${state.radiationMsv.toFixed(1)} / ${state.maxSafeRadiationMsv} mSv)! Unshielded solar flares forced an emergency abort to orbit.`,
    };
  }
  if (state.sol > state.maxSols) {
    return {
      status: 'victory',
      reason:
        'Mission Complete! You survived all 7 Sols by balancing Power, Oxygen, Bio-Dome Crops, and NASA DONKI Radiation Shielding!',
    };
  }
  return { status: 'playing', reason: 'Outpost Nominal' };
}

export function createInitialPantry(): CropPantryInventory {
  return {
    mizuna: 2,
    wheat: 2,
    radish: 2,
    berries: 2,
    microgreens: 2,
    spirulina: 1,
    h2oDrops: 3,
  };
}

export function createInitialGameState(
  siteId: MissionSiteId = 'mars',
  mapVariant: OutpostMapVariant = 'classic'
): GameStateSnapshot {
  const availablePowerKw = computeAvailablePowerKw(siteId, 1, 0);
  return {
    siteId,
    mapVariant,
    sol: 1,
    maxSols: 7,
    oxygen: 86,
    food: 82,
    radiationMsv: 0,
    maxSafeRadiationMsv: 60,
    scienceScore: 100,
    availablePowerKw,
    bonusPowerKw: 0,
    powerAllocation: {
      lifesupport: 2,
      shield: 1,
      hydroponics: 2,
      comms: 1,
    },
    completedTasksToday: [],
    dailyEventResolved: false,
    pantry: createInitialPantry(),
    mealsCookedTotal: 0,
    cropsHarvestedTotal: 0,
    wallEScansCount: 0,
  };
}

export interface DailyMilestone {
  sol: number;
  donkiClass: string;
  oxygen: number;
  food: number;
  radiationMsv: number;
  scienceScore: number;
  tasksCompleted: RoomId[];
  eventDecision?: string;
}

export function createDailyMilestone(
  state: GameStateSnapshot,
  eventDecision?: string
): DailyMilestone {
  const donki = getDonkiEventForSol(state.sol);
  return {
    sol: Math.min(state.maxSols, Math.max(1, state.sol)),
    donkiClass: donki.classType,
    oxygen: Math.round(state.oxygen),
    food: Math.round(state.food),
    radiationMsv: Number(state.radiationMsv.toFixed(1)),
    scienceScore: Math.round(state.scienceScore),
    tasksCompleted: [...state.completedTasksToday],
    eventDecision,
  };
}

export function formatMilestonesSummary(milestones: DailyMilestone[]): string {
  if (milestones.length === 0) return 'Sol 1: Mission launched.';
  return milestones
    .map((m) => {
      const cls = m.donkiClass.split(' ')[0];
      const base = `S${m.sol}(${cls}): O2 ${m.oxygen}% Food ${m.food}% Rad ${m.radiationMsv}mSv ${m.tasksCompleted.length}/${OUTPOST_ROOMS.length}`;
      return m.eventDecision ? `${base} [${m.eventDecision.slice(0, 26)}]` : base;
    })
    .join(' | ')
    .slice(0, 500);
}

export type ForecastIconType = 'quiet' | 'flare' | 'dust' | 'cme' | 'sep';
export type ForecastRiskLevel = 'LOW' | 'MED' | 'HIGH' | 'EXTREME';

export interface ForecastSolItem {
  sol: number;
  isToday: boolean;
  iconType: ForecastIconType;
  shortClass: string;
  riskLevel: ForecastRiskLevel;
  powerPenaltyKw: number;
  unshieldedDoseMsv: number;
  title: string;
  engineeringTradeoffHint: string;
}

export function getThreeSolForecast(
  currentSol: number,
  maxSols: number = 7
): ForecastSolItem[] {
  const clampedStart = Math.max(1, Math.min(maxSols, Math.round(currentSol)));
  const sols: number[] = [];
  for (let offset = 0; offset < 3; offset++) {
    const s = clampedStart + offset;
    if (s <= maxSols) sols.push(s);
  }

  return sols.map((sol, idx) => {
    const ev = getDonkiEventForSol(sol);
    let iconType: ForecastIconType = 'quiet';
    if (ev.eventType === 'FLR') iconType = 'flare';
    else if (ev.eventType === 'DUST') iconType = 'dust';
    else if (ev.eventType === 'CME') iconType = 'cme';
    else if (ev.eventType === 'SEP') iconType = 'sep';

    let riskLevel: ForecastRiskLevel = 'LOW';
    if (ev.unshieldedDoseMsv >= 22) riskLevel = 'EXTREME';
    else if (ev.unshieldedDoseMsv >= 12) riskLevel = 'HIGH';
    else if (ev.powerPenaltyKw > 0 || ev.unshieldedDoseMsv >= 5) riskLevel = 'MED';

    const shortClass =
      ev.eventType === 'DUST'
        ? 'DUST'
        : ev.eventType === 'CME'
        ? 'CME'
        : ev.classType.split(' ')[0];

    return {
      sol,
      isToday: idx === 0,
      iconType,
      shortClass,
      riskLevel,
      powerPenaltyKw: ev.powerPenaltyKw,
      unshieldedDoseMsv: ev.unshieldedDoseMsv,
      title: ev.title,
      engineeringTradeoffHint: ev.engineeringTradeoffHint,
    };
  });
}

export function isPhaseInGreenZone(phasePct: number): boolean {
  return phasePct >= 68 && phasePct <= 96;
}

export function isLedSpectrumOptimal(ledSpectrum: number): boolean {
  return ledSpectrum >= 65 && ledSpectrum <= 88;
}

export function isDishAlignedWithTarget(
  dishAzimuth: number,
  dishElevation: number,
  targetAzimuth: number,
  targetElevation: number,
  tolerance: number = 14
): boolean {
  const dx = dishAzimuth - targetAzimuth;
  const dy = dishElevation - targetElevation;
  return Math.hypot(dx, dy) <= tolerance;
}

export interface EvaDustTargetState {
  id: string;
  x: number;
  y: number;
  radius: number;
  dustPct: number;
}

export function computeRoverScrubStep(
  roverX: number,
  roverY: number,
  targets: EvaDustTargetState[],
  scrubAmount: number
): { targets: EvaDustTargetState[]; scrubbedIds: string[] } {
  const scrubbedIds: string[] = [];
  const next = targets.map((t) => {
    if (t.dustPct <= 0) return t;
    const dist = Math.hypot(roverX - t.x, roverY - t.y);
    if (dist <= t.radius) {
      scrubbedIds.push(t.id);
      return { ...t, dustPct: Math.max(0, Number((t.dustPct - scrubAmount).toFixed(2))) };
    }
    return t;
  });
  return { targets: next, scrubbedIds };
}

export type CrisisSeverity = 'calm' | 'caution' | 'critical';

export function computeCrisisSeverity(
  state: GameStateSnapshot,
  hasActiveDynamicCrisis: boolean = false
): CrisisSeverity {
  const donki = getDonkiEventForSol(state.sol);
  if (
    hasActiveDynamicCrisis ||
    state.oxygen <= 30 ||
    state.food <= 30 ||
    state.radiationMsv >= 40 ||
    donki.unshieldedDoseMsv >= 22
  ) {
    return 'critical';
  }
  if (
    state.oxygen <= 52 ||
    state.food <= 52 ||
    state.radiationMsv >= 22 ||
    donki.unshieldedDoseMsv >= 10 ||
    donki.powerPenaltyKw > 0
  ) {
    return 'caution';
  }
  return 'calm';
}

export function getAdaptiveMusicContextKey(
  roomId: RoomId | null,
  severity: CrisisSeverity
): string {
  if (severity === 'critical') {
    return `critical:${roomId || 'corridor'}`;
  }
  return `${severity}:${roomId || 'corridor'}`;
}

export interface DailyLogEntry {
  id: string;
  sol: number;
  siteId: MissionSiteId;
  donkiClass: string;
  oxygen: number;
  food: number;
  radiationMsv: number;
  scienceScore: number;
  tasksCompletedCount: number;
  note: string;
  createdAtIso: string;
}

export function createDailyLogEntry(params: {
  sol: number;
  siteId: MissionSiteId;
  donkiClass: string;
  oxygen: number;
  food: number;
  radiationMsv: number;
  scienceScore: number;
  tasksCompletedCount: number;
  note: string;
  createdAtIso?: string;
}): DailyLogEntry {
  const cleanNote = params.note.trim().slice(0, 280);
  const clampedSol = Math.max(1, Math.min(7, Math.round(params.sol)));
  return {
    id: `sol-${clampedSol}-${params.siteId}-${Date.now()}`,
    sol: clampedSol,
    siteId: params.siteId,
    donkiClass: params.donkiClass,
    oxygen: Math.round(params.oxygen),
    food: Math.round(params.food),
    radiationMsv: Number(params.radiationMsv.toFixed(1)),
    scienceScore: Math.round(params.scienceScore),
    tasksCompletedCount: Math.max(0, Math.min(OUTPOST_ROOMS.length, Math.round(params.tasksCompletedCount))),
    note: cleanNote,
    createdAtIso: params.createdAtIso || new Date().toISOString(),
  };
}

export function upsertDailyLog(
  entries: DailyLogEntry[],
  newEntry: DailyLogEntry,
  maxEntries: number = 28
): DailyLogEntry[] {
  if (!newEntry.note.trim()) return entries;
  const filtered = entries.filter(
    (e) => !(e.sol === newEntry.sol && e.siteId === newEntry.siteId && e.createdAtIso.slice(0, 10) === newEntry.createdAtIso.slice(0, 10))
  );
  return [newEntry, ...filtered].slice(0, maxEntries);
}

export function formatDailyLogsForSummary(entries: DailyLogEntry[]): string {
  if (entries.length === 0) return '';
  return entries
    .slice(0, 7)
    .map((e) => `Sol ${e.sol}: "${e.note}"`)
    .join(' | ')
    .slice(0, 400);
}

export interface SpacePlateServings {
  protein: number; // ~360 kcal/serving
  greens: number;  // ~110 kcal/serving (fresh hydroponic microgreens/radish)
  grains: number;  // ~310 kcal/serving (dwarf wheat / oats)
  fruit: number;   // ~180 kcal/serving (berries / dehydrated fruit)
}

export interface SpacePlateNutritionResult {
  totalKcal: number;
  targetMinKcal: number;
  targetMaxKcal: number;
  inHealthyRange: boolean;
  vitaminCScore: number; // 0..100
  freshFoodMoodBoost: number; // 0..100
  feedback: string;
}

export function calculateSpacePlateNutrition(
  servings: SpacePlateServings
): SpacePlateNutritionResult {
  const protein = Math.max(0, Math.min(6, Math.round(servings.protein)));
  const greens = Math.max(0, Math.min(6, Math.round(servings.greens)));
  const grains = Math.max(0, Math.min(6, Math.round(servings.grains)));
  const fruit = Math.max(0, Math.min(6, Math.round(servings.fruit)));

  const totalKcal = protein * 360 + greens * 110 + grains * 310 + fruit * 180;
  const targetMinKcal = 1900;
  const targetMaxKcal = 3200;
  const inHealthyRange =
    totalKcal >= targetMinKcal &&
    totalKcal <= targetMaxKcal &&
    greens >= 1 &&
    protein >= 1;

  const vitaminCScore = Math.min(100, greens * 28 + fruit * 25);
  const freshFoodMoodBoost = Math.min(100, greens * 30 + fruit * 20 + (protein >= 2 ? 15 : 0));

  let feedback =
    'Great CSA Astro-Plate! You hit the 1,900–3,200 kcal astronaut energy range with fresh hydroponic vitamins for crew mood.';
  if (totalKcal < targetMinKcal) {
    feedback =
      'Too low in energy! CSA astronauts need 1,900–3,200 kcal/day to repair muscles and stay sharp on EVA.';
  } else if (totalKcal > targetMaxKcal) {
    feedback =
      'Over packed calories (>3,200 kcal)! Balance lighter fresh Bio-Dome microgreens to save pantry cargo mass.';
  } else if (greens < 1 || protein < 1) {
    feedback =
      'Add at least 1 Bio-Dome Greens + 1 Protein serving so your crew gets bone-saving protein and Vitamin C!';
  }

  return {
    totalKcal,
    targetMinKcal,
    targetMaxKcal,
    inHealthyRange,
    vitaminCScore,
    freshFoodMoodBoost,
    feedback,
  };
}

export interface CsaHydroponicCrop {
  id: CropIngredientId;
  name: string;
  emoji: string;
  kcalPerServing: number;
  proteinG: number;
  vitaminCPct: number;
  boneMineralPct: number;
  waterEfficiencyPct: number;
  moodBoost: number;
  growthDays: number;
  color: string;
  csaFact: string;
}

export const CSA_HYDROPONIC_CROPS: CsaHydroponicCrop[] = [
  {
    id: 'mizuna',
    name: 'Mizuna Mustard Greens',
    emoji: '🥬',
    kcalPerServing: 120,
    proteinG: 5,
    vitaminCPct: 32,
    boneMineralPct: 16,
    waterEfficiencyPct: 95,
    moodBoost: 18,
    growthDays: 28,
    color: '#10B981',
    csaFact: 'Grown on ISS & CSA Arctic labs—packed with crisp Vitamin K & Vitamin C for bones!',
  },
  {
    id: 'wheat',
    name: 'Dwarf Space Wheat',
    emoji: '🌾',
    kcalPerServing: 360,
    proteinG: 12,
    vitaminCPct: 4,
    boneMineralPct: 14,
    waterEfficiencyPct: 86,
    moodBoost: 10,
    growthDays: 65,
    color: '#F59E0B',
    csaFact: 'Compact 35cm stalks save Moon cabin height while baking warm high-energy flatbread!',
  },
  {
    id: 'radish',
    name: 'Astro Cherry Radish',
    emoji: '🌱',
    kcalPerServing: 140,
    proteinG: 4,
    vitaminCPct: 26,
    boneMineralPct: 12,
    waterEfficiencyPct: 94,
    moodBoost: 15,
    growthDays: 27,
    color: '#FB7185',
    csaFact: 'Harvested on ISS Plant Habitat-02! Gives astronauts crunch that wakes up taste buds in zero-G.',
  },
  {
    id: 'berries',
    name: 'Day-Neutral Strawberries',
    emoji: '🍓',
    kcalPerServing: 210,
    proteinG: 3,
    vitaminCPct: 42,
    boneMineralPct: 10,
    waterEfficiencyPct: 88,
    moodBoost: 24,
    growthDays: 45,
    color: '#F43F5E',
    csaFact: 'CSA northern greenhouse favorite! Antioxidants help shield astronaut cells from solar radiation.',
  },
  {
    id: 'microgreens',
    name: 'Arctic Kale Microgreens',
    emoji: '🥗',
    kcalPerServing: 150,
    proteinG: 6,
    vitaminCPct: 35,
    boneMineralPct: 24,
    waterEfficiencyPct: 97,
    moodBoost: 16,
    growthDays: 14,
    color: '#34D399',
    csaFact: '4x more vitamins per leaf than mature greens—perfect for Moon habitats and Nunavut winters!',
  },
  {
    id: 'spirulina',
    name: 'Bio-Reactor Spirulina',
    emoji: '🫧',
    kcalPerServing: 340,
    proteinG: 22,
    vitaminCPct: 12,
    boneMineralPct: 26,
    waterEfficiencyPct: 99,
    moodBoost: 8,
    growthDays: 7,
    color: '#38BDF8',
    csaFact: 'Micro-algae superfood tested by CSA & ESA: recycles CO2 into pure O2 AND muscle-saving protein!',
  },
];

export type CropLabSelectionMap = Record<CropIngredientId, number>;

export interface CsaCropLabSimulationResult {
  totalKcal: number;
  proteinGrams: number;
  proteinScore: number; // 0..100
  vitaminCScore: number; // 0..100
  boneMineralScore: number; // 0..100
  hydrationPct: number; // 0..100
  crewMoodBoost: number; // 0..100
  astronautHealthState: 'Peak Energy' | 'Needs Fuel' | 'Vitamin Gap' | 'Cargo Heavy';
  inHealthyRange: boolean;
  summary: string;
}

export function calculateCsaCropLabSimulation(
  selections: CropLabSelectionMap
): CsaCropLabSimulationResult {
  let totalKcal = 0;
  let proteinGrams = 0;
  let vitaminC = 0;
  let boneMinerals = 0;
  let mood = 0;
  let weightedWaterEff = 0;
  let totalServings = 0;

  for (const crop of CSA_HYDROPONIC_CROPS) {
    const qty = Math.max(0, Math.min(6, Math.round(selections[crop.id] || 0)));
    if (qty === 0) continue;
    totalServings += qty;
    totalKcal += qty * crop.kcalPerServing;
    proteinGrams += qty * crop.proteinG;
    vitaminC += qty * crop.vitaminCPct;
    boneMinerals += qty * crop.boneMineralPct;
    mood += qty * crop.moodBoost;
    weightedWaterEff += qty * crop.waterEfficiencyPct;
  }

  const proteinScore = Math.min(100, Math.round((proteinGrams / 75) * 100));
  const vitaminCScore = Math.min(100, Math.round(vitaminC));
  const boneMineralScore = Math.min(100, Math.round(boneMinerals));
  const hydrationPct =
    totalServings > 0 ? Math.min(100, Math.round(weightedWaterEff / totalServings)) : 0;
  const crewMoodBoost = Math.min(100, Math.round(mood));

  let astronautHealthState: CsaCropLabSimulationResult['astronautHealthState'] = 'Peak Energy';
  let summary =
    'Peak CSA Astronaut Nutrition! Balanced calories (1,900–3,200 kcal), bone minerals, muscle protein, and fresh Vitamin C!';

  if (totalKcal < 1900) {
    astronautHealthState = 'Needs Fuel';
    summary =
      'Low Calorie Energy (<1,900 kcal): Add Dwarf Wheat or Spirulina so astronauts have EVA stamina!';
  } else if (totalKcal > 3200) {
    astronautHealthState = 'Cargo Heavy';
    summary =
      'Over Calorie Target (>3,200 kcal): Swap heavy grains for lighter Mizuna greens & Radishes to save greenhouse water.';
  } else if (vitaminCScore < 65 || proteinScore < 55) {
    astronautHealthState = 'Vitamin Gap';
    summary =
      'Calories look good, but balance your nutrients! Add Berries/Microgreens for Vitamin C or Spirulina for muscle protein.';
  }

  const inHealthyRange = astronautHealthState === 'Peak Energy';

  return {
    totalKcal,
    proteinGrams,
    proteinScore,
    vitaminCScore,
    boneMineralScore,
    hydrationPct,
    crewMoodBoost,
    astronautHealthState,
    inHealthyRange,
    summary,
  };
}

export interface SpaceKitchenRecipe {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  csaOriginNote: string;
  cost: Partial<CropPantryInventory>;
  rewards: {
    food: number;
    oxygen: number;
    science: number;
  };
}

export const SPACE_RECIPES: SpaceKitchenRecipe[] = [
  {
    id: 'taco-wrap',
    name: 'Orbital Crunchy Taco Wrap',
    emoji: '🌮',
    tagline: 'Crispy Bio-Dome tortilla packed with fresh Mizuna & Astro Radishes!',
    csaOriginNote: 'Inspired by ISS Expedition astronauts eating homegrown red & green salad wraps.',
    cost: { mizuna: 1, wheat: 1, radish: 1, h2oDrops: 1 },
    rewards: { food: 12, oxygen: 3, science: 25 },
  },
  {
    id: 'berry-bowl',
    name: 'Jezero Berry Energy Bowl',
    emoji: '🥣',
    tagline: 'Antioxidant strawberries & kale microgreens to protect against solar radiation!',
    csaOriginNote: 'CSA nutritionists pair high Vitamin C fruit with Arctic microgreens.',
    cost: { berries: 1, microgreens: 1, h2oDrops: 1 },
    rewards: { food: 10, oxygen: 4, science: 25 },
  },
  {
    id: 'flatbread',
    name: 'Commander’s Bio-Dome Flatbread',
    emoji: '🫓',
    tagline: 'Warm protein-boosted dwarf wheat loaf with Spirulina pesto.',
    csaOriginNote: 'Uses CSA Deep Space Food Challenge Spirulina protein + compact wheat.',
    cost: { wheat: 1, mizuna: 1, spirulina: 1, h2oDrops: 1 },
    rewards: { food: 14, oxygen: 4, science: 30 },
  },
  {
    id: 'arctic-ramen',
    name: 'Moon-to-Arctic Bio-Soup Cup',
    emoji: '🍲',
    tagline: 'Steaming broth infused with crispy radishes, microgreens & protein algae!',
    csaOriginNote: 'Demonstrates closed-loop rehydration using recycled ECLSS Bay water.',
    cost: { radish: 1, microgreens: 1, spirulina: 1, h2oDrops: 2 },
    rewards: { food: 16, oxygen: 5, science: 35 },
  },
];

export function canCookSpaceRecipe(
  pantry: CropPantryInventory,
  recipe: SpaceKitchenRecipe
): boolean {
  for (const [key, needed] of Object.entries(recipe.cost)) {
    const k = key as keyof CropPantryInventory;
    if ((pantry[k] || 0) < (needed || 0)) return false;
  }
  return true;
}

export function consumeRecipeIngredients(
  pantry: CropPantryInventory,
  recipe: SpaceKitchenRecipe
): CropPantryInventory {
  const next = { ...pantry };
  for (const [key, needed] of Object.entries(recipe.cost)) {
    const k = key as keyof CropPantryInventory;
    next[k] = Math.max(0, (next[k] || 0) - (needed || 0));
  }
  return next;
}

export interface NutritionExplorerHealthResult {
  healthMeterScore: number; // 0..100 real-time base health meter
  kcalCoveragePct: number; // 0..100
  vitaminImmunityPct: number; // 0..100
  boneMusclePct: number; // 0..100
  hydrationRecyclePct: number; // 0..100
  harvestedUnitsCount: number;
  processedMealsCount: number;
  pantryStockUnits: number;
  statusLabel: 'Peak Base Health' | 'Steady Fuel' | 'Grow & Cook Needed';
  nextActionTip: string;
}

/**
 * Computes the live 'Nutrition Explorer' Health Meter inside the Space Food Lab
 * from actual crops harvested & stored/processed in the outpost plus base Food & O2 levels.
 */
export function calculateNutritionExplorerHealth(
  state: GameStateSnapshot
): NutritionExplorerHealthResult {
  const pantry = state.pantry;
  const pantryStockUnits =
    pantry.mizuna +
    pantry.wheat +
    pantry.radish +
    pantry.berries +
    pantry.microgreens +
    pantry.spirulina;

  // Map real pantry stock into CSA crop ratios (scaled so real base harvests + meals lift score cleanly)
  const dailyEnergyKcal =
    pantry.wheat * 360 +
    pantry.spirulina * 340 +
    pantry.berries * 210 +
    pantry.microgreens * 150 +
    pantry.radish * 140 +
    pantry.mizuna * 120 +
    state.mealsCookedTotal * 260;

  const kcalCoveragePct = Math.min(100, Math.round((dailyEnergyKcal / 2400) * 100));

  const vitaminImmunityPct = Math.min(
    100,
    Math.round(
      pantry.mizuna * 12 +
        pantry.radish * 10 +
        pantry.berries * 18 +
        pantry.microgreens * 16 +
        state.mealsCookedTotal * 12
    )
  );

  const boneMusclePct = Math.min(
    100,
    Math.round(
      pantry.wheat * 11 +
        pantry.spirulina * 24 +
        pantry.microgreens * 12 +
        pantry.mizuna * 8 +
        state.mealsCookedTotal * 14
    )
  );

  const hydrationRecyclePct = Math.min(
    100,
    Math.round(
      pantry.h2oDrops * 16 +
        (state.oxygen >= 60 ? 25 : 10) +
        (state.cropsHarvestedTotal > 0 ? 15 : 0) +
        state.mealsCookedTotal * 8
    )
  );

  const harvestBoost = Math.min(18, state.cropsHarvestedTotal * 2);
  const processedBoost = Math.min(20, state.mealsCookedTotal * 8);
  const foodReserveFactor = Math.round(state.food * 0.28);

  const rawMeter =
    kcalCoveragePct * 0.24 +
    vitaminImmunityPct * 0.22 +
    boneMusclePct * 0.2 +
    hydrationRecyclePct * 0.14 +
    foodReserveFactor +
    harvestBoost * 0.55 +
    processedBoost * 0.65;

  const healthMeterScore = Math.max(8, Math.min(100, Math.round(rawMeter)));

  let statusLabel: NutritionExplorerHealthResult['statusLabel'] = 'Steady Fuel';
  let nextActionTip =
    'Harvest crops in Bio-Dome or pick Galley Sprouts, then cook a Space Meal in Astro-Kitchen to max your Health Meter!';

  if (healthMeterScore >= 82) {
    statusLabel = 'Peak Base Health';
    nextActionTip =
      'Outstanding CSA nutrition! Harvested greens & cooked meals give astronauts peak bone density, Vitamin C, and EVA stamina.';
  } else if (healthMeterScore < 55) {
    statusLabel = 'Grow & Cook Needed';
    nextActionTip =
      'Low base pantry reserves! Visit Hydroponic Bio-Dome to harvest fresh crops or pick Galley Micro-Sprouts & cook a dish.';
  }

  return {
    healthMeterScore,
    kcalCoveragePct,
    vitaminImmunityPct,
    boneMusclePct,
    hydrationRecyclePct,
    harvestedUnitsCount: state.cropsHarvestedTotal,
    processedMealsCount: state.mealsCookedTotal,
    pantryStockUnits,
    statusLabel,
    nextActionTip,
  };
}






