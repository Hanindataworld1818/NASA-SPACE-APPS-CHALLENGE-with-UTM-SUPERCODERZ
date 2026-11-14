import { CrewRoleId } from './crewAndCamera';
import { GameStateSnapshot, RoomId, getDonkiEventForSol } from './rules';

export type WallEActivity =
  | 'roll'
  | 'remind_knowledge'
  | 'share_love'
  | 'tidy_env'
  | 'water_plants'
  | 'polish_solar'
  | 'wave_cadet'
  | 'dance'
  | 'scan';

export interface StationScanReport {
  roomId: RoomId | 'corridor';
  roomName: string;
  statusBadge: 'OPTIMAL' | 'CAUTION' | 'ALERT';
  liveMetricSummary: string;
  engineeringTip: string;
  wallESpeechQuip: string;
}

export interface WallEKnowledgeReminder {
  id: string;
  topic: string;
  robotSpeech: string;
  knowledgeTip: string;
  encouragement: string;
  suggestedRoom: RoomId;
  conditionPriority?: (gs: GameStateSnapshot) => number;
}

export interface WallEEnvironmentChore {
  id: string;
  activity: 'tidy_env' | 'water_plants' | 'polish_solar';
  label: string;
  x: number;
  y: number;
  facing: number;
  bubble: string;
}

export interface WallEAstronautExchange {
  wallEBubble: string;
  astronautReply: string;
  astronautReaction: 'wave' | 'high_five' | 'cheer' | 'stargaze';
}

export const WALL_E_ENVIRONMENT_CHORES: readonly WallEEnvironmentChore[] = [
  {
    id: 'chore-solar-wing',
    activity: 'polish_solar',
    label: 'Exterior Solar Wing',
    x: 278,
    y: 102,
    facing: 1,
    bubble: '☀️ Polishing solar panels! Whirrr!',
  },
  {
    id: 'chore-biodome-sprouts',
    activity: 'water_plants',
    label: 'Bio-Dome Sprouts',
    x: 1310,
    y: 332,
    facing: -1,
    bubble: '🌱 Watering green sprouts gently!',
  },
  {
    id: 'chore-foodlab-herbs',
    activity: 'water_plants',
    label: 'Food Lab Herb Tray',
    x: 1842,
    y: 330,
    facing: 1,
    bubble: '🍓 Keeping berries fresh & cozy!',
  },
  {
    id: 'chore-airlock-bolts',
    activity: 'tidy_env',
    label: 'Rover & Airlock Gear',
    x: 790,
    y: 912,
    facing: -1,
    bubble: '📦 Stacking space bolts neatly!',
  },
  {
    id: 'chore-academy-books',
    activity: 'tidy_env',
    label: 'Academy Study Slates',
    x: 270,
    y: 1188,
    facing: 1,
    bubble: '🎓 Organizing STEM slates! Beep!',
  },
  {
    id: 'chore-spine-patrol',
    activity: 'tidy_env',
    label: 'Central Command Spine',
    x: 1020,
    y: 545,
    facing: -1,
    bubble: '✨ Sweeping Mars dust clean!',
  },
];

export const WALL_E_KNOWLEDGE_REMINDERS: readonly WallEKnowledgeReminder[] = [
  {
    id: 'rem-donki-shield',
    topic: 'NASA DONKI & Water Radiation Shield',
    robotSpeech: 'Waall-E! Reminder: Check solar flares before shifting power!',
    knowledgeTip:
      'Water walls are rich in hydrogen atoms that absorb incoming solar proton particles recorded by NASA DONKI & ISS RadLab!',
    encouragement: 'You protect the whole crew like a true hero, Cadet! 💛',
    suggestedRoom: 'shield',
    conditionPriority: (gs) => {
      const donki = getDonkiEventForSol(gs.sol);
      return donki.unshieldedDoseMsv >= 10 || gs.powerAllocation.shield === 0 ? 100 : 20;
    },
  },
  {
    id: 'rem-eclss-oxygen',
    topic: 'NASA ECLSS Oxygen Electrolysis',
    robotSpeech: 'Beep-boop! Remember: split water for clean cabin oxygen!',
    knowledgeTip:
      'On the ISS and Mars bases, ECLSS splits H2O into breathable O2 while Sabatier scrubbers remove exhaled CO2!',
    encouragement: 'Every breath the crew takes is thanks to your care! Take a deep calm breath! 🫧',
    suggestedRoom: 'lifesupport',
    conditionPriority: (gs) => (gs.oxygen < 75 ? 95 : 18),
  },
  {
    id: 'rem-csa-nutrition',
    topic: 'CSA Bio-Dome & Space Food Lab',
    robotSpeech: 'Oooh! Remember: fresh greens + proteins keep crew strong!',
    knowledgeTip:
      'Canadian Space Agency nutrition guides aim for 1,900–3,200 kcal plus crisp Vitamin C microgreens to keep bones & spirits bright!',
    encouragement: 'WALL-E loves watching you cook and care for your friends! 🍓💛',
    suggestedRoom: 'foodlab',
    conditionPriority: (gs) => (gs.food < 75 ? 90 : 22),
  },
  {
    id: 'rem-kilopower-budget',
    topic: 'Kilopower & Solar Dust Trade-Offs',
    robotSpeech: 'Whirrr! Remember: share your 6 kW power wisely each Sol!',
    knowledgeTip:
      'Dust on solar arrays cuts Mars electricity—wiping panels during EVA restores +1 kW so both Shields and Plants thrive!',
    encouragement: 'Smart engineering decisions start with curious minds like yours! ⚡',
    suggestedRoom: 'power',
    conditionPriority: (gs) => (gs.availablePowerKw <= 5 ? 88 : 15),
  },
  {
    id: 'rem-academy-quiz',
    topic: 'Junior Astronaut Academy & Daily Log',
    robotSpeech: 'Ta-daa! Remember to visit Academy Station & write your Daily Log!',
    knowledgeTip:
      'Practicing Mission Trainer quizzes unlocks Science Marks and emergency Oxygen, Food, and Shielding supply drops!',
    encouragement: 'Learning something new every Sol makes you unstoppable—WALL-E believes in you! 🎓',
    suggestedRoom: 'academy',
    conditionPriority: (gs) => (!gs.completedTasksToday.includes('academy') ? 65 : 12),
  },
  {
    id: 'rem-dsn-comms',
    topic: 'Deep Space Network & Crew Morale',
    robotSpeech: 'Beep! Sending love across space to Earth takes teamwork!',
    knowledgeTip:
      'Signals from Mars take 4–24 minutes to reach Earth via NASA Deep Space Network dishes—and music & laughter keep crew morale high!',
    encouragement: 'Even millions of miles from Earth, kindness makes any outpost feel like home! 🌍💛',
    suggestedRoom: 'comms',
    conditionPriority: () => 16,
  },
];

export const WALL_E_LOVE_MESSAGES: readonly string[] = [
  'Beep-boop! WALL-E sends you a big robot hug today! ♥',
  'You are doing an awesome job keeping everyone safe & happy! 🤖💛',
  'Take a smile break—WALL-E is so proud of your curiosity! ✨',
  'Care for plants, care for friends, care for you! Beep! 🌱♥',
  'Whether Moon or Mars, you shine brighter than every star! ⭐',
  'Remember: mistakes help astronauts learn stronger! Keep going! 💪💛',
];

const ASTRONAUT_EXCHANGES: Record<CrewRoleId, readonly WallEAstronautExchange[]> = {
  han: [
    {
      wallEBubble: 'Waall-E! Reminder: Keep 2kW shields during storms, Han! ♥',
      astronautReply: 'Thank you, WALL-E! Best co-explorer on Mars!',
      astronautReaction: 'wave',
    },
    {
      wallEBubble: 'Beep! You lead with so much heart, Commander! 🤖♥',
      astronautReply: 'Thanks little buddy! Let’s scout a new crater together!',
      astronautReaction: 'cheer',
    },
    {
      wallEBubble: 'Whirrr! Clean solar wings give more exploration power! ⚡',
      astronautReply: 'Thank you for reminding me, WALL-E! High-five!',
      astronautReaction: 'high_five',
    },
  ],
  feng: [
    {
      wallEBubble: 'Beep-boop! Check rover tire grip & have sporty fun, Feng! ♥',
      astronautReply: 'Thank you, WALL-E! Love your tank treads, robot bro!',
      astronautReaction: 'high_five',
    },
    {
      wallEBubble: 'Waaall-E! Remember water walls shield us while racing! 🛡️',
      astronautReply: 'Thanks WALL-E! Always looking out for my safety!',
      astronautReaction: 'wave',
    },
    {
      wallEBubble: 'Ooh! Dance break later, speedy friend? ♪ 🤖💛',
      astronautReply: 'Thank you WALL-E—count me in for Moon-hop dancing!',
      astronautReaction: 'cheer',
    },
  ],
  kun: [
    {
      wallEBubble: 'Beep ♥ Reminder: Fresh greens + water boost crew nutrition, Kun!',
      astronautReply: 'Thank you, WALL-E! Added fresh berries to tonight’s plan!',
      astronautReaction: 'wave',
    },
    {
      wallEBubble: 'Waall-E! Brought a cozy smile from Earth for you & Xin! 🌍♥',
      astronautReply: 'Thank you so much, sweet WALL-E! That warms my heart!',
      astronautReaction: 'stargaze',
    },
    {
      wallEBubble: 'Whirrr! Crew schedules look awesome—keep planning with love! 📋',
      astronautReply: 'Aww thank you, WALL-E! Saving a seat for you at Crew Cafe!',
      astronautReaction: 'cheer',
    },
  ],
  xin: [
    {
      wallEBubble: 'Beep-boop! Remember: red+blue LEDs help sprouts grow fast, Xin! 🌱',
      astronautReply: 'Thank you, WALL-E! Statement verified & crystal clear! ♥',
      astronautReaction: 'wave',
    },
    {
      wallEBubble: 'Waaall-E ♥ Sending gentle Earth sunshine to you & sister Kun! 🌍',
      astronautReply: 'Thank you kindly, little WALL-E! Earth feels closer with you here!',
      astronautReaction: 'stargaze',
    },
    {
      wallEBubble: 'Beep! Your kind logic helps everyone understand clearly! ♥',
      astronautReply: 'Thank you, dear WALL-E! Always happy to help our team!',
      astronautReaction: 'cheer',
    },
  ],
};

export function pickWallEKnowledgeReminder(
  gs: GameStateSnapshot,
  lastId?: string | null
): WallEKnowledgeReminder {
  const scored = WALL_E_KNOWLEDGE_REMINDERS.map((r) => ({
    reminder: r,
    score: (r.conditionPriority ? r.conditionPriority(gs) : 15) + (r.id === lastId ? -50 : 0),
  })).sort((a, b) => b.score - a.score);
  return scored[0]?.reminder || WALL_E_KNOWLEDGE_REMINDERS[0];
}

export function pickWallECadetLove(idx?: number): string {
  const i =
    idx !== undefined
      ? Math.abs(idx) % WALL_E_LOVE_MESSAGES.length
      : Math.floor(Math.random() * WALL_E_LOVE_MESSAGES.length);
  return WALL_E_LOVE_MESSAGES[i];
}

export function pickWallEAstronautExchange(
  roleId: CrewRoleId,
  seed?: number
): WallEAstronautExchange {
  const pool = ASTRONAUT_EXCHANGES[roleId];
  const idx =
    seed !== undefined
      ? Math.abs(seed) % pool.length
      : Math.floor(Math.random() * pool.length);
  return pool[idx];
}

export function scanOutpostStation(
  roomId: RoomId | null,
  gs: GameStateSnapshot
): StationScanReport {
  const target: RoomId | 'corridor' = roomId || 'corridor';
  const donki = getDonkiEventForSol(gs.sol);
  const alloc = gs.powerAllocation;
  const allocatedTotal = alloc.lifesupport + alloc.shield + alloc.hydroponics + alloc.comms;
  const unspentKw = Math.max(0, gs.availablePowerKw - allocatedTotal);
  const radPct = Math.round((gs.radiationMsv / gs.maxSafeRadiationMsv) * 100);
  const healthPct = Math.max(0, Math.min(100, Math.round((gs.oxygen * 0.4 + gs.food * 0.35 + (100 - radPct) * 0.25))));

  switch (target) {
    case 'power': {
      const statusBadge =
        gs.availablePowerKw <= 4 ? 'ALERT' : unspentKw > 0 ? 'CAUTION' : 'OPTIMAL';
      return {
        roomId: 'power',
        roomName: 'Reactor & Solar Grid',
        statusBadge,
        liveMetricSummary: `Grid Supply: ${gs.availablePowerKw} kW · Allocated: ${allocatedTotal}/${gs.availablePowerKw} kW (${unspentKw} kW spare)`,
        engineeringTip:
          'Engineering Tip: Always assign 100% of your kW breakers before sleeping! Split electricity between Life Support O2, Water Shields during solar storms, and Bio-Dome LEDs.',
        wallESpeechQuip:
          unspentKw > 0
            ? `Beep-boop! Grid has ${unspentKw} spare kW—plug it into a bay before sunset!`
            : statusBadge === 'ALERT'
            ? `Whirrr! Dust lowered power to ${gs.availablePowerKw}kW—let’s wipe EVA panels!`
            : `Zzzzt! All ${allocatedTotal}kW humming smoothly across the outpost! ♥`,
      };
    }

    case 'lifesupport': {
      const o2 = Math.round(gs.oxygen);
      const kw = alloc.lifesupport;
      const statusBadge = o2 <= 35 || kw === 0 ? 'ALERT' : o2 <= 62 || kw === 1 ? 'CAUTION' : 'OPTIMAL';
      return {
        roomId: 'lifesupport',
        roomName: 'O2 Electrolyzer Bay',
        statusBadge,
        liveMetricSummary: `Cabin O2: ${o2}% · Electrolyzer Power: ${kw} kW · Scrubber Done: ${gs.completedTasksToday.includes('lifesupport') ? 'Yes ✓' : 'Pending'}`,
        engineeringTip:
          'Engineering Tip: Each 1 kW in the O2 Electrolyzer splits water into +10% breathable Oxygen every Sol, while cleaning CO2 scrubbers adds +8% instant air!',
        wallESpeechQuip:
          statusBadge === 'ALERT'
            ? `Beep-alert! Oxygen is ${o2}% with ${kw}kW! Let’s boost Life Support right now!`
            : statusBadge === 'CAUTION'
            ? `Breathe easy! O2 is ${o2}%—cleaning scrubbers makes cabin air extra minty! 🫧`
            : `Fresh ${o2}% Oxygen & ${kw}kW power—my optics smell springtime in here! ♥`,
      };
    }

    case 'hydroponics': {
      const food = Math.round(gs.food);
      const kw = alloc.hydroponics;
      const statusBadge = kw === 0 || food <= 35 ? 'ALERT' : food <= 62 ? 'CAUTION' : 'OPTIMAL';
      return {
        roomId: 'hydroponics',
        roomName: 'Hydroponic Bio-Dome',
        statusBadge,
        liveMetricSummary: `Bio-Dome Food Reserves: ${food}% · Grow Lamps: ${kw} kW · Harvested Crops: ${gs.cropsHarvestedTotal} units`,
        engineeringTip:
          'Engineering Tip: Tuning LEDs to Red (660nm) + Blue (450nm) grows crispy Mizuna greens faster AND releases +4% bonus Oxygen alongside cabin scrubbers!',
        wallESpeechQuip:
          kw === 0
            ? `Oh no! Bio-Dome LEDs have 0kW—give our little green sprouts some light! 🌱`
            : `Ooh! ${gs.cropsHarvestedTotal} crops grown & ${kw}kW LED glow—happy green leaves! ♥`,
      };
    }

    case 'foodlab': {
      const food = Math.round(gs.food);
      const pantryUnits =
        gs.pantry.mizuna +
        gs.pantry.wheat +
        gs.pantry.radish +
        gs.pantry.berries +
        gs.pantry.microgreens +
        gs.pantry.spirulina;
      const statusBadge = food <= 35 || pantryUnits <= 2 ? 'ALERT' : food <= 60 ? 'CAUTION' : 'OPTIMAL';
      return {
        roomId: 'foodlab',
        roomName: 'Space Food Lab & Kitchen',
        statusBadge,
        liveMetricSummary: `Crew Food Meter: ${food}% · Pantry Crops: ${pantryUnits} · Meals Cooked: ${gs.mealsCookedTotal}`,
        engineeringTip:
          'Engineering Tip: Cooking fresh bio-dome crops with recycled H2O drops boosts crew Food %, Oxygen %, and bone-saving Vitamin C stamina (1,900–3,200 kcal target)!',
        wallESpeechQuip:
          statusBadge === 'ALERT'
            ? `Tummy rumble! Food is ${food}%—let’s forage sprouts & cook a yummy wrap! 🌮`
            : `Mmm! ${gs.mealsCookedTotal} space meals cooked & ${pantryUnits} fresh ingredients! ♥`,
      };
    }

    case 'shield': {
      const rad = Number(gs.radiationMsv.toFixed(1));
      const kw = alloc.shield;
      const stormComing = donki.unshieldedDoseMsv >= 10;
      const statusBadge =
        rad >= 40 || (stormComing && kw === 0)
          ? 'ALERT'
          : stormComing && kw < 2
          ? 'CAUTION'
          : 'OPTIMAL';
      return {
        roomId: 'shield',
        roomName: 'Radiation Shield Vault',
        statusBadge,
        liveMetricSummary: `Crew Rad Dose: ${rad}/${gs.maxSafeRadiationMsv} mSv · Shield Power: ${kw} kW · DONKI Sol ${gs.sol}: ${donki.classType}`,
        engineeringTip:
          'Engineering Tip: Hydrogen-rich Water Walls block 28% solar proton radiation per kW! Always check the 3-Sol NASA DONKI Forecast before X-Class or CME storms hit.',
        wallESpeechQuip:
          statusBadge === 'ALERT'
            ? `Whoa! ${donki.classType} flare alert! Pump water shields to 2kW to keep crew safe! 🛡️`
            : `Water armor strong at ${kw}kW (${rad}mSv total)—crew DNA safe & cozy! ♥`,
      };
    }

    case 'eva': {
      const healthStatus = healthPct;
      const statusBadge = healthStatus < 55 || gs.oxygen < 45 ? 'ALERT' : gs.availablePowerKw < 6 ? 'CAUTION' : 'OPTIMAL';
      return {
        roomId: 'eva',
        roomName: 'Rover & EVA Airlock',
        statusBadge,
        liveMetricSummary: `Crew Health: ${healthStatus}% · EVA Bonus Power: +${gs.bonusPowerKw} kW · Solar Supply: ${gs.availablePowerKw} kW`,
        engineeringTip:
          'Engineering Tip: Driving the EVA Rover brush across dusty exterior solar wings restores +1 kW bonus grid electricity and keeps EVA airlock seals clean!',
        wallESpeechQuip:
          gs.availablePowerKw < 6
            ? `Rover dust scan complete! Clean the solar wings for +1 kW bonus juice! 🚙⚡`
            : `Airlock seals tight & Crew Health ${healthStatus}%—ready for crater exploration! ♥`,
      };
    }

    case 'comms': {
      const kw = alloc.comms;
      const statusBadge = kw === 0 ? 'CAUTION' : 'OPTIMAL';
      return {
        roomId: 'comms',
        roomName: 'Comms & Sound Deck',
        statusBadge,
        liveMetricSummary: `DSN Dish Power: ${kw} kW · Science Score: ${gs.scienceScore} pts · Site: ${gs.siteId.toUpperCase()}`,
        engineeringTip:
          'Engineering Tip: Powering Comms sends ISS & Mars telemetry home to Earth via NASA’s Deep Space Network (+15 Science/kW) while playing uplifting music for crew morale!',
        wallESpeechQuip:
          kw === 0
            ? `Beep? Comms dish at 0kW—give 1kW so we can beam science songs to Earth! 📡`
            : `Signal crystal clear! ${gs.scienceScore} Science points beamed home! ♪ ♥`,
      };
    }

    case 'academy': {
      const done = gs.completedTasksToday.includes('academy');
      const statusBadge = done ? 'OPTIMAL' : 'CAUTION';
      return {
        roomId: 'academy',
        roomName: 'Academy Station',
        statusBadge,
        liveMetricSummary: `Crew Health: ${healthPct}% · Science Marks: ${gs.scienceScore} pts · Sol ${gs.sol} Quiz: ${done ? 'Completed ✓' : 'Ready to Play!'}`,
        engineeringTip:
          'Engineering Tip: Solving Junior Astronaut quiz patterns at Academy Station awards Science Marks AND drops emergency Oxygen, Food, and Shielding supplies!',
        wallESpeechQuip: done
          ? `Ta-daa! Today’s Academy quiz passed & ${gs.scienceScore} Science Marks! Smart Cadet! 🎓`
          : `Ooh! Academy quiz slates are glowing—play a quick puzzle for bonus supplies! 🎓`,
      };
    }

    default: {
      const statusBadge =
        healthPct < 50 || gs.oxygen <= 35 || gs.food <= 35 || gs.radiationMsv >= 42
          ? 'ALERT'
          : healthPct < 74 || gs.oxygen <= 60
          ? 'CAUTION'
          : 'OPTIMAL';
      return {
        roomId: 'corridor',
        roomName: 'Central Command Spine',
        statusBadge,
        liveMetricSummary: `Base Health: ${healthPct}% · O2 ${Math.round(gs.oxygen)}% · Food ${Math.round(gs.food)}% · Rad ${gs.radiationMsv.toFixed(1)}mSv · Power ${allocatedTotal}/${gs.availablePowerKw}kW`,
        engineeringTip:
          'Engineering Tip: Walk into any workstation bay (Power, O2, Bio-Dome, Food Lab, Shields, EVA, Comms, or Academy) and scan again for that station’s deep diagnostic!',
        wallESpeechQuip:
          statusBadge === 'ALERT'
            ? `Careful! Outpost Health ${healthPct}% (O2 ${Math.round(gs.oxygen)}%)—let’s check a bay!`
            : `Base scan complete! Health ${healthPct}%, O2 ${Math.round(gs.oxygen)}%, Food ${Math.round(gs.food)}%—looking awesome! 🤖💛`,
      };
    }
  }
}
