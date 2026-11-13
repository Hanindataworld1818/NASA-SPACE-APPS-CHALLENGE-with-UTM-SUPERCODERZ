import React, { useEffect, useState } from 'react';
import { NasaDonkiEvent } from '../../game/nasaData';
import { spaceAudio } from '../../game/audio';

const SECTORS = ['North Dome Wall', 'Zenith Solar Cap', 'South Habitat Ring'] as const;

interface ShieldPumpGameProps {
  donki: NasaDonkiEvent;
  shieldPowerKw: number;
  isAlreadyDone: boolean;
  onComplete: (deltas: { radiationMsv?: number; science?: number }, logNote: string) => void;
}

export const ShieldPumpGame: React.FC<ShieldPumpGameProps> = ({
  donki,
  shieldPowerKw,
  isAlreadyDone,
  onComplete,
}) => {
  const [lockedSectors, setLockedSectors] = useState<boolean[]>(
    isAlreadyDone ? [true, true, true] : [false, false, false]
  );
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [pressurePct, setPressurePct] = useState<number>(isAlreadyDone ? 100 : 28);
  const [sectorTimeLeft, setSectorTimeLeft] = useState<number>(14.0);
  const [phase, setPhase] = useState<'playing' | 'failed' | 'completed'>(
    isAlreadyDone ? 'completed' : 'playing'
  );
  const [failReason, setFailReason] = useState<string>('');
  const [pumpPulse, setPumpPulse] = useState<boolean>(false);

  const lockedCount = isAlreadyDone ? 3 : lockedSectors.filter(Boolean).length;
  const liveShieldPct = Math.min(
    92,
    shieldPowerKw * 28 + (lockedCount === 3 ? 16 : lockedCount * 4)
  );
  const inLockZone = pressurePct >= 75;

  // Constant pressure decay + countdown timer while pumping an unlocked tank
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => {
      setPressurePct((prev) => Math.max(8, Number((prev - 1.1).toFixed(1))));
      setSectorTimeLeft((prev) => Math.max(0, Number((prev - 0.1).toFixed(1))));
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, activeIdx]);

  useEffect(() => {
    if (phase === 'playing' && sectorTimeLeft <= 0) {
      setPhase('failed');
      setFailReason(
        `Solar Proton Surge! ${SECTORS[activeIdx]} failed to reach 75%+ pressure lock before the 14s timer expired.`
      );
      spaceAudio.playBreakerClick(false);
    }
  }, [phase, sectorTimeLeft, activeIdx]);

  const handlePump = () => {
    if (phase !== 'playing') return;
    spaceAudio.playBreakerClick(true);
    setPumpPulse(true);
    window.setTimeout(() => setPumpPulse(false), 90);
    setPressurePct((prev) => Math.min(100, Math.round(prev + 16)));
  };

  const handleLockValve = () => {
    if (phase !== 'playing') return;
    if (pressurePct < 75) {
      setPhase('failed');
      setFailReason(
        `Valve Blowback on ${SECTORS[activeIdx]}! You hit LOCK at ${Math.round(
          pressurePct
        )}%—pump repeatedly into the 75%–100% green zone first!`
      );
      spaceAudio.playBreakerClick(false);
      return;
    }

    const next = [...lockedSectors];
    next[activeIdx] = true;
    setLockedSectors(next);
    spaceAudio.playBreakerClick(true);

    if (next.every(Boolean)) {
      setPhase('completed');
      setPressurePct(100);
      onComplete(
        { radiationMsv: -1.5, science: 20 },
        'Pumped & Locked all 3 Water-Wall Radiation Shield Sectors (+16% Shielding)'
      );
    } else {
      const nextIdx = next.findIndex((v) => !v);
      setActiveIdx(nextIdx);
      setPressurePct(26);
      setSectorTimeLeft(14.0);
    }
  };

  // Spacebar support for rapid pumping inside Shield Vault
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        handlePump();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const resetPumpTask = () => {
    setLockedSectors([false, false, false]);
    setActiveIdx(0);
    setPressurePct(28);
    setSectorTimeLeft(14.0);
    setFailReason('');
    setPhase('playing');
    spaceAudio.playBreakerClick(true);
  };

  return (
    <div className="space-y-5">
      {/* Live Solar Flare Deflection Simulator */}
      <div className="p-4 rounded-2xl bg-[#090E1A] border border-purple-500/40 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="flex justify-center">
          <svg viewBox="0 0 200 130" className="w-48 h-32" aria-hidden="true">
            <circle cx="16" cy="65" r="24" fill="#F97316" />
            <circle cx="16" cy="65" r="30" fill="#F59E0B" opacity="0.25" />
            {[30, 55, 80, 100].map((py) => (
              <line
                key={py}
                x1="44"
                y1={py}
                x2={liveShieldPct >= 40 ? '116' : '164'}
                y2={py}
                stroke={donki.unshieldedDoseMsv >= 10 ? '#FB7185' : '#FBBF24'}
                strokeWidth="3"
                strokeDasharray="8 6"
              />
            ))}
            <path
              d="M 134 16 Q 102 65 134 114"
              fill="none"
              stroke={liveShieldPct > 0 ? '#A855F7' : '#475569'}
              strokeWidth={4 + Math.round((liveShieldPct / 100) * 8)}
              strokeLinecap="round"
              opacity={liveShieldPct > 0 ? 0.95 : 0.4}
            />
            <rect
              x="138"
              y="34"
              width="48"
              height="62"
              rx="12"
              fill="#1E293B"
              stroke="#38BDF8"
              strokeWidth="2.5"
            />
            <text
              x="162"
              y="69"
              textAnchor="middle"
              fill="#E9D5FF"
              fontSize="11"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {liveShieldPct}%
            </text>
          </svg>
        </div>

        <div className="md:col-span-2 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-bold text-purple-400">
              NASA DONKI Live Space Weather · {donki.classType}
            </div>
            <span className="text-xs font-mono text-amber-300 tabular-nums">
              Solar Wind: {donki.speedKmPerSec} km/s · Shielded: {liveShieldPct}% Blocked
            </span>
          </div>
          <p className="text-sm text-slate-300">{donki.kidExplanation}</p>
          <p className="text-xs text-purple-300">
            Pump Challenge: Water pressure drains continuously! Mash PUMP H2O rapidly until the
            active tank hits 75%–100%, then hit LOCK VALVE before the 14s storm timer runs out!
          </p>
        </div>
      </div>

      {/* 3 Sector Tank Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SECTORS.map((sector, idx) => {
          const locked = lockedSectors[idx] || isAlreadyDone;
          const isCurrent = phase === 'playing' && activeIdx === idx;
          const pct = locked ? 100 : isCurrent ? Math.round(pressurePct) : 0;
          return (
            <div
              key={sector}
              className={`p-3.5 rounded-2xl border-2 transition-colors space-y-2 ${
                locked
                  ? 'bg-purple-950/60 border-purple-400 text-purple-200'
                  : isCurrent
                  ? 'bg-slate-900 border-amber-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span>{sector}</span>
                <span className="font-mono tabular-nums">{locked ? 'LOCKED' : `${pct}%`}</span>
              </div>
              <div className="relative w-full h-4 rounded-full bg-slate-950 border border-slate-700 overflow-hidden">
                {/* 75-100% Lock Zone marker */}
                <div
                  className="absolute top-0 bottom-0 right-0 bg-emerald-500/25 border-l border-emerald-400"
                  style={{ width: '25%' }}
                />
                <div
                  className={`h-full transition-all duration-75 ${
                    locked
                      ? 'bg-purple-400'
                      : pct >= 75
                      ? 'bg-emerald-400'
                      : 'bg-amber-400'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Intense Pump & Lock Deck */}
      {phase === 'failed' ? (
        <div className="p-5 rounded-2xl bg-rose-950/60 border-2 border-rose-500/70 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-base font-bold text-rose-300">WATER-WALL PRESSURE BLOWBACK!</div>
            <div className="text-xs text-rose-100 mt-1">{failReason}</div>
          </div>
          <button
            type="button"
            onClick={resetPumpTask}
            className="px-5 py-3 rounded-xl bg-purple-400 hover:bg-purple-300 text-slate-950 font-bold text-sm cursor-pointer"
          >
            Restart Shield Pump
          </button>
        </div>
      ) : phase === 'completed' ? (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-400 text-sm font-bold text-emerald-200 flex items-center justify-between">
          <span>🛡️ All 3 Water-Wall Hull Tanks Pressurized &amp; Locked! (-1.5 mSv &amp; +20 Science)</span>
          <span className="font-mono text-xs">3 / 3 SECURED</span>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-slate-900 border-2 border-purple-500/50 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-white">
                Active Tank ({lockedCount + 1}/3): {SECTORS[activeIdx]}
              </div>
              <div className="text-xs text-slate-300">
                Tap PUMP H2O repeatedly (or press Spacebar) to reach 75%+, then press LOCK VALVE!
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-[11px] text-slate-400">PROTON WAVE TIMER</div>
              <div
                className={`text-2xl font-extrabold tabular-nums ${
                  sectorTimeLeft <= 4 ? 'text-rose-400' : 'text-amber-300'
                }`}
              >
                {sectorTimeLeft.toFixed(1)}s
              </div>
            </div>
          </div>

          {/* Big High-Contrast Pressure Gauge */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-purple-300">WATER WALL PRESSURE</span>
              <span
                className={`font-bold tabular-nums ${
                  inLockZone ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {Math.round(pressurePct)}% {inLockZone ? '· ★ LOCK ZONE READY!' : '· NEED 75%+'}
              </span>
            </div>
            <div className="relative w-full h-7 rounded-xl bg-slate-950 border-2 border-slate-700 overflow-hidden">
              <div
                className="absolute top-0 bottom-0 right-0 bg-emerald-500/30 border-l-2 border-emerald-400 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-300"
                style={{ width: '25%' }}
              >
                LOCK 75%+
              </div>
              <div
                className={`h-full transition-all duration-75 ${
                  inLockZone ? 'bg-emerald-400' : 'bg-purple-500'
                }`}
                style={{ width: `${pressurePct}%` }}
              />
            </div>
          </div>

          {/* Dual Action Buttons: Repeated Pump + Valve Lock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handlePump}
              className={`py-4 px-5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-display font-extrabold text-base tracking-wide cursor-pointer transition-transform ${
                pumpPulse ? 'scale-95 bg-purple-300' : 'active:scale-95'
              }`}
            >
              💧 PUMP H2O! (+16%) [Space]
            </button>
            <button
              type="button"
              onClick={handleLockValve}
              className={`py-4 px-5 rounded-xl font-display font-extrabold text-base tracking-wide cursor-pointer transition-all ${
                inLockZone
                  ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-lg'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
              }`}
            >
              🔒 LOCK {SECTORS[activeIdx].split(' ')[0].toUpperCase()} VALVE!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
