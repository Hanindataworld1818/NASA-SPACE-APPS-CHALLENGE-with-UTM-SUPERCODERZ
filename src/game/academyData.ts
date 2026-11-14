import { CropPantryInventory } from './rules';

export type AcademyTopicId =
  | 'power_tradeoffs'
  | 'air_water'
  | 'radiation_donki'
  | 'food_csa'
  | 'mars_eva'
  | 'comms_sol';

export interface AcademyLessonCard {
  id: AcademyTopicId;
  title: string;
  shortTitle: string;
  icon: string;
  accentColor: string;
  whenLabel: string;
  whyImportant: string;
  howItWorks: string;
  realNasaSource: string;
  educatorTip: string;
  visualDiagramType: 'power' | 'air' | 'shield' | 'food' | 'eva' | 'comms';
  keyNumbers: Array<{ label: string; value: string }>;
}

export type QuizPatternType =
  | 'multiple_choice'
  | 'myth_buster'
  | 'balance_slider'
  | 'sequence_order';

interface BaseQuizQuestion {
  id: string;
  topicId: AcademyTopicId;
  pattern: QuizPatternType;
  prompt: string;
  hint: string;
  explanation: string;
  nasaCitation: string;
  baseMarks: number;
}

export interface MultipleChoiceQuiz extends BaseQuizQuestion {
  pattern: 'multiple_choice';
  options: [string, string, string, string];
  correctIndex: number;
}

export interface MythBusterQuiz extends BaseQuizQuestion {
  pattern: 'myth_buster';
  statement: string;
  isFactTrue: boolean;
}

export interface BalanceSliderQuiz extends BaseQuizQuestion {
  pattern: 'balance_slider';
  totalBudget: number;
  budgetUnit: string;
  sliderALabel: string;
  sliderAMin: number;
  sliderAMax: number;
  sliderBLabel: string;
  sliderBMin: number;
  sliderBMax: number;
  initialA: number;
  initialB: number;
  ruleDescription: string;
  evaluate: (a: number, b: number) => {
    passed: boolean;
    liveMetricLabel: string;
    feedback: string;
  };
}

export interface SequenceOrderQuiz extends BaseQuizQuestion {
  pattern: 'sequence_order';
  shuffledItems: string[];
  correctOrder: string[];
}

export type AcademyQuizQuestion =
  | MultipleChoiceQuiz
  | MythBusterQuiz
  | BalanceSliderQuiz
  | SequenceOrderQuiz;

export type SurvivalSupplyPackId = 'air_greens' | 'shield_boost' | 'galley_crate';

export interface SurvivalSupplyPack {
  id: SurvivalSupplyPackId;
  title: string;
  subtitle: string;
  accentColor: string;
  scienceBonus: number;
  oxygenDelta: number;
  foodDelta: number;
  radiationDeltaMsv: number;
  pantryDelta: Partial<CropPantryInventory>;
}

export const ACADEMY_LESSON_DECKS: AcademyLessonCard[] = [
  {
    id: 'power_tradeoffs',
    title: 'Kilopower Grid & Energy Budgets',
    shortTitle: 'Power Trade-Offs',
    icon: '⚡',
    accentColor: '#F59E0B',
    whenLabel: 'Every morning at 06:00 Sol Briefing & after EVA dust cleanups',
    whyImportant:
      'Moon and Mars bases have strict 5–7 kW electricity budgets. Powering shields leaves fewer watts for grow lights!',
    howItWorks:
      'Match Reactor Grid conduits and sync turbine phase (68%–96%) for +1 kW bonus power, then balance 0–3 kW across 4 critical stations.',
    realNasaSource: 'NASA Kilopower Nuclear + iROSA Roll-Out Solar Arrays',
    educatorTip:
      'Ask students: Which station gets your last 1 kW tonight if O2 is 80% but an X-class solar flare arrives tomorrow?',
    visualDiagramType: 'power',
    keyNumbers: [
      { label: 'Daily Budget', value: '5–7 kW' },
      { label: 'O2 per kW', value: '+10% / sol' },
      { label: 'Food per kW', value: '+9% / sol' },
    ],
  },
  {
    id: 'air_water',
    title: 'ECLSS Breathable Air & Plant Loops',
    shortTitle: 'O2 & Water Loop',
    icon: '🫧',
    accentColor: '#38BDF8',
    whenLabel: 'Whenever Oxygen dips under 85% or CO2 filter grime alerts trigger',
    whyImportant:
      'Astronauts consume ~16% Oxygen per Sol. Closed-loop ECLSS splits recycled water (2H2O -> 2H2 + O2) so nobody runs out of air.',
    howItWorks:
      'Electrolyzer kW builds O2 directly (+10%/kW), while powered Bio-Dome crops add +4% free bio-regenerative Oxygen!',
    realNasaSource: 'NASA ISS Environmental Control & Life Support (ECLSS)',
    educatorTip:
      'Connect machines + biology: show kids how plants and human lungs form a mirror-image gas exchange cycle!',
    visualDiagramType: 'air',
    keyNumbers: [
      { label: 'Crew Use', value: '-16% O2/sol' },
      { label: 'Electrolysis', value: '+10% / kW' },
      { label: 'Plant Bonus', value: '+4% O2' },
    ],
  },
  {
    id: 'radiation_donki',
    title: 'NASA DONKI Storms & Water Shielding',
    shortTitle: 'Solar Shielding',
    icon: '🛡️',
    accentColor: '#A855F7',
    whenLabel: 'Critical on Sol 2 (M8.8 Flare), Sol 4 (X8.7 Super Flare) & Sol 6 (CME)',
    whyImportant:
      'OSDR RadLab proves Mars (0.64 mSv/sol) and Moon (1.1 mSv/sol) get 80–140x more cosmic radiation than Earth. Crossing 60 mSv forces an abort!',
    howItWorks:
      'Water molecules (H2O) are rich in light hydrogen atoms that slow fast solar protons like bumper cars. Pump vault pressure above 75%!',
    realNasaSource: 'NASA DONKI Space Weather + OSDR RadLab Dosimetry',
    educatorTip:
      'Why water instead of lead? Rocket mass! Astronauts already drink and recycle water, so water walls do double duty.',
    visualDiagramType: 'shield',
    keyNumbers: [
      { label: 'Mars Baseline', value: '0.64 mSv/sol' },
      { label: 'Shield Max Block', value: '92% blocked' },
      { label: 'Mission Limit', value: '60 mSv max' },
    ],
  },
  {
    id: 'food_csa',
    title: 'CSA Hydroponics & Astronaut Nutrition',
    shortTitle: 'CSA Food Lab',
    icon: '🥬',
    accentColor: '#10B981',
    whenLabel: 'Harvest ripe LED crops first, then cook balanced plates in Space Food Lab',
    whyImportant:
      'OSDR OSD-342 shows zero/low gravity weakens bones and muscles. Astronauts need 1,900–3,200 kcal plus crisp Vitamin C!',
    howItWorks:
      'CSA Closed-Loop Controlled Environment Agriculture (CEA) feeds astronauts in space AND northern Arctic communities on Earth during dark winters.',
    realNasaSource: 'Canadian Space Agency Food Toolkit + NASA OSDR OSD-379',
    educatorTip:
      'Challenge students to pair high-calorie Dwarf Wheat or Spirulina protein with crisp Vitamin-C Mizuna and Strawberries!',
    visualDiagramType: 'food',
    keyNumbers: [
      { label: 'Daily Energy', value: '1,900–3,200 kcal' },
      { label: 'LED Sweet Spot', value: '65%–88%' },
      { label: 'Arctic Link', value: 'Year-round CEA' },
    ],
  },
  {
    id: 'mars_eva',
    title: 'Mars Trek Terrain & Solar Dust EVAs',
    shortTitle: 'EVA & Terrain',
    icon: '🚜',
    accentColor: '#F97316',
    whenLabel: 'Afternoon calm windows, especially Sol 3 dust squall (-1 kW solar)',
    whyImportant:
      'Sticky Martian dust cuts solar panel electricity by 1 kW, while sharp lunar regolith clings to visors via static charge.',
    howItWorks:
      'Send the pressurized EVA Rover outside to brush dust off solar wings for +1 kW recovery, then inspect exterior satellites cleanly.',
    realNasaSource: 'NASA Mars Trek Jezero Crater & Artemis Pressurized Rover',
    educatorTip:
      'Discuss risk vs. reward: EVAs regain +1 kW power, but expose suits to surface dust and slight cosmic radiation.',
    visualDiagramType: 'eva',
    keyNumbers: [
      { label: 'Dust Penalty', value: '-1 kW Solar' },
      { label: 'EVA Recovery', value: '+1 kW Boost' },
      { label: 'Site', value: 'Jezero / Artemis' },
    ],
  },
  {
    id: 'comms_sol',
    title: 'Deep Space Network & Daily Sol Routine',
    shortTitle: 'DSN & Sol Rhythm',
    icon: '📡',
    accentColor: '#EC4899',
    whenLabel: 'Evening dish uplink + Daily Log reflection before advancing Sol',
    whyImportant:
      'Radio waves travel at light speed, taking ~14 minutes one-way from Mars vs 1.3 seconds from the Moon—crews must think independently!',
    howItWorks:
      'Align DSN antenna Azimuth & Elevation, record real observations in your Daily Log HUD, and rest together in Crew Lounge to protect sleep circadian health (OSD-274).',
    realNasaSource: 'NASA Deep Space Network (DSN) & OSDR Sleep Research',
    educatorTip:
      'Have youth write one engineering trade-off sentence in their Daily Log at the end of every Sol!',
    visualDiagramType: 'comms',
    keyNumbers: [
      { label: 'Mars Sol', value: '24h 39m' },
      { label: 'Mars Signal Delay', value: '~14 min 1-way' },
      { label: 'Moon Delay', value: '1.3 sec' },
    ],
  },
];

export const ACADEMY_QUIZ_BANK: AcademyQuizQuestion[] = [
  // MULTIPLE CHOICE (Scenario & Concept)
  {
    id: 'q-mc-flare-shield',
    topicId: 'radiation_donki',
    pattern: 'multiple_choice',
    prompt:
      'NASA DONKI detects an incoming X8.7 Super Solar Flare on Sol 4! Which resource inside the Radiation Shield Vault walls slows down solar protons best?',
    hint: 'Think about light hydrogen atoms already carried for drinking and life support!',
    options: [
      'Recycled H2O water walls packed with hydrogen atoms',
      'Extra Dwarf Wheat flour bags stacked by the airlock',
      'Hollow aluminum panels filled only with nitrogen gas',
      'Turning off all cabin lights so flares cannot see the base',
    ],
    correctIndex: 0,
    explanation:
      'Spot on! Hydrogen atoms inside water act like microscopic bumper cars that absorb and scatter high-energy solar protons safely.',
    nasaCitation: 'NASA DONKI & Artemis Water-Wall Shield Concept',
    baseMarks: 20,
  },
  {
    id: 'q-mc-mars-vs-moon-rad',
    topicId: 'mars_eva',
    pattern: 'multiple_choice',
    prompt:
      'According to OSDR RadLab data, why does Artemis Base on the Moon receive MORE daily background radiation (1.1 mSv) than Jezero Crater on Mars (0.64 mSv)?',
    hint: 'Compare what wraps around Mars versus the airless Moon!',
    options: [
      'Mars is much closer to Earth’s magnetic field than the Moon',
      'The Moon has no atmosphere at all, while Mars has a thin CO2 atmosphere that absorbs some cosmic rays',
      'Moon rocks emit bright blue solar flares every afternoon',
      'Mars receives zero sunlight during daytime dust squalls',
    ],
    correctIndex: 1,
    explanation:
      'Correct! Even though Mars’s atmosphere is thin (1% of Earth’s), it still shields some cosmic radiation—whereas the Moon has practically zero atmosphere.',
    nasaCitation: 'NASA OSDR RadLab Dosimetry Portal',
    baseMarks: 20,
  },
  {
    id: 'q-mc-csa-arctic',
    topicId: 'food_csa',
    pattern: 'multiple_choice',
    prompt:
      'Why does the Canadian Space Agency (CSA) say growing food on the Moon also helps families in northern Arctic communities on Earth?',
    hint: 'Think about long dark winters, freezing ground, and fresh vitamin transport!',
    options: [
      'Both need closed-loop LED hydroponic greenhouses to grow crisp greens during long dark winters without pricey cargo flights',
      'Arctic snow turns into strawberry plants when mixed with Martian iron dust',
      'Moon gravity makes Canadian maple syrup float inside greenhouses',
      'Hydroponic trays work only when outdoor temperature stays above 40°C',
    ],
    correctIndex: 0,
    explanation:
      'Awesome connection! Sealed Controlled Environment Agriculture (CEA) grows fresh Vitamin-C greens year-round in both deep space and remote northern Earth towns.',
    nasaCitation: 'CSA Moon-to-Arctic Food Production Toolkit',
    baseMarks: 20,
  },
  {
    id: 'q-mc-comms-delay',
    topicId: 'comms_sol',
    pattern: 'multiple_choice',
    prompt:
      'An air pressure alarm rings on Mars! Why can’t Earth Mission Control hit a remote button to fix it in real time like on the Moon?',
    hint: 'Even radio signals moving at the speed of light take time across millions of kilometers!',
    options: [
      'Mars radio dishes only work on Tuesdays and Sol 7',
      'One-way radio signals take ~14 minutes to reach Earth (28 minutes round-trip!), so crews must solve emergencies autonomously',
      'Sound waves freeze solid in Martian dust storms',
      'Earth satellites turn off overnight when astronauts sleep',
    ],
    correctIndex: 1,
    explanation:
      'Right! With up to a ~28-minute round-trip signal delay between Mars and Earth, Junior Astronauts train to diagnose problems locally!',
    nasaCitation: 'NASA Deep Space Network & Mars Ops Latency',
    baseMarks: 20,
  },
  {
    id: 'q-mc-bio-o2',
    topicId: 'air_water',
    pattern: 'multiple_choice',
    prompt:
      'In AstroBase’s bio-regenerative loop, powering Hydroponic Bio-Dome with at least 1 kW helps the O2 Electrolyzer Bay by adding what bonus?',
    hint: 'Remember what green plants release during photosynthesis!',
    options: [
      '+4% fresh Oxygen per Sol while simultaneously growing food',
      '+12 mSv of radiation protection per crop leaf',
      'Double rocket thrust for Mars orbital launch',
      'Zero crew food consumption for all 7 Sols',
    ],
    correctIndex: 0,
    explanation:
      'Yes! Live plants breathe in crew CO2 and release +4% bonus Oxygen alongside fresh food rations.',
    nasaCitation: 'NASA OSDR OSD-379 & ISS Veggie Loop',
    baseMarks: 20,
  },

  // MYTH BUSTER (True / False Rapid Science Cards)
  {
    id: 'q-mb-dust-solar',
    topicId: 'mars_eva',
    pattern: 'myth_buster',
    prompt: 'Evaluate this NASA Space Fact or Space Myth card!',
    statement:
      'Electrostatic Martian dust on solar arrays actually REDUCES outpost electricity (-1 kW) until cleaned by an EVA rover or crew brush.',
    isFactTrue: true,
    hint: 'Think about what happens on Sol 3 in AstroBase when a dust squall hits Wing B!',
    explanation:
      'TRUE — SPACE FACT! Sticky dust coats solar cells and blocks sunlight; NASA InSight and Perseverance monitor dust accumulation daily.',
    nasaCitation: 'NASA Mars MEDA Dust Telemetry',
    baseMarks: 15,
  },
  {
    id: 'q-mb-lead-suit',
    topicId: 'radiation_donki',
    pattern: 'myth_buster',
    prompt: 'Evaluate this NASA Space Fact or Space Myth card!',
    statement:
      'Astronauts wear 200-kilogram solid lead coats inside Mars habitats because water cannot block solar flare protons.',
    isFactTrue: false,
    hint: 'Heavy lead actually creates secondary radiation particles AND is way too heavy to launch!',
    explanation:
      'FALSE — SPACE MYTH! Heavy lead creates dangerous secondary scatter rays and costs huge rocket fuel. Hydrogen-rich water & polyethylene shield far better!',
    nasaCitation: 'NASA OSDR RadLab Shielding Physics',
    baseMarks: 15,
  },
  {
    id: 'q-mb-calories',
    topicId: 'food_csa',
    pattern: 'myth_buster',
    prompt: 'Evaluate this NASA Space Fact or Space Myth card!',
    statement:
      'Floating in microgravity is easy, so astronauts only need 800 calories per day instead of 1,900–3,200 kcal.',
    isFactTrue: false,
    hint: 'Muscles and bones actually work HARDER to fight bone loss, exercise, and perform EVAs!',
    explanation:
      'FALSE — SPACE MYTH! CSA & NASA nutritionists pack 1,900–3,200 kcal/day with bone-protecting minerals, protein, and Vitamin C.',
    nasaCitation: 'CSA Astronaut Daily Nutrition Standard',
    baseMarks: 15,
  },
  {
    id: 'q-mb-sleep-circadian',
    topicId: 'comms_sol',
    pattern: 'myth_buster',
    prompt: 'Evaluate this NASA Space Fact or Space Myth card!',
    statement:
      'Because the Sun rises 16 times a day on the ISS—or shifts 39 minutes later each Sol on Mars—astronauts use lighting schedules & rest pods to protect sleep and immunity.',
    isFactTrue: true,
    hint: 'Think about why Crew Mess & Rest Lounge has Pod Alpha and Pod Beta!',
    explanation:
      'TRUE — SPACE FACT! NASA OSDR circadian studies show proper sleep restores alertness, immunity, and mood on long missions.',
    nasaCitation: 'NASA OSDR Circadian & Immune Study (OSD-274)',
    baseMarks: 15,
  },

  // INTERACTIVE BALANCE / ENGINEERING PUZZLE (Slider Allocation)
  {
    id: 'q-bal-flare-night',
    topicId: 'power_tradeoffs',
    pattern: 'balance_slider',
    prompt:
      'ENGINEERING PUZZLE: A Sol 2 M8.8 Solar Flare (14 mSv unshielded) hits tonight! Allocate Shield kW and Bio-Dome kW from a shared 4 kW reserve so BOTH crew radiation stays SAFE (<= 5.0 mSv received) AND plants still add +4% bonus O2 (>= 1 kW Bio-Dome)!',
    hint: 'Shields block 28% per kW (plus +8% overload at 3 kW). Remember Bio-Dome needs at least 1 kW for plant O2!',
    totalBudget: 4,
    budgetUnit: 'kW',
    sliderALabel: 'Shield Vault Power (kW)',
    sliderAMin: 0,
    sliderAMax: 3,
    sliderBLabel: 'Bio-Dome LED Power (kW)',
    sliderBMin: 0,
    sliderBMax: 3,
    initialA: 1,
    initialB: 3,
    ruleDescription: 'Goal: Keep A + B <= 4 kW, Crew Dose <= 5.0 mSv, and Bio-Dome >= 1 kW!',
    evaluate: (shieldKw: number, hydroKw: number) => {
      const used = shieldKw + hydroKw;
      const blockedPct = Math.min(92, shieldKw * 28 + (shieldKw >= 3 ? 8 : 0));
      const doseReceived = Number((0.64 + 14 * (1 - blockedPct / 100)).toFixed(1));
      const plantBonusO2 = hydroKw >= 1 ? 4 : 0;
      const withinBudget = used <= 4;
      const passed = withinBudget && doseReceived <= 5.0 && plantBonusO2 >= 4;
      return {
        passed,
        liveMetricLabel: `Used ${used}/4 kW · Crew Dose +${doseReceived} mSv · Plant O2 +${plantBonusO2}%`,
        feedback: !withinBudget
          ? `Over 4 kW budget (${used}/4 kW)! Trim one slider down.`
          : doseReceived > 5.0
          ? `Radiation too high (+${doseReceived} mSv)! Boost Shield Vault to 3 kW.`
          : plantBonusO2 < 4
          ? 'Give at least 1 kW to Bio-Dome so plants make +4% bonus Oxygen!'
          : `Perfect engineering balance! ${blockedPct}% flare blocked (+${doseReceived} mSv) AND +4% Bio-Dome O2!`,
      };
    },
    explanation:
      'Setting Shield Vault to 3 kW (92% blocked -> only 1.8 mSv!) and Bio-Dome to 1 kW uses all 4 kW cleanly while saving both DNA and Oxygen!',
    nasaCitation: 'AstroBase Power & DONKI Trade-Off Simulator',
    baseMarks: 25,
  },
  {
    id: 'q-bal-space-menu',
    topicId: 'food_csa',
    pattern: 'balance_slider',
    prompt:
      'CSA NUTRITION PUZZLE: Pack an astronaut’s lunch trays using Dwarf Wheat (360 kcal, 12g protein each) and Mizuna Greens (120 kcal, 32% Vit-C each) so total calories fall between 1,900–2,700 kcal AND Vitamin C hits 96%+!',
    hint: 'You need at least 3 Mizuna servings (3 x 32% = 96% Vit-C), then dial Dwarf Wheat into the sweet spot!',
    totalBudget: 10,
    budgetUnit: 'servings',
    sliderALabel: 'Dwarf Wheat Loaves (360 kcal)',
    sliderAMin: 1,
    sliderAMax: 7,
    sliderBLabel: 'Mizuna Greens Trays (120 kcal · +32% Vit-C)',
    sliderBMin: 0,
    sliderBMax: 6,
    initialA: 2,
    initialB: 1,
    ruleDescription: 'Goal: 1,900–2,700 kcal total AND >= 96% Vitamin C (Max 10 servings)!',
    evaluate: (wheatQty: number, mizunaQty: number) => {
      const kcal = wheatQty * 360 + mizunaQty * 120;
      const vitC = Math.min(100, mizunaQty * 32);
      const totalServings = wheatQty + mizunaQty;
      const passed =
        totalServings <= 10 && kcal >= 1900 && kcal <= 2700 && vitC >= 96;
      return {
        passed,
        liveMetricLabel: `${kcal} kcal · ${vitC}% Vitamin C · ${totalServings}/10 trays`,
        feedback:
          totalServings > 10
            ? 'Over 10 storage trays! Trim a serving.'
            : vitC < 96
            ? `Need more fresh Vitamin C (${vitC}% / 96% min)! Add Mizuna Greens.`
            : kcal < 1900
            ? `Energy too low (${kcal} kcal)! Add Dwarf Wheat until >= 1,900 kcal.`
            : kcal > 2700
            ? `Too heavy (${kcal} kcal > 2,700)! Reduce Wheat by 1 serving.`
            : `Balanced CSA Space Plate: ${kcal} kcal & ${vitC}% Vitamin C for strong crew immunity!`,
      };
    },
    explanation:
      'Pairing 4–5 Dwarf Wheat servings with 3–4 crisp Mizuna Greens hits NASA/CSA’s energy zone without scurvy or bone vitamin gaps!',
    nasaCitation: 'CSA Food Production Nutrition Lab',
    baseMarks: 25,
  },

  // SEQUENCE / ORDER BUILDER
  {
    id: 'q-seq-flare-protocol',
    topicId: 'radiation_donki',
    pattern: 'sequence_order',
    prompt:
      'EMERGENCY PROTOCOL ORDER: Click the 3 steps in the exact order Junior Astronauts handle a Sol 4 Solar Flare!',
    hint: 'First check the forecast, then power & pump shields BEFORE the storm peaks!',
    shuffledItems: [
      'Pump H2O Walls & lock all 3 Radiation Shield Vault valves',
      'Inspect NASA DONKI 3-Sol Forecast at 06:00 Briefing',
      'Shift Power Grid switches to give Shield Vault 3 kW',
    ],
    correctOrder: [
      'Inspect NASA DONKI 3-Sol Forecast at 06:00 Briefing',
      'Shift Power Grid switches to give Shield Vault 3 kW',
      'Pump H2O Walls & lock all 3 Radiation Shield Vault valves',
    ],
    explanation:
      'Spot-on protocol! Checking DONKI early warns you to allocate 3 kW first, so the Vault pumps reach peak proton-blocking pressure!',
    nasaCitation: 'AstroBase Sol-by-Sol Standard Operating Procedure',
    baseMarks: 25,
  },
  {
    id: 'q-seq-food-loop',
    topicId: 'food_csa',
    pattern: 'sequence_order',
    prompt:
      'CLOSED-LOOP FOOD ORDER: Arrange the 3 Bio-Dome -> Food Lab steps from seed to healthy astronauts!',
    hint: 'Start with growing inside the Bio-Dome, then cook, then fuel the crew!',
    shuffledItems: [
      'Serve warm plated food to boost crew Health Meter & Energy',
      'Plant seeds & tune Red/Blue LEDs (65%–88%) in Bio-Dome',
      'Combine harvested greens + ECLSS water in Space Food Lab',
    ],
    correctOrder: [
      'Plant seeds & tune Red/Blue LEDs (65%–88%) in Bio-Dome',
      'Combine harvested greens + ECLSS water in Space Food Lab',
      'Serve warm plated food to boost crew Health Meter & Energy',
    ],
    explanation:
      'Exact closed-loop cycle! LED Bio-Dome crops + recycled ECLSS water become nutritious hot meals that restore Food % and mood!',
    nasaCitation: 'CSA Closed-Loop Space Food System',
    baseMarks: 25,
  },
];

export const SURVIVAL_SUPPLY_PACKS: SurvivalSupplyPack[] = [
  {
    id: 'air_greens',
    title: 'ECLSS Air & Bio-Greens Kit',
    subtitle: '+10% Oxygen · +8% Food · +1 Mizuna · +1 H2O Drop',
    accentColor: '#38BDF8',
    scienceBonus: 30,
    oxygenDelta: 10,
    foodDelta: 8,
    radiationDeltaMsv: 0,
    pantryDelta: { mizuna: 1, h2oDrops: 1 },
  },
  {
    id: 'shield_boost',
    title: 'RadLab Shield Scrub & Rest Kit',
    subtitle: '-4.0 mSv Radiation Dose · +6% Oxygen · +2 H2O Drops',
    accentColor: '#A855F7',
    scienceBonus: 30,
    oxygenDelta: 6,
    foodDelta: 0,
    radiationDeltaMsv: -4,
    pantryDelta: { h2oDrops: 2 },
  },
  {
    id: 'galley_crate',
    title: 'CSA Galley Pantry Crate',
    subtitle: '+12% Food · +1 Wheat · +1 Berries · +1 Spirulina',
    accentColor: '#10B981',
    scienceBonus: 30,
    oxygenDelta: 2,
    foodDelta: 12,
    radiationDeltaMsv: 0,
    pantryDelta: { wheat: 1, berries: 1, spirulina: 1 },
  },
];

/**
 * Pure helper selecting a varied multi-pattern round of questions so players
 * experience multiple quiz game patterns (Multiple Choice, Myth Buster, Balance Lab, Sequence)
 * rather than repeating the same format back-to-back.
 */
export function buildAcademyQuizRound(params: {
  filterPattern?: QuizPatternType | 'mixed';
  topicId?: AcademyTopicId | 'all';
  roundSeed?: number;
  count?: number;
}): AcademyQuizQuestion[] {
  const {
    filterPattern = 'mixed',
    topicId = 'all',
    roundSeed = 0,
    count = 3,
  } = params;

  const topicFiltered =
    topicId === 'all'
      ? ACADEMY_QUIZ_BANK
      : ACADEMY_QUIZ_BANK.filter((q) => q.topicId === topicId);

  const pool =
    filterPattern === 'mixed'
      ? topicFiltered.length > 0
        ? topicFiltered
        : ACADEMY_QUIZ_BANK
      : (topicFiltered.filter((q) => q.pattern === filterPattern).length > 0
          ? topicFiltered.filter((q) => q.pattern === filterPattern)
          : ACADEMY_QUIZ_BANK.filter((q) => q.pattern === filterPattern));

  if (pool.length === 0) return [];

  if (filterPattern === 'mixed' && pool.length >= count) {
    // Rotate through distinct patterns so every mixed round showcases variety
    const patternOrder: QuizPatternType[] = [
      'multiple_choice',
      'myth_buster',
      'balance_slider',
      'sequence_order',
    ];
    const picked: AcademyQuizQuestion[] = [];
    const usedIds = new Set<string>();

    for (let step = 0; step < patternOrder.length && picked.length < count; step++) {
      const pType = patternOrder[(roundSeed + step) % patternOrder.length];
      const candidates = pool.filter((q) => q.pattern === pType && !usedIds.has(q.id));
      if (candidates.length > 0) {
        const chosen = candidates[roundSeed % candidates.length];
        picked.push(chosen);
        usedIds.add(chosen.id);
      }
    }

    let fallbackIdx = roundSeed % pool.length;
    while (picked.length < count && picked.length < pool.length) {
      const cand = pool[fallbackIdx % pool.length];
      if (!usedIds.has(cand.id)) {
        picked.push(cand);
        usedIds.add(cand.id);
      }
      fallbackIdx++;
    }
    return picked;
  }

  const out: AcademyQuizQuestion[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    out.push(pool[(roundSeed + i) % pool.length]);
  }
  return out;
}

export function evaluateAcademyQuizScore(params: {
  baseMarks: number;
  isCorrect: boolean;
  currentStreak: number;
}): {
  earnedMarks: number;
  nextStreak: number;
} {
  if (!params.isCorrect) {
    return { earnedMarks: 5, nextStreak: 0 }; // Effort mark + reset streak gracefully
  }
  const nextStreak = params.currentStreak + 1;
  const streakBonus = Math.min(15, (nextStreak - 1) * 5);
  return {
    earnedMarks: params.baseMarks + streakBonus,
    nextStreak,
  };
}

export function computeAcademyClaimRewards(params: {
  packId: SurvivalSupplyPackId;
  earnedMarks: number;
  correctCount: number;
  isRepeatRound: boolean;
}): {
  science: number;
  oxygen: number;
  food: number;
  radiationMsv: number;
  pantryDelta: Partial<CropPantryInventory>;
} {
  const pack =
    SURVIVAL_SUPPLY_PACKS.find((p) => p.id === params.packId) || SURVIVAL_SUPPLY_PACKS[0];
  const scale = params.isRepeatRound ? 0.5 : 1;
  const accuracyFactor = params.correctCount >= 2 ? 1 : 0.75;

  const oxygen = Math.round(pack.oxygenDelta * scale * accuracyFactor);
  const food = Math.round(pack.foodDelta * scale * accuracyFactor);
  const radiationMsv = Number((pack.radiationDeltaMsv * scale).toFixed(1));
  const science = Math.max(
    15,
    Math.round(params.earnedMarks + pack.scienceBonus * scale)
  );

  const pantryDelta: Partial<CropPantryInventory> = {};
  if (!params.isRepeatRound) {
    Object.assign(pantryDelta, pack.pantryDelta);
  } else if (pack.pantryDelta.h2oDrops) {
    pantryDelta.h2oDrops = 1;
  }

  return {
    science,
    oxygen,
    food,
    radiationMsv,
    pantryDelta,
  };
}
