import { MESS_LOUNGE_ZONE, OUTPOST_ROOMS, OutpostRoom, RoomId } from './rules';

export type CrewRoleId = 'han' | 'feng' | 'xin' | 'kun';

export type CrewScheduleMode =
  | 'solo_serious_work'
  | 'pair_work'
  | 'squad_work'
  | 'serious_play'
  | 'cafe_hangout'
  | 'free_roam';

export type CrewWorkBehavior =
  | 'work'
  | 'inspect'
  | 'calibrate'
  | 'note_log'
  | 'scout'
  | 'stretch'
  | 'plan_prep'
  | 'logic_clear';

export type CadetEmoteId = 'happy' | 'working' | 'sad' | 'thinking';

export type CrewSocialBehavior =
  | 'chat'
  | 'wave'
  | 'high_five'
  | 'cheer'
  | 'stargaze'
  | 'dance'
  | 'eat'
  | 'rest'
  | CadetEmoteId;

export type CrewIdleActivity = 'walk' | CrewWorkBehavior | CrewSocialBehavior;

export interface CadetEmoteSpec {
  id: CadetEmoteId;
  keyHint: '1' | '2' | '3' | '4';
  code: 'Digit1' | 'Digit2' | 'Digit3' | 'Digit4';
  label: string;
  emoji: string;
  bubble: string;
  accentColor: string;
}

export const CADET_EMOTES: readonly CadetEmoteSpec[] = [
  {
    id: 'happy',
    keyHint: '1',
    code: 'Digit1',
    label: 'Happy',
    emoji: '😊',
    bubble: '✨ Yay! So happy!',
    accentColor: '#FACC15',
  },
  {
    id: 'working',
    keyHint: '2',
    code: 'Digit2',
    label: 'Working',
    emoji: '🔧',
    bubble: '🔧 Hard at work!',
    accentColor: '#38BDF8',
  },
  {
    id: 'sad',
    keyHint: '3',
    code: 'Digit3',
    label: 'Sad',
    emoji: '😢',
    bubble: '💧 Feeling a bit blue...',
    accentColor: '#60A5FA',
  },
  {
    id: 'thinking',
    keyHint: '4',
    code: 'Digit4',
    label: 'Thinking',
    emoji: '🤔',
    bubble: '💭 Hmm... thinking!',
    accentColor: '#C084FC',
  },
];

const CREW_EMOTE_REACTIONS: Record<
  CadetEmoteId,
  Record<CrewRoleId, { activity: CrewSocialBehavior; line: string }>
> = {
  happy: {
    han: { activity: 'cheer', line: 'Love that explorer spirit, Cadet!' },
    feng: { activity: 'high_five', line: 'Woohoo! High-five, Cadet!' },
    kun: { activity: 'cheer', line: 'Big smile! Planned berries for celebrating!' },
    xin: { activity: 'wave', line: 'So lovely seeing you happy, Cadet! ♥' },
  },
  working: {
    han: { activity: 'wave', line: 'Awesome teamwork focus, Cadet!' },
    feng: { activity: 'high_five', line: 'Crushing it! Turbo mechanic energy!' },
    kun: { activity: 'wave', line: 'Great station check—meal break soon!' },
    xin: { activity: 'cheer', line: 'Logic & gauges verified clearly! ✓' },
  },
  sad: {
    han: { activity: 'wave', line: 'Hey Cadet, your Commander’s got your back!' },
    feng: { activity: 'cheer', line: 'Cheer up! Wanna drive rovers & dance, pal?' },
    kun: { activity: 'stargaze', line: 'Sending a warm sister hug & Earth cookies! ♥' },
    xin: { activity: 'wave', line: 'Aww, never feel alone out here—I’m right beside you! ♥' },
  },
  thinking: {
    han: { activity: 'chat', line: 'Scouting a big discovery in mind, Cadet?' },
    feng: { activity: 'wave', line: 'Thinking up a new rover stunt or quiz answer?' },
    kun: { activity: 'chat', line: 'Ooh, strategic planning time together?' },
    xin: { activity: 'cheer', line: 'Need help clarifying any facts calmly, Cadet?' },
  },
};

export function pickCrewReactionToCadetEmote(
  roleId: CrewRoleId,
  emote: CadetEmoteId
): { activity: CrewSocialBehavior; line: string } {
  return CREW_EMOTE_REACTIONS[emote][roleId];
}

export function isWorkingActivity(activity: CrewIdleActivity): boolean {
  return (
    activity === 'work' ||
    activity === 'inspect' ||
    activity === 'calibrate' ||
    activity === 'note_log' ||
    activity === 'scout' ||
    activity === 'stretch' ||
    activity === 'plan_prep' ||
    activity === 'logic_clear'
  );
}

export interface CrewStoryProfile {
  roleId: CrewRoleId;
  displayName: string;
  badgeTitle: string;
  storyBio: string;
  favoriteBond: string;
  workBehaviors: readonly CrewWorkBehavior[];
  cafeLines: readonly string[];
}

export const CREW_PROFILES: Record<CrewRoleId, CrewStoryProfile> = {
  han: {
    roleId: 'han',
    displayName: 'Commander-Han',
    badgeTitle: 'Oldest Explorer & Mission Leader',
    storyBio:
      'The oldest, most experienced astronaut and natural leader who loves exploration and discovering new things on every Sol.',
    favoriteBond: 'Homies & bros with Tech-Feng; loves eating, dancing, and exploring together.',
    workBehaviors: ['scout', 'inspect', 'note_log', 'calibrate'],
    cafeLines: [
      'Who wants to explore a new crater ridge after lunch?',
      'Best crew meal in the solar system, pals!',
      'Let’s hit the Dance Pad once our tea cools!',
      'Every station runs smoother when we explore as one team!',
    ],
  },
  feng: {
    roleId: 'feng',
    displayName: 'Tech-Feng',
    badgeTitle: 'Youngest Rover Driver & Sports Ace',
    storyBio:
      'The youngest and sportiest astronaut in camp, happiest behind a rover steering wheel or racing across low-gravity pads.',
    favoriteBond: 'Always teaming up & playing alongside Big Bro Han; loves sporty sprints, meals, and dancing.',
    workBehaviors: ['stretch', 'calibrate', 'inspect', 'note_log'],
    cafeLines: [
      'First one done eating gets rover-driving warmups!',
      'Zero-G stretches keeping my driving reflexes sharp!',
      'Save me a spot on the Neon Dance Pad next!',
      'Yo crew! These fresh bio-greens taste epic!',
    ],
  },
  kun: {
    roleId: 'kun',
    displayName: 'Shield-Kun',
    badgeTitle: 'Master Planner, Chef Strategist & Big Sis',
    storyBio:
      'The best planner and strategic setter—always mapping out delicious space food prep and joyful crew activities.',
    favoriteBond: 'Sisters with Bio-Xin; misses Earth warmly and talks about everything happening on Mars & the Moon.',
    workBehaviors: ['plan_prep', 'inspect', 'note_log', 'calibrate'],
    cafeLines: [
      'Planned tonight’s berry feast + group dance schedule!',
      'Thinking about cozy Earth dinners with you, Xin sis!',
      'Remember our Moon crater sunrise before flying to Mars?',
      'Everyone hydrated? Next activity starts after dessert!',
    ],
  },
  xin: {
    roleId: 'xin',
    displayName: 'Bio-Xin',
    badgeTitle: 'Kind Logic Specialist & Statement Clarifier',
    storyBio:
      'Sharpest mind at logic, endlessly kind, and the teammate who always clarifies every statement so nobody feels confused.',
    favoriteBond: 'Sisters with Shield-Kun; shares heartfelt memories of Earth and stories of Mars & Moon life.',
    workBehaviors: ['logic_clear', 'inspect', 'note_log', 'calibrate'],
    cafeLines: [
      'Statement cleared: 100% yummy CSA greens today!',
      'Kun sis, I still miss Earth’s blue ocean breeze too.',
      'From lunar dust to Mars red skies—glad we share it together!',
      'Let’s help every crewmate clearly enjoy this break!',
    ],
  },
};

export interface CameraClampResult {
  camX: number;
  camY: number;
  visW: number;
  visH: number;
}

/**
 * Clamps camera top-left inside world bounds, centering cleanly if zoomed-out
 * viewport exceeds world width or height.
 */
export function clampCameraPosition(
  camX: number,
  camY: number,
  zoom: number,
  viewW: number,
  viewH: number,
  worldW: number,
  worldH: number
): CameraClampResult {
  const safeZoom = Math.max(0.25, zoom);
  const visW = viewW / safeZoom;
  const visH = viewH / safeZoom;

  const clampedX =
    visW >= worldW
      ? (worldW - visW) / 2
      : Math.max(0, Math.min(worldW - visW, camX));

  const clampedY =
    visH >= worldH
      ? (worldH - visH) / 2
      : Math.max(0, Math.min(worldH - visH, camY));

  return { camX: clampedX, camY: clampedY, visW, visH };
}

/**
 * Zooms toward an anchor point in screen-canvas coordinates so the world point
 * beneath the cursor stays anchored while scrolling to zoom in/out.
 */
export function computeZoomAtAnchor(
  camX: number,
  camY: number,
  oldZoom: number,
  newZoom: number,
  anchorCanvasX: number,
  anchorCanvasY: number,
  viewW: number,
  viewH: number,
  worldW: number,
  worldH: number
): CameraClampResult {
  const safeOld = Math.max(0.25, oldZoom);
  const safeNew = Math.max(0.25, newZoom);
  const anchorWorldX = anchorCanvasX / safeOld + camX;
  const anchorWorldY = anchorCanvasY / safeOld + camY;
  const nextRawX = anchorWorldX - anchorCanvasX / safeNew;
  const nextRawY = anchorWorldY - anchorCanvasY / safeNew;
  return clampCameraPosition(nextRawX, nextRawY, safeNew, viewW, viewH, worldW, worldH);
}

export interface RadarViewportRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Maps current camera (camX, camY, visW, visH) into clamped Base Radar coordinates
 * so panning/dragging or zooming updates the radar indicator 1:1 without overflow.
 */
export function computeRadarViewportRect(
  camX: number,
  camY: number,
  visW: number,
  visH: number,
  radarX: number,
  radarY: number,
  radarW: number,
  radarH: number,
  worldW: number,
  worldH: number
): RadarViewportRect {
  const scaleX = radarW / worldW;
  const scaleY = radarH / worldH;

  const leftWorld = Math.max(0, camX);
  const topWorld = Math.max(0, camY);
  const rightWorld = Math.min(worldW, camX + visW);
  const bottomWorld = Math.min(worldH, camY + visH);

  const rx = radarX + leftWorld * scaleX;
  const ry = radarY + topWorld * scaleY;
  const rw = Math.max(8, (rightWorld - leftWorld) * scaleX);
  const rh = Math.max(8, (bottomWorld - topWorld) * scaleY);

  return { x: rx, y: ry, w: rw, h: rh };
}

export interface RoomAnchors {
  workSlots: Array<{ x: number; y: number; facing: number }>;
  chatPairSlots: [
    { x: number; y: number; facing: number },
    { x: number; y: number; facing: number }
  ];
}

/**
 * Returns obstacle-free perimeter work & social coordinates inside a room
 * strictly clear of the center workstation console, console text, and side racks.
 */
export function getSafeRoomAnchors(room: OutpostRoom): RoomAnchors {
  return {
    workSlots: [
      { x: room.x + 114, y: room.y + room.h - 20, facing: 1 },
      { x: room.x + room.w - 114, y: room.y + room.h - 20, facing: -1 },
      { x: room.x + 64, y: room.y + room.h - 18, facing: 1 },
      { x: room.x + room.w - 64, y: room.y + room.h - 18, facing: -1 },
    ],
    chatPairSlots: [
      { x: room.x + 114, y: room.y + room.h - 20, facing: 1 },
      { x: room.x + room.w - 114, y: room.y + room.h - 20, facing: -1 },
    ],
  };
}

/**
 * Detects which Outpost room (or Crew Lounge) a world point currently resides in.
 */
export function detectRoomAtPoint(x: number, y: number): RoomId | 'mess_lounge' | null {
  for (const r of OUTPOST_ROOMS) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      return r.id;
    }
  }
  if (
    x >= MESS_LOUNGE_ZONE.x &&
    x <= MESS_LOUNGE_ZONE.x + MESS_LOUNGE_ZONE.w &&
    y >= MESS_LOUNGE_ZONE.y &&
    y <= MESS_LOUNGE_ZONE.y + MESS_LOUNGE_ZONE.h
  ) {
    return 'mess_lounge';
  }
  return null;
}

/**
 * Non-repeating shuffle deck for keeping crew dialogue & activity selections fresh.
 */
export class ShuffleDeck<T> {
  private pool: T[] = [];
  private lastItem: T | null = null;
  private readonly items: readonly T[];

  constructor(items: readonly T[]) {
    this.items = items;
    this.refill();
  }

  private refill(): void {
    const copy = [...this.items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    if (copy.length > 1 && this.lastItem !== null && copy[0] === this.lastItem) {
      const swapIdx = 1 + Math.floor(Math.random() * (copy.length - 1));
      const tmp = copy[0];
      copy[0] = copy[swapIdx];
      copy[swapIdx] = tmp;
    }
    this.pool = copy;
  }

  next(): T {
    if (this.pool.length === 0) {
      this.refill();
    }
    const picked = this.pool.shift() as T;
    this.lastItem = picked;
    return picked;
  }
}

export const SCHEDULE_MODE_DECK_ITEMS: readonly CrewScheduleMode[] = [
  'solo_serious_work',
  'pair_work',
  'cafe_hangout',
  'serious_play',
  'squad_work',
  'pair_work',
  'free_roam',
];

export function pickNextStationBehavior(
  roleId: CrewRoleId,
  current: CrewIdleActivity
): CrewWorkBehavior {
  const pool = CREW_PROFILES[roleId].workBehaviors;
  const alternatives = pool.filter((b) => b !== current);
  const candidates = alternatives.length > 0 ? alternatives : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export const STATION_BEHAVIOR_BUBBLES: Record<CrewWorkBehavior, Record<CrewRoleId, readonly string[]>> = {
  work: {
    han: ['Leading frontier check!', 'Testing new rig gear!'],
    feng: ['Fine-tuning rover torque!', 'Quick mechanic sweep!'],
    kun: ['Drafting Sol meal plan!', 'Organizing crew tasks!'],
    xin: ['Clarifying every gauge!', 'Kind check: all nominal!'],
  },
  inspect: {
    han: ['Exploring fresh readings!', 'Scout check complete!'],
    feng: ['Checking drive bearings!', 'Clean dial response!'],
    kun: ['Reviewing resource timing!', 'Smart prep checklist!'],
    xin: ['Step 1–3 logic verified!', 'Everything looks crystal clear!'],
  },
  calibrate: {
    han: ['Tuning frontier sensor!', 'Smooth power balance!'],
    feng: ['Zero-G speed tune-up!', 'Steering curve dialed!'],
    kun: ['Adjusting timer targets!', 'Balanced food & work pace!'],
    xin: ['Precision clarity confirmed!', 'Gentle calibration done!'],
  },
  note_log: {
    han: ['Logging new discovery!', 'Marking trail notes!'],
    feng: ['Recording track lap time!', 'Sporty telemetry saved!'],
    kun: ['Planning berry wrap menu!', 'Updating crew activity chart!'],
    xin: ['Writing clear summary note!', 'Full statement checked!'],
  },
  scout: {
    han: ['Scouting next Mars ridge!', 'Always seeking new horizons!'],
    feng: ['Eyes on the rover trail!', 'Ready for a canyon run!'],
    kun: ['Mapping safe crew route!', 'Scouting picnic stop too!'],
    xin: ['Mapping clear landmarks!', 'Safe path verified!'],
  },
  stretch: {
    han: ['Commander warm-up!', 'Keeping explorer fit!'],
    feng: ['Sporty low-G lunges!', 'Warming up to drive!'],
    kun: ['Post-prep stretch break!', 'Ready for dance time!'],
    xin: ['Gentle mindful stretch!', 'Calm breath, kind pace!'],
  },
  plan_prep: {
    han: ['Backing Kun’s game plan!', 'Love that explorer schedule!'],
    feng: ['Put rover race on the list!', 'Count me in for snacks!'],
    kun: ['Setting tonight’s food prep!', 'Planning fun games for all!'],
    xin: ['Clarifying Kun’s tidy plan!', 'Menu & tasks crystal clear!'],
  },
  logic_clear: {
    han: ['Thanks for clearing that, Xin!', 'Clean brief, teammate!'],
    feng: ['Sweet! Makes total sense!', 'Crystal clear logic!'],
    kun: ['Best logic sis ever!', 'Clean summary, Xin!'],
    xin: ['Statement fully cleared! ✓', 'Logic check: 100% clear!'],
  },
};

export const ROOM_WORK_LINES: Record<RoomId | 'mess_lounge', readonly string[]> = {
  power: [
    'Balancing Kilopower bus!',
    'Solar voltage steady!',
    'Checking breaker amps!',
    'Grid reserves locked in!',
  ],
  lifesupport: [
    'O2 scrubbers humming!',
    'Checking H2O electrolysis!',
    'CO2 filter crystal clean!',
    'Cabin pressure 101kPa!',
  ],
  hydroponics: [
    'Tuning red/blue LEDs!',
    'Mist check on Mizuna!',
    'Radish roots thriving!',
    'Fresh greens blooming!',
  ],
  foodlab: [
    'Measuring CSA calories!',
    'Prepping Spirulina broth!',
    'Planning berry wraps!',
    'Taste-testing space soup!',
  ],
  shield: [
    'Water wall pressure max!',
    'Scanning DONKI telemetry!',
    'Checking rad dosimeter!',
    'Storm shelter verified!',
  ],
  eva: [
    'Calibrating airlock seals!',
    'Dusting EVA suit visors!',
    'Tuning cargo rover tires!',
    'Ice drill bits sharpened!',
  ],
  comms: [
    'Aligning DSN uplink array!',
    'Sending clear Mars report!',
    'Queueing crew dance synth!',
    'Hello Earth from Mars!',
  ],
  academy: [
    'Testing Junior Astro quiz!',
    'Clarifying NASA facts!',
    'Solving kW energy puzzle!',
    'Helping Cadet learn STEM!',
  ],
  mess_lounge: [
    'Prepping zero-G tea mugs!',
    'Setting Crew Cafe table!',
    'Tidying cozy rest pods!',
    'Warming dance pad beats!',
  ],
};

export interface CrewReactionExchange {
  actA: CrewSocialBehavior;
  actB: CrewSocialBehavior;
  lineA: string;
  lineB: string;
}

const PAIR_SPECIFIC_REACTIONS: Record<string, readonly CrewReactionExchange[]> = {
  'han-feng': [
    {
      actA: 'high_five',
      actB: 'high_five',
      lineA: 'Bro! Want to test that new ridge rover trail?',
      lineB: 'Always ready, Han! Let’s drive fast & dance later!',
    },
    {
      actA: 'cheer',
      actB: 'dance',
      lineA: 'You crushed that sporty bay check, Feng bro!',
      lineB: 'Haha, learning from the best explorer around!',
    },
    {
      actA: 'wave',
      actB: 'cheer',
      lineA: 'Homies on duty! Fancy a Galley wrap soon?',
      lineB: 'Bet! Last one to Crew Cafe does Moon hops!',
    },
  ],
  'kun-xin': [
    {
      actA: 'stargaze',
      actB: 'stargaze',
      lineA: 'Missing Earth rain today... Mars sky feels so far.',
      lineB: 'Me too, Kun sis. From Moon craters to Mars, I’m glad we’re together!',
    },
    {
      actA: 'wave',
      actB: 'cheer',
      lineA: 'Remember our Earth picnics before this Mars & Moon trip?',
      lineB: 'Always! Let’s bake berry tarts in Crew Cafe to feel homey!',
    },
    {
      actA: 'chat',
      actB: 'stargaze',
      lineA: 'So much happened on the Moon and Mars this Sol, Xin!',
      lineB: 'Truth! Still sending warm thoughts back to Earth families.',
    },
  ],
  'han-xin': [
    {
      actA: 'wave',
      actB: 'cheer',
      lineA: 'Xin! Explain that sensor pattern one more time?',
      lineB: 'Gladly, Han! Statement fully cleared: green across all bays!',
    },
    {
      actA: 'high_five',
      actB: 'wave',
      lineA: 'Love how kind and clear your mission notes are, Xin!',
      lineB: 'Thank you, Commander! Can’t wait to hear your next exploration plan!',
    },
  ],
  'feng-kun': [
    {
      actA: 'cheer',
      actB: 'wave',
      lineA: 'Hey Kun! What awesome food & game did you plan today?',
      lineB: 'Berry wraps & Neon Dance tournament—stay sporty, Feng!',
    },
    {
      actA: 'wave',
      actB: 'cheer',
      lineA: 'Just finished rover drills—got any snacks prepped?',
      lineB: 'Always planned ahead for our speedy driver!',
    },
  ],
  'han-kun': [
    {
      actA: 'wave',
      actB: 'chat',
      lineA: 'Great crew schedule today, Kun—let’s explore Sector B next!',
      lineB: 'Already planned snacks & safety routes for the whole squad!',
    },
  ],
  'feng-xin': [
    {
      actA: 'high_five',
      actB: 'wave',
      lineA: 'Hey Xin! Did my rover speed test break any rules?',
      lineB: 'Kind reminder: super safe & clear! Save energy for dancing!',
    },
  ],
};

export function pickPairReactionExchange(
  roleA: CrewRoleId,
  roleB: CrewRoleId,
  fallbackDeck: ShuffleDeck<SameRoomChitChat>
): CrewReactionExchange {
  const keyDirect = `${roleA}-${roleB}`;
  const keySwapped = `${roleB}-${roleA}`;
  const pool = PAIR_SPECIFIC_REACTIONS[keyDirect] || PAIR_SPECIFIC_REACTIONS[keySwapped];
  if (pool && pool.length > 0) {
    const picked = pool[Math.floor(Math.random() * pool.length)];
    if (PAIR_SPECIFIC_REACTIONS[keySwapped] && !PAIR_SPECIFIC_REACTIONS[keyDirect]) {
      return {
        actA: picked.actB,
        actB: picked.actA,
        lineA: picked.lineB,
        lineB: picked.lineA,
      };
    }
    return picked;
  }
  const f = fallbackDeck.next();
  return {
    actA: f.vibe === 'dance' ? 'dance' : 'wave',
    actB: f.vibe === 'dance' ? 'cheer' : 'chat',
    lineA: f.lineA,
    lineB: f.lineB,
  };
}

export interface SameRoomChitChat {
  lineA: string;
  lineB: string;
  vibe: 'chat' | 'dance';
}

export const SAME_ROOM_CHITCHAT_LINES: readonly SameRoomChitChat[] = [
  { lineA: 'Whoa, cool sensor readings here!', lineB: 'Right? Smooth teamwork makes it shine!', vibe: 'chat' },
  { lineA: 'Quick stretch break before next check?', lineB: 'Count me in — smooth zero-G groove!', vibe: 'dance' },
  { lineA: 'Notice how bright these panels look?', lineB: 'Freshly calibrated just for you!', vibe: 'chat' },
  { lineA: 'High-five for crushing today’s Sol!', lineB: 'Boom! Best crew on Mars!', vibe: 'dance' },
  { lineA: 'Want to grab a berry wrap later?', lineB: 'Only if we sit together in Crew Cafe!', vibe: 'chat' },
  { lineA: 'Everything crystal clear on this console?', lineB: 'Verified & clear, teammate!', vibe: 'chat' },
  { lineA: 'Mini moonwalk while logs upload?', lineB: 'Watch these moon-boot moves! ♪', vibe: 'dance' },
  { lineA: 'Glad we got paired up in this bay!', lineB: 'Same! Easy work with you around!', vibe: 'chat' },
];

export const SERIOUS_PLAY_SCENES: readonly {
  vibe: 'dance' | 'chat';
  location: 'lounge' | 'spine';
  lines: Record<CrewRoleId, string>;
}[] = [
  {
    vibe: 'dance',
    location: 'lounge',
    lines: {
      han: 'Seriously playing time! Hit the Lounge pad!',
      feng: 'Sporty turbo moonwalk activated, bro! ♪',
      xin: 'Kind groove with Bio-Dome rhythm! ♫',
      kun: 'Activity planner says: everybody dance!',
    },
  },
  {
    vibe: 'chat',
    location: 'spine',
    lines: {
      han: 'Who wants to explore down the Spine?',
      feng: 'Already stretching my driving boots, Han!',
      xin: 'Zero-G obstacle relay — rules crystal clear!',
      kun: 'I mapped the finish line + snack prizes!',
    },
  },
  {
    vibe: 'dance',
    location: 'spine',
    lines: {
      han: 'Time to seriously unwind, crew! ♪',
      feng: 'Cue the synth bass, Cadet!',
      xin: 'So much fun here on Mars & Moon! ♫',
      kun: 'Group dance boosts crew morale +100%!',
    },
  },
  {
    vibe: 'chat',
    location: 'lounge',
    lines: {
      han: 'Who remembers Earth beaches & cozy tea?',
      feng: 'I bet rovers could surf Earth dunes too!',
      xin: 'I miss Earth skies, though Mars friends make it home.',
      kun: 'Sisters forever—plus I planned berry muffins for all!',
    },
  },
];

/**
 * Rotating Crew Cafe seating arrangements around diningSeats:
 * Seats [0, 2] are side-by-side on the Left side of the table;
 * Seats [1, 3] are side-by-side on the Right side of the table.
 * Guarantees: sometimes Han sits beside Feng, sometimes Xin sits beside Han,
 * and sometimes Feng sits beside Kun.
 */
export interface CrewCafeSeatingPreset {
  id: 'han_beside_feng' | 'xin_beside_han' | 'feng_beside_kun';
  label: string;
  seats: Record<CrewRoleId, number>;
  lines: Record<CrewRoleId, string>;
}

export const CREW_CAFE_ROTATIONS: readonly CrewCafeSeatingPreset[] = [
  {
    id: 'han_beside_feng',
    label: 'Han & Feng Bros Beside + Xin & Kun Sisters',
    seats: { han: 0, feng: 2, kun: 1, xin: 3 },
    lines: {
      han: 'Sitting beside bro Feng—next expedition starts soon!',
      feng: 'Yo Han bro! Best rover co-pilot & dining buddy!',
      kun: 'Xin sis, still missing Earth sunsets with you.',
      xin: 'Me too, Kun! Glad we share Mars & Moon memories!',
    },
  },
  {
    id: 'xin_beside_han',
    label: 'Xin Beside Han + Kun Beside Feng',
    seats: { han: 0, xin: 2, kun: 1, feng: 3 },
    lines: {
      han: 'Great seat beside Xin! Tell me your logic breakdown!',
      xin: 'Clarifying it warmly: berries + greens = top energy!',
      kun: 'Planned extra hot soup for our speedy driver Feng!',
      feng: 'Awesome seat beside Chef-Planner Kun! Yum!',
    },
  },
  {
    id: 'feng_beside_kun',
    label: 'Feng Beside Kun + Han Beside Xin',
    seats: { feng: 0, kun: 2, han: 1, xin: 3 },
    lines: {
      feng: 'Hey Kun! Loved how you planned today’s rover & food break!',
      kun: 'Always fun prepping meals & activities beside Feng!',
      han: 'Xin, your Moon-to-Mars story always inspires the crew!',
      xin: 'Thank you, Commander Han! Clear hearts make Earth feel close!',
    },
  },
];

export function pickCrewCafeSeating(rotationIdx: number): CrewCafeSeatingPreset {
  return CREW_CAFE_ROTATIONS[Math.abs(rotationIdx) % CREW_CAFE_ROTATIONS.length];
}

export const CADET_JOIN_REACTIONS: readonly string[] = [
  'Yay, Cadet joined us! Let’s explore & roll!',
  'Best Junior Astronaut teammate ever, Cadet!',
  'High-five, Cadet! Everything crystal clear!',
  'Jump in for snacks & dancing with us, Cadet!',
  'Squad + Cadet = unstoppable Mars & Moon crew!',
  'Awesome sporty energy, Cadet! Keep shining!',
];

export interface PairAssignment {
  pairA: [CrewRoleId, CrewRoleId];
  roomA: RoomId;
  pairB: [CrewRoleId, CrewRoleId];
  roomB: RoomId;
}

const PAIR_CONFIGS: readonly [[CrewRoleId, CrewRoleId], [CrewRoleId, CrewRoleId]][] = [
  [['han', 'feng'], ['kun', 'xin']], // Classic Big Bros + Sisters
  [['han', 'kun'], ['feng', 'xin']], // Explorer+Planner & Driver+Logic
  [['han', 'xin'], ['feng', 'kun']], // Explorer+Logic & Driver+Planner
];

const ROOM_ID_LIST: readonly RoomId[] = [
  'power',
  'lifesupport',
  'hydroponics',
  'foodlab',
  'shield',
  'eva',
  'comms',
  'academy',
];

export function pickFreshPairAssignment(
  pairIdx: number,
  roomDeck: ShuffleDeck<RoomId>
): PairAssignment {
  const [pairA, pairB] = PAIR_CONFIGS[pairIdx % PAIR_CONFIGS.length];
  const roomA = roomDeck.next();
  let roomB = roomDeck.next();
  if (roomB === roomA) {
    const idx = ROOM_ID_LIST.indexOf(roomA);
    roomB = ROOM_ID_LIST[(idx + 2) % ROOM_ID_LIST.length];
  }
  return { pairA, roomA, pairB, roomB };
}

export function pickFourDistinctRooms(roomDeck: ShuffleDeck<RoomId>): Record<CrewRoleId, RoomId> {
  const picked: RoomId[] = [];
  while (picked.length < 4) {
    const candidate = roomDeck.next();
    if (!picked.includes(candidate)) picked.push(candidate);
  }
  return {
    han: picked[0],
    feng: picked[1],
    xin: picked[2],
    kun: picked[3],
  };
}

export type OutpostZoneId = RoomId | 'mess_lounge';

const TOP_ROW_ZONES = new Set<OutpostZoneId>(['power', 'lifesupport', 'hydroponics', 'foodlab']);
const BOT_ROW_ZONES = new Set<OutpostZoneId>(['shield', 'eva', 'comms', 'mess_lounge']);
const OPEN_NS_GAPS = [530, 1050, 1550];

export function getOutpostDoorX(zoneId: OutpostZoneId): number {
  if (zoneId === 'mess_lounge') return 1842;
  if (zoneId === 'academy') return 270;
  const rm = OUTPOST_ROOMS.find((r) => r.id === zoneId);
  return rm ? rm.consoleX : 790;
}

function pickNearestGapX(x: number): number {
  let best = OPEN_NS_GAPS[0];
  let bestDist = Math.abs(x - best);
  for (const g of OPEN_NS_GAPS) {
    const d = Math.abs(x - g);
    if (d < bestDist) {
      bestDist = d;
      best = g;
    }
  }
  return best;
}

function pushPathPoint(pts: Array<{ x: number; y: number }>, x: number, y: number): void {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const last = pts[pts.length - 1];
  if (last && Math.hypot(rx - last.x, ry - last.y) < 8) return;
  pts.push({ x: rx, y: ry });
}

/**
 * Builds an acyclic, doorway-aligned waypoint queue across the Outpost
 * Command Spine (y = 530), North/South feeder corridors, Shield->Academy link,
 * and safe Mess Lounge aisles so astronauts & WALL-E never oscillate or snag at thresholds.
 */
export function buildOutpostCorridorPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): Array<{ x: number; y: number }> {
  const srcZone = detectRoomAtPoint(fromX, fromY);
  const dstZone = detectRoomAtPoint(toX, toY);
  const pts: Array<{ x: number; y: number }> = [];

  if (srcZone !== null && srcZone === dstZone) {
    if (srcZone === 'mess_lounge') {
      const minX = Math.min(fromX, toX);
      const maxX = Math.max(fromX, toX);
      const minY = Math.min(fromY, toY);
      const maxY = Math.max(fromY, toY);
      const crossesTable =
        maxX > MESS_LOUNGE_ZONE.diningTable.x - 68 &&
        minX < MESS_LOUNGE_ZONE.diningTable.x + 68 &&
        maxY > MESS_LOUNGE_ZONE.diningTable.y - 44 &&
        minY < MESS_LOUNGE_ZONE.diningTable.y + 44;
      if (crossesTable) {
        const aisleY = fromY > MESS_LOUNGE_ZONE.diningTable.y + 30 ? 905 : 728;
        pushPathPoint(pts, (fromX + toX) / 2, aisleY);
      }
    } else if (srcZone !== null) {
      const rm = OUTPOST_ROOMS.find((r) => r.id === srcZone);
      if (rm) {
        const minX = Math.min(fromX, toX);
        const maxX = Math.max(fromX, toX);
        const minY = Math.min(fromY, toY);
        const maxY = Math.max(fromY, toY);
        const crossesConsole =
          maxX > rm.consoleX - 70 &&
          minX < rm.consoleX + 70 &&
          maxY > rm.consoleY - 40 &&
          minY < rm.consoleY + 34;
        if (crossesConsole) {
          pushPathPoint(pts, rm.consoleX, rm.consoleY + 62);
        }
      }
    }
    pushPathPoint(pts, toX, toY);
    return pts;
  }

  // Direct vertical link between Radiation Shield Vault and Academy Station
  if (
    (srcZone === 'shield' && dstZone === 'academy') ||
    (srcZone === 'academy' && dstZone === 'shield')
  ) {
    if (srcZone === 'shield') {
      pushPathPoint(pts, 270, 895);
      pushPathPoint(pts, 270, 974);
      pushPathPoint(pts, 270, 1042);
    } else {
      pushPathPoint(pts, 270, 1038);
      pushPathPoint(pts, 270, 974);
      pushPathPoint(pts, 270, 895);
    }
    pushPathPoint(pts, toX, toY);
    return pts;
  }

  const SPINE_Y = 530;

  // Step 1: Exit source zone cleanly to Command Spine (y = 530)
  if (srcZone === 'academy') {
    pushPathPoint(pts, 270, 1038);
    pushPathPoint(pts, 270, 974);
    pushPathPoint(pts, 270, 895);
    pushPathPoint(pts, 270, 718);
    pushPathPoint(pts, 270, SPINE_Y);
  } else if (srcZone !== null && TOP_ROW_ZONES.has(srcZone)) {
    const doorX = getOutpostDoorX(srcZone);
    pushPathPoint(pts, doorX, 342);
    pushPathPoint(pts, doorX, SPINE_Y);
  } else if (srcZone !== null && BOT_ROW_ZONES.has(srcZone)) {
    const doorX = getOutpostDoorX(srcZone);
    if (srcZone === 'mess_lounge' && fromY > 775) {
      pushPathPoint(pts, fromX > 1920 ? 1950 : fromX < 1755 ? 1715 : doorX, 728);
    }
    pushPathPoint(pts, doorX, 718);
    pushPathPoint(pts, doorX, SPINE_Y);
  } else if (fromY < 130) {
    // Exterior Solar Wing -> open breezeway gap x = 530
    pushPathPoint(pts, 530, Math.max(96, fromY));
    pushPathPoint(pts, 530, SPINE_Y);
  } else if (fromY > 955) {
    const gapX = pickNearestGapX(fromX);
    pushPathPoint(pts, gapX, Math.min(fromY, 1030));
    pushPathPoint(pts, gapX, SPINE_Y);
  } else if (Math.abs(fromY - SPINE_Y) > 48) {
    // Currently inside a north/south feeder corridor or gap between Spine and rooms
    const laneX =
      fromX < 460
        ? 270
        : fromX < 610
        ? 530
        : fromX < 980
        ? 790
        : fromX < 1130
        ? 1050
        : fromX < 1500
        ? 1310
        : fromX < 1620
        ? 1550
        : 1842;
    pushPathPoint(pts, laneX, SPINE_Y);
  }

  // Step 2: Move along Command Spine (y = 530) and enter destination zone cleanly
  if (dstZone === 'academy') {
    pushPathPoint(pts, 270, SPINE_Y);
    pushPathPoint(pts, 270, 718);
    pushPathPoint(pts, 270, 895);
    pushPathPoint(pts, 270, 974);
    pushPathPoint(pts, 270, 1042);
    pushPathPoint(pts, toX, toY);
  } else if (dstZone !== null && TOP_ROW_ZONES.has(dstZone)) {
    const doorX = getOutpostDoorX(dstZone);
    pushPathPoint(pts, doorX, SPINE_Y);
    pushPathPoint(pts, doorX, 342);
    pushPathPoint(pts, toX, toY);
  } else if (dstZone !== null && BOT_ROW_ZONES.has(dstZone)) {
    const doorX = getOutpostDoorX(dstZone);
    pushPathPoint(pts, doorX, SPINE_Y);
    pushPathPoint(pts, doorX, 718);
    if (dstZone === 'mess_lounge' && toY > 775) {
      if (toX > 1925) {
        pushPathPoint(pts, 1950, 728);
      } else if (toX < 1760) {
        pushPathPoint(pts, 1715, 728);
      } else if (toY > 880) {
        pushPathPoint(pts, 1940, 728);
        pushPathPoint(pts, 1940, 905);
      }
    }
    pushPathPoint(pts, toX, toY);
  } else if (toY < 130) {
    // Exterior Solar Wing
    pushPathPoint(pts, 530, SPINE_Y);
    pushPathPoint(pts, 530, Math.max(96, toY));
    pushPathPoint(pts, toX, toY);
  } else if (toY > 955) {
    const gapX = pickNearestGapX(toX);
    pushPathPoint(pts, gapX, SPINE_Y);
    pushPathPoint(pts, gapX, toY);
    pushPathPoint(pts, toX, toY);
  } else {
    if (Math.abs(toY - SPINE_Y) > 52) {
      pushPathPoint(pts, Math.max(180, Math.min(2020, toX)), SPINE_Y);
    }
    pushPathPoint(pts, toX, toY);
  }

  // Strip redundant starting points already satisfied
  while (pts.length > 1 && Math.hypot(pts[0].x - fromX, pts[0].y - fromY) < 8) {
    pts.shift();
  }
  return pts;
}

/**
 * Advances an actor along its queued waypoints with zero overshoot and smooth facing hysteresis.
 */
export function advancePathFollower(
  actor: {
    x: number;
    y: number;
    facing: number;
    path: Array<{ x: number; y: number }>;
  },
  speed: number,
  dt: number
): { arrived: boolean; movedDist: number } {
  if (actor.path.length === 0) {
    return { arrived: true, movedDist: 0 };
  }
  let remainingMove = Math.max(0, speed * dt);
  let movedDist = 0;

  while (remainingMove > 0 && actor.path.length > 0) {
    const wp = actor.path[0];
    const dx = wp.x - actor.x;
    const dy = wp.y - actor.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= 0.5) {
      actor.x = wp.x;
      actor.y = wp.y;
      actor.path.shift();
      continue;
    }

    if (Math.abs(dx) > 10) {
      actor.facing = dx >= 0 ? 1 : -1;
    }

    if (dist <= remainingMove) {
      actor.x = wp.x;
      actor.y = wp.y;
      movedDist += dist;
      remainingMove -= dist;
      actor.path.shift();
    } else {
      actor.x += (dx / dist) * remainingMove;
      actor.y += (dy / dist) * remainingMove;
      movedDist += remainingMove;
      remainingMove = 0;
    }
  }

  return { arrived: actor.path.length === 0, movedDist };
}

