import React, { useEffect, useState } from 'react';
import { MissionSiteConfig } from '../../game/nasaData';
import { isDishAlignedWithTarget } from '../../game/rules';
import { spaceAudio } from '../../game/audio';

interface CommsDishGameProps {
  site: MissionSiteConfig;
  sol: number;
  isAlreadyDone: boolean;
  onComplete: (deltas: { science?: number }, logNote: string) => void;
  onCloseAndEndSol: () => void;
}

export const CommsDishGame: React.FC<CommsDishGameProps> = ({
  site,
  sol,
  isAlreadyDone,
  onComplete,
  onCloseAndEndSol,
}) => {
  const [dishAz, setDishAz] = useState<number>(32);
  const [dishEl, setDishEl] = useState<number>(42);
  const [targetAz, setTargetAz] = useState<number>(62);
  const [targetEl, setTargetEl] = useState<number>(52);
  const [uploadPct, setUploadPct] = useState<number>(isAlreadyDone ? 100 : 0);
  const [windowTimeLeft, setWindowTimeLeft] = useState<number>(30.0);
  const [phase, setPhase] = useState<'playing' | 'failed' | 'completed'>(
    isAlreadyDone ? 'completed' : 'playing'
  );
  const [failReason, setFailReason] = useState<string>('');

  const isLocked = isDishAlignedWithTarget(dishAz, dishEl, targetAz, targetEl, 15);
  const distanceToTarget = Math.hypot(dishAz - targetAz, dishEl - targetEl);
  const signalStrengthPct = Math.max(
    0,
    Math.min(100, Math.round(100 - distanceToTarget * 2.4))
  );

  const dishRef = React.useRef({ az: dishAz, el: dishEl });
  useEffect(() => {
    dishRef.current = { az: dishAz, el: dishEl };
  }, [dishAz, dishEl]);

  const onCompleteRef = React.useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Moving Earth Deep Space Network Beam + Upload Streaming + Window Countdown (single stable interval)
  useEffect(() => {
    if (phase !== 'playing') return;
    let tick = 0;
    const id = window.setInterval(() => {
      tick += 0.1;
      const nextAz = Number((50 + Math.sin(tick * 0.55) * 26).toFixed(1));
      const nextEl = Number((50 + Math.cos(tick * 0.42) * 22).toFixed(1));
      setTargetAz(nextAz);
      setTargetEl(nextEl);
      setWindowTimeLeft((prev) => Math.max(0, Number((prev - 0.1).toFixed(1))));

      const aligned = isDishAlignedWithTarget(
        dishRef.current.az,
        dishRef.current.el,
        nextAz,
        nextEl,
        15
      );
      setUploadPct((prev) => {
        const next = aligned ? Math.min(100, prev + 3.8) : Math.max(0, prev - 0.8);
        return Number(next.toFixed(1));
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [phase]);

  // Trigger completion or timeout cleanly in effect (never inside a state updater)
  useEffect(() => {
    if (phase !== 'playing') return;
    if (uploadPct >= 100) {
      setPhase('completed');
      spaceAudio.playBreakerClick(true);
      onCompleteRef.current(
        { science: 25 },
        'Tracked Earth Deep Space Network Beam & Uploaded Science Telemetry (+25 Science)'
      );
      return;
    }
    if (windowTimeLeft <= 0) {
      setPhase('failed');
      setFailReason(
        'Deep Space Network Window Closed! Earth rotated out of view before the telemetry packet hit 100%.'
      );
      spaceAudio.playBreakerClick(false);
    }
  }, [phase, uploadPct, windowTimeLeft]);

  const nudgeDish = (dAz: number, dEl: number) => {
    if (phase !== 'playing') return;
    setDishAz((a) => Math.max(8, Math.min(92, a + dAz)));
    setDishEl((e) => Math.max(10, Math.min(90, e + dEl)));
  };

  const resetDishTask = () => {
    setDishAz(32);
    setDishEl(42);
    setUploadPct(0);
    setWindowTimeLeft(30.0);
    setFailReason('');
    setPhase('playing');
    spaceAudio.playBreakerClick(true);
  };

  const handleScopePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (phase !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    setDishAz(Math.max(8, Math.min(92, Math.round(px))));
    setDishEl(Math.max(10, Math.min(90, Math.round(py))));
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-[#090E1A] border border-pink-500/40 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Interactive 2D Sky Dish Aiming Scope */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-pink-300">STARFIELD SKY SCOPE (CLICK/DRAG TO AIM)</span>
            <span className="text-amber-300 tabular-nums">{windowTimeLeft.toFixed(1)}s LEFT</span>
          </div>
          <svg
            viewBox="0 0 240 160"
            className="w-full h-44 rounded-xl bg-[#040711] border-2 border-slate-700 cursor-crosshair touch-none"
            onPointerDown={handleScopePointer}
            onPointerMove={(e) => {
              if (e.buttons === 1) handleScopePointer(e);
            }}
            aria-label="Comms Dish Sky Aiming Scope"
          >
            {/* Radar Rings */}
            <circle cx="120" cy="80" r="62" fill="none" stroke="#1E293B" strokeWidth="1.5" />
            <circle cx="120" cy="80" r="34" fill="none" stroke="#1E293B" strokeWidth="1" />
            <line x1="0" y1="80" x2="240" y2="80" stroke="#1E293B" strokeWidth="1" />
            <line x1="120" y1="0" x2="120" y2="160" stroke="#1E293B" strokeWidth="1" />

            {/* Moving Earth Target Cone */}
            <g transform={`translate(${(targetAz / 100) * 240}, ${(targetEl / 100) * 160})`}>
              <circle
                r="24"
                fill={isLocked ? 'rgba(16, 185, 129, 0.22)' : 'rgba(56, 189, 248, 0.14)'}
                stroke={isLocked ? '#10B981' : '#38BDF8'}
                strokeWidth="2"
                strokeDasharray="4 3"
              />
              <circle r="7" fill="#0284C7" stroke="#E0F2FE" strokeWidth="1.5" />
              <text y="18" textAnchor="middle" fill="#BAE6FD" fontSize="8" fontFamily="monospace">
                EARTH DSN
              </text>
            </g>

            {/* Player High-Gain Dish Reticle */}
            <g transform={`translate(${(dishAz / 100) * 240}, ${(dishEl / 100) * 160})`}>
              <circle
                r="14"
                fill="none"
                stroke={isLocked ? '#34D399' : '#EC4899'}
                strokeWidth="2.5"
              />
              <line x1="-18" y1="0" x2="18" y2="0" stroke="#F472B6" strokeWidth="1.5" />
              <line x1="0" y1="-18" x2="0" y2="18" stroke="#F472B6" strokeWidth="1.5" />
              <circle r="3" fill="#FFFFFF" />
            </g>
          </svg>
        </div>

        {/* Dish Steering Controls & Upload Meter */}
        <div className="space-y-3">
          <div className="text-sm font-bold text-pink-400">
            NASA Deep Space Network · One-Way Radio Delay: {site.commDelayMinutes} min
          </div>
          <p className="text-xs text-slate-300">
            Earth’s receiver drifts across the sky! Aim inside the dashed blue EARTH DSN ring
            using the scope, sliders, or steer buttons until Telemetry Packet reaches 100%!
          </p>

          {/* Sliders for Azimuth & Elevation */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs font-mono">
                <label htmlFor="dish-az-slider" className="text-slate-300">
                  AZIMUTH (LEFT / RIGHT)
                </label>
                <span className="text-white tabular-nums">{Math.round(dishAz)}°</span>
              </div>
              <input
                id="dish-az-slider"
                type="range"
                min={8}
                max={92}
                value={Math.round(dishAz)}
                onChange={(e) => setDishAz(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono">
                <label htmlFor="dish-el-slider" className="text-slate-300">
                  ELEVATION (UP / DOWN)
                </label>
                <span className="text-white tabular-nums">{Math.round(dishEl)}°</span>
              </div>
              <input
                id="dish-el-slider"
                type="range"
                min={10}
                max={90}
                value={Math.round(dishEl)}
                onChange={(e) => setDishEl(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Fine Steer Buttons + Lock Button */}
          {phase === 'playing' && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => nudgeDish(-8, 0)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                ◄ Left
              </button>
              <button
                type="button"
                onClick={() => nudgeDish(8, 0)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                Right ►
              </button>
              <button
                type="button"
                onClick={() => nudgeDish(0, -8)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                ▲ Up
              </button>
              <button
                type="button"
                onClick={() => nudgeDish(0, 8)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                ▼ Down
              </button>
              <button
                type="button"
                onClick={() => {
                  setDishAz(Math.round(targetAz));
                  setDishEl(Math.round(targetEl));
                  spaceAudio.playBreakerClick(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold cursor-pointer"
              >
                Track Earth
              </button>
            </div>
          )}

          {/* Signal Strength + Upload Packet Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-mono">
              <span className={isLocked ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                {isLocked
                  ? `★ SIGNAL LOCKED (${signalStrengthPct}%)`
                  : `ALIGNING DISH (${signalStrengthPct}%)`}
              </span>
              <span className="text-pink-300 font-bold tabular-nums">
                UPLOAD: {Math.round(uploadPct)}%
              </span>
            </div>
            <div className="w-full h-3.5 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  isLocked || phase === 'completed' ? 'bg-emerald-400' : 'bg-pink-500'
                }`}
                style={{ width: `${Math.round(uploadPct)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {phase === 'failed' && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/70 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-rose-300">UPLINK SIGNAL LOST!</div>
            <div className="text-xs text-rose-100 mt-0.5">{failReason}</div>
          </div>
          <button
            type="button"
            onClick={resetDishTask}
            className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold text-sm cursor-pointer"
          >
            Re-Aim Dish &amp; Retry
          </button>
        </div>
      )}

      {phase === 'completed' && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-400 text-xs font-bold text-emerald-200 flex items-center justify-between">
          <span>📡 Telemetry Packet Transmitted to Earth Deep Space Network (+25 Science)</span>
          <span className="font-mono">100% LOCKED</span>
        </div>
      )}

      {/* Complete Sol Trigger */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-cyan-300">Ready to Finish Sol {sol}?</div>
          <div className="text-xs text-slate-300">
            Simulate overnight outpost systems and advance to the next day!
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseAndEndSol}
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm cursor-pointer whitespace-nowrap"
        >
          Complete Sol {sol} →
        </button>
      </div>
    </div>
  );
};
