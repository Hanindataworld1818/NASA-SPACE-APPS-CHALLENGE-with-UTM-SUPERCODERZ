import {
  CURATED_NASA_DONKI_SCHEDULE,
  MISSION_SITES,
  MissionSiteId,
  NasaDonkiEvent,
} from './nasaData';

export type RoomId =
  | 'power'
  | 'lifesupport'
  | 'hydroponics'
  | 'shield'
  | 'eva'
  | 'comms';

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

export const OUTPOST_WORLD_W = 1560;
export const OUTPOST_WORLD_H = 900;

export const OUTPOST_ROOMS: OutpostRoom[] = [
  {
    id: 'power',
    name: 'Reactor & Solar Grid',
    shortLabel: 'Power Grid',
    kidRole: 'Plug & split electricity between rooms!',
    nasaSystemName: 'Kilopower Fission + Solar Array',
    x: 95,
    y: 110,
    w: 350,
    h: 255,
    color: '#1E293B',
    accentColor: '#F59E0B',
    consoleX: 270,
    consoleY: 225,
  },
  {
    id: 'lifesupport',
    name: 'O2 Electrolyzer Bay',
    shortLabel: 'Life Support',
    kidRole: 'Clean CO2 filters & make breathable air!',
    nasaSystemName: 'NASA ECLSS Water Electrolyzer',
    x: 605,
    y: 110,
    w: 350,
    h: 255,
    color: '#1E293B',
    accentColor: '#38BDF8',
    consoleX: 780,
    consoleY: 225,
  },
  {
    id: 'hydroponics',
    name: 'Hydroponic Bio-Dome',
    shortLabel: 'Bio-Dome',
    kidRole: 'Tune Red/Blue LEDs & harvest space crops!',
    nasaSystemName: 'NASA OSDR (OSD-379) Veggie Chamber',
    x: 1115,
    y: 110,
    w: 350,
    h: 255,
    color: '#1E293B',
    accentColor: '#10B981',
    consoleX: 1290,
    consoleY: 225,
  },
  {
    id: 'shield',
    name: 'Radiation Shield Vault',
    shortLabel: 'Shield Vault',
    kidRole: 'Block NASA DONKI solar flares with water walls!',
    nasaSystemName: 'DONKI Storm Shelter + Water Shield',
    x: 95,
    y: 535,
    w: 350,
    h: 255,
    color: '#1E293B',
    accentColor: '#A855F7',
    consoleX: 270,
    consoleY: 645,
  },
  {
    id: 'eva',
    name: 'Rover & EVA Airlock',
    shortLabel: 'EVA Airlock',
    kidRole: 'Wipe solar dust & drill ice cores outside!',
    nasaSystemName: 'Artemis / MEDA Surface Airlock',
    x: 605,
    y: 535,
    w: 350,
    h: 255,
    color: '#1E293B',
    accentColor: '#F97316',
    consoleX: 780,
    consoleY: 645,
  },
  {
    id: 'comms',
    name: 'Comms & Sound Deck',
    shortLabel: 'Comms & Music',
    kidRole: 'Beam science to Earth, transcribe voice & play music!',
    nasaSystemName: 'Deep Space Network + Crew Jukebox',
    x: 1115,
    y: 535,
    w: 350,
    h: 255,
    color: '#1E293B',
    accentColor: '#EC4899',
    consoleX: 1290,
    consoleY: 645,
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

export interface GameStateSnapshot {
  siteId: MissionSiteId;
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

export function createInitialGameState(siteId: MissionSiteId = 'mars'): GameStateSnapshot {
  const availablePowerKw = computeAvailablePowerKw(siteId, 1, 0);
  return {
    siteId,
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
      const base = `S${m.sol}(${cls}): O2 ${m.oxygen}% Food ${m.food}% Rad ${m.radiationMsv}mSv ${m.tasksCompleted.length}/6`;
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



