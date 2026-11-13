import React, { useState, useEffect } from 'react';
import {
  CustomInstructionsData,
  MissionLogInput,
  auth,
  listUserMissionLogsFromCloud,
  saveCustomInstructionsToCloud,
  saveMissionLogToCloud,
  signInAstronaut,
  signOutAstronaut,
} from '../lib/firebase';
import { GameStateSnapshot } from '../game/rules';

interface CustomInstructionsModalProps {
  instructions: CustomInstructionsData;
  gameState: GameStateSnapshot;
  onSaveInstructions: (next: CustomInstructionsData) => void;
  onClose: () => void;
}

export const CustomInstructionsModal: React.FC<CustomInstructionsModalProps> = ({
  instructions,
  gameState,
  onSaveInstructions,
  onClose,
}) => {
  const [commanderStyle, setCommanderStyle] = useState(instructions.commanderStyle);
  const [targetAgeGroup, setTargetAgeGroup] = useState(instructions.targetAgeGroup);
  const [customRules, setCustomRules] = useState(instructions.customRules);
  const [saveMessage, setSaveMessage] = useState('');
  const [cloudLogs, setCloudLogs] = useState<Array<MissionLogInput & { id: string }>>([]);
  const [userEmail, setUserEmail] = useState<string | null>(auth.currentUser?.email || null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUserEmail(u?.email || null);
      if (u) {
        listUserMissionLogsFromCloud()
          .then(setCloudLogs)
          .catch(() => {});
      } else {
        setCloudLogs([]);
      }
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRules.trim()) {
      setSaveMessage('Please enter custom instructions before saving.');
      return;
    }
    const updated: CustomInstructionsData = {
      commanderStyle,
      targetAgeGroup,
      customRules: customRules.trim().slice(0, 600),
    };
    onSaveInstructions(updated);
    setSaveMessage('Custom Instructions saved for Gemini events, music & voice replies!');
    if (auth.currentUser) {
      await saveCustomInstructionsToCloud(updated).catch(() => {});
    }
  };

  const handleSaveCurrentRunToCloud = async () => {
    if (!auth.currentUser) return;
    await saveMissionLogToCloud({
      astronautName: auth.currentUser.displayName || 'Junior Astronaut',
      siteId: gameState.siteId,
      solReached: gameState.sol,
      score: gameState.scienceScore,
      oxygenRemaining: gameState.oxygen,
      radiationMsv: gameState.radiationMsv,
      outcome: 'in_progress',
      summaryNote: `Sol ${gameState.sol} Checkpoint · O2 ${gameState.oxygen}%, Rad ${gameState.radiationMsv}mSv`,
    });
    const logs = await listUserMissionLogsFromCloud();
    setCloudLogs(logs);
    setSaveMessage('Mission progress synced to Cloud database!');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 pointer-events-auto"
      role="dialog"
      aria-label="Custom Instructions & Crew Cloud Database"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#0F172A] border-2 border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 bg-[#090E1A] border-b border-slate-800">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              AI MISSION DIRECTOR · CUSTOM INSTRUCTIONS & CLOUD DATABASE
            </div>
            <h2 className="text-xl font-bold font-display text-white">
              Custom Instructions & Cloud Mission Logs
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200 cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-slate-200">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="commander-style-select"
                  className="block text-xs font-mono text-slate-400 mb-1"
                >
                  AI COMMANDER VOICE & STYLE
                </label>
                <select
                  id="commander-style-select"
                  value={commanderStyle}
                  onChange={(e) =>
                    setCommanderStyle(
                      e.target.value as CustomInstructionsData['commanderStyle']
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                >
                  <option value="among_us_crew">Among-Us Crewmate Humor</option>
                  <option value="nasa_mission_control">NASA Houston Flight Director</option>
                  <option value="story_adventure">Kids Space Storybook Adventure</option>
                  <option value="science_coach">STEM Classroom Science Coach</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="age-group-select"
                  className="block text-xs font-mono text-slate-400 mb-1"
                >
                  TARGET LEARNER LEVEL
                </label>
                <select
                  id="age-group-select"
                  value={targetAgeGroup}
                  onChange={(e) =>
                    setTargetAgeGroup(
                      e.target.value as CustomInstructionsData['targetAgeGroup']
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                >
                  <option value="7-9">Ages 7–9 (Junior Cadet · Simple Words)</option>
                  <option value="10-12">Ages 10–12 (Mission Specialist)</option>
                  <option value="classroom">Classroom & Family Team Mode</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="custom-rules-textarea"
                className="block text-xs font-mono text-slate-400 mb-1"
              >
                CUSTOM GEMINI SYSTEM INSTRUCTIONS (GUIDES DYNAMIC EVENTS, VOICE REPLIES & MUSIC)
              </label>
              <textarea
                id="custom-rules-textarea"
                rows={3}
                value={customRules}
                onChange={(e) => setCustomRules(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm cursor-pointer"
              >
                Save Custom Instructions
              </button>
              {saveMessage && <span className="text-xs text-emerald-400">{saveMessage}</span>}
            </div>
          </form>

          {/* Cloud Database Sync Section */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-white">
                  Astronaut Cloud Database Sync
                </div>
                <div className="text-xs text-slate-400">
                  {userEmail
                    ? `Signed in as ${userEmail}`
                    : 'Sign in with Google to save your mission logs and custom instructions across devices.'}
                </div>
              </div>
              {!userEmail ? (
                <button
                  type="button"
                  onClick={() => signInAstronaut().catch(() => {})}
                  className="px-4 py-2 rounded-lg bg-white text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Sign In with Google
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveCurrentRunToCloud}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Save Current Sol to Cloud
                  </button>
                  <button
                    type="button"
                    onClick={() => signOutAstronaut().catch(() => {})}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {cloudLogs.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-xs font-mono text-slate-400">SAVED CLOUD MISSION LOGS</div>
                {cloudLogs.slice(0, 4).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-slate-950 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-white">
                      {log.siteId.toUpperCase()} · Sol {log.solReached} ({log.summaryNote})
                    </span>
                    <span className="font-mono text-cyan-400">{log.score} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
