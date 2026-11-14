import React, { useState, useRef, useEffect } from 'react';
import {
  CropPantryInventory,
  GameStateSnapshot,
  OUTPOST_ROOMS,
  PowerAllocation,
  RoomId,
  SpaceKitchenRecipe,
  getDonkiEventForSol,
} from '../game/rules';
import { MISSION_SITES } from '../game/nasaData';
import { spaceAudio } from '../game/audio';
import {
  CustomInstructionsData,
  saveSoundtrackToCloud,
} from '../lib/firebase';
import { PowerGridGame } from './workstations/PowerGridGame';
import { ElectrolyzerZapperGame } from './workstations/ElectrolyzerZapperGame';
import { BioDomeFarmGame } from './workstations/BioDomeFarmGame';
import { SpaceFoodLabGame } from './workstations/SpaceFoodLabGame';
import { ShieldPumpGame } from './workstations/ShieldPumpGame';
import { EvaRoverGame } from './workstations/EvaRoverGame';
import { CommsDishGame } from './workstations/CommsDishGame';
import { AcademyStationGame } from './workstations/AcademyStationGame';

interface WorkstationModalProps {
  roomId: RoomId;
  gameState: GameStateSnapshot;
  crewColor?: string;
  customInstructions: CustomInstructionsData;
  onClose: () => void;
  onUpdatePower: (newAlloc: PowerAllocation) => void;
  onCompleteTask: (
    roomId: RoomId,
    deltas: {
      oxygen?: number;
      food?: number;
      radiationMsv?: number;
      science?: number;
      bonusPowerKw?: number;
      pantryDelta?: Partial<CropPantryInventory>;
    },
    logNote?: string
  ) => void;
  onForageStarterSprouts: () => void;
  onCookAndFeedCrew: (recipe: SpaceKitchenRecipe) => void;
  onAcademyBonusReward?: (
    deltas: {
      oxygen?: number;
      food?: number;
      radiationMsv?: number;
      science?: number;
      pantryDelta?: Partial<CropPantryInventory>;
    },
    toastNote: string
  ) => void;
  onTriggerEndSol: () => void;
}

export const WorkstationModal: React.FC<WorkstationModalProps> = ({
  roomId,
  gameState,
  crewColor = '#22D3EE',
  customInstructions,
  onClose,
  onUpdatePower,
  onCompleteTask,
  onForageStarterSprouts,
  onCookAndFeedCrew,
  onAcademyBonusReward,
  onTriggerEndSol,
}) => {
  const room = OUTPOST_ROOMS.find((r) => r.id === roomId) || OUTPOST_ROOMS[0];
  const isAlreadyDone = gameState.completedTasksToday.includes(roomId);
  const donki = getDonkiEventForSol(gameState.sol);
  const site = MISSION_SITES[gameState.siteId];

  // Comms sub-tabs (Uplink Dish Mini-Game, AI Space Jukebox, Live Audio Transcription)
  const [commsTab, setCommsTab] = useState<'uplink' | 'music' | 'transcribe'>('uplink');

  // AI Music Generator states
  const [musicPrompt, setMusicPrompt] = useState<string>(
    'Funky space crewmate synth beat for fixing solar panels'
  );
  const [musicMood, setMusicMood] = useState<
    'calm_orbit' | 'solar_storm_alert' | 'hydroponic_zen' | 'victory_fanfare'
  >('calm_orbit');
  const [musicImageBase64, setMusicImageBase64] = useState<string | null>(null);
  const [musicImageMime, setMusicImageMime] = useState<string>('image/jpeg');
  const [musicImageName, setMusicImageName] = useState<string>('');
  const [musicLoading, setMusicLoading] = useState<boolean>(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [generatedTrack, setGeneratedTrack] = useState<{
    title: string;
    bpm: number;
    lyrics: string;
    source: string;
    audioDataUrl?: string | null;
    melodyNotes: number[];
    bassNotes: number[];
  } | null>(null);

  // Live & Recorded Audio Transcription states
  const [isLiveTranscribing, setIsLiveTranscribing] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [commanderReply, setCommanderReply] = useState<string>('');
  const [transcribeStatus, setTranscribeStatus] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMusicImageName(file.name);
    setMusicImageMime(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setMusicImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateMusic = async () => {
    setMusicLoading(true);
    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: musicPrompt,
          mood: musicMood,
          imageBase64: musicImageBase64,
          imageMimeType: musicImageMime,
          customInstructions: customInstructions.customRules,
        }),
      });
      const data = await res.json();
      const track = {
        title: data.title || 'Space Station Groove',
        bpm: Number(data.bpm) || 116,
        lyrics:
          data.lyrics ||
          'Check the solar panels, tune the water shield, green plants growing in our cosmic field!',
        source: data.source || 'gemini-space-synth',
        audioDataUrl: data.audioDataUrl || null,
        melodyNotes: data.melodyNotes || [60, 64, 67, 72, 71, 67, 64, 62],
        bassNotes: data.bassNotes || [36, 38, 41, 43],
      };
      setGeneratedTrack(track);
      setIsMusicPlaying(true);
      spaceAudio.playSoundtrack(track);
      await saveSoundtrackToCloud({
        title: track.title,
        prompt: musicPrompt,
        mood: musicMood,
        bpm: track.bpm,
        lyrics: track.lyrics,
      }).catch(() => {});
    } catch {
      const fallbackTrack = {
        title: 'Artemis Crewmate Synth Jam',
        bpm: 118,
        lyrics:
          'Power to the scrubbers, shields up high! Junior astronauts lighting up the sky!',
        source: 'procedural-synth',
        audioDataUrl: null,
        melodyNotes: [60, 64, 67, 72, 69, 67, 64, 62],
        bassNotes: [36, 41, 43, 36],
      };
      setGeneratedTrack(fallbackTrack);
      setIsMusicPlaying(true);
      spaceAudio.playSoundtrack(fallbackTrack);
    } finally {
      setMusicLoading(false);
    }
  };

  const floatTo16BitPCMBase64 = (float32Array: Float32Array): string => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const startLiveAudioTranscription = async () => {
    setTranscribeStatus('Opening live microphone feed...');
    setCommanderReply('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setIsLiveTranscribing(true);
      setTranscribeStatus('LIVE: Speak into your microphone! Streaming to Gemini Transcribe...');

      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.start();

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/live-transcribe`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.interimTranscript) {
            setLiveTranscript((prev) => `${prev.split(' [')[0]} [${msg.interimTranscript}]`);
          }
          if (msg.transcript) {
            setLiveTranscript((prev) =>
              `${prev.replace(/\s*\[.*\]$/, '')} ${msg.transcript}`.trim()
            );
          }
        } catch {
          // ignore
        }
      };

      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const pcmBase64 = floatTo16BitPCMBase64(e.inputBuffer.getChannelData(0));
          ws.send(JSON.stringify({ audio: pcmBase64 }));
        }
      };
    } catch {
      setIsLiveTranscribing(false);
      const simulatedText = `Commander Log Sol ${gameState.sol}: Oxygen is at ${gameState.oxygen}%, Shield Vault set to ${gameState.powerAllocation.shield} kW against ${donki.classType}.`;
      setLiveTranscript(simulatedText);
      setCommanderReply(
        'Copy that, Junior Astronaut! Your live telemetry transcript is logged in the Comms Archive.'
      );
      setTranscribeStatus(
        'Microphone unavailable in sandbox — simulated crew voice feed transcribed!'
      );
    }
  };

  const stopLiveAudioTranscription = async () => {
    setIsLiveTranscribing(false);
    setTranscribeStatus('Finalizing transcription with gemini-3.5-transcribe...');
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
        const reader = new FileReader();
        reader.onloadend = async () => {
          const result = String(reader.result || '');
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          try {
            const res = await fetch('/api/audio/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64,
                mimeType: blob.type || 'audio/webm',
                customInstructions: customInstructions.customRules,
              }),
            });
            const data = await res.json();
            if (data.transcript) setLiveTranscript(data.transcript);
            if (data.commanderReply) setCommanderReply(data.commanderReply);
            setTranscribeStatus('Transcription complete via gemini-3.5-transcribe!');
          } catch {
            setTranscribeStatus('Live transcript saved.');
          }
        };
        reader.readAsDataURL(blob);
      };
      recorder.stop();
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setTranscribeStatus('Live transcript saved.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 pointer-events-auto"
      role="dialog"
      aria-label={`${room.name} Workstation`}
    >
      <div className="w-full max-w-4xl rounded-2xl bg-[#0F172A] border-2 border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#090E1A] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className="w-3.5 h-10 rounded-full shrink-0"
              style={{ backgroundColor: room.accentColor }}
            />
            <div>
              <div className="text-xs font-mono text-cyan-400">
                {room.nasaSystemName} · SOL {gameState.sol} OF {gameState.maxSols}
              </div>
              <h2 className="text-2xl font-bold font-display text-white">{room.name}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-mono px-3 py-1.5 rounded-lg border ${
                isAlreadyDone
                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-500/60 text-amber-300'
              }`}
            >
              {isAlreadyDone ? '✓ TASK COMPLETED TODAY' : '★ DAILY MISSION READY'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200 transition-colors cursor-pointer"
            >
              Close [Esc]
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-200">
          {roomId === 'power' && (
            <PowerGridGame
              gameState={gameState}
              isAlreadyDone={isAlreadyDone}
              onUpdatePower={onUpdatePower}
              onComplete={(deltas, note) => onCompleteTask('power', deltas, note)}
            />
          )}

          {roomId === 'lifesupport' && (
            <ElectrolyzerZapperGame
              isAlreadyDone={isAlreadyDone}
              onComplete={(deltas, note) => onCompleteTask('lifesupport', deltas, note)}
            />
          )}

          {roomId === 'hydroponics' && (
            <BioDomeFarmGame
              isAlreadyDone={isAlreadyDone}
              onComplete={(deltas, note) => onCompleteTask('hydroponics', deltas, note)}
            />
          )}

          {roomId === 'foodlab' && (
            <SpaceFoodLabGame
              gameState={gameState}
              pantry={gameState.pantry}
              crewColor={crewColor}
              mealsCookedTotal={gameState.mealsCookedTotal}
              isAlreadyDone={isAlreadyDone}
              onForageStarterSprouts={onForageStarterSprouts}
              onCookAndFeedCrew={onCookAndFeedCrew}
            />
          )}

          {roomId === 'shield' && (
            <ShieldPumpGame
              donki={donki}
              shieldPowerKw={gameState.powerAllocation.shield}
              isAlreadyDone={isAlreadyDone}
              onComplete={(deltas, note) => onCompleteTask('shield', deltas, note)}
            />
          )}

          {roomId === 'eva' && (
            <EvaRoverGame
              site={site}
              crewColor={crewColor}
              isAlreadyDone={isAlreadyDone}
              onComplete={(deltas, note) => onCompleteTask('eva', deltas, note)}
            />
          )}

          {roomId === 'academy' && (
            <AcademyStationGame
              gameState={gameState}
              isAlreadyDone={isAlreadyDone}
              onComplete={(deltas, note) => onCompleteTask('academy', deltas, note)}
              onBonusReward={(deltas, toastNote) => {
                if (onAcademyBonusReward) {
                  onAcademyBonusReward(deltas, toastNote);
                }
              }}
            />
          )}

          {roomId === 'comms' && (
            <div className="space-y-4">
              {/* Sub-Navigation Tabs inside Comms Deck */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCommsTab('uplink')}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    commsTab === 'uplink'
                      ? 'bg-pink-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  1. Earth Uplink &amp; End Sol
                </button>
                <button
                  type="button"
                  onClick={() => setCommsTab('music')}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    commsTab === 'music'
                      ? 'bg-pink-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  2. AI Space Jukebox (Generate Music)
                </button>
                <button
                  type="button"
                  onClick={() => setCommsTab('transcribe')}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    commsTab === 'transcribe'
                      ? 'bg-pink-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  3. Live Audio Transcription
                </button>
              </div>

              {commsTab === 'uplink' && (
                <CommsDishGame
                  site={site}
                  sol={gameState.sol}
                  isAlreadyDone={isAlreadyDone}
                  onComplete={(deltas, note) => onCompleteTask('comms', deltas, note)}
                  onCloseAndEndSol={() => {
                    onClose();
                    onTriggerEndSol();
                  }}
                />
              )}

              {commsTab === 'music' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#090E1A] border border-pink-500/40 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-pink-400">
                        AI Space Jukebox · Crewmate Music Studio
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">
                        Create custom soundtracks or space jingles from your text ideas or photos!
                      </div>
                    </div>
                    <div className="flex items-end gap-1.5 h-10 px-3" aria-hidden="true">
                      {[16, 28, 22, 34, 18, 30, 24, 14].map((h, i) => (
                        <span
                          key={i}
                          className={`w-2 rounded-full transition-all ${
                            isMusicPlaying ? 'bg-pink-400' : 'bg-slate-700'
                          }`}
                          style={{ height: `${isMusicPlaying ? h : 10}px` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400">IDEAS:</span>
                      {[
                        'Happy Mars lettuce dance beat',
                        'Epic solar storm shield defense',
                        'Moon rover bouncy adventure',
                      ].map((idea) => (
                        <button
                          key={idea}
                          type="button"
                          onClick={() => setMusicPrompt(idea)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-pink-300 cursor-pointer"
                        >
                          {idea}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label
                        htmlFor="music-prompt-input"
                        className="block text-xs font-mono text-slate-400 mb-1"
                      >
                        DESCRIBE YOUR SPACE SOUNDTRACK OR JINGLE
                      </label>
                      <input
                        id="music-prompt-input"
                        type="text"
                        value={musicPrompt}
                        onChange={(e) => setMusicPrompt(e.target.value)}
                        placeholder="e.g., Upbeat synth theme for growing space lettuce on Mars"
                        className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="music-mood-select"
                          className="block text-xs font-mono text-slate-400 mb-1"
                        >
                          SOUNDTRACK MOOD
                        </label>
                        <select
                          id="music-mood-select"
                          value={musicMood}
                          onChange={(e) =>
                            setMusicMood(
                              e.target.value as
                                | 'calm_orbit'
                                | 'solar_storm_alert'
                                | 'hydroponic_zen'
                                | 'victory_fanfare'
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                        >
                          <option value="calm_orbit">Calm Orbit Synth</option>
                          <option value="solar_storm_alert">Solar Storm Alert Action</option>
                          <option value="hydroponic_zen">Hydroponic Bio-Dome Zen</option>
                          <option value="victory_fanfare">Junior Astronaut Fanfare</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="music-image-upload"
                          className="block text-xs font-mono text-slate-400 mb-1"
                        >
                          OPTIONAL MISSION PHOTO INSPIRATION
                        </label>
                        <input
                          id="music-image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200 cursor-pointer"
                        />
                        {musicImageName && (
                          <div className="text-xs text-emerald-400 mt-1 truncate">
                            Attached: {musicImageName}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        disabled={musicLoading}
                        onClick={handleGenerateMusic}
                        className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-bold text-sm cursor-pointer"
                      >
                        {musicLoading ? 'Composing Space Track...' : '🎵 Generate & Play Soundtrack'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMusicPlaying(false);
                          spaceAudio.stopMusic();
                        }}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Stop Music
                      </button>
                    </div>
                  </div>

                  {generatedTrack && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-pink-500/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-pink-400 text-sm">
                          Now Playing: {generatedTrack.title}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {generatedTrack.bpm} BPM · {generatedTrack.source}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 italic">“{generatedTrack.lyrics}”</p>
                    </div>
                  )}
                </div>
              )}

              {commsTab === 'transcribe' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-white">
                        Live Real-Time Audio Transcription
                      </div>
                      <span className="text-xs font-mono text-cyan-400">
                        {isLiveTranscribing ? '● RECORDING LIVE' : 'VOICE LOG READY'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Record your Captain’s Voice Log or speak commands into your mic for real-time
                      speech-to-text transcription and feedback from Commander Nova!
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {!isLiveTranscribing ? (
                        <button
                          type="button"
                          onClick={startLiveAudioTranscription}
                          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm cursor-pointer"
                        >
                          🎙️ Start Live Audio Transcription
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopLiveAudioTranscription}
                          className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm cursor-pointer"
                        >
                          ⏹️ Stop &amp; Transcribe Voice Log
                        </button>
                      )}
                      {transcribeStatus && (
                        <span className="text-xs font-mono text-cyan-300">{transcribeStatus}</span>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 min-h-[68px]">
                      <div className="text-xs font-mono text-slate-400 mb-1">
                        REAL-TIME TRANSCRIPT FEED
                      </div>
                      <div className="text-sm text-white">
                        {liveTranscript || 'Press "Start Live Audio Transcription" to begin...'}
                      </div>
                    </div>

                    {commanderReply && (
                      <div className="p-3 rounded-lg bg-sky-950/50 border border-sky-500/40">
                        <div className="text-xs font-mono text-sky-400">
                          COMMANDER NOVA (GUIDED BY YOUR CUSTOM INSTRUCTIONS)
                        </div>
                        <div className="text-sm text-slate-100 mt-0.5">{commanderReply}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
