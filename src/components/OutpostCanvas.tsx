import React, { useEffect, useRef } from 'react';
import {
  FUTURE_EXPANSION_PLOT,
  GameStateSnapshot,
  MESS_LOUNGE_ZONE,
  OUTPOST_ROOMS,
  OUTPOST_WORLD_H,
  OUTPOST_WORLD_W,
  OutpostRoom,
  RoomId,
  getDonkiEventForSol,
} from '../game/rules';
import {
  MISSION_SITES,
  OutpostMapVariant,
  getOutpostMapDesign,
} from '../game/nasaData';
import { spaceAudio } from '../game/audio';
import {
  CADET_EMOTES,
  CADET_JOIN_REACTIONS,
  CREW_CAFE_ROTATIONS,
  CREW_PROFILES,
  CadetEmoteId,
  CrewIdleActivity,
  CrewRoleId,
  CrewScheduleMode,
  ROOM_WORK_LINES,
  SAME_ROOM_CHITCHAT_LINES,
  SCHEDULE_MODE_DECK_ITEMS,
  SERIOUS_PLAY_SCENES,
  STATION_BEHAVIOR_BUBBLES,
  ShuffleDeck,
  advancePathFollower,
  buildOutpostCorridorPath,
  clampCameraPosition,
  computeRadarViewportRect,
  computeZoomAtAnchor,
  detectRoomAtPoint,
  getSafeRoomAnchors,
  isWorkingActivity,
  pickCrewCafeSeating,
  pickCrewReactionToCadetEmote,
  pickFourDistinctRooms,
  pickFreshPairAssignment,
  pickNextStationBehavior,
  pickPairReactionExchange,
} from '../game/crewAndCamera';
import {
  WALL_E_ENVIRONMENT_CHORES,
  WallEActivity,
  pickWallEAstronautExchange,
  pickWallECadetLove,
} from '../game/wallE';

export interface OutpostPropInteraction {
  id:
    | 'sat-comms'
    | 'sat-weather'
    | 'prop-solar'
    | 'prop-rover'
    | 'lounge-eat'
    | 'lounge-rest'
    | 'lounge-dance';
  label: string;
}

export interface NearbyCrewInfo {
  roleId: CrewRoleId;
  name: string;
  activity: CrewIdleActivity;
}

interface OutpostCanvasProps {
  gameState: GameStateSnapshot;
  shellState: 'title' | 'playing' | 'paused' | 'gameover';
  activeModalRoom: RoomId | null;
  onSelectRoom: (roomId: RoomId) => void;
  onNearRoomChange: (roomId: RoomId | null) => void;
  onNearPropChange?: (prop: OutpostPropInteraction | null) => void;
  onNearCrewChange?: (crew: NearbyCrewInfo | null) => void;
  joinCrewNonce?: number;
  cadetEmoteCommand?: { nonce: number; emote: CadetEmoteId } | null;
  onInteractProp?: (prop: OutpostPropInteraction) => void;
  checkedPropsToday?: string[];
  onCurrentRoomChange?: (roomId: RoomId | null) => void;
  isModalOpen?: boolean;
  crewColor: string;
  dancePartyUntil?: number;
  crewFeastUntil?: number;
  onInteractWallE?: () => void;
  onNearWallEChange?: (near: boolean) => void;
  wallECommand?: {
    nonce: number;
    action: 'thank' | 'tidy' | 'dance' | 'tip' | 'scan';
    bubble?: string;
  } | null;
}

type CrewActivity = CrewIdleActivity;

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface NpcCrewmate {
  roleId: CrewRoleId;
  name: string;
  color: string;
  skinColor: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  walkDist: number;
  policy: 'orbiter' | 'patroller' | 'sentry' | 'commander';
  targetIdx: number;
  timer: number;
  isCommander?: boolean;
  activity: CrewActivity;
  activityTimer: number;
  workShiftTimer: number;
  chatCooldown: number;
  bubble: string;
  seatIdx: number;
  goalX: number | null;
  goalY: number | null;
  goalFacing: number | null;
  path: Array<{ x: number; y: number }>;
  pathKey: string;
  pendingAction: CrewIdleActivity | null;
  pendingDuration: number;
  pendingBubble: string;
}

const WORLD_W = OUTPOST_WORLD_W;
const WORLD_H = OUTPOST_WORLD_H;
const VIEW_W = 1480;
const VIEW_H = 880;
const MAX_PARTICLES = 130;

// Base Radar & Zoom Widget geometry (screen-space VIEW_W x VIEW_H)
const RADAR_X = VIEW_W - 196;
const RADAR_Y = 104;
const RADAR_W = 180;
const RADAR_H = 104;
const ZOOM_BAR_Y = RADAR_Y + RADAR_H + 8;
const ZOOM_BAR_H = 28;
const CENTER_BAR_Y = ZOOM_BAR_Y + ZOOM_BAR_H + 6;
const CENTER_BAR_H = 24;
const MIN_MAP_ZOOM = 0.65;
const MAX_MAP_ZOOM = 1.65;

interface InteractiveWorldProp {
  id: OutpostPropInteraction['id'];
  label: string;
  actionHint: string;
  x: number;
  y: number;
  hitW: number;
  hitH: number;
  approachX: number;
  approachY: number;
  triggerRadius: number;
  accentColor: string;
}

const INTERACTIVE_PROPS: InteractiveWorldProp[] = [
  {
    id: 'sat-comms',
    label: 'Deep Space Satellite Dish',
    actionHint: 'Clean & Check Satellite',
    x: 1310,
    y: 1028,
    hitW: 96,
    hitH: 88,
    approachX: 1310,
    approachY: 982,
    triggerRadius: 96,
    accentColor: '#38BDF8',
  },
  {
    id: 'sat-weather',
    label: 'Surface Weather Satellite Relay',
    actionHint: 'Clean & Check Satellite',
    x: 1570,
    y: 248,
    hitW: 90,
    hitH: 96,
    approachX: 1570,
    approachY: 315,
    triggerRadius: 92,
    accentColor: '#22D3EE',
  },
  {
    id: 'prop-solar',
    label: 'Exterior Solar Wing Farm',
    actionHint: 'Wipe Dust & Inspect',
    x: 278,
    y: 54,
    hitW: 320,
    hitH: 76,
    approachX: 278,
    approachY: 112,
    triggerRadius: 110,
    accentColor: '#F59E0B',
  },
  {
    id: 'prop-rover',
    label: 'Surface Cargo Rover',
    actionHint: 'Check Rover Sensors',
    x: 882,
    y: 1026,
    hitW: 88,
    hitH: 64,
    approachX: 882,
    approachY: 978,
    triggerRadius: 94,
    accentColor: '#F97316',
  },
  {
    id: 'lounge-eat',
    label: 'Crew Dining Table & Galley',
    actionHint: 'Eat Space Meal',
    x: MESS_LOUNGE_ZONE.diningTable.x,
    y: MESS_LOUNGE_ZONE.diningTable.y,
    hitW: 168,
    hitH: 100,
    approachX: MESS_LOUNGE_ZONE.diningSeats[0].x,
    approachY: MESS_LOUNGE_ZONE.diningSeats[0].y,
    triggerRadius: 110,
    accentColor: '#34D399',
  },
  {
    id: 'lounge-rest',
    label: 'Crew Rest Pods Alpha & Beta',
    actionHint: 'Rest in Sleep Pod',
    x: 1794,
    y: MESS_LOUNGE_ZONE.restPods[0].y,
    hitW: 310,
    hitH: 58,
    approachX: MESS_LOUNGE_ZONE.restPods[0].x,
    approachY: MESS_LOUNGE_ZONE.restPods[0].y - 4,
    triggerRadius: 112,
    accentColor: '#38BDF8',
  },
  {
    id: 'lounge-dance',
    label: 'Crew Neon Dance Pad',
    actionHint: 'Dance Together!',
    x: MESS_LOUNGE_ZONE.danceFloor.x + MESS_LOUNGE_ZONE.danceFloor.w / 2,
    y: MESS_LOUNGE_ZONE.danceFloor.y + MESS_LOUNGE_ZONE.danceFloor.h / 2,
    hitW: MESS_LOUNGE_ZONE.danceFloor.w,
    hitH: MESS_LOUNGE_ZONE.danceFloor.h,
    approachX: MESS_LOUNGE_ZONE.danceFloor.x + MESS_LOUNGE_ZONE.danceFloor.w / 2,
    approachY: MESS_LOUNGE_ZONE.danceFloor.y + MESS_LOUNGE_ZONE.danceFloor.h / 2,
    triggerRadius: 96,
    accentColor: '#F472B6',
  },
];

export const OutpostCanvas: React.FC<OutpostCanvasProps> = ({
  gameState,
  shellState,
  activeModalRoom,
  onSelectRoom,
  onNearRoomChange,
  onNearPropChange,
  onNearCrewChange,
  joinCrewNonce = 0,
  cadetEmoteCommand = null,
  onInteractProp,
  checkedPropsToday = [],
  onCurrentRoomChange,
  isModalOpen = false,
  crewColor,
  dancePartyUntil = 0,
  crewFeastUntil = 0,
  onInteractWallE,
  onNearWallEChange,
  wallECommand = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    gameState,
    shellState,
    activeModalRoom,
    onSelectRoom,
    onNearRoomChange,
    onNearPropChange,
    onNearCrewChange,
    joinCrewNonce,
    cadetEmoteCommand,
    onInteractProp,
    checkedPropsToday,
    onCurrentRoomChange,
    isModalOpen,
    crewColor,
    dancePartyUntil,
    crewFeastUntil,
    onInteractWallE,
    onNearWallEChange,
    wallECommand,
  });

  useEffect(() => {
    stateRef.current = {
      gameState,
      shellState,
      activeModalRoom,
      onSelectRoom,
      onNearRoomChange,
      onNearPropChange,
      onNearCrewChange,
      joinCrewNonce,
      cadetEmoteCommand,
      onInteractProp,
      checkedPropsToday,
      onCurrentRoomChange,
      isModalOpen,
      crewColor,
      dancePartyUntil,
      crewFeastUntil,
      onInteractWallE,
      onNearWallEChange,
      wallECommand,
    };
  }, [
    gameState,
    shellState,
    activeModalRoom,
    onSelectRoom,
    onNearRoomChange,
    onNearPropChange,
    onNearCrewChange,
    joinCrewNonce,
    cadetEmoteCommand,
    onInteractProp,
    checkedPropsToday,
    onCurrentRoomChange,
    isModalOpen,
    crewColor,
    dancePartyUntil,
    crewFeastUntil,
    onInteractWallE,
    onNearWallEChange,
    wallECommand,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();

    // Player spawned on wide central pressurized corridor spine facing open path
    const PLAYER_MIN_X = 65;
    const PLAYER_MAX_X = WORLD_W - 65;
    const PLAYER_MIN_Y = 88;
    const PLAYER_MAX_Y = WORLD_H - 72;

    const player = {
      x: 790,
      y: 530,
      vx: 0,
      vy: 0,
      facing: 1,
      walkDist: 0,
      stepAccum: 0,
      scaleX: 1,
      scaleY: 1,
      targetX: null as number | null,
      targetY: null as number | null,
      path: [] as Array<{ x: number; y: number }>,
      pendingRoomClick: null as RoomId | null,
      pendingPropClick: null as InteractiveWorldProp | null,
      activity: 'walk' as CrewActivity,
      activityTimer: 0,
      bubble: '',
    };

    // Camera zoom, drag-pan & viewport state clamped inside 2280x1320 expanded map
    let cameraZoom = 1.0;
    let targetZoom = 1.0;
    let zoomAnchorCanvas = { x: VIEW_W / 2, y: VIEW_H / 2 };
    let manualPanActive = false;
    let panStartClient: { x: number; y: number } | null = null;
    let panStartCam = { x: 0, y: 0 };
    let isPanningMap = false;
    let isDraggingRadar = false;
    let radarDragMoved = false;
    let radarStartCanvas = { cx: 0, cy: 0 };

    let camX = Math.max(0, Math.min(WORLD_W - VIEW_W, player.x - VIEW_W / 2));
    let camY = Math.max(0, Math.min(WORLD_H - VIEW_H, player.y - VIEW_H / 2));

    let lastNearRoom: RoomId | null = null;
    let lastNearPropId: InteractiveWorldProp['id'] | null = null;
    let lastNearCrewSig = '';
    let lastNearWallE = false;
    let lastCurrentRoom: RoomId | null = null;
    let lastJoinCrewNonce = stateRef.current.joinCrewNonce || 0;
    let lastCadetEmoteNonce = stateRef.current.cadetEmoteCommand?.nonce || 0;
    let lastWallECmdNonce = stateRef.current.wallECommand?.nonce || 0;
    let lastZoomAttr = '';
    let lastPanAttr = '';
    const keysPressed = new Set<string>();

    // Cute Pixar-inspired WALL·E Robot Companion (spawned visibly clear of EVA doorway & Cadet)
    const wallE = {
      x: 912,
      y: 514,
      facing: -1,
      treadDist: 0,
      activity: 'wave_cadet' as WallEActivity,
      activityTimer: 2.6,
      choreIdx: 1,
      goalX: WALL_E_ENVIRONMENT_CHORES[1].x as number | null,
      goalY: WALL_E_ENVIRONMENT_CHORES[1].y as number | null,
      path: [] as Array<{ x: number; y: number }>,
      pathKey: '',
      headTilt: -0.08,
      blinkTimer: 3.1,
      bubble: 'Waall-E! ♥ Click me!',
      bubbleTimer: 3.6,
      crewInteractCooldown: 2.4,
      cadetGreetCooldown: 3.0,
      exchangeSeed: 0,
    };

    // Non-repeating Crew Director decks & fresh schedule choreography timers
    const scheduleDeck = new ShuffleDeck<CrewScheduleMode>(SCHEDULE_MODE_DECK_ITEMS);
    const roomDeck = new ShuffleDeck<RoomId>(OUTPOST_ROOMS.map((r) => r.id));
    const sameRoomChatDeck = new ShuffleDeck(SAME_ROOM_CHITCHAT_LINES);
    const seriousPlayDeck = new ShuffleDeck(SERIOUS_PLAY_SCENES);
    const cadetJoinDeck = new ShuffleDeck(CADET_JOIN_REACTIONS);
    const roomWorkDecks: Record<RoomId | 'mess_lounge', ShuffleDeck<string>> = {
      power: new ShuffleDeck(ROOM_WORK_LINES.power),
      lifesupport: new ShuffleDeck(ROOM_WORK_LINES.lifesupport),
      hydroponics: new ShuffleDeck(ROOM_WORK_LINES.hydroponics),
      foodlab: new ShuffleDeck(ROOM_WORK_LINES.foodlab),
      shield: new ShuffleDeck(ROOM_WORK_LINES.shield),
      eva: new ShuffleDeck(ROOM_WORK_LINES.eva),
      comms: new ShuffleDeck(ROOM_WORK_LINES.comms),
      academy: new ShuffleDeck(ROOM_WORK_LINES.academy),
      mess_lounge: new ShuffleDeck(ROOM_WORK_LINES.mess_lounge),
    };

    let activeScheduleMode: CrewScheduleMode = 'pair_work';
    let scheduleTimer = 14.0;
    let pairRotationIdx = 0;
    let cafeRotationIdx = 0;
    let activeCafePreset = pickCrewCafeSeating(0);
    let wasFeastActive = false;
    let sameRoomMeetCooldown = 4.0;
    let pairMeetCooldown = 5.5;
    let sisMeetCooldown = 7.5;
    let seriousPlayTimeout = 0;
    let pendingPlayScene = seriousPlayDeck.next();

    // Pre-allocated zero-GC particle ring buffer
    const particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 3,
      color: '#38BDF8',
    }));
    let particleHead = 0;

    const spawnParticle = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      size: number,
      color: string,
      maxLife: number
    ) => {
      const p = particles[particleHead];
      particleHead = (particleHead + 1) % MAX_PARTICLES;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.size = size;
      p.color = color;
      p.life = 0;
      p.maxLife = maxLife;
    };

    // 4 AI Astronaut Crewmates (Han & Feng = Homies/Bros, Kun & Xin = Sisters)
    const npcs: NpcCrewmate[] = [
      {
        roleId: 'feng',
        name: 'Tech-Feng',
        color: '#F59E0B',
        skinColor: '#FDBA74',
        x: 940,
        y: 526,
        vx: 0,
        vy: 0,
        facing: 1,
        walkDist: 0,
        policy: 'orbiter',
        targetIdx: 1,
        timer: 0,
        activity: 'walk',
        activityTimer: 0,
        workShiftTimer: 2.8,
        chatCooldown: 2,
        bubble: '',
        seatIdx: 2,
        goalX: null,
        goalY: null,
        goalFacing: null,
        path: [],
        pathKey: '',
        pendingAction: null,
        pendingDuration: 0,
        pendingBubble: '',
      },
      {
        roleId: 'xin',
        name: 'Bio-Xin',
        color: '#10B981',
        skinColor: '#FED7AA',
        x: 1310,
        y: 310,
        vx: 0,
        vy: 0,
        facing: -1,
        walkDist: 0,
        policy: 'patroller',
        targetIdx: 4,
        timer: 0,
        activity: 'walk',
        activityTimer: 0,
        workShiftTimer: 3.1,
        chatCooldown: 3,
        bubble: '',
        seatIdx: 3,
        goalX: null,
        goalY: null,
        goalFacing: null,
        path: [],
        pathKey: '',
        pendingAction: null,
        pendingDuration: 0,
        pendingBubble: '',
      },
      {
        roleId: 'kun',
        name: 'Shield-Kun',
        color: '#A855F7',
        skinColor: '#FDBA74',
        x: 270,
        y: 860,
        vx: 0,
        vy: 0,
        facing: 1,
        walkDist: 0,
        policy: 'sentry',
        targetIdx: 0,
        timer: 0,
        activity: 'walk',
        activityTimer: 0,
        workShiftTimer: 2.9,
        chatCooldown: 4,
        bubble: '',
        seatIdx: 1,
        goalX: null,
        goalY: null,
        goalFacing: null,
        path: [],
        pathKey: '',
        pendingAction: null,
        pendingDuration: 0,
        pendingBubble: '',
      },
      {
        roleId: 'han',
        name: 'Commander-Han',
        color: '#EF4444',
        skinColor: '#FED7AA',
        x: 1030,
        y: 530,
        vx: 0,
        vy: 0,
        facing: -1,
        walkDist: 0,
        policy: 'commander',
        targetIdx: 0,
        timer: 0,
        isCommander: true,
        activity: 'walk',
        activityTimer: 0,
        workShiftTimer: 3.2,
        chatCooldown: 1.5,
        bubble: '',
        seatIdx: 0,
        goalX: null,
        goalY: null,
        goalFacing: null,
        path: [],
        pathKey: '',
        pendingAction: null,
        pendingDuration: 0,
        pendingBubble: '',
      },
    ];

    // Hallway-aligned waypoints across all 8 rooms + Crew Mess Lounge (table-free y=740 aisle!)
    const orbiterWaypoints = [
      { x: 270, y: 310 },
      { x: 270, y: 530 },
      { x: 790, y: 530 },
      { x: 790, y: 310 },
      { x: 790, y: 530 },
      { x: 1842, y: 530 },
      { x: 1842, y: 740 },
      { x: 1842, y: 530 },
      { x: 270, y: 530 },
    ];

    const patrolWaypoints = [
      { x: 1310, y: 310 },
      { x: 1310, y: 530 },
      { x: 1842, y: 530 },
      { x: 1842, y: 310 },
      { x: 1842, y: 530 },
      { x: 1842, y: 740 },
      { x: 1842, y: 530 },
      { x: 790, y: 530 },
      { x: 1310, y: 530 },
    ];

    const sentryWaypoints = [
      { x: 270, y: 860 },
      { x: 270, y: 1215 },
      { x: 270, y: 860 },
      { x: 270, y: 530 },
      { x: 790, y: 530 },
      { x: 790, y: 860 },
      { x: 790, y: 530 },
      { x: 1310, y: 530 },
      { x: 1310, y: 860 },
      { x: 1310, y: 530 },
      { x: 270, y: 530 },
    ];

    const commanderWaypoints = [
      { x: 1120, y: 530 },
      { x: 1842, y: 530 },
      { x: 1842, y: 310 },
      { x: 1842, y: 530 },
      { x: 1842, y: 740 },
      { x: 1842, y: 530 },
      { x: 790, y: 530 },
      { x: 790, y: 860 },
      { x: 790, y: 530 },
      { x: 270, y: 530 },
      { x: 270, y: 1215 },
      { x: 270, y: 530 },
    ];

    const getCanvasMetrics = () => {
      const rect = canvas.getBoundingClientRect();
      const aspectCanvas = VIEW_W / VIEW_H;
      const aspectRect = rect.width / Math.max(1, rect.height);
      let drawW = rect.width;
      let drawH = rect.height;
      let offX = 0;
      let offY = 0;
      if (aspectRect > aspectCanvas) {
        drawW = rect.height * aspectCanvas;
        offX = (rect.width - drawW) / 2;
      } else {
        drawH = rect.width / aspectCanvas;
        offY = (rect.height - drawH) / 2;
      }
      return { rect, drawW: Math.max(1, drawW), drawH: Math.max(1, drawH), offX, offY };
    };

    const screenToCanvas = (clientX: number, clientY: number) => {
      const { rect, drawW, drawH, offX, offY } = getCanvasMetrics();
      const cx = ((clientX - rect.left - offX) / drawW) * VIEW_W;
      const cy = ((clientY - rect.top - offY) / drawH) * VIEW_H;
      return { cx, cy };
    };

    const canvasToWorld = (cx: number, cy: number) => ({
      wx: cx / cameraZoom + camX,
      wy: cy / cameraZoom + camY,
    });

    const setPlayerDestination = (destX: number, destY: number, useCorridor = true) => {
      const clampedX = Math.max(PLAYER_MIN_X, Math.min(PLAYER_MAX_X, destX));
      const clampedY = Math.max(PLAYER_MIN_Y, Math.min(PLAYER_MAX_Y, destY));
      player.targetX = clampedX;
      player.targetY = clampedY;
      player.path = useCorridor
        ? buildOutpostCorridorPath(player.x, player.y, clampedX, clampedY)
        : [{ x: clampedX, y: clampedY }];
    };

    const activateProp = (prop: InteractiveWorldProp) => {
      player.scaleX = 1.16;
      player.scaleY = 0.84;
      spaceAudio.playBreakerClick(true);

      if (prop.id === 'lounge-eat') {
        player.activity = 'eat';
        player.activityTimer = 3.2;
        player.bubble = '🍽️ Yum! Fresh Fuel!';
      } else if (prop.id === 'lounge-rest') {
        player.activity = 'rest';
        player.activityTimer = 3.6;
        player.bubble = '💤 Recharging in Pod!';
      } else if (prop.id === 'lounge-dance') {
        player.activity = 'dance';
        player.activityTimer = 4.5;
        player.bubble = '♪ Boogie Time!';
      } else {
        player.activity = 'chat';
        player.activityTimer = 2.0;
        player.bubble = '🛰️ Checked & Clean!';
      }

      for (let i = 0; i < 12; i++) {
        const ang = (Math.PI * 2 * i) / 12;
        spawnParticle(
          prop.x,
          prop.y,
          Math.cos(ang) * 58,
          Math.sin(ang) * 58,
          3.4,
          prop.accentColor,
          0.65
        );
      }

      stateRef.current.onInteractProp?.({ id: prop.id, label: prop.label });
    };

    const triggerCadetJoinCrew = (preferredNpc?: NpcCrewmate) => {
      let target = preferredNpc;
      if (!target) {
        let bestD = Infinity;
        for (const n of npcs) {
          const d = Math.hypot(n.x - player.x, n.y - player.y);
          if (d < bestD) {
            bestD = d;
            target = n;
          }
        }
      }
      if (!target) return;

      const dist = Math.hypot(target.x - player.x, target.y - player.y);
      if (dist > 95) {
        manualPanActive = false;
        setPlayerDestination(target.x - target.facing * 44, target.y + 8, true);
        player.pendingRoomClick = null;
        player.pendingPropClick = null;
        player.bubble = `Joining ${target.name}!`;
        spaceAudio.playBreakerClick(true);
        return;
      }

      const joinedVibe: CrewIdleActivity =
        target.activity === 'walk'
          ? 'high_five'
          : isWorkingActivity(target.activity)
          ? 'wave'
          : target.activity;
      player.targetX = null;
      player.targetY = null;
      player.path = [];
      player.pendingRoomClick = null;
      player.pendingPropClick = null;
      player.scaleX = 1.12;
      player.scaleY = 0.88;
      player.facing = target.x >= player.x ? 1 : -1;
      player.activity = joinedVibe;
      player.activityTimer = 3.4;
      player.bubble =
        joinedVibe === 'wave'
          ? '🔧 Helping out!'
          : joinedVibe === 'dance'
          ? '♪ Grooving together!'
          : joinedVibe === 'eat'
          ? '🍽️ Snack buddies!'
          : joinedVibe === 'rest'
          ? '💤 Chilling together!'
          : joinedVibe === 'stargaze'
          ? '🌍 Thinking of Earth!'
          : '🤝 High-five crew!';

      target.facing = player.x >= target.x ? 1 : -1;
      if (target.activity === 'walk') {
        target.activity = 'wave';
        target.activityTimer = 2.8;
      }
      target.bubble = cadetJoinDeck.next();
      target.chatCooldown = 7;

      spaceAudio.playBreakerClick(true);
      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * 2 * i) / 8;
        spawnParticle(
          (player.x + target.x) / 2,
          (player.y + target.y) / 2 - 22,
          Math.cos(ang) * 42,
          Math.sin(ang) * 42 - 14,
          3.2,
          target.color,
          0.65
        );
      }
    };

    const movePlayerViaRadar = (cx: number, cy: number) => {
      const normX = Math.max(0, Math.min(1, (cx - RADAR_X) / RADAR_W));
      const normY = Math.max(0, Math.min(1, (cy - RADAR_Y) / RADAR_H));
      const destX = Math.max(PLAYER_MIN_X, Math.min(PLAYER_MAX_X, normX * WORLD_W));
      const destY = Math.max(PLAYER_MIN_Y, Math.min(PLAYER_MAX_Y, normY * WORLD_H));
      manualPanActive = false;
      setPlayerDestination(destX, destY, true);
      player.pendingRoomClick = null;
      player.pendingPropClick = null;
      player.activity = 'walk';
      player.bubble = '';
      spawnParticle(destX, destY, 0, -24, 3.8, '#22D3EE', 0.45);
    };

    const panCameraViaRadar = (cx: number, cy: number) => {
      const normX = Math.max(0, Math.min(1, (cx - RADAR_X) / RADAR_W));
      const normY = Math.max(0, Math.min(1, (cy - RADAR_Y) / RADAR_H));
      const focusWorldX = normX * WORLD_W;
      const focusWorldY = normY * WORLD_H;
      const visW = VIEW_W / cameraZoom;
      const visH = VIEW_H / cameraZoom;
      const clamped = clampCameraPosition(
        focusWorldX - visW / 2,
        focusWorldY - visH / 2,
        cameraZoom,
        VIEW_W,
        VIEW_H,
        WORLD_W,
        WORLD_H
      );
      camX = clamped.camX;
      camY = clamped.camY;
      manualPanActive = true;
    };

    const triggerCadetEmote = (emote: CadetEmoteId) => {
      const spec = CADET_EMOTES.find((e) => e.id === emote) || CADET_EMOTES[0];
      player.targetX = null;
      player.targetY = null;
      player.path = [];
      player.pendingRoomClick = null;
      player.pendingPropClick = null;
      player.activity = emote;
      player.activityTimer = 4.2;
      player.bubble = spec.bubble;
      player.scaleX = emote === 'sad' ? 0.94 : 1.14;
      player.scaleY = emote === 'sad' ? 1.06 : 0.86;
      canvas.dataset.cadetEmote = emote;

      spaceAudio.playBreakerClick(emote !== 'sad');
      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * 2 * i) / 8;
        spawnParticle(
          player.x,
          player.y - 26,
          Math.cos(ang) * 34,
          emote === 'sad' ? 16 + Math.sin(ang) * 14 : Math.sin(ang) * 34 - 16,
          3.1,
          spec.accentColor,
          0.7
        );
      }

      // Nearby crewmate gently reacts while preserving their exact personality!
      let closestNpc: NpcCrewmate | null = null;
      let closestDist = 148;
      for (const n of npcs) {
        if (n.goalX !== null || n.activity === 'eat' || n.activity === 'rest') continue;
        const d = Math.hypot(n.x - player.x, n.y - player.y);
        if (d < closestDist) {
          closestDist = d;
          closestNpc = n;
        }
      }
      if (closestNpc && closestNpc.chatCooldown <= 5) {
        const reaction = pickCrewReactionToCadetEmote(closestNpc.roleId, emote);
        closestNpc.facing = player.x >= closestNpc.x ? 1 : -1;
        closestNpc.activity = reaction.activity;
        closestNpc.activityTimer = 3.2;
        closestNpc.bubble = reaction.line;
        closestNpc.chatCooldown = 9;
      }

      if (emote === 'sad' && Math.hypot(wallE.x - player.x, wallE.y - player.y) < 155) {
        wallE.facing = player.x >= wallE.x ? 1 : -1;
        wallE.activity = 'share_love';
        wallE.activityTimer = 3.2;
        wallE.bubble = 'Beep ♥ WALL-E sends you a warm hug!';
        wallE.bubbleTimer = 3.5;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement | null)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') return;

      const { shellState: curShell, activeModalRoom: curModal, isModalOpen: modalOpen } =
        stateRef.current;
      if (curShell !== 'playing' || curModal !== null || modalOpen) return;

      const code = e.code;
      if (
        code === 'KeyW' ||
        code === 'KeyA' ||
        code === 'KeyS' ||
        code === 'KeyD' ||
        code === 'ArrowUp' ||
        code === 'ArrowLeft' ||
        code === 'ArrowDown' ||
        code === 'ArrowRight'
      ) {
        keysPressed.add(code);
        manualPanActive = false;
        player.targetX = null;
        player.targetY = null;
        player.path = [];
        player.pendingRoomClick = null;
        player.pendingPropClick = null;
        player.activity = 'walk';
        player.bubble = '';
      }

      if (code === 'Equal' || code === 'NumpadAdd') {
        zoomAnchorCanvas = { x: VIEW_W / 2, y: VIEW_H / 2 };
        targetZoom = Math.min(MAX_MAP_ZOOM, Number((targetZoom + 0.15).toFixed(2)));
      } else if (code === 'Minus' || code === 'NumpadSubtract') {
        zoomAnchorCanvas = { x: VIEW_W / 2, y: VIEW_H / 2 };
        targetZoom = Math.max(MIN_MAP_ZOOM, Number((targetZoom - 0.15).toFixed(2)));
      } else if (code === 'Digit0') {
        zoomAnchorCanvas = { x: VIEW_W / 2, y: VIEW_H / 2 };
        targetZoom = 1.0;
        manualPanActive = false;
      } else if (code === 'KeyC' && !e.repeat) {
        manualPanActive = false;
      } else if (code === 'KeyH' && !e.repeat) {
        e.preventDefault();
        triggerCadetJoinCrew();
      } else if (code === 'KeyT' && !e.repeat) {
        if (lastNearWallE) {
          e.preventDefault();
          spaceAudio.playWallEChirp('happy');
          stateRef.current.onInteractWallE?.();
        }
      } else if ((code === 'Digit1' || code === 'Numpad1') && !e.repeat) {
        e.preventDefault();
        triggerCadetEmote('happy');
      } else if ((code === 'Digit2' || code === 'Numpad2') && !e.repeat) {
        e.preventDefault();
        triggerCadetEmote('working');
      } else if ((code === 'Digit3' || code === 'Numpad3') && !e.repeat) {
        e.preventDefault();
        triggerCadetEmote('sad');
      } else if ((code === 'Digit4' || code === 'Numpad4') && !e.repeat) {
        e.preventDefault();
        triggerCadetEmote('thinking');
      }

      if ((code === 'KeyE' || code === 'Space') && !e.repeat) {
        if (lastNearRoom) {
          e.preventDefault();
          player.scaleX = 1.18;
          player.scaleY = 0.82;
          spaceAudio.playBreakerClick(true);
          stateRef.current.onSelectRoom(lastNearRoom);
        } else if (lastNearPropId) {
          const prop = INTERACTIVE_PROPS.find((p) => p.id === lastNearPropId);
          if (prop) {
            e.preventDefault();
            activateProp(prop);
          }
        } else if (lastNearWallE) {
          e.preventDefault();
          spaceAudio.playWallEChirp('happy');
          stateRef.current.onInteractWallE?.();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };

    const clearInputs = () => {
      keysPressed.clear();
      isDraggingRadar = false;
      radarDragMoved = false;
      panStartClient = null;
      isPanningMap = false;
      canvas.style.cursor = 'grab';
    };

    const handleWheel = (e: WheelEvent) => {
      const { shellState: curShell, activeModalRoom: curModal } = stateRef.current;
      if (curShell !== 'playing' || curModal !== null) return;
      e.preventDefault();
      const { cx, cy } = screenToCanvas(e.clientX, e.clientY);
      zoomAnchorCanvas = { x: cx, y: cy };
      const delta = e.deltaY < 0 ? 0.12 : -0.12;
      targetZoom = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, Number((targetZoom + delta).toFixed(2))));
    };

    const dispatchWorldClick = (clientX: number, clientY: number) => {
      const { cx, cy } = screenToCanvas(clientX, clientY);
      const { wx, wy } = canvasToWorld(cx, cy);
      player.activity = 'walk';
      player.bubble = '';
      manualPanActive = false;

      // 1. Center Workstation Console Desks OR Room Title Banners ALWAYS prioritize opening the Station
      const directConsoleOrBannerRoom = OUTPOST_ROOMS.find(
        (r) =>
          (Math.abs(wx - r.consoleX) <= 78 && Math.abs(wy - r.consoleY) <= 52) ||
          (wx >= r.x + 8 && wx <= r.x + r.w - 8 && wy >= r.y && wy <= r.y + 46)
      );
      if (directConsoleOrBannerRoom) {
        const playerInRoom = detectRoomAtPoint(player.x, player.y) === directConsoleOrBannerRoom.id;
        const distToConsole = Math.hypot(
          player.x - directConsoleOrBannerRoom.consoleX,
          player.y - (directConsoleOrBannerRoom.consoleY + 62)
        );
        if (playerInRoom || distToConsole < 120) {
          player.scaleX = 1.18;
          player.scaleY = 0.82;
          spaceAudio.playBreakerClick(true);
          stateRef.current.onSelectRoom(directConsoleOrBannerRoom.id);
        } else {
          setPlayerDestination(
            directConsoleOrBannerRoom.consoleX,
            directConsoleOrBannerRoom.consoleY + 62,
            true
          );
          player.pendingRoomClick = directConsoleOrBannerRoom.id;
          player.pendingPropClick = null;
        }
        return;
      }

      // 2. Interactive World Props (Satellites, Solar Wing Farm, Rover, Lounge Table/Pods/Dance)
      const clickedProp = INTERACTIVE_PROPS.find(
        (p) => Math.abs(wx - p.x) <= p.hitW / 2 && Math.abs(wy - p.y) <= p.hitH / 2
      );
      if (clickedProp) {
        const dist = Math.hypot(player.x - clickedProp.approachX, player.y - clickedProp.approachY);
        if (dist <= clickedProp.triggerRadius) {
          activateProp(clickedProp);
        } else {
          setPlayerDestination(clickedProp.approachX, clickedProp.approachY, true);
          player.pendingPropClick = clickedProp;
          player.pendingRoomClick = null;
        }
        return;
      }

      // 2b. Direct click on WALL-E Robot Companion
      if (Math.hypot(wx - wallE.x, wy - (wallE.y - 12)) <= 34) {
        wallE.facing = player.x >= wallE.x ? 1 : -1;
        wallE.activity = 'wave_cadet';
        wallE.activityTimer = 2.6;
        wallE.bubble = 'Waall-E! ♥ Hello friend!';
        wallE.bubbleTimer = 3.2;
        spaceAudio.playWallEChirp('happy');
        for (let i = 0; i < 8; i++) {
          const ang = (Math.PI * 2 * i) / 8;
          spawnParticle(
            wallE.x,
            wallE.y - 20,
            Math.cos(ang) * 40,
            Math.sin(ang) * 40 - 12,
            3.0,
            '#FACC15',
            0.65
          );
        }
        stateRef.current.onInteractWallE?.();
        return;
      }

      const clickedRoom = OUTPOST_ROOMS.find(
        (r) => wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h
      );
      const playerCurZone = detectRoomAtPoint(player.x, player.y);

      // 3. Direct click on a friendly Astronaut crewmate (only when NOT clicking to enter another station from outside)
      const clickedNpc = npcs.find((n) => Math.hypot(wx - n.x, wy - (n.y - 12)) <= 26);
      if (clickedNpc && (!clickedRoom || playerCurZone === clickedRoom.id)) {
        triggerCadetJoinCrew(clickedNpc);
        return;
      }

      // 4. Outpost Room floor/interior -> enter or open station reliably!
      if (clickedRoom) {
        const distToConsole = Math.hypot(
          player.x - clickedRoom.consoleX,
          player.y - (clickedRoom.consoleY + 62)
        );
        if (playerCurZone === clickedRoom.id || distToConsole < 120) {
          player.scaleX = 1.18;
          player.scaleY = 0.82;
          spaceAudio.playBreakerClick(true);
          stateRef.current.onSelectRoom(clickedRoom.id);
        } else {
          setPlayerDestination(clickedRoom.consoleX, clickedRoom.consoleY + 62, true);
          player.pendingRoomClick = clickedRoom.id;
          player.pendingPropClick = null;
        }
      } else {
        setPlayerDestination(wx, wy, true);
        player.pendingRoomClick = null;
        player.pendingPropClick = null;
      }

      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        spawnParticle(
          wx,
          wy,
          Math.cos(angle) * 38,
          Math.sin(angle) * 38,
          3,
          '#38BDF8',
          0.35
        );
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      const { shellState: curShell, activeModalRoom: curModal } = stateRef.current;
      if (curShell !== 'playing' || curModal !== null) return;

      const { cx, cy } = screenToCanvas(e.clientX, e.clientY);

      // 1. Check Base Radar Minimap (click to walk, drag to pan viewport)
      if (cx >= RADAR_X && cx <= RADAR_X + RADAR_W && cy >= RADAR_Y && cy <= RADAR_Y + RADAR_H) {
        isDraggingRadar = true;
        radarDragMoved = false;
        radarStartCanvas = { cx, cy };
        try {
          canvas.setPointerCapture?.(e.pointerId);
        } catch {
          // Ignore if synthetic pointer event has no active pointerId
        }
        return;
      }

      // 2. Check Zoom Controls directly under Base Radar
      if (
        cx >= RADAR_X &&
        cx <= RADAR_X + RADAR_W &&
        cy >= ZOOM_BAR_Y &&
        cy <= ZOOM_BAR_Y + ZOOM_BAR_H
      ) {
        zoomAnchorCanvas = { x: VIEW_W / 2, y: VIEW_H / 2 };
        const relX = cx - RADAR_X;
        if (relX <= 46) {
          targetZoom = Math.max(MIN_MAP_ZOOM, Number((targetZoom - 0.18).toFixed(2)));
        } else if (relX >= RADAR_W - 46) {
          targetZoom = Math.min(MAX_MAP_ZOOM, Number((targetZoom + 0.18).toFixed(2)));
        } else {
          targetZoom = 1.0;
          manualPanActive = false;
        }
        spaceAudio.playBreakerClick(true);
        return;
      }

      // 3. Check Center Cadet chip when free-panning
      if (
        manualPanActive &&
        cx >= RADAR_X &&
        cx <= RADAR_X + RADAR_W &&
        cy >= CENTER_BAR_Y &&
        cy <= CENTER_BAR_Y + CENTER_BAR_H
      ) {
        manualPanActive = false;
        spaceAudio.playBreakerClick(true);
        return;
      }

      // 4. Begin map click-or-drag pan gesture
      panStartClient = { x: e.clientX, y: e.clientY };
      panStartCam = { x: camX, y: camY };
      isPanningMap = false;
      try {
        canvas.setPointerCapture?.(e.pointerId);
      } catch {
        // Ignore if synthetic pointer event has no active pointerId
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingRadar) {
        const { cx, cy } = screenToCanvas(e.clientX, e.clientY);
        if (Math.hypot(cx - radarStartCanvas.cx, cy - radarStartCanvas.cy) > 4) {
          radarDragMoved = true;
        }
        if (radarDragMoved) {
          panCameraViaRadar(cx, cy);
        }
        return;
      }

      if (panStartClient) {
        const dxClient = e.clientX - panStartClient.x;
        const dyClient = e.clientY - panStartClient.y;
        if (!isPanningMap && Math.hypot(dxClient, dyClient) > 7) {
          isPanningMap = true;
          manualPanActive = true;
          canvas.style.cursor = 'grabbing';
        }
        if (isPanningMap) {
          const { drawW, drawH } = getCanvasMetrics();
          const deltaWorldX = -(dxClient * (VIEW_W / drawW)) / cameraZoom;
          const deltaWorldY = -(dyClient * (VIEW_H / drawH)) / cameraZoom;
          const clamped = clampCameraPosition(
            panStartCam.x + deltaWorldX,
            panStartCam.y + deltaWorldY,
            cameraZoom,
            VIEW_W,
            VIEW_H,
            WORLD_W,
            WORLD_H
          );
          camX = clamped.camX;
          camY = clamped.camY;
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (isDraggingRadar) {
        const { cx, cy } = screenToCanvas(e.clientX, e.clientY);
        if (!radarDragMoved) {
          movePlayerViaRadar(cx, cy);
          spaceAudio.playBreakerClick(true);
        }
        isDraggingRadar = false;
        radarDragMoved = false;
        return;
      }

      if (panStartClient) {
        const wasPanning = isPanningMap;
        panStartClient = null;
        isPanningMap = false;
        canvas.style.cursor = 'grab';
        if (!wasPanning && e.target === canvas) {
          const { shellState: curShell, activeModalRoom: curModal } = stateRef.current;
          if (curShell === 'playing' && curModal === null) {
            dispatchWorldClick(e.clientX, e.clientY);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearInputs);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', clearInputs);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Draw Cartoon Spaceman Astronaut with smooth non-shaking behaviors, station poses & social reactions
    const drawAstronaut = (
      cx: number,
      cy: number,
      suitColor: string,
      skinColor: string,
      name: string,
      facing: number,
      walkDist: number,
      sx: number,
      sy: number,
      isPlayer: boolean,
      isCommander: boolean,
      activity: CrewActivity,
      bubble: string,
      timeSec: number,
      bubbleTier: boolean | number = false
    ) => {
      const isDancing = activity === 'dance';
      const isResting = activity === 'rest';
      const isEating = activity === 'eat';
      const isWaving = activity === 'wave';
      const isHighFive = activity === 'high_five';
      const isCheering = activity === 'cheer';
      const isStargazing = activity === 'stargaze';
      const isHappy = activity === 'happy';
      const isCadetWorking = activity === 'working';
      const isSad = activity === 'sad';
      const isThinking = activity === 'thinking';
      const isChatting = activity === 'chat' || isWaving || isHighFive || isCheering || isHappy;
      const isWorking = isWorkingActivity(activity) || isCadetWorking;

      // Smooth gentle waves (no erratic shaking/vibrating at high frequencies!)
      const danceWave = Math.sin(timeSec * 4.4);
      const calmPulse = Math.sin(timeSec * 2.1);
      const waveSweep = Math.sin(timeSec * 3.4);
      const stride = isDancing
        ? danceWave * 0.75
        : isWorking || isStargazing || isWaving || isHighFive || isEating || isResting || isHappy || isSad || isThinking
        ? 0
        : activity === 'stretch'
        ? 0
        : Math.sin(walkDist * 0.08);
      const bobY = isDancing
        ? Math.abs(Math.sin(timeSec * 4.4)) * 6.5
        : isHappy
        ? Math.abs(Math.sin(timeSec * 3.8)) * 5.0
        : isCheering || activity === 'stretch'
        ? Math.abs(Math.sin(timeSec * 2.6)) * 3.2
        : isSad
        ? -1.5 + Math.sin(timeSec * 1.6) * 0.8
        : isResting || isStargazing || isThinking
        ? Math.sin(timeSec * 1.6) * 1.0
        : isWorking
        ? Math.sin(timeSec * 2.0) * 1.1
        : Math.abs(stride) * 4.2;
      const legSwing = isResting || isWorking || isStargazing || isEating || isHappy || isSad || isThinking ? 0 : stride * 5.2;
      const armSwing = isDancing ? -Math.PI * 0.65 + danceWave * 0.25 : -stride * 5.0;
      const bodyTilt = isDancing
        ? Math.sin(timeSec * 2.8) * 0.08
        : isHappy
        ? Math.sin(timeSec * 3.8) * 0.06
        : isResting
        ? -0.2
        : isSad
        ? 0.1
        : isStargazing || isThinking
        ? -0.06
        : activity === 'scout'
        ? 0.04
        : 0;

      ctx.save();
      ctx.translate(cx, cy);

      // Soft ground shadow
      ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 26, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(0, -bobY);
      ctx.scale(sx * facing, sy);
      ctx.rotate(bodyTilt);

      // 1. Life-Support Oxygen Backpack + Telemetry Antenna
      ctx.fillStyle = '#CBD5E1';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(-21, -15, 11, 24, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = suitColor;
      ctx.fillRect(-19, -8, 7, 4);

      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, -15);
      ctx.lineTo(-16, -26);
      ctx.stroke();
      ctx.fillStyle = isCommander ? '#EF4444' : '#38BDF8';
      ctx.beginPath();
      ctx.arc(-16, -27, 2.6, 0, Math.PI * 2);
      ctx.fill();

      // 2. Back Arm (expressive smooth pose per behavior — never shaky)
      ctx.save();
      ctx.translate(-3, -6);
      const backArmAngle = isDancing
        ? -2.25 + Math.cos(timeSec * 4.4) * 0.24
        : isHappy
        ? -2.45 + Math.sin(timeSec * 3.8) * 0.22
        : isCheering || activity === 'stretch'
        ? -2.55 + Math.sin(timeSec * 2.6) * 0.14
        : isWaving || isHighFive
        ? -2.15 + waveSweep * 0.22
        : isSad
        ? 0.2
        : isThinking
        ? -0.4
        : activity === 'scout'
        ? -0.35
        : isWorking
        ? -0.75 + calmPulse * 0.1
        : isEating
        ? -0.65
        : -armSwing * 0.06;
      ctx.rotate(backArmAngle);
      ctx.fillStyle = '#E2E8F0';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.roundRect(-3.5, 0, 7, 13, 3.5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = suitColor;
      ctx.beginPath();
      ctx.arc(0, 14, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 3. Articulated Legs + Heavy Moon Boots
      ctx.save();
      ctx.translate(-5 - legSwing * 0.45, 9);
      ctx.fillStyle = '#E2E8F0';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-4.5, 0, 9, 11, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-5, 9, 12, 7, 3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(4 + legSwing * 0.45, 9);
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-4.5, 0, 9, 11, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = suitColor;
      ctx.fillRect(-3.5, 3, 7, 2.5);
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(-5, 9, 12, 7, 3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 4. Padded Spacesuit Torso
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.roundRect(-13, -12, 26, 23, 9);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = suitColor;
      ctx.beginPath();
      ctx.roundRect(-12.5, -11.5, 25, 8, 5);
      ctx.fill();

      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-12, 4, 24, 4.5);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(-3, 3.5, 7, 5.5);

      // Chest Life-Support Telemetry Pack
      ctx.fillStyle = '#E2E8F0';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-6, -4, 14, 9, 2.5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isCommander ? '#EF4444' : '#38BDF8';
      ctx.beginPath();
      ctx.arc(-2, 0.5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(3.5, 0.5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 5. Metallic Neck Ring
      ctx.fillStyle = suitColor;
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.roundRect(-11, -15, 22, 5.5, 3);
      ctx.fill();
      ctx.stroke();

      // 6. Big Cartoon Bubble Space Helmet (friendly warm eyes & smiles — no grumpy eyebrows!)
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(1, -28, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = suitColor;
      ctx.beginPath();
      ctx.roundRect(-15.5, -33, 5, 10, 2.5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.ellipse(4.5, -28, 11, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.ellipse(4.8, -27.2, 8.6, 7.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rosy Cheeks
      ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
      ctx.beginPath();
      ctx.arc(1.2, -25.2, 1.8, 0, Math.PI * 2);
      ctx.arc(9.8, -25.2, 1.8, 0, Math.PI * 2);
      ctx.fill();

      if (isResting) {
        // Peaceful closed eyes
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(2.8, -28.2, 1.8, 0.1, Math.PI - 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(8.6, -28.2, 1.8, 0.1, Math.PI - 0.1);
        ctx.stroke();
      } else if (isHappy) {
        // Joyful upside-down happy crescent eyes!
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(2.8, -28.0, 2.1, Math.PI + 0.2, -0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(8.6, -28.0, 2.1, Math.PI + 0.2, -0.2);
        ctx.stroke();
      } else {
        // Warm bright expressive cartoon eyes (slight upward glance when stargazing or thinking)
        const eyeY = isStargazing || isThinking ? -29.8 : isSad ? -27.8 : -28.8;
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(2.8, eyeY, 1.6, 0, Math.PI * 2);
        ctx.arc(8.6, eyeY, 1.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(2.3, eyeY - 0.5, 0.65, 0, Math.PI * 2);
        ctx.arc(8.1, eyeY - 0.5, 0.65, 0, Math.PI * 2);
        ctx.fill();

        if (isSad) {
          // Cute shimmering teardrop
          ctx.fillStyle = '#38BDF8';
          ctx.beginPath();
          ctx.arc(9.8, -25.2 + Math.abs(Math.sin(timeSec * 3.0)) * 1.4, 1.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (isWorking || isStargazing || isThinking) {
          // Gentle curious arched brows (friendly, never harsh/angry)
          ctx.strokeStyle = '#7C2D12';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(2.8, -31.0, 2.0, Math.PI + 0.3, -0.3);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(8.6, -31.0, 2.0, Math.PI + 0.3, -0.3);
          ctx.stroke();
        }
      }

      // Friendly Smile / Expressive Mouth
      ctx.strokeStyle = '#7C2D12';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (isSad) {
        // Cute small frown
        ctx.arc(5.8, -23.6, 2.4, Math.PI + 0.25, -0.25);
      } else if (isThinking) {
        // Curious tiny pondering 'o'
        ctx.arc(6.0, -24.8, 1.3, 0, Math.PI * 2);
      } else if (isDancing || isCheering || isHighFive || isHappy) {
        ctx.arc(5.8, -26.0, 3.2, 0.05, Math.PI - 0.05);
      } else if (isStargazing) {
        ctx.arc(5.8, -25.0, 1.9, 0.1, Math.PI - 0.1);
      } else {
        ctx.arc(5.8, -25.6, 2.6, 0.15, Math.PI - 0.15);
      }
      ctx.stroke();

      // Glass Visor Tint & Specular Highlight
      ctx.fillStyle = 'rgba(125, 211, 252, 0.24)';
      ctx.beginPath();
      ctx.ellipse(4.5, -28, 11, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.beginPath();
      ctx.ellipse(-0.5, -33.5, 3.6, 1.6, -0.45, 0, Math.PI * 2);
      ctx.fill();

      // 7. Front Articulated Arm + Behavior Props (smooth pose per activity, NO shaking)
      ctx.save();
      ctx.translate(-8, -7);
      const frontArmAngle = isDancing
        ? -2.1 + Math.sin(timeSec * 4.4) * 0.22
        : isHappy
        ? -2.35 - Math.sin(timeSec * 3.8) * 0.22
        : isSad
        ? 0.28
        : isThinking
        ? -1.85 + Math.sin(timeSec * 1.6) * 0.06
        : activity === 'stretch' || isCheering
        ? -2.45 + Math.cos(timeSec * 2.6) * 0.14
        : activity === 'scout'
        ? -2.25
        : isHighFive || isWaving
        ? -2.05 + waveSweep * 0.18
        : activity === 'calibrate'
        ? -1.15 + calmPulse * 0.14
        : activity === 'inspect' || activity === 'note_log' || activity === 'plan_prep' || activity === 'logic_clear' || activity === 'work' || isCadetWorking
        ? -1.05
        : isEating
        ? -0.95 + Math.sin(timeSec * 2.4) * 0.1
        : armSwing * 0.07;
      ctx.rotate(frontArmAngle);
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.roundRect(-4, 0, 8, 13, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = suitColor;
      ctx.beginPath();
      ctx.arc(0, 14.5, 4.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Smooth readable handheld cues by station behavior
      if (activity === 'inspect' || activity === 'note_log' || activity === 'plan_prep' || activity === 'work' || isCadetWorking) {
        ctx.fillStyle = activity === 'plan_prep' ? '#C084FC' : '#38BDF8';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-2, 16, 10, 6.5, 2);
        ctx.fill();
        ctx.stroke();
      } else if (activity === 'logic_clear') {
        // Crisp glowing emerald verified checkmark pad for Xin
        ctx.fillStyle = '#10B981';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(4, 19, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (activity === 'calibrate') {
        // Smooth rotating calibration ring
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(4, 19, 4.5, timeSec * 1.6, timeSec * 1.6 + Math.PI * 1.3);
        ctx.stroke();
      } else if (isEating) {
        // Cozy space snack bowl
        ctx.fillStyle = '#FBBF24';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(3, 18, 4.8, 0, Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      ctx.restore();

      // 8. Clean Nameplate Label (no crown on any astronaut)
      ctx.save();
      ctx.font =
        isPlayer || isCommander
          ? '700 12px "Outfit", sans-serif'
          : '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = isPlayer ? '#38BDF8' : isCommander ? '#FCA5A5' : '#E2E8F0';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 3.5;
      const labelY = cy - 52 - bobY;
      ctx.strokeText(name, cx, labelY);
      ctx.fillText(name, cx, labelY);

      // Cute floating speech bubble / icon cue (stagger height by role to avoid neighbor overlap)
      const activeBubble =
        bubble ||
        (isDancing
          ? '♪ Dance!'
          : isHappy
          ? '✨ Yay! So happy!'
          : isSad
          ? '💧 Feeling a bit blue...'
          : isThinking
          ? '💭 Hmm... thinking!'
          : isCadetWorking
          ? '🔧 Hard at work!'
          : isResting
          ? '💤 Nap Pod'
          : isEating
          ? '🍽️ Yum!'
          : isStargazing
          ? '🌍 Missing Earth'
          : activity === 'scout'
          ? '🧭 Scouting!'
          : activity === 'stretch'
          ? '⚡ Sporty Prep!'
          : activity === 'plan_prep'
          ? '📋 Meal & Game Plan'
          : activity === 'logic_clear'
          ? '✓ Logic Clear!'
          : activity === 'note_log'
          ? '📝 Logging Notes'
          : activity === 'calibrate'
          ? '⚙️ Tuning Smoothly'
          : isWorking
          ? '🔍 Inspecting'
          : '');
      if (activeBubble) {
        const tierLift = bubbleTier ? (typeof bubbleTier === 'number' ? bubbleTier * 24 : 24) : 0;
        let bubbleY = labelY - 19 - tierLift;
        const insideRoomObj = OUTPOST_ROOMS.find(
          (r) => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h
        );
        if (insideRoomObj) {
          bubbleY = Math.max(bubbleY, insideRoomObj.consoleY + 56);
        }
        ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
        const tw = Math.max(50, ctx.measureText(activeBubble).width + 18);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
        ctx.strokeStyle = isDancing || isHappy
          ? '#F472B6'
          : isEating
          ? '#34D399'
          : isThinking || isStargazing
          ? '#A78BFA'
          : isSad
          ? '#60A5FA'
          : isWorking
          ? '#F59E0B'
          : '#38BDF8';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(cx - tw / 2, bubbleY - 14, tw, 20, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#F8FAFC';
        ctx.fillText(activeBubble, cx, bubbleY);
      }

      if (isDancing) {
        const noteY = labelY - 36 - Math.abs(Math.sin(timeSec * 3.5)) * 6;
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#FACC15';
        ctx.fillText('♪', cx - 18, noteY);
        ctx.fillStyle = '#F472B6';
        ctx.fillText('♫', cx + 18, noteY - 4);
      } else if (isHappy) {
        const sparkY = labelY - 36 - Math.abs(Math.sin(timeSec * 3.5)) * 5;
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#FACC15';
        ctx.fillText('✨', cx - 20, sparkY);
        ctx.fillText('★', cx + 20, sparkY - 3);
      } else if (isThinking) {
        const dotY = labelY - 36 - Math.sin(timeSec * 2.2) * 3;
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#C084FC';
        ctx.fillText('?', cx + 20, dotY);
      } else if (isSad) {
        const dropY = labelY - 35 + Math.sin(timeSec * 2.0) * 2;
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#60A5FA';
        ctx.fillText('💧', cx + 20, dropY);
      } else if (isStargazing) {
        const starY = labelY - 36 - Math.sin(timeSec * 2.2) * 3;
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('🌍', cx - 16, starY);
        ctx.fillStyle = '#F472B6';
        ctx.fillText('♥', cx + 16, starY - 2);
      } else if (isHighFive || isCheering) {
        const sparkY = labelY - 36 - Math.abs(Math.sin(timeSec * 3.2)) * 4;
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#FACC15';
        ctx.fillText('★', cx + 20, sparkY);
      }

      ctx.restore();
    };

    // Draw 100% Pixar-inspired Cute WALL·E Robot with Tank Treads, Compactor Box, Solar Meter & Binocular Eyes
    const drawWallE = (timeSec: number, bubbleTier: boolean | number = false) => {
      const isDancing = wallE.activity === 'dance';
      const isWaving = wallE.activity === 'wave_cadet' || wallE.activity === 'share_love';
      const isWatering = wallE.activity === 'water_plants';
      const isPolishing = wallE.activity === 'polish_solar' || wallE.activity === 'tidy_env';
      const isReminding = wallE.activity === 'remind_knowledge';
      const isScanning = wallE.activity === 'scan';
      const isBlinking = wallE.blinkTimer < 0.14;

      const bodyBob = isDancing
        ? Math.abs(Math.sin(timeSec * 5.2)) * 4.5
        : wallE.activity === 'roll'
        ? Math.abs(Math.sin(wallE.treadDist * 0.16)) * 1.4
        : Math.sin(timeSec * 2.2) * 0.9;
      const bodyTilt = isDancing
        ? Math.sin(timeSec * 4.0) * 0.08
        : isReminding || isScanning
        ? 0.04
        : 0;

      ctx.save();
      ctx.translate(wallE.x, wallE.y);

      // Soft ground shadow
      ctx.fillStyle = 'rgba(2, 6, 23, 0.58)';
      ctx.beginPath();
      ctx.ellipse(0, 22, 24, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(0, -bodyBob);
      ctx.scale(wallE.facing, 1);
      ctx.rotate(bodyTilt);

      // Telemetry Cyan Scanner Cone when WALL·E is scanning a station
      if (isScanning) {
        const sweepY = Math.sin(timeSec * 7.5) * 14;
        const beamGrad = ctx.createLinearGradient(10, -28, 76, -8 + sweepY);
        beamGrad.addColorStop(0, 'rgba(34, 211, 238, 0.55)');
        beamGrad.addColorStop(1, 'rgba(34, 211, 238, 0.0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(10, -30);
        ctx.lineTo(78, -42 + sweepY);
        ctx.lineTo(78, 8 + sweepY);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#67E8F9';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(12, -30);
        ctx.lineTo(72, -17 + sweepY);
        ctx.stroke();
      }

      // 1. Back (Left/Far) Triangular Tank Tread + Drive Wheel
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(18, 0);
      ctx.lineTo(23, 19);
      ctx.lineTo(4, 19);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 2. Yellow Compactor Box Body
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(-14, -15, 28, 26, 3.5);
      ctx.fill();
      ctx.stroke();

      // Side hazard / weathered accent panel
      ctx.fillStyle = '#D97706';
      ctx.fillRect(-13, -3, 26, 13);

      // Upper steel chest control faceplate
      ctx.fillStyle = '#475569';
      ctx.fillRect(-12.5, -13.5, 25, 9.5);
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-12.5, -13.5, 25, 9.5);

      // Left grill & tiny red indicator
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-10.5, -12, 9, 4.5);
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(-6, -5.8, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Right Solar Charge Level Gauge (glowing yellow bars)
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(1, -12, 10, 6.5);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(2.5, -10.5, 7, 1.4);
      ctx.fillRect(2.5, -8.3, 7, 1.4);

      // Iconic WALL·E Badge (drawn upright regardless of facing!)
      ctx.save();
      ctx.scale(wallE.facing, 1);
      ctx.font = '900 5.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1E293B';
      ctx.fillText('WALL·', -2.5, 6.5);
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(8.5, 4.6, 3.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '900 4.8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('E', 8.5, 6.3);
      ctx.restore();

      // 3. Front (Near) Triangular Tank Tread + Animated Tread Lugs + Bogie Wheels
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-18, -1);
      ctx.lineTo(-6, -1);
      ctx.lineTo(-3, 20);
      ctx.lineTo(-22, 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Animated lug grooves scrolling smoothly along tread track
      const treadPhase = ((wallE.treadDist * 0.25) % 6 + 6) % 6;
      ctx.fillStyle = '#475569';
      for (let ty = 1 + (treadPhase % 4); ty < 18; ty += 4.5) {
        ctx.fillRect(-19.5, ty, 14, 1.8);
      }
      ctx.fillStyle = '#94A3B8';
      ctx.beginPath();
      ctx.arc(-15, 16.5, 3.3, 0, Math.PI * 2);
      ctx.arc(-7.5, 16.5, 2.7, 0, Math.PI * 2);
      ctx.fill();

      // 4. Articulated Twin Manipulator Claw Arms
      ctx.save();
      ctx.translate(12, -8);
      const frontArmAngle = isDancing
        ? -1.25 + Math.sin(timeSec * 5.4) * 0.45
        : isWaving
        ? -1.45 + Math.sin(timeSec * 4.5) * 0.28
        : isWatering
        ? -0.35 + Math.sin(timeSec * 3.0) * 0.14
        : isPolishing
        ? -0.55 + Math.sin(timeSec * 4.2) * 0.35
        : isReminding
        ? -1.05
        : -0.25 + Math.sin(timeSec * 2.1) * 0.08;
      ctx.rotate(frontArmAngle);
      ctx.fillStyle = '#CBD5E1';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.roundRect(-2, -2.5, 13, 5, 2);
      ctx.fill();
      ctx.stroke();
      // Claw fingers
      ctx.fillStyle = '#94A3B8';
      ctx.beginPath();
      ctx.roundRect(10, -4.5, 6, 3.2, 1.2);
      ctx.roundRect(10, 1.2, 6, 3.2, 1.2);
      ctx.fill();
      ctx.stroke();

      // Watering sprinkler droplets when tending Bio-Dome/Food Lab plants
      if (isWatering) {
        ctx.fillStyle = '#38BDF8';
        for (let d = 0; d < 3; d++) {
          const dropOff = ((timeSec * 22 + d * 7) % 14);
          ctx.beginPath();
          ctx.arc(17 + dropOff * 0.4, 2 + dropOff * 0.7, 2.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // Left/back helper arm
      ctx.save();
      ctx.translate(-12, -8);
      const backArmAngle = isDancing
        ? -1.9 - Math.sin(timeSec * 5.4) * 0.45
        : isWaving
        ? -2.55
        : -2.75 + Math.cos(timeSec * 2.1) * 0.08;
      ctx.rotate(backArmAngle);
      ctx.fillStyle = '#94A3B8';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-2, -2.2, 11, 4.4, 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 5. Articulated Neck & Twin Binocular Camera Lens Eyes
      ctx.fillStyle = '#64748B';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(-4, -26, 8, 13, 3);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(0, -31);
      ctx.rotate(wallE.headTilt + (isDancing ? Math.sin(timeSec * 4.8) * 0.1 : 0));

      // Two slightly expressive teardrop binocular eye pods
      [
        { ex: -7.5, ey: -1, tilt: -0.14 },
        { ex: 8.5, ey: 0, tilt: 0.14 },
      ].forEach((eye) => {
        ctx.save();
        ctx.translate(eye.ex, eye.ey);
        ctx.rotate(eye.tilt);
        ctx.fillStyle = '#CBD5E1';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8.8, 7.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (isBlinking) {
          ctx.fillStyle = '#64748B';
          ctx.beginPath();
          ctx.ellipse(0, 0, 6.2, 5.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(-5, 0);
          ctx.lineTo(5, 0);
          ctx.stroke();
        } else {
          // Dark lens cup + sapphire blue optics + dual specular sparkles
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.arc(0.4, 0, 5.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#1D4ED8';
          ctx.beginPath();
          ctx.arc(0.4, 0, 3.6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#020617';
          ctx.beginPath();
          ctx.arc(0.4, 0, 1.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(-1.1, -1.6, 1.35, 0, Math.PI * 2);
          ctx.arc(1.8, 1.4, 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      ctx.restore();

      ctx.restore(); // end flip/tilt/bob

      // 6. Floating Nameplate & Speech Bubble (drawn relative to local translated origin 0,0!)
      ctx.font = '800 11px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 3.5;
      const labelY = -48 - bodyBob;
      ctx.strokeText('WALL·E', 0, labelY);
      ctx.fillStyle = '#FACC15';
      ctx.fillText('WALL·E', 0, labelY);

      if (wallE.bubble) {
        const tierLift = bubbleTier ? (typeof bubbleTier === 'number' ? bubbleTier * 24 : 24) : 0;
        let bubbleY = labelY - 19 - tierLift;
        const insideRoomObj = OUTPOST_ROOMS.find(
          (r) => wallE.x >= r.x && wallE.x <= r.x + r.w && wallE.y >= r.y && wallE.y <= r.y + r.h
        );
        if (insideRoomObj) {
          bubbleY = Math.max(bubbleY, insideRoomObj.consoleY + 56 - wallE.y);
        }
        ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
        const tw = Math.max(54, ctx.measureText(wallE.bubble).width + 18);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = isDancing ? '#F472B6' : '#F59E0B';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(-tw / 2, bubbleY - 14, tw, 20, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FEF3C7';
        ctx.fillText(wallE.bubble, 0, bubbleY);
      }

      if (isWaving || wallE.activity === 'share_love') {
        const heartY = labelY - 34 - Math.abs(Math.sin(timeSec * 3.0)) * 5;
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('💛', 22, heartY);
      } else if (isDancing) {
        const noteY = labelY - 34 - Math.abs(Math.sin(timeSec * 4.0)) * 6;
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#FACC15';
        ctx.fillText('♪', -18, noteY);
        ctx.fillStyle = '#F472B6';
        ctx.fillText('♫', 18, noteY - 3);
      }

      ctx.restore();
    };

    const drawExteriorHardware = (
      siteId: 'mars' | 'moon',
      mapVariant: OutpostMapVariant,
      solarKw: number,
      timeSec: number,
      checkedList: string[],
      nearPropId: InteractiveWorldProp['id'] | null
    ) => {
      const solarClean = checkedList.includes('prop-solar');
      const solarHover = nearPropId === 'prop-solar';
      // 1. Exterior Solar Wing Farm north above Reactor (x: 110..445, y: 22..118)
      for (let i = 0; i < 4; i++) {
        const px = 110 + i * 86;
        const py = 26;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
        ctx.fillRect(px + 6, py + 46, 68, 12);
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px + 34, py + 44);
        ctx.lineTo(px + 34, 120);
        ctx.stroke();
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = solarHover ? '#38BDF8' : solarClean ? '#10B981' : solarKw >= 5 ? '#38BDF8' : '#F59E0B';
        ctx.lineWidth = solarHover ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(px + 8, py);
        ctx.lineTo(px + 72, py);
        ctx.lineTo(px + 64, py + 44);
        ctx.lineTo(px, py + 44);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = solarClean ? '#0284C7' : '#0369A1';
        ctx.beginPath();
        ctx.moveTo(px + 12, py + 4);
        ctx.lineTo(px + 67, py + 4);
        ctx.lineTo(px + 60, py + 40);
        ctx.lineTo(px + 5, py + 40);
        ctx.closePath();
        ctx.fill();
      }
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = solarClean ? '#34D399' : '#FBBF24';
      ctx.fillText(solarClean ? '✓ SOLAR CLEANED' : '★ CLICK TO WIPE SOLAR', 278, 18);

      // 2. External Atmospheric / Ice Harvester Tanks north of Bio-Dome (x: 1160..1430, y: 26..120)
      [1175, 1235, 1365, 1425].forEach((tx, idx) => {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.4)';
        ctx.beginPath();
        ctx.ellipse(tx + 4, 84, 22, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = idx < 2 ? '#0EA5E9' : '#10B981';
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(tx - 16, 30, 32, 54, 12);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(tx, 84);
        ctx.lineTo(tx, 120);
        ctx.stroke();
      });

      // 2b. Interactive Surface Weather & Orbital Relay Satellite between Bio-Dome & Food Lab (1570, 248)
      const weatherSatClean = checkedList.includes('sat-weather');
      const weatherSatHover = nearPropId === 'sat-weather';
      ctx.save();
      ctx.translate(1570, 248);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.48)';
      ctx.beginPath();
      ctx.ellipse(3, 36, 30, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tripod support
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-14, 34);
      ctx.lineTo(0, 4);
      ctx.lineTo(14, 34);
      ctx.stroke();
      // Left & Right Satellite Solar Wings
      ctx.fillStyle = weatherSatClean ? '#0284C7' : '#78350F';
      ctx.strokeStyle = weatherSatHover ? '#38BDF8' : weatherSatClean ? '#34D399' : '#F59E0B';
      ctx.lineWidth = weatherSatHover ? 2.8 : 2;
      ctx.fillRect(-38, -10, 24, 14);
      ctx.strokeRect(-38, -10, 24, 14);
      ctx.fillRect(14, -10, 24, 14);
      ctx.strokeRect(14, -10, 24, 14);
      // Satellite Core Bus + Antenna
      ctx.fillStyle = '#E2E8F0';
      ctx.strokeStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(-12, -14, 24, 24, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = weatherSatClean ? '#10B981' : '#F59E0B';
      ctx.beginPath();
      ctx.arc(0, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(0, -32);
      ctx.stroke();
      ctx.fillStyle = Math.sin(timeSec * 5) > 0 ? '#22D3EE' : '#F472B6';
      ctx.beginPath();
      ctx.arc(0, -34, 4, 0, Math.PI * 2);
      ctx.fill();
      // Dust specks if not cleaned yet
      if (!weatherSatClean) {
        ctx.fillStyle = siteId === 'mars' ? 'rgba(251, 146, 60, 0.7)' : 'rgba(203, 213, 225, 0.65)';
        ctx.fillRect(-32, -7, 8, 6);
        ctx.fillRect(20, -6, 9, 5);
      }
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = weatherSatClean ? '#34D399' : '#22D3EE';
      ctx.fillText(weatherSatClean ? '✓ RELAY SAT OK' : '🛰️ CLEAN SAT', 0, 52);
      ctx.restore();

      // 3. CSA Solar Greenhouse Nutrient Tanks north of Space Food Lab (x: 1690..1990, y: 26..120)
      [1715, 1790, 1900, 1975].forEach((tx, idx) => {
        ctx.fillStyle = idx % 2 === 0 ? '#FB7185' : '#34D399';
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(tx - 15, 32, 30, 50, 10);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(tx, 82);
        ctx.lineTo(tx, 120);
        ctx.stroke();
      });

      // 4. Concrete EVA Landing Pad, Animated Returning EVA Astronaut + Shuttle & Parked 6-Wheel Rover (x: 625..935, y: 980..1074)
      const roverClean = checkedList.includes('prop-rover');
      const roverHover = nearPropId === 'prop-rover';
      ctx.fillStyle = siteId === 'mars' ? '#1E293B' : '#0F172A';
      ctx.strokeStyle = siteId === 'mars' ? '#64748B' : '#38BDF8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(625, 980, 310, 94, 14);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = siteId === 'mars' ? '#F59E0B' : '#38BDF8';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(640, 992, 190, 70);
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(248, 250, 252, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(715, 1030, 44, 19, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'center';
      ctx.fillText('EVA RETURN PAD', 715, 1060);

      // Animated Returning EVA Astronaut + Compact Surface Hopper Shuttle (12s continuous return sortie!)
      const evaCycle = timeSec % 12.0;
      const shuttleLift = evaCycle < 2.4 ? (1 - evaCycle / 2.4) * 34 : 0;
      const shuttleX = 682;
      const shuttleY = 1022 - shuttleLift;

      // Landing thruster dust puffs during descent phase (0..2.4s)
      if (evaCycle < 2.6) {
        const thrustAlpha = Math.max(0, 1 - evaCycle / 2.6);
        ctx.fillStyle =
          siteId === 'mars'
            ? `rgba(251, 146, 60, ${0.42 * thrustAlpha})`
            : `rgba(56, 189, 248, ${0.45 * thrustAlpha})`;
        ctx.beginPath();
        ctx.ellipse(shuttleX, 1034, 34 + evaCycle * 8, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // EVA Hopper Return Pod on Left Side of Pad
      ctx.save();
      ctx.translate(shuttleX, shuttleY);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.48)';
      ctx.beginPath();
      ctx.ellipse(0, 16 + shuttleLift * 0.4, 22, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Landing legs
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-12, 8);
      ctx.lineTo(-18, 16);
      ctx.moveTo(12, 8);
      ctx.lineTo(18, 16);
      ctx.stroke();
      // Thruster flame on descent
      if (shuttleLift > 1) {
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.moveTo(-7, 10);
        ctx.lineTo(7, 10);
        ctx.lineTo(0, 22 + Math.sin(timeSec * 30) * 3);
        ctx.closePath();
        ctx.fill();
      }
      // Gold thermal foil base & white crew cabin
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-16, 0, 32, 11, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.roundRect(-13, -15, 26, 16, 6);
      ctx.fill();
      ctx.stroke();
      // Cabin viewport
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(-6, -11, 12, 6);
      ctx.restore();

      // Real Animated Returning EVA Astronaut walking back from Hopper toward EVA Airlock door!
      if (evaCycle >= 2.2) {
        const walkProgress = Math.max(0, Math.min(1, (evaCycle - 3.6) / 6.2));
        const evaX = 716 + walkProgress * 74;
        const evaY = 1026 - walkProgress * 46;
        const evaFade = evaCycle > 10.6 ? Math.max(0, 1 - (evaCycle - 10.6) / 1.4) : 1;
        const evaStride = walkProgress > 0 && walkProgress < 1 ? Math.sin(timeSec * 7.5) * 3.5 : 0;

        ctx.save();
        ctx.globalAlpha = evaFade;
        ctx.translate(evaX, evaY - Math.abs(evaStride) * 0.6);

        // Ground shadow
        ctx.fillStyle = 'rgba(2, 6, 23, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 14, 11, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Heavy EVA PLSS backpack
        ctx.fillStyle = '#CBD5E1';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(-11, -11, 6, 15, 2);
        ctx.fill();
        ctx.stroke();

        // Legs
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(-5 - evaStride * 0.4, 5, 4, 8);
        ctx.fillRect(1 + evaStride * 0.4, 5, 4, 8);

        // White EVA Suit Torso + Orange/Blue trim
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.roundRect(-7, -9, 14, 15, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = siteId === 'mars' ? '#F97316' : '#38BDF8';
        ctx.fillRect(-6, -8, 12, 4);

        // Waving right arm + carried core/ice specimen box
        ctx.save();
        ctx.translate(6, -5);
        ctx.rotate(evaCycle < 3.8 ? -2.2 + Math.sin(timeSec * 6) * 0.28 : -0.5 + evaStride * 0.12);
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.roundRect(-2, 0, 4, 9, 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Specimen canister in left hand
        ctx.fillStyle = siteId === 'mars' ? '#FB923C' : '#38BDF8';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 1.4;
        ctx.fillRect(-13, 0, 7, 7);
        ctx.strokeRect(-13, 0, 7, 7);

        // EVA Helmet with Reflective Gold Sun Visor!
        ctx.fillStyle = '#F8FAFC';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -17, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.ellipse(2, -17, 6.2, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, -19, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Status tag & Speech Bubble
        ctx.font = '800 9.5px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 3;
        ctx.strokeText('EVA-SCOUT', 0, -29);
        ctx.fillStyle = '#FDE68A';
        ctx.fillText('EVA-SCOUT', 0, -29);

        if (evaCycle >= 2.5 && evaCycle <= 9.6) {
          const msg = siteId === 'mars' ? '🪨 Back from EVA work!' : '🧊 Ice core samples done!';
          ctx.font = '700 9.5px "Plus Jakarta Sans", sans-serif';
          const tw = ctx.measureText(msg).width + 14;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
          ctx.strokeStyle = siteId === 'mars' ? '#F97316' : '#38BDF8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-tw / 2, -49, tw, 17, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#F8FAFC';
          ctx.fillText(msg, 0, -37.5);
        }
        ctx.restore();
      }

      // Parked 6-Wheel Surface Cargo Rover
      ctx.save();
      ctx.translate(882, 1026);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
      ctx.beginPath();
      ctx.ellipse(2, 12, 34, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      [-20, 0, 20].forEach((wx) => {
        ctx.beginPath();
        ctx.arc(wx, 10, 6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = siteId === 'mars' ? '#EA580C' : '#E2E8F0';
      ctx.strokeStyle = roverHover ? '#38BDF8' : roverClean ? '#10B981' : '#020617';
      ctx.lineWidth = roverHover ? 3 : 2;
      ctx.beginPath();
      ctx.roundRect(-26, -10, 52, 18, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = siteId === 'mars' ? '#BAE6FD' : '#FACC15';
      ctx.fillRect(10, -7, 11, 8);
      ctx.font = '700 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = roverClean ? '#34D399' : '#FDBA74';
      ctx.fillText(roverClean ? '✓ ROVER OK' : '★ CHECK ROVER', 0, -16);
      ctx.restore();

      // Subtle regolith rover tire tracks heading south-east
      ctx.strokeStyle =
        siteId === 'mars' ? 'rgba(67, 20, 7, 0.5)' : 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(940, 1034);
      ctx.quadraticCurveTo(1060, 1068, 1165, 1118);
      ctx.stroke();
      ctx.setLineDash([]);

      // Site-Distinct South Landmark (Mars Scout Copter Pad vs Moon Shackleton H2O Ice Deposit)
      ctx.save();
      ctx.translate(546, 1042);
      if (siteId === 'mars') {
        ctx.fillStyle = 'rgba(67, 20, 7, 0.72)';
        ctx.strokeStyle = '#F97316';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Mini Ingenuity-style Mars Scout Rotorcraft
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 10);
        ctx.lineTo(0, -2);
        ctx.lineTo(10, 10);
        ctx.stroke();
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(-5, -8, 10, 8);
        ctx.save();
        ctx.translate(0, -10);
        ctx.rotate(timeSec * 6.5);
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(18, 0);
        ctx.stroke();
        ctx.restore();
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FDBA74';
        ctx.fillText('🚁 MARS COPTER', 0, 38);
      } else {
        // Moon Shackleton Crater Permanently Shadowed Water-Ice Extractor Node
        const icePulse = 0.6 + 0.35 * Math.sin(timeSec * 2.5);
        ctx.fillStyle = 'rgba(14, 165, 233, 0.22)';
        ctx.strokeStyle = `rgba(56, 189, 248, ${icePulse})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(0, 2, 32, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#7DD3FC';
        [[-10, 0], [4, -4], [12, 4]].forEach(([ix, iy]) => {
          ctx.beginPath();
          ctx.moveTo(ix, iy - 9);
          ctx.lineTo(ix + 6, iy + 5);
          ctx.lineTo(ix - 6, iy + 5);
          ctx.closePath();
          ctx.fill();
        });
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#BAE6FD';
        ctx.fillText('❄️ H2O ICE SEAM', 0, 34);
      }
      ctx.restore();

      // 5. Deep Space Network Dish Satellite Tower south of Comms Deck (x: 1310, y: 1028)
      const commsSatClean = checkedList.includes('sat-comms');
      const commsSatHover = nearPropId === 'sat-comms';
      ctx.save();
      ctx.translate(1310, 1028);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
      ctx.beginPath();
      ctx.ellipse(4, 24, 36, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-16, 4, 32, 22, 4);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      const dishSwing = Math.sin(timeSec * 0.9) * 0.35;
      ctx.rotate(dishSwing - 0.35);
      ctx.fillStyle = '#E2E8F0';
      ctx.strokeStyle = commsSatHover ? '#FACC15' : commsSatClean ? '#10B981' : '#38BDF8';
      ctx.lineWidth = commsSatHover ? 3.2 : 2.5;
      ctx.beginPath();
      ctx.arc(0, -10, 28, Math.PI * 0.12, Math.PI * 0.88);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (!commsSatClean) {
        ctx.fillStyle = siteId === 'mars' ? 'rgba(234, 88, 12, 0.55)' : 'rgba(148, 163, 184, 0.55)';
        ctx.fillRect(-14, -4, 12, 5);
      }

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(0, -34);
      ctx.stroke();
      ctx.fillStyle = Math.sin(timeSec * 6) > 0 ? '#EC4899' : '#38BDF8';
      ctx.beginPath();
      ctx.arc(0, -36, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = commsSatClean ? '#34D399' : '#38BDF8';
      ctx.fillText(commsSatClean ? '✓ DSN SAT CALIBRATED' : '🛰️ CLEAN & CHECK DSN SAT', 0, 46);
      ctx.restore();

      // 6. UNIQUE LIVED-IN OUTDOOR PROPS (Strictly placed in open exterior courtyards clear of all hallways & rooms!)
      if (siteId === 'mars') {
        // --- MARS COURTYARD 1 (between Power & O2 Bay, x: 475..585, y: 155..355) ---
        // Animated Orange Mars Outpost Flag + Rock Core Crates + Wind-Sock Mast
        ctx.save();
        ctx.translate(530, 215);
        ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
        ctx.beginPath();
        ctx.ellipse(2, 34, 16, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(0, 32);
        ctx.lineTo(0, -24);
        ctx.stroke();
        const flagWave = Math.sin(timeSec * 3.4) * 3;
        ctx.fillStyle = mapVariant === 'frontier' ? '#FB7185' : '#F97316';
        ctx.beginPath();
        ctx.moveTo(1, -24);
        ctx.quadraticCurveTo(18, -22 + flagWave, 34, -17);
        ctx.lineTo(34, -4);
        ctx.quadraticCurveTo(18, -8 + flagWave, 1, -6);
        ctx.closePath();
        ctx.fill();
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.fillStyle = '#FFF7ED';
        ctx.textAlign = 'center';
        ctx.fillText('MARS', 17, -12);
        // Wind-sock mast & Mars Core Sample Crates below
        ctx.fillStyle = '#9A3412';
        ctx.strokeStyle = '#FDBA74';
        ctx.lineWidth = 1.6;
        ctx.fillRect(-30, 38, 22, 16);
        ctx.strokeRect(-30, 38, 22, 16);
        ctx.fillStyle = '#78350F';
        ctx.fillRect(8, 42, 24, 14);
        ctx.strokeRect(8, 42, 24, 14);
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#FDBA74';
        ctx.fillText('CORE CRATES', 0, 72);
        ctx.restore();

        // --- MARS COURTYARD 2 (between O2 & Bio-Dome, x: 995..1105, y: 155..355) ---
        // Mars Dust Boot-Brush Rack & Terrarium Sample Box
        ctx.save();
        ctx.translate(1050, 245);
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#F97316';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-34, -22, 68, 28, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(-24, -14, 18, 6);
        ctx.fillRect(6, -14, 18, 6);
        // Mini green moss terrarium dome
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.strokeStyle = '#34D399';
        ctx.beginPath();
        ctx.arc(0, 28, 18, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(-5, 25, 5, 0, Math.PI * 2);
        ctx.arc(6, 25, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FDE68A';
        ctx.fillText('DUST BRUSH', 0, -28);
        ctx.restore();

        // --- MARS SOUTH-WEST SHIELD YARD (between Shield & EVA, x: 475..585, y: 715..925) ---
        // Orange Regolith Radiation Sandbag Berm & Outdoor Tool Rack
        ctx.save();
        ctx.translate(530, 810);
        ctx.fillStyle = '#7C2D12';
        ctx.strokeStyle = '#FB923C';
        ctx.lineWidth = 1.6;
        for (let row = 0; row < 2; row++) {
          for (let col = -1; col <= 1; col++) {
            ctx.beginPath();
            ctx.roundRect(col * 22 - 9 + (row % 2) * 5, row * 12 - 14, 19, 10, 4);
            ctx.fill();
            ctx.stroke();
          }
        }
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#F59E0B';
        ctx.beginPath();
        ctx.roundRect(-26, 24, 52, 16, 4);
        ctx.fill();
        ctx.stroke();
        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FDBA74';
        ctx.fillText('BERM & TOOLS', 0, 56);
        ctx.restore();

        // --- MARS SOUTH COURTYARD (between EVA & Comms, x: 995..1105, y: 715..925) ---
        // Cozy Jezero Crew Picnic Table, String Lanterns & Landmark Signpost
        ctx.save();
        ctx.translate(1050, 810);
        // Amber string lantern posts
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-34, -22);
        ctx.lineTo(-34, -48);
        ctx.moveTo(34, -22);
        ctx.lineTo(34, -48);
        ctx.stroke();
        ctx.strokeStyle = '#FDE68A';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-34, -46);
        ctx.quadraticCurveTo(0, -35, 34, -46);
        ctx.stroke();
        [-20, 0, 20].forEach((lx) => {
          ctx.fillStyle = Math.sin(timeSec * 3 + lx) > 0 ? '#FACC15' : '#FB923C';
          ctx.beginPath();
          ctx.arc(lx, -40, 3.2, 0, Math.PI * 2);
          ctx.fill();
        });
        // Picnic Bench
        ctx.fillStyle = '#B45309';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(-26, -12, 52, 24, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#78350F';
        ctx.fillRect(-32, -8, 5, 16);
        ctx.fillRect(27, -8, 5, 16);
        // Signpost
        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FDE68A';
        ctx.fillText(mapVariant === 'frontier' ? 'CANYON KM 0' : 'JEZERO KM 0', 0, 32);
        ctx.restore();

        // --- MARS SOUTH RIDGE DRILL RIG (x: 1125, y: 1175) & EAST CRATE PAD (x: 2110, y: 260) ---
        ctx.save();
        ctx.translate(1125, 1175);
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#F97316';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-28, -14, 56, 28, 6);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(0, 10 + Math.sin(timeSec * 6) * 3);
        ctx.stroke();
        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FDBA74';
        ctx.fillText('CORE DRILL RIG', 0, 28);
        ctx.restore();

        if (mapVariant === 'frontier') {
          // Frontier Valles Canyon Cable-Car Pylon on East Cliff (x: 2115, y: 260)
          ctx.save();
          ctx.translate(2115, 260);
          ctx.fillStyle = '#4C0519';
          ctx.strokeStyle = '#FB7185';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.roundRect(-30, -28, 60, 56, 10);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#FACC15';
          const gondOffset = Math.sin(timeSec * 1.4) * 14;
          ctx.beginPath();
          ctx.roundRect(-12 + gondOffset, -8, 24, 16, 4);
          ctx.fill();
          ctx.font = '700 8.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#FDA4AF';
          ctx.fillText('CANYON TRAM', 0, 44);
          ctx.restore();
        }
      } else {
        // --- MOON COURTYARD 1 (between Power & O2 Bay, x: 475..585, y: 155..355) ---
        // Rigid-Bar Artemis Lunar Flag + Gold-Foil Seismometer + Retroreflector Prism
        ctx.save();
        ctx.translate(530, 215);
        ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
        ctx.beginPath();
        ctx.ellipse(2, 34, 16, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(0, 32);
        ctx.lineTo(0, -24);
        ctx.lineTo(32, -24); // horizontal vacuum crossbar!
        ctx.stroke();
        ctx.fillStyle = '#0284C7';
        ctx.fillRect(1, -23, 30, 17);
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.moveTo(6, -9);
        ctx.lineTo(15, -20);
        ctx.lineTo(24, -9);
        ctx.closePath();
        ctx.fill();
        // Gold-foil seismometer beside flag
        ctx.fillStyle = '#FACC15';
        ctx.strokeStyle = '#92400E';
        ctx.lineWidth = 1.6;
        ctx.fillRect(-28, 38, 22, 16);
        ctx.strokeRect(-28, 38, 22, 16);
        // Laser prism mirror
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(10, 40, 20, 13);
        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#BAE6FD';
        ctx.fillText('ARTEMIS PRISM', 0, 70);
        ctx.restore();

        // --- MOON COURTYARD 2 (between O2 & Bio-Dome, x: 995..1105, y: 155..355) ---
        // Twin Silver Cryo LOX/LH2 Spheres & Lunar Regolith Berm
        ctx.save();
        ctx.translate(1050, 240);
        [-18, 18].forEach((cxOff, sIdx) => {
          ctx.fillStyle = sIdx === 0 ? '#94A3B8' : '#CBD5E1';
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cxOff, -6, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#7DD3FC';
        ctx.beginPath();
        ctx.roundRect(-28, 18, 56, 14, 5);
        ctx.fill();
        ctx.stroke();
        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#BAE6FD';
        ctx.fillText('CRYO LOX/LH2', 0, 48);
        ctx.restore();

        // --- MOON SOUTH-WEST SHIELD YARD (between Shield & EVA, x: 475..585, y: 715..925) ---
        // Stacked Lunar Regolith Shield Blocks & Silver Ice-Core Chests
        ctx.save();
        ctx.translate(530, 810);
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.6;
        for (let r = 0; r < 2; r++) {
          for (let c = -1; c <= 1; c++) {
            ctx.fillRect(c * 21 - 9, r * 12 - 14, 18, 10);
            ctx.strokeRect(c * 21 - 9, r * 12 - 14, 18, 10);
          }
        }
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#38BDF8';
        ctx.beginPath();
        ctx.roundRect(-26, 22, 52, 18, 5);
        ctx.fill();
        ctx.stroke();
        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#7DD3FC';
        ctx.fillText('ICE-CORE CHEST', 0, 56);
        ctx.restore();

        // --- MOON SOUTH COURTYARD (between EVA & Comms, x: 995..1105, y: 715..925) ---
        // Earthrise Observation Bench, Brass Telescope & Glowing Earth Icon!
        ctx.save();
        ctx.translate(1050, 808);
        // Glowing blue Earth in lunar sky above telescope!
        ctx.fillStyle = '#0284C7';
        ctx.beginPath();
        ctx.arc(22, -44, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#34D399';
        ctx.beginPath();
        ctx.arc(19, -46, 4.5, 0, Math.PI * 2);
        ctx.arc(25, -42, 3.2, 0, Math.PI * 2);
        ctx.fill();
        // Brass telescope aimed at Earth
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-14, -4);
        ctx.lineTo(-4, -22);
        ctx.lineTo(6, -4);
        ctx.stroke();
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-14, -18);
        ctx.lineTo(8, -32);
        ctx.stroke();
        // Observation Bench
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(-28, 6, 56, 16, 4);
        ctx.fill();
        ctx.stroke();
        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#BAE6FD';
        ctx.fillText('EARTHRISE DECK', 0, 38);
        ctx.restore();

        // --- MOON SOUTH RIDGE VIPER CART (x: 1125, y: 1175) ---
        ctx.save();
        ctx.translate(1125, 1175);
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#22D3EE';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-26, -14, 52, 26, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(-14, -8, 28, 12);
        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#7DD3FC';
        ctx.fillText('VIPER SCOUT', 0, 28);
        ctx.restore();

        if (mapVariant === 'frontier') {
          // Frontier Lava-Tube Laser Relay & Skylight Dome on East Basalt (x: 2115, y: 260)
          ctx.save();
          ctx.translate(2115, 260);
          ctx.fillStyle = 'rgba(34, 211, 238, 0.18)';
          ctx.strokeStyle = '#22D3EE';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(0, 0, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#67E8F9';
          ctx.beginPath();
          ctx.arc(0, 0, 11 + Math.sin(timeSec * 3) * 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = '700 8.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#A5F3FC';
          ctx.fillText('LAVA SKYLIGHT', 0, 44);
          ctx.restore();
        }
      }
    };

    const drawMessLoungeAndExpansion = (
      timeSec: number,
      isDanceParty: boolean,
      isFeastActive: boolean,
      nearPropId: InteractiveWorldProp['id'] | null
    ) => {
      const l = MESS_LOUNGE_ZONE;

      // Shadow + Pressurized Lounge Hull
      ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
      ctx.beginPath();
      ctx.roundRect(l.x + 6, l.y + 8, l.w, l.h, 24);
      ctx.fill();

      ctx.fillStyle = '#111A2E';
      ctx.strokeStyle = isDanceParty ? '#F472B6' : isFeastActive ? '#34D399' : '#38BDF8';
      ctx.lineWidth = isDanceParty || isFeastActive ? 4.5 : 3.2;
      ctx.beginPath();
      ctx.roundRect(l.x, l.y, l.w, l.h, 22);
      ctx.fill();
      ctx.stroke();

      // Header banner (clear non-overlapping top strip)
      ctx.fillStyle = 'rgba(9, 14, 26, 0.95)';
      ctx.beginPath();
      ctx.roundRect(l.x + 14, l.y + 10, l.w - 28, 28, 8);
      ctx.fill();

      ctx.font = '700 13px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText(l.name.toUpperCase(), l.x + 24, l.y + 29);

      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = isDanceParty ? '#F472B6' : '#34D399';
      ctx.fillText(
        isDanceParty ? '♪ DANCE PARTY!' : isFeastActive ? '🍽️ CREW FEAST!' : 'CLICK ITEMS TO USE',
        l.x + l.w - 24,
        l.y + 28
      );

      // Galley Hydration & Tea Bar (top-left alcove, cleanly clear of seats!)
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#FB7185';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(l.galleyBar.x - 82, l.galleyBar.y - 13, 164, 26, 8);
      ctx.fill();
      ctx.stroke();
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FDA4AF';
      ctx.fillText('☕ ZERO-G GALLEY BAR', l.galleyBar.x, l.galleyBar.y + 4);

      // Cozy Crew Dining Table + Plates (clickable to Eat!)
      const eatHover = nearPropId === 'lounge-eat';
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = eatHover ? '#34D399' : '#F59E0B';
      ctx.lineWidth = eatHover ? 3.2 : 2.4;
      ctx.beginPath();
      ctx.roundRect(l.diningTable.x - 58, l.diningTable.y - 34, 116, 68, 18);
      ctx.fill();
      ctx.stroke();

      // Tiny plates / space food bowls on table corners (center open for crisp EAT tag)
      [
        [l.diningTable.x - 36, l.diningTable.y - 17, '#10B981'],
        [l.diningTable.x + 36, l.diningTable.y - 17, '#FB7185'],
        [l.diningTable.x - 36, l.diningTable.y + 17, '#38BDF8'],
        [l.diningTable.x + 36, l.diningTable.y + 17, '#FACC15'],
      ].forEach(([px, py, clr]) => {
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.arc(px as number, py as number, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = clr as string;
        ctx.beginPath();
        ctx.arc(px as number, py as number, 4.8, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FDE68A';
      ctx.fillText('🍽️ EAT', l.diningTable.x, l.diningTable.y + 4);

      // Dining Stools
      l.diningSeats.forEach((seat) => {
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(seat.x, seat.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Glowing Neon Dance Pad (right zone, clickable to Dance!)
      const df = l.danceFloor;
      const danceHover = nearPropId === 'lounge-dance';
      ctx.fillStyle = '#090E1A';
      ctx.strokeStyle = danceHover ? '#F472B6' : isDanceParty ? '#F472B6' : '#8B5CF6';
      ctx.lineWidth = danceHover ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.roundRect(df.x, df.y, df.w, df.h, 12);
      ctx.fill();
      ctx.stroke();

      const tileColors = ['#38BDF8', '#F472B6', '#FACC15', '#34D399'];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const pulse = isDanceParty
            ? 0.45 + 0.45 * Math.sin(timeSec * 10 + r * 1.3 + c * 1.7)
            : 0.22 + 0.16 * Math.sin(timeSec * 3 + r + c);
          ctx.fillStyle = tileColors[(r + c) % tileColors.length];
          ctx.globalAlpha = pulse;
          ctx.fillRect(df.x + 14 + c * 36, df.y + 10 + r * 28, 30, 22);
        }
      }
      ctx.globalAlpha = 1;
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText('♪ DANCE PAD', df.x + df.w / 2, df.y + df.h - 9);

      // 2 Cozy Rest Pods (bottom zone, clickable to Rest — clean bottom-strip labels so pillows & resting crew never overlap text!)
      const restHover = nearPropId === 'lounge-rest';
      l.restPods.forEach((pod) => {
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = restHover ? '#34D399' : '#38BDF8';
        ctx.lineWidth = restHover ? 3 : 2;
        ctx.beginPath();
        ctx.roundRect(pod.x - 62, pod.y - 22, 124, 46, 14);
        ctx.fill();
        ctx.stroke();

        // Pillow & blanket positioned in upper 28px so text footer stays crystal clear
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.roundRect(pod.x - 52, pod.y - 16, 22, 18, 5);
        ctx.fill();
        ctx.fillStyle = '#0284C7';
        ctx.beginPath();
        ctx.roundRect(pod.x - 24, pod.y - 16, 76, 18, 5);
        ctx.fill();

        ctx.font = '700 9.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#BAE6FD';
        ctx.fillText(`💤 ${pod.label.toUpperCase()} · REST`, pod.x, pod.y + 16);
      });

      // FUTURE EXPANSION WING PLOT (Sector B below Crew Mess Lounge)
      const exp = FUTURE_EXPANSION_PLOT;
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.roundRect(exp.x, exp.y, exp.w, exp.h, 18);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      // Blueprint interior dome silhouettes
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 2;
      [exp.x + 130, exp.x + 280, exp.x + 425].forEach((bx) => {
        ctx.beginPath();
        ctx.arc(bx, exp.y + 105, 42, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Corner survey beacons
      const beaconOn = Math.sin(timeSec * 4) > 0;
      [
        [exp.x + 16, exp.y + 16],
        [exp.x + exp.w - 16, exp.y + 16],
        [exp.x + 16, exp.y + exp.h - 16],
        [exp.x + exp.w - 16, exp.y + exp.h - 16],
      ].forEach(([bx, by]) => {
        ctx.fillStyle = beaconOn ? '#F59E0B' : '#78350F';
        ctx.beginPath();
        ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#38BDF8';
      ctx.fillText(exp.label, exp.x + exp.w / 2, exp.y + 38);
      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(
        'RESERVED SITE: FUTURE BAKERY, HYDROPONIC ORCHARD & HABITAT BAY',
        exp.x + exp.w / 2,
        exp.y + 164
      );
      ctx.restore();
    };

    const drawRoomArchitecture = (
      room: OutpostRoom,
      poweredKw: number,
      isCompleted: boolean,
      timeSec: number
    ) => {
      const rx = room.x;
      const ry = room.y;
      const rw = room.w;
      const rh = room.h;
      const cx = room.consoleX;
      const cy = room.consoleY;

      if (room.id === 'power') {
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(rx + 26, ry + 75, 58, 125, 12);
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.translate(rx + 55, ry + 138);
        ctx.rotate(timeSec * 1.4);
        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 3;
        for (let b = 0; b < 3; b++) {
          ctx.rotate((Math.PI * 2) / 3);
          ctx.beginPath();
          ctx.moveTo(-16, 0);
          ctx.lineTo(16, 0);
          ctx.stroke();
        }
        ctx.restore();

        [0, 1].forEach((t) => {
          ctx.fillStyle = '#0F172A';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(rx + rw - 82, ry + 78 + t * 62, 56, 48, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#F59E0B';
          ctx.fillRect(rx + rw - 72, ry + 90 + t * 62, 36, 5);
          ctx.fillRect(rx + rw - 72, ry + 102 + t * 62, 24, 5);
        });
      } else if (room.id === 'lifesupport') {
        [rx + 30, rx + rw - 76].forEach((tx, sideIdx) => {
          ctx.fillStyle = poweredKw > 0 ? 'rgba(56, 189, 248, 0.22)' : '#1E293B';
          ctx.strokeStyle = poweredKw > 0 ? '#38BDF8' : '#475569';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(tx, ry + 70, 46, 138, 14);
          ctx.fill();
          ctx.stroke();

          if (poweredKw > 0) {
            for (let b = 0; b < 4; b++) {
              const by = ry + 195 - ((timeSec * 36 + b * 32 + sideIdx * 14) % 112);
              ctx.fillStyle = '#BAE6FD';
              ctx.beginPath();
              ctx.arc(tx + 14 + (b % 2) * 16, by, 3.8, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });
      } else if (room.id === 'hydroponics') {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.28)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, ry + 210, 145, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();

        [rx + 22, rx + rw - 88].forEach((px) => {
          ctx.fillStyle = '#064E3B';
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(px, ry + 84, 66, 128, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = poweredKw > 0 ? '#EC4899' : '#475569';
          ctx.fillRect(px + 6, ry + 90, 54, 4);

          for (let row = 0; row < 3; row++) {
            ctx.fillStyle = '#34D399';
            ctx.beginPath();
            ctx.arc(px + 20, ry + 114 + row * 34, 8, 0, Math.PI * 2);
            ctx.arc(px + 44, ry + 114 + row * 34, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      } else if (room.id === 'foodlab') {
        // Left: Glowing Thermal Zero-G Oven & Prep Bar
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#FB7185';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(rx + 24, ry + 78, 66, 128, 10);
        ctx.fill();
        ctx.stroke();

        // Warm glowing oven window
        ctx.fillStyle = 'rgba(251, 113, 133, 0.35)';
        ctx.beginPath();
        ctx.roundRect(rx + 34, ry + 98, 46, 38, 6);
        ctx.fill();
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.arc(rx + 57, ry + 117, 7 + Math.sin(timeSec * 4) * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Prep dishes underneath
        ctx.fillStyle = '#34D399';
        ctx.fillRect(rx + 36, ry + 158, 42, 8);
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(rx + 36, ry + 174, 30, 8);

        // Right: CSA Nutrition Bio-Analyzer Pod & Spirulina Reactor
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#34D399';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(rx + rw - 88, ry + 78, 64, 128, 10);
        ctx.fill();
        ctx.stroke();

        for (let b = 0; b < 4; b++) {
          const yOff = ry + 188 - ((timeSec * 30 + b * 24) % 90);
          ctx.fillStyle = b % 2 === 0 ? '#34D399' : '#FB7185';
          ctx.beginPath();
          ctx.arc(rx + rw - 66 + (b % 2) * 18, yOff, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (room.id === 'shield') {
        [
          [rx + 26, ry + 78],
          [rx + 60, ry + 78],
          [rx + rw - 86, ry + 78],
          [rx + rw - 52, ry + 78],
        ].forEach(([wx, wy]) => {
          ctx.fillStyle = poweredKw > 0 ? 'rgba(168, 85, 247, 0.32)' : '#1E293B';
          ctx.strokeStyle = poweredKw > 0 ? '#C084FC' : '#475569';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(wx, wy, 26, 134, 8);
          ctx.fill();
          ctx.stroke();

          if (poweredKw > 0) {
            const waveH = 40 + Math.sin(timeSec * 3.5) * 10;
            ctx.fillStyle = 'rgba(192, 132, 252, 0.35)';
            ctx.fillRect(wx + 3, wy + 130 - waveH, 20, waveH);
          }
        });
      } else if (room.id === 'eva') {
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.16)';
        ctx.lineWidth = 2;
        for (let gy = ry + 64; gy < ry + rh - 24; gy += 16) {
          ctx.beginPath();
          ctx.moveTo(rx + 24, gy);
          ctx.lineTo(rx + rw - 24, gy);
          ctx.stroke();
        }

        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#F97316';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(rx + 24, ry + 84, 62, 118, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.arc(rx + 46, ry + 114, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(rx + 36, ry + 124, 20, 28, 5);
        ctx.fill();
        ctx.fillStyle = '#F97316';
        ctx.beginPath();
        ctx.roundRect(rx + 64, ry + 116, 14, 52, 5);
        ctx.fill();

        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0F172A';
        ctx.beginPath();
        ctx.roundRect(rx + rw - 82, ry + 104, 54, 48, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(cx - 48, ry + rh - 12, 96, 10);
      } else if (room.id === 'comms') {
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rx + 58, ry + 144, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.beginPath();
        ctx.arc(rx + 58, ry + 144, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#34D399';
        ctx.beginPath();
        ctx.ellipse(
          rx + 58,
          ry + 144,
          28,
          10,
          timeSec * 0.8,
          0,
          Math.PI * 2
        );
        ctx.stroke();

        ctx.fillStyle = '#090E1A';
        ctx.strokeStyle = '#EC4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(rx + rw - 88, ry + 84, 62, 124, 8);
        ctx.fill();
        ctx.stroke();
        for (let bar = 0; bar < 5; bar++) {
          const bh = 16 + Math.abs(Math.sin(timeSec * 5 + bar * 0.9)) * 42;
          ctx.fillStyle = bar % 2 === 0 ? '#EC4899' : '#38BDF8';
          ctx.fillRect(rx + rw - 78 + bar * 10, ry + 188 - bh, 6, bh);
        }
      } else if (room.id === 'academy') {
        // Left: Compact Rotating Holographic Planet & Orbit Classroom Globe
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(rx + 22, ry + 174, 54, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
        ctx.beginPath();
        ctx.arc(rx + 49, ry + 132, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(rx + 49, ry + 132, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(rx + 49, ry + 132, 24, 8, Math.sin(timeSec * 0.7) * 0.45, 0, Math.PI * 2);
        ctx.stroke();

        // Right: Compact Interactive STEM Quiz Board & Classroom Display (clear of central console label)
        ctx.fillStyle = '#090E1A';
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(rx + rw - 76, ry + 76, 54, 124, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FACC15';
        ctx.fillText('★ QUIZ', rx + rw - 49, ry + 96);
        ['#38BDF8', '#10B981', '#FACC15', '#FB7185'].forEach((barCol, bIdx) => {
          ctx.fillStyle = barCol;
          const bw = 20 + ((bIdx * 9 + Math.floor(timeSec * 4)) % 16);
          ctx.fillRect(rx + rw - 67, ry + 112 + bIdx * 20, bw, 8);
        });
      }

      // Central Interactive Workstation Console Desk
      ctx.fillStyle = '#0B1221';
      ctx.strokeStyle = poweredKw > 0 ? room.accentColor : '#475569';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(cx - 64, cy - 36, 128, 60, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = poweredKw > 0 ? `${room.accentColor}2B` : '#1E293B';
      ctx.beginPath();
      ctx.roundRect(cx - 54, cy - 28, 108, 36, 7);
      ctx.fill();

      if (room.id === 'power') {
        ctx.save();
        ctx.translate(cx, cy - 10);
        ctx.rotate(timeSec * 2.1);
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 1.45);
        ctx.stroke();
        ctx.restore();
      } else if (room.id === 'lifesupport') {
        for (let i = -1; i <= 1; i++) {
          const by = cy - 2 - ((timeSec * 24 + i * 11) % 20);
          ctx.fillStyle = '#38BDF8';
          ctx.beginPath();
          ctx.arc(cx + i * 18, by, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (room.id === 'hydroponics') {
        ctx.fillStyle = poweredKw > 0 ? '#EC4899' : '#475569';
        ctx.fillRect(cx - 38, cy - 23, 76, 4);
        for (let i = -2; i <= 2; i++) {
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.arc(cx + i * 14, cy - 4, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (room.id === 'foodlab') {
        // Simulating glowing nutrient rings + bowl on console screen
        ctx.fillStyle = '#FB7185';
        ctx.beginPath();
        ctx.arc(cx - 18, cy - 10, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#34D399';
        ctx.beginPath();
        ctx.arc(cx, cy - 10, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.arc(cx + 18, cy - 10, 7, 0, Math.PI * 2);
        ctx.fill();
      } else if (room.id === 'shield') {
        const pulse = 10 + Math.sin(timeSec * 4) * 3;
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy - 10, pulse, 0, Math.PI * 2);
        ctx.stroke();
      } else if (room.id === 'eva') {
        ctx.fillStyle = '#F97316';
        ctx.fillRect(cx - 20, cy - 18, 40, 15);
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.arc(cx - 11, cy, 4.5, 0, Math.PI * 2);
        ctx.arc(cx + 11, cy, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (room.id === 'comms') {
        for (let i = -2; i <= 2; i++) {
          const barH = 7 + Math.abs(Math.sin(timeSec * 5 + i)) * 16;
          ctx.fillStyle = '#EC4899';
          ctx.fillRect(cx + i * 12 - 3, cy + 2 - barH, 6, barH);
        }
      } else if (room.id === 'academy') {
        ctx.font = '800 15px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FACC15';
        ctx.fillText('★ ? LEARN', cx, cy - 5);
      }

      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      if (isCompleted) {
        ctx.fillStyle = '#10B981';
        ctx.fillText('✓ TASK COMPLETE', cx, cy + 36);
      } else {
        ctx.fillStyle = '#FBBF24';
        ctx.fillText('★ CLICK / [E] CONSOLE', cx, cy + 36);
      }
    };

    const followWaypoints = (
      npc: NpcCrewmate,
      wps: Array<{ x: number; y: number }>,
      speed: number,
      dt: number
    ) => {
      const wp = wps[npc.targetIdx % wps.length];
      const arrived = steerNpcToward(npc, wp.x, wp.y, speed, dt);
      if (arrived) {
        npc.targetIdx = (npc.targetIdx + 1) % wps.length;
        // Occasionally pause for a cute Lounge meal, rest pod nap, or dance when passing Lounge!
        if (
          wp.x >= MESS_LOUNGE_ZONE.x &&
          wp.y >= MESS_LOUNGE_ZONE.y &&
          Math.random() < 0.65
        ) {
          const roll = Math.random();
          npc.path = [];
          npc.pathKey = '';
          if (roll < 0.48) {
            const seatIndex = activeCafePreset.seats[npc.roleId];
            const seat = MESS_LOUNGE_ZONE.diningSeats[seatIndex % MESS_LOUNGE_ZONE.diningSeats.length];
            npc.seatIdx = seatIndex;
            npc.x = seat.x;
            npc.y = seat.y;
            npc.facing = seat.facing;
            npc.activity = 'eat';
            npc.activityTimer = 4.5;
            npc.bubble = activeCafePreset.lines[npc.roleId];
          } else if (roll < 0.72) {
            const pod = MESS_LOUNGE_ZONE.restPods[npc.seatIdx % MESS_LOUNGE_ZONE.restPods.length];
            npc.x = pod.x;
            npc.y = pod.y - 6;
            npc.activity = 'rest';
            npc.activityTimer = 4.0;
            npc.bubble = '💤 Nap Pod';
          } else {
            const padCenterX = MESS_LOUNGE_ZONE.danceFloor.x + MESS_LOUNGE_ZONE.danceFloor.w / 2;
            const padCenterY = MESS_LOUNGE_ZONE.danceFloor.y + MESS_LOUNGE_ZONE.danceFloor.h / 2;
            const slotOffset = (npc.seatIdx % 4) - 1.5;
            npc.x = padCenterX + slotOffset * 26;
            npc.y = padCenterY + (npc.seatIdx % 2 === 0 ? -12 : 14);
            npc.activity = 'dance';
            npc.activityTimer = 4.4;
            npc.bubble = '♪ Boogie!';
          }
        }
      }
    };

    // Cached offscreen static terrain + expanded corridors per siteId:mapVariant (2280x1320)
    let cachedTerrainKey: string | null = null;
    const terrainBuffer = document.createElement('canvas');
    terrainBuffer.width = WORLD_W + 140;
    terrainBuffer.height = WORLD_H + 140;
    const tCtx = terrainBuffer.getContext('2d');

    const ensureTerrainCache = (
      siteId: 'mars' | 'moon',
      mapVariant: OutpostMapVariant,
      terrainColor: string,
      terrainAccent: string
    ) => {
      const nextKey = `${siteId}:${mapVariant}`;
      if (!tCtx || cachedTerrainKey === nextKey) return;
      cachedTerrainKey = nextKey;
      tCtx.save();
      tCtx.translate(70, 70);

      const bgGrad = tCtx.createRadialGradient(
        WORLD_W * 0.48,
        WORLD_H * 0.45,
        220,
        WORLD_W * 0.5,
        WORLD_H * 0.5,
        WORLD_W * 0.72
      );
      bgGrad.addColorStop(0, terrainAccent);
      bgGrad.addColorStop(1, terrainColor);
      tCtx.fillStyle = bgGrad;
      tCtx.fillRect(-70, -70, WORLD_W + 140, WORLD_H + 140);

      if (siteId === 'mars' && mapVariant === 'classic') {
        // JEZERO OUTPOST ALPHA · CLASSIC DELTA: Braided river delta channels, ironstone strata & warm dust ripples
        tCtx.strokeStyle = 'rgba(234, 88, 12, 0.22)';
        tCtx.lineWidth = 22;
        tCtx.lineCap = 'round';
        tCtx.beginPath();
        tCtx.moveTo(-40, 240);
        tCtx.bezierCurveTo(380, 420, 760, 460, 1180, 620);
        tCtx.bezierCurveTo(1540, 760, 1920, 980, 2300, 1180);
        tCtx.stroke();

        tCtx.strokeStyle = 'rgba(251, 146, 60, 0.16)';
        tCtx.lineWidth = 10;
        tCtx.beginPath();
        tCtx.moveTo(460, 45);
        tCtx.bezierCurveTo(640, 380, 960, 820, 1150, 1290);
        tCtx.stroke();

        tCtx.strokeStyle = 'rgba(253, 186, 116, 0.08)';
        tCtx.lineWidth = 3;
        for (let dy = 60; dy < WORLD_H; dy += 110) {
          tCtx.beginPath();
          tCtx.moveTo(0, dy);
          tCtx.bezierCurveTo(650, dy - 32, 1450, dy + 32, WORLD_W, dy - 18);
          tCtx.stroke();
        }
      } else if (siteId === 'mars' && mapVariant === 'frontier') {
        // JEZERO OUTPOST ALPHA · FRONTIER VALLES CANYON RIM: Dramatic crimson rift canyon & glowing amber fumaroles
        tCtx.strokeStyle = 'rgba(15, 5, 16, 0.58)';
        tCtx.lineWidth = 56;
        tCtx.lineCap = 'round';
        tCtx.beginPath();
        tCtx.moveTo(-40, 960);
        tCtx.bezierCurveTo(420, 880, 940, 580, 1480, 360);
        tCtx.bezierCurveTo(1820, 220, 2060, 120, 2320, 40);
        tCtx.stroke();

        tCtx.strokeStyle = 'rgba(251, 113, 133, 0.24)';
        tCtx.lineWidth = 14;
        tCtx.beginPath();
        tCtx.moveTo(-40, 960);
        tCtx.bezierCurveTo(420, 880, 940, 580, 1480, 360);
        tCtx.bezierCurveTo(1820, 220, 2060, 120, 2320, 40);
        tCtx.stroke();

        // Warm canyon thermal glow pools along safe corners
        [
          [530, 620],
          [1560, 1080],
          [2140, 520],
        ].forEach(([vx, vy]) => {
          const vg = tCtx.createRadialGradient(vx, vy, 4, vx, vy, 38);
          vg.addColorStop(0, 'rgba(251, 146, 60, 0.36)');
          vg.addColorStop(1, 'rgba(251, 146, 60, 0)');
          tCtx.fillStyle = vg;
          tCtx.beginPath();
          tCtx.arc(vx, vy, 38, 0, Math.PI * 2);
          tCtx.fill();
        });
      } else if (siteId === 'moon' && mapVariant === 'classic') {
        // ARTEMIS BASE CAMP · CLASSIC SHACKLETON RIM: Bright ejecta rays & icy blue fissures
        tCtx.strokeStyle = 'rgba(226, 232, 240, 0.12)';
        tCtx.lineWidth = 14;
        [
          [54, 170, 560, 640],
          [54, 170, 440, 40],
          [2140, 195, 1620, 680],
          [1060, 1210, 540, 980],
        ].forEach(([x1, y1, x2, y2]) => {
          tCtx.beginPath();
          tCtx.moveTo(x1, y1);
          tCtx.lineTo(x2, y2);
          tCtx.stroke();
        });

        tCtx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        tCtx.lineWidth = 4;
        tCtx.beginPath();
        tCtx.moveTo(460, 1080);
        tCtx.quadraticCurveTo(560, 1030, 620, 1140);
        tCtx.moveTo(1440, 1120);
        tCtx.quadraticCurveTo(1520, 1180, 1590, 1260);
        tCtx.stroke();
      } else {
        // ARTEMIS BASE CAMP · FRONTIER TRANQUILLITY LAVA-TUBE RING: Deep indigo basalt maria & glowing lava-tube skylights
        tCtx.strokeStyle = 'rgba(34, 211, 238, 0.16)';
        tCtx.lineWidth = 28;
        tCtx.lineCap = 'round';
        tCtx.beginPath();
        tCtx.moveTo(40, 40);
        tCtx.bezierCurveTo(480, 390, 980, 610, 1520, 960);
        tCtx.lineTo(2220, 1260);
        tCtx.stroke();

        // Subsurface Glowing Cyan Lava-Tube Skylight Pits
        [
          [530, 620, 24],
          [1050, 395, 22],
          [1550, 620, 24],
          [1480, 1165, 28],
        ].forEach(([lx, ly, lr]) => {
          const lg = tCtx.createRadialGradient(lx, ly, 2, lx, ly, lr + 14);
          lg.addColorStop(0, 'rgba(34, 211, 238, 0.36)');
          lg.addColorStop(1, 'rgba(14, 165, 233, 0)');
          tCtx.fillStyle = lg;
          tCtx.beginPath();
          tCtx.arc(lx, ly, lr + 14, 0, Math.PI * 2);
          tCtx.fill();
        });
      }

      const craters =
        siteId === 'mars'
          ? [
              { x: 54, y: 170, r: 34 },
              { x: 530, y: 52, r: 30 },
              { x: 1050, y: 55, r: 28 },
              { x: 2140, y: 195, r: 38 },
              { x: 52, y: 525, r: 26 },
              { x: 1060, y: 1210, r: 34 },
              { x: 1475, y: 1165, r: 30 },
            ]
          : [
              { x: 54, y: 170, r: 46 },
              { x: 530, y: 52, r: 42 },
              { x: 1050, y: 55, r: 38 },
              { x: 1570, y: 58, r: 44 },
              { x: 2140, y: 195, r: 52 },
              { x: 52, y: 525, r: 36 },
              { x: 2165, y: 525, r: 40 },
              { x: 42, y: 1125, r: 38 },
              { x: 512, y: 1205, r: 42 },
              { x: 1060, y: 1210, r: 48 },
              { x: 1475, y: 1165, r: 40 },
            ];
      for (const c of craters) {
        tCtx.fillStyle =
          siteId === 'mars' ? 'rgba(251, 146, 60, 0.16)' : 'rgba(226, 232, 240, 0.22)';
        tCtx.beginPath();
        tCtx.arc(c.x - 2, c.y - 2, c.r + 3, 0, Math.PI * 2);
        tCtx.fill();
        tCtx.fillStyle = terrainColor;
        tCtx.beginPath();
        tCtx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        tCtx.fill();
        tCtx.fillStyle = siteId === 'mars' ? 'rgba(2, 6, 23, 0.28)' : 'rgba(2, 6, 23, 0.56)';
        tCtx.beginPath();
        tCtx.arc(c.x + 4, c.y + 4, c.r * 0.78, 0, Math.PI * 2);
        tCtx.fill();
      }

      [
        [44, 65, 13],
        [2185, 70, 16],
        [520, 435, 11],
        [1050, 435, 11],
        [1580, 435, 11],
        [520, 660, 12],
        [1050, 660, 12],
        [1490, 995, 14],
      ].forEach(([rx, ry, rr]) => {
        tCtx.fillStyle = 'rgba(2, 6, 23, 0.45)';
        tCtx.beginPath();
        tCtx.ellipse(rx + 4, ry + 5, rr * 1.15, rr * 0.65, 0, 0, Math.PI * 2);
        tCtx.fill();
        tCtx.fillStyle = siteId === 'mars' ? '#9A3412' : '#64748B';
        tCtx.beginPath();
        tCtx.arc(rx, ry, rr, 0, Math.PI * 2);
        tCtx.fill();
      });

      const corridors = [
        // Wide main pressurized command spine connecting all 4 top bays & bottom bays + Lounge
        { x: 180, y: 475, w: 1840, h: 110 },
        // North feeder corridors (into Power, Life Support, Bio-Dome, Food Lab)
        { x: 220, y: 368, w: 100, h: 114 },
        { x: 740, y: 368, w: 100, h: 114 },
        { x: 1260, y: 368, w: 100, h: 114 },
        { x: 1792, y: 368, w: 100, h: 114 },
        // South feeder corridors (into Shield, EVA, Comms, Crew Mess Lounge)
        { x: 220, y: 578, w: 100, h: 126 },
        { x: 740, y: 578, w: 100, h: 126 },
        { x: 1260, y: 578, w: 100, h: 126 },
        { x: 1792, y: 578, w: 100, h: 120 },
        // Pressurized vertical link from Shield Vault (y=950) down to Academy Station (y=998)
        { x: 220, y: 944, w: 100, h: 60 },
      ];

      // In Frontier Ring Map Design, add elevated Perimeter Skybridge Loop links!
      if (mapVariant === 'frontier') {
        corridors.push(
          // West Cliff Skybridge linking Power <-> Shield <-> Academy outer wing
          { x: 38, y: 245, w: 44, h: 880 },
          { x: 38, y: 230, w: 62, h: 42 },
          { x: 38, y: 800, w: 62, h: 42 },
          { x: 38, y: 1102, w: 62, h: 42 },
          // North & South Elevated Plaza Ring Overpasses
          { x: 295, y: 412, w: 1525, h: 32 },
          { x: 295, y: 618, w: 1525, h: 32 }
        );
      }

      tCtx.fillStyle =
        siteId === 'mars'
          ? mapVariant === 'frontier'
            ? '#1E111E'
            : '#131622'
          : mapVariant === 'frontier'
          ? '#081833'
          : '#0B1324';
      tCtx.strokeStyle =
        siteId === 'mars'
          ? mapVariant === 'frontier'
            ? '#FB7185'
            : '#7C2D12'
          : mapVariant === 'frontier'
          ? '#22D3EE'
          : '#38BDF8';
      tCtx.lineWidth = 4;
      for (const cor of corridors) {
        tCtx.fillRect(cor.x, cor.y, cor.w, cor.h);
        tCtx.strokeRect(cor.x, cor.y, cor.w, cor.h);
      }

      // Subtle site terrain banner along top Command Spine
      tCtx.font = '800 11px "JetBrains Mono", monospace';
      tCtx.textAlign = 'center';
      tCtx.fillStyle = siteId === 'mars' ? 'rgba(253, 186, 116, 0.56)' : 'rgba(125, 211, 252, 0.62)';
      tCtx.fillText(
        siteId === 'mars'
          ? mapVariant === 'frontier'
            ? 'JEZERO OUTPOST ALPHA · VALLES CANYON RIM RING · 18.38°N 77.58°E'
            : 'JEZERO OUTPOST ALPHA · MARS DELTA CORE · 18.38°N 77.58°E'
          : mapVariant === 'frontier'
          ? 'ARTEMIS BASE CAMP · TRANQUILLITY LAVA-TUBE RING · 89.9°S'
          : 'ARTEMIS BASE CAMP · SHACKLETON RIM CORE · 89.9°S',
        1060,
        493
      );

      tCtx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      tCtx.lineWidth = 2;
      for (let gx = 200; gx <= 1995; gx += 48) {
        tCtx.beginPath();
        tCtx.moveTo(gx, 479);
        tCtx.lineTo(gx, 581);
        tCtx.stroke();
      }

      [270, 790, 1310, 1842].forEach((dx) => {
        tCtx.fillStyle = siteId === 'mars' ? 'rgba(245, 158, 11, 0.55)' : 'rgba(56, 189, 248, 0.55)';
        tCtx.fillRect(dx - 38, 372, 76, 4);
        tCtx.fillRect(dx - 38, 690, 76, 4);
      });
      tCtx.fillStyle = 'rgba(250, 204, 21, 0.65)';
      tCtx.fillRect(232, 994, 76, 4);

      tCtx.restore();
    };

    const drawMiniRadar = (
      gs: GameStateSnapshot,
      isDanceParty: boolean
    ) => {
      const rx = RADAR_X;
      const ry = RADAR_Y;
      const rw = RADAR_W;
      const rh = RADAR_H;
      const mapPadBottom = 18;
      const mapH = rh - mapPadBottom;
      const scaleX = rw / WORLD_W;
      const scaleY = mapH / WORLD_H;

      const visW = VIEW_W / cameraZoom;
      const visH = VIEW_H / cameraZoom;

      ctx.save();
      ctx.fillStyle = gs.siteId === 'mars' ? 'rgba(34, 15, 10, 0.90)' : 'rgba(9, 17, 34, 0.90)';
      ctx.strokeStyle = isDanceParty
        ? '#F472B6'
        : gs.mapVariant === 'frontier'
        ? '#FACC15'
        : gs.siteId === 'mars'
        ? '#F97316'
        : '#38BDF8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, 10);
      ctx.fill();
      ctx.stroke();

      // Frontier Ring Loop overlay on Mini-Radar
      if (gs.mapVariant === 'frontier') {
        ctx.strokeStyle = gs.siteId === 'mars' ? 'rgba(251, 113, 133, 0.55)' : 'rgba(34, 211, 238, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(
          rx + 42 * scaleX,
          ry + 245 * scaleY,
          (1842 - 42) * scaleX,
          (820 - 245) * scaleY
        );
      }

      // Room dots
      OUTPOST_ROOMS.forEach((rm) => {
        const done = gs.completedTasksToday.includes(rm.id);
        ctx.fillStyle = done ? '#10B981' : rm.accentColor;
        ctx.fillRect(
          rx + rm.x * scaleX,
          ry + rm.y * scaleY,
          Math.max(8, rm.w * scaleX),
          Math.max(7, rm.h * scaleY)
        );
      });

      // Crew Lounge block
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.fillRect(
        rx + MESS_LOUNGE_ZONE.x * scaleX,
        ry + MESS_LOUNGE_ZONE.y * scaleY,
        MESS_LOUNGE_ZONE.w * scaleX,
        MESS_LOUNGE_ZONE.h * scaleY
      );

      // Expansion Wing outline
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        rx + FUTURE_EXPANSION_PLOT.x * scaleX,
        ry + FUTURE_EXPANSION_PLOT.y * scaleY,
        FUTURE_EXPANSION_PLOT.w * scaleX,
        FUTURE_EXPANSION_PLOT.h * scaleY
      );

      // Viewport rectangle 1:1 synced with cameraZoom + manual/follow pan via computeRadarViewportRect
      const radarVp = computeRadarViewportRect(
        camX,
        camY,
        visW,
        visH,
        rx,
        ry,
        rw,
        mapH,
        WORLD_W,
        WORLD_H
      );
      ctx.strokeStyle = manualPanActive ? '#FACC15' : 'rgba(248, 250, 252, 0.72)';
      ctx.lineWidth = manualPanActive ? 1.8 : 1.3;
      ctx.strokeRect(radarVp.x, radarVp.y, radarVp.w, radarVp.h);

      // Waypoint crosshair if moving via Radar
      if (player.targetX !== null && player.targetY !== null) {
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rx + player.targetX * scaleX, ry + player.targetY * scaleY, 4.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // NPCs
      for (const npc of npcs) {
        ctx.fillStyle = npc.color;
        ctx.beginPath();
        ctx.arc(rx + npc.x * scaleX, ry + npc.y * scaleY, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // WALL·E Gold Square Indicator on Base Radar
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(rx + wallE.x * scaleX - 2.5, ry + wallE.y * scaleY - 2.5, 5, 5);

      // Player
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(rx + player.x * scaleX, ry + player.y * scaleY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Clear footer backdrop so room blocks never overlap caption text
      ctx.fillStyle = 'rgba(7, 11, 20, 0.94)';
      ctx.fillRect(rx + 2, ry + rh - 16, rw - 4, 14);
      ctx.font = '700 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = manualPanActive ? '#FDE68A' : gs.siteId === 'mars' ? '#FDBA74' : '#BAE6FD';
      const radarCaption = manualPanActive
        ? 'RADAR · DRAG PAN / WALK'
        : gs.siteId === 'mars'
        ? gs.mapVariant === 'frontier'
          ? 'MARS CANYON · RADAR'
          : 'MARS DELTA · RADAR'
        : gs.mapVariant === 'frontier'
        ? 'MOON LAVA-TUBE · RADAR'
        : 'MOON SHACKLETON · RADAR';
      ctx.fillText(radarCaption, rx + 8, ry + rh - 6);

      // Map Zoom Bar cleanly tucked below Base Radar
      ctx.fillStyle = 'rgba(9, 14, 26, 0.9)';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(rx, ZOOM_BAR_Y, rw, ZOOM_BAR_H, 8);
      ctx.fill();
      ctx.stroke();

      // - / zoom / + dividers
      ctx.strokeStyle = '#1E293B';
      ctx.beginPath();
      ctx.moveTo(rx + 46, ZOOM_BAR_Y + 4);
      ctx.lineTo(rx + 46, ZOOM_BAR_Y + ZOOM_BAR_H - 4);
      ctx.moveTo(rx + rw - 46, ZOOM_BAR_Y + 4);
      ctx.lineTo(rx + rw - 46, ZOOM_BAR_Y + ZOOM_BAR_H - 4);
      ctx.stroke();

      ctx.font = '700 14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = cameraZoom <= MIN_MAP_ZOOM + 0.02 ? '#475569' : '#F8FAFC';
      ctx.fillText('−', rx + 23, ZOOM_BAR_Y + 19);

      ctx.fillStyle = cameraZoom >= MAX_MAP_ZOOM - 0.02 ? '#475569' : '#F8FAFC';
      ctx.fillText('+', rx + rw - 23, ZOOM_BAR_Y + 19);

      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#38BDF8';
      ctx.fillText(`🔍 ${cameraZoom.toFixed(2)}x`, rx + rw / 2, ZOOM_BAR_Y + 18);

      // Center Cadet button when free-panning map or Radar
      if (manualPanActive) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(rx, CENTER_BAR_Y, rw, CENTER_BAR_H, 7);
        ctx.fill();
        ctx.stroke();

        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#FDE68A';
        ctx.fillText('🎯 CENTER CADET [C]', rx + rw / 2, CENTER_BAR_Y + 16);
      }

      ctx.restore();
    };

    const steerNpcToward = (
      npc: NpcCrewmate,
      tx: number,
      ty: number,
      speed: number,
      dt: number
    ): boolean => {
      const key = `${Math.round(tx)},${Math.round(ty)}`;
      if (npc.pathKey !== key || npc.path.length === 0) {
        npc.pathKey = key;
        npc.path = buildOutpostCorridorPath(npc.x, npc.y, tx, ty);
      }
      const { arrived, movedDist } = advancePathFollower(npc, speed, dt);
      npc.walkDist += movedDist;
      if (arrived) {
        npc.pathKey = '';
      }
      return arrived;
    };

    const steerWallEToward = (tx: number, ty: number, speed: number, dt: number): boolean => {
      const key = `${Math.round(tx)},${Math.round(ty)}`;
      if (wallE.pathKey !== key || wallE.path.length === 0) {
        wallE.pathKey = key;
        wallE.path = buildOutpostCorridorPath(wallE.x, wallE.y, tx, ty);
      }
      const { arrived, movedDist } = advancePathFollower(wallE, speed, dt);
      wallE.treadDist += movedDist;
      if (arrived) {
        wallE.pathKey = '';
      }
      return arrived;
    };

    const applyScheduleMode = (mode: CrewScheduleMode) => {
      activeScheduleMode = mode;
      for (const npc of npcs) {
        npc.goalX = null;
        npc.goalY = null;
        npc.goalFacing = null;
        npc.path = [];
        npc.pathKey = '';
        npc.pendingAction = null;
        npc.pendingDuration = 0;
        npc.pendingBubble = '';
        if (isWorkingActivity(npc.activity)) {
          npc.activity = 'walk';
          npc.bubble = '';
        }
      }

      if (mode === 'solo_serious_work') {
        const roomPick = pickFourDistinctRooms(roomDeck);
        for (const npc of npcs) {
          const rid = roomPick[npc.roleId];
          const room = OUTPOST_ROOMS.find((r) => r.id === rid) || OUTPOST_ROOMS[0];
          const slot = getSafeRoomAnchors(room).workSlots[0];
          const startBehavior = pickNextStationBehavior(npc.roleId, npc.activity);
          npc.goalX = slot.x;
          npc.goalY = slot.y;
          npc.goalFacing = slot.facing;
          npc.pendingAction = startBehavior;
          npc.pendingDuration = 7.8;
          npc.workShiftTimer = 2.6 + Math.random() * 1.1;
          npc.pendingBubble = roomWorkDecks[room.id].next();
        }
      } else if (mode === 'pair_work') {
        const assign = pickFreshPairAssignment(pairRotationIdx++, roomDeck);
        const roomA = OUTPOST_ROOMS.find((r) => r.id === assign.roomA) || OUTPOST_ROOMS[0];
        const roomB = OUTPOST_ROOMS.find((r) => r.id === assign.roomB) || OUTPOST_ROOMS[1];
        const slotsA = getSafeRoomAnchors(roomA).workSlots;
        const slotsB = getSafeRoomAnchors(roomB).workSlots;

        assign.pairA.forEach((roleId, idx) => {
          const npc = npcs.find((n) => n.roleId === roleId);
          if (!npc) return;
          const slot = slotsA[idx % slotsA.length];
          const startBehavior = pickNextStationBehavior(npc.roleId, npc.activity);
          npc.goalX = slot.x;
          npc.goalY = slot.y;
          npc.goalFacing = slot.facing;
          npc.pendingAction = startBehavior;
          npc.pendingDuration = 7.4;
          npc.workShiftTimer = 2.5 + idx * 0.8;
          npc.pendingBubble = roomWorkDecks[roomA.id].next();
        });
        assign.pairB.forEach((roleId, idx) => {
          const npc = npcs.find((n) => n.roleId === roleId);
          if (!npc) return;
          const slot = slotsB[idx % slotsB.length];
          const startBehavior = pickNextStationBehavior(npc.roleId, npc.activity);
          npc.goalX = slot.x;
          npc.goalY = slot.y;
          npc.goalFacing = slot.facing;
          npc.pendingAction = startBehavior;
          npc.pendingDuration = 7.4;
          npc.workShiftTimer = 2.5 + idx * 0.8;
          npc.pendingBubble = roomWorkDecks[roomB.id].next();
        });
      } else if (mode === 'squad_work') {
        const targetId = roomDeck.next();
        const room = OUTPOST_ROOMS.find((r) => r.id === targetId) || OUTPOST_ROOMS[2];
        const slots = getSafeRoomAnchors(room).workSlots;
        npcs.forEach((npc, idx) => {
          const slot = slots[idx % slots.length];
          const startBehavior = pickNextStationBehavior(npc.roleId, npc.activity);
          npc.goalX = slot.x;
          npc.goalY = slot.y;
          npc.goalFacing = slot.facing;
          npc.pendingAction = startBehavior;
          npc.pendingDuration = 7.6;
          npc.workShiftTimer = 2.4 + (idx % 2) * 1.1;
          npc.pendingBubble = roomWorkDecks[room.id].next();
        });
      } else if (mode === 'cafe_hangout') {
        cafeRotationIdx = (cafeRotationIdx + 1) % CREW_CAFE_ROTATIONS.length;
        activeCafePreset = pickCrewCafeSeating(cafeRotationIdx);
        npcs.forEach((npc) => {
          const seatIndex = activeCafePreset.seats[npc.roleId];
          const seat = MESS_LOUNGE_ZONE.diningSeats[seatIndex];
          npc.seatIdx = seatIndex;
          npc.goalX = seat.x;
          npc.goalY = seat.y;
          npc.goalFacing = seat.facing;
          npc.pendingAction = 'eat';
          npc.pendingDuration = 6.4;
          npc.pendingBubble = activeCafePreset.lines[npc.roleId];
        });
      } else if (mode === 'serious_play') {
        pendingPlayScene = seriousPlayDeck.next();
        seriousPlayTimeout = 6.0;
        const spots =
          pendingPlayScene.location === 'lounge'
            ? [
                { x: 1962, y: 774, facing: 1 },
                { x: 2046, y: 774, facing: -1 },
                { x: 1962, y: 834, facing: 1 },
                { x: 2046, y: 834, facing: -1 },
              ]
            : [
                { x: 1170, y: 515, facing: 1 },
                { x: 1245, y: 545, facing: 1 },
                { x: 1325, y: 515, facing: -1 },
                { x: 1400, y: 545, facing: -1 },
              ];
        npcs.forEach((npc, idx) => {
          const sp = spots[idx % spots.length];
          npc.goalX = sp.x;
          npc.goalY = sp.y;
          npc.goalFacing = sp.facing;
          npc.pendingAction = pendingPlayScene.vibe === 'dance' ? 'dance' : 'cheer';
          npc.pendingDuration = 4.6;
          npc.pendingBubble = pendingPlayScene.lines[npc.roleId];
        });
      }
    };

    // Start first lively pair-work schedule immediately
    applyScheduleMode('pair_work');

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const timeSec = now / 1000;
      const nowMs = Date.now();

      const {
        gameState: gs,
        shellState: curShell,
        activeModalRoom: curModal,
        crewColor: curColor,
        dancePartyUntil: danceEnd,
        crewFeastUntil: feastEnd,
      } = stateRef.current;

      const isDanceParty = nowMs < danceEnd;
      const isFeastActive = nowMs < feastEnd;

      const site = MISSION_SITES[gs.siteId];
      const mapDesign = getOutpostMapDesign(gs.siteId, gs.mapVariant);
      const donki = getDonkiEventForSol(gs.sol);

      // Update player physics when in 'playing' and no modal open
      let playerMoving = false;
      if (curShell === 'playing' && curModal === null) {
        let moveX = 0;
        let moveY = 0;
        if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) moveX -= 1;
        if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) moveX += 1;
        if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) moveY -= 1;
        if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) moveY += 1;

        const speed = 285;
        if (moveX !== 0 || moveY !== 0) {
          player.targetX = null;
          player.targetY = null;
          player.path = [];
          const len = Math.hypot(moveX, moveY);
          playerMoving = true;
          player.activity = 'walk';
          player.bubble = '';
          const nx = moveX / len;
          const ny = moveY / len;
          player.vx = nx * speed;
          player.vy = ny * speed;
          if (Math.abs(nx) > 0.08) {
            player.facing = nx > 0 ? 1 : -1;
          }
          const stepDelta = speed * dt;
          player.x = Math.max(PLAYER_MIN_X, Math.min(PLAYER_MAX_X, player.x + player.vx * dt));
          player.y = Math.max(PLAYER_MIN_Y, Math.min(PLAYER_MAX_Y, player.y + player.vy * dt));
          player.walkDist += stepDelta;
          player.stepAccum += stepDelta;
        } else if (player.targetX !== null && player.targetY !== null) {
          if (player.path.length === 0) {
            player.path = buildOutpostCorridorPath(player.x, player.y, player.targetX, player.targetY);
          }
          const { arrived, movedDist } = advancePathFollower(player, speed, dt);
          if (movedDist > 0) {
            playerMoving = true;
            player.activity = 'walk';
            player.bubble = '';
            player.walkDist += movedDist;
            player.stepAccum += movedDist;
          }
          if (arrived) {
            player.targetX = null;
            player.targetY = null;
            player.path = [];
            if (player.pendingRoomClick) {
              const targetRoom = player.pendingRoomClick;
              player.pendingRoomClick = null;
              spaceAudio.playBreakerClick(true);
              stateRef.current.onSelectRoom(targetRoom);
            } else if (player.pendingPropClick) {
              const targetProp = player.pendingPropClick;
              player.pendingPropClick = null;
              activateProp(targetProp);
            }
          }
        } else {
          player.vx = 0;
          player.vy = 0;
          if (player.activity !== 'walk') {
            player.activityTimer -= dt;
            if (player.activityTimer <= 0) {
              player.activity = 'walk';
              player.bubble = '';
            }
          }
        }

        if (playerMoving && player.stepAccum > 62) {
          player.stepAccum = 0;
          spaceAudio.playFootstep();
          spawnParticle(
            player.x,
            player.y + 20,
            (Math.random() - 0.5) * 20,
            -12,
            2.6,
            '#94A3B8',
            0.32
          );
        }
      }

      // Exponential squash-and-stretch damping
      player.scaleX += (1 - player.scaleX) * Math.min(1, dt * 14);
      player.scaleY += (1 - player.scaleY) * Math.min(1, dt * 14);

      // Check external HUD "Join Crew" trigger
      if (stateRef.current.joinCrewNonce !== undefined && stateRef.current.joinCrewNonce !== lastJoinCrewNonce) {
        lastJoinCrewNonce = stateRef.current.joinCrewNonce;
        triggerCadetJoinCrew();
      }

      // Check external HUD clickable Emote command (Happy / Working / Sad / Thinking)
      const extEmoteCmd = stateRef.current.cadetEmoteCommand;
      if (extEmoteCmd && extEmoteCmd.nonce !== lastCadetEmoteNonce) {
        lastCadetEmoteNonce = extEmoteCmd.nonce;
        triggerCadetEmote(extEmoteCmd.emote);
      }

      // Dynamic Non-Repetitive 5-Mode Crew Director + Same-Room Proximity Chit-Chat
      const npcHan = npcs.find((n) => n.roleId === 'han');
      const npcFeng = npcs.find((n) => n.roleId === 'feng');
      const npcKun = npcs.find((n) => n.roleId === 'kun');
      const npcXin = npcs.find((n) => n.roleId === 'xin');

      pairMeetCooldown = Math.max(0, pairMeetCooldown - dt);
      sisMeetCooldown = Math.max(0, sisMeetCooldown - dt);
      sameRoomMeetCooldown = Math.max(0, sameRoomMeetCooldown - dt);

      if (isFeastActive && !wasFeastActive) {
        cafeRotationIdx = (cafeRotationIdx + 1) % CREW_CAFE_ROTATIONS.length;
        activeCafePreset = pickCrewCafeSeating(cafeRotationIdx);
        npcs.forEach((n) => {
          n.seatIdx = activeCafePreset.seats[n.roleId];
        });
      }
      wasFeastActive = isFeastActive;

      if (!isDanceParty && !isFeastActive) {
        scheduleTimer -= dt;
        if (scheduleTimer <= 0) {
          const nextMode = scheduleDeck.next();
          scheduleTimer =
            nextMode === 'serious_play'
              ? 11.5
              : nextMode === 'cafe_hangout'
              ? 13.0
              : 13.5 + Math.random() * 3.5;
          applyScheduleMode(nextMode);
        }
      }

      if (activeScheduleMode === 'serious_play' && !isDanceParty && !isFeastActive && seriousPlayTimeout > 0) {
        seriousPlayTimeout -= dt;
        const allArrivedOrTimedOut =
          npcs.every((n) => n.goalX === null) || seriousPlayTimeout <= 0;
        if (allArrivedOrTimedOut) {
          seriousPlayTimeout = 0;
          for (const member of npcs) {
            member.goalX = null;
            member.goalY = null;
            member.activity = pendingPlayScene.vibe === 'dance' ? 'dance' : 'cheer';
            member.activityTimer = 4.6;
            member.bubble = pendingPlayScene.lines[member.roleId];
            member.chatCooldown = 10;
            spawnParticle(
              member.x,
              member.y - 26,
              (Math.random() - 0.5) * 34,
              -24 - Math.random() * 14,
              3.4,
              member.color,
              0.85
            );
          }
        }
      }

      npcs.forEach((npc) => {
        npc.timer += dt;
        npc.chatCooldown = Math.max(0, npc.chatCooldown - dt);

        if (isDanceParty) {
          npc.activity = 'dance';
          npc.bubble =
            npc.roleId === 'han' || npc.roleId === 'feng'
              ? '♪ Homies Dance!'
              : '♪ Sisters Groove!';
          if (Math.random() < 0.04) {
            spawnParticle(
              npc.x + (Math.random() - 0.5) * 26,
              npc.y - 34,
              (Math.random() - 0.5) * 28,
              -32 - Math.random() * 20,
              3,
              Math.random() < 0.5 ? '#F472B6' : '#FACC15',
              0.9
            );
          }
          return;
        }

        if (isFeastActive) {
          const seatIdx = activeCafePreset.seats[npc.roleId];
          const seat = MESS_LOUNGE_ZONE.diningSeats[seatIdx % MESS_LOUNGE_ZONE.diningSeats.length];
          const arrived = steerNpcToward(npc, seat.x, seat.y, 185, dt);
          if (arrived) {
            npc.activity = 'eat';
            npc.facing = seat.facing;
            npc.bubble = activeCafePreset.lines[npc.roleId];
          } else {
            npc.activity = 'walk';
            npc.bubble = 'Heading to Crew Cafe!';
          }
          return;
        }

        if (npc.activity !== 'walk') {
          npc.activityTimer -= dt;

          // Smoothly switch from one station behavior to another while working at ANY station!
          if (isWorkingActivity(npc.activity) && npc.activityTimer > 1.8) {
            npc.workShiftTimer -= dt;
            if (npc.workShiftTimer <= 0) {
              npc.workShiftTimer = 2.6 + Math.random() * 1.2;
              const nextBehavior = pickNextStationBehavior(npc.roleId, npc.activity);
              npc.activity = nextBehavior;
              const lines = STATION_BEHAVIOR_BUBBLES[nextBehavior][npc.roleId];
              npc.bubble = lines[Math.floor(Math.random() * lines.length)];
              spawnParticle(npc.x + npc.facing * 12, npc.y - 16, 0, -18, 2.6, npc.color, 0.55);
            }
          }

          if (npc.activityTimer <= 0) {
            // After eating in Crew Cafe, often hop onto the Neon Dance Pad together!
            if (npc.activity === 'eat' && activeScheduleMode === 'cafe_hangout') {
              const padCenterX = MESS_LOUNGE_ZONE.danceFloor.x + MESS_LOUNGE_ZONE.danceFloor.w / 2;
              const padCenterY = MESS_LOUNGE_ZONE.danceFloor.y + MESS_LOUNGE_ZONE.danceFloor.h / 2;
              const seatNum = activeCafePreset.seats[npc.roleId];
              npc.activity = 'walk';
              npc.goalX = padCenterX + (seatNum % 2 === 0 ? -26 : 26);
              npc.goalY = padCenterY + (seatNum < 2 ? -18 : 18);
              npc.goalFacing = seatNum % 2 === 0 ? 1 : -1;
              npc.pendingAction = 'dance';
              npc.pendingDuration = 4.0;
              npc.pendingBubble =
                npc.roleId === 'han' || npc.roleId === 'feng'
                  ? '♪ Post-lunch dance!'
                  : '♪ Dancing together!';
            } else {
              npc.activity = 'walk';
              npc.path = [];
              npc.pathKey = '';
              npc.bubble = '';
            }
          }
          return;
        }

        // Priority goal steering (station work shifts, Crew Cafe seats, serious_play, or partner reactions)
        if (npc.goalX !== null && npc.goalY !== null) {
          const arrived = steerNpcToward(npc, npc.goalX, npc.goalY, 132, dt);
          if (arrived) {
            if (npc.goalFacing !== null) npc.facing = npc.goalFacing;
            npc.goalX = null;
            npc.goalY = null;
            if (npc.pendingAction) {
              npc.activity = npc.pendingAction;
              npc.activityTimer = npc.pendingDuration || 4.0;
              npc.bubble = npc.pendingBubble;
              npc.pendingAction = null;
              if (isWorkingActivity(npc.activity)) {
                npc.workShiftTimer = 2.6 + Math.random() * 1.1;
                spawnParticle(npc.x + npc.facing * 12, npc.y - 16, 0, -18, 2.6, npc.color, 0.55);
              }
            }
          }
          return;
        }

        // In free_roam mode, Tech-Feng stays smoothly beside Commander-Han via safe corridor pathing (zero shaking!)
        if (activeScheduleMode === 'free_roam' && npc.roleId === 'feng' && npcHan && npcHan.activity === 'walk') {
          const companionX = npcHan.x - npcHan.facing * 64;
          const companionY = Math.abs(npcHan.y - 530) < 42 ? npcHan.y + 12 : npcHan.y;
          const dist = Math.hypot(companionX - npc.x, companionY - npc.y);
          if (dist > 52) {
            const catchupSpeed = dist > 180 ? 132 : 98;
            steerNpcToward(npc, companionX, companionY, catchupSpeed, dt);
          } else {
            npc.path = [];
            npc.pathKey = '';
            npc.facing = npcHan.facing;
            if (pairMeetCooldown <= 0) {
              const ex = pickPairReactionExchange('han', 'feng', sameRoomChatDeck);
              npcHan.activity = ex.actA;
              npc.activity = ex.actB;
              npcHan.activityTimer = 3.1;
              npc.activityTimer = 3.1;
              npcHan.facing = npc.x >= npcHan.x ? 1 : -1;
              npc.facing = npcHan.x >= npc.x ? 1 : -1;
              npcHan.bubble = ex.lineA;
              npc.bubble = ex.lineB;
              npcHan.chatCooldown = 9;
              npc.chatCooldown = 9;
              pairMeetCooldown = 10.5;
              spawnParticle((npcHan.x + npc.x) / 2, npcHan.y - 26, 0, -24, 3.6, '#F59E0B', 0.8);
            }
          }
          return;
        }

        if (npc.policy === 'orbiter') {
          followWaypoints(npc, orbiterWaypoints, 88, dt);
        } else if (npc.policy === 'patroller') {
          followWaypoints(npc, patrolWaypoints, 102, dt);
        } else if (npc.policy === 'commander') {
          followWaypoints(npc, commanderWaypoints, 90, dt);
        } else {
          followWaypoints(npc, sentryWaypoints, 84, dt);
        }
      });

      // Gentle anti-stacking ONLY for free-roaming NPCs on the wide Command Spine (never fights doorways/goals/anchors!)
      for (let i = 0; i < npcs.length; i++) {
        const a = npcs[i];
        if (a.activity !== 'walk' || a.goalX !== null || Math.abs(a.y - 530) > 36) continue;
        for (let j = i + 1; j < npcs.length; j++) {
          const b = npcs[j];
          if (b.activity !== 'walk' || b.goalX !== null || Math.abs(b.y - 530) > 36) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 48 && dist > 0.01) {
            const laneShift = (48 - dist) * 0.14;
            a.y = Math.max(496, Math.min(564, a.y - laneShift));
            b.y = Math.max(496, Math.min(564, b.y + laneShift));
          }
        }
      }

      // Same-Room Varied Reactions & Chit-Chat (uses safe spacious room slots clear of console text!)
      if (!isDanceParty && !isFeastActive && activeScheduleMode !== 'serious_play' && sameRoomMeetCooldown <= 0) {
        let sparked = false;
        for (let i = 0; i < npcs.length && !sparked; i++) {
          const a = npcs[i];
          if ((a.activity !== 'walk' && !isWorkingActivity(a.activity)) || a.chatCooldown > 0 || a.goalX !== null) continue;
          const roomA = detectRoomAtPoint(a.x, a.y);
          if (!roomA) continue;
          const roomAObj = OUTPOST_ROOMS.find((r) => r.id === roomA);
          if (roomAObj && a.y < roomAObj.y + 54) continue;

          for (let j = i + 1; j < npcs.length; j++) {
            const b = npcs[j];
            if ((b.activity !== 'walk' && !isWorkingActivity(b.activity)) || b.chatCooldown > 0 || b.goalX !== null) continue;
            const roomB = detectRoomAtPoint(b.x, b.y);
            if (roomA !== roomB) continue;

            const ex = pickPairReactionExchange(a.roleId, b.roleId, sameRoomChatDeck);
            if (roomA === 'mess_lounge') {
              a.goalX = 1756;
              a.goalY = 780;
              a.goalFacing = 1;
              b.goalX = 1838;
              b.goalY = 780;
              b.goalFacing = -1;
            } else {
              const roomObj = OUTPOST_ROOMS.find((r) => r.id === roomA);
              if (!roomObj) continue;
              const slots = getSafeRoomAnchors(roomObj).chatPairSlots;
              a.goalX = slots[0].x;
              a.goalY = slots[0].y;
              a.goalFacing = slots[0].facing;
              b.goalX = slots[1].x;
              b.goalY = slots[1].y;
              b.goalFacing = slots[1].facing;
            }
            a.activity = 'walk';
            b.activity = 'walk';
            a.pendingAction = ex.actA;
            b.pendingAction = ex.actB;
            a.pendingDuration = 3.4;
            b.pendingDuration = 3.4;
            a.pendingBubble = ex.lineA;
            b.pendingBubble = ex.lineB;
            a.chatCooldown = 11;
            b.chatCooldown = 11;
            sameRoomMeetCooldown = 8.5;
            sparked = true;
            break;
          }
        }
      }

      // Sisters Kun & Xin reminiscing about Earth, Mars & Moon + Cadet & Cross-Pair reactions
      if (!isDanceParty && !isFeastActive) {
        if (
          activeScheduleMode === 'free_roam' &&
          npcKun &&
          npcXin &&
          npcKun.activity === 'walk' &&
          npcXin.activity === 'walk' &&
          npcKun.goalX === null &&
          npcXin.goalX === null
        ) {
          const roomKun = detectRoomAtPoint(npcKun.x, npcKun.y);
          const roomXin = detectRoomAtPoint(npcXin.x, npcXin.y);
          const canMeetSisters =
            (roomKun !== null && roomKun === roomXin) ||
            (Math.abs(npcKun.y - 530) < 38 && Math.abs(npcXin.y - 530) < 38);
          const distSis = Math.hypot(npcKun.x - npcXin.x, npcKun.y - npcXin.y);
          if (sisMeetCooldown <= 0 && canMeetSisters && distSis < 320 && distSis > 64) {
            const midX = (npcKun.x + npcXin.x) / 2;
            const midY = (npcKun.y + npcXin.y) / 2;
            steerNpcToward(npcKun, midX - 28, midY, 56, dt);
            steerNpcToward(npcXin, midX + 28, midY, 56, dt);
          } else if (sisMeetCooldown <= 0 && canMeetSisters && distSis <= 64) {
            const ex = pickPairReactionExchange('kun', 'xin', sameRoomChatDeck);
            npcKun.activity = ex.actA;
            npcXin.activity = ex.actB;
            npcKun.activityTimer = 3.8;
            npcXin.activityTimer = 3.8;
            npcKun.facing = npcXin.x >= npcKun.x ? 1 : -1;
            npcXin.facing = npcKun.x >= npcXin.x ? 1 : -1;
            npcKun.bubble = ex.lineA;
            npcXin.bubble = ex.lineB;
            npcKun.chatCooldown = 10;
            npcXin.chatCooldown = 10;
            sisMeetCooldown = 11;
            spawnParticle((npcKun.x + npcXin.x) / 2, npcKun.y - 26, 0, -22, 3.5, '#F472B6', 0.85);
          }
        }

        for (let i = 0; i < npcs.length; i++) {
          const a = npcs[i];
          if (a.activity !== 'walk' || a.chatCooldown > 0 || a.goalX !== null) continue;
          const aRoomId = detectRoomAtPoint(a.x, a.y);
          const aRoomObj = aRoomId ? OUTPOST_ROOMS.find((r) => r.id === aRoomId) : null;
          if (aRoomObj && a.y < aRoomObj.y + 54) continue;

          if (curShell === 'playing' && Math.hypot(a.x - player.x, a.y - player.y) < 62) {
            a.activity = 'wave';
            a.activityTimer = 2.4;
            a.chatCooldown = 11;
            a.facing = player.x >= a.x ? 1 : -1;
            a.bubble = cadetJoinDeck.next();
            spawnParticle((a.x + player.x) / 2, a.y - 26, 0, -22, 3.2, '#38BDF8', 0.65);
            continue;
          }

          for (let j = i + 1; j < npcs.length; j++) {
            const b = npcs[j];
            if (b.activity !== 'walk' || b.chatCooldown > 0 || b.goalX !== null) continue;
            if (Math.hypot(a.x - b.x, a.y - b.y) < 74) {
              const ex = pickPairReactionExchange(a.roleId, b.roleId, sameRoomChatDeck);
              a.activity = ex.actA;
              b.activity = ex.actB;
              a.activityTimer = 2.9;
              b.activityTimer = 2.9;
              a.chatCooldown = 12;
              b.chatCooldown = 12;
              a.facing = b.x >= a.x ? 1 : -1;
              b.facing = a.x >= b.x ? 1 : -1;
              a.bubble = ex.lineA;
              b.bubble = ex.lineB;
              spawnParticle((a.x + b.x) / 2, a.y - 26, 0, -24, 3.5, '#FACC15', 0.7);
              break;
            }
          }
        }
      }

      // Autonomous Kind WALL·E Robot Companion (chores, reminders, love & Astronaut Thank-You replies)
      wallE.crewInteractCooldown = Math.max(0, wallE.crewInteractCooldown - dt);
      wallE.cadetGreetCooldown = Math.max(0, wallE.cadetGreetCooldown - dt);
      wallE.blinkTimer -= dt;
      if (wallE.blinkTimer <= 0) {
        wallE.blinkTimer = 2.8 + Math.random() * 2.2;
      }
      if (wallE.bubbleTimer > 0) {
        wallE.bubbleTimer -= dt;
        if (wallE.bubbleTimer <= 0) {
          wallE.bubble = '';
        }
      }

      const extWallECmd = stateRef.current.wallECommand;
      if (extWallECmd && extWallECmd.nonce !== lastWallECmdNonce) {
        lastWallECmdNonce = extWallECmd.nonce;
        if (extWallECmd.action === 'thank') {
          wallE.activity = 'share_love';
          wallE.activityTimer = 3.2;
          wallE.headTilt = -0.14;
          wallE.bubble = extWallECmd.bubble || 'Waaall-E! ♥ Thank you too!';
          wallE.bubbleTimer = 3.6;
          for (let i = 0; i < 10; i++) {
            const ang = (Math.PI * 2 * i) / 10;
            spawnParticle(
              wallE.x,
              wallE.y - 24,
              Math.cos(ang) * 42,
              Math.sin(ang) * 42 - 14,
              3.2,
              '#F472B6',
              0.75
            );
          }
        } else if (extWallECmd.action === 'tip') {
          wallE.activity = 'remind_knowledge';
          wallE.activityTimer = 3.4;
          wallE.headTilt = 0.14;
          wallE.bubble = extWallECmd.bubble || 'Beep! Knowledge tip ready!';
          wallE.bubbleTimer = 3.8;
        } else if (extWallECmd.action === 'dance') {
          wallE.activity = 'dance';
          wallE.activityTimer = 5.5;
          wallE.bubble = extWallECmd.bubble || '♪ Waaall-E Boogie!';
          wallE.bubbleTimer = 5.5;
        } else if (extWallECmd.action === 'scan') {
          wallE.activity = 'scan';
          wallE.activityTimer = 4.4;
          wallE.headTilt = 0.08;
          wallE.bubble = extWallECmd.bubble || 'Beep-boop! Station telemetry optimal! ♥';
          wallE.bubbleTimer = 4.6;
          for (let i = 0; i < 10; i++) {
            const ang = (Math.PI * 2 * i) / 10;
            spawnParticle(
              wallE.x + wallE.facing * 20,
              wallE.y - 24,
              Math.cos(ang) * 46,
              Math.sin(ang) * 46 - 10,
              3.0,
              i % 2 === 0 ? '#22D3EE' : '#FACC15',
              0.75
            );
          }
        } else if (extWallECmd.action === 'tidy') {
          wallE.choreIdx = (wallE.choreIdx + 1) % WALL_E_ENVIRONMENT_CHORES.length;
          const nextChore = WALL_E_ENVIRONMENT_CHORES[wallE.choreIdx];
          wallE.activity = 'roll';
          wallE.activityTimer = 0;
          wallE.goalX = nextChore.x;
          wallE.goalY = nextChore.y;
          wallE.bubble = extWallECmd.bubble || nextChore.bubble;
          wallE.bubbleTimer = 3.2;
        }
      }

      if (isDanceParty) {
        wallE.activity = 'dance';
        wallE.bubble = '♪ Waaall-E Dance!';
        wallE.bubbleTimer = 0.6;
        if (Math.random() < 0.04) {
          spawnParticle(
            wallE.x + (Math.random() - 0.5) * 20,
            wallE.y - 36,
            (Math.random() - 0.5) * 26,
            -28,
            3.0,
            '#FACC15',
            0.8
          );
        }
      } else if (wallE.activity !== 'roll') {
        wallE.activityTimer -= dt;
        if (wallE.activityTimer <= 0) {
          wallE.activity = 'roll';
          wallE.headTilt = 0;
          wallE.choreIdx = (wallE.choreIdx + 1) % WALL_E_ENVIRONMENT_CHORES.length;
          const nextChore = WALL_E_ENVIRONMENT_CHORES[wallE.choreIdx];
          wallE.goalX = nextChore.x;
          wallE.goalY = nextChore.y;
        }
      } else {
        // Check Astronaut exchange: WALL-E reminds/loves an astronaut and they reply "Thank you, WALL-E!"
        let chattedCrew = false;
        if (!isFeastActive && wallE.crewInteractCooldown <= 0) {
          for (const npc of npcs) {
            if (npc.goalX !== null || npc.activity === 'eat' || npc.activity === 'rest') continue;
            if (Math.hypot(npc.x - wallE.x, npc.y - wallE.y) < 92) {
              const ex = pickWallEAstronautExchange(npc.roleId, wallE.exchangeSeed++);
              wallE.activity = 'remind_knowledge';
              wallE.activityTimer = 3.8;
              wallE.headTilt = 0.14;
              wallE.facing = npc.x >= wallE.x ? 1 : -1;
              wallE.bubble = ex.wallEBubble;
              wallE.bubbleTimer = 4.0;
              wallE.crewInteractCooldown = 14.0;

              npc.facing = wallE.x >= npc.x ? 1 : -1;
              npc.activity = ex.astronautReaction;
              npc.activityTimer = 3.8;
              npc.bubble = ex.astronautReply;
              npc.chatCooldown = 14.0;

              for (let i = 0; i < 8; i++) {
                const ang = (Math.PI * 2 * i) / 8;
                spawnParticle(
                  (wallE.x + npc.x) / 2,
                  (wallE.y + npc.y) / 2 - 24,
                  Math.cos(ang) * 34,
                  Math.sin(ang) * 34 - 12,
                  3.1,
                  i % 2 === 0 ? '#FACC15' : '#F472B6',
                  0.75
                );
              }
              chattedCrew = true;
              break;
            }
          }
        }

        // Check Cadet proximity greeting with love & encouragement
        if (
          !chattedCrew &&
          curShell === 'playing' &&
          wallE.cadetGreetCooldown <= 0 &&
          Math.hypot(player.x - wallE.x, player.y - wallE.y) < 88
        ) {
          wallE.activity = 'wave_cadet';
          wallE.activityTimer = 3.0;
          wallE.headTilt = -0.12;
          wallE.facing = player.x >= wallE.x ? 1 : -1;
          wallE.bubble = pickWallECadetLove(wallE.exchangeSeed++);
          wallE.bubbleTimer = 3.6;
          wallE.cadetGreetCooldown = 16.0;
          spawnParticle(wallE.x, wallE.y - 26, 0, -24, 3.3, '#F472B6', 0.8);
        } else if (!chattedCrew && wallE.goalX !== null && wallE.goalY !== null) {
          const arrivedChore = steerWallEToward(wallE.goalX, wallE.goalY, 76, dt);
          if (arrivedChore) {
            const chore = WALL_E_ENVIRONMENT_CHORES[wallE.choreIdx];
            wallE.activity = chore.activity;
            wallE.activityTimer = 4.2;
            wallE.facing = chore.facing;
            wallE.headTilt = chore.activity === 'water_plants' ? -0.1 : 0.08;
            wallE.bubble = chore.bubble;
            wallE.bubbleTimer = 4.0;
            spawnParticle(
              wallE.x + wallE.facing * 14,
              wallE.y - 12,
              0,
              -20,
              2.8,
              chore.activity === 'water_plants' ? '#38BDF8' : '#FACC15',
              0.6
            );
          }
        }
      }

      // Smooth Camera Zoom, Cursor-Anchored Manual Pan & Cadet Follow
      if (Math.abs(targetZoom - cameraZoom) > 0.001) {
        const nextZoom =
          Math.abs(targetZoom - cameraZoom) < 0.005
            ? targetZoom
            : cameraZoom + (targetZoom - cameraZoom) * Math.min(1, dt * 14);
        if (manualPanActive) {
          const anchored = computeZoomAtAnchor(
            camX,
            camY,
            cameraZoom,
            nextZoom,
            zoomAnchorCanvas.x,
            zoomAnchorCanvas.y,
            VIEW_W,
            VIEW_H,
            WORLD_W,
            WORLD_H
          );
          camX = anchored.camX;
          camY = anchored.camY;
        }
        cameraZoom = nextZoom;
      }

      const visW = VIEW_W / cameraZoom;
      const visH = VIEW_H / cameraZoom;

      if (curShell === 'title') {
        const titleTargetX = 280 + Math.sin(timeSec * 0.25) * 140;
        const titleTargetY = 120 + Math.cos(timeSec * 0.2) * 70;
        camX += (titleTargetX - camX) * Math.min(1, dt * 3);
        camY += (titleTargetY - camY) * Math.min(1, dt * 3);
      } else if (!manualPanActive) {
        const clamped = clampCameraPosition(
          player.x - visW / 2,
          player.y - visH / 2,
          cameraZoom,
          VIEW_W,
          VIEW_H,
          WORLD_W,
          WORLD_H
        );
        camX += (clamped.camX - camX) * Math.min(1, dt * 7.5);
        camY += (clamped.camY - camY) * Math.min(1, dt * 7.5);
      } else {
        const clamped = clampCameraPosition(
          camX,
          camY,
          cameraZoom,
          VIEW_W,
          VIEW_H,
          WORLD_W,
          WORLD_H
        );
        camX = clamped.camX;
        camY = clamped.camY;
      }

      // Nearest workstation console OR room interior for reliable [E] / station entry
      const insideRoomForPrompt = OUTPOST_ROOMS.find(
        (r) => player.x >= r.x && player.x <= r.x + r.w && player.y >= r.y && player.y <= r.y + r.h
      );
      let foundNearRoom: RoomId | null = insideRoomForPrompt ? insideRoomForPrompt.id : null;
      if (!foundNearRoom) {
        let bestDist = 140;
        for (const room of OUTPOST_ROOMS) {
          const d = Math.hypot(player.x - room.consoleX, player.y - (room.consoleY + 55));
          if (d < bestDist) {
            bestDist = d;
            foundNearRoom = room.id;
          }
        }
      }
      if (foundNearRoom !== lastNearRoom) {
        lastNearRoom = foundNearRoom;
        stateRef.current.onNearRoomChange(foundNearRoom);
      }

      // Nearest interactive Satellite / Lounge Prop for [E] prompt
      let foundNearProp: InteractiveWorldProp | null = null;
      let bestPropDist = Infinity;
      for (const prop of INTERACTIVE_PROPS) {
        const d = Math.hypot(player.x - prop.approachX, player.y - prop.approachY);
        if (d <= prop.triggerRadius && d < bestPropDist) {
          bestPropDist = d;
          foundNearProp = prop;
        }
      }
      const nextNearPropId = foundNearProp ? foundNearProp.id : null;
      if (nextNearPropId !== lastNearPropId) {
        lastNearPropId = nextNearPropId;
        stateRef.current.onNearPropChange?.(
          foundNearProp ? { id: foundNearProp.id, label: foundNearProp.actionHint } : null
        );
      }

      // Nearest Astronaut crewmate for [H] / HUD Join Crew button
      let foundNearCrew: NpcCrewmate | null = null;
      let bestCrewDist = 115;
      for (const npc of npcs) {
        const d = Math.hypot(player.x - npc.x, player.y - npc.y);
        if (d < bestCrewDist) {
          bestCrewDist = d;
          foundNearCrew = npc;
        }
      }
      const nextCrewSig = foundNearCrew ? `${foundNearCrew.roleId}:${foundNearCrew.activity}` : '';
      if (nextCrewSig !== lastNearCrewSig) {
        lastNearCrewSig = nextCrewSig;
        stateRef.current.onNearCrewChange?.(
          foundNearCrew
            ? {
                roleId: foundNearCrew.roleId,
                name: foundNearCrew.name,
                activity: foundNearCrew.activity,
              }
            : null
        );
      }

      // Near WALL-E proximity check for [T] / HUD Talk button
      const nearWallENow = Math.hypot(player.x - wallE.x, player.y - wallE.y) < 96;
      if (nearWallENow !== lastNearWallE) {
        lastNearWallE = nearWallENow;
        stateRef.current.onNearWallEChange?.(nearWallENow);
      }

      // Interior room detection for Adaptive Background Music
      const insideRoom =
        OUTPOST_ROOMS.find(
          (r) =>
            player.x >= r.x &&
            player.x <= r.x + r.w &&
            player.y >= r.y &&
            player.y <= r.y + r.h
        )?.id || null;
      if (insideRoom !== lastCurrentRoom) {
        lastCurrentRoom = insideRoom;
        stateRef.current.onCurrentRoomChange?.(insideRoom);
      }

      // Ambient solar wind / cosmic storm particles
      if (Math.random() < (donki.eventType === 'QUIET' ? 0.16 : 0.6)) {
        const isStorm = donki.unshieldedDoseMsv >= 10;
        spawnParticle(
          Math.random() * WORLD_W,
          10,
          (Math.random() - 0.3) * 52,
          38 + Math.random() * 58,
          isStorm ? 3.5 : 2.2,
          isStorm ? '#F97316' : '#38BDF8',
          1.45
        );
      }

      // ================= RENDERING =================
      ensureTerrainCache(
        site.id,
        gs.mapVariant,
        mapDesign.terrainColor,
        mapDesign.terrainAccent
      );
      ctx.fillStyle = '#070B14';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.save();
      ctx.scale(cameraZoom, cameraZoom);
      ctx.translate(-camX, -camY);

      // 1 & 2. Blit only visible slice of cached planetary terrain, craters, boulders & corridors
      const sliceX = Math.max(0, Math.floor(camX + 70));
      const sliceY = Math.max(0, Math.floor(camY + 70));
      const sliceW = Math.max(1, Math.min(terrainBuffer.width - sliceX, Math.ceil(visW) + 4));
      const sliceH = Math.max(1, Math.min(terrainBuffer.height - sliceY, Math.ceil(visH) + 4));
      ctx.drawImage(
        terrainBuffer,
        sliceX,
        sliceY,
        sliceW,
        sliceH,
        sliceX - 70,
        sliceY - 70,
        sliceW,
        sliceH
      );

      // Exterior Hardware Installations (with interactive satellites, dust state & unique Mars/Moon lived-in props)
      drawExteriorHardware(
        site.id,
        gs.mapVariant,
        gs.availablePowerKw,
        timeSec,
        stateRef.current.checkedPropsToday || [],
        lastNearPropId
      );

      // 3. Glowing Animated Power Conduit Cables from Reactor through Spine
      const cableTargets: Array<{ room: OutpostRoom; kw: number }> = [
        { room: OUTPOST_ROOMS[1], kw: gs.powerAllocation.lifesupport },
        { room: OUTPOST_ROOMS[2], kw: gs.powerAllocation.hydroponics },
        { room: OUTPOST_ROOMS[3], kw: Math.max(1, gs.powerAllocation.hydroponics) },
        { room: OUTPOST_ROOMS[4], kw: gs.powerAllocation.shield },
        { room: OUTPOST_ROOMS[6], kw: gs.powerAllocation.comms },
        { room: OUTPOST_ROOMS[7], kw: 1 },
      ];

      cableTargets.forEach(({ room, kw }) => {
        ctx.save();
        ctx.strokeStyle = kw > 0 ? room.accentColor : '#1E293B';
        ctx.lineWidth = kw > 0 ? 3.5 : 1.5;
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -timeSec * (kw * 26);
        ctx.beginPath();
        ctx.moveTo(270, 375);
        ctx.lineTo(270, 530);
        ctx.lineTo(room.consoleX, 530);
        ctx.lineTo(room.consoleX, room.consoleY);
        ctx.stroke();
        ctx.restore();
      });

      const traceRoomHull = (x: number, y: number, w: number, h: number) => {
        if (gs.mapVariant === 'frontier') {
          const ch = 22;
          ctx.beginPath();
          ctx.moveTo(x + ch, y);
          ctx.lineTo(x + w - ch, y);
          ctx.lineTo(x + w, y + ch);
          ctx.lineTo(x + w, y + h - ch);
          ctx.lineTo(x + w - ch, y + h);
          ctx.lineTo(x + ch, y + h);
          ctx.lineTo(x, y + h - ch);
          ctx.lineTo(x, y + ch);
          ctx.closePath();
        } else {
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 20);
        }
      };

      // 4. Outpost Rooms (8 Workstation Modules)
      OUTPOST_ROOMS.forEach((room) => {
        let poweredKw = 1;
        if (room.id === 'lifesupport') poweredKw = gs.powerAllocation.lifesupport;
        if (room.id === 'hydroponics') poweredKw = gs.powerAllocation.hydroponics;
        if (room.id === 'shield') poweredKw = gs.powerAllocation.shield;
        if (room.id === 'comms') poweredKw = gs.powerAllocation.comms;

        const isNear = lastNearRoom === room.id;
        const isDone = gs.completedTasksToday.includes(room.id);

        ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
        traceRoomHull(room.x + 6, room.y + 8, room.w, room.h);
        ctx.fill();

        ctx.fillStyle = poweredKw > 0 ? '#111C33' : '#090D16';
        ctx.strokeStyle = isNear ? '#38BDF8' : poweredKw > 0 ? room.accentColor : '#334155';
        ctx.lineWidth = isNear ? 5 : 3.5;
        traceRoomHull(room.x, room.y, room.w, room.h);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.lineWidth = 1.5;
        traceRoomHull(room.x + 8, room.y + 8, room.w - 16, room.h - 16);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
        ctx.lineWidth = 1;
        for (let gx = room.x + 44; gx < room.x + room.w - 16; gx += 44) {
          ctx.beginPath();
          ctx.moveTo(gx, room.y + 12);
          ctx.lineTo(gx, room.y + room.h - 12);
          ctx.stroke();
        }

        ctx.fillStyle = 'rgba(9, 14, 26, 0.94)';
        ctx.beginPath();
        ctx.roundRect(room.x + 14, room.y + 12, room.w - 28, 30, 8);
        ctx.fill();

        ctx.font = '700 14px "Outfit", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#F8FAFC';
        ctx.fillText(room.name.toUpperCase(), room.x + 24, room.y + 32);

        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = poweredKw > 0 ? room.accentColor : '#EF4444';
        ctx.fillText(
          room.id === 'power'
            ? `${gs.availablePowerKw}kW GRID`
            : room.id === 'eva'
            ? 'AIRLOCK'
            : room.id === 'foodlab'
            ? `${gs.mealsCookedTotal} MEALS`
            : room.id === 'academy'
            ? 'LEARN & QUIZ'
            : `${poweredKw}kW`,
          room.x + room.w - 24,
          room.y + 32
        );

        drawRoomArchitecture(room, poweredKw, isDone, timeSec);
      });

      // 4b. Crew Mess Cafe, Dance Pad, Rest Pods & Future Expansion Plot
      drawMessLoungeAndExpansion(timeSec, isDanceParty, isFeastActive, lastNearPropId);

      // 5. Guided Floor Arrow pointing to next uncompleted daily task
      const nextTaskRoom = OUTPOST_ROOMS.find(
        (r) => !gs.completedTasksToday.includes(r.id)
      );
      if (nextTaskRoom && curShell === 'playing') {
        const dx = nextTaskRoom.consoleX - player.x;
        const dy = nextTaskRoom.consoleY + 42 - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 110) {
          const angle = Math.atan2(dy, dx);
          const arrowDist = 56 + Math.sin(timeSec * 6) * 6;
          const ax = player.x + Math.cos(angle) * arrowDist;
          const ay = player.y + Math.sin(angle) * arrowDist;

          ctx.save();
          ctx.translate(ax, ay);
          ctx.rotate(angle);
          ctx.fillStyle = '#FBBF24';
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(13, 0);
          ctx.lineTo(-9, -8);
          ctx.lineTo(-4, 0);
          ctx.lineTo(-9, 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }

      // 6. Draw Cartoon Spaceman Astronaut Crew + Player (Y-sorted depth)
      const playerDanceActivity: CrewActivity =
        isDanceParty && !playerMoving
          ? 'dance'
          : !playerMoving && player.activity !== 'walk'
          ? player.activity
          : 'walk';
      const playerBubble =
        isDanceParty && !playerMoving
          ? '♪ Space Boogie!'
          : !playerMoving && player.bubble
          ? player.bubble
          : '';
      const actors = [
        ...npcs.map((n) => ({
          kind: 'astronaut' as const,
          x: n.x,
          y: n.y,
          color: n.color,
          skinColor: n.skinColor,
          name: n.name,
          facing: n.facing,
          walkDist: n.walkDist,
          sx: 1,
          sy: 1,
          isPlayer: false,
          isCommander: Boolean(n.isCommander),
          activity: n.activity,
          bubble: n.bubble,
        })),
        {
          kind: 'astronaut' as const,
          x: player.x,
          y: player.y,
          color: curColor,
          skinColor: '#FDBA74',
          name: 'YOU (CADET)',
          facing: player.facing,
          walkDist: player.walkDist,
          sx: player.scaleX,
          sy: player.scaleY,
          isPlayer: true,
          isCommander: false,
          activity: playerDanceActivity,
          bubble: playerBubble,
        },
        {
          kind: 'walle' as const,
          x: wallE.x,
          y: wallE.y,
          color: '#F59E0B',
          skinColor: '#CBD5E1',
          name: 'WALL·E',
          facing: wallE.facing,
          walkDist: wallE.treadDist,
          sx: 1,
          sy: 1,
          isPlayer: false,
          isCommander: false,
          activity: 'walk' as CrewActivity,
          bubble: wallE.bubble,
        },
      ].sort((a, b) => a.y - b.y);

      for (let idx = 0; idx < actors.length; idx++) {
        const a = actors[idx];
        // Compute distinct non-overlapping vertical bubble tier among nearby actors
        let bubbleTier = 0;
        for (let prevIdx = 0; prevIdx < idx; prevIdx++) {
          const prev = actors[prevIdx];
          if (Math.abs(prev.x - a.x) < 120 && Math.abs(prev.y - a.y) < 68) {
            bubbleTier++;
          }
        }
        if (a.kind === 'walle') {
          drawWallE(timeSec, bubbleTier);
        } else {
          drawAstronaut(
            a.x,
            a.y,
            a.color,
            a.skinColor,
            a.name,
            a.facing,
            a.walkDist,
            a.sx,
            a.sy,
            a.isPlayer,
            a.isCommander,
            a.activity,
            a.bubble,
            timeSec,
            bubbleTier
          );
        }
      }

      // 7. Update & Render Pooled Particles
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.active) continue;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const alpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 8. Outer Shield Dome Arc Protecting the Expanded Compound
      if (gs.powerAllocation.shield > 0) {
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.22 + gs.powerAllocation.shield * 0.14})`;
        ctx.lineWidth = 4.5 + gs.powerAllocation.shield * 2;
        ctx.beginPath();
        ctx.arc(WORLD_W / 2, 1340, 1280, Math.PI * 1.18, Math.PI * 1.82);
        ctx.stroke();
      }

      ctx.restore();

      // 9. Screen-Space Mini-Radar + Map Zoom Controls (only during active gameplay)
      if (curShell === 'playing') {
        drawMiniRadar(gs, isDanceParty);
      }

      const nextZoomAttr = cameraZoom.toFixed(2);
      const nextPanAttr = manualPanActive ? '1' : '0';
      if (nextZoomAttr !== lastZoomAttr) {
        lastZoomAttr = nextZoomAttr;
        canvas.dataset.zoom = nextZoomAttr;
      }
      if (nextPanAttr !== lastPanAttr) {
        lastPanAttr = nextPanAttr;
        canvas.dataset.manualPan = nextPanAttr;
      }
      if (canvas.dataset.siteId !== site.id) {
        canvas.dataset.siteId = site.id;
      }
      if (canvas.dataset.mapVariant !== gs.mapVariant) {
        canvas.dataset.mapVariant = gs.mapVariant;
      }

      const nextDelayMs =
        curModal !== null || stateRef.current.isModalOpen || curShell === 'paused' || curShell === 'gameover'
          ? 280
          : 38;
      timerId = window.setTimeout(() => {
        animId = requestAnimationFrame(tick);
      }, nextDelayMs);
    };

    let timerId = 0;
    animId = requestAnimationFrame(tick);

    return () => {
      clearTimeout(timerId);
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearInputs);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', clearInputs);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#070B14] overflow-hidden">
      <canvas
        ref={canvasRef}
        width={VIEW_W}
        height={VIEW_H}
        role="application"
        aria-label="Interactive Space Outpost Map - Click any room, satellite, crewmate, or Base Radar to move, drag map or radar to pan, and scroll to zoom"
        data-testid="outpost-canvas"
        className="w-full h-full object-contain cursor-grab"
      />
    </div>
  );
};
