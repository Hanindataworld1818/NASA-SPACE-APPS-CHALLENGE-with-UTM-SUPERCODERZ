import React, { useMemo, useState } from 'react';
import {
  ACADEMY_LESSON_DECKS,
  AcademyLessonCard,
  AcademyTopicId,
  BalanceSliderQuiz,
  QuizPatternType,
  SURVIVAL_SUPPLY_PACKS,
  SurvivalSupplyPackId,
  buildAcademyQuizRound,
  computeAcademyClaimRewards,
  evaluateAcademyQuizScore,
} from '../../game/academyData';
import { CropPantryInventory, GameStateSnapshot } from '../../game/rules';
import { spaceAudio } from '../../game/audio';

interface AcademyStationGameProps {
  gameState: GameStateSnapshot;
  isAlreadyDone: boolean;
  onComplete: (
    deltas: {
      oxygen?: number;
      food?: number;
      radiationMsv?: number;
      science?: number;
      pantryDelta?: Partial<CropPantryInventory>;
    },
    logNote: string
  ) => void;
  onBonusReward: (
    deltas: {
      oxygen?: number;
      food?: number;
      radiationMsv?: number;
      science?: number;
      pantryDelta?: Partial<CropPantryInventory>;
    },
    toastNote: string
  ) => void;
}

type AcademyMode = 'learn' | 'quiz';

const PATTERN_LABEL_MAP: Record<QuizPatternType, string> = {
  multiple_choice: 'Mission Scenario Choice',
  myth_buster: 'NASA Fact vs. Myth Buster',
  balance_slider: 'Engineering Balance Lab',
  sequence_order: 'Mission Protocol Sequence',
};

function renderTopicVisualSvg(type: AcademyLessonCard['visualDiagramType'], accent: string) {
  if (type === 'power') {
    return (
      <svg viewBox="0 0 220 130" className="w-full h-32 rounded-xl bg-[#070C17] border border-slate-800" aria-hidden="true">
        <rect x="14" y="20" width="44" height="90" rx="8" fill="#1E293B" stroke={accent} strokeWidth="2" />
        <path d="M38 38l-11 26h10l-2 22 14-27H38l0-21z" fill="#FBBF24" />
        <path d="M58 40h46M58 65h46M58 90h46" stroke="#334155" strokeWidth="3" strokeDasharray="5 4" />
        <rect x="104" y="22" width="100" height="24" rx="6" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" />
        <text x="154" y="38" textAnchor="middle" fill="#BAE6FD" fontSize="10" fontFamily="monospace">O2 BAY +10%/kW</text>
        <rect x="104" y="53" width="100" height="24" rx="6" fill="#0F172A" stroke="#A855F7" strokeWidth="1.5" />
        <text x="154" y="69" textAnchor="middle" fill="#E9D5FF" fontSize="10" fontFamily="monospace">SHIELD 28%/kW</text>
        <rect x="104" y="84" width="100" height="24" rx="6" fill="#0F172A" stroke="#10B981" strokeWidth="1.5" />
        <text x="154" y="100" textAnchor="middle" fill="#A7F3D0" fontSize="10" fontFamily="monospace">CROPS +9%/kW</text>
      </svg>
    );
  }
  if (type === 'air') {
    return (
      <svg viewBox="0 0 220 130" className="w-full h-32 rounded-xl bg-[#070C17] border border-slate-800" aria-hidden="true">
        <rect x="18" y="24" width="56" height="82" rx="10" fill="#0C2438" stroke="#38BDF8" strokeWidth="2" />
        <text x="46" y="46" textAnchor="middle" fill="#BAE6FD" fontSize="10" fontWeight="bold">2H2O</text>
        <circle cx="36" cy="70" r="8" fill="#38BDF8" opacity="0.6" />
        <circle cx="56" cy="84" r="6" fill="#7DD3FC" opacity="0.8" />
        <path d="M78 64h46" stroke="#38BDF8" strokeWidth="3" />
        <polygon points="122,58 134,64 122,70" fill="#38BDF8" />
        <circle cx="166" cy="64" r="34" fill="#064E3B" stroke="#10B981" strokeWidth="2" />
        <text x="166" y="60" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="bold">O2 +4%</text>
        <text x="166" y="76" textAnchor="middle" fill="#6EE7B7" fontSize="9" fontFamily="monospace">CO2 → CROPS</text>
      </svg>
    );
  }
  if (type === 'shield') {
    return (
      <svg viewBox="0 0 220 130" className="w-full h-32 rounded-xl bg-[#070C17] border border-slate-800" aria-hidden="true">
        <circle cx="24" cy="65" r="16" fill="#F97316" />
        <path d="M44 45l36 10M44 65l36 0M44 85l36 -10" stroke="#FBBF24" strokeWidth="2.5" strokeDasharray="4 3" />
        <rect x="86" y="18" width="26" height="94" rx="7" fill="#3B0764" stroke="#A855F7" strokeWidth="2.5" />
        <text x="99" y="69" textAnchor="middle" fill="#E9D5FF" fontSize="9" fontWeight="bold" transform="rotate(-90 99 69)">H2O WALL</text>
        <path d="M124 65h22" stroke="#10B981" strokeWidth="2.5" />
        <rect x="152" y="34" width="52" height="62" rx="10" fill="#0F172A" stroke="#10B981" strokeWidth="2" />
        <text x="178" y="62" textAnchor="middle" fill="#6EE7B7" fontSize="11" fontWeight="bold">CREW</text>
        <text x="178" y="78" textAnchor="middle" fill="#A7F3D0" fontSize="9" fontFamily="monospace">92% SAFE</text>
      </svg>
    );
  }
  if (type === 'food') {
    return (
      <svg viewBox="0 0 220 130" className="w-full h-32 rounded-xl bg-[#070C17] border border-slate-800" aria-hidden="true">
        <rect x="16" y="20" width="82" height="90" rx="10" fill="#052E16" stroke="#10B981" strokeWidth="2" />
        <line x1="24" y1="32" x2="90" y2="32" stroke="#EC4899" strokeWidth="4" />
        <circle cx="40" cy="62" r="11" fill="#34D399" />
        <circle cx="72" cy="62" r="11" fill="#FB7185" />
        <circle cx="56" cy="86" r="11" fill="#F59E0B" />
        <path d="M102 65h20" stroke="#34D399" strokeWidth="2.5" />
        <circle cx="164" cy="65" r="36" fill="#0F172A" stroke="#FB7185" strokeWidth="2.5" />
        <text x="164" y="60" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">1,900–3,200</text>
        <text x="164" y="76" textAnchor="middle" fill="#FDA4AF" fontSize="9" fontFamily="monospace">KCAL + VIT C</text>
      </svg>
    );
  }
  if (type === 'eva') {
    return (
      <svg viewBox="0 0 220 130" className="w-full h-32 rounded-xl bg-[#070C17] border border-slate-800" aria-hidden="true">
        <rect x="18" y="34" width="70" height="58" rx="6" fill="#1E293B" stroke="#F97316" strokeWidth="2" />
        <line x1="24" y1="54" x2="82" y2="54" stroke="#38BDF8" strokeWidth="1.5" />
        <line x1="24" y1="72" x2="82" y2="72" stroke="#38BDF8" strokeWidth="1.5" />
        <text x="53" y="48" textAnchor="middle" fill="#FDBA74" fontSize="9" fontFamily="monospace">DUST WING</text>
        <rect x="122" y="48" width="54" height="32" rx="7" fill="#F97316" stroke="#0F172A" strokeWidth="2" />
        <circle cx="134" cy="85" r="8" fill="#E2E8F0" />
        <circle cx="164" cy="85" r="8" fill="#E2E8F0" />
        <text x="149" y="108" textAnchor="middle" fill="#FDE68A" fontSize="9" fontFamily="monospace">+1 kW RECOVERED</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 220 130" className="w-full h-32 rounded-xl bg-[#070C17] border border-slate-800" aria-hidden="true">
      <circle cx="42" cy="65" r="22" fill="#9A3412" stroke="#FB923C" strokeWidth="2" />
      <text x="42" y="69" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">MARS</text>
      <path d="M72 65c14-14 28-14 42 0s28 14 42 0" fill="none" stroke="#EC4899" strokeWidth="2.5" strokeDasharray="5 3" />
      <text x="114" y="42" textAnchor="middle" fill="#F9A8D4" fontSize="9" fontFamily="monospace">14 MIN DELAY</text>
      <circle cx="182" cy="65" r="20" fill="#0369A1" stroke="#38BDF8" strokeWidth="2" />
      <text x="182" y="69" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">EARTH</text>
    </svg>
  );
}

export const AcademyStationGame: React.FC<AcademyStationGameProps> = ({
  gameState,
  isAlreadyDone,
  onComplete,
  onBonusReward,
}) => {
  const [mode, setMode] = useState<AcademyMode>('learn');
  const [selectedTopicId, setSelectedTopicId] = useState<AcademyTopicId>('power_tradeoffs');
  const [exploredTopics, setExploredTopics] = useState<AcademyTopicId[]>([]);
  const [academyMarks, setAcademyMarks] = useState<number>(0);

  // Quiz Arcade state
  const [patternFilter, setPatternFilter] = useState<QuizPatternType | 'mixed'>('mixed');
  const [quizTopicFilter, setQuizTopicFilter] = useState<AcademyTopicId | 'all'>('all');
  const [roundSeed, setRoundSeed] = useState<number>(0);
  const [questionIdx, setQuestionIdx] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [roundCorrectCount, setRoundCorrectCount] = useState<number>(0);
  const [roundMarks, setRoundMarks] = useState<number>(0);
  const [roundsClaimedCount, setRoundsClaimedCount] = useState<number>(0);

  // Per-question interaction states
  const [answeredResult, setAnsweredResult] = useState<{
    correct: boolean;
    earnedMarks: number;
    message: string;
  } | null>(null);
  const [sliderA, setSliderA] = useState<number>(1);
  const [sliderB, setSliderB] = useState<number>(2);
  const [sequencePicked, setSequencePicked] = useState<string[]>([]);
  const [claimedPackTitle, setClaimedPackTitle] = useState<string>('');

  const activeTopic =
    ACADEMY_LESSON_DECKS.find((d) => d.id === selectedTopicId) || ACADEMY_LESSON_DECKS[0];

  const roundQuestions = useMemo(
    () =>
      buildAcademyQuizRound({
        filterPattern: patternFilter,
        topicId: quizTopicFilter,
        roundSeed,
        count: 3,
      }),
    [patternFilter, quizTopicFilter, roundSeed]
  );

  const isRoundFinished = questionIdx >= roundQuestions.length;
  const currentQuestion = !isRoundFinished ? roundQuestions[questionIdx] : null;

  const initQuestionControls = (q: (typeof roundQuestions)[number] | undefined) => {
    setAnsweredResult(null);
    setSequencePicked([]);
    if (q && q.pattern === 'balance_slider') {
      setSliderA(q.initialA);
      setSliderB(q.initialB);
    }
  };

  const startFreshRound = (
    nextPattern: QuizPatternType | 'mixed' = patternFilter,
    nextTopic: AcademyTopicId | 'all' = quizTopicFilter,
    nextSeed: number = roundSeed + 1
  ) => {
    setPatternFilter(nextPattern);
    setQuizTopicFilter(nextTopic);
    setRoundSeed(nextSeed);
    setQuestionIdx(0);
    setRoundCorrectCount(0);
    setRoundMarks(0);
    setClaimedPackTitle('');
    const nextQ = buildAcademyQuizRound({
      filterPattern: nextPattern,
      topicId: nextTopic,
      roundSeed: nextSeed,
      count: 3,
    })[0];
    initQuestionControls(nextQ);
    setMode('quiz');
  };

  const handleMarkTopicStudied = (topicId: AcademyTopicId) => {
    if (exploredTopics.includes(topicId)) return;
    spaceAudio.playBreakerClick(true);
    setExploredTopics((prev) => [...prev, topicId]);
    setAcademyMarks((m) => m + 5);
    onBonusReward({ science: 5 }, `Studied ${activeTopic.shortTitle} deck (+5 Science Marks)`);
  };

  const submitAnswer = (isCorrect: boolean, customFeedback?: string) => {
    if (!currentQuestion || answeredResult) return;
    const { earnedMarks, nextStreak } = evaluateAcademyQuizScore({
      baseMarks: currentQuestion.baseMarks,
      isCorrect,
      currentStreak: streak,
    });
    setStreak(nextStreak);
    setAcademyMarks((m) => m + earnedMarks);
    setRoundMarks((m) => m + earnedMarks);
    if (isCorrect) {
      setRoundCorrectCount((c) => c + 1);
      spaceAudio.playTaskComplete();
    } else {
      spaceAudio.playBreakerClick(false);
    }
    setAnsweredResult({
      correct: isCorrect,
      earnedMarks,
      message: customFeedback || currentQuestion.explanation,
    });
  };

  const handleNextQuestion = () => {
    const nextIdx = questionIdx + 1;
    setQuestionIdx(nextIdx);
    initQuestionControls(roundQuestions[nextIdx]);
    spaceAudio.playBreakerClick(true);
  };

  const handleClaimSupplyPack = (packId: SurvivalSupplyPackId) => {
    if (claimedPackTitle) return;
    const pack =
      SURVIVAL_SUPPLY_PACKS.find((p) => p.id === packId) || SURVIVAL_SUPPLY_PACKS[0];
    const isRepeat = isAlreadyDone || roundsClaimedCount > 0;
    const rewards = computeAcademyClaimRewards({
      packId,
      earnedMarks: roundMarks,
      correctCount: roundCorrectCount,
      isRepeatRound: isRepeat,
    });

    setRoundsClaimedCount((n) => n + 1);
    setClaimedPackTitle(pack.title);

    if (!isAlreadyDone && roundsClaimedCount === 0) {
      onComplete(
        rewards,
        `Academy Station (${pack.title}): +${rewards.science} Science, +${rewards.oxygen}% O2, +${rewards.food}% Food`
      );
    } else {
      onBonusReward(
        rewards,
        `Academy Quiz Supply Drop (${pack.title}): +${rewards.science} Science Marks!`
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Educational Status & Mode Switcher */}
      <div className="p-4 rounded-2xl bg-[#090E1A] border border-amber-400/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-amber-300">
            JUNIOR ASTRONAUT ACADEMY · FOR EDUCATORS, YOUTH &amp; KIDS
          </div>
          <div className="text-sm text-slate-200 mt-0.5">
            Master real NASA &amp; CSA survival lessons and beat 4 quiz game patterns to gain Marks
            &amp; survival supplies!
          </div>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-center">
            <div className="text-[10px] text-slate-400">ACADEMY MARKS</div>
            <div className="text-base font-extrabold text-amber-300 tabular-nums">
              {academyMarks}
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-center">
            <div className="text-[10px] text-slate-400">TOPICS READ</div>
            <div className="text-base font-extrabold text-cyan-300 tabular-nums">
              {exploredTopics.length}/{ACADEMY_LESSON_DECKS.length}
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-center">
            <div className="text-[10px] text-slate-400">QUIZ STREAK</div>
            <div className="text-base font-extrabold text-emerald-300 tabular-nums">
              {streak}x
            </div>
          </div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800">
        <button
          type="button"
          onClick={() => setMode('learn')}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
            mode === 'learn'
              ? 'bg-amber-400 text-slate-950'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          1. Learn &amp; Explore Deck ({exploredTopics.length}/{ACADEMY_LESSON_DECKS.length})
        </button>
        <button
          type="button"
          onClick={() => setMode('quiz')}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
            mode === 'quiz'
              ? 'bg-amber-400 text-slate-950'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          2. Multi-Quiz Arcade (4 Patterns · Win Supplies!)
        </button>
      </div>

      {/* MODE 1: INTERACTIVE LEARNING DECK */}
      {mode === 'learn' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Topic Selector List */}
          <div className="lg:col-span-4 space-y-2">
            <div className="text-[11px] font-mono text-cyan-400">
              CHOOSE A MISSION TRAINER LESSON:
            </div>
            {ACADEMY_LESSON_DECKS.map((topic) => {
              const active = topic.id === activeTopic.id;
              const studied = exploredTopics.includes(topic.id);
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                    active
                      ? 'bg-slate-800 border-amber-400 text-white'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-bold">
                    {topic.icon} {topic.shortTitle}
                  </span>
                  <span
                    className={`text-[11px] font-mono ${
                      studied ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {studied ? '✓ Read' : 'Study'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Interactive Lesson Stage */}
          <div className="lg:col-span-8 space-y-3">
            <div
              className="p-4 rounded-2xl bg-slate-900 border-2 space-y-3"
              style={{ borderColor: activeTopic.accentColor }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div
                    className="text-[11px] font-mono font-bold"
                    style={{ color: activeTopic.accentColor }}
                  >
                    {activeTopic.realNasaSource}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {activeTopic.icon} {activeTopic.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={exploredTopics.includes(activeTopic.id)}
                    onClick={() => handleMarkTopicStudied(activeTopic.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    {exploredTopics.includes(activeTopic.id)
                      ? '✓ Studied (+5 Marks)'
                      : 'Claim Study Mark (+5)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => startFreshRound('mixed', activeTopic.id, roundSeed + 1)}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Quiz This Topic →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-5">
                  {renderTopicVisualSvg(activeTopic.visualDiagramType, activeTopic.accentColor)}
                </div>
                <div className="sm:col-span-7 grid grid-cols-3 gap-2 text-center font-mono">
                  {activeTopic.keyNumbers.map((stat) => (
                    <div
                      key={stat.label}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800"
                    >
                      <div className="text-[10px] text-slate-400">{stat.label}</div>
                      <div className="text-xs sm:text-sm font-bold text-white tabular-nums mt-0.5">
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1">
                  <div className="text-[11px] font-mono font-bold text-amber-300">
                    WHEN &amp; WHY IT KEEPS YOU ALIVE
                  </div>
                  <p className="text-slate-200 leading-relaxed">{activeTopic.whyImportant}</p>
                  <p className="text-[11px] text-slate-400">Timing: {activeTopic.whenLabel}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1">
                  <div className="text-[11px] font-mono font-bold text-cyan-300">
                    HOW IT WORKS + EDUCATOR DISCUSSION
                  </div>
                  <p className="text-slate-200 leading-relaxed">{activeTopic.howItWorks}</p>
                  <p className="text-[11px] text-emerald-300">
                    Educator Idea: {activeTopic.educatorTip}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: MULTI-PATTERN QUIZ ARCADE */}
      {mode === 'quiz' && (
        <div className="space-y-4">
          {/* Quiz Game Pattern Selector + Topic Scope */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-400 mr-1">QUIZ PATTERN:</span>
              {(
                [
                  { id: 'mixed', label: '★ All 4 Patterns Mix' },
                  { id: 'multiple_choice', label: 'Scenario Choice' },
                  { id: 'myth_buster', label: 'Fact vs. Myth' },
                  { id: 'balance_slider', label: 'kW / Food Sliders' },
                  { id: 'sequence_order', label: 'Order Builder' },
                ] as const
              ).map((pat) => (
                <button
                  key={pat.id}
                  type="button"
                  onClick={() => startFreshRound(pat.id, 'all', roundSeed + 1)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    patternFilter === pat.id
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  {pat.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono text-amber-300 tabular-nums">
              Challenge {Math.min(questionIdx + 1, roundQuestions.length)}/{roundQuestions.length} ·
              Round Marks +{roundMarks}
            </div>
          </div>

          {/* Active Question Stage */}
          {!isRoundFinished && currentQuestion && (
            <div className="p-5 rounded-2xl bg-[#090E1A] border-2 border-cyan-500/40 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <span className="text-amber-300 font-bold">
                  MODE: {PATTERN_LABEL_MAP[currentQuestion.pattern]}
                </span>
                <span className="text-cyan-300">
                  Reward: +{currentQuestion.baseMarks} Marks (+Streak Bonus)
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                {currentQuestion.prompt}
              </h3>

              {/* PATTERN 1: MULTIPLE CHOICE SCENARIO */}
              {currentQuestion.pattern === 'multiple_choice' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentQuestion.options.map((opt, idx) => {
                    const isCorrectOpt = idx === currentQuestion.correctIndex;
                    const disabled = answeredResult !== null;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={disabled}
                        onClick={() => submitAnswer(idx === currentQuestion.correctIndex)}
                        className={`p-3.5 rounded-xl border-2 text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                          answeredResult
                            ? isCorrectOpt
                              ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-cyan-400 text-white'
                        }`}
                      >
                        <span className="font-mono text-amber-300 mr-2">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* PATTERN 2: MYTH BUSTER (TRUE FACT VS SPACE MYTH) */}
              {currentQuestion.pattern === 'myth_buster' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-sm sm:text-base font-semibold text-cyan-100">
                    “{currentQuestion.statement}”
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={answeredResult !== null}
                      onClick={() => submitAnswer(currentQuestion.isFactTrue === true)}
                      className={`py-3.5 px-4 rounded-xl border-2 font-bold text-sm cursor-pointer transition-colors ${
                        answeredResult
                          ? currentQuestion.isFactTrue
                            ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                          : 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500/60 text-emerald-200'
                      }`}
                    >
                      ✓ SPACE FACT (TRUE)
                    </button>
                    <button
                      type="button"
                      disabled={answeredResult !== null}
                      onClick={() => submitAnswer(currentQuestion.isFactTrue === false)}
                      className={`py-3.5 px-4 rounded-xl border-2 font-bold text-sm cursor-pointer transition-colors ${
                        answeredResult
                          ? !currentQuestion.isFactTrue
                            ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                          : 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-500/60 text-rose-200'
                      }`}
                    >
                      ✕ SPACE MYTH (FALSE)
                    </button>
                  </div>
                </div>
              )}

              {/* PATTERN 3: INTERACTIVE ENGINEERING BALANCE SLIDERS */}
              {currentQuestion.pattern === 'balance_slider' && (
                <BalanceSliderPanel
                  question={currentQuestion}
                  sliderA={sliderA}
                  sliderB={sliderB}
                  onChangeA={setSliderA}
                  onChangeB={setSliderB}
                  disabled={answeredResult !== null}
                  onSubmit={(passed, feedback) => submitAnswer(passed, feedback)}
                />
              )}

              {/* PATTERN 4: SEQUENCE ORDER BUILDER */}
              {currentQuestion.pattern === 'sequence_order' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-300">
                    Click steps in chronological order (1 → 2 → 3):
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {currentQuestion.shuffledItems.map((stepText) => {
                      const pickedIdx = sequencePicked.indexOf(stepText);
                      const isPicked = pickedIdx !== -1;
                      return (
                        <button
                          key={stepText}
                          type="button"
                          disabled={answeredResult !== null}
                          onClick={() => {
                            if (isPicked) {
                              setSequencePicked((prev) => prev.filter((x) => x !== stepText));
                            } else {
                              setSequencePicked((prev) => [...prev, stepText]);
                            }
                            spaceAudio.playBreakerClick(true);
                          }}
                          className={`p-3 rounded-xl border-2 text-left text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 cursor-pointer ${
                            isPicked
                              ? 'bg-amber-950/60 border-amber-400 text-amber-100'
                              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-white'
                          }`}
                        >
                          <span>{stepText}</span>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-950 font-mono text-xs text-amber-300 shrink-0 tabular-nums">
                            {isPicked ? `STEP ${pickedIdx + 1}` : 'Tap to pick'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={
                        answeredResult !== null ||
                        sequencePicked.length !== currentQuestion.correctOrder.length
                      }
                      onClick={() => {
                        const exact = currentQuestion.correctOrder.every(
                          (val, i) => sequencePicked[i] === val
                        );
                        submitAnswer(exact);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
                    >
                      Verify Protocol Order ({sequencePicked.length}/
                      {currentQuestion.correctOrder.length})
                    </button>
                    {sequencePicked.length > 0 && answeredResult === null && (
                      <button
                        type="button"
                        onClick={() => setSequencePicked([])}
                        className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
                      >
                        Reset Order
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Hint line before answering */}
              {!answeredResult && (
                <div className="text-xs text-slate-400 pt-1">
                  Hint: {currentQuestion.hint}
                </div>
              )}

              {/* Instant Science Feedback + Next Challenge CTA */}
              {answeredResult && (
                <div
                  className={`p-4 rounded-xl border-2 space-y-2 ${
                    answeredResult.correct
                      ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100'
                      : 'bg-amber-950/60 border-amber-400 text-amber-100'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-sm">
                      {answeredResult.correct
                        ? `★ Great Job! +${answeredResult.earnedMarks} Academy Marks`
                        : `Good Try! +${answeredResult.earnedMarks} Effort Marks — Check the Science:`}
                    </span>
                    <span className="text-[11px] font-mono text-cyan-300">
                      {currentQuestion.nasaCitation}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed">{answeredResult.message}</p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
                    >
                      {questionIdx + 1 >= roundQuestions.length
                        ? 'Finish Round & Claim Supplies →'
                        : 'Next Challenge →'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ROUND COMPLETE: CHOOSE SURVIVAL SUPPLY REWARD PACK! */}
          {isRoundFinished && (
            <div className="p-5 rounded-2xl bg-[#090E1A] border-2 border-emerald-400/70 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    QUIZ ROUND COMPLETE · {roundCorrectCount}/{roundQuestions.length} CHALLENGES MASTERED
                  </div>
                  <h3 className="text-xl font-bold text-white mt-0.5">
                    Choose a Survival Supply Drop for Your Outpost!
                  </h3>
                </div>
                <div className="text-xs font-mono text-slate-300">
                  Current Base: O2 {gameState.oxygen}% · Food {gameState.food}% · Rad{' '}
                  {gameState.radiationMsv}mSv
                </div>
              </div>

              {claimedPackTitle ? (
                <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-400 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-emerald-200">
                      ✓ Delivered: {claimedPackTitle}!
                    </div>
                    <div className="text-xs text-slate-200 mt-0.5">
                      Survival supplies &amp; Academy Science Marks have been added to your outpost HUD.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startFreshRound(patternFilter, 'all', roundSeed + 1)}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
                  >
                    Play Another Quiz Pack →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {SURVIVAL_SUPPLY_PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => handleClaimSupplyPack(pack.id)}
                      className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 text-left space-y-2 transition-all cursor-pointer"
                      style={{ borderColor: pack.accentColor }}
                    >
                      <div
                        className="text-sm font-bold"
                        style={{ color: pack.accentColor }}
                      >
                        {pack.title}
                      </div>
                      <div className="text-xs text-slate-200 font-mono">{pack.subtitle}</div>
                      <div className="text-xs font-bold text-amber-300 pt-1">
                        Click to Claim (+{roundMarks + ((isAlreadyDone || roundsClaimedCount > 0) ? 15 : pack.scienceBonus)} Marks) →
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface BalanceSliderPanelProps {
  question: BalanceSliderQuiz;
  sliderA: number;
  sliderB: number;
  onChangeA: (v: number) => void;
  onChangeB: (v: number) => void;
  disabled: boolean;
  onSubmit: (passed: boolean, feedback: string) => void;
}

const BalanceSliderPanel: React.FC<BalanceSliderPanelProps> = ({
  question,
  sliderA,
  sliderB,
  onChangeA,
  onChangeB,
  disabled,
  onSubmit,
}) => {
  const evalState = question.evaluate(sliderA, sliderB);
  return (
    <div className="space-y-3 p-4 rounded-xl bg-slate-900 border border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <span className="text-amber-300">{question.ruleDescription}</span>
        <span
          className={`font-bold tabular-nums ${
            evalState.passed ? 'text-emerald-400' : 'text-cyan-300'
          }`}
        >
          {evalState.liveMetricLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="academy-slider-a"
            className="flex items-center justify-between text-xs font-bold text-purple-300 mb-1"
          >
            <span>{question.sliderALabel}</span>
            <span className="font-mono tabular-nums">{sliderA}</span>
          </label>
          <input
            id="academy-slider-a"
            type="range"
            min={question.sliderAMin}
            max={question.sliderAMax}
            value={sliderA}
            disabled={disabled}
            onChange={(e) => onChangeA(Number(e.target.value))}
            className="w-full accent-purple-400 cursor-pointer"
          />
        </div>
        <div>
          <label
            htmlFor="academy-slider-b"
            className="flex items-center justify-between text-xs font-bold text-emerald-300 mb-1"
          >
            <span>{question.sliderBLabel}</span>
            <span className="font-mono tabular-nums">{sliderB}</span>
          </label>
          <input
            id="academy-slider-b"
            type="range"
            min={question.sliderBMin}
            max={question.sliderBMax}
            value={sliderB}
            disabled={disabled}
            onChange={(e) => onChangeB(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <span
          className={`text-xs font-semibold ${
            evalState.passed ? 'text-emerald-300' : 'text-amber-200'
          }`}
        >
          {evalState.feedback}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSubmit(evalState.passed, evalState.feedback)}
          className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
        >
          Lock Engineering Balance
        </button>
      </div>
    </div>
  );
};
