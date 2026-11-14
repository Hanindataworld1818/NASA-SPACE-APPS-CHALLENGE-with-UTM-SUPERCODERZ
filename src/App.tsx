import React, { useEffect, useState, useCallback } from 'react';
import {
  BUILTIN_DYNAMIC_EVENTS,
  CropPantryInventory,
  DailyLogEntry,
  DailyMilestone,
  DynamicMissionEvent,
  ForecastIconType,
  GameStateSnapshot,
  OUTPOST_ROOMS,
  PowerAllocation,
  RoomId,
  SCIENCE_BOT_SCAN_TARGET,
  SpaceKitchenRecipe,
  calculateSolOutcome,
  checkMissionOutcome,
  computeAvailablePowerKw,
  computeCrisisSeverity,
  consumeRecipeIngredients,
  createDailyLogEntry,
  createDailyMilestone,
  createInitialGameState,
  formatDailyLogsForSummary,
  formatMilestonesSummary,
  getAdaptiveMusicContextKey,
  getDonkiEventForSol,
  getThreeSolForecast,
  hasScienceBotBadge,
  upsertDailyLog,
} from './game/rules';
import {
  MISSION_SITES,
  MissionSiteId,
  OUTPOST_MAP_DESIGNS,
  OutpostMapVariant,
  getOutpostMapDesign,
} from './game/nasaData';
import { CADET_EMOTES, CadetEmoteId } from './game/crewAndCamera';
import { StationScanReport } from './game/wallE';
import { NearbyCrewInfo, OutpostCanvas, OutpostPropInteraction } from './components/OutpostCanvas';
import { WorkstationModal } from './components/WorkstationModal';
import { NasaDataModal } from './components/NasaDataModal';
import { EducatorYouthGuideModal } from './components/EducatorYouthGuideModal';
import { DynamicEventModal } from './components/DynamicEventModal';
import { CustomInstructionsModal } from './components/CustomInstructionsModal';
import { WallEBuddyCard } from './components/WallEBuddyCard';
import {
  CustomInstructionsData,
  DEFAULT_CUSTOM_INSTRUCTIONS,
  MissionLogInput,
  auth,
  listUserMissionLogsFromCloud,
  loadCustomInstructionsFromCloud,
  saveMissionLogToCloud,
  signInAstronaut,
} from './lib/firebase';
import { AdaptiveSoundtrackData, spaceAudio } from './game/audio';

type ShellState = 'title' | 'playing' | 'paused' | 'gameover';

interface RunEndSnapshot {
  outcome: 'victory' | 'defeat';
  reason: string;
  solReached: number;
  score: number;
  bestScore: number;
  oxygen: number;
  food: number;
  radiationMsv: number;
  tasksCompletedTotal: number;
  wallEScansCount: number;
  scienceBotEarned: boolean;
  milestones: DailyMilestone[];
}

interface SavedLogbookEntry extends MissionLogInput {
  id: string;
  savedAtLabel?: string;
}

const LOCAL_LOGBOOK_KEY = 'astrobase_mission_logbook_v1';

function readLocalLogbook(): SavedLogbookEntry[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_LOGBOOK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalLogbook(entries: SavedLogbookEntry[]): void {
  try {
    window.localStorage.setItem(LOCAL_LOGBOOK_KEY, JSON.stringify(entries.slice(0, 12)));
  } catch {
    // ignore storage quota errors
  }
}

const LOCAL_DAILY_LOGS_KEY = 'astrobase_daily_logs_v1';

function readLocalDailyLogs(): DailyLogEntry[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_DAILY_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalDailyLogs(entries: DailyLogEntry[]): void {
  try {
    window.localStorage.setItem(LOCAL_DAILY_LOGS_KEY, JSON.stringify(entries.slice(0, 28)));
  } catch {
    // ignore storage quota errors
  }
}

const CREW_SUIT_COLORS = [
  { name: 'Cyan Cadet', hex: '#38BDF8' },
  { name: 'Solar Red', hex: '#EF4444' },
  { name: 'Bio Lime', hex: '#10B981' },
  { name: 'Starlight Gold', hex: '#F59E0B' },
  { name: 'Nebula Violet', hex: '#A855F7' },
];

function renderForecastWeatherIcon(iconType: ForecastIconType) {
  if (iconType === 'quiet') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="5" fill="#FACC15" />
        <path
          d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"
          stroke="#FDE047"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (iconType === 'flare') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
        <path d="M13 2L4 14h7l-1 8 10-12h-7l0-8z" fill="#FB923C" stroke="#FDE68A" strokeWidth="1.2" />
      </svg>
    );
  }
  if (iconType === 'dust') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
        <path
          d="M4 9h11a2.5 2.5 0 10-2.5-2.5M3 13h15a2.5 2.5 0 11-2.5 2.5M6 17h9"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (iconType === 'cme') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
        <circle cx="7" cy="12" r="4" fill="#F97316" />
        <path
          d="M13 6c3 2.5 4.5 9.5 0 12M17 4c4 3.5 5.5 12.5 0 16"
          fill="none"
          stroke="#C084FC"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="#4C0519" stroke="#FB7185" strokeWidth="1.8" />
      <path d="M13 5L7 13h5l-1 6 6-8h-5l1-6z" fill="#FDA4AF" />
    </svg>
  );
}

export default function App() {
  const searchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isAutostart = searchParams?.get('autostart') === '1';
  const initialSiteParam: MissionSiteId = searchParams?.get('site') === 'moon' ? 'moon' : 'mars';
  const initialMapParam: OutpostMapVariant =
    searchParams?.get('map') === 'frontier' ? 'frontier' : 'classic';

  const [shellState, setShellState] = useState<ShellState>(isAutostart ? 'playing' : 'title');
  const [selectedSite, setSelectedSite] = useState<MissionSiteId>(initialSiteParam);
  const [selectedMapVariant, setSelectedMapVariant] =
    useState<OutpostMapVariant>(initialMapParam);
  const [crewColor, setCrewColor] = useState<string>('#38BDF8');
  const [gameState, setGameState] = useState<GameStateSnapshot>(() =>
    createInitialGameState(initialSiteParam, initialMapParam)
  );
  const [bestScore, setBestScore] = useState<number>(100);
  const [totalTasksDone, setTotalTasksDone] = useState<number>(0);

  // Active modals & overlays
  const [nearRoom, setNearRoom] = useState<RoomId | null>(null);
  const [nearProp, setNearProp] = useState<OutpostPropInteraction | null>(null);
  const [nearCrew, setNearCrew] = useState<NearbyCrewInfo | null>(null);
  const [joinCrewNonce, setJoinCrewNonce] = useState<number>(0);
  const [cadetEmoteCommand, setCadetEmoteCommand] = useState<{
    nonce: number;
    emote: CadetEmoteId;
  } | null>(null);
  const [checkedPropsToday, setCheckedPropsToday] = useState<string[]>([]);
  const [propActionToast, setPropActionToast] = useState<string>('');
  const [currentRoom, setCurrentRoom] = useState<RoomId | null>(null);
  const [activeModalRoom, setActiveModalRoom] = useState<RoomId | null>(null);
  const [adaptiveTrackTitle, setAdaptiveTrackTitle] = useState<string>('Starlight Spine Promenade');
  const adaptiveTrackCacheRef = React.useRef<Map<string, AdaptiveSoundtrackData>>(new Map());
  const latestMusicKeyRef = React.useRef<string>('');
  const [showNasaModal, setShowNasaModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState<boolean>(false);
  const [showDailyLogModal, setShowDailyLogModal] = useState<boolean>(false);
  const [showWallEModal, setShowWallEModal] = useState<boolean>(false);
  const [nearWallE, setNearWallE] = useState<boolean>(false);
  const [wallECommand, setWallECommand] = useState<{
    nonce: number;
    action: 'thank' | 'tidy' | 'dance' | 'tip' | 'scan';
    bubble?: string;
  } | null>(null);
  const [dancePartyUntil, setDancePartyUntil] = useState<number>(0);
  const [crewFeastUntil, setCrewFeastUntil] = useState<number>(0);
  const [activeDynamicEvent, setActiveDynamicEvent] = useState<DynamicMissionEvent | null>(null);
  const [solSummaryToast, setSolSummaryToast] = useState<{
    sol: number;
    oxygenDelta: number;
    foodDelta: number;
    radDelta: number;
    scienceDelta: number;
    tradeoffSummary: string;
    oxygenAfter: number;
    foodAfter: number;
    radAfter: number;
    scienceAfter: number;
    tasksCount: number;
    donkiClass: string;
  } | null>(null);
  const [quickDailyNote, setQuickDailyNote] = useState<string>('');
  const [dailyLogFeedback, setDailyLogFeedback] = useState<string>('');
  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>(() =>
    typeof window !== 'undefined' ? readLocalDailyLogs() : []
  );
  const [endSnapshot, setEndSnapshot] = useState<RunEndSnapshot | null>(null);
  const [dailyMilestones, setDailyMilestones] = useState<DailyMilestone[]>([]);
  const [lastSolEventNote, setLastSolEventNote] = useState<string | undefined>(undefined);
  const [logbookName, setLogbookName] = useState<string>('Junior Astronaut');
  const [logbookNote, setLogbookNote] = useState<string>('');
  const [logbookError, setLogbookError] = useState<string>('');
  const [logbookSaving, setLogbookSaving] = useState<boolean>(false);
  const [logbookSavedMsg, setLogbookSavedMsg] = useState<string>('');
  const [savedLogbookEntries, setSavedLogbookEntries] = useState<SavedLogbookEntry[]>(() =>
    typeof window !== 'undefined' ? readLocalLogbook() : []
  );
  const [signedInEmail, setSignedInEmail] = useState<string | null>(
    auth.currentUser?.email || null
  );
  const [muted, setMuted] = useState<boolean>(false);
  const [customInstructions, setCustomInstructions] = useState<CustomInstructionsData>(
    DEFAULT_CUSTOM_INSTRUCTIONS
  );

  // Sync document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = shellState;
  }, [shellState]);

  // Load saved custom instructions & cloud mission logs on Firebase auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setSignedInEmail(u?.email || null);
      if (u) {
        if (u.displayName) setLogbookName(u.displayName);
        loadCustomInstructionsFromCloud()
          .then((loaded) => {
            if (loaded) setCustomInstructions(loaded);
          })
          .catch(() => {});
        listUserMissionLogsFromCloud()
          .then((cloudEntries) => {
            if (cloudEntries.length > 0) {
              setSavedLogbookEntries((prev) => {
                const seen = new Set(cloudEntries.map((c) => c.id));
                const merged = [...cloudEntries, ...prev.filter((p) => !seen.has(p.id))];
                return merged.slice(0, 12);
              });
            }
          })
          .catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  const startNewGame = useCallback(
    (siteOverride?: MissionSiteId, mapOverride?: OutpostMapVariant) => {
      const targetSite = siteOverride || selectedSite;
      const targetMap = mapOverride || selectedMapVariant;
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      document.body.dataset.state = 'playing';
      setShellState('playing');
      setGameState(createInitialGameState(targetSite, targetMap));
      setTotalTasksDone(0);
      setDailyMilestones([]);
      setLastSolEventNote(undefined);
      setActiveModalRoom(null);
      setShowNasaModal(false);
      setShowInstructionsModal(false);
      setShowWallEModal(false);
      setActiveDynamicEvent(null);
      setSolSummaryToast(null);
      setEndSnapshot(null);
      setDancePartyUntil(0);
      setCrewFeastUntil(0);
      setCheckedPropsToday([]);
      setPropActionToast('');
      setLogbookNote('');
      setLogbookError('');
      setLogbookSavedMsg('');
      spaceAudio.playSolAdvance();
    },
    [selectedMapVariant, selectedSite]
  );

  useEffect(() => {
    if (!propActionToast) return;
    const id = window.setTimeout(() => setPropActionToast(''), 4200);
    return () => window.clearTimeout(id);
  }, [propActionToast]);

  const triggerCrewDance = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e?.currentTarget) e.currentTarget.blur();
    setDancePartyUntil(Date.now() + 7000);
    spaceAudio.playSolAdvance();
  }, []);

  const toggleMute = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e?.currentTarget) e.currentTarget.blur();
    setMuted((prev) => {
      const next = !prev;
      spaceAudio.setMuted(next);
      return next;
    });
  }, []);

  const togglePause = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e?.currentTarget) e.currentTarget.blur();
      setShellState((prev) => {
        if (prev === 'playing') return 'paused';
        if (prev === 'paused') return 'playing';
        return prev;
      });
    },
    []
  );

  const handleRestart = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e?.currentTarget) e.currentTarget.blur();
      startNewGame(gameState.siteId, gameState.mapVariant);
    },
    [gameState.mapVariant, gameState.siteId, startNewGame]
  );

  // Keyboard shortcuts for Title start, Pause [P / Esc], Mute [M], Restart [R]
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (shellState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        startNewGame();
        return;
      }

      if (e.code === 'Escape') {
        if (activeModalRoom) {
          setActiveModalRoom(null);
          return;
        }
        if (showNasaModal) {
          setShowNasaModal(false);
          return;
        }
        if (showGuideModal) {
          setShowGuideModal(false);
          return;
        }
        if (showInstructionsModal) {
          setShowInstructionsModal(false);
          return;
        }
        if (showDailyLogModal) {
          setShowDailyLogModal(false);
          return;
        }
        if (showWallEModal) {
          setShowWallEModal(false);
          return;
        }
        if (activeDynamicEvent) {
          setActiveDynamicEvent(null);
          return;
        }
        if (shellState === 'playing' || shellState === 'paused') {
          togglePause();
        }
        return;
      }

      if (
        e.code === 'KeyP' &&
        !activeModalRoom &&
        !showNasaModal &&
        !showGuideModal &&
        !showInstructionsModal &&
        !showDailyLogModal &&
        !showWallEModal
      ) {
        if (shellState === 'playing' || shellState === 'paused') {
          togglePause();
        }
      } else if (
        e.code === 'KeyM' &&
        !activeModalRoom &&
        !showGuideModal &&
        !showInstructionsModal &&
        !showDailyLogModal &&
        !showWallEModal
      ) {
        toggleMute();
      } else if (
        e.code === 'KeyR' &&
        shellState === 'playing' &&
        !activeModalRoom &&
        !showGuideModal &&
        !showDailyLogModal &&
        !showWallEModal
      ) {
        handleRestart();
      } else if (
        e.code === 'KeyG' &&
        shellState === 'playing' &&
        !activeModalRoom &&
        !showGuideModal &&
        !showInstructionsModal &&
        !showDailyLogModal &&
        !showWallEModal &&
        !showNasaModal &&
        !activeDynamicEvent
      ) {
        triggerCrewDance();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    shellState,
    activeModalRoom,
    showNasaModal,
    showGuideModal,
    showInstructionsModal,
    showDailyLogModal,
    showWallEModal,
    activeDynamicEvent,
    startNewGame,
    togglePause,
    toggleMute,
    handleRestart,
    triggerCrewDance,
  ]);

  const handleUpdatePower = (newAlloc: PowerAllocation) => {
    setGameState((prev) => ({
      ...prev,
      powerAllocation: newAlloc,
    }));
  };

  const handleCompleteTask = (
    roomId: RoomId,
    deltas: {
      oxygen?: number;
      food?: number;
      radiationMsv?: number;
      science?: number;
      bonusPowerKw?: number;
      pantryDelta?: Partial<CropPantryInventory>;
    }
  ) => {
    spaceAudio.playTaskComplete();
    if (!gameState.completedTasksToday.includes(roomId)) {
      setTotalTasksDone((c) => c + 1);
    }
    const nextExpectedScore = gameState.scienceScore + (deltas.science || 20);
    if (nextExpectedScore > bestScore) setBestScore(nextExpectedScore);

    setGameState((prev) => {
      if (prev.completedTasksToday.includes(roomId)) return prev;
      const nextBonusKw = prev.bonusPowerKw + (deltas.bonusPowerKw || 0);
      const nextAvailableKw = computeAvailablePowerKw(prev.siteId, prev.sol, nextBonusKw);
      const nextScore = prev.scienceScore + (deltas.science || 20);
      const nextPantry: CropPantryInventory = { ...prev.pantry };
      let harvestedUnitsAdded = 0;
      if (deltas.pantryDelta) {
        (Object.keys(deltas.pantryDelta) as Array<keyof CropPantryInventory>).forEach((k) => {
          const add = deltas.pantryDelta?.[k] || 0;
          nextPantry[k] = Math.min(18, (nextPantry[k] || 0) + add);
          if (k !== 'h2oDrops' && add > 0) {
            harvestedUnitsAdded += add;
          }
        });
      }

      return {
        ...prev,
        oxygen: Math.max(0, Math.min(100, Math.round(prev.oxygen + (deltas.oxygen || 0)))),
        food: Math.max(0, Math.min(100, Math.round(prev.food + (deltas.food || 0)))),
        radiationMsv: Math.max(
          0,
          Number((prev.radiationMsv + (deltas.radiationMsv || 0)).toFixed(1))
        ),
        scienceScore: nextScore,
        bonusPowerKw: nextBonusKw,
        availablePowerKw: nextAvailableKw,
        pantry: nextPantry,
        cropsHarvestedTotal: prev.cropsHarvestedTotal + harvestedUnitsAdded,
        completedTasksToday: [...prev.completedTasksToday, roomId],
      };
    });
  };

  const handleAcademyBonusReward = useCallback(
    (
      deltas: {
        oxygen?: number;
        food?: number;
        radiationMsv?: number;
        science?: number;
        pantryDelta?: Partial<CropPantryInventory>;
      },
      toastNote: string
    ) => {
      spaceAudio.playTaskComplete();
      const addedSci = deltas.science || 5;
      const nextExpectedScore = gameState.scienceScore + addedSci;
      if (nextExpectedScore > bestScore) setBestScore(nextExpectedScore);

      setGameState((prev) => {
        const nextPantry: CropPantryInventory = { ...prev.pantry };
        if (deltas.pantryDelta) {
          (Object.keys(deltas.pantryDelta) as Array<keyof CropPantryInventory>).forEach((k) => {
            const add = deltas.pantryDelta?.[k] || 0;
            nextPantry[k] = Math.min(18, (nextPantry[k] || 0) + add);
          });
        }
        return {
          ...prev,
          oxygen: Math.max(0, Math.min(100, Math.round(prev.oxygen + (deltas.oxygen || 0)))),
          food: Math.max(0, Math.min(100, Math.round(prev.food + (deltas.food || 0)))),
          radiationMsv: Math.max(
            0,
            Number((prev.radiationMsv + (deltas.radiationMsv || 0)).toFixed(1))
          ),
          scienceScore: prev.scienceScore + addedSci,
          pantry: nextPantry,
        };
      });
      setPropActionToast(`🎓 ${toastNote}`);
    },
    [bestScore, gameState.scienceScore]
  );

  const handleForageStarterSprouts = () => {
    spaceAudio.playBreakerClick(true);
    setGameState((prev) => ({
      ...prev,
      cropsHarvestedTotal: prev.cropsHarvestedTotal + 6,
      pantry: {
        mizuna: Math.min(18, prev.pantry.mizuna + 1),
        wheat: Math.min(18, prev.pantry.wheat + 1),
        radish: Math.min(18, prev.pantry.radish + 1),
        berries: Math.min(18, prev.pantry.berries + 1),
        microgreens: Math.min(18, prev.pantry.microgreens + 1),
        spirulina: Math.min(18, prev.pantry.spirulina + 1),
        h2oDrops: Math.min(18, prev.pantry.h2oDrops + 2),
      },
    }));
  };

  const handleInteractOutpostProp = useCallback(
    (prop: OutpostPropInteraction) => {
      if (prop.id === 'lounge-dance') {
        setDancePartyUntil(Date.now() + 7000);
        spaceAudio.playSolAdvance();
        setPropActionToast('💃 Neon Dance Pad Party started with Han, Feng, Xin & Kun!');
        return;
      }

      const alreadyChecked = checkedPropsToday.includes(prop.id);

      if (prop.id === 'lounge-eat') {
        spaceAudio.playTaskComplete();
        setCrewFeastUntil(Date.now() + 7000);
        if (!alreadyChecked) {
          setCheckedPropsToday((prev) => [...prev, prop.id]);
          const nextExpectedScore = gameState.scienceScore + 10;
          if (nextExpectedScore > bestScore) setBestScore(nextExpectedScore);
          setGameState((prev) => ({
            ...prev,
            food: Math.min(100, prev.food + 5),
            oxygen: Math.min(100, prev.oxygen + 2),
            scienceScore: prev.scienceScore + 10,
          }));
          setPropActionToast('🍽️ Crew Dining Table snack enjoyed! (+5% Food, +2% O2, +10 Science)');
        } else {
          setPropActionToast('🍽️ Relaxing snack break in Crew Mess Lounge!');
        }
        return;
      }

      if (prop.id === 'lounge-rest') {
        spaceAudio.playTaskComplete();
        if (!alreadyChecked) {
          setCheckedPropsToday((prev) => [...prev, prop.id]);
          setGameState((prev) => ({
            ...prev,
            radiationMsv: Math.max(0, Number((prev.radiationMsv - 2.0).toFixed(1))),
            oxygen: Math.min(100, prev.oxygen + 3),
          }));
          setPropActionToast('💤 Recharged in Rest Pod Alpha! (-2.0 mSv calm rest, +3% O2)');
        } else {
          setPropActionToast('💤 Cozy zero-G nap break in Sleep Pod!');
        }
        return;
      }

      // Exterior Satellites, Solar Wing & Cargo Rover inspect/clean
      if (!alreadyChecked) {
        const scienceGain = prop.id === 'prop-solar' ? 15 : prop.id === 'prop-rover' ? 10 : 12;
        spaceAudio.playTaskComplete();
        setCheckedPropsToday((prev) => [...prev, prop.id]);
        const nextExpectedScore = gameState.scienceScore + scienceGain;
        if (nextExpectedScore > bestScore) setBestScore(nextExpectedScore);
        setGameState((prev) => ({
          ...prev,
          scienceScore: prev.scienceScore + scienceGain,
        }));
        setPropActionToast(`🛰️ ${prop.label} cleaned & checked! (+${scienceGain} Science)`);
      } else {
        spaceAudio.playBreakerClick(true);
        setPropActionToast(`✓ ${prop.label} already calibrated today — telemetry nominal!`);
      }
    },
    [bestScore, checkedPropsToday, gameState.scienceScore]
  );

  const handleCookAndFeedCrew = (recipe: SpaceKitchenRecipe) => {
    spaceAudio.playTaskComplete();
    if (!gameState.completedTasksToday.includes('foodlab')) {
      setTotalTasksDone((c) => c + 1);
    }
    const nextExpectedScore = gameState.scienceScore + recipe.rewards.science;
    if (nextExpectedScore > bestScore) setBestScore(nextExpectedScore);

    setGameState((prev) => {
      const nextPantry = consumeRecipeIngredients(prev.pantry, recipe);
      const alreadyDone = prev.completedTasksToday.includes('foodlab');
      return {
        ...prev,
        oxygen: Math.max(0, Math.min(100, Math.round(prev.oxygen + recipe.rewards.oxygen))),
        food: Math.max(0, Math.min(100, Math.round(prev.food + recipe.rewards.food))),
        scienceScore: prev.scienceScore + recipe.rewards.science,
        pantry: nextPantry,
        mealsCookedTotal: prev.mealsCookedTotal + 1,
        completedTasksToday: alreadyDone
          ? prev.completedTasksToday
          : [...prev.completedTasksToday, 'foodlab'],
      };
    });
    setCrewFeastUntil(Date.now() + 12000);
  };

  const triggerRandomDynamicEvent = () => {
    spaceAudio.playEmergencyAlert();
    const idx = (gameState.sol - 1) % BUILTIN_DYNAMIC_EVENTS.length;
    setActiveDynamicEvent(BUILTIN_DYNAMIC_EVENTS[idx]);
  };

  const handleResolveDynamicEvent = (choice: DynamicMissionEvent['optionA']) => {
    setActiveDynamicEvent(null);
    setLastSolEventNote(choice.label);
    setGameState((prev) => {
      const nextBonus = prev.bonusPowerKw + (choice.deltas.bonusPowerKw || 0);
      const nextState: GameStateSnapshot = {
        ...prev,
        oxygen: Math.max(0, Math.min(100, Math.round(prev.oxygen + choice.deltas.oxygen))),
        food: Math.max(0, Math.min(100, Math.round(prev.food + choice.deltas.food))),
        radiationMsv: Math.max(
          0,
          Number((prev.radiationMsv + choice.deltas.radiationMsv).toFixed(1))
        ),
        scienceScore: Math.max(0, prev.scienceScore + choice.deltas.science),
        bonusPowerKw: nextBonus,
        availablePowerKw: computeAvailablePowerKw(prev.siteId, prev.sol, nextBonus),
        dailyEventResolved: true,
      };

      const check = checkMissionOutcome(nextState);
      if (check.status !== 'playing') {
        const finalBest = Math.max(bestScore, nextState.scienceScore);
        setBestScore(finalBest);
        const finalMilestone = createDailyMilestone(nextState, choice.label);
        const allMilestones = [...dailyMilestones, finalMilestone];
        setDailyMilestones(allMilestones);
        setEndSnapshot({
          outcome: check.status,
          reason: check.reason,
          solReached: prev.sol,
          score: nextState.scienceScore,
          bestScore: finalBest,
          oxygen: nextState.oxygen,
          food: nextState.food,
          radiationMsv: nextState.radiationMsv,
          tasksCompletedTotal: totalTasksDone,
          wallEScansCount: nextState.wallEScansCount,
          scienceBotEarned: hasScienceBotBadge(nextState.wallEScansCount),
          milestones: allMilestones,
        });
        setLogbookNote('');
        setLogbookError('');
        setLogbookSavedMsg('');
        setShellState('gameover');
      }
      return nextState;
    });
  };

  const handleAdvanceSol = () => {
    const proj = calculateSolOutcome(gameState);
    const nextSolNum = gameState.sol + 1;
    const nextAvailKw = computeAvailablePowerKw(
      gameState.siteId,
      Math.min(7, nextSolNum),
      0
    );

    // Clamp power allocation if next Sol has dust storm penalty
    let nextAlloc = { ...gameState.powerAllocation };
    while (
      nextAlloc.lifesupport + nextAlloc.shield + nextAlloc.hydroponics + nextAlloc.comms >
      nextAvailKw
    ) {
      if (nextAlloc.comms > 0) nextAlloc.comms--;
      else if (nextAlloc.hydroponics > 1) nextAlloc.hydroponics--;
      else if (nextAlloc.shield > 1) nextAlloc.shield--;
      else break;
    }

    const updatedState: GameStateSnapshot = {
      ...gameState,
      sol: nextSolNum,
      oxygen: proj.nextOxygen,
      food: proj.nextFood,
      radiationMsv: proj.nextRadiationMsv,
      scienceScore: proj.nextScienceScore,
      bonusPowerKw: 0,
      availablePowerKw: nextAvailKw,
      powerAllocation: nextAlloc,
      completedTasksToday: [],
      dailyEventResolved: false,
    };

    const todayMilestone = createDailyMilestone(
      {
        ...gameState,
        oxygen: proj.nextOxygen,
        food: proj.nextFood,
        radiationMsv: proj.nextRadiationMsv,
        scienceScore: proj.nextScienceScore,
      },
      lastSolEventNote
    );
    const updatedMilestones = [...dailyMilestones, todayMilestone];
    setDailyMilestones(updatedMilestones);
    setLastSolEventNote(undefined);

    const finalBest = Math.max(bestScore, updatedState.scienceScore);
    setBestScore(finalBest);
    const outcome = checkMissionOutcome(updatedState);

    if (outcome.status !== 'playing') {
      const snap: RunEndSnapshot = {
        outcome: outcome.status,
        reason: outcome.reason,
        solReached: Math.min(7, gameState.sol),
        score: updatedState.scienceScore,
        bestScore: finalBest,
        oxygen: updatedState.oxygen,
        food: updatedState.food,
        radiationMsv: updatedState.radiationMsv,
        tasksCompletedTotal: totalTasksDone,
        wallEScansCount: updatedState.wallEScansCount,
        scienceBotEarned: hasScienceBotBadge(updatedState.wallEScansCount),
        milestones: updatedMilestones,
      };
      setGameState({ ...updatedState, sol: Math.min(7, gameState.sol) });
      setSolSummaryToast(null);
      setEndSnapshot(snap);
      setLogbookNote('');
      setLogbookError('');
      setLogbookSavedMsg('');
      setShellState('gameover');
      spaceAudio.playSolAdvance();
      return;
    }

    spaceAudio.playSolAdvance();
    setGameState(updatedState);
    setCheckedPropsToday([]);
    setPropActionToast('');
    setQuickDailyNote('');
    setDailyLogFeedback('');
    setSolSummaryToast({
      sol: gameState.sol,
      oxygenDelta: proj.oxygenDelta,
      foodDelta: proj.foodDelta,
      radDelta: proj.radiationDeltaMsv,
      scienceDelta: proj.scienceDelta,
      tradeoffSummary: proj.tradeoffSummary,
      oxygenAfter: proj.nextOxygen,
      foodAfter: proj.nextFood,
      radAfter: proj.nextRadiationMsv,
      scienceAfter: proj.nextScienceScore,
      tasksCount: gameState.completedTasksToday.length,
      donkiClass: getDonkiEventForSol(gameState.sol).classType,
    });

    // Trigger a dynamic trade-off decision event on even Sols (Sol 2, 4, 6)
    if (nextSolNum % 2 === 0) {
      const evtIdx = (nextSolNum / 2 - 1) % BUILTIN_DYNAMIC_EVENTS.length;
      setActiveDynamicEvent(BUILTIN_DYNAMIC_EVENTS[evtIdx]);
    }
  };

  const handleSaveQuickDailyLog = (e: React.FormEvent, customTargetSol?: number) => {
    e.preventDefault();
    const cleanNote = quickDailyNote.trim();
    if (!cleanNote) {
      setDailyLogFeedback('Write a short sentence about today’s Sol first!');
      return;
    }

    const targetSol = customTargetSol ?? solSummaryToast?.sol ?? gameState.sol;
    const entry = createDailyLogEntry({
      sol: targetSol,
      siteId: gameState.siteId,
      donkiClass: solSummaryToast?.donkiClass || getDonkiEventForSol(targetSol).classType,
      oxygen: solSummaryToast ? solSummaryToast.oxygenAfter : gameState.oxygen,
      food: solSummaryToast ? solSummaryToast.foodAfter : gameState.food,
      radiationMsv: solSummaryToast ? solSummaryToast.radAfter : gameState.radiationMsv,
      scienceScore: solSummaryToast ? solSummaryToast.scienceAfter : gameState.scienceScore,
      tasksCompletedCount: solSummaryToast
        ? solSummaryToast.tasksCount
        : gameState.completedTasksToday.length,
      note: cleanNote,
    });

    const nextLogs = upsertDailyLog(dailyLogs, entry);
    setDailyLogs(nextLogs);
    writeLocalDailyLogs(nextLogs);
    setQuickDailyNote('');
    setDailyLogFeedback(`✓ Saved Sol ${entry.sol} log to local mission history!`);
    spaceAudio.playTaskComplete();
  };

  const handleSaveLogbookEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endSnapshot) return;
    const cleanNote = logbookNote.trim();
    if (!cleanNote) {
      setLogbookError('Please write a short mission note or observation before saving!');
      return;
    }

    setLogbookError('');
    setLogbookSaving(true);
    const cleanName = logbookName.trim().slice(0, 60) || 'Junior Astronaut';
    const dailyLogDigest = formatDailyLogsForSummary(dailyLogs);
    const baseSummary = formatMilestonesSummary(endSnapshot.milestones);
    const badgeDigest = endSnapshot.scienceBotEarned
      ? '🏅 Badge: Science Bot'
      : `🤖 Scans: ${endSnapshot.wallEScansCount}/${SCIENCE_BOT_SCAN_TARGET}`;
    const fullBase = baseSummary ? `${baseSummary} | ${badgeDigest}` : badgeDigest;
    const milestonesSummary = (
      dailyLogDigest ? `${fullBase} | Daily Logs: ${dailyLogDigest}` : fullBase
    ).slice(0, 500);
    const payload: MissionLogInput = {
      astronautName: cleanName,
      siteId: gameState.siteId,
      solReached: Math.max(1, Math.min(7, endSnapshot.solReached)),
      score: endSnapshot.score,
      oxygenRemaining: endSnapshot.oxygen,
      radiationMsv: endSnapshot.radiationMsv,
      outcome: endSnapshot.outcome,
      summaryNote: `${cleanNote.slice(0, 220)} | ${milestonesSummary}`.slice(0, 500),
      milestonesSummary,
      personalNote: cleanNote.slice(0, 400),
    };

    const localEntry: SavedLogbookEntry = {
      ...payload,
      id: `local_${Date.now()}`,
      savedAtLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextLocal = [localEntry, ...readLocalLogbook()].slice(0, 12);
    writeLocalLogbook(nextLocal);
    setSavedLogbookEntries((prev) => [localEntry, ...prev].slice(0, 12));

    try {
      if (auth.currentUser) {
        await saveMissionLogToCloud(payload);
        const cloudLogs = await listUserMissionLogsFromCloud();
        if (cloudLogs.length > 0) {
          setSavedLogbookEntries(cloudLogs.slice(0, 12));
        }
        setLogbookSavedMsg('Saved to Mission Logbook & Cloud Database!');
      } else {
        setLogbookSavedMsg('Saved to Mission Logbook on this device!');
      }
      setLogbookNote('');
      spaceAudio.playTaskComplete();
    } catch {
      setLogbookSavedMsg('Saved locally to Mission Logbook!');
    } finally {
      setLogbookSaving(false);
    }
  };

  const currentDonki = getDonkiEventForSol(gameState.sol);
  const threeSolForecast = getThreeSolForecast(gameState.sol, gameState.maxSols);
  const currentSiteConfig = MISSION_SITES[gameState.siteId];
  const currentMapDesign = getOutpostMapDesign(gameState.siteId, gameState.mapVariant);
  const nearRoomObj = OUTPOST_ROOMS.find((r) => r.id === nearRoom);
  const effectiveMusicRoom = activeModalRoom ?? currentRoom;
  const crisisSeverity = computeCrisisSeverity(gameState, activeDynamicEvent !== null);
  const totalAllocatedKw =
    gameState.powerAllocation.lifesupport +
    gameState.powerAllocation.shield +
    gameState.powerAllocation.hydroponics +
    gameState.powerAllocation.comms;

  // Adaptive Room & Crisis AI Background Music Effect
  useEffect(() => {
    if (shellState !== 'playing' || muted) {
      if (!spaceAudio.isManualJukeboxActive()) {
        spaceAudio.stopMusic(false);
      }
      return;
    }

    const roomKey = effectiveMusicRoom || 'corridor';
    const contextKey = getAdaptiveMusicContextKey(effectiveMusicRoom, crisisSeverity);
    latestMusicKeyRef.current = contextKey;

    const cached = adaptiveTrackCacheRef.current.get(contextKey);
    if (cached) {
      setAdaptiveTrackTitle(cached.title);
      spaceAudio.playAdaptiveSoundtrack(contextKey, cached);
      return;
    }

    // Immediate room-aware starter motif while Gemini composes custom AI soundtrack
    const roomLabel =
      OUTPOST_ROOMS.find((r) => r.id === effectiveMusicRoom)?.shortLabel || 'Command Spine';
    const immediateMotif: AdaptiveSoundtrackData = {
      title:
        crisisSeverity === 'critical'
          ? `CRISIS: ${roomLabel}`
          : crisisSeverity === 'caution'
          ? `Caution: ${roomLabel}`
          : `${roomLabel} Theme`,
      bpm: crisisSeverity === 'critical' ? 136 : crisisSeverity === 'caution' ? 116 : 98,
      synthWave: crisisSeverity === 'critical' ? 'sawtooth' : 'triangle',
      melodyNotes:
        crisisSeverity === 'critical'
          ? [64, 65, 69, 71, 72, 71, 65, 64]
          : roomKey === 'hydroponics'
          ? [62, 66, 69, 74, 73, 69, 66, 62]
          : roomKey === 'foodlab'
          ? [65, 69, 72, 76, 74, 72, 69, 67]
          : roomKey === 'shield'
          ? [57, 60, 64, 69, 67, 64, 60, 59]
          : roomKey === 'academy'
          ? [64, 67, 72, 76, 74, 72, 67, 64]
          : [60, 64, 67, 72, 71, 67, 64, 62],
      bassNotes: crisisSeverity === 'critical' ? [36, 36, 37, 40] : [36, 41, 43, 36],
      padNotes: [48, 55, 60],
    };
    setAdaptiveTrackTitle(immediateMotif.title);
    spaceAudio.playAdaptiveSoundtrack(contextKey, immediateMotif);

    let aborted = false;
    fetch('/api/music/adaptive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: roomKey,
        severity: crisisSeverity,
        siteId: gameState.siteId,
        sol: gameState.sol,
        donkiClass: currentDonki.classType,
        customInstructions: customInstructions.customRules,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (aborted || !data || !Array.isArray(data.melodyNotes)) return;
        const aiTrack: AdaptiveSoundtrackData = {
          title: String(data.title || immediateMotif.title),
          source: String(data.source || 'gemini-adaptive'),
          bpm: Number(data.bpm) || immediateMotif.bpm,
          synthWave:
            data.synthWave === 'sawtooth' || data.synthWave === 'sine'
              ? data.synthWave
              : 'triangle',
          melodyNotes: data.melodyNotes,
          bassNotes: Array.isArray(data.bassNotes) ? data.bassNotes : immediateMotif.bassNotes,
          padNotes: Array.isArray(data.padNotes) ? data.padNotes : immediateMotif.padNotes,
        };
        adaptiveTrackCacheRef.current.set(contextKey, aiTrack);
        if (latestMusicKeyRef.current === contextKey && !spaceAudio.isManualJukeboxActive()) {
          setAdaptiveTrackTitle(aiTrack.title);
          spaceAudio.playAdaptiveSoundtrack(contextKey, aiTrack, true);
        }
      })
      .catch(() => {});

    return () => {
      aborted = true;
    };
  }, [
    shellState,
    muted,
    effectiveMusicRoom,
    crisisSeverity,
    gameState.siteId,
    gameState.sol,
    currentDonki.classType,
    customInstructions.customRules,
  ]);

  return (
    <main className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#070B14] select-none">
      {/* 1. Full-Viewport 60 FPS Outpost Canvas */}
      <OutpostCanvas
        gameState={gameState}
        shellState={shellState}
        activeModalRoom={activeModalRoom}
        onSelectRoom={(r) => setActiveModalRoom(r)}
        onNearRoomChange={setNearRoom}
        onNearPropChange={setNearProp}
        onNearCrewChange={setNearCrew}
        joinCrewNonce={joinCrewNonce}
        cadetEmoteCommand={cadetEmoteCommand}
        onInteractProp={handleInteractOutpostProp}
        checkedPropsToday={checkedPropsToday}
        onCurrentRoomChange={setCurrentRoom}
        isModalOpen={Boolean(
          activeModalRoom ||
            showNasaModal ||
            showGuideModal ||
            showInstructionsModal ||
            showDailyLogModal ||
            showWallEModal ||
            activeDynamicEvent
        )}
        crewColor={crewColor}
        dancePartyUntil={dancePartyUntil}
        crewFeastUntil={crewFeastUntil}
        onInteractWallE={() => setShowWallEModal(true)}
        onNearWallEChange={setNearWallE}
        wallECommand={wallECommand}
      />

      {/* 2. TITLE SCREEN OVERLAY (Negative-Space Composition + Custom Inline SVG Title Lockup) */}
      {shellState === 'title' && (
        <div className="fixed inset-0 z-30 flex flex-col justify-between p-6 sm:p-10 bg-gradient-to-r from-[#050811]/95 via-[#070B14]/85 to-[#070B14]/40 pointer-events-auto">
          {/* Top Attribution Line */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
            <span>
              2026 NASA SPACE APPS CHALLENGE · TEAM UTM SUPERCODERZ (HAN YAO HUI · LEE JUN FENG ·
              TAN YI KUN · GOH ZHI XIN)
            </span>
            <span>POWERED BY REAL NASA DONKI & OSDR DATA</span>
          </div>

          {/* Left-Third Focal Lockup over Calm Negative Space */}
          <div className="max-w-xl space-y-4 my-auto">
            {/* Custom Inline SVG Title Emblem */}
            <svg
              viewBox="0 0 540 120"
              className="w-full max-w-lg h-auto drop-shadow-lg"
              role="img"
              aria-label="AstroBase: Junior Astronaut Mission Trainer"
            >
              {/* Diegetic Metallic Mission Crest */}
              <rect
                x="4"
                y="8"
                width="104"
                height="104"
                rx="22"
                fill="#0F172A"
                stroke="#38BDF8"
                strokeWidth="3.5"
              />
              {/* Orbital Ring */}
              <ellipse
                cx="56"
                cy="60"
                rx="40"
                ry="16"
                transform="rotate(-24 56 60)"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="3"
              />
              {/* Cartoon Spaceman Astronaut Helmet Icon */}
              <circle
                cx="56"
                cy="60"
                r="24"
                fill="#F8FAFC"
                stroke="#020617"
                strokeWidth="3.5"
              />
              <rect
                x="41"
                y="76"
                width="30"
                height="8"
                rx="4"
                fill={crewColor}
                stroke="#020617"
                strokeWidth="2.5"
              />
              <ellipse
                cx="59"
                cy="59"
                rx="16"
                ry="13"
                fill="#0F172A"
                stroke="#020617"
                strokeWidth="2.5"
              />
              <ellipse cx="59" cy="60" rx="12" ry="9.5" fill="#FDBA74" />
              <circle cx="55" cy="58" r="2" fill="#0F172A" />
              <circle cx="64" cy="58" r="2" fill="#0F172A" />
              <path
                d="M55 63.5c2 2 6 2 8 0"
                fill="none"
                stroke="#7C2D12"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <ellipse cx="59" cy="59" rx="16" ry="13" fill="rgba(125,211,252,0.28)" />
              <ellipse cx="51" cy="52" rx="4.5" ry="2" transform="rotate(-25 51 52)" fill="#FFFFFF" />
              {/* Display Typography Lockup */}
              <text
                x="124"
                y="54"
                fill="#F8FAFC"
                fontFamily="Outfit, sans-serif"
                fontWeight="800"
                fontSize="44"
                letterSpacing="1"
              >
                ASTROBASE
              </text>
              <text
                x="126"
                y="84"
                fill="#38BDF8"
                fontFamily="Outfit, sans-serif"
                fontWeight="700"
                fontSize="19"
                letterSpacing="1.5"
              >
                JUNIOR ASTRONAUT MISSION TRAINER
              </text>
              <text
                x="126"
                y="105"
                fill="#94A3B8"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="500"
                fontSize="12"
              >
                7-SOL OUTPOST SURVIVAL · AGES 7–12 · REAL NASA SCIENCE
              </text>
            </svg>

            <p className="text-sm text-slate-200 leading-relaxed max-w-lg">
              Run your own space station like a real NASA Commander! Walk your crewmate between
              workstations, complete daily tasks, and balance{' '}
              <strong className="text-amber-400">Power</strong>,{' '}
              <strong className="text-sky-400">Oxygen</strong>,{' '}
              <strong className="text-emerald-400">Space Crops</strong>, and{' '}
              <strong className="text-purple-400">Solar Flare Shields</strong>.
            </p>

            {/* Outpost Destination Selector (Moon vs Mars) */}
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-slate-400">
                1. CHOOSE YOUR NASA MISSION OUTPOST:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(['mars', 'moon'] as const).map((siteKey) => {
                  const cfg = MISSION_SITES[siteKey];
                  const active = selectedSite === siteKey;
                  return (
                    <button
                      key={siteKey}
                      type="button"
                      onClick={() => {
                        setSelectedSite(siteKey);
                        setGameState(createInitialGameState(siteKey, selectedMapVariant));
                        spaceAudio.playBreakerClick(true);
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-slate-900/95 border-cyan-400 shadow-lg'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{cfg.name}</span>
                        <span className="text-xs font-mono text-cyan-400">
                          Delay: {cfg.commDelayMinutes}m
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{cfg.subtitle}</div>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">{cfg.kidSummary}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map Layout Variant Selector (Original Core vs New Ring Sector) */}
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-slate-400">
                2. CHOOSE OUTPOST MAP DESIGN ({MISSION_SITES[selectedSite].name.toUpperCase()}):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(['classic', 'frontier'] as const).map((variantKey) => {
                  const design = OUTPOST_MAP_DESIGNS[selectedSite][variantKey];
                  const active = selectedMapVariant === variantKey;
                  return (
                    <button
                      key={variantKey}
                      type="button"
                      data-testid={`map-design-${variantKey}`}
                      onClick={() => {
                        setSelectedMapVariant(variantKey);
                        setGameState(createInitialGameState(selectedSite, variantKey));
                        spaceAudio.playBreakerClick(true);
                      }}
                      className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-slate-900/95 border-amber-400 shadow-lg'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs sm:text-sm text-white">
                          {design.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono ${
                            variantKey === 'frontier' ? 'text-amber-300' : 'text-sky-300'
                          }`}
                        >
                          {design.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        {design.tagline}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Suit Color Picker */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400">3. CREWMATE SUIT:</span>
              <div className="flex items-center gap-2">
                {CREW_SUIT_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={`Select ${c.name} suit`}
                    onClick={() => setCrewColor(c.hex)}
                    className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${
                      crewColor === c.hex ? 'border-white scale-110' : 'border-slate-800'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Primary CTA + Secondary Actions */}
            <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
              <button
                type="button"
                data-start="true"
                onClick={() => startNewGame(selectedSite, selectedMapVariant)}
                className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-extrabold text-base tracking-wide shadow-lg cursor-pointer transition-transform active:scale-95 whitespace-nowrap shrink-0"
              >
                Start Mission [Enter]
              </button>
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="px-3.5 py-3 rounded-xl bg-amber-400/95 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap shrink-0"
              >
                🎓 Educator &amp; Youth Guide
              </button>
              <button
                type="button"
                onClick={() => setShowNasaModal(true)}
                className="px-3.5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs cursor-pointer whitespace-nowrap shrink-0"
              >
                NASA Open Data &amp; Charts
              </button>
              <button
                type="button"
                onClick={() => setShowInstructionsModal(true)}
                className="px-3.5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs cursor-pointer whitespace-nowrap shrink-0"
              >
                Custom Instructions &amp; Cloud
              </button>
            </div>
          </div>

          {/* Single flat borderless control hint line in the bottom safe margin */}
          <div className="text-xs font-mono text-slate-400">
            WASD / Arrows Move Crewmate · Click Room or Press E to Open Workstation · P or Esc Pause
            · M Mute
          </div>
        </div>
      )}

      {/* 3. ACTIVE GAMEPLAY HUD (Pointer-Events-None Wrapper, >= 85% Clear Viewport) */}
      {shellState !== 'title' && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-4">
          {/* Top Perimeter Row */}
          <div className="flex items-start justify-between gap-3">
            {/* Top-Left Cluster: Sol & Vitality Readouts (Hero-to-Kicker 2.5:1 Hierarchy, Tabular Numerals, SVG Icons) */}
            <div className="pointer-events-auto flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#090E1A]/92 border-2 border-slate-700/90 shadow-xl">
              {/* SOL COUNTER */}
              <div className="pr-3 border-r border-slate-800">
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 whitespace-nowrap">
                  {currentSiteConfig.id === 'mars' ? 'MARS SOL' : 'LUNAR DAY'} ·{' '}
                  <span className="text-slate-300">
                    {currentMapDesign.id === 'frontier' ? 'RING' : 'CORE'}
                  </span>
                </div>
                <div className="text-2xl font-extrabold font-mono text-white tabular-nums hud-stroke">
                  {Math.round(gameState.sol)}/{gameState.maxSols}
                </div>
              </div>

              {/* POWER GRID PIP SOCKET */}
              <button
                type="button"
                onClick={() => setActiveModalRoom('power')}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer text-left"
                aria-label="Open Power Grid Breaker Workstation"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0">
                  <circle cx="12" cy="12" r="10" fill="#020617" stroke="#F59E0B" strokeWidth="2" />
                  <path d="M13 3L6 14h6l-1 7 7-11h-6l1-7z" fill="#FBBF24" />
                </svg>
                <div>
                  <div className="text-[10px] font-mono uppercase text-amber-300">POWER</div>
                  <div className="text-xl font-bold font-mono text-white tabular-nums hud-stroke">
                    {Math.round(totalAllocatedKw)}/{Math.round(gameState.availablePowerKw)}kW
                  </div>
                </div>
              </button>

              {/* OXYGEN VITALITY */}
              <button
                type="button"
                onClick={() => setActiveModalRoom('lifesupport')}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer text-left"
                aria-label="Open Life Support Oxygen Workstation"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0">
                  <circle cx="12" cy="12" r="10" fill="#020617" stroke="#38BDF8" strokeWidth="2" />
                  <circle cx="10" cy="10" r="4" fill="#7DD3FC" />
                  <circle cx="15" cy="15" r="2.5" fill="#38BDF8" />
                </svg>
                <div>
                  <div className="text-[10px] font-mono uppercase text-sky-300">OXYGEN</div>
                  <div
                    className={`text-xl font-bold font-mono tabular-nums hud-stroke ${
                      gameState.oxygen <= 30 ? 'text-rose-400' : 'text-white'
                    }`}
                  >
                    {Math.round(gameState.oxygen)}%
                  </div>
                </div>
              </button>

              {/* FOOD / BIO-DOME VITALITY */}
              <button
                type="button"
                onClick={() => setActiveModalRoom('hydroponics')}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer text-left"
                aria-label="Open Hydroponic Bio-Dome Workstation"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0">
                  <circle cx="12" cy="12" r="10" fill="#020617" stroke="#10B981" strokeWidth="2" />
                  <path
                    d="M12 18V8m0 0c-3-3-6-1-6 2s3 3 6 0zm0 0c3-3 6-1 6 2s-3 3-6 0z"
                    stroke="#34D399"
                    strokeWidth="2"
                    fill="#10B981"
                  />
                </svg>
                <div>
                  <div className="text-[10px] font-mono uppercase text-emerald-300">FOOD</div>
                  <div
                    className={`text-xl font-bold font-mono tabular-nums hud-stroke ${
                      gameState.food <= 30 ? 'text-rose-400' : 'text-white'
                    }`}
                  >
                    {Math.round(gameState.food)}%
                  </div>
                </div>
              </button>

              {/* RADIATION DOSE (mSv) */}
              <button
                type="button"
                onClick={() => setActiveModalRoom('shield')}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer text-left"
                aria-label="Open Radiation Shield Vault Workstation"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0">
                  <circle cx="12" cy="12" r="10" fill="#020617" stroke="#A855F7" strokeWidth="2" />
                  <path d="M12 5l6 3v4c0 4-2.5 6.8-6 8-3.5-1.2-6-4-6-8V8l6-3z" fill="#C084FC" />
                </svg>
                <div>
                  <div className="text-[10px] font-mono uppercase text-purple-300">RAD DOSE</div>
                  <div
                    className={`text-xl font-bold font-mono tabular-nums hud-stroke ${
                      gameState.radiationMsv >= 40 ? 'text-rose-400' : 'text-white'
                    }`}
                  >
                    {Math.round(gameState.radiationMsv)}/{gameState.maxSafeRadiationMsv}mSv
                  </div>
                </div>
              </button>

              {/* SCIENCE SCORE */}
              <div className="pl-3 border-l border-slate-800">
                <div className="text-[10px] font-mono uppercase text-pink-300">SCIENCE</div>
                <div className="text-xl font-bold font-mono text-white tabular-nums hud-stroke">
                  {Math.round(gameState.scienceScore)}
                </div>
              </div>
            </div>

            {/* Top-Right Cluster: NASA DONKI 3-Sol Forecast + Utility Square SVG Buttons */}
            <div className="pointer-events-auto flex items-center justify-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowNasaModal(true)}
                aria-label="Open NASA DONKI 3-Sol Solar Forecast & Charts"
                className={`px-2.5 py-1.5 rounded-xl border-2 text-left transition-colors cursor-pointer ${
                  currentDonki.unshieldedDoseMsv >= 12
                    ? 'bg-rose-950/92 border-rose-500 text-rose-100'
                    : 'bg-[#090E1A]/92 border-cyan-500/60 text-cyan-100 hover:border-cyan-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[9px] font-mono uppercase text-cyan-300 mb-0.5">
                  <span>NASA DONKI · 3-SOL FORECAST</span>
                  <span className="text-slate-300">Charts ↗</span>
                </div>
                <div className="flex items-center gap-1">
                  {threeSolForecast.map((item) => {
                    const riskTone =
                      item.riskLevel === 'EXTREME'
                        ? 'text-rose-300 border-rose-500/60 bg-rose-950/60'
                        : item.riskLevel === 'HIGH'
                        ? 'text-amber-300 border-amber-500/50 bg-amber-950/40'
                        : item.riskLevel === 'MED'
                        ? 'text-orange-300 border-orange-500/50 bg-orange-950/40'
                        : 'text-emerald-300 border-slate-700 bg-slate-900/70';

                    return (
                      <div
                        key={item.sol}
                        title={`Sol ${item.sol}: ${item.title} — ${item.engineeringTradeoffHint}`}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border ${riskTone} ${
                          item.isToday ? 'ring-1 ring-cyan-400/70' : 'opacity-90'
                        }`}
                      >
                        {renderForecastWeatherIcon(item.iconType)}
                        <div className="leading-tight font-mono">
                          <div className="text-[9px] font-bold text-white tabular-nums">
                            {item.isToday ? `S${item.sol} NOW` : `S${item.sol}`} · {item.shortClass}
                          </div>
                          <div className="text-[8.5px] tabular-nums">
                            {item.powerPenaltyKw > 0
                              ? `-${item.powerPenaltyKw}kW`
                              : `${item.riskLevel} +${Math.round(item.unshieldedDoseMsv)}mSv`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </button>

              <button
                type="button"
                onClick={triggerRandomDynamicEvent}
                className="px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
                title="Trigger Dynamic Outpost Trade-Off Crisis"
              >
                🚨 Crisis
              </button>

              <button
                type="button"
                onClick={() => setShowInstructionsModal(true)}
                className="px-2.5 py-2 rounded-xl bg-[#090E1A]/92 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs cursor-pointer whitespace-nowrap"
              >
                ⚙️ AI
              </button>

              {/* Square SVG Icon Utility Buttons: Adaptive Audio [M], Pause [P], Restart [R] */}
              <button
                type="button"
                tabIndex={-1}
                aria-label={muted ? 'Unmute Audio [M]' : `Mute Audio [M] · ${adaptiveTrackTitle}`}
                title={`Adaptive BGM (${crisisSeverity.toUpperCase()}): ${adaptiveTrackTitle}`}
                onClick={toggleMute}
                className={`h-10 px-2 rounded-xl bg-[#090E1A]/92 hover:bg-slate-800 border flex items-center gap-1 cursor-pointer ${
                  crisisSeverity === 'critical' && !muted
                    ? 'border-rose-500 text-rose-200'
                    : crisisSeverity === 'caution' && !muted
                    ? 'border-amber-500/70 text-amber-200'
                    : 'border-slate-700 text-slate-200'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                  {muted ? (
                    <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                  ) : (
                    <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                  )}
                </svg>
                {!muted && (
                  <span
                    data-testid="adaptive-music-label"
                    className="hidden xl:inline text-[10px] font-mono max-w-[96px] truncate"
                  >
                    ♪ {adaptiveTrackTitle}
                  </span>
                )}
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Pause Game [P]"
                onClick={togglePause}
                className="w-10 h-10 rounded-xl bg-[#090E1A]/92 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Restart Mission [R]"
                onClick={handleRestart}
                className="w-10 h-10 rounded-xl bg-[#090E1A]/92 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Overnight Sol Report + Quick HUD Daily Log Capture */}
          {solSummaryToast && (
            <div className="pointer-events-auto self-center w-full max-w-2xl px-5 py-3.5 rounded-2xl bg-[#090E1A]/95 border-2 border-cyan-400 shadow-2xl space-y-2.5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-mono font-bold text-cyan-400">
                    ☀️ SOL {solSummaryToast.sol} OVERNIGHT REPORT · WELCOME TO SOL {gameState.sol}!
                  </div>
                  <div className="text-xs text-slate-200 mt-0.5">
                    O2 {solSummaryToast.oxygenDelta >= 0 ? '+' : ''}
                    {solSummaryToast.oxygenDelta}% · Food {solSummaryToast.foodDelta >= 0 ? '+' : ''}
                    {solSummaryToast.foodDelta}% · Rad +{solSummaryToast.radDelta}mSv · Science +
                    {solSummaryToast.scienceDelta}
                  </div>
                  <div className="text-[11px] text-amber-300 mt-0.5">
                    {solSummaryToast.tradeoffSummary}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSolSummaryToast(null)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer shrink-0"
                >
                  Close
                </button>
              </div>

              <form
                onSubmit={(e) => handleSaveQuickDailyLog(e, solSummaryToast.sol)}
                className="pt-2 border-t border-slate-800 space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="hud-quick-daily-log-input"
                    className="text-[11px] font-mono text-emerald-300 font-bold"
                  >
                    📓 QUICK DAILY LOG FOR SOL {solSummaryToast.sol}:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Saved power for O2 & crops',
                      'Raised Water Shield for solar flare',
                      'Cleaned solar dust & boosted Science',
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setQuickDailyNote(chip);
                          setDailyLogFeedback('');
                        }}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 cursor-pointer"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="hud-quick-daily-log-input"
                    type="text"
                    maxLength={200}
                    value={quickDailyNote}
                    onChange={(e) => {
                      setQuickDailyNote(e.target.value);
                      if (dailyLogFeedback) setDailyLogFeedback('');
                    }}
                    placeholder={`Record what you learned on Sol ${solSummaryToast.sol}...`}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
                  >
                    Save Daily Log
                  </button>
                </div>
                {dailyLogFeedback && (
                  <div className="text-[11px] font-mono text-emerald-300">{dailyLogFeedback}</div>
                )}
              </form>
            </div>
          )}

          {/* Compact Emote Chips + Bottom Perimeter Dock: Interactive Crewmate Task Bar + Dance + Guide + Daily Log + Next Sol */}
          <div>
            <div className="pointer-events-auto mb-1.5 flex items-center gap-1 w-fit px-2 py-1 rounded-xl bg-[#090E1A]/90 border border-slate-700/80 shadow-lg">
              <span className="text-[10px] font-mono font-bold text-slate-400 mr-0.5">
                EMOTE:
              </span>
              {CADET_EMOTES.map((em) => (
                <button
                  key={em.id}
                  type="button"
                  data-testid={`emote-btn-${em.id}`}
                  aria-label={`Play ${em.label} Emote [${em.keyHint}]`}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setCadetEmoteCommand({
                      nonce: Date.now() + Math.random(),
                      emote: em.id,
                    });
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-600/80 text-[11px] font-semibold text-slate-100 cursor-pointer whitespace-nowrap"
                >
                  {em.emoji} {em.label} <span className="text-slate-400 font-mono">[{em.keyHint}]</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="pointer-events-auto flex flex-wrap items-center gap-1 px-2 py-1.5 rounded-2xl bg-[#090E1A]/92 border-2 border-slate-700/90 shadow-xl">
                <span className="text-[11px] font-mono font-bold text-amber-400 mr-0.5">
                  TASKS ({gameState.completedTasksToday.length}/{OUTPOST_ROOMS.length}):
                </span>
              {OUTPOST_ROOMS.map((room) => {
                const done = gameState.completedTasksToday.includes(room.id);
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setActiveModalRoom(room.id)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      done
                        ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white'
                    }`}
                  >
                    {done ? `✓ ${room.shortLabel}` : `★ ${room.shortLabel}`}
                  </button>
                );
              })}
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5">
              {nearRoomObj ? (
                <button
                  type="button"
                  onClick={() => setActiveModalRoom(nearRoomObj.id)}
                  className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-extrabold text-xs shadow-lg cursor-pointer whitespace-nowrap"
                >
                  Use {nearRoomObj.shortLabel} [E]
                </button>
              ) : nearProp ? (
                <button
                  type="button"
                  onClick={() => handleInteractOutpostProp(nearProp)}
                  className="px-3 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-extrabold text-xs shadow-lg cursor-pointer whitespace-nowrap"
                >
                  {nearProp.label} [E]
                </button>
              ) : nearWallE ? (
                <button
                  type="button"
                  onClick={() => {
                    spaceAudio.playWallEChirp('happy');
                    setShowWallEModal(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-extrabold text-xs shadow-lg cursor-pointer whitespace-nowrap"
                >
                  🤖 Talk WALL·E [T]
                </button>
              ) : (
                nearCrew && (
                  <button
                    type="button"
                    onClick={() => setJoinCrewNonce((n) => n + 1)}
                    className="px-3 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display font-extrabold text-xs shadow-lg cursor-pointer whitespace-nowrap"
                  >
                    🤝 Join {nearCrew.name} [H]
                  </button>
                )
              )}

              <button
                type="button"
                onClick={triggerCrewDance}
                aria-label="Crew Dance Party [G]"
                className="px-2.5 py-2 rounded-xl bg-[#090E1A]/92 hover:bg-slate-800 border-2 border-pink-500/60 text-pink-300 font-bold text-xs shadow-lg cursor-pointer whitespace-nowrap"
              >
                💃 Dance [G]
              </button>

              <button
                type="button"
                onClick={() => {
                  spaceAudio.playWallEChirp('curious');
                  setShowWallEModal(true);
                }}
                aria-label="Open WALL-E Robot Companion"
                className="px-2.5 py-2 rounded-xl bg-[#090E1A]/92 hover:bg-slate-800 border-2 border-amber-400/70 text-amber-300 font-bold text-xs shadow-lg cursor-pointer whitespace-nowrap"
              >
                🤖 WALL·E
              </button>

              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                aria-label="Open Educator & Youth Astronaut Guide"
                className="px-2.5 py-2 rounded-xl bg-[#090E1A]/92 hover:bg-slate-800 border-2 border-amber-400/60 text-amber-300 font-bold text-xs shadow-lg cursor-pointer whitespace-nowrap"
              >
                🎓 Guide
              </button>

              <button
                type="button"
                onClick={() => {
                  setDailyLogFeedback('');
                  setShowDailyLogModal(true);
                }}
                aria-label={`Open Daily Log History (${dailyLogs.length} entries)`}
                className="px-2.5 py-2 rounded-xl bg-[#090E1A]/92 hover:bg-slate-800 border-2 border-emerald-500/60 text-emerald-300 font-bold text-xs shadow-lg cursor-pointer whitespace-nowrap"
              >
                📓 Log ({dailyLogs.length})
              </button>

              <button
                type="button"
                onClick={handleAdvanceSol}
                title="Sleep & Run Night Simulation"
                className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-extrabold text-xs sm:text-sm shadow-lg cursor-pointer whitespace-nowrap"
              >
                Next Sol →
              </button>
            </div>
          </div>
          </div>

          {/* Interactive Satellite / Lounge Action Toast */}
          {propActionToast && (
            <div
              role="status"
              data-testid="prop-action-toast"
              className="fixed bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-auto px-4 py-2 rounded-xl bg-[#090E1A]/95 border border-cyan-400/80 text-xs font-mono text-cyan-200 shadow-2xl whitespace-nowrap"
            >
              {propActionToast}
            </div>
          )}
        </div>
      )}

      {/* 4. WORKSTATION INTERACTIVE MODAL */}
      {activeModalRoom && shellState === 'playing' && (
        <WorkstationModal
          roomId={activeModalRoom}
          gameState={gameState}
          crewColor={crewColor}
          customInstructions={customInstructions}
          onClose={() => setActiveModalRoom(null)}
          onUpdatePower={handleUpdatePower}
          onCompleteTask={handleCompleteTask}
          onForageStarterSprouts={handleForageStarterSprouts}
          onCookAndFeedCrew={handleCookAndFeedCrew}
          onAcademyBonusReward={handleAcademyBonusReward}
          onTriggerEndSol={handleAdvanceSol}
        />
      )}

      {/* 5. NASA REAL OPEN DATA & CHARTS MODAL */}
      {showNasaModal && (
        <NasaDataModal gameState={gameState} onClose={() => setShowNasaModal(false)} />
      )}

      {/* 5b. EDUCATOR & YOUTH MISSION ACADEMY GUIDE */}
      {showGuideModal && (
        <EducatorYouthGuideModal
          isPlaying={shellState === 'playing'}
          onClose={() => setShowGuideModal(false)}
          onOpenRoomPractice={(r) => setActiveModalRoom(r)}
        />
      )}

      {/* 6. CUSTOM INSTRUCTIONS & CLOUD DATABASE MODAL */}
      {showInstructionsModal && (
        <CustomInstructionsModal
          instructions={customInstructions}
          gameState={gameState}
          onSaveInstructions={setCustomInstructions}
          onClose={() => setShowInstructionsModal(false)}
        />
      )}

      {/* 6a. WALL·E FRIENDLY ROBOT COMPANION MODAL */}
      {showWallEModal && shellState === 'playing' && (
        <WallEBuddyCard
          gameState={gameState}
          currentRoom={currentRoom ?? nearRoom}
          scansCount={gameState.wallEScansCount}
          onClose={() => setShowWallEModal(false)}
          onThankWallE={() => {
            const nextExpectedScore = gameState.scienceScore + 2;
            if (nextExpectedScore > bestScore) setBestScore(nextExpectedScore);
            setGameState((prev) => ({
              ...prev,
              scienceScore: prev.scienceScore + 2,
            }));
            setPropActionToast('💛 You thanked WALL-E! (+2 Science Marks & Kindness Boost!)');
          }}
          onScanStation={(report: StationScanReport) => {
            const nextCount = gameState.wallEScansCount + 1;
            const justUnlocked =
              !hasScienceBotBadge(gameState.wallEScansCount) && hasScienceBotBadge(nextCount);
            if (justUnlocked) {
              const nextBest = Math.max(bestScore, gameState.scienceScore + 10);
              setBestScore(nextBest);
            }
            setGameState((prev) => {
              const updatedCount = prev.wallEScansCount + 1;
              const unlockedNow =
                !hasScienceBotBadge(prev.wallEScansCount) && hasScienceBotBadge(updatedCount);
              return {
                ...prev,
                wallEScansCount: updatedCount,
                scienceScore: prev.scienceScore + (unlockedNow ? 10 : 0),
              };
            });
            setPropActionToast(
              justUnlocked
                ? '🏅 BADGE UNLOCKED: Science Bot! (10/10 WALL-E Scans Complete! +10 Sci)'
                : `🔍 WALL·E scanned ${report.roomName} (${nextCount}/${SCIENCE_BOT_SCAN_TARGET} Scans)`
            );
          }}
          onOpenSuggestedRoom={(roomId) => {
            setShowWallEModal(false);
            setActiveModalRoom(roomId);
          }}
          onSendWallEAction={(action, bubble) => {
            setWallECommand({
              nonce: Date.now() + Math.random(),
              action,
              bubble,
            });
          }}
        />
      )}

      {/* 6b. HUD DAILY LOG & LOCAL MISSION PROGRESS HISTORY MODAL */}
      {showDailyLogModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 pointer-events-auto"
          role="dialog"
          aria-label="Mission Daily Log History"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-[#0B1120] border-2 border-emerald-500/60 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-[#070B14] border-b border-slate-800">
              <div>
                <div className="text-xs font-mono text-emerald-400">
                  LOCAL MISSION PROGRESS HISTORY · SOL {gameState.sol} OF {gameState.maxSols}
                </div>
                <h2 className="text-xl font-bold font-display text-white">
                  📓 Astronaut Daily Mission Log
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDailyLogModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200 cursor-pointer"
              >
                Close [Esc]
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Science Bot Achievement Badge Progress Card */}
              <div
                data-testid="daily-log-science-bot-badge"
                className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                  hasScienceBotBadge(gameState.wallEScansCount)
                    ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border-cyan-500/40 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl" aria-hidden="true">
                    {hasScienceBotBadge(gameState.wallEScansCount) ? '🏅' : '🤖'}
                  </span>
                  <div>
                    <div className="text-xs font-bold">
                      {hasScienceBotBadge(gameState.wallEScansCount)
                        ? 'Science Bot Badge Earned!'
                        : 'Science Bot Achievement Badge'}
                    </div>
                    <div className="text-[11px] font-mono text-slate-300">
                      {hasScienceBotBadge(gameState.wallEScansCount)
                        ? `Awarded for completing ${gameState.wallEScansCount} WALL·E station scans this mission!`
                        : `Scan ${SCIENCE_BOT_SCAN_TARGET} stations with WALL·E across the 7-Sol mission (${gameState.wallEScansCount}/${SCIENCE_BOT_SCAN_TARGET})`}
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold ${
                    hasScienceBotBadge(gameState.wallEScansCount)
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-cyan-300'
                  }`}
                >
                  {gameState.wallEScansCount}/{SCIENCE_BOT_SCAN_TARGET} SCANS
                </span>
              </div>

              <form
                onSubmit={(e) => handleSaveQuickDailyLog(e, gameState.sol)}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="modal-daily-log-input"
                    className="text-xs font-bold text-emerald-300"
                  >
                    Write a Daily Log for Sol {gameState.sol} ({MISSION_SITES[gameState.siteId].name})
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    O2 {gameState.oxygen}% · Food {gameState.food}% · Rad {gameState.radiationMsv}mSv
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Allocated extra kW to Life Support O2',
                    'Pumped Water-Wall Shield for incoming flare',
                    'Planted & misted Bio-Dome greens',
                    'Cleaned EVA solar panels with rover brush',
                  ].map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => {
                        setQuickDailyNote(idea);
                        setDailyLogFeedback('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 hover:border-emerald-400 text-[11px] text-cyan-300 cursor-pointer"
                    >
                      + {idea}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    id="modal-daily-log-input"
                    type="text"
                    maxLength={240}
                    value={quickDailyNote}
                    onChange={(e) => {
                      setQuickDailyNote(e.target.value);
                      if (dailyLogFeedback) setDailyLogFeedback('');
                    }}
                    placeholder={`What happened on Sol ${gameState.sol}? Save a note...`}
                    className="flex-1 px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer whitespace-nowrap"
                  >
                    Save Sol {gameState.sol} Log
                  </button>
                </div>
                {dailyLogFeedback && (
                  <div className="text-xs font-mono text-emerald-300">{dailyLogFeedback}</div>
                )}
              </form>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    SAVED LOCAL PROGRESS HISTORY ({dailyLogs.length} ENTRIES)
                  </span>
                  {dailyLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDailyLogs([]);
                        writeLocalDailyLogs([]);
                      }}
                      className="text-[11px] font-mono text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      Clear Local History
                    </button>
                  )}
                </div>

                {dailyLogs.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-center">
                    No Daily Logs recorded yet! Write your first note above or right after clicking
                    Next Sol.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {dailyLogs.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                          <span className="font-bold text-cyan-300">
                            Sol {entry.sol} · {entry.siteId.toUpperCase()} · {entry.donkiClass}
                          </span>
                          <span className="text-slate-400">
                            {new Date(entry.createdAtIso).toLocaleDateString()} · {entry.tasksCompletedCount}/{OUTPOST_ROOMS.length} Tasks
                          </span>
                        </div>
                        <p className="text-sm text-white">“{entry.note}”</p>
                        <div className="text-[11px] font-mono text-slate-400">
                          O2 {entry.oxygen}% · Food {entry.food}% · Rad {entry.radiationMsv}mSv · Science {entry.scienceScore}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. DYNAMIC MISSION EVENT MODAL */}
      {activeDynamicEvent && shellState === 'playing' && (
        <DynamicEventModal
          event={activeDynamicEvent}
          gameState={gameState}
          customInstructions={customInstructions}
          onResolveChoice={handleResolveDynamicEvent}
          onReplaceEvent={setActiveDynamicEvent}
          onClose={() => setActiveDynamicEvent(null)}
        />
      )}

      {/* 8. PAUSE MODAL (`document.body.dataset.state = 'paused'`) */}
      {shellState === 'paused' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 pointer-events-auto"
          role="dialog"
          aria-label="Mission Paused"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#0F172A] border-2 border-slate-700 p-6 text-center space-y-5 shadow-2xl">
            <div className="text-xs font-mono text-cyan-400">OUTPOST STANDBY</div>
            <h2 className="text-3xl font-extrabold font-display text-white">Mission Paused</h2>
            <div className="grid grid-cols-3 gap-3 font-mono">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">SOL</div>
                <div className="text-lg font-bold text-white tabular-nums">
                  {gameState.sol}/{gameState.maxSols}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">OXYGEN</div>
                <div className="text-lg font-bold text-sky-400 tabular-nums">
                  {gameState.oxygen}%
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">SCIENCE</div>
                <div className="text-lg font-bold text-pink-400 tabular-nums">
                  {gameState.scienceScore}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setShellState('playing')}
                className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm cursor-pointer"
              >
                Resume Mission [P / Esc]
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer"
              >
                Restart Mission
              </button>
              <button
                type="button"
                onClick={() => setShellState('title')}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-sm cursor-pointer"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. VICTORY / GAME OVER MODAL WITH MISSION LOGBOOK (`document.body.dataset.state = 'gameover'`) */}
      {shellState === 'gameover' && endSnapshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 pointer-events-auto"
          role="dialog"
          aria-label={endSnapshot.outcome === 'victory' ? 'Mission Victory' : 'Mission Failed'}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-[#0F172A] border-2 border-cyan-500 p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="text-center space-y-1.5">
              <div className="text-xs font-mono text-cyan-400">
                {endSnapshot.outcome === 'victory'
                  ? '🏆 JUNIOR ASTRONAUT WINGS EARNED!'
                  : '⚠️ MISSION DEBRIEF & ENGINEERING LESSON'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white">
                {endSnapshot.outcome === 'victory'
                  ? '7-Sol Outpost Victory!'
                  : 'Outpost Emergency Abort'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">{endSnapshot.reason}</p>
            </div>

            {/* 3 Tabular-Nums Stat Tiles */}
            <div className="grid grid-cols-3 gap-3 font-mono text-center">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">SOL REACHED</div>
                <div className="text-lg sm:text-xl font-bold text-white tabular-nums">
                  {endSnapshot.solReached}/7
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">SCORE / BEST</div>
                <div className="text-lg sm:text-xl font-bold text-cyan-400 tabular-nums">
                  {endSnapshot.score} / {endSnapshot.bestScore}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">FINAL RAD DOSE</div>
                <div className="text-lg sm:text-xl font-bold text-purple-400 tabular-nums">
                  {Math.round(endSnapshot.radiationMsv)}mSv
                </div>
              </div>
            </div>

            {/* Achievement Badges Summary (Science Bot 10-Scan Badge) */}
            <div
              data-testid="gameover-science-bot-badge"
              className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                endSnapshot.scienceBotEarned
                  ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 text-left">
                <span className="text-2xl" aria-hidden="true">
                  {endSnapshot.scienceBotEarned ? '🏅' : '🤖'}
                </span>
                <div>
                  <div className="text-xs font-bold">
                    {endSnapshot.scienceBotEarned
                      ? 'ACHIEVEMENT UNLOCKED: Science Bot Badge!'
                      : 'Science Bot Badge (Locked)'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-300">
                    {endSnapshot.scienceBotEarned
                      ? `Awarded in Mission Log for ${endSnapshot.wallEScansCount} successful WALL·E scans!`
                      : `Completed ${endSnapshot.wallEScansCount}/${SCIENCE_BOT_SCAN_TARGET} WALL·E station scans during this 7-Sol mission.`}
                  </div>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold ${
                  endSnapshot.scienceBotEarned
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {endSnapshot.scienceBotEarned ? 'EARNED ✓' : `${endSnapshot.wallEScansCount}/${SCIENCE_BOT_SCAN_TARGET}`}
              </span>
            </div>

            {/* MISSION LOGBOOK SECTION: Daily Survival Milestones + Personal Observation Form */}
            <div className="p-4 rounded-2xl bg-[#090E1A] border border-slate-700/80 space-y-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold font-display text-white">
                    📓 Mission Logbook & Daily Survival Milestones
                  </h3>
                  <p className="text-xs text-slate-400">
                    Review your Sol-by-Sol survival milestones and record your personal observation!
                  </p>
                </div>
                {!signedInEmail ? (
                  <button
                    type="button"
                    onClick={() => signInAstronaut().catch(() => {})}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Sign In with Google for Cloud Sync
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-emerald-400">
                    Cloud Synced: {signedInEmail}
                  </span>
                )}
              </div>

              {/* Daily Milestones Timeline */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-cyan-400">
                  DAILY SURVIVAL MILESTONES ({endSnapshot.milestones.length} SOLS LOGGED)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {endSnapshot.milestones.map((m, idx) => (
                    <div
                      key={`${m.sol}-${idx}`}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-0.5"
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-white">Sol {m.sol}</span>
                        <span className="text-amber-300">{m.donkiClass}</span>
                      </div>
                      <div className="text-slate-300 font-mono text-[11px]">
                        O2 {m.oxygen}% · Food {m.food}% · Rad {m.radiationMsv}mSv · {m.tasksCompleted.length}/{OUTPOST_ROOMS.length} tasks
                      </div>
                      {m.eventDecision && (
                        <div className="text-cyan-300 text-[11px] truncate">
                          Choice: {m.eventDecision}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Personal Text Note / Observation Form */}
              <form onSubmit={handleSaveLogbookEntry} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label
                      htmlFor="logbook-callsign-input"
                      className="block text-[11px] font-mono text-slate-400 mb-1"
                    >
                      ASTRONAUT CALLSIGN
                    </label>
                    <input
                      id="logbook-callsign-input"
                      type="text"
                      value={logbookName}
                      onChange={(e) => setLogbookName(e.target.value)}
                      maxLength={60}
                      placeholder="Junior Astronaut"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                    />
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap items-end gap-1.5">
                    <span className="text-[11px] font-mono text-slate-400 w-full">
                      QUICK OBSERVATION STARTERS:
                    </span>
                    {[
                      'Shields saved us during the solar flare!',
                      'Hydroponics helped boost both food and oxygen!',
                      'Balancing power every night was tricky!',
                    ].map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => {
                          setLogbookNote(starter);
                          setLogbookError('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-cyan-300 cursor-pointer"
                      >
                        + {starter}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="logbook-note-textarea"
                    className="block text-[11px] font-mono text-slate-400 mb-1"
                  >
                    PERSONAL MISSION NOTE / OBSERVATION
                  </label>
                  <textarea
                    id="logbook-note-textarea"
                    rows={2}
                    maxLength={400}
                    value={logbookNote}
                    onChange={(e) => {
                      setLogbookNote(e.target.value);
                      if (logbookError) setLogbookError('');
                    }}
                    placeholder="Write what you discovered about balancing Power, Oxygen, Crops, or Radiation..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="submit"
                    disabled={logbookSaving}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
                  >
                    {logbookSaving ? 'Saving Entry...' : 'Save to Mission Logbook'}
                  </button>
                  {logbookError && (
                    <span role="alert" className="text-xs font-semibold text-rose-400">
                      {logbookError}
                    </span>
                  )}
                  {logbookSavedMsg && !logbookError && (
                    <span className="text-xs font-semibold text-emerald-400">
                      ✓ {logbookSavedMsg}
                    </span>
                  )}
                </div>
              </form>

              {/* Saved Logbook Entries List */}
              {savedLogbookEntries.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-mono text-slate-400">
                    MISSION LOGBOOK ARCHIVE ({savedLogbookEntries.length})
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {savedLogbookEntries.slice(0, 5).map((entry) => (
                      <div
                        key={entry.id}
                        className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-0.5"
                      >
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-cyan-300">
                            {entry.astronautName} · {entry.siteId.toUpperCase()} Sol {entry.solReached}
                          </span>
                          <span className="text-amber-300">{entry.score} pts</span>
                        </div>
                        <div className="text-white">
                          “{entry.personalNote || entry.summaryNote}”
                        </div>
                        {entry.milestonesSummary && (
                          <div className="text-[11px] text-slate-400 truncate">
                            {entry.milestonesSummary}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                data-start="true"
                onClick={() => startNewGame(gameState.siteId)}
                className="flex-1 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-extrabold text-base cursor-pointer"
              >
                {endSnapshot.outcome === 'victory' ? 'Play Again' : 'Try Again'}
              </button>
              <button
                type="button"
                onClick={() => setShellState('title')}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm cursor-pointer"
              >
                Title Screen
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
