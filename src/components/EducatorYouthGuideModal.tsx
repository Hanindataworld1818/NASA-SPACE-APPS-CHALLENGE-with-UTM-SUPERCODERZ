import React, { useState } from 'react';
import {
  ASTRONAUT_DAILY_SCHEDULE,
  EDUCATOR_CLASSROOM_PROMPTS,
  STATION_MASTER_GUIDES,
  computeEducatorTradeoffPreview,
} from '../game/educatorGuideData';
import { CREW_PROFILES } from '../game/crewAndCamera';
import { RoomId } from '../game/rules';

interface EducatorYouthGuideModalProps {
  isPlaying: boolean;
  onClose: () => void;
  onOpenRoomPractice?: (roomId: RoomId) => void;
}

type GuideTab = 'routine' | 'blueprint' | 'educator';

export const EducatorYouthGuideModal: React.FC<EducatorYouthGuideModalProps> = ({
  isPlaying,
  onClose,
  onOpenRoomPractice,
}) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('routine');
  const [phaseIdx, setPhaseIdx] = useState<number>(0);
  const [selectedRoomId, setSelectedRoomId] = useState<RoomId>('power');

  // Interactive Educator Trade-Off Sandbox state
  const [flareDose, setFlareDose] = useState<number>(14); // M8.8 default
  const [shieldKw, setShieldKw] = useState<number>(2);
  const [hydroKw, setHydroKw] = useState<number>(2);

  const activePhase = ASTRONAUT_DAILY_SCHEDULE[phaseIdx] || ASTRONAUT_DAILY_SCHEDULE[0];
  const activeStation =
    STATION_MASTER_GUIDES.find((s) => s.roomId === selectedRoomId) || STATION_MASTER_GUIDES[0];
  const simPreview = computeEducatorTradeoffPreview({
    flareDoseMsv: flareDose,
    shieldKw,
    hydroKw,
  });

  // Compute SVG balance beam tilt angle (-18 deg favors radiation danger, +18 deg favors safe shields)
  const beamTiltDeg = Math.max(-16, Math.min(16, (shieldKw - hydroKw) * 6));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/88 pointer-events-auto"
      role="dialog"
      aria-label="Educator & Youth Astronaut Daily Mission Guide"
    >
      <div className="w-full max-w-5xl rounded-2xl bg-[#0B1120] border-2 border-amber-400/60 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#070B14] border-b border-slate-800">
          <div>
            <div className="text-xs font-mono text-amber-400">
              FOR EDUCATORS &amp; JUNIOR ASTRONAUTS (AGES 7–12) · NASA &amp; CSA OFFICIAL CURRICULUM
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
              🎓 Junior Astronaut Daily Mission Academy
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
        <div className="flex flex-wrap items-center gap-2 px-6 pt-3 pb-2 bg-[#0B1120] border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('routine')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'routine'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            1. 24-Hr Daily Routine Clock
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('blueprint')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'blueprint'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            2. Interactive Outpost Blueprint
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('educator')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'educator'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            3. Educator Sandbox &amp; NASA Links
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-200">
          {/* TAB 1: 24-HOUR ASTRONAUT DAILY ROUTINE CLOCK */}
          {activeTab === 'routine' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Interactive Graphical SVG Sol Clock */}
              <div className="lg:col-span-5 p-4 rounded-2xl bg-[#070B14] border border-slate-800 flex flex-col items-center space-y-3">
                <div className="text-xs font-mono text-cyan-400 text-center">
                  CLICK ANY MISSION PHASE ON THE SOL CLOCK
                </div>

                <svg
                  viewBox="0 0 280 280"
                  className="w-64 h-64 select-none"
                  role="img"
                  aria-label="Interactive 6-phase Astronaut Daily Routine Clock"
                >
                  {/* Outer Orbit Ring */}
                  <circle
                    cx="140"
                    cy="140"
                    r="116"
                    fill="#0B1120"
                    stroke="#1E293B"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  {/* Center Sol Badge */}
                  <circle cx="140" cy="140" r="46" fill="#0F172A" stroke="#38BDF8" strokeWidth="2.5" />
                  <text
                    x="140"
                    y="132"
                    textAnchor="middle"
                    fill="#38BDF8"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    SOL TIME
                  </text>
                  <text
                    x="140"
                    y="153"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="17"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {activePhase.timeUtc}
                  </text>

                  {/* 6 Clickable Phase Nodes around Clock */}
                  {ASTRONAUT_DAILY_SCHEDULE.map((p, idx) => {
                    const rad = ((p.clockAngleDeg - 90) * Math.PI) / 180;
                    const nx = 140 + Math.cos(rad) * 95;
                    const ny = 140 + Math.sin(rad) * 95;
                    const isSelected = idx === phaseIdx;
                    return (
                      <g
                        key={p.id}
                        onClick={() => setPhaseIdx(idx)}
                        className="cursor-pointer"
                      >
                        <line
                          x1={140 + Math.cos(rad) * 48}
                          y1={140 + Math.sin(rad) * 48}
                          x2={nx}
                          y2={ny}
                          stroke={isSelected ? p.color : '#334155'}
                          strokeWidth={isSelected ? 4 : 2}
                        />
                        <circle
                          cx={nx}
                          cy={ny}
                          r={isSelected ? 28 : 22}
                          fill={isSelected ? p.color : '#1E293B'}
                          stroke={isSelected ? '#FFFFFF' : p.color}
                          strokeWidth={isSelected ? 3 : 2}
                        />
                        <text
                          x={nx}
                          y={ny + 5}
                          textAnchor="middle"
                          fontSize={isSelected ? '18' : '15'}
                        >
                          {p.icon}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Stepper Pills + Prev/Next */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  {ASTRONAUT_DAILY_SCHEDULE.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPhaseIdx(idx)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-left cursor-pointer border transition-colors ${
                        idx === phaseIdx
                          ? 'bg-slate-800 border-amber-400 text-white'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.icon} {p.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Rich Breakdown of WHEN, WHY, WHICH WAY, HOW */}
              <div className="lg:col-span-7 space-y-3">
                <div
                  className="p-4 rounded-2xl bg-slate-900 border-2 space-y-1"
                  style={{ borderColor: activePhase.color }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold" style={{ color: activePhase.color }}>
                      PHASE {phaseIdx + 1} OF 6 · {activePhase.timeUtc} MISSION CLOCK
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPhaseIdx(
                            (i) =>
                              (i - 1 + ASTRONAUT_DAILY_SCHEDULE.length) %
                              ASTRONAUT_DAILY_SCHEDULE.length
                          )
                        }
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white cursor-pointer"
                      >
                        ← Prev
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPhaseIdx((i) => (i + 1) % ASTRONAUT_DAILY_SCHEDULE.length)
                        }
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold font-display text-white">
                    {activePhase.icon} {activePhase.phaseTitle}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-xs font-mono font-bold text-amber-400">
                      ⏰ WHEN DO ASTRONAUTS DO THIS?
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {activePhase.whenTrigger}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-xs font-mono font-bold text-emerald-400">
                      🎯 PURPOSE &amp; WHY IT MATTERS
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {activePhase.whyImportant}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-xs font-mono font-bold text-purple-400">
                      🧭 WHICH WAY? (THE ENGINEERING CHOICE)
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {activePhase.whichWayChoice}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-xs font-mono font-bold text-cyan-400">
                      🛠️ HOW TO DO IT IN ASTROBASE
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {activePhase.howAstronautsDoIt}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">
                    Official NASA/CSA Source:{' '}
                    <strong className="text-cyan-300">{activePhase.nasaResourceName}</strong>
                  </span>
                  <a
                    href={activePhase.nasaResourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 font-bold"
                  >
                    Open Official Resource ↗
                  </a>
                </div>
              </div>

              {/* Meet Your 4 Astronaut Teammates Story Cards */}
              <div className="lg:col-span-12 pt-2 border-t border-slate-800 space-y-2.5">
                <div className="text-xs font-mono font-bold text-amber-400">
                  👨‍🚀👩‍🚀 MEET YOUR 4 ASTRONAUT TEAMMATES (HAN · FENG · KUN · XIN)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(
                    [
                      { role: 'han', accent: '#EF4444' },
                      { role: 'feng', accent: '#F59E0B' },
                      { role: 'kun', accent: '#A855F7' },
                      { role: 'xin', accent: '#10B981' },
                    ] as const
                  ).map(({ role, accent }) => {
                    const p = CREW_PROFILES[role];
                    return (
                      <div
                        key={role}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5"
                        style={{ borderTopWidth: 3, borderTopColor: accent }}
                      >
                        <div className="text-sm font-bold font-display text-white">
                          {p.displayName}
                        </div>
                        <div className="text-[11px] font-mono font-bold" style={{ color: accent }}>
                          {p.badgeTitle}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{p.storyBio}</p>
                        <p className="text-[11px] text-cyan-300/90 leading-snug">{p.favoriteBond}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE OUTPOST BLUEPRINT (WHICH WAY & HOW) */}
          {activeTab === 'blueprint' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Clickable Outpost Systems Flow SVG Diagram */}
              <div className="lg:col-span-6 p-4 rounded-2xl bg-[#070B14] border border-slate-800 space-y-3">
                <div className="text-xs font-mono text-cyan-400">
                  CLICK ANY STATION ON THE BLUEPRINT TO SEE HOW IT CONNECTS
                </div>

                <svg
                  viewBox="0 0 680 435"
                  className="w-full h-auto rounded-xl bg-[#0B1120] border border-slate-800"
                  role="img"
                  aria-label="Interactive Outpost Engineering Blueprint"
                >
                  {/* Energy & Life-Support Flow Arrows */}
                  <path
                    d="M 165 82 L 195 82 M 325 82 L 355 82 M 485 82 L 515 82 M 95 135 L 95 190 M 95 292 L 95 322 M 260 135 L 260 190 M 425 135 L 425 190 M 585 135 L 585 190 M 165 242 L 195 242 M 325 242 L 355 242 M 485 242 L 515 242"
                    stroke="#334155"
                    strokeWidth="4"
                    strokeDasharray="6 4"
                  />
                  {[
                    { id: 'power' as const, x: 25, y: 30, label: '⚡ POWER GRID', sub: '6 kW Supply' },
                    { id: 'lifesupport' as const, x: 195, y: 30, label: '🫧 O2 BAY', sub: 'ECLSS Air' },
                    { id: 'hydroponics' as const, x: 355, y: 30, label: '🌱 BIO-DOME', sub: 'Crops + O2' },
                    { id: 'foodlab' as const, x: 515, y: 30, label: '🍲 FOOD LAB', sub: 'CSA Kitchen' },
                    { id: 'shield' as const, x: 25, y: 190, label: '🛡️ SHIELD VAULT', sub: 'Water Walls' },
                    { id: 'academy' as const, x: 25, y: 320, label: '🎓 ACADEMY', sub: 'Learn & Quiz' },
                    { id: 'eva' as const, x: 195, y: 190, label: '🚜 EVA AIRLOCK', sub: 'Dust & Rover' },
                    { id: 'comms' as const, x: 355, y: 190, label: '📡 COMMS DECK', sub: 'Earth Uplink' },
                  ].map((box) => {
                    const guide = STATION_MASTER_GUIDES.find((g) => g.roomId === box.id)!;
                    const active = selectedRoomId === box.id;
                    return (
                      <g
                        key={box.id}
                        onClick={() => setSelectedRoomId(box.id)}
                        className="cursor-pointer"
                      >
                        <rect
                          x={box.x}
                          y={box.y}
                          width={140}
                          height={102}
                          rx={14}
                          fill={active ? '#1E293B' : '#0F172A'}
                          stroke={guide.accentColor}
                          strokeWidth={active ? 4 : 2}
                        />
                        <text
                          x={box.x + 70}
                          y={box.y + 44}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="12"
                          fontWeight="bold"
                        >
                          {box.label}
                        </text>
                        <text
                          x={box.x + 70}
                          y={box.y + 66}
                          textAnchor="middle"
                          fill={guide.accentColor}
                          fontSize="11"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {box.sub}
                        </text>
                        <text
                          x={box.x + 70}
                          y={box.y + 88}
                          textAnchor="middle"
                          fill="#94A3B8"
                          fontSize="9"
                        >
                          {active ? '★ SELECTED' : 'Click to inspect'}
                        </text>
                      </g>
                    );
                  })}
                  {/* Crew Mess & Rest Lounge Zone Reference */}
                  <rect
                    x={515}
                    y={190}
                    width={140}
                    height={102}
                    rx={14}
                    fill="#0B1324"
                    stroke="#F472B6"
                    strokeDasharray="5 4"
                    strokeWidth={2}
                  />
                  <text x={585} y={232} textAnchor="middle" fill="#FBCFE8" fontSize="11" fontWeight="bold">
                    🍽️ CREW LOUNGE
                  </text>
                  <text x={585} y={252} textAnchor="middle" fill="#F472B6" fontSize="10" fontFamily="monospace">
                    Eat, Rest &amp; Dance
                  </text>
                  <text x={585} y={274} textAnchor="middle" fill="#94A3B8" fontSize="9">
                    Social Zone
                  </text>
                </svg>

                <div className="flex flex-wrap gap-1.5">
                  {STATION_MASTER_GUIDES.map((g) => (
                    <button
                      key={g.roomId}
                      type="button"
                      onClick={() => setSelectedRoomId(g.roomId)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                        selectedRoomId === g.roomId
                          ? 'bg-slate-800 text-white border-white'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {g.shortName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Station Deep Dive Card */}
              <div className="lg:col-span-6 space-y-3">
                <div
                  className="p-4 rounded-2xl bg-slate-900 border-2 flex flex-wrap items-center justify-between gap-2"
                  style={{ borderColor: activeStation.accentColor }}
                >
                  <div>
                    <div
                      className="text-xs font-mono font-bold"
                      style={{ color: activeStation.accentColor }}
                    >
                      {activeStation.realNasaEquivalent}
                    </div>
                    <h3 className="text-xl font-bold text-white">{activeStation.title}</h3>
                  </div>
                  {isPlaying && onOpenRoomPractice && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenRoomPractice(activeStation.roomId);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      Open {activeStation.shortName} Now →
                    </button>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    🎯 PURPOSE &amp; IMPORTANCE
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200">
                    {activeStation.purposeImportance}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-xs font-mono font-bold text-amber-400">⏰ WHEN TO DO IT</div>
                    <p className="text-xs text-slate-200">{activeStation.whenToDoIt}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-xs font-mono font-bold text-purple-400">
                      🧭 WHICH WAY? (TRADE-OFF)
                    </div>
                    <p className="text-xs text-slate-200">{activeStation.whichWayTradeoff}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="text-xs font-mono font-bold text-cyan-400">
                    🛠️ HOW TO SOLVE IT STEP BY STEP
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-slate-200">
                    {activeStation.howStepByStep.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EDUCATOR TRADE-OFF SANDBOX & OFFICIAL NASA / CSA DIRECTORY */}
          {activeTab === 'educator' && (
            <div className="space-y-5">
              {/* Interactive "What-If" Trade-Off Scale Simulator */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/40 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-cyan-400">
                      INTERACTIVE CLASSROOM LAB · EXPERIMENT WITH MISSION TRADE-OFFS
                    </div>
                    <h3 className="text-base font-bold text-white">
                      ⚖️ Outpost Survival Balance Simulator (No Free Lunch!)
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-lg font-mono text-xs font-bold ${
                      simPreview.safetyVerdict === 'SAFE'
                        ? 'bg-emerald-950 border border-emerald-400 text-emerald-300'
                        : simPreview.safetyVerdict === 'CAUTION'
                        ? 'bg-amber-950 border border-amber-400 text-amber-300'
                        : 'bg-rose-950 border border-rose-400 text-rose-300'
                    }`}
                  >
                    STATUS: {simPreview.safetyVerdict}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  {/* Animated SVG Balance Beam */}
                  <div className="lg:col-span-5 flex justify-center bg-[#070B14] p-3 rounded-xl border border-slate-800">
                    <svg viewBox="0 0 260 150" className="w-60 h-36" aria-hidden="true">
                      <polygon points="130,135 112,145 148,145" fill="#475569" />
                      <line x1="130" y1="65" x2="130" y2="135" stroke="#64748B" strokeWidth="5" />
                      <g transform={`rotate(${beamTiltDeg} 130 65)`}>
                        <line
                          x1="35"
                          y1="65"
                          x2="225"
                          y2="65"
                          stroke="#38BDF8"
                          strokeWidth="6"
                          strokeLinecap="round"
                        />
                        <circle cx="45" cy="46" r="22" fill="#581C87" stroke="#A855F7" strokeWidth="2.5" />
                        <text x="45" y="44" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">
                          SHIELD
                        </text>
                        <text x="45" y="57" textAnchor="middle" fill="#E9D5FF" fontSize="10" fontFamily="monospace">
                          {shieldKw} kW
                        </text>
                        <circle cx="215" cy="46" r="22" fill="#064E3B" stroke="#10B981" strokeWidth="2.5" />
                        <text x="215" y="44" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">
                          CROPS
                        </text>
                        <text x="215" y="57" textAnchor="middle" fill="#A7F3D0" fontSize="10" fontFamily="monospace">
                          {hydroKw} kW
                        </text>
                      </g>
                      <circle cx="130" cy="65" r="8" fill="#F59E0B" />
                    </svg>
                  </div>

                  {/* Interactive Controls */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">SOLAR WEATHER:</span>
                      {[
                        { label: 'Calm C2 (2 mSv)', dose: 2 },
                        { label: 'Medium M8.8 (14 mSv)', dose: 14 },
                        { label: 'Extreme X8.7 (28 mSv)', dose: 28 },
                      ].map((w) => (
                        <button
                          key={w.label}
                          type="button"
                          onClick={() => setFlareDose(w.dose)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                            flareDose === w.dose
                              ? 'bg-orange-500 text-slate-950'
                              : 'bg-slate-950 border border-slate-700 text-slate-300'
                          }`}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="edu-shield-slider"
                          className="block text-xs font-bold text-purple-300 mb-1"
                        >
                          Radiation Shield Vault: {shieldKw} kW ({simPreview.shieldBlockedPct}% blocked)
                        </label>
                        <input
                          id="edu-shield-slider"
                          type="range"
                          min={0}
                          max={3}
                          value={shieldKw}
                          onChange={(e) => setShieldKw(Number(e.target.value))}
                          className="w-full accent-purple-400 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="edu-hydro-slider"
                          className="block text-xs font-bold text-emerald-300 mb-1"
                        >
                          Hydroponic Bio-Dome: {hydroKw} kW ({simPreview.foodChangePct >= 0 ? '+' : ''}
                          {simPreview.foodChangePct}% food/sol)
                        </label>
                        <input
                          id="edu-hydro-slider"
                          type="range"
                          min={0}
                          max={3}
                          value={hydroKw}
                          onChange={(e) => setHydroKw(Number(e.target.value))}
                          className="w-full accent-emerald-400 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400">CREW DOSE</div>
                        <div className="text-purple-300 font-bold tabular-nums">
                          +{simPreview.crewDoseReceivedMsv} mSv
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400">FOOD CHANGE</div>
                        <div className="text-emerald-300 font-bold tabular-nums">
                          {simPreview.foodChangePct >= 0 ? '+' : ''}
                          {simPreview.foodChangePct}%
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400">PLANT O2 BONUS</div>
                        <div className="text-sky-300 font-bold tabular-nums">
                          +{simPreview.bonusO2Pct}% O2
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-amber-200">{simPreview.lessonSummary}</p>
                  </div>
                </div>
              </div>

              {/* Educator Discussion Questions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {EDUCATOR_CLASSROOM_PROMPTS.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-2 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono text-amber-400">
                        {item.gradeBand} · {item.topic}
                      </div>
                      <div className="font-bold text-white text-sm">{item.question}</div>
                      <p className="text-slate-300">{item.expectedDiscovery}</p>
                    </div>
                    <a
                      href={item.officialLinkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-300 hover:text-cyan-200 font-bold pt-1 inline-block"
                    >
                      {item.officialLinkLabel} ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
