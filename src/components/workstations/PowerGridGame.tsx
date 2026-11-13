import React, { useEffect, useState } from 'react';
import {
  GameStateSnapshot,
  PowerAllocation,
  calculateSolOutcome,
  getTotalAllocatedPower,
  isPhaseInGreenZone,
} from '../../game/rules';
import { spaceAudio } from '../../game/audio';

const WIRE_LEFT = [
  { id: 'amber', label: 'Solar Bus', color: '#F59E0B' },
  { id: 'cyan', label: 'ECLSS Air', color: '#38BDF8' },
  { id: 'violet', label: 'Shield Coil', color: '#A855F7' },
] as const;

const WIRE_RIGHT = [
  { id: 'violet', label: 'Vault Ring', color: '#A855F7', row: 0 },
  { id: 'amber', label: 'Core Grid', color: '#F59E0B', row: 1 },
  { id: 'cyan', label: 'O2 Pump', color: '#38BDF8', row: 2 },
] as const;

interface PowerGridGameProps {
  gameState: GameStateSnapshot;
  isAlreadyDone: boolean;
  onUpdatePower: (newAlloc: PowerAllocation) => void;
  onComplete: (
    deltas: { science?: number; bonusPowerKw?: number },
    logNote: string
  ) => void;
}

export const PowerGridGame: React.FC<PowerGridGameProps> = ({
  gameState,
  isAlreadyDone,
  onUpdatePower,
  onComplete,
}) => {
  const projection = calculateSolOutcome(gameState);
  const totalUsedKw = getTotalAllocatedPower(gameState.powerAllocation);
  const spareKw = gameState.availablePowerKw - totalUsedKw;

  const [selectedLeftWire, setSelectedLeftWire] = useState<string | null>(null);
  const [matchedWires, setMatchedWires] = useState<Record<string, boolean>>({
    amber: false,
    cyan: false,
    violet: false,
  });
  const [wireErrors, setWireErrors] = useState<number>(0);
  const [syncErrors, setSyncErrors] = useState<number>(0);
  const [phasePct, setPhasePct] = useState<number>(30);
  const [phaseSynced, setPhaseSynced] = useState<boolean>(false);
  const [taskPhase, setTaskPhase] = useState<'playing' | 'failed' | 'completed'>(
    isAlreadyDone ? 'completed' : 'playing'
  );
  const [failReason, setFailReason] = useState<string>('');
  const [wireHint, setWireHint] = useState<string>(
    'Step 1: Match all 3 glowing power wires (max 3 mistakes). Step 2: Hit SYNC TURBINE in the green zone!'
  );

  const allWiresMatched = isAlreadyDone || Object.values(matchedWires).every(Boolean);

  // Smooth oscillating turbine phase gauge once wires are connected
  useEffect(() => {
    if (taskPhase !== 'playing' || !allWiresMatched || phaseSynced) return;
    let frameId = 0;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const wave = 50 + 48 * Math.sin(elapsed * 2.5);
      setPhasePct(Math.round(wave));
      frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [taskPhase, allWiresMatched, phaseSynced]);

  const adjustPower = (key: keyof PowerAllocation, delta: number) => {
    const cur = gameState.powerAllocation[key];
    const nextVal = cur + delta;
    if (nextVal < 0 || nextVal > 3) return;
    if (delta > 0 && spareKw <= 0) return;
    spaceAudio.playBreakerClick(delta > 0);
    onUpdatePower({
      ...gameState.powerAllocation,
      [key]: nextVal,
    });
  };

  const resetTask = () => {
    setSelectedLeftWire(null);
    setMatchedWires({ amber: false, cyan: false, violet: false });
    setWireErrors(0);
    setSyncErrors(0);
    setPhasePct(30);
    setPhaseSynced(false);
    setFailReason('');
    setTaskPhase('playing');
    setWireHint(
      'Reactor reset! Step 1: Match all 3 glowing wires, then hit SYNC TURBINE inside 68%–96%!'
    );
    spaceAudio.playBreakerClick(true);
  };

  const handleRightSocketClick = (socketColorId: string) => {
    if (taskPhase !== 'playing' || isAlreadyDone || matchedWires[socketColorId]) return;
    if (!selectedLeftWire) {
      setWireHint('Pick a plug on the LEFT side first, then tap the matching color socket on the right!');
      spaceAudio.playBreakerClick(false);
      return;
    }
    if (selectedLeftWire === socketColorId) {
      const next = { ...matchedWires, [socketColorId]: true };
      setMatchedWires(next);
      setSelectedLeftWire(null);
      spaceAudio.playBreakerClick(true);
      if (Object.values(next).every(Boolean)) {
        setWireHint('Conduits linked! Now watch the Turbine Phase needle and press SYNC in the green zone (68%–96%)!');
      } else {
        setWireHint('Clean conduit lock! Connect the remaining glowing wires.');
      }
    } else {
      spaceAudio.playBreakerClick(false);
      const nextErr = wireErrors + 1;
      setWireErrors(nextErr);
      setSelectedLeftWire(null);
      if (nextErr >= 3) {
        setTaskPhase('failed');
        setFailReason(
          'Safety Breaker Tripped! 3 crossed-wire short circuits forced a reactor reset.'
        );
      } else {
        setWireHint(
          `Short circuit warning (${nextErr}/3)! Match Amber→Amber, Cyan→Cyan, Violet→Violet.`
        );
      }
    }
  };

  const handleSyncTurbine = () => {
    if (taskPhase !== 'playing' || !allWiresMatched || phaseSynced || isAlreadyDone) return;
    if (isPhaseInGreenZone(phasePct)) {
      setPhaseSynced(true);
      setTaskPhase('completed');
      spaceAudio.playBreakerClick(true);
      setWireHint('Turbine locked at peak phase! Reactor delivering +1 kW Bonus Power!');
      onComplete(
        { bonusPowerKw: 1, science: 20 },
        'Synchronized Reactor Conduits & Turbine Phase (+1 kW Bonus Power)'
      );
    } else {
      spaceAudio.playBreakerClick(false);
      const nextSyncErr = syncErrors + 1;
      setSyncErrors(nextSyncErr);
      if (nextSyncErr >= 3) {
        setTaskPhase('failed');
        setFailReason(
          `Turbine Phase Overload! Missed the green sync band (${phasePct}%) 3 times—safety shutoff engaged.`
        );
      } else {
        setWireHint(
          `Missed green zone at ${phasePct}% (${nextSyncErr}/3 strikes)! Wait until the needle enters 68%–96%.`
        );
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Interactive Reactor Core Visual + Trade-off Banner */}
      <div className="p-4 rounded-2xl bg-[#090E1A] border border-amber-500/40 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="flex items-center gap-4 md:col-span-2">
          <svg viewBox="0 0 110 110" className="w-24 h-24 shrink-0" aria-hidden="true">
            <circle cx="55" cy="55" r="46" fill="#0F172A" stroke="#334155" strokeWidth="4" />
            <circle
              cx="55"
              cy="55"
              r="36"
              fill="none"
              stroke={taskPhase === 'failed' ? '#FB7185' : '#F59E0B'}
              strokeWidth="6"
              strokeDasharray="36 16"
              transform={`rotate(${Math.round(phasePct * 3.6)} 55 55)`}
            />
            <circle cx="55" cy="55" r="22" fill="#F59E0B" opacity="0.2" />
            <path d="M58 34L44 58h11l-2 18 15-24H57l1-18z" fill="#FBBF24" />
          </svg>
          <div>
            <div className="text-sm font-bold text-amber-400">
              Kilopower Reactor Rule: Every Watt Has a Trade-Off!
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Split your{' '}
              <span className="font-mono font-bold text-white">
                {gameState.availablePowerKw} kW
              </span>{' '}
              electricity across the base! Giving more power to Shields keeps radiation low, while
              giving power to Bio-Dome grows extra food &amp; bonus air.
            </p>
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center font-mono">
          <div className="text-[11px] text-slate-400">SPARE GRID POWER</div>
          <div className="text-3xl font-extrabold text-amber-400 tabular-nums mt-0.5">
            {spareKw} kW
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totalUsedKw}/{gameState.availablePowerKw} kW Assigned
          </div>
        </div>
      </div>

      {/* 4 Tactile Breaker Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(
          [
            {
              key: 'lifesupport',
              label: 'O2 Electrolyzer (Air)',
              effect: '+10% Oxygen per kW',
              color: 'text-sky-400',
              barColor: 'bg-sky-400',
            },
            {
              key: 'shield',
              label: 'Water-Wall Shield',
              effect: 'Blocks 28% Flare per kW',
              color: 'text-purple-400',
              barColor: 'bg-purple-400',
            },
            {
              key: 'hydroponics',
              label: 'Bio-Dome Grow LEDs',
              effect: '+9% Food & +4% O2 bonus',
              color: 'text-emerald-400',
              barColor: 'bg-emerald-400',
            },
            {
              key: 'comms',
              label: 'Comms & Science Dish',
              effect: '+15 Science pts per kW',
              color: 'text-pink-400',
              barColor: 'bg-pink-400',
            },
          ] as const
        ).map((item) => {
          const val = gameState.powerAllocation[item.key];
          return (
            <div
              key={item.key}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3"
            >
              <div>
                <div className={`font-bold text-sm ${item.color}`}>{item.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{item.effect}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  {[0, 1, 2].map((pip) => (
                    <span
                      key={pip}
                      className={`w-7 h-3 rounded-sm transition-colors ${
                        pip < val ? item.barColor : 'bg-slate-800 border border-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <button
                  type="button"
                  aria-label={`Decrease ${item.label} power`}
                  onClick={() => adjustPower(item.key, -1)}
                  disabled={val <= 0}
                  className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-lg cursor-pointer"
                >
                  -
                </button>
                <span className="w-10 text-center text-lg font-bold tabular-nums">{val}kW</span>
                <button
                  type="button"
                  aria-label={`Increase ${item.label} power`}
                  onClick={() => adjustPower(item.key, 1)}
                  disabled={val >= 3 || spareKw <= 0}
                  className="w-10 h-10 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-lg cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overnight Projection Preview */}
      <div className="p-3.5 rounded-xl bg-[#090E1A] border border-slate-800 grid grid-cols-3 gap-4 text-center font-mono">
        <div>
          <div className="text-[11px] text-slate-400">NEXT SOL OXYGEN</div>
          <div
            className={`text-lg font-bold tabular-nums ${
              projection.oxygenDelta >= 0 ? 'text-sky-400' : 'text-amber-400'
            }`}
          >
            {projection.nextOxygen}% ({projection.oxygenDelta >= 0 ? '+' : ''}
            {projection.oxygenDelta}%)
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">NEXT SOL FOOD</div>
          <div
            className={`text-lg font-bold tabular-nums ${
              projection.foodDelta >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {projection.nextFood}% ({projection.foodDelta >= 0 ? '+' : ''}
            {projection.foodDelta}%)
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">SOLAR RADIATION DOSE</div>
          <div
            className={`text-lg font-bold tabular-nums ${
              projection.radiationDeltaMsv <= 5 ? 'text-purple-400' : 'text-rose-400'
            }`}
          >
            +{projection.radiationDeltaMsv} mSv ({projection.shieldEfficiencyPct}% Blocked)
          </div>
        </div>
      </div>

      {/* 2-Stage Reactor Wire & Turbine Sync Mini-Game */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-white">
              Reactor Calibration Task: Wire Conduits + Sync Turbine (+1 kW Bonus Power &amp; +20 Science)
            </div>
            <div className="text-xs text-amber-300 mt-0.5">{wireHint}</div>
          </div>
          <div className="text-xs font-mono text-slate-300 tabular-nums">
            Short Strikes: {wireErrors}/3 · Sync Strikes: {syncErrors}/3
          </div>
        </div>

        {taskPhase === 'failed' ? (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/70 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-rose-300">REACTOR BREAKER TRIPPED!</div>
              <div className="text-xs text-rose-100 mt-0.5">{failReason}</div>
            </div>
            <button
              type="button"
              onClick={resetTask}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm cursor-pointer"
            >
              Restart Reactor Task
            </button>
          </div>
        ) : (
          <>
            <div className="relative grid grid-cols-3 gap-2 items-center bg-[#090E1A] p-4 rounded-xl border border-slate-800">
              {/* Left Wire Terminals */}
              <div className="space-y-3 z-10">
                {WIRE_LEFT.map((w) => {
                  const connected = isAlreadyDone || matchedWires[w.id];
                  const selected = selectedLeftWire === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      disabled={connected}
                      onClick={() => {
                        setSelectedLeftWire(w.id);
                        setWireHint(`Selected ${w.label}! Tap the matching color socket on the right.`);
                        spaceAudio.playBreakerClick(true);
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl border-2 text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        connected
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                          : selected
                          ? 'bg-slate-800 border-white scale-105 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      <span>{w.label}</span>
                      <span
                        className="w-4 h-4 rounded-full border border-slate-950"
                        style={{ backgroundColor: w.color }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Center Glowing SVG Bezier Wires */}
              <svg viewBox="0 0 200 156" className="w-full h-40" aria-hidden="true">
                {[26, 78, 130].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="200"
                    y2={y}
                    stroke="#1E293B"
                    strokeWidth="2"
                    strokeDasharray="4 6"
                  />
                ))}
                {(isAlreadyDone || matchedWires.amber) && (
                  <path
                    d="M 4 26 C 95 26, 105 78, 196 78"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                )}
                {(isAlreadyDone || matchedWires.cyan) && (
                  <path
                    d="M 4 78 C 95 78, 105 130, 196 130"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                )}
                {(isAlreadyDone || matchedWires.violet) && (
                  <path
                    d="M 4 130 C 95 130, 105 26, 196 26"
                    fill="none"
                    stroke="#A855F7"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                )}
              </svg>

              {/* Right Color Sockets */}
              <div className="space-y-3 z-10">
                {WIRE_RIGHT.map((s) => {
                  const connected = isAlreadyDone || matchedWires[s.id];
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={connected}
                      onClick={() => handleRightSocketClick(s.id)}
                      className={`w-full py-2.5 px-3 rounded-xl border-2 text-right text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        connected
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-slate-950"
                        style={{ backgroundColor: s.color }}
                      />
                      <span>{connected ? `⚡ ${s.label}` : s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Live Oscillating Turbine Phase-Sync Meter */}
            <div className="p-3.5 rounded-xl bg-[#090E1A] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1 min-w-[220px] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">
                    STEP 2 · TURBINE PHASE SYNC ({allWiresMatched ? 'ACTIVE' : 'CONNECT WIRES FIRST'})
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      phaseSynced || isAlreadyDone
                        ? 'text-emerald-400'
                        : isPhaseInGreenZone(phasePct)
                        ? 'text-emerald-400'
                        : 'text-amber-300'
                    }`}
                  >
                    {phaseSynced || isAlreadyDone ? 'LOCKED 100%' : `${phasePct}%`}
                  </span>
                </div>
                <div className="relative w-full h-5 rounded-full bg-slate-950 border border-slate-700 overflow-hidden">
                  {/* Green Target Sweet Spot 68% - 96% */}
                  <div
                    className="absolute top-0 bottom-0 bg-emerald-500/35 border-x border-emerald-400"
                    style={{ left: '68%', width: '28%' }}
                  />
                  {/* Moving Needle */}
                  <div
                    className={`absolute top-0 bottom-0 w-2 rounded-full ${
                      phaseSynced || isAlreadyDone
                        ? 'bg-emerald-400'
                        : isPhaseInGreenZone(phasePct)
                        ? 'bg-emerald-300'
                        : 'bg-amber-400'
                    }`}
                    style={{ left: `calc(${phaseSynced || isAlreadyDone ? 82 : phasePct}% - 4px)` }}
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={!allWiresMatched || phaseSynced || isAlreadyDone}
                onClick={handleSyncTurbine}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold text-sm cursor-pointer whitespace-nowrap"
              >
                {phaseSynced || isAlreadyDone ? '⚡ Turbine Synced!' : '⚡ SYNC TURBINE'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
