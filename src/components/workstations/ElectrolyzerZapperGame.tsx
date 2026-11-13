import React, { useEffect, useRef, useState } from 'react';
import { spaceAudio } from '../../game/audio';

interface GrimeBlob {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  hue: string;
}

interface ZapSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface ElectrolyzerZapperGameProps {
  isAlreadyDone: boolean;
  onComplete: (deltas: { oxygen?: number; science?: number }, logNote: string) => void;
}

const TOTAL_BLOBS = 8;

function createInitialBlobs(): GrimeBlob[] {
  const palette = ['#84CC16', '#A3E635', '#65A30D', '#CA8A04'];
  return Array.from({ length: TOTAL_BLOBS }).map((_, i) => ({
    id: i + 1,
    x: 85 + ((i * 63) % 410),
    y: 55 + ((i * 47) % 145),
    vx: (i % 2 === 0 ? 1 : -1) * (48 + (i % 3) * 18),
    vy: (i % 3 === 0 ? 1 : -1) * (34 + (i % 2) * 20),
    radius: 20 + (i % 2) * 4,
    hp: 100,
    maxHp: 100,
    hue: palette[i % palette.length],
  }));
}

export const ElectrolyzerZapperGame: React.FC<ElectrolyzerZapperGameProps> = ({
  isAlreadyDone,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gamePhase, setGamePhase] = useState<'playing' | 'failed' | 'completed'>(
    isAlreadyDone ? 'completed' : 'playing'
  );
  const [zappedCount, setZappedCount] = useState<number>(isAlreadyDone ? TOTAL_BLOBS : 0);
  const [co2Level, setCo2Level] = useState<number>(isAlreadyDone ? 0 : 12);
  const [aimInfo, setAimInfo] = useState<{ x: number; y: number }>({ x: 290, y: 125 });

  const stateRef = useRef<{
    blobs: GrimeBlob[];
    sparks: ZapSpark[];
    aimX: number;
    aimY: number;
    firing: boolean;
    laserFlashTimer: number;
    co2: number;
    zapped: number;
    fanAngle: number;
    completedSent: boolean;
  }>({
    blobs: createInitialBlobs(),
    sparks: [],
    aimX: 290,
    aimY: 125,
    firing: false,
    laserFlashTimer: 0,
    co2: 12,
    zapped: 0,
    fanAngle: 0,
    completedSent: isAlreadyDone,
  });

  const fireLaserAt = (targetX: number, targetY: number) => {
    const s = stateRef.current;
    if (gamePhase !== 'playing' || s.completedSent) return;
    s.aimX = targetX;
    s.aimY = targetY;
    s.laserFlashTimer = 0.14;

    let hitAny = false;
    for (let i = s.blobs.length - 1; i >= 0; i--) {
      const b = s.blobs[i];
      const dist = Math.hypot(b.x - targetX, b.y - targetY);
      if (dist <= b.radius + 16) {
        hitAny = true;
        b.hp -= 55;
        for (let k = 0; k < 8; k++) {
          const ang = (Math.PI * 2 * k) / 8;
          s.sparks.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(ang) * 110,
            vy: Math.sin(ang) * 110,
            life: 0.35,
            color: b.hp <= 0 ? '#38BDF8' : '#FACC15',
          });
        }
        if (b.hp <= 0) {
          s.blobs.splice(i, 1);
          s.zapped += 1;
          s.co2 = Math.max(0, s.co2 - 9);
          setZappedCount(s.zapped);
          spaceAudio.playBreakerClick(true);
          if (s.zapped >= TOTAL_BLOBS && !s.completedSent) {
            s.completedSent = true;
            setGamePhase('completed');
            setCo2Level(0);
            onComplete(
              { oxygen: 8, science: 20 },
              'Zapped all 8 drifting CO2 Grime Blobs in the Electrolyzer Bay (+8% O2)'
            );
          }
        } else {
          spaceAudio.playBreakerClick(true);
        }
        break;
      }
    }
    if (!hitAny) {
      s.sparks.push({
        x: targetX,
        y: targetY,
        vx: 0,
        vy: -20,
        life: 0.2,
        color: '#38BDF8',
      });
    }
  };

  const resetZapperTask = () => {
    stateRef.current = {
      blobs: createInitialBlobs(),
      sparks: [],
      aimX: 290,
      aimY: 125,
      firing: false,
      laserFlashTimer: 0,
      co2: 12,
      zapped: 0,
      fanAngle: 0,
      completedSent: false,
    };
    setZappedCount(0);
    setCo2Level(12);
    setGamePhase('playing');
    spaceAudio.playBreakerClick(true);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let timerId = 0;
    let lastTime = performance.now();
    let uiSyncAccum = 0;
    let cancelled = false;

    const loop = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(0.05, Math.max(0.008, (now - lastTime) / 1000));
      lastTime = now;

      const s = stateRef.current;

      if (gamePhase === 'playing') {
        s.fanAngle += dt * (1.5 + s.zapped * 0.6);
        if (s.laserFlashTimer > 0) s.laserFlashTimer = Math.max(0, s.laserFlashTimer - dt);

        // CO2 climbs based on remaining active grime blobs (~22s total if ignored)
        const remainingRatio = Math.max(0.2, s.blobs.length / TOTAL_BLOBS);
        s.co2 = Math.min(100, s.co2 + dt * (4.4 * remainingRatio));
        if (s.co2 >= 100 && s.zapped < TOTAL_BLOBS) {
          setCo2Level(100);
          setGamePhase('failed');
          spaceAudio.playBreakerClick(false);
        }

        // Move grime blobs and bounce smoothly
        for (const b of s.blobs) {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.x < b.radius + 16 || b.x > 580 - b.radius - 16) {
            b.vx *= -1;
            b.x = Math.max(b.radius + 16, Math.min(580 - b.radius - 16, b.x));
          }
          if (b.y < b.radius + 18 || b.y > 238 - b.radius) {
            b.vy *= -1;
            b.y = Math.max(b.radius + 18, Math.min(238 - b.radius, b.y));
          }
        }

        // Continuous laser beam burn if mouse/pointer is held down
        if (s.firing) {
          s.laserFlashTimer = 0.08;
          for (let i = s.blobs.length - 1; i >= 0; i--) {
            const b = s.blobs[i];
            if (Math.hypot(b.x - s.aimX, b.y - s.aimY) <= b.radius + 14) {
              b.hp -= dt * 160;
              if (Math.random() < 0.35) {
                s.sparks.push({
                  x: b.x + (Math.random() - 0.5) * 14,
                  y: b.y + (Math.random() - 0.5) * 14,
                  vx: (Math.random() - 0.5) * 90,
                  vy: (Math.random() - 0.5) * 90,
                  life: 0.25,
                  color: '#38BDF8',
                });
              }
              if (b.hp <= 0) {
                s.blobs.splice(i, 1);
                s.zapped += 1;
                s.co2 = Math.max(0, s.co2 - 9);
                setZappedCount(s.zapped);
                spaceAudio.playBreakerClick(true);
                if (s.zapped >= TOTAL_BLOBS && !s.completedSent) {
                  s.completedSent = true;
                  setGamePhase('completed');
                  setCo2Level(0);
                  onComplete(
                    { oxygen: 8, science: 20 },
                    'Zapped all 8 drifting CO2 Grime Blobs in the Electrolyzer Bay (+8% O2)'
                  );
                }
              }
            }
          }
        }

        for (let i = s.sparks.length - 1; i >= 0; i--) {
          const p = s.sparks[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) s.sparks.splice(i, 1);
        }

        uiSyncAccum += dt;
        if (uiSyncAccum >= 0.12) {
          uiSyncAccum = 0;
          setCo2Level(Math.round(s.co2));
          setAimInfo({ x: Math.round(s.aimX), y: Math.round(s.aimY) });
        }
      } else {
        s.fanAngle += dt * 3.5;
      }

      // Draw Scrubber Chamber
      ctx.fillStyle = '#050914';
      ctx.fillRect(0, 0, 580, 260);

      // Background grid & water-splitting glow
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.lineWidth = 1;
      for (let gx = 40; gx < 580; gx += 45) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, 260);
        ctx.stroke();
      }
      for (let gy = 40; gy < 260; gy += 45) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(580, gy);
        ctx.stroke();
      }

      // 4 Spinning Scrubber Vents in backdrop
      [95, 225, 355, 485].forEach((vx) => {
        ctx.save();
        ctx.translate(vx, 128);
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = gamePhase === 'failed' ? '#FB7185' : '#0284C7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.rotate(s.fanAngle);
        ctx.fillStyle = gamePhase === 'completed' ? '#38BDF8' : '#334155';
        for (let b = 0; b < 4; b++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.roundRect(-5, -28, 10, 22, 4);
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Grime Blobs
      for (const b of s.blobs) {
        ctx.save();
        ctx.translate(b.x, b.y);
        // Gooey aura
        ctx.fillStyle = 'rgba(132, 204, 22, 0.22)';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius + 6, 0, Math.PI * 2);
        ctx.fill();

        // Blob body
        ctx.fillStyle = b.hue;
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Label CO2
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CO2', 0, 4);

        // Mini HP bar if damaged
        if (b.hp < b.maxHp) {
          ctx.fillStyle = '#090E1A';
          ctx.fillRect(-16, -b.radius - 9, 32, 5);
          ctx.fillStyle = '#38BDF8';
          ctx.fillRect(-16, -b.radius - 9, (32 * Math.max(0, b.hp)) / b.maxHp, 5);
        }
        ctx.restore();
      }

      // Draw Laser Emitter Nozzle at bottom-center + Active Laser Beam
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(268, 240, 44, 20, 6);
      ctx.fill();
      ctx.stroke();

      if (gamePhase === 'playing') {
        // Subtle targeting line
        ctx.strokeStyle = s.laserFlashTimer > 0 ? '#38BDF8' : 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = s.laserFlashTimer > 0 ? 5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(290, 242);
        ctx.lineTo(s.aimX, s.aimY);
        ctx.stroke();

        if (s.laserFlashTimer > 0) {
          ctx.strokeStyle = '#E0F2FE';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(290, 242);
          ctx.lineTo(s.aimX, s.aimY);
          ctx.stroke();
        }

        // Crosshair reticle
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.aimX, s.aimY, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.aimX - 20, s.aimY);
        ctx.lineTo(s.aimX + 20, s.aimY);
        ctx.moveTo(s.aimX, s.aimY - 20);
        ctx.lineTo(s.aimX, s.aimY + 20);
        ctx.stroke();
      }

      // Sparks
      for (const p of s.sparks) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life * 2.5);
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
  }, [gamePhase, onComplete]);

  const toCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 580;
    const y = ((e.clientY - rect.top) / rect.height) * 260;
    return { x, y };
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-[#090E1A] border border-sky-500/40 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-[240px]">
          <div className="text-sm font-bold text-sky-400">
            NASA ISS ECLSS Scrubber Laser: Zap All {TOTAL_BLOBS} Drifting CO2 Grime Blobs!
          </div>
          <p className="text-xs text-slate-300">
            Click or hold your pointer on the floating green CO2 blobs to burn them away with the UV
            purifier beam before cabin CO2 buildup reaches 100%!
          </p>
        </div>
        <div className="flex items-center gap-4 font-mono">
          <div className="text-right">
            <div className="text-[11px] text-slate-400">GRIME ZAPPED</div>
            <div className="text-xl font-bold text-sky-300 tabular-nums">
              {zappedCount}/{TOTAL_BLOBS}
            </div>
          </div>
          <div className="w-36">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400">CO2 BUILDUP</span>
              <span
                className={`font-bold tabular-nums ${
                  co2Level >= 75 ? 'text-rose-400' : 'text-amber-300'
                }`}
              >
                {co2Level}%
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  co2Level >= 75 ? 'bg-rose-500' : 'bg-amber-400'
                }`}
                style={{ width: `${co2Level}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Canvas Laser Arena */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 bg-[#050914]">
        <canvas
          ref={canvasRef}
          width={580}
          height={260}
          data-testid="electrolyzer-zapper-canvas"
          onPointerMove={(e) => {
            const { x, y } = toCanvasCoords(e);
            stateRef.current.aimX = x;
            stateRef.current.aimY = y;
          }}
          onPointerDown={(e) => {
            const { x, y } = toCanvasCoords(e);
            stateRef.current.firing = true;
            fireLaserAt(x, y);
          }}
          onPointerUp={() => {
            stateRef.current.firing = false;
          }}
          onPointerLeave={() => {
            stateRef.current.firing = false;
          }}
          className="w-full h-auto block cursor-crosshair touch-none"
        />

        {gamePhase === 'failed' && (
          <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center p-6 text-center gap-3">
            <div className="text-lg font-bold text-rose-400">
              CO2 SCRUBBER CLOGGED AT 100%!
            </div>
            <p className="text-xs text-slate-200 max-w-md">
              Too many CO2 grime blobs blocked the air vents ({zappedCount}/{TOTAL_BLOBS} cleared).
              Reset the purge valve and zap them faster!
            </p>
            <button
              type="button"
              onClick={resetZapperTask}
              className="px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-sm cursor-pointer"
            >
              Restart Scrubber Task
            </button>
          </div>
        )}

        {gamePhase === 'completed' && (
          <div className="p-3 bg-emerald-950/75 border-t border-emerald-500/50 flex items-center justify-between text-xs font-mono text-emerald-200">
            <span>✓ ALL 8 CO2 GRIME BLOBS VAPORIZED · AIR PURITY 100% (+8% O2 &amp; +20 Science)</span>
            <span>LASER STANDBY</span>
          </div>
        )}
      </div>

      {/* Accessible Auto-Lock Laser Helper Button for Keyboard/Accessibility Users */}
      {gamePhase === 'playing' && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs font-mono text-slate-300 tabular-nums">
            LASER AIM ({aimInfo.x}, {aimInfo.y}) · Click blobs in canvas or use Pulse Nearest Grime
          </div>
          <button
            type="button"
            onClick={() => {
              const first = stateRef.current.blobs[0];
              if (first) {
                fireLaserAt(first.x, first.y);
              }
            }}
            className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
          >
            ⚡ Fire UV Pulse at Nearest Grime
          </button>
        </div>
      )}
    </div>
  );
};
