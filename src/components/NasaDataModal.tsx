import React, { useEffect, useState } from 'react';
import {
  CURATED_NASA_DONKI_SCHEDULE,
  MISSION_SITES,
  NASA_OSDR_STUDIES,
  fetchLiveNasaDonkiFlares,
} from '../game/nasaData';
import { GameStateSnapshot, calculateSolOutcome } from '../game/rules';

interface NasaDataModalProps {
  gameState: GameStateSnapshot;
  onClose: () => void;
}

export const NasaDataModal: React.FC<NasaDataModalProps> = ({ gameState, onClose }) => {
  const [activeTab, setActiveTab] = useState<'donki' | 'osdr' | 'team'>('donki');
  const [liveFeed, setLiveFeed] = useState<{
    status: 'live' | 'archive' | 'loading';
    events: Array<{
      flrID: string;
      beginTime: string;
      peakTime: string;
      classType: string;
      sourceLocation: string;
      link: string;
    }>;
  }>({ status: 'loading', events: [] });

  useEffect(() => {
    let mounted = true;
    fetchLiveNasaDonkiFlares().then((res) => {
      if (mounted) setLiveFeed(res);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const projection = calculateSolOutcome(gameState);
  const currentSite = MISSION_SITES[gameState.siteId];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 pointer-events-auto"
      role="dialog"
      aria-label="NASA Real Open Data & Visualizations"
    >
      <div className="w-full max-w-4xl rounded-2xl bg-[#0B1120] border-2 border-cyan-500/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#070B14] border-b border-slate-800">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              VERIFIED NASA OPEN DATA VISUALIZER · DONKI · OSDR · ARTEMIS · MEDA
            </div>
            <h2 className="text-2xl font-bold font-display text-white">
              NASA Science & Space Weather Visualizer
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200 cursor-pointer"
          >
            Close [Esc]
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 bg-[#0B1120]">
          <button
            type="button"
            onClick={() => setActiveTab('donki')}
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              activeTab === 'donki'
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            1. NASA DONKI Solar Flare Chart
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('osdr')}
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              activeTab === 'osdr'
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            2. NASA OSDR Biology & Dosimetry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              activeTab === 'team'
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            3. Team UTM SUPERCODERZ & Data Attribution
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-200">
          {activeTab === 'donki' && (
            <div className="space-y-5">
              {/* Interactive Child-Friendly SVG Chart of 7-Sol NASA DONKI Solar Flares vs Shielding */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      7-Sol NASA DONKI Solar Activity & Your Shield Protection Chart
                    </h3>
                    <p className="text-xs text-slate-400">
                      Source: NASA Space Weather Database Of Notifications, Knowledge, Information
                      (DONKI) — Shows Unshielded Flare Dose (Orange) vs Dose After Your Current{' '}
                      {projection.shieldEfficiencyPct}% Water-Wall Shield (Purple).
                    </p>
                  </div>
                  <span className="text-xs font-mono text-cyan-300">
                    Current Shield Power: {gameState.powerAllocation.shield} kW (Blocks{' '}
                    {projection.shieldEfficiencyPct}%)
                  </span>
                </div>

                <svg
                  viewBox="0 0 700 210"
                  className="w-full h-48 bg-[#070B14] rounded-xl border border-slate-800 p-2"
                  role="img"
                  aria-label="7-Sol NASA DONKI Solar Radiation Chart"
                >
                  {/* Horizontal Grid Lines */}
                  {[0, 10, 20, 30].map((val) => {
                    const y = 170 - (val / 30) * 135;
                    return (
                      <g key={val}>
                        <line
                          x1={50}
                          y1={y}
                          x2={670}
                          y2={y}
                          stroke="#1E293B"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={42}
                          y={y + 4}
                          textAnchor="end"
                          fill="#64748B"
                          fontSize="10"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {val}mSv
                        </text>
                      </g>
                    );
                  })}

                  {/* Bars for each Sol */}
                  {CURATED_NASA_DONKI_SCHEDULE.map((ev, i) => {
                    const x = 75 + i * 84;
                    const unshieldedH = Math.max(6, (ev.unshieldedDoseMsv / 30) * 135);
                    const shieldedMsv = Number(
                      (ev.unshieldedDoseMsv * (1 - projection.shieldEfficiencyPct / 100)).toFixed(1)
                    );
                    const shieldedH = Math.max(4, (shieldedMsv / 30) * 135);
                    const isCurrent = ev.sol === gameState.sol;

                    return (
                      <g key={ev.id}>
                        {isCurrent && (
                          <rect
                            x={x - 12}
                            y={16}
                            width={68}
                            height={180}
                            rx={8}
                            fill="rgba(56, 189, 248, 0.1)"
                            stroke="#38BDF8"
                            strokeWidth={1.5}
                          />
                        )}
                        {/* Unshielded Bar */}
                        <rect
                          x={x}
                          y={170 - unshieldedH}
                          width={20}
                          height={unshieldedH}
                          rx={4}
                          fill="#F97316"
                        />
                        {/* Shielded Bar */}
                        <rect
                          x={x + 24}
                          y={170 - shieldedH}
                          width={20}
                          height={shieldedH}
                          rx={4}
                          fill="#A855F7"
                        />
                        <text
                          x={x + 22}
                          y={188}
                          textAnchor="middle"
                          fill={isCurrent ? '#38BDF8' : '#CBD5E1'}
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          Sol {ev.sol}
                        </text>
                        <text
                          x={x + 22}
                          y={201}
                          textAnchor="middle"
                          fill="#94A3B8"
                          fontSize="9"
                          fontFamily="Plus Jakarta Sans, sans-serif"
                        >
                          {ev.classType.split(' ')[0]}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <strong className="text-cyan-400">How This Impacts Your Game Decisions:</strong>{' '}
                  On <span className="font-mono text-white">Sol 2 (M8.8)</span>,{' '}
                  <span className="font-mono text-white">Sol 4 (X8.7 Super Flare)</span>, and{' '}
                  <span className="font-mono text-white">Sol 6 (Fast CME)</span>, orange unshielded
                  radiation bars jump high! Moving 2–3 kW of power into the{' '}
                  <strong className="text-purple-400">Radiation Shield Vault</strong> shrinks the
                  purple bar so your crew stays safe, even though it leaves less electricity for
                  growing food that night.
                </div>
              </div>

              {/* Live / Archived NASA DONKI Telemetry Table */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold text-white">
                    NASA DONKI Solar Flare Telemetry Feed (
                    {liveFeed.status === 'live'
                      ? 'Connected to Live api.nasa.gov/DONKI/FLR'
                      : 'Verified NASA DONKI Solar Cycle 25 Archive'}
                    )
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Site: {currentSite.name} ({currentSite.baselineRadMsvPerSol} mSv/sol baseline)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {liveFeed.events.slice(0, 4).map((item) => (
                    <div
                      key={item.flrID}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-mono font-bold text-amber-400">
                          {item.classType} · {item.sourceLocation}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">Peak: {item.peakTime}</div>
                      </div>
                      <span className="text-xs font-mono text-cyan-400">{item.flrID}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'osdr' && (
            <div className="space-y-4">
              {NASA_OSDR_STUDIES.map((study) => (
                <div
                  key={study.accessionId}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono text-emerald-400">
                      {study.accessionId} · {study.mission}
                    </span>
                    <span className="text-xs font-mono text-cyan-300">
                      In-Game System: {study.gameplayLink}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{study.title}</h3>
                  <p className="text-xs text-slate-300">
                    <strong className="text-white">NASA Research Finding:</strong>{' '}
                    {study.keyFinding}
                  </p>
                  <p className="text-xs text-emerald-300">
                    <strong>Kid Lesson in AstroBase:</strong> {study.kidLesson}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="text-xs font-mono text-cyan-400">
                  2026 NASA SPACE APPS CHALLENGE · JUNIOR ASTRONAUT MISSION TRAINER
                </div>
                <h3 className="text-xl font-bold font-display text-white">
                  Team: UTM SUPERCODERZ
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {['HAN YAO HUI', 'LEE JUN FENG', 'TAN YI KUN', 'GOH ZHI XIN'].map((member) => (
                    <div
                      key={member}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center"
                    >
                      <div className="text-xs font-mono text-amber-400">CREW ENGINEER</div>
                      <div className="text-sm font-bold text-white mt-0.5">{member}</div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-300 pt-2">
                  Built to translate authentic NASA mission planning trade-offs—balancing{' '}
                  <strong>ECLSS Life Support</strong>, <strong>DONKI Radiation Shielding</strong>,{' '}
                  <strong>Kilopower & Solar Grids</strong>, and{' '}
                  <strong>OSDR-379 Space Hydroponics</strong>—into an intuitive, action-packed
                  Among-Us-inspired space station experience for learners ages 7–12.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
