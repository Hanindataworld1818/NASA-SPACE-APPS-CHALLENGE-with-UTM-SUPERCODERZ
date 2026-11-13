import React, { useEffect, useRef } from 'react';
import {
  GameStateSnapshot,
  OUTPOST_ROOMS,
  OUTPOST_WORLD_H,
  OUTPOST_WORLD_W,
  OutpostRoom,
  RoomId,
  getDonkiEventForSol,
} from '../game/rules';
import { MISSION_SITES } from '../game/nasaData';
import { spaceAudio } from '../game/audio';

interface OutpostCanvasProps {
  gameState: GameStateSnapshot;
  shellState: 'title' | 'playing' | 'paused' | 'gameover';
  activeModalRoom: RoomId | null;
  onSelectRoom: (roomId: RoomId) => void;
  onNearRoomChange: (roomId: RoomId | null) => void;
  onCurrentRoomChange?: (roomId: RoomId | null) => void;
  crewColor: string;
}

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
}

const WORLD_W = OUTPOST_WORLD_W;
const WORLD_H = OUTPOST_WORLD_H;
const MAX_PARTICLES = 110;

export const OutpostCanvas: React.FC<OutpostCanvasProps> = ({
  gameState,
  shellState,
  activeModalRoom,
  onSelectRoom,
  onNearRoomChange,
  onCurrentRoomChange,
  crewColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    gameState,
    shellState,
    activeModalRoom,
    onSelectRoom,
    onNearRoomChange,
    onCurrentRoomChange,
    crewColor,
  });

  useEffect(() => {
    stateRef.current = {
      gameState,
      shellState,
      activeModalRoom,
      onSelectRoom,
      onNearRoomChange,
      onCurrentRoomChange,
      crewColor,
    };
  }, [
    gameState,
    shellState,
    activeModalRoom,
    onSelectRoom,
    onNearRoomChange,
    onCurrentRoomChange,
    crewColor,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();

    // Player spawned in central pressurized command spine facing open path
    const player = {
      x: 780,
      y: 450,
      vx: 0,
      vy: 0,
      facing: 1,
      walkDist: 0,
      stepAccum: 0,
      scaleX: 1,
      scaleY: 1,
      targetX: null as number | null,
      targetY: null as number | null,
      pendingRoomClick: null as RoomId | null,
    };

    let lastNearRoom: RoomId | null = null;
    let lastCurrentRoom: RoomId | null = null;
    const keysPressed = new Set<string>();

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

    // 4 AI Astronaut Crewmates (including red Commander-Han)
    const npcs: NpcCrewmate[] = [
      {
        name: 'Tech-Feng',
        color: '#F59E0B',
        skinColor: '#FDBA74',
        x: 270,
        y: 295,
        vx: 0,
        vy: 0,
        facing: 1,
        walkDist: 0,
        policy: 'orbiter',
        targetIdx: 0,
        timer: 0,
      },
      {
        name: 'Bio-Xin',
        color: '#10B981',
        skinColor: '#FED7AA',
        x: 1290,
        y: 295,
        vx: 0,
        vy: 0,
        facing: -1,
        walkDist: 0,
        policy: 'patroller',
        targetIdx: 7,
        timer: 0,
      },
      {
        name: 'Shield-Kun',
        color: '#A855F7',
        skinColor: '#FDBA74',
        x: 270,
        y: 715,
        vx: 0,
        vy: 0,
        facing: 1,
        walkDist: 0,
        policy: 'sentry',
        targetIdx: 0,
        timer: 0,
      },
      {
        name: 'Commander-Han',
        color: '#EF4444',
        skinColor: '#FED7AA',
        x: 990,
        y: 450,
        vx: 0,
        vy: 0,
        facing: -1,
        walkDist: 0,
        policy: 'commander',
        targetIdx: 0,
        timer: 0,
        isCommander: true,
      },
    ];

    // Hallway-aligned waypoints in the 1560x900 compound
    const patrolWaypoints = [
      { x: 270, y: 295 },
      { x: 270, y: 450 },
      { x: 780, y: 450 },
      { x: 780, y: 295 },
      { x: 780, y: 450 },
      { x: 1290, y: 450 },
      { x: 1290, y: 295 },
      { x: 1290, y: 450 },
      { x: 1290, y: 715 },
      { x: 1290, y: 450 },
      { x: 270, y: 450 },
      { x: 270, y: 715 },
      { x: 270, y: 450 },
    ];

    const commanderWaypoints = [
      { x: 990, y: 450 },
      { x: 1290, y: 450 },
      { x: 1290, y: 715 },
      { x: 1290, y: 450 },
      { x: 520, y: 450 },
      { x: 780, y: 450 },
      { x: 780, y: 715 },
      { x: 780, y: 450 },
    ];

    const orbiterWaypoints = [
      { x: 270, y: 295 },
      { x: 270, y: 450 },
      { x: 780, y: 450 },
      { x: 780, y: 295 },
      { x: 780, y: 450 },
      { x: 270, y: 450 },
    ];

    const sentryWaypoints = [
      { x: 270, y: 715 },
      { x: 270, y: 450 },
      { x: 780, y: 450 },
      { x: 780, y: 715 },
      { x: 780, y: 450 },
      { x: 270, y: 450 },
    ];

    const screenToWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = WORLD_W / Math.max(1, rect.width);
      const scaleY = WORLD_H / Math.max(1, rect.height);
      return {
        wx: (clientX - rect.left) * scaleX,
        wy: (clientY - rect.top) * scaleY,
      };
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const { shellState: curShell, activeModalRoom: curModal } = stateRef.current;
      if (curShell !== 'playing' || curModal !== null) return;

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
        player.targetX = null;
        player.targetY = null;
        player.pendingRoomClick = null;
      }

      if ((code === 'KeyE' || code === 'Space') && !e.repeat) {
        if (lastNearRoom) {
          e.preventDefault();
          player.scaleX = 1.18;
          player.scaleY = 0.82;
          spaceAudio.playBreakerClick(true);
          stateRef.current.onSelectRoom(lastNearRoom);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };

    const clearInputs = () => {
      keysPressed.clear();
    };

    const handlePointerDown = (e: PointerEvent) => {
      const { shellState: curShell, activeModalRoom: curModal } = stateRef.current;
      if (curShell !== 'playing' || curModal !== null) return;

      const { wx, wy } = screenToWorld(e.clientX, e.clientY);
      const clickedRoom = OUTPOST_ROOMS.find(
        (r) => wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h
      );

      if (clickedRoom) {
        const distToConsole = Math.hypot(
          player.x - clickedRoom.consoleX,
          player.y - (clickedRoom.consoleY + 62)
        );
        if (distToConsole < 110) {
          player.scaleX = 1.18;
          player.scaleY = 0.82;
          spaceAudio.playBreakerClick(true);
          stateRef.current.onSelectRoom(clickedRoom.id);
        } else {
          player.targetX = clickedRoom.consoleX;
          player.targetY = clickedRoom.consoleY + 62;
          player.pendingRoomClick = clickedRoom.id;
        }
      } else {
        player.targetX = Math.max(115, Math.min(WORLD_W - 115, wx));
        player.targetY = Math.max(135, Math.min(WORLD_H - 115, wy));
        player.pendingRoomClick = null;
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

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearInputs);
    canvas.addEventListener('pointerdown', handlePointerDown);

    // Draw a detailed Cartoon Spaceman Astronaut (bubble helmet, visible friendly cartoon face, chest pack, articulated arms/boots, oxygen tank)
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
      isCommander = false
    ) => {
      const stride = Math.sin(walkDist * 0.085);
      const bobY = Math.abs(stride) * 4.5;
      const legSwing = stride * 6;
      const armSwing = -stride * 5.5;

      ctx.save();
      ctx.translate(cx, cy);

      // Soft ground shadow
      ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 26, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(0, -bobY);
      ctx.scale(sx * facing, sy);

      // 1. Life-Support Oxygen Backpack + Telemetry Antenna
      ctx.fillStyle = '#CBD5E1';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(-21, -15, 11, 24, 4);
      ctx.fill();
      ctx.stroke();

      // Suit-colored accent stripe on backpack
      ctx.fillStyle = suitColor;
      ctx.fillRect(-19, -8, 7, 4);

      // Small blinking antenna mast on backpack
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, -15);
      ctx.lineTo(-16, -26);
      ctx.stroke();
      ctx.fillStyle = isCommander ? '#FACC15' : '#38BDF8';
      ctx.beginPath();
      ctx.arc(-16, -27, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 2. Back Arm (partially behind torso)
      ctx.save();
      ctx.translate(-3, -6);
      ctx.rotate(-armSwing * 0.06);
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
      // Back leg
      ctx.save();
      ctx.translate(-5 - legSwing * 0.45, 9);
      ctx.fillStyle = '#E2E8F0';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-4.5, 0, 9, 11, 3);
      ctx.fill();
      ctx.stroke();
      // Moon boot
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-5, 9, 12, 7, 3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Front leg
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

      // Colored Flight Suit Shoulders & Belt Trim
      ctx.fillStyle = suitColor;
      ctx.beginPath();
      ctx.roundRect(-12.5, -11.5, 25, 8, 5);
      ctx.fill();

      // Utility Belt + Gold Buckle
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
      // Telemetry LED dots + NASA patch
      ctx.fillStyle = isCommander ? '#FACC15' : '#38BDF8';
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

      // 6. Big Cartoon Bubble Space Helmet
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(1, -28, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Helmet Ear Comm Pod
      ctx.fillStyle = suitColor;
      ctx.beginPath();
      ctx.roundRect(-15.5, -33, 5, 10, 2.5);
      ctx.fill();
      ctx.stroke();

      // Dark Visor Opening + Visible Friendly Cartoon Astronaut Face Inside
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.ellipse(4.5, -28, 11, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cartoon Face Head Inside Helmet
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.ellipse(4.8, -27.2, 8.6, 7.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rosy Cartoon Cheeks
      ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
      ctx.beginPath();
      ctx.arc(1.2, -25.2, 1.8, 0, Math.PI * 2);
      ctx.arc(9.8, -25.2, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Expressive Cartoon Eyes with White Shine
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(2.8, -28.8, 1.6, 0, Math.PI * 2);
      ctx.arc(8.6, -28.8, 1.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(2.3, -29.3, 0.65, 0, Math.PI * 2);
      ctx.arc(8.1, -29.3, 0.65, 0, Math.PI * 2);
      ctx.fill();

      // Friendly Cartoon Smile
      ctx.strokeStyle = '#7C2D12';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(5.8, -25.6, 2.8, 0.15, Math.PI - 0.15);
      ctx.stroke();

      // Glass Bubble Visor Tint & Specular Highlight
      ctx.fillStyle = 'rgba(125, 211, 252, 0.24)';
      ctx.beginPath();
      ctx.ellipse(4.5, -28, 11, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.beginPath();
      ctx.ellipse(-0.5, -33.5, 3.6, 1.6, -0.45, 0, Math.PI * 2);
      ctx.fill();

      // 7. Front Articulated Arm + Padded Space Glove
      ctx.save();
      ctx.translate(-8, -7);
      ctx.rotate(armSwing * 0.07);
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
      ctx.restore();

      // 8. Commander-Han's Royal Gold Crown perched atop Space Helmet
      if (isCommander) {
        ctx.fillStyle = '#FACC15';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-7, -42);
        ctx.lineTo(-9, -51);
        ctx.lineTo(-3, -46.5);
        ctx.lineTo(1, -53);
        ctx.lineTo(5, -46.5);
        ctx.lineTo(10, -50.5);
        ctx.lineTo(8, -42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();

      // 9. Clean Nameplate Label
      ctx.save();
      ctx.font =
        isPlayer || isCommander
          ? '700 12px "Outfit", sans-serif'
          : '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = isPlayer ? '#38BDF8' : isCommander ? '#FCA5A5' : '#E2E8F0';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 3.5;
      const labelY = isCommander ? cy - 58 - bobY : cy - 50 - bobY;
      ctx.strokeText(name, cx, labelY);
      ctx.fillText(name, cx, labelY);
      ctx.restore();
    };

    const drawExteriorHardware = (
      siteId: 'mars' | 'moon',
      solarKw: number,
      timeSec: number
    ) => {
      // 1. Exterior Solar Wing Farm north-west above Reactor (x: 95..445, y: 20..92)
      for (let i = 0; i < 4; i++) {
        const px = 110 + i * 86;
        const py = 28;
        // Ground shadow
        ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
        ctx.fillRect(px + 6, py + 46, 68, 12);
        // Truss mast & cable feeding down into Reactor room
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px + 34, py + 44);
        ctx.lineTo(px + 34, 110);
        ctx.stroke();
        // Solar Wing Panel
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = solarKw >= 5 ? '#38BDF8' : '#F59E0B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 8, py);
        ctx.lineTo(px + 72, py);
        ctx.lineTo(px + 64, py + 44);
        ctx.lineTo(px, py + 44);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Blue PV Cell grid
        ctx.fillStyle = '#0369A1';
        ctx.beginPath();
        ctx.moveTo(px + 12, py + 4);
        ctx.lineTo(px + 67, py + 4);
        ctx.lineTo(px + 60, py + 40);
        ctx.lineTo(px + 5, py + 40);
        ctx.closePath();
        ctx.fill();
      }

      // 2. External Atmospheric / Ice Harvester Tanks north of Bio-Dome (x: 1125..1445, y: 24..94)
      [1160, 1220, 1340, 1400].forEach((tx, idx) => {
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

        // Feeder pipe into Bio-Dome
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(tx, 84);
        ctx.lineTo(tx, 110);
        ctx.stroke();
      });

      // 3. Concrete EVA Landing Pad & Parked 6-Wheel Rover south of EVA Airlock (x: 615..945, y: 800..888)
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(625, 804, 310, 82, 14);
      ctx.fill();
      ctx.stroke();

      // Caution landing zone markings
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(640, 814, 190, 62);
      ctx.setLineDash([]);

      // Thruster Scorch Target Ring
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(735, 845, 42, 20, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'center';
      ctx.fillText('LANDING PAD', 735, 849);

      // Parked 6-Wheel Surface Cargo Rover
      ctx.save();
      ctx.translate(882, 848);
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
      ctx.fillStyle = '#EA580C';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-26, -10, 52, 18, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#BAE6FD';
      ctx.fillRect(10, -7, 11, 8);
      ctx.restore();

      // Subtle regolith rover tire tracks heading south-west
      ctx.strokeStyle =
        siteId === 'mars' ? 'rgba(67, 20, 7, 0.45)' : 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(940, 855);
      ctx.quadraticCurveTo(1030, 862, 1105, 885);
      ctx.stroke();
      ctx.setLineDash([]);

      // 4. Deep Space Network Dish Tower outside Comms Deck (x: 1410..1535, y: 798..888)
      ctx.save();
      ctx.translate(1475, 845);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
      ctx.beginPath();
      ctx.ellipse(4, 24, 34, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tower pedestal
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-16, 4, 32, 22, 4);
      ctx.fill();
      ctx.stroke();

      // Rotating parabolic dish
      const dishSwing = Math.sin(timeSec * 0.9) * 0.35;
      ctx.rotate(dishSwing - 0.35);
      ctx.fillStyle = '#E2E8F0';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -10, 28, Math.PI * 0.12, Math.PI * 0.88);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dish feed horn + blinking telemetry ping
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

      // Subtle architectural equipment props in left & right flanks of each room
      if (room.id === 'power') {
        // Left: Kilopower Fission Core Cylindrical Drum with glowing amber rings
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

        // Right: Dual High-Voltage Transformer Racks
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
        // Left & Right: Pressurized Water-Splitting Electrolysis Columns with animated O2 bubbles
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
        // Curved Geodesic Glass Rib Arches
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.28)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, ry + 210, 145, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();

        // Left & Right Hydroponic Planter Troughs with leafy plants under pink/blue LED bar
        [rx + 22, rx + rw - 88].forEach((px) => {
          ctx.fillStyle = '#064E3B';
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(px, ry + 84, 66, 128, 8);
          ctx.fill();
          ctx.stroke();

          // Pink/violet grow LED strip
          ctx.fillStyle = poweredKw > 0 ? '#EC4899' : '#475569';
          ctx.fillRect(px + 6, ry + 90, 54, 4);

          // Leafy plant clusters
          for (let row = 0; row < 3; row++) {
            ctx.fillStyle = '#34D399';
            ctx.beginPath();
            ctx.arc(px + 20, ry + 114 + row * 34, 8, 0, Math.PI * 2);
            ctx.arc(px + 44, ry + 114 + row * 34, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      } else if (room.id === 'shield') {
        // Reinforced Armor Plates + 4 Glowing Hydrogen Water-Wall Columns
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
        // Steel Decompression Floor Grates
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.16)';
        ctx.lineWidth = 2;
        for (let gy = ry + 64; gy < ry + rh - 24; gy += 16) {
          ctx.beginPath();
          ctx.moveTo(rx + 24, gy);
          ctx.lineTo(rx + rw - 24, gy);
          ctx.stroke();
        }

        // Left: Spare EVA Spacesuit Rack & Oxygen Bottles
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#F97316';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(rx + 24, ry + 84, 62, 118, 8);
        ctx.fill();
        ctx.stroke();
        // Hanging white suit icon + orange O2 tank
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

        // Right: Cargo Gear Crates & South Blast Airlock Hatch
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0F172A';
        ctx.beginPath();
        ctx.roundRect(rx + rw - 82, ry + 104, 54, 48, 6);
        ctx.fill();
        ctx.stroke();

        // South Airlock Hatch Seal toward Landing Pad
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(cx - 48, ry + rh - 12, 96, 10);
      } else if (room.id === 'comms') {
        // Left: Glowing Holographic Earth Trajectory Table
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

        // Right: Audio Spectrum & Telemetry Monitor Rack
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
      }

      // Central Interactive Workstation Console Desk
      ctx.fillStyle = '#0B1221';
      ctx.strokeStyle = poweredKw > 0 ? room.accentColor : '#475569';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(cx - 64, cy - 36, 128, 60, 12);
      ctx.fill();
      ctx.stroke();

      // Console Screen Glass
      ctx.fillStyle = poweredKw > 0 ? `${room.accentColor}2B` : '#1E293B';
      ctx.beginPath();
      ctx.roundRect(cx - 54, cy - 28, 108, 36, 7);
      ctx.fill();

      // Animated Screen Telemetry Graphic
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
      }

      // Task Status Prompt below Console
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      if (isCompleted) {
        ctx.fillStyle = '#10B981';
        ctx.fillText('✓ TASK COMPLETE', cx, cy + 42);
      } else {
        ctx.fillStyle = '#FBBF24';
        ctx.fillText('★ CLICK / [E] WORKSTATION', cx, cy + 42);
      }
    };

    const followWaypoints = (
      npc: NpcCrewmate,
      wps: Array<{ x: number; y: number }>,
      speed: number,
      dt: number
    ) => {
      const wp = wps[npc.targetIdx % wps.length];
      const dx = wp.x - npc.x;
      const dy = wp.y - npc.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 14) {
        npc.targetIdx = (npc.targetIdx + 1) % wps.length;
      } else {
        npc.x += (dx / dist) * speed * dt;
        npc.y += (dy / dist) * speed * dt;
        if (Math.abs(dx) > 4) npc.facing = dx >= 0 ? 1 : -1;
        npc.walkDist += speed * dt;
      }
    };

    // Cached offscreen static terrain + corridors per siteId
    let cachedTerrainSite: string | null = null;
    const terrainBuffer = document.createElement('canvas');
    terrainBuffer.width = WORLD_W + 140;
    terrainBuffer.height = WORLD_H + 140;
    const tCtx = terrainBuffer.getContext('2d');

    const ensureTerrainCache = (siteId: 'mars' | 'moon', terrainColor: string, terrainAccent: string) => {
      if (!tCtx || cachedTerrainSite === siteId) return;
      cachedTerrainSite = siteId;
      tCtx.save();
      tCtx.translate(70, 70);

      const bgGrad = tCtx.createRadialGradient(
        WORLD_W * 0.5,
        WORLD_H * 0.45,
        160,
        WORLD_W * 0.5,
        WORLD_H * 0.5,
        WORLD_W * 0.72
      );
      bgGrad.addColorStop(0, terrainAccent);
      bgGrad.addColorStop(1, terrainColor);
      tCtx.fillStyle = bgGrad;
      tCtx.fillRect(-70, -70, WORLD_W + 140, WORLD_H + 140);

      const craters = [
        { x: 54, y: 170, r: 36 },
        { x: 520, y: 52, r: 34 },
        { x: 1030, y: 55, r: 30 },
        { x: 1510, y: 185, r: 38 },
        { x: 52, y: 465, r: 28 },
        { x: 1515, y: 450, r: 32 },
        { x: 55, y: 820, r: 38 },
        { x: 525, y: 845, r: 28 },
        { x: 1030, y: 848, r: 34 },
      ];
      for (const c of craters) {
        tCtx.fillStyle =
          siteId === 'mars' ? 'rgba(251, 146, 60, 0.14)' : 'rgba(226, 232, 240, 0.12)';
        tCtx.beginPath();
        tCtx.arc(c.x - 2, c.y - 2, c.r + 3, 0, Math.PI * 2);
        tCtx.fill();
        tCtx.fillStyle = terrainColor;
        tCtx.beginPath();
        tCtx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        tCtx.fill();
        tCtx.fillStyle = 'rgba(2, 6, 23, 0.32)';
        tCtx.beginPath();
        tCtx.arc(c.x + 4, c.y + 4, c.r * 0.78, 0, Math.PI * 2);
        tCtx.fill();
      }

      [
        [44, 65, 13],
        [1515, 70, 15],
        [480, 445, 11],
        [1080, 445, 11],
        [520, 660, 12],
        [1035, 250, 13],
      ].forEach(([rx, ry, rr]) => {
        tCtx.fillStyle = 'rgba(2, 6, 23, 0.45)';
        tCtx.beginPath();
        tCtx.ellipse(rx + 4, ry + 5, rr * 1.15, rr * 0.65, 0, 0, Math.PI * 2);
        tCtx.fill();
        tCtx.fillStyle = siteId === 'mars' ? '#7C2D12' : '#475569';
        tCtx.beginPath();
        tCtx.arc(rx, ry, rr, 0, Math.PI * 2);
        tCtx.fill();
      });

      const corridors = [
        { x: 180, y: 400, w: 1200, h: 100 },
        { x: 220, y: 360, w: 100, h: 48 },
        { x: 730, y: 360, w: 100, h: 48 },
        { x: 1240, y: 360, w: 100, h: 48 },
        { x: 220, y: 492, w: 100, h: 48 },
        { x: 730, y: 492, w: 100, h: 48 },
        { x: 1240, y: 492, w: 100, h: 48 },
      ];

      tCtx.fillStyle = '#0B1324';
      tCtx.strokeStyle = '#334155';
      tCtx.lineWidth = 4;
      for (const cor of corridors) {
        tCtx.fillRect(cor.x, cor.y, cor.w, cor.h);
        tCtx.strokeRect(cor.x, cor.y, cor.w, cor.h);
      }

      tCtx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      tCtx.lineWidth = 2;
      for (let gx = 200; gx <= 1360; gx += 45) {
        tCtx.beginPath();
        tCtx.moveTo(gx, 404);
        tCtx.lineTo(gx, 496);
        tCtx.stroke();
      }

      [270, 780, 1290].forEach((dx) => {
        tCtx.fillStyle = 'rgba(245, 158, 11, 0.55)';
        tCtx.fillRect(dx - 38, 363, 76, 4);
        tCtx.fillRect(dx - 38, 533, 76, 4);
      });

      tCtx.restore();
    };

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const timeSec = now / 1000;

      const {
        gameState: gs,
        shellState: curShell,
        activeModalRoom: curModal,
        crewColor: curColor,
      } = stateRef.current;

      const site = MISSION_SITES[gs.siteId];
      const donki = getDonkiEventForSol(gs.sol);

      // Update player physics when in 'playing' and no modal open
      if (curShell === 'playing' && curModal === null) {
        let moveX = 0;
        let moveY = 0;
        if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) moveX -= 1;
        if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) moveX += 1;
        if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) moveY -= 1;
        if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) moveY += 1;

        if (moveX === 0 && moveY === 0 && player.targetX !== null && player.targetY !== null) {
          const dx = player.targetX - player.x;
          const dy = player.targetY - player.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 8) {
            moveX = dx / dist;
            moveY = dy / dist;
          } else {
            player.targetX = null;
            player.targetY = null;
            if (player.pendingRoomClick) {
              const targetRoom = player.pendingRoomClick;
              player.pendingRoomClick = null;
              spaceAudio.playBreakerClick(true);
              stateRef.current.onSelectRoom(targetRoom);
            }
          }
        }

        const len = Math.hypot(moveX, moveY);
        const speed = 265;
        if (len > 0.01) {
          const nx = moveX / len;
          const ny = moveY / len;
          player.vx = nx * speed;
          player.vy = ny * speed;
          if (Math.abs(nx) > 0.05) {
            player.facing = nx > 0 ? 1 : -1;
          }
          const stepDelta = speed * dt;
          player.x = Math.max(115, Math.min(WORLD_W - 115, player.x + player.vx * dt));
          player.y = Math.max(135, Math.min(WORLD_H - 115, player.y + player.vy * dt));
          player.walkDist += stepDelta;
          player.stepAccum += stepDelta;
          if (player.stepAccum > 62) {
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
        } else {
          player.vx = 0;
          player.vy = 0;
        }
      }

      // Exponential squash-and-stretch damping
      player.scaleX += (1 - player.scaleX) * Math.min(1, dt * 14);
      player.scaleY += (1 - player.scaleY) * Math.min(1, dt * 14);

      // Update AI Astronauts along hallways
      npcs.forEach((npc) => {
        npc.timer += dt;
        if (npc.policy === 'orbiter') {
          followWaypoints(npc, orbiterWaypoints, 82, dt);
        } else if (npc.policy === 'patroller') {
          followWaypoints(npc, patrolWaypoints, 96, dt);
        } else if (npc.policy === 'commander') {
          followWaypoints(npc, commanderWaypoints, 84, dt);
        } else {
          followWaypoints(npc, sentryWaypoints, 78, dt);
        }
      });

      // Nearest workstation console for [E] prompt
      let foundNearRoom: RoomId | null = null;
      let bestDist = 135;
      for (const room of OUTPOST_ROOMS) {
        const d = Math.hypot(player.x - room.consoleX, player.y - (room.consoleY + 55));
        if (d < bestDist) {
          bestDist = d;
          foundNearRoom = room.id;
        }
      }
      if (foundNearRoom !== lastNearRoom) {
        lastNearRoom = foundNearRoom;
        stateRef.current.onNearRoomChange(foundNearRoom);
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

      // Ambient solar wind / cosmic storm particles along upper perimeter
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
      ensureTerrainCache(site.id, site.terrainColor, site.terrainAccent);
      ctx.save();

      // Subtle camera pan on Title screen
      if (curShell === 'title') {
        const panX = Math.sin(timeSec * 0.35) * 32;
        const panY = Math.cos(timeSec * 0.25) * 16;
        ctx.translate(panX, panY);
      }

      // 1 & 2. Blit cached planetary terrain, craters, boulders & pressurized corridors in 1 drawImage call
      ctx.drawImage(terrainBuffer, -70, -70);

      // Exterior Hardware Installations (Solar Farm, Harvester Tanks, EVA Landing Pad + Rover, DSN Dish)
      drawExteriorHardware(site.id, gs.availablePowerKw, timeSec);

      // 3. Glowing Animated Power Conduit Cables from Reactor through Spine
      const cableTargets: Array<{ room: OutpostRoom; kw: number }> = [
        { room: OUTPOST_ROOMS[1], kw: gs.powerAllocation.lifesupport },
        { room: OUTPOST_ROOMS[2], kw: gs.powerAllocation.hydroponics },
        { room: OUTPOST_ROOMS[3], kw: gs.powerAllocation.shield },
        { room: OUTPOST_ROOMS[5], kw: gs.powerAllocation.comms },
      ];

      cableTargets.forEach(({ room, kw }) => {
        ctx.save();
        ctx.strokeStyle = kw > 0 ? room.accentColor : '#1E293B';
        ctx.lineWidth = kw > 0 ? 3.5 : 1.5;
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -timeSec * (kw * 26);
        ctx.beginPath();
        ctx.moveTo(270, 360);
        ctx.lineTo(270, 450);
        ctx.lineTo(room.consoleX, 450);
        ctx.lineTo(room.consoleX, room.consoleY);
        ctx.stroke();
        ctx.restore();
      });

      // 4. Outpost Rooms (Thick Dual-Hull Pressurized Modules + Realistic Interiors)
      OUTPOST_ROOMS.forEach((room) => {
        let poweredKw = 1;
        if (room.id === 'lifesupport') poweredKw = gs.powerAllocation.lifesupport;
        if (room.id === 'hydroponics') poweredKw = gs.powerAllocation.hydroponics;
        if (room.id === 'shield') poweredKw = gs.powerAllocation.shield;
        if (room.id === 'comms') poweredKw = gs.powerAllocation.comms;

        const isNear = lastNearRoom === room.id;
        const isDone = gs.completedTasksToday.includes(room.id);

        // Outer structural hull shadow
        ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
        ctx.beginPath();
        ctx.roundRect(room.x + 6, room.y + 8, room.w, room.h, 22);
        ctx.fill();

        // Main Room Metallic Floor Plate
        ctx.fillStyle = poweredKw > 0 ? '#111C33' : '#090D16';
        ctx.strokeStyle = isNear ? '#38BDF8' : poweredKw > 0 ? room.accentColor : '#334155';
        ctx.lineWidth = isNear ? 5 : 3.5;
        ctx.beginPath();
        ctx.roundRect(room.x, room.y, room.w, room.h, 20);
        ctx.fill();
        ctx.stroke();

        // Inner bulkhead seam border
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(room.x + 8, room.y + 8, room.w - 16, room.h - 16, 14);
        ctx.stroke();

        // Subtle metallic deck grid
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
        ctx.lineWidth = 1;
        for (let gx = room.x + 44; gx < room.x + room.w - 16; gx += 44) {
          ctx.beginPath();
          ctx.moveTo(gx, room.y + 12);
          ctx.lineTo(gx, room.y + room.h - 12);
          ctx.stroke();
        }

        // Room Header Title Banner
        ctx.fillStyle = 'rgba(9, 14, 26, 0.94)';
        ctx.beginPath();
        ctx.roundRect(room.x + 14, room.y + 12, room.w - 28, 30, 8);
        ctx.fill();

        ctx.font = '700 14px "Outfit", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#F8FAFC';
        ctx.fillText(room.name.toUpperCase(), room.x + 24, room.y + 32);

        // Power readout on room header
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = poweredKw > 0 ? room.accentColor : '#EF4444';
        ctx.fillText(
          room.id === 'power'
            ? `${gs.availablePowerKw}kW GRID`
            : room.id === 'eva'
            ? 'AIRLOCK'
            : `${poweredKw}kW`,
          room.x + room.w - 24,
          room.y + 32
        );

        drawRoomArchitecture(room, poweredKw, isDone, timeSec);
      });

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
      const actors = [
        ...npcs.map((n) => ({
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
        })),
        {
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
        },
      ].sort((a, b) => a.y - b.y);

      for (const a of actors) {
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
          a.isCommander
        );
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
        ctx.arc(WORLD_W / 2, 980, 940, Math.PI * 1.18, Math.PI * 1.82);
        ctx.stroke();
      }

      ctx.restore();
      const nextDelayMs =
        curModal !== null || curShell === 'paused' || curShell === 'gameover' ? 250 : 28;
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
      canvas.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#070B14] overflow-hidden">
      <canvas
        ref={canvasRef}
        width={WORLD_W}
        height={WORLD_H}
        role="application"
        aria-label="Interactive Space Outpost Map - Click any workstation room or use WASD keys to move your astronaut"
        data-testid="outpost-canvas"
        className="w-full h-full object-contain cursor-pointer"
      />
    </div>
  );
};
