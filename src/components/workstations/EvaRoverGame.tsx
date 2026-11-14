import React, { useEffect, useRef, useState } from 'react';
import { MissionSiteConfig } from '../../game/nasaData';
import { EvaDustTargetState, computeRoverScrubStep } from '../../game/rules';
import { spaceAudio } from '../../game/audio';

interface DustPuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface EvaRoverGameProps {
  site: MissionSiteConfig;
  crewColor: string;
  isAlreadyDone: boolean;
  onComplete: (
    deltas: {
      bonusPowerKw?: number;
      science?: number;
      oxygen?: number;
      radiationMsv?: number;
      pantryDelta?: { h2oDrops?: number; spirulina?: number };
    },
    logNote: string
  ) => void;
}

function createEvaTargets(): Array<EvaDustTargetState & { label: string; kind: 'solar' | 'ice' }> {
  return [
    { id: 'wingA', label: 'Solar Wing Alpha', kind: 'solar', x: 165, y: 120, radius: 64, dustPct: 100 },
    { id: 'wingB', label: 'Solar Wing Beta', kind: 'solar', x: 475, y: 120, radius: 64, dustPct: 100 },
    { id: 'iceCore', label: 'Ice Drill Core', kind: 'ice', x: 320, y: 246, radius: 58, dustPct: 100 },
  ];
}

export const EvaRoverGame: React.FC<EvaRoverGameProps> = ({
  site,
  crewColor,
  isAlreadyDone,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<'playing' | 'failed' | 'completed'>(
    isAlreadyDone ? 'completed' : 'playing'
  );
  const [suitO2Pct, setSuitO2Pct] = useState<number>(isAlreadyDone ? 82 : 100);
  const [targetStats, setTargetStats] = useState<
    Array<{ id: string; label: string; cleanPct: number }>
  >(() =>
    createEvaTargets().map((t) => ({
      id: t.id,
      label: t.label,
      cleanPct: isAlreadyDone ? 100 : 0,
    }))
  );
  const [turboBrush, setTurboBrush] = useState<boolean>(false);

  const simRef = useRef<{
    roverX: number;
    roverY: number;
    roverAngle: number;
    brushAngle: number;
    wheelPhase: number;
    suitO2: number;
    targets: Array<EvaDustTargetState & { label: string; kind: 'solar' | 'ice' }>;
    puffs: DustPuff[];
    keys: Record<string, boolean>;
    pointerGoal: { x: number; y: number } | null;
    manualDir: { dx: number; dy: number };
    completedSent: boolean;
  }>({
    roverX: 320,
    roverY: 165,
    roverAngle: 0,
    brushAngle: 0,
    wheelPhase: 0,
    suitO2: 100,
    targets: createEvaTargets(),
    puffs: [],
    keys: {},
    pointerGoal: null,
    manualDir: { dx: 0, dy: 0 },
    completedSent: isAlreadyDone,
  });

  const resetEvaMission = () => {
    simRef.current = {
      roverX: 320,
      roverY: 165,
      roverAngle: 0,
      brushAngle: 0,
      wheelPhase: 0,
      suitO2: 100,
      targets: createEvaTargets(),
      puffs: [],
      keys: {},
      pointerGoal: null,
      manualDir: { dx: 0, dy: 0 },
      completedSent: false,
    };
    setSuitO2Pct(100);
    setTargetStats(
      createEvaTargets().map((t) => ({ id: t.id, label: t.label, cleanPct: 0 }))
    );
    setPhase('playing');
    spaceAudio.playBreakerClick(true);
  };

  // Keyboard navigation listener for EVA Rover (WASD + Arrows + Space Turbo Brush)
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        simRef.current.keys[k] = true;
        simRef.current.pointerGoal = null;
        if (k === ' ') setTurboBrush(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      simRef.current.keys[k] = false;
      if (k === ' ') setTurboBrush(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [phase]);

  // 2D + 3D Blended Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let timerId = 0;
    let lastTime = performance.now();
    let uiAccum = 0;
    let cancelled = false;

    const loop = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(0.05, Math.max(0.008, (now - lastTime) / 1000));
      lastTime = now;

      const s = simRef.current;

      if (phase === 'playing') {
        // Suit O2 drains over ~44 seconds
        s.suitO2 = Math.max(0, s.suitO2 - dt * 2.25);
        if (s.suitO2 <= 0 && !s.completedSent) {
          setSuitO2Pct(0);
          setPhase('failed');
          spaceAudio.playBreakerClick(false);
        }

        // Steering velocity from keyboard, on-screen D-pad, or pointer goal
        let vx = s.manualDir.dx;
        let vy = s.manualDir.dy;
        if (s.keys['a'] || s.keys['arrowleft']) vx -= 1;
        if (s.keys['d'] || s.keys['arrowright']) vx += 1;
        if (s.keys['w'] || s.keys['arrowup']) vy -= 1;
        if (s.keys['s'] || s.keys['arrowdown']) vy += 1;

        if (vx === 0 && vy === 0 && s.pointerGoal) {
          const dx = s.pointerGoal.x - s.roverX;
          const dy = s.pointerGoal.y - s.roverY;
          const dist = Math.hypot(dx, dy);
          if (dist > 6) {
            vx = dx / dist;
            vy = dy / dist;
          } else {
            s.pointerGoal = null;
          }
        }

        const mag = Math.hypot(vx, vy);
        const speed = 185;
        if (mag > 0.05) {
          const nx = vx / mag;
          const ny = vy / mag;
          s.roverX = Math.max(46, Math.min(594, s.roverX + nx * speed * dt));
          s.roverY = Math.max(76, Math.min(286, s.roverY + ny * speed * dt));
          s.roverAngle = Math.atan2(ny, nx);
          s.wheelPhase += dt * 10;
        }

        const turboOn = Boolean(s.keys[' ']) || turboBrush;
        s.brushAngle += dt * (turboOn ? 14 : 7);

        // Brush nearby solar panels or ice drill core!
        const scrubRate = (turboOn ? 62 : 40) * (mag > 0.05 ? 1.25 : 0.85);
        const scrubResult = computeRoverScrubStep(
          s.roverX,
          s.roverY,
          s.targets,
          scrubRate * dt
        );
        s.targets = scrubResult.targets.map((nt, idx) => ({
          ...s.targets[idx],
          dustPct: nt.dustPct,
        }));

        if (scrubResult.scrubbedIds.length > 0 && Math.random() < 0.55) {
          const activeT = s.targets.find((t) => t.id === scrubResult.scrubbedIds[0]);
          if (activeT) {
            s.puffs.push({
              x: s.roverX + (Math.random() - 0.5) * 24,
              y: s.roverY + (Math.random() - 0.5) * 16,
              vx: (Math.random() - 0.5) * 75,
              vy: -25 - Math.random() * 45,
              life: 0.42,
              color: activeT.kind === 'ice' ? '#7DD3FC' : '#D97706',
            });
          }
        }

        for (let i = s.puffs.length - 1; i >= 0; i--) {
          const p = s.puffs[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) s.puffs.splice(i, 1);
        }

        if (s.targets.every((t) => t.dustPct <= 0) && !s.completedSent) {
          s.completedSent = true;
          setPhase('completed');
          setTargetStats(
            s.targets.map((t) => ({ id: t.id, label: t.label, cleanPct: 100 }))
          );
          spaceAudio.playBreakerClick(true);
          onComplete(
            {
              bonusPowerKw: 1,
              science: 25,
              oxygen: -6,
              radiationMsv: 2.5,
              pantryDelta: { h2oDrops: 2, spirulina: 1 },
            },
            'Drove EVA Rover, Cleaned Arrays & Drilled Ice Core (+1 kW, +2 H2O Drops, +1 Spirulina)'
          );
        }

        uiAccum += dt;
        if (uiAccum >= 0.1) {
          uiAccum = 0;
          setSuitO2Pct(Math.round(s.suitO2));
          setTargetStats(
            s.targets.map((t) => ({
              id: t.id,
              label: t.label,
              cleanPct: Math.round(100 - t.dustPct),
            }))
          );
        }
      }

      // === 2D + 3D BLENDED SURFACE RENDER ===
      // 1. Deep space horizon band (3D perspective sky)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 68);
      skyGrad.addColorStop(0, '#020617');
      skyGrad.addColorStop(1, site.id === 'mars' ? '#431407' : '#0F172A');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 640, 68);

      // Stars & Horizon Planet Orb
      ctx.fillStyle = '#E2E8F0';
      [
        [45, 18],
        [120, 32],
        [210, 14],
        [370, 26],
        [490, 16],
        [590, 28],
      ].forEach(([sx, sy]) => {
        ctx.fillRect(sx, sy, 2, 2);
      });
      ctx.fillStyle = site.id === 'mars' ? '#FDE68A' : '#38BDF8';
      ctx.beginPath();
      ctx.arc(540, 34, 15, 0, Math.PI * 2);
      ctx.fill();

      // 2. 2.5D Tilted Surface Ground Plane with Perspective Grid
      const groundGrad = ctx.createLinearGradient(0, 62, 0, 310);
      groundGrad.addColorStop(0, site.terrainAccent);
      groundGrad.addColorStop(1, site.terrainColor);
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, 62, 640, 248);

      // Distant 3D crater ridge silhouettes along horizon
      ctx.fillStyle = site.id === 'mars' ? '#290D04' : '#0F172A';
      ctx.beginPath();
      ctx.moveTo(0, 66);
      ctx.lineTo(90, 50);
      ctx.lineTo(190, 64);
      ctx.lineTo(310, 44);
      ctx.lineTo(440, 62);
      ctx.lineTo(540, 48);
      ctx.lineTo(640, 65);
      ctx.lineTo(640, 70);
      ctx.lineTo(0, 70);
      ctx.closePath();
      ctx.fill();

      // Perspective surface grid lines converging toward horizon center (320, 20)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let gx = -260; gx <= 900; gx += 95) {
        ctx.beginPath();
        ctx.moveTo(320 + (gx - 320) * 0.25, 66);
        ctx.lineTo(gx, 310);
        ctx.stroke();
      }
      [96, 136, 188, 250].forEach((gy) => {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(640, gy);
        ctx.stroke();
      });

      // Decorative 3D-extruded rocks on edges
      [
        [52, 260, 18],
        [592, 232, 22],
        [320, 92, 12],
      ].forEach(([rx, ry, rr]) => {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(rx + 6, ry + 8, rr * 1.15, rr * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = site.id === 'mars' ? '#7C2D12' : '#475569';
        ctx.beginPath();
        ctx.arc(rx, ry, rr, Math.PI, 0);
        ctx.lineTo(rx + rr, ry + 5);
        ctx.lineTo(rx - rr, ry + 5);
        ctx.closePath();
        ctx.fill();
      });

      // 3. Draw 3D-Extruded Solar Wing Targets & Ice Drill Core
      for (const t of s.targets) {
        const cleanRatio = 1 - t.dustPct / 100;
        const depthScale = 0.85 + ((t.y - 60) / 250) * 0.28;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.scale(depthScale, depthScale);

        if (t.kind === 'solar') {
          // 3D Ground Drop Shadow
          ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
          ctx.beginPath();
          ctx.ellipse(6, 26, 56, 16, 0, 0, Math.PI * 2);
          ctx.fill();

          // 3D Support Strut
          ctx.fillStyle = '#475569';
          ctx.fillRect(-7, 4, 14, 22);

          // 3D Extruded Aluminum Frame Bottom Edge (Thickness)
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.moveTo(-54, 4);
          ctx.lineTo(44, 4);
          ctx.lineTo(54, -22);
          ctx.lineTo(54, -14);
          ctx.lineTo(44, 12);
          ctx.lineTo(-54, 12);
          ctx.closePath();
          ctx.fill();

          // Skewed 3D Photovoltaic Top Surface
          ctx.fillStyle = '#0F172A';
          ctx.strokeStyle = cleanRatio >= 1 ? '#38BDF8' : '#F59E0B';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-44, -22);
          ctx.lineTo(54, -22);
          ctx.lineTo(44, 4);
          ctx.lineTo(-54, 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Blue Solar Cell Grid lines
          ctx.fillStyle = cleanRatio >= 1 ? '#0284C7' : '#0369A1';
          ctx.beginPath();
          ctx.moveTo(-40, -19);
          ctx.lineTo(49, -19);
          ctx.lineTo(40, 1);
          ctx.lineTo(-49, 1);
          ctx.closePath();
          ctx.fill();

          // Clinging Dust Coat Layer (fades cleanly as dustPct -> 0)
          if (t.dustPct > 0) {
            ctx.fillStyle = `rgba(180, 83, 9, ${Math.min(0.92, t.dustPct / 100)})`;
            ctx.beginPath();
            ctx.moveTo(-44, -22);
            ctx.lineTo(54, -22);
            ctx.lineTo(44, 4);
            ctx.lineTo(-54, 4);
            ctx.closePath();
            ctx.fill();
          }
        } else {
          // 3D Extruded Ice Drill Core Crater Beacon
          ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
          ctx.beginPath();
          ctx.ellipse(4, 18, 44, 16, 0, 0, Math.PI * 2);
          ctx.fill();

          // 3D Cylinder Rim
          ctx.fillStyle = '#1E293B';
          ctx.strokeStyle = cleanRatio >= 1 ? '#38BDF8' : '#F97316';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(0, 6, 38, 14, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Glowing Ice Core Crystal Column
          ctx.fillStyle = cleanRatio >= 1 ? '#7DD3FC' : '#B45309';
          ctx.fillRect(-10, -24, 20, 30);
          ctx.beginPath();
          ctx.ellipse(0, -24, 10, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Progress label tag
        ctx.fillStyle = '#090E1A';
        ctx.beginPath();
        ctx.roundRect(-42, -44, 84, 17, 5);
        ctx.fill();
        ctx.fillStyle = cleanRatio >= 1 ? '#34D399' : '#FDE68A';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          cleanRatio >= 1 ? '✓ CLEAN' : `${Math.round(cleanRatio * 100)}% CLEAN`,
          0,
          -32
        );
        ctx.restore();
      }

      // 4. Draw 2D/3D Blended NASA Rover + EVA Crewmate + Spinning Brush Arm
      const roverScale = 0.85 + ((s.roverY - 60) / 250) * 0.25;
      ctx.save();
      ctx.translate(s.roverX, s.roverY);
      ctx.scale(roverScale, roverScale);

      // Rover Ground Shadow
      ctx.fillStyle = 'rgba(2, 6, 23, 0.5)';
      ctx.beginPath();
      ctx.ellipse(2, 16, 30, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Headlight Beam Cone
      ctx.save();
      ctx.rotate(s.roverAngle);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.14)';
      ctx.beginPath();
      ctx.moveTo(18, -4);
      ctx.lineTo(78, -26);
      ctx.lineTo(78, 26);
      ctx.lineTo(18, 4);
      ctx.closePath();
      ctx.fill();

      // Spinning Rotary Dust Brush Head in Front of Rover
      ctx.save();
      ctx.translate(28, 0);
      ctx.rotate(s.brushAngle);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 3;
      for (let b = 0; b < 4; b++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(12, 0);
        ctx.stroke();
      }
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.restore();

      // 6 Rover Wheels (3D shaded)
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      [-16, 0, 16].forEach((wx) => {
        ctx.beginPath();
        ctx.arc(wx, 12, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // 3D Extruded Rover Chassis
      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.roundRect(-22, -6, 44, 16, 5);
      ctx.fill();
      ctx.fillStyle = '#FB923C';
      ctx.beginPath();
      ctx.roundRect(-20, -10, 40, 12, 5);
      ctx.fill();

      // Cartoon Spaceman Astronaut Pilot on Rover
      // Oxygen backpack behind astronaut
      ctx.fillStyle = '#E2E8F0';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-14, -23, 7, 14, 3);
      ctx.fill();
      ctx.stroke();

      // Spacesuit torso + chest control module
      ctx.fillStyle = crewColor;
      ctx.beginPath();
      ctx.roundRect(-9, -22, 18, 15, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.roundRect(-5, -19, 10, 8, 2.5);
      ctx.fill();

      // Gloved hands gripping rover controls
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(8, -14, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Spherical Cartoon Space Helmet
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(0, -30, 11.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Helmet Collar Ring
      ctx.fillStyle = crewColor;
      ctx.beginPath();
      ctx.roundRect(-8, -21, 16, 3.5, 1.5);
      ctx.fill();

      // Glass Bubble Visor + Cheerful Cartoon Face Inside
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.ellipse(2, -30, 8.2, 6.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cartoon Face (warm skin tone, friendly eyes & smile)
      ctx.fillStyle = '#FDBA74';
      ctx.beginPath();
      ctx.ellipse(2, -29.5, 6.4, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(0.5, -30.5, 1.2, 0, Math.PI * 2);
      ctx.arc(4.8, -30.5, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#7C2D12';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(2.6, -28.2, 2.2, 0.15, Math.PI - 0.15);
      ctx.stroke();

      // Reflective Glass Glint
      ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
      ctx.beginPath();
      ctx.ellipse(2, -30, 8.2, 6.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-2, -33.5, 2.5, 1.2, -0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 5. Flying Scrubbed Dust Particles
      for (const p of s.puffs) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life * 2);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      timerId = window.setTimeout(() => loop(performance.now()), 20);
    };

    timerId = window.setTimeout(() => loop(performance.now()), 20);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [phase, site, crewColor, onComplete, turboBrush]);

  const steerTowardCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 640;
    const y = ((e.clientY - rect.top) / rect.height) * 310;
    simRef.current.pointerGoal = { x, y };
  };

  const setDPad = (dx: number, dy: number) => {
    simRef.current.manualDir = { dx, dy };
    simRef.current.pointerGoal = null;
  };

  return (
    <div className="space-y-4">
      {/* Top Info + Suit O2 Countdown */}
      <div className="p-4 rounded-2xl bg-[#090E1A] border border-orange-500/40 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-[230px]">
          <div className="text-sm font-bold text-orange-400">
            2D/3D Surface Spacewalk · {site.name} ({site.surfaceTempRange})
          </div>
          <p className="text-xs text-slate-300">
            Drive the Rover with <span className="font-mono text-white">WASD / Arrows</span>, click
            &amp; drag on the terrain, or use the control pad! Drive over both dusty Solar Wings
            and the Ice Drill Core to brush them 100% clean before Suit O2 hits 0%!
          </p>
        </div>
        <div className="w-44 font-mono">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-sky-300">EVA SUIT O2</span>
            <span
              className={`font-bold tabular-nums ${
                suitO2Pct <= 25 ? 'text-rose-400' : 'text-sky-300'
              }`}
            >
              {suitO2Pct}%
            </span>
          </div>
          <div className="w-full h-3.5 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                suitO2Pct <= 25 ? 'bg-rose-500' : 'bg-sky-400'
              }`}
              style={{ width: `${suitO2Pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2D+3D Blended Canvas */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-orange-500/50 bg-[#050914]">
        <canvas
          ref={canvasRef}
          width={640}
          height={310}
          data-testid="eva-rover-canvas"
          onPointerDown={steerTowardCanvasPoint}
          onPointerMove={(e) => {
            if (e.buttons === 1) steerTowardCanvasPoint(e);
          }}
          className="w-full h-auto block cursor-pointer touch-none"
        />

        {phase === 'failed' && (
          <div className="absolute inset-0 bg-slate-950/88 flex flex-col items-center justify-center p-6 text-center gap-3">
            <div className="text-lg font-bold text-rose-400">
              EVA SUIT O2 DEPLETED — AIRLOCK RECALL!
            </div>
            <p className="text-xs text-slate-200 max-w-md">
              Your spacesuit oxygen reached 0% before all 3 surface targets were brushed clean.
              Recharge suit tanks and head back outside!
            </p>
            <button
              type="button"
              onClick={resetEvaMission}
              className="px-5 py-2.5 rounded-xl bg-orange-400 hover:bg-orange-300 text-slate-950 font-bold text-sm cursor-pointer"
            >
              Restart EVA Spacewalk
            </button>
          </div>
        )}
      </div>

      {/* Target Clean Meters + Accessible Drive Pad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        <div className="grid grid-cols-3 gap-2">
          {targetStats.map((t) => (
            <div
              key={t.id}
              className={`p-2.5 rounded-xl border text-center ${
                t.cleanPct >= 100
                  ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
                  : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
            >
              <div className="text-[11px] font-bold truncate">{t.label}</div>
              <div className="text-sm font-mono font-extrabold tabular-nums mt-0.5">
                {t.cleanPct}%
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-950 mt-1 overflow-hidden">
                <div
                  className={`h-full ${t.cleanPct >= 100 ? 'bg-emerald-400' : 'bg-orange-400'}`}
                  style={{ width: `${t.cleanPct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Tactile On-Screen Rover Controls + Drive To Helper */}
        {phase === 'playing' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Drive Rover Left"
                onPointerDown={() => setDPad(-1, 0)}
                onPointerUp={() => setDPad(0, 0)}
                onPointerLeave={() => setDPad(0, 0)}
                onClick={() => {
                  simRef.current.pointerGoal = {
                    x: Math.max(50, simRef.current.roverX - 70),
                    y: simRef.current.roverY,
                  };
                }}
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
              >
                ◄
              </button>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-label="Drive Rover Up"
                  onPointerDown={() => setDPad(0, -1)}
                  onPointerUp={() => setDPad(0, 0)}
                  onPointerLeave={() => setDPad(0, 0)}
                  onClick={() => {
                    simRef.current.pointerGoal = {
                      x: simRef.current.roverX,
                      y: Math.max(80, simRef.current.roverY - 55),
                    };
                  }}
                  className="w-10 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label="Drive Rover Down"
                  onPointerDown={() => setDPad(0, 1)}
                  onPointerUp={() => setDPad(0, 0)}
                  onPointerLeave={() => setDPad(0, 0)}
                  onClick={() => {
                    simRef.current.pointerGoal = {
                      x: simRef.current.roverX,
                      y: Math.min(280, simRef.current.roverY + 55),
                    };
                  }}
                  className="w-10 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
                >
                  ▼
                </button>
              </div>
              <button
                type="button"
                aria-label="Drive Rover Right"
                onPointerDown={() => setDPad(1, 0)}
                onPointerUp={() => setDPad(0, 0)}
                onPointerLeave={() => setDPad(0, 0)}
                onClick={() => {
                  simRef.current.pointerGoal = {
                    x: Math.min(590, simRef.current.roverX + 70),
                    y: simRef.current.roverY,
                  };
                }}
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
              >
                ►
              </button>
            </div>

            <button
              type="button"
              onClick={() => setTurboBrush((v) => !v)}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs cursor-pointer ${
                turboBrush
                  ? 'bg-orange-400 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-orange-300 border border-orange-500/40'
              }`}
            >
              🧹 Turbo Brush: {turboBrush ? 'ON' : 'OFF'}
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-400 text-xs font-mono text-emerald-200">
            ✓ EVA COMPLETE (+1 kW Power, +25 Science, -6% O2, +2.5 mSv)
          </div>
        )}
      </div>
    </div>
  );
};
