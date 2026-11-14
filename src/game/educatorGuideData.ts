import { RoomId } from './rules';

export interface DailyRoutinePhase {
  id: string;
  timeUtc: string;
  phaseTitle: string;
  shortLabel: string;
  icon: string;
  color: string;
  clockAngleDeg: number; // 0..360 for SVG interactive wheel
  whenTrigger: string;
  whyImportant: string;
  whichWayChoice: string;
  howAstronautsDoIt: string;
  nasaResourceName: string;
  nasaResourceUrl: string;
}

export interface StationMasterGuide {
  roomId: RoomId;
  title: string;
  shortName: string;
  accentColor: string;
  purposeImportance: string;
  whenToDoIt: string;
  whichWayTradeoff: string;
  howStepByStep: string[];
  realNasaEquivalent: string;
  nasaSourceUrl: string;
}

export interface EducatorLessonPrompt {
  id: string;
  gradeBand: string;
  topic: string;
  question: string;
  expectedDiscovery: string;
  officialLinkLabel: string;
  officialLinkUrl: string;
}

export const ASTRONAUT_DAILY_SCHEDULE: DailyRoutinePhase[] = [
  {
    id: 'wakeup-weather',
    timeUtc: '06:00',
    phaseTitle: 'Wake-Up & Space Weather Briefing',
    shortLabel: '06:00 Briefing',
    icon: '☀️',
    color: '#F59E0B',
    clockAngleDeg: 0,
    whenTrigger: 'First thing every Sol (Martian day = 24h 39m) before assigning crew power.',
    whyImportant:
      'NASA DONKI solar flares can arrive within minutes to hours! Checking the 3-Sol forecast prevents crews from getting caught unshielded.',
    whichWayChoice:
      'Quiet Sun (C-class)? Focus power on Science & Bio-Dome crops. M8.8 or X8.7 flare incoming? Reserve 2–3 kW for the Radiation Shield Vault!',
    howAstronautsDoIt:
      'Read the top-right 3-Sol NASA DONKI Forecast strip and adjust the Reactor & Solar Grid kW switches right away.',
    nasaResourceName: 'NASA DONKI Space Weather Database',
    nasaResourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  },
  {
    id: 'breakfast-nutrition',
    timeUtc: '07:30',
    phaseTitle: 'Astronaut Breakfast & Bone/Muscle Fuel',
    shortLabel: '07:30 Nutrition',
    icon: '🥗',
    color: '#10B981',
    clockAngleDeg: 60,
    whenTrigger: 'Morning meal + hydration check before heavy physical and lab duties.',
    whyImportant:
      'NASA OSDR studies (OSD-342) show low Moon/Mars gravity causes bone and muscle loss. Crew members need 1,900–3,200 kcal/day plus Vitamin C!',
    whichWayChoice:
      'Packaged Earth food lasts long but loses vitamins; growing fresh Mizuna lettuce and Dwarf Wheat in the Bio-Dome boosts morale and health.',
    howAstronautsDoIt:
      'Keep Hydroponics powered (1–2 kW) and mist space crops so water stays in the 28%–85% healthy zone.',
    nasaResourceName: 'CSA Food Production & NASA OSDR OSD-342',
    nasaResourceUrl:
      'https://www.asc-csa.gc.ca/eng/educators/toolkit/food-production-on-the-moon-and-in-remote-areas.asp',
  },
  {
    id: 'eclss-air-work',
    timeUtc: '09:30',
    phaseTitle: 'Life Support & Bio-Dome Maintenance',
    shortLabel: '09:30 Air & Crops',
    icon: '🫧',
    color: '#38BDF8',
    clockAngleDeg: 120,
    whenTrigger: 'Mid-morning whenever cabin Oxygen dips below 85% or CO2 filter alerts flash.',
    whyImportant:
      'In space, nobody breathes for free! If CO2 builds up or water electrolysis stops, astronauts can lose consciousness within hours.',
    whichWayChoice:
      'High-power Electrolyzer mode makes fast O2 (+10%/kW), while Hydroponic plants recycle CO2 into fresh air (+4% O2) AND food at the same time!',
    howAstronautsDoIt:
      'Zap floating grime off CO2 scrubbers in the O2 Electrolyzer Bay, then tune Bio-Dome LEDs to 65%–88% Red/Blue.',
    nasaResourceName: 'NASA ISS ECLSS Life Support Reference',
    nasaResourceUrl: 'https://www.nasa.gov/reference/eclss/',
  },
  {
    id: 'eva-surface',
    timeUtc: '13:30',
    phaseTitle: 'Rover Inspection & Spacewalk (EVA)',
    shortLabel: '13:30 Surface EVA',
    icon: '🚜',
    color: '#F97316',
    clockAngleDeg: 180,
    whenTrigger: 'Afternoon during calm solar windows—especially when Sol 3 dust dims solar panels (-1 kW)!',
    whyImportant:
      'Martian dust & sharp lunar regolith cling to solar panels via static electricity, cutting outpost power unless cleaned by EVA crew or rovers.',
    whichWayChoice:
      'Go outside on EVA to brush dust off and gain +1 kW bonus power (+20 Science), OR stay safely inside to save spacesuit O2 and avoid radiation.',
    howAstronautsDoIt:
      'Drive the EVA Rover over dusty solar wings in the Airlock Bay and wipe panels clean while keeping radiation low.',
    nasaResourceName: 'NASA Mars Trek & Artemis EVA Exploration',
    nasaResourceUrl: 'https://trek.nasa.gov/mars/',
  },
  {
    id: 'shield-watch',
    timeUtc: '17:00',
    phaseTitle: 'Radiation Dosimetry & Water-Wall Lock',
    shortLabel: '17:00 Shield Watch',
    icon: '🛡️',
    color: '#A855F7',
    clockAngleDeg: 240,
    whenTrigger: 'Before nightfall and ALWAYS when DONKI predicts M-class or X-class flares!',
    whyImportant:
      'OSDR RadLab dosimeters show the Moon (1.1 mSv/day) and Mars (0.64 mSv/day) get 80–140x more radiation than Earth! Exceeding 60 mSv forces an abort.',
    whichWayChoice:
      'Pump hydrogen-rich water walls to 75%+ pressure and divert 2–3 kW to Shields—even if Science and Crops slow down overnight.',
    howAstronautsDoIt:
      'Visit the Radiation Shield Vault, pump H2O repeatedly (or press Spacebar), and lock all 3 hull sectors before the storm timer expires.',
    nasaResourceName: 'NASA OSDR RadLab Dosimetry Portal',
    nasaResourceUrl: 'https://visualization.osdr.nasa.gov/radlab/gui/overview/',
  },
  {
    id: 'comms-daily-log',
    timeUtc: '20:00',
    phaseTitle: 'Earth Comms Uplink, Daily Log & Rest',
    shortLabel: '20:00 Uplink & Log',
    icon: '📡',
    color: '#EC4899',
    clockAngleDeg: 300,
    whenTrigger: 'End of each Sol after completing daily station checks and locking overnight power.',
    whyImportant:
      'Mars radio signals take ~14 minutes one-way! Recording a Daily Log helps Mission Control & future crews learn from every engineering trade-off.',
    whichWayChoice:
      'Save 1–2 kW for Comms to earn Science points, or shift that kW to O2/Shields overnight if survival bars look tight.',
    howAstronautsDoIt:
      'Aim the Comms Dish to match Earth’s target azimuth/elevation, click Next Sol, and write a quick Daily Log note in your HUD!',
    nasaResourceName: 'NASA Deep Space Network & OSDR Sleep Study (OSD-274)',
    nasaResourceUrl: 'https://osdr.nasa.gov/bio/repo/',
  },
];

export const STATION_MASTER_GUIDES: StationMasterGuide[] = [
  {
    roomId: 'power',
    title: 'Reactor & Solar Grid',
    shortName: 'Power Grid',
    accentColor: '#F59E0B',
    purposeImportance:
      'Electricity is the heartbeat of the entire outpost! Every breath of oxygen, grow lamp, shield pump, and radio uplink shares your strict 5–7 kW power budget.',
    whenToDoIt:
      'At the start of EVERY Sol, and immediately after an EVA bonus (+1 kW) or before a Sol 4/6 flare.',
    whichWayTradeoff:
      'More kW in Hydroponics grows Food, but leaves fewer kW for Shields or O2. Never leave Life Support at 0 kW unless O2 is near 100%!',
    howStepByStep: [
      'Watch the spinning Reactor Core phase dial.',
      'Click "Lock Phase" when the needle enters the 68%–96% Green Zone across all 3 cores for +1 kW bonus power.',
      'Use + / - switches to split total kW among O2, Shield Vault, Bio-Dome, and Comms.',
    ],
    realNasaEquivalent: 'NASA Kilopower Fission Reactor + Roll-Out Solar Arrays (iROSA)',
    nasaSourceUrl: 'https://www.nasa.gov/directorates/stmd/tech-demonstration-missions/kilopower/',
  },
  {
    roomId: 'lifesupport',
    title: 'O2 Electrolyzer Bay',
    shortName: 'Life Support',
    accentColor: '#38BDF8',
    purposeImportance:
      'Removes toxic exhaled CO2 and splits water molecules (2H2O → 2H2 + O2) so crewmates stay healthy and breathe cleanly.',
    whenToDoIt:
      'Every Sol, especially if Oxygen drops below 65% or an ECLSS scrubber frost emergency happens.',
    whichWayTradeoff:
      'High O2 power keeps lungs & immune systems safe (OSDR OSD-530), while Hydroponics plants also add +4% free bio-regenerative O2.',
    howStepByStep: [
      'Click on floating electrostatic grime spots inside the CO2 filter chamber.',
      'Zap all grime spots before the 18-second filter clog timer runs out.',
      'Earn an instant +8% Oxygen boost and +20 NASA Science points!',
    ],
    realNasaEquivalent: 'ISS Environmental Control and Life Support System (ECLSS) & Mars MOXIE',
    nasaSourceUrl: 'https://www.nasa.gov/reference/eclss/',
  },
  {
    roomId: 'hydroponics',
    title: 'Hydroponic Bio-Dome',
    shortName: 'Bio-Dome',
    accentColor: '#10B981',
    purposeImportance:
      'Grows Mizuna lettuce, Dwarf Wheat, and Astro Radishes for astronaut nutrition (1,900–3,200 kcal/day), fresh Vitamin C, and bonus Oxygen!',
    whenToDoIt:
      'Once per Sol during calm/moderate days so Food Rations never fall below 30%.',
    whichWayTradeoff:
      'Bio-Dome lighting uses steady power and water. The same CSA Closed-Loop CEA greenhouse tech feeds remote northern Arctic communities on Earth!',
    howStepByStep: [
      'Plant seeds in all 3 hydroponic soil trays.',
      'Keep the Red/Blue LED slider in the 65%–88% sweet spot and tap "Mist Water" to stay between 28% and 85%.',
      'Once Crop Bloom reaches 100%, click all 3 ripe pods to harvest!',
    ],
    realNasaEquivalent: 'NASA OSDR OSD-379 Veggie Lab + CSA CANGrow / Deep Space Food Challenge',
    nasaSourceUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-379',
  },
  {
    roomId: 'foodlab',
    title: 'Space Food Lab & Kitchen',
    shortName: 'Food Lab',
    accentColor: '#FB7185',
    purposeImportance:
      'Turns fresh Bio-Dome hydroponic crops & recycled ECLSS water into balanced 1,900–3,200 kcal astronaut meals that fight bone loss, protect immunity, and unite the crew!',
    whenToDoIt:
      'Right after harvesting the Bio-Dome or whenever Crew Food % dips below 85%.',
    whichWayTradeoff:
      'Heavier grains give high calories fast, while fresh Mizuna, Berries, and Arctic Microgreens boost Vitamin C and crew happiness—same science CSA uses for northern Arctic communities!',
    howStepByStep: [
      'Simulate CSA crops in the Nutrition Lab until the astronaut gauge hits Peak Energy (1,900–3,200 kcal).',
      'Collect floating ingredients in the Zero-G Astro-Mixer and bake inside the Golden Thermal Zone.',
      'Serve plates to all 5 astronauts at the shared table so everyone eats and dances together!',
    ],
    realNasaEquivalent: 'CSA Food Production Toolkit & ISS Space Galley Rehydration Table',
    nasaSourceUrl:
      'https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/',
  },
  {
    roomId: 'shield',
    title: 'Radiation Shield Vault',
    shortName: 'Shield Vault',
    accentColor: '#A855F7',
    purposeImportance:
      'Protects astronaut DNA from cosmic rays and sudden Solar Particle Events (SPEs). Water is rich in hydrogen atoms that slow down incoming protons!',
    whenToDoIt:
      'Mandatory on Sol 2 (M8.8 Flare), Sol 4 (X8.7 Super Flare), and Sol 6 (Fast CME).',
    whichWayTradeoff:
      'Running Shields at 3 kW + locking Water Walls blocks up to 92% of flare radiation, but forces temporary cuts to Comms or Bio-Dome growth.',
    howStepByStep: [
      'Water pressure drains continuously under solar wind stress.',
      'Click "PUMP H2O!" repeatedly (or tap Spacebar) until pressure enters 75%–100%.',
      'Hit "LOCK VALVE!" on all 3 hull sectors before each 14s storm wave timer hits zero.',
    ],
    realNasaEquivalent: 'NASA DONKI Storm Shelter + OSDR RadLab (ISS DosTel & Curiosity RAD)',
    nasaSourceUrl: 'https://visualization.osdr.nasa.gov/radlab/gui/overview/',
  },
  {
    roomId: 'eva',
    title: 'Rover & EVA Airlock',
    shortName: 'EVA Airlock',
    accentColor: '#F97316',
    purposeImportance:
      'Maintains exterior solar arrays coated by sticky dust storms and inspects Martian/Lunar terrain around the outpost.',
    whenToDoIt:
      'Best on Sol 3 (Dust Squall -1 kW) or whenever you need +1 kW extra grid power for survival.',
    whichWayTradeoff:
      'Going outside earns +1 kW bonus power & +20 Science, but consumes -4% spacesuit O2 and exposes the crew to a tiny bit of surface radiation.',
    howStepByStep: [
      'Drive the EVA Rover around the 2D/3D surface arena using WASD / Arrow keys or mouse.',
      'Hold the Rover Brush over dusty solar array targets until each panel hits 100% clean.',
      'Return cleanly through the airlock to boost grid electricity!',
    ],
    realNasaEquivalent: 'Artemis Pressurized Rover + Perseverance Jezero Crater Surface Ops',
    nasaSourceUrl: 'https://trek.nasa.gov/mars/',
  },
  {
    roomId: 'comms',
    title: 'Comms & Sound Deck',
    shortName: 'Comms & Music',
    accentColor: '#EC4899',
    purposeImportance:
      'Beams science discoveries back to Earth’s Deep Space Network, logs live voice transmissions, and keeps crew spirits high with adaptive space music.',
    whenToDoIt:
      'After completing daytime tasks, right before ending the Sol.',
    whichWayTradeoff:
      'Mars signals take 14 minutes one-way vs 1.3 seconds on the Moon—so on Mars, Junior Astronauts must solve emergencies autonomously!',
    howStepByStep: [
      'Adjust Azimuth and Elevation sliders to align the Deep Space Dish within ±14° of Earth’s beacon.',
      'Hold lock to beam science telemetry (+25 Science)!',
      'Optionally compose AI Space Jukebox tracks or record live transcribed Captain’s Voice Logs.',
    ],
    realNasaEquivalent: 'NASA Deep Space Network (DSN) + Crew Audio Telemetry',
    nasaSourceUrl: 'https://eyes.nasa.gov/apps/dsn-now/dsn.html',
  },
  {
    roomId: 'academy',
    title: 'Academy Station (Learn & Multi-Quiz)',
    shortName: 'Academy',
    accentColor: '#FACC15',
    purposeImportance:
      'Turns Junior Astronaut STEM science into fun, bite-sized study decks and 4 interactive quiz game patterns where kids and educators earn Science Marks and survival supplies!',
    whenToDoIt:
      'Anytime during a Sol—especially before tough flares or whenever Oxygen, Food, or Shield margin feels tight!',
    whichWayTradeoff:
      'Pick the Survival Supply Pack your base needs most after finishing a quiz set: +O2 & Greens, -4 mSv Rad Shielding, or CSA Pantry Crops.',
    howStepByStep: [
      'Explore the 6 Junior Astronaut Mission Trainer lesson cards & animated diagrams.',
      'Play a 3-challenge Multi-Quiz round (Scenario Choice, Myth Buster, kW Balance Slider & Order Builder).',
      'Claim Science Marks and choose a Survival Supply Pack for the crew!',
    ],
    realNasaEquivalent: 'CSA Youth STEM + NASA Open Science Education Hub',
    nasaSourceUrl: 'https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp',
  },
];

export const EDUCATOR_CLASSROOM_PROMPTS: EducatorLessonPrompt[] = [
  {
    id: 'prompt-shield-vs-food',
    gradeBand: 'Ages 7–9 (Grades 2–4)',
    topic: 'Energy Budgeting & Needs vs. Wants',
    question:
      'If a big X8.7 solar flare hits tomorrow (Sol 4) and you only have 6 kW of power, what happens if you spend all 6 kW on growing lettuce and 0 kW on shields?',
    expectedDiscovery:
      'The crew gets full food, but absorbs +28 mSv of radiation in one night! Kids see visually that survival needs balanced priorities.',
    officialLinkLabel: 'NASA DONKI Space Weather Portal',
    officialLinkUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  },
  {
    id: 'prompt-moon-vs-mars',
    gradeBand: 'Ages 9–12 (Grades 4–6)',
    topic: 'Comparing Lunar & Martian Environments',
    question:
      'Why does Artemis Base on the Moon have higher background radiation (1.1 mSv/sol) than Jezero Outpost on Mars (0.64 mSv/sol), yet Mars loses solar power to dust storms?',
    expectedDiscovery:
      'The Moon has zero atmosphere to block cosmic rays, while Mars has a thin 1% CO2 atmosphere that stops a little radiation—but creates globe-circling dust storms!',
    officialLinkLabel: 'NASA RadLab Dosimetry & Mars Trek',
    officialLinkUrl: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/',
  },
  {
    id: 'prompt-space-to-earth',
    gradeBand: 'Ages 7–12 (STEM & Sustainability)',
    topic: 'Space Tech Helping Earth Communities',
    question:
      'How does a hydroponic greenhouse designed for the Moon help families living in remote northern Arctic towns on Earth?',
    expectedDiscovery:
      'Both places face months of darkness, freezing ground, and expensive cargo transport. Closed-loop LED hydroponics grows fresh Vitamin-C greens year-round!',
    officialLinkLabel: 'CSA Moon-to-Earth Food Production Toolkit',
    officialLinkUrl:
      'https://www.asc-csa.gc.ca/eng/educators/toolkit/food-production-on-the-moon-and-in-remote-areas.asp',
  },
];

export function computeEducatorTradeoffPreview(params: {
  flareDoseMsv: number;
  shieldKw: number;
  hydroKw: number;
}): {
  shieldBlockedPct: number;
  crewDoseReceivedMsv: number;
  foodChangePct: number;
  bonusO2Pct: number;
  safetyVerdict: 'SAFE' | 'CAUTION' | 'DANGER';
  lessonSummary: string;
} {
  const shieldKw = Math.max(0, Math.min(3, Math.round(params.shieldKw)));
  const hydroKw = Math.max(0, Math.min(3, Math.round(params.hydroKw)));
  const flareDose = Math.max(0, Math.min(30, params.flareDoseMsv));

  const shieldBlockedPct = Math.min(92, shieldKw * 28 + (shieldKw >= 3 ? 8 : 0));
  const crewDoseReceivedMsv = Number(
    (0.64 + flareDose * (1 - shieldBlockedPct / 100)).toFixed(1)
  );
  const foodChangePct = hydroKw * 9 - 14;
  const bonusO2Pct = hydroKw >= 1 ? 4 : 0;

  let safetyVerdict: 'SAFE' | 'CAUTION' | 'DANGER' = 'SAFE';
  let lessonSummary =
    'Well balanced! Water-wall shielding keeps radiation low while crops still receive growth energy.';

  if (crewDoseReceivedMsv >= 12) {
    safetyVerdict = 'DANGER';
    lessonSummary =
      'Radiation Danger! Too little Shield power during a strong solar flare exposes crew DNA to high ionizing dose.';
  } else if (foodChangePct < -8 || crewDoseReceivedMsv >= 6) {
    safetyVerdict = 'CAUTION';
    lessonSummary =
      'Trade-off Alert: Protecting shields today slows crop growth (or vice versa)—plan tomorrow’s power shift!';
  }

  return {
    shieldBlockedPct,
    crewDoseReceivedMsv,
    foodChangePct,
    bonusO2Pct,
    safetyVerdict,
    lessonSummary,
  };
}
