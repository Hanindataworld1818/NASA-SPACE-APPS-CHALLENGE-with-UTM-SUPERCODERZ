import React, { useEffect, useState } from 'react';
import { isLedSpectrumOptimal } from '../../game/rules';
import { spaceAudio } from '../../game/audio';

const CROPS = [
  { name: 'Mizuna Lettuce', emoji: '🥬', desc: 'Fast-growing space salad' },
  { name: 'Dwarf Wheat', emoji: '🌾', desc: 'Crunchy astronaut bread grain' },
  { name: 'Astro Radish', emoji: '🌱', desc: 'NASA ISS crisp red sprout' },
] as const;

interface BioDomeFarmGameProps {
  isAlreadyDone: boolean;
  onComplete: (
    deltas: { food?: number; oxygen?: number; science?: number },
    logNote: string
  ) => void;
}

export const BioDomeFarmGame: React.FC<BioDomeFarmGameProps> = ({
  isAlreadyDone,
  onComplete,
}) => {
  const [stage, setStage] = useState<'plant' | 'grow' | 'harvest' | 'failed' | 'completed'>(
    isAlreadyDone ? 'completed' : 'plant'
  );
  const [seedsPlanted, setSeedsPlanted] = useState<boolean[]>(
    isAlreadyDone ? [true, true, true] : [false, false, false]
  );
  const [ledSpectrum, setLedSpectrum] = useState<number>(76);
  const [moisture, setMoisture] = useState<number>(58);
  const [growthPct, setGrowthPct] = useState<number>(isAlreadyDone ? 100 : 0);
  const [lightStressSec, setLightStressSec] = useState<number>(0);
  const [podsHarvested, setPodsHarvested] = useState<boolean[]>(
    isAlreadyDone ? [true, true, true] : [false, false, false]
  );
  const [failReason, setFailReason] = useState<string>('');

  const isOptimalLed = isLedSpectrumOptimal(ledSpectrum);
  const isOptimalMoisture = moisture >= 28 && moisture <= 85;
  const plantedCount = seedsPlanted.filter(Boolean).length;
  const harvestedCount = isAlreadyDone ? 3 : podsHarvested.filter(Boolean).length;

  const growParamsRef = React.useRef({ ledSpectrum, moisture });
  useEffect(() => {
    growParamsRef.current = { ledSpectrum, moisture };
  }, [ledSpectrum, moisture]);

  // Real-time Hydroponic Growth & Evaporation Loop (pure state updaters, stable 150ms interval)
  useEffect(() => {
    if (stage !== 'grow') return;
    const id = window.setInterval(() => {
      const { ledSpectrum: curLed, moisture: curMoisture } = growParamsRef.current;
      setMoisture((prev) => Math.max(0, Number((prev - 1.1).toFixed(1))));
      if (!isLedSpectrumOptimal(curLed)) {
        setLightStressSec((prev) => Number((prev + 0.15).toFixed(2)));
      } else {
        setLightStressSec(0);
      }
      if (isLedSpectrumOptimal(curLed) && curMoisture >= 28 && curMoisture <= 85) {
        setGrowthPct((prev) => Math.min(100, Number((prev + 3.2).toFixed(1))));
      }
    }, 150);
    return () => window.clearInterval(id);
  }, [stage]);

  // Cleanly evaluate fail/harvest thresholds outside state updaters
  useEffect(() => {
    if (stage !== 'grow') return;
    if (moisture <= 0) {
      setStage('failed');
      setFailReason(
        'Crop Wilted! Moisture evaporated to 0% before harvest. Keep tapping Mist Water!'
      );
      spaceAudio.playBreakerClick(false);
    } else if (moisture >= 100) {
      setStage('failed');
      setFailReason('Root Rot Flood! Over-watering hit 100% and drowned the roots.');
      spaceAudio.playBreakerClick(false);
    } else if (lightStressSec >= 3.2) {
      setStage('failed');
      setFailReason(
        'LED Spectrum Stress! Holding Red/Blue wavelength outside 65%–88% scorched the leaves.'
      );
      spaceAudio.playBreakerClick(false);
    } else if (growthPct >= 100) {
      setStage('harvest');
      spaceAudio.playBreakerClick(true);
    }
  }, [stage, moisture, lightStressSec, growthPct]);

  const handlePlantSeed = (idx: number) => {
    if (stage !== 'plant' || seedsPlanted[idx]) return;
    const next = [...seedsPlanted];
    next[idx] = true;
    setSeedsPlanted(next);
    spaceAudio.playBreakerClick(true);
    if (next.every(Boolean)) {
      setStage('grow');
      setGrowthPct(5);
      setMoisture(58);
      setLightStressSec(0);
    }
  };

  const handleMistWater = () => {
    if (stage !== 'grow') return;
    spaceAudio.playBreakerClick(true);
    setMoisture((prev) => Math.min(100, Math.round(prev + 18)));
  };

  const handleHarvestPod = (idx: number) => {
    if (stage !== 'harvest' || podsHarvested[idx] || isAlreadyDone) return;
    const next = [...podsHarvested];
    next[idx] = true;
    setPodsHarvested(next);
    spaceAudio.playBreakerClick(true);
    if (next.every(Boolean)) {
      setStage('completed');
      onComplete(
        { food: 9, oxygen: 4, science: 20 },
        'Planted, Hydrated, and Harvested NASA OSDR-379 Crops (+9% Food, +4% O2)'
      );
    }
  };

  const resetBioDome = () => {
    setSeedsPlanted([false, false, false]);
    setPodsHarvested([false, false, false]);
    setLedSpectrum(76);
    setMoisture(58);
    setGrowthPct(0);
    setLightStressSec(0);
    setFailReason('');
    setStage('plant');
    spaceAudio.playBreakerClick(true);
  };

  return (
    <div className="space-y-5">
      {/* Live Grow-Chamber Visualizer */}
      <div className="p-4 rounded-2xl bg-[#090E1A] border border-emerald-500/40 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="flex justify-center">
          <svg viewBox="0 0 180 140" className="w-44 h-36" aria-hidden="true">
            <rect
              x="14"
              y="12"
              width="152"
              height="116"
              rx="16"
              fill="#0F172A"
              stroke={stage === 'failed' ? '#FB7185' : '#10B981'}
              strokeWidth="2.5"
            />
            <polygon
              points="32,26 148,26 160,114 20,114"
              fill={`rgb(${Math.round(140 + ledSpectrum * 1.1)}, 60, ${Math.round(
                255 - ledSpectrum * 1.4
              )})`}
              opacity="0.28"
            />
            <rect
              x="30"
              y="20"
              width="120"
              height="8"
              rx="4"
              fill={`rgb(${Math.round(140 + ledSpectrum * 1.1)}, 70, ${Math.round(
                255 - ledSpectrum * 1.4
              )})`}
            />
            {/* Dynamic Moisture Tray height */}
            <rect
              x="26"
              y={118 - Math.round((moisture / 100) * 20)}
              width="128"
              height={Math.max(4, Math.round((moisture / 100) * 20))}
              rx="5"
              fill="#0284C7"
              opacity="0.7"
            />
            {/* Animated Sprouts scaling with growthPct */}
            {[52, 90, 128].map((px, i) => {
              const planted = seedsPlanted[i] || isAlreadyDone;
              if (!planted) {
                return (
                  <rect
                    key={px}
                    x={px - 10}
                    y="102"
                    width="20"
                    height="6"
                    rx="3"
                    fill="#334155"
                  />
                );
              }
              const stemH = 10 + Math.round((growthPct / 100) * 34);
              const leafScale = 0.5 + (growthPct / 100) * 0.7;
              return (
                <g key={px} transform={`translate(${px}, 102)`}>
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2={-stemH}
                    stroke={stage === 'failed' ? '#B45309' : '#34D399'}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <ellipse
                    cx={-9 * leafScale}
                    cy={-stemH * 0.7}
                    rx={10 * leafScale}
                    ry={6 * leafScale}
                    fill={stage === 'failed' ? '#D97706' : '#10B981'}
                  />
                  <ellipse
                    cx={9 * leafScale}
                    cy={-stemH * 0.8}
                    rx={10 * leafScale}
                    ry={6 * leafScale}
                    fill={stage === 'failed' ? '#D97706' : '#34D399'}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="md:col-span-2 space-y-3">
          <div className="text-sm font-bold text-emerald-400">
            NASA OSDR (OSD-379): Full Plant → Balance Water &amp; LEDs → Harvest Cycle!
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            {stage === 'plant' &&
              `Step 1: Plant all 3 empty soil trays below (${plantedCount}/3 planted).`}
            {stage === 'grow' &&
              'Step 2: Keep Red/Blue LED inside 65%–88% AND tap Mist Water to stay inside 28%–85% moisture until growth hits 100%!'}
            {stage === 'harvest' &&
              'Step 3: Crops are ripe! Click all 3 glowing crop pods to harvest fresh food & O2!'}
            {stage === 'completed' &&
              'Harvest complete! Bio-Dome produced +9% Food, +4% O2, and +20 Science!'}
            {stage === 'failed' && failReason}
          </p>

          {/* LED Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="led-spectrum-slider" className="text-xs font-bold text-white">
                Grow LED Tuner ({ledSpectrum}% Red / {100 - ledSpectrum}% Blue)
              </label>
              <span
                className={`text-xs font-mono font-bold ${
                  isOptimalLed ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isOptimalLed
                  ? '★ OPTIMAL 65%–88%'
                  : `STRESS! (${Math.max(0, 3.2 - lightStressSec).toFixed(1)}s)`}
              </span>
            </div>
            <input
              id="led-spectrum-slider"
              type="range"
              min={40}
              max={100}
              value={ledSpectrum}
              onChange={(e) => setLedSpectrum(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Hydration + Growth Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-sky-300">HYDRATION (SAFE 28–85%)</span>
                <span
                  className={`font-bold tabular-nums ${
                    isOptimalMoisture ? 'text-sky-300' : 'text-rose-400'
                  }`}
                >
                  {Math.round(moisture)}%
                </span>
              </div>
              <div className="relative w-full h-3.5 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    isOptimalMoisture ? 'bg-sky-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, moisture)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-emerald-300">CROP BLOOM</span>
                <span className="font-bold text-emerald-300 tabular-nums">
                  {Math.round(growthPct)}%
                </span>
              </div>
              <div className="w-full h-3.5 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-150"
                  style={{ width: `${Math.round(growthPct)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Interactive Deck */}
      {stage === 'failed' ? (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/70 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-rose-300">CROP CYCLE FAILED!</div>
            <div className="text-xs text-rose-100 mt-0.5">{failReason}</div>
          </div>
          <button
            type="button"
            onClick={resetBioDome}
            className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-sm cursor-pointer"
          >
            Replant &amp; Restart Bio-Dome
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-bold text-white">
              {stage === 'plant' && 'Step 1: Click Each Pod to Plant Space Seeds'}
              {stage === 'grow' && 'Step 2: Mist Water & Hold LED Sweet Spot Until 100% Bloom!'}
              {(stage === 'harvest' || stage === 'completed') &&
                'Step 3: Click All 3 Ripe Crops to Harvest (+9% Food, +4% O2, +20 Science)'}
            </div>
            {stage === 'grow' && (
              <button
                type="button"
                onClick={handleMistWater}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm cursor-pointer active:scale-95 transition-transform"
              >
                💧 Mist Water (+18%)
              </button>
            )}
            {(stage === 'harvest' || stage === 'completed') && (
              <span className="text-xs font-mono text-emerald-300 tabular-nums">
                BASKET: {harvestedCount} / 3 PICKED
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CROPS.map((pod, idx) => {
              const planted = seedsPlanted[idx] || isAlreadyDone;
              const harvested = podsHarvested[idx] || isAlreadyDone;
              const disabled =
                (stage === 'plant' && planted) ||
                stage === 'grow' ||
                (stage === 'harvest' && harvested) ||
                stage === 'completed';

              return (
                <button
                  key={pod.name}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (stage === 'plant') handlePlantSeed(idx);
                    else if (stage === 'harvest') handleHarvestPod(idx);
                  }}
                  className={`p-4 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    harvested
                      ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200'
                      : stage === 'harvest'
                      ? 'bg-emerald-900/50 hover:bg-emerald-800/60 border-emerald-400 text-white hover:scale-[1.03]'
                      : planted
                      ? 'bg-slate-950 border-sky-500/50 text-sky-200'
                      : 'bg-slate-950 hover:bg-slate-800 border-emerald-500/60 text-white hover:scale-[1.03]'
                  }`}
                >
                  <span className="text-3xl">
                    {harvested ? '🧺' : !planted ? '🕳️' : stage === 'grow' ? '🌿' : pod.emoji}
                  </span>
                  <span className="font-bold text-sm">
                    {harvested
                      ? `${pod.name} Harvested!`
                      : !planted
                      ? `Plant ${pod.name}`
                      : stage === 'grow'
                      ? `Growing ${pod.name}...`
                      : `Harvest ${pod.name}`}
                  </span>
                  <span className="text-[11px] text-slate-400">{pod.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
