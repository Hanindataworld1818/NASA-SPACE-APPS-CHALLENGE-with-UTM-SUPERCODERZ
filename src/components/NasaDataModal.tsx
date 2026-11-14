import React, { useEffect, useState } from 'react';
import {
  CSA_BILINGUAL_GLOSSARY,
  CSA_MOON_TO_ARCTIC_COMPARISON,
  CSA_STEM_ACTIVITIES,
  CURATED_MARS_ROVER_PHOTOS,
  CURATED_NASA_DONKI_SCHEDULE,
  MISSION_SITES,
  NASA_OSDR_STUDIES,
  RADLAB_BENCHMARKS,
  MarsRoverPhoto,
  NasaApodSpotlight,
  NasaOsdrStudy,
  fetchLiveMarsRoverPhotos,
  fetchLiveNasaDonkiFlares,
  fetchNasaApodSpotlight,
  fetchRadLabTelemetry,
  searchNasaOsdrStudies,
} from '../game/nasaData';
import {
  GameStateSnapshot,
  calculateSolOutcome,
  calculateSpacePlateNutrition,
} from '../game/rules';
import { MarsTrekExplorer } from './MarsTrekExplorer';

interface NasaDataModalProps {
  gameState: GameStateSnapshot;
  onClose: () => void;
}

type ModalTab = 'donki' | 'mars' | 'osdr' | 'csa' | 'team';

const OSDR_TOPICS = [
  { label: '🦴 Bone Density', query: 'bone' },
  { label: '💪 Muscle Mass', query: 'muscle' },
  { label: '🛡️ Immune System', query: 'immune' },
  { label: '😴 Sleep & Sols', query: 'sleep' },
  { label: '🌱 Space Plants', query: 'plant' },
  { label: '☢️ Radiation DNA', query: 'radiation' },
];

export const NasaDataModal: React.FC<NasaDataModalProps> = ({ gameState, onClose }) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('donki');

  // DONKI + RadLab states
  const [liveFeed, setLiveFeed] = useState<{
    status: 'live' | 'archive' | 'loading';
    cmeCount?: number;
    events: Array<{
      flrID: string;
      beginTime: string;
      peakTime: string;
      classType: string;
      sourceLocation: string;
      link: string;
    }>;
  }>({ status: 'loading', events: [] });

  const [radLabData, setRadLabData] = useState<{
    status: 'live' | 'archive';
    sampleCount: number;
    issDosTelAvgUgyDay: number;
    samples: Array<{ timestamp: string; instrument: string; doseRateUgyPerDay: number }>;
  } | null>(null);

  // Mars Trek, Mars Photos, APOD states
  const [marsPhotos, setMarsPhotos] = useState<{
    status: 'live' | 'archive';
    rover: string;
    photos: MarsRoverPhoto[];
  }>({
    status: 'archive',
    rover: 'Perseverance (Mars 2020)',
    photos: CURATED_MARS_ROVER_PHOTOS,
  });
  const [apod, setApod] = useState<NasaApodSpotlight | null>(null);

  // OSDR Live Search states
  const [osdrQuery, setOsdrQuery] = useState<string>('');
  const [osdrLoading, setOsdrLoading] = useState<boolean>(false);
  const [osdrResults, setOsdrResults] = useState<{
    status: 'live' | 'archive';
    totalHits: number;
    studies: NasaOsdrStudy[];
  }>({
    status: 'archive',
    totalHits: NASA_OSDR_STUDIES.length,
    studies: NASA_OSDR_STUDIES,
  });

  // CSA Interactive Nutrition Plate & Bilingual Toggle states
  const [plateServings, setPlateServings] = useState({
    protein: 2,
    greens: 2,
    grains: 3,
    fruit: 2,
  });
  const [csaLang, setCsaLang] = useState<'en' | 'fr'>('en');

  useEffect(() => {
    let mounted = true;
    fetchLiveNasaDonkiFlares().then((res) => {
      if (mounted) setLiveFeed(res);
    });
    fetchRadLabTelemetry().then((res) => {
      if (mounted) setRadLabData(res);
    });
    fetchLiveMarsRoverPhotos().then((res) => {
      if (mounted) setMarsPhotos(res);
    });
    fetchNasaApodSpotlight().then((res) => {
      if (mounted) setApod(res);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleOsdrSearch = async (queryText: string) => {
    setOsdrQuery(queryText);
    setOsdrLoading(true);
    try {
      const res = await searchNasaOsdrStudies(queryText);
      setOsdrResults(res);
    } finally {
      setOsdrLoading(false);
    }
  };

  const projection = calculateSolOutcome(gameState);
  const currentSite = MISSION_SITES[gameState.siteId];
  const plateResult = calculateSpacePlateNutrition(plateServings);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 pointer-events-auto"
      role="dialog"
      aria-label="NASA & CSA Real Open Data Visualizer"
    >
      <div className="w-full max-w-5xl rounded-2xl bg-[#0B1120] border-2 border-cyan-500/50 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#070B14] border-b border-slate-800">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              NASA OPEN APIs · DONKI · RADLAB · OSDR · MARS TREK · CSA STEM &amp; FOOD LAB
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
              NASA &amp; CSA Real Open Science Center
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
        <div className="flex flex-wrap items-center gap-2 px-6 pt-3 pb-2 bg-[#0B1120] border-b border-slate-800/80">
          {(
            [
              { id: 'donki', label: '1. DONKI & RadLab Radiation' },
              { id: 'mars', label: '2. Outpost Gallery & Mars Trek' },
              { id: 'osdr', label: '3. OSDR Biology Search' },
              { id: 'csa', label: '4. CSA STEM & Moon Food Lab' },
              { id: 'team', label: '5. Team & Open Data Sources' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-cyan-400 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-200">
          {/* TAB 1: DONKI + RADLAB */}
          {activeTab === 'donki' && (
            <div className="space-y-5">
              {/* Interactive Child-Friendly SVG Chart of 7-Sol NASA DONKI Solar Flares vs Shielding */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      7-Sol NASA DONKI Solar Activity &amp; Your Shield Protection Chart
                    </h3>
                    <p className="text-xs text-slate-400">
                      Unshielded Flare Dose (Orange) vs Dose After Your Current{' '}
                      {projection.shieldEfficiencyPct}% Water-Wall Shield (Purple).
                    </p>
                  </div>
                  <span className="text-xs font-mono text-cyan-300">
                    Shield Power: {gameState.powerAllocation.shield} kW ({projection.shieldEfficiencyPct}
                    % Blocked)
                  </span>
                </div>

                <svg
                  viewBox="0 0 700 220"
                  className="w-full h-48 bg-[#070B14] rounded-xl border border-slate-800 p-2"
                  role="img"
                  aria-label="7-Sol NASA DONKI Solar Radiation Chart"
                >
                  {[0, 10, 20, 30].map((val) => {
                    const y = 165 - (val / 30) * 130;
                    return (
                      <g key={val}>
                        <line x1={50} y1={y} x2={670} y2={y} stroke="#1E293B" strokeDasharray="4 4" />
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

                  {CURATED_NASA_DONKI_SCHEDULE.map((ev, i) => {
                    const x = 75 + i * 84;
                    const unshieldedH = Math.max(6, (ev.unshieldedDoseMsv / 30) * 130);
                    const shieldedMsv = Number(
                      (ev.unshieldedDoseMsv * (1 - projection.shieldEfficiencyPct / 100)).toFixed(1)
                    );
                    const shieldedH = Math.max(4, (shieldedMsv / 30) * 130);
                    const isCurrent = ev.sol === gameState.sol;

                    return (
                      <g key={ev.id}>
                        {isCurrent && (
                          <rect
                            x={x - 12}
                            y={14}
                            width={68}
                            height={192}
                            rx={8}
                            fill="rgba(56, 189, 248, 0.1)"
                            stroke="#38BDF8"
                            strokeWidth={1.5}
                          />
                        )}
                        <rect x={x} y={165 - unshieldedH} width={20} height={unshieldedH} rx={4} fill="#F97316" />
                        <rect x={x + 24} y={165 - shieldedH} width={20} height={shieldedH} rx={4} fill="#A855F7" />
                        <text
                          x={x + 22}
                          y={182}
                          textAnchor="middle"
                          fill={isCurrent ? '#38BDF8' : '#CBD5E1'}
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          Sol {ev.sol}
                        </text>
                        <text x={x + 22} y={197} textAnchor="middle" fill="#94A3B8" fontSize="9.5">
                          {ev.classType.split(' ')[0]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Real NASA OSDR RadLab Dosimetry Comparison */}
              <div className="p-4 rounded-xl bg-slate-900 border border-purple-500/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      ☢️ NASA OSDR RadLab Radiation Dosimetry Comparison
                    </h3>
                    <p className="text-xs text-slate-400">
                      Real absorbed dose rates comparing Earth, ISS DosTel1 (RadLab API), Mars
                      Curiosity RAD, and Moon LRO CRaTER.
                    </p>
                  </div>
                  {radLabData && (
                    <span className="text-xs font-mono text-purple-300">
                      ISS DosTel1 Avg: {radLabData.issDosTelAvgUgyDay} µGy/day (
                      {radLabData.status === 'live' ? 'Live RadLab API' : 'Verified RadLab Archive'})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {RADLAB_BENCHMARKS.map((b) => {
                    const widthPct = Math.min(100, Math.max(4, (b.dailyDoseMsv / 1.2) * 100));
                    return (
                      <div
                        key={b.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                      >
                        <div className="text-xs font-bold text-white">{b.location}</div>
                        <div className="text-[11px] font-mono" style={{ color: b.accentColor }}>
                          {b.dailyDoseMsv} mSv/sol · {b.dailyDoseUgy} µGy/d
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${widthPct}%`, backgroundColor: b.accentColor }}
                          />
                        </div>
                        <div className="text-[11px] text-slate-400">{b.kidNote}</div>
                      </div>
                    );
                  })}
                </div>

                {radLabData && radLabData.samples.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-300">
                    <span className="text-cyan-400">ISS DosTel1 Samples:</span>
                    {radLabData.samples.slice(0, 4).map((s, i) => (
                      <span
                        key={`${s.timestamp}-${i}`}
                        className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800"
                      >
                        {s.timestamp.slice(5, 16)} → {s.doseRateUgyPerDay} µGy/d
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Live / Archived NASA DONKI Telemetry Table */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="text-sm font-bold text-white">
                    NASA DONKI Solar Flare Telemetry Feed (
                    {liveFeed.status === 'live'
                      ? `Live api.nasa.gov · ${liveFeed.cmeCount || 0} CMEs tracked`
                      : 'Verified Cycle 25 Archive'}
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

          {/* TAB 2: OUTPOST IMAGE GALLERY + MARS TREK + ROVER PHOTOS + APOD */}
          {activeTab === 'mars' && (
            <MarsTrekExplorer siteId={gameState.siteId} marsPhotos={marsPhotos} apod={apod} />
          )}

          {/* TAB 3: OSDR LIVE SPACE BIOLOGY SEARCH */}
          {activeTab === 'osdr' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      🧬 NASA Open Science Data Repository (OSDR) Search
                    </h3>
                    <p className="text-xs text-slate-400">
                      Search real NASA space biology studies on bone density, muscle mass, immune
                      response, sleep cycles, and space crops!
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">
                    {osdrResults.status === 'live'
                      ? `Live osdr.nasa.gov (${osdrResults.totalHits} matches)`
                      : `Curated + Offline Archive (${osdrResults.studies.length} studies)`}
                  </span>
                </div>

                {/* Search Input & Topic Buttons */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleOsdrSearch(osdrQuery);
                  }}
                  className="flex flex-wrap gap-2"
                >
                  <label htmlFor="osdr-search-input" className="sr-only">
                    Search NASA OSDR space biology studies
                  </label>
                  <input
                    id="osdr-search-input"
                    type="text"
                    value={osdrQuery}
                    onChange={(e) => setOsdrQuery(e.target.value)}
                    placeholder="Search OSDR studies (e.g. bone, muscle, immune, sleep, plant)..."
                    className="flex-1 min-w-[220px] px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                  />
                  <button
                    type="submit"
                    disabled={osdrLoading}
                    className="px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    {osdrLoading ? 'Searching OSDR...' : 'Search OSDR'}
                  </button>
                  {osdrQuery && (
                    <button
                      type="button"
                      onClick={() => handleOsdrSearch('')}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                    >
                      Show All
                    </button>
                  )}
                </form>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-400 mr-1">TOPICS:</span>
                  {OSDR_TOPICS.map((t) => (
                    <button
                      key={t.query}
                      type="button"
                      onClick={() => handleOsdrSearch(t.query)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        osdrQuery.toLowerCase() === t.query
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-950 border border-slate-700 text-slate-300 hover:border-emerald-400'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {osdrResults.studies.map((study, idx) => (
                  <div
                    key={`${study.accessionId}-${idx}`}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-mono text-emerald-400">
                        {study.accessionId} · {study.mission}
                      </span>
                      <span className="text-xs font-mono text-cyan-300">
                        AstroBase Link: {study.gameplayLink}
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-white">{study.title}</h4>
                    <p className="text-xs text-slate-300">
                      <strong className="text-white">Organism &amp; Finding:</strong>{' '}
                      {study.organism} — {study.keyFinding}
                    </p>
                    <p className="text-xs text-emerald-300">
                      <strong>Junior Astronaut Takeaway:</strong> {study.kidLesson}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CSA YOUTH STEM & MOON-TO-EARTH FOOD LAB */}
          {activeTab === 'csa' && (
            <div className="space-y-5">
              {/* Interactive CSA Astronaut Space Plate Builder */}
              <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-emerald-400">
                      CANADIAN SPACE AGENCY (CSA) · FOOD PRODUCTION &amp; NUTRITION LAB
                    </div>
                    <h3 className="text-base font-bold text-white">
                      🥗 Build Your Daily Astronaut Space Plate (Target: 1,900–3,200 kcal)
                    </h3>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold ${
                      plateResult.inHealthyRange
                        ? 'bg-emerald-950 border border-emerald-400 text-emerald-300'
                        : 'bg-amber-950 border border-amber-400 text-amber-300'
                    }`}
                  >
                    {plateResult.totalKcal} kcal/day ·{' '}
                    {plateResult.inHealthyRange ? '★ BALANCED' : 'ADJUST SERVINGS'}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(
                    [
                      { key: 'protein', label: '🥩 Space Protein', kcal: '360 kcal' },
                      { key: 'greens', label: '🥬 Bio-Dome Greens', kcal: '110 kcal' },
                      { key: 'grains', label: '🌾 Dwarf Wheat', kcal: '310 kcal' },
                      { key: 'fruit', label: '🍓 Space Berries', kcal: '180 kcal' },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.key}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-center"
                    >
                      <div className="text-xs font-bold text-white">{item.label}</div>
                      <div className="text-[10px] font-mono text-slate-400">{item.kcal} / serving</div>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          aria-label={`Decrease ${item.label}`}
                          onClick={() =>
                            setPlateServings((p) => ({
                              ...p,
                              [item.key]: Math.max(0, p[item.key] - 1),
                            }))
                          }
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                        >
                          −
                        </button>
                        <span className="font-mono font-bold text-base text-cyan-300 w-5 tabular-nums">
                          {plateServings[item.key]}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase ${item.label}`}
                          onClick={() =>
                            setPlateServings((p) => ({
                              ...p,
                              [item.key]: Math.min(6, p[item.key] + 1),
                            }))
                          }
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex justify-between mb-1">
                      <span className="text-amber-300">VITAMIN C (FRESH CROPS)</span>
                      <span className="text-white">{plateResult.vitaminCScore}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${plateResult.vitaminCScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex justify-between mb-1">
                      <span className="text-emerald-300">CREW MORALE &amp; FRESHNESS</span>
                      <span className="text-white">{plateResult.freshFoodMoodBoost}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${plateResult.freshFoodMoodBoost}%` }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-emerald-300">{plateResult.feedback}</p>
              </div>

              {/* Moon & Mars Greenhouses -> Earth Remote Arctic Food Security */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white">
                  🌍 CSA Deep Space Food Challenge: From Lunar Outposts to Remote Arctic Communities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {CSA_MOON_TO_ARCTIC_COMPARISON.map((row) => (
                    <div
                      key={row.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs"
                    >
                      <div className="font-bold text-cyan-300">{row.topic}</div>
                      <p className="text-slate-300">
                        <strong className="text-amber-300">Moon/Mars:</strong> {row.moonMarsChallenge}
                      </p>
                      <p className="text-slate-300">
                        <strong className="text-sky-300">Arctic Earth:</strong>{' '}
                        {row.earthArcticConnection}
                      </p>
                      <p className="text-emerald-300">
                        <strong>CSA Tech:</strong> {row.csaSolution}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CSA Youth STEM Activities + Bilingual EN/FR Toggle */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">
                    🍁 CSA Youth STEM Challenges &amp; Bilingual EN/FR Space Glossary
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCsaLang('en')}
                      className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${
                        csaLang === 'en' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => setCsaLang('fr')}
                      className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${
                        csaLang === 'fr' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      FR
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {CSA_STEM_ACTIVITIES.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs"
                    >
                      <div className="text-[10px] font-mono text-pink-400">{act.ageRange} · {act.missionFocus}</div>
                      <div className="font-bold text-white">
                        {csaLang === 'en' ? act.titleEn : act.titleFr}
                      </div>
                      <p className="text-slate-300">{act.challengePrompt}</p>
                      <p className="text-cyan-300">{act.kidTakeaway}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
                  {CSA_BILINGUAL_GLOSSARY.map((term) => (
                    <div
                      key={term.en}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center"
                    >
                      <div className="text-[10px] font-mono text-cyan-400">{term.badge}</div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {csaLang === 'en' ? term.en : term.fr}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {csaLang === 'en' ? term.fr : term.en}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TEAM UTM SUPERCODERZ & DATA ATTRIBUTION */}
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
                  Built to translate authentic NASA &amp; CSA mission engineering trade-offs—balancing{' '}
                  <strong>ECLSS Life Support</strong>, <strong>DONKI &amp; RadLab Shielding</strong>,{' '}
                  <strong>Mars Trek Topography</strong>, <strong>OSDR Space Biology</strong>, and{' '}
                  <strong>CSA Moon-to-Arctic Hydroponics</strong>—into an intuitive, action-packed
                  space outpost trainer for ages 7–12.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  {
                    name: 'NASA Open APIs (DONKI, APOD) & JPL Mars 2020',
                    desc: 'Live solar flare & coronal mass ejection alerts, Astronomy Spotlight, and Perseverance surface camera imagery.',
                  },
                  {
                    name: 'NASA OSDR Search & RadLab Dosimetry API',
                    desc: 'Open-access biological spaceflight research (bone, muscle, immune, sleep, crops) and ISS/Mars/Moon absorbed radiation dose data.',
                  },
                  {
                    name: 'NASA Mars Trek WMTS',
                    desc: 'Authentic Viking True-Color Mosaic and MOLA Laser Elevation tiles centered on Jezero Crater & Martian landmarks.',
                  },
                  {
                    name: 'Canadian Space Agency (CSA) Open Toolkits',
                    desc: 'Food Production on the Moon & in Remote Areas + Bilingual Youth STEM Space Resources.',
                  },
                ].map((src) => (
                  <div
                    key={src.name}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1"
                  >
                    <div className="font-bold text-cyan-300">{src.name}</div>
                    <p className="text-slate-300">{src.desc}</p>
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
