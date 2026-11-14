import React, { useEffect, useRef, useState } from 'react';
import {
  GameStateSnapshot,
  OUTPOST_ROOMS,
  RoomId,
  SCIENCE_BOT_SCAN_TARGET,
  hasScienceBotBadge,
} from '../game/rules';
import {
  StationScanReport,
  WallEKnowledgeReminder,
  pickWallECadetLove,
  pickWallEKnowledgeReminder,
  scanOutpostStation,
} from '../game/wallE';
import { spaceAudio } from '../game/audio';

interface WallEBuddyCardProps {
  gameState: GameStateSnapshot;
  currentRoom: RoomId | null;
  scansCount: number;
  onClose: () => void;
  onThankWallE: () => void;
  onScanStation: (report: StationScanReport) => void;
  onOpenSuggestedRoom: (roomId: RoomId) => void;
  onSendWallEAction: (
    action: 'thank' | 'tidy' | 'dance' | 'tip' | 'scan',
    customBubble?: string
  ) => void;
}

export const WallEBuddyCard: React.FC<WallEBuddyCardProps> = ({
  gameState,
  currentRoom,
  scansCount,
  onClose,
  onThankWallE,
  onScanStation,
  onOpenSuggestedRoom,
  onSendWallEAction,
}) => {
  const [reminder, setReminder] = useState<WallEKnowledgeReminder>(() =>
    pickWallEKnowledgeReminder(gameState)
  );
  const [loveIdx, setLoveIdx] = useState<number>(0);
  const [thanked, setThanked] = useState<boolean>(false);
  const [scanTarget, setScanTarget] = useState<RoomId | 'corridor'>(currentRoom || 'corridor');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanReport, setScanReport] = useState<StationScanReport | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setScanTarget(currentRoom || 'corridor');
  }, [currentRoom]);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current !== null) {
        window.clearTimeout(scanTimerRef.current);
      }
    };
  }, []);

  const loveNote = pickWallECadetLove(loveIdx);
  const badgeUnlocked = hasScienceBotBadge(scansCount);
  const progressPct = Math.min(100, Math.round((scansCount / SCIENCE_BOT_SCAN_TARGET) * 100));

  const targetLabel =
    scanTarget === 'corridor'
      ? 'Central Command Spine'
      : OUTPOST_ROOMS.find((r) => r.id === scanTarget)?.name || 'Station';

  const handleThank = () => {
    spaceAudio.playWallEChirp('love');
    setThanked(true);
    setLoveIdx((n) => n + 1);
    onThankWallE();
    onSendWallEAction('thank', 'Waaall-E! ♥ Thank you too, Cadet!');
  };

  const handleNextTip = () => {
    spaceAudio.playWallEChirp('curious');
    const next = pickWallEKnowledgeReminder(gameState, reminder.id);
    setReminder(next);
    setLoveIdx((n) => n + 1);
    onSendWallEAction('tip', next.robotSpeech);
  };

  const handleScanStation = () => {
    if (isScanning) return;
    spaceAudio.playWallEChirp('curious');
    setIsScanning(true);
    if (scanTimerRef.current !== null) {
      window.clearTimeout(scanTimerRef.current);
    }
    scanTimerRef.current = window.setTimeout(() => {
      const report = scanOutpostStation(
        scanTarget === 'corridor' ? null : scanTarget,
        gameState
      );
      setIsScanning(false);
      setScanReport(report);
      spaceAudio.playWallEChirp('happy');
      onScanStation(report);
      onSendWallEAction('scan', report.wallESpeechQuip);
    }, 240);
  };

  const handleTidyBase = () => {
    spaceAudio.playWallEChirp('happy');
    onSendWallEAction('tidy', 'Aye-aye, Cadet! Tidying & watering sprouts! 🌱');
    onClose();
  };

  const handleDanceWithWallE = () => {
    spaceAudio.playWallEChirp('love');
    onSendWallEAction('dance', '♪ Boogie-woogie with Cadet! 💛');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="WALL-E Friendly Robot Companion"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#0D1322] border-2 border-amber-400/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Authentic WALL-E SVG Portrait */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#090E1A] border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <svg viewBox="0 0 88 84" className="w-14 h-14 sm:w-16 sm:h-16 shrink-0" aria-hidden="true">
              <g transform="rotate(-5 44 26)">
                <rect x="39" y="29" width="10" height="14" rx="3" fill="#64748B" stroke="#020617" strokeWidth="2" />
                <ellipse cx="30" cy="20" rx="14" ry="11" fill="#CBD5E1" stroke="#020617" strokeWidth="2.4" />
                <ellipse cx="58" cy="21" rx="14" ry="11" fill="#CBD5E1" stroke="#020617" strokeWidth="2.4" />
                <circle cx="30" cy="20" r="7.2" fill="#0F172A" />
                <circle cx="58" cy="21" r="7.2" fill="#0F172A" />
                <circle cx="30" cy="20" r="5" fill="#1D4ED8" />
                <circle cx="58" cy="21" r="5" fill="#1D4ED8" />
                <circle cx="28" cy="18" r="2.2" fill="#FFFFFF" />
                <circle cx="56" cy="19" r="2.2" fill="#FFFFFF" />
              </g>
              <path d="M 10 56 L 23 47 L 26 76 L 9 76 Z" fill="#1E293B" stroke="#020617" strokeWidth="2.4" />
              <path d="M 78 56 L 65 47 L 62 76 L 79 76 Z" fill="#1E293B" stroke="#020617" strokeWidth="2.4" />
              <rect x="24" y="42" width="40" height="30" rx="5" fill="#F59E0B" stroke="#020617" strokeWidth="2.4" />
              <rect x="26" y="43" width="36" height="10" rx="2" fill="#475569" />
              <rect x="46" y="45" width="13" height="6" rx="1.5" fill="#0F172A" />
              <rect x="48" y="46.5" width="9" height="3" fill="#FACC15" />
              <text x="30" y="67" fontSize="6.5" fontWeight="900" fontFamily="monospace" fill="#1E293B">
                WALL·
              </text>
              <circle cx="56" cy="64.5" r="4" fill="#EF4444" />
              <text x="56" y="66.5" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#FFFFFF">
                E
              </text>
              <path d="M 22 49 L 11 38 L 15 33" fill="none" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <div>
              <div className="text-[11px] font-mono font-bold text-amber-400 tracking-wider">
                KINDNESS &amp; DIAGNOSTIC BOT · 100% SOLAR CHARGE
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-display text-white">
                WALL·E · Your Friendly Outpost Helper
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer shrink-0"
          >
            Close [Esc]
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
          {/* Interactive Station Scanner + Telemetry Lookup + Science Bot Badge Progress */}
          <div className="p-4 rounded-xl bg-cyan-950/35 border-2 border-cyan-400/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-mono font-bold text-cyan-300 uppercase">
                  🔍 LIVE WORKSTATION TELEMETRY SCANNER
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  Target Bay: <strong className="text-white">{targetLabel}</strong>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="walle-scan-room-select" className="sr-only">
                  Choose station to scan
                </label>
                <select
                  id="walle-scan-room-select"
                  value={scanTarget}
                  onChange={(e) => setScanTarget(e.target.value as RoomId | 'corridor')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 font-semibold cursor-pointer"
                >
                  <option value="corridor">
                    {currentRoom ? 'Central Command Spine' : '📍 Current: Command Spine'}
                  </option>
                  {OUTPOST_ROOMS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {currentRoom === r.id ? `📍 Current: ${r.name}` : r.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  data-testid="walle-scan-btn"
                  onClick={handleScanStation}
                  disabled={isScanning}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 text-slate-950 font-extrabold text-xs cursor-pointer whitespace-nowrap shadow"
                >
                  {isScanning ? '📡 Scanning...' : '🔍 Scan Station'}
                </button>
              </div>
            </div>

            {scanReport ? (
              <div
                data-testid="walle-scan-report"
                className="p-3 rounded-xl bg-[#090E1A]/90 border border-cyan-500/40 space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">{scanReport.roomName}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      scanReport.statusBadge === 'ALERT'
                        ? 'bg-rose-500/25 text-rose-300 border border-rose-400/50'
                        : scanReport.statusBadge === 'CAUTION'
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50'
                        : 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50'
                    }`}
                  >
                    STATUS: {scanReport.statusBadge}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-cyan-300">
                  {scanReport.liveMetricSummary}
                </div>
                <p className="text-xs font-semibold text-amber-200">
                  WALL·E says: &ldquo;{scanReport.wallESpeechQuip}&rdquo;
                </p>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {scanReport.engineeringTip}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-300">
                Press <strong className="text-cyan-300">Scan Station</strong> to check live Power,
                Oxygen, Food, or Health telemetry, get an Engineering Tip, and hear WALL·E’s readout!
              </p>
            )}

            {/* Science Bot 10-Scan Achievement Tracker */}
            <div className="pt-1 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className={badgeUnlocked ? 'text-amber-300 font-bold' : 'text-slate-300 font-semibold'}>
                  {badgeUnlocked
                    ? '🏅 BADGE UNLOCKED: Science Bot!'
                    : `🤖 Science Bot Badge: ${scansCount}/${SCIENCE_BOT_SCAN_TARGET} Scans`}
                </span>
              </div>
              <div className="w-36 h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-300 ${
                    badgeUnlocked ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Knowledge Reminder */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/50 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-amber-300">
                💡 KNOWLEDGE REMINDER · {reminder.topic.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => {
                  spaceAudio.playBreakerClick(true);
                  onOpenSuggestedRoom(reminder.suggestedRoom);
                }}
                className="px-2.5 py-1 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-[11px] font-bold text-cyan-200 cursor-pointer"
              >
                Visit Station →
              </button>
            </div>
            <p className="text-sm font-bold text-white">&ldquo;{reminder.robotSpeech}&rdquo;</p>
            <p className="text-xs text-slate-200 leading-relaxed">{reminder.knowledgeTip}</p>
          </div>

          {/* Warm Love & Encouragement */}
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-400/40 space-y-0.5">
            <div className="text-[11px] font-mono font-bold text-rose-300">
              💛 ENCOURAGEMENT &amp; LOVE FROM WALL·E
            </div>
            <p className="text-xs sm:text-sm font-semibold text-rose-100">{reminder.encouragement}</p>
            <p className="text-xs text-slate-300">{loveNote}</p>
          </div>

          {/* Interactive Cadet Replies to WALL-E */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Reply or Play Together with WALL·E:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleThank}
                className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer transition-colors shadow whitespace-nowrap"
              >
                {thanked ? '💛 Thanked WALL-E! (+2 Sci)' : '💛 "Thank you, WALL-E!" (+2 Sci)'}
              </button>
              <button
                type="button"
                onClick={handleNextTip}
                className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer transition-colors shadow whitespace-nowrap"
              >
                💡 &ldquo;Remind Me Another Fact!&rdquo;
              </button>
              <button
                type="button"
                onClick={handleTidyBase}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-400/40 text-cyan-200 font-bold text-xs cursor-pointer whitespace-nowrap"
              >
                🌱 &ldquo;Help Water Plants &amp; Clean Base!&rdquo;
              </button>
              <button
                type="button"
                onClick={handleDanceWithWallE}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-pink-400/40 text-pink-200 font-bold text-xs cursor-pointer whitespace-nowrap"
              >
                💃 &ldquo;Dance Together, WALL-E!&rdquo;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
