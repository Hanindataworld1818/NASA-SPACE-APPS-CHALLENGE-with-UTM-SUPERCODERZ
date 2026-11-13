import React, { useState } from 'react';
import { DynamicMissionEvent, GameStateSnapshot, getDonkiEventForSol } from '../game/rules';
import { CustomInstructionsData } from '../lib/firebase';
import { spaceAudio } from '../game/audio';

interface DynamicEventModalProps {
  event: DynamicMissionEvent;
  gameState: GameStateSnapshot;
  customInstructions: CustomInstructionsData;
  onResolveChoice: (choice: DynamicMissionEvent['optionA']) => void;
  onReplaceEvent: (newEvent: DynamicMissionEvent) => void;
  onClose: () => void;
}

export const DynamicEventModal: React.FC<DynamicEventModalProps> = ({
  event,
  gameState,
  customInstructions,
  onResolveChoice,
  onReplaceEvent,
  onClose,
}) => {
  const [generatingAiEvent, setGeneratingAiEvent] = useState(false);

  const handleGenerateAiEvent = async () => {
    setGeneratingAiEvent(true);
    try {
      const donki = getDonkiEventForSol(gameState.sol);
      const res = await fetch('/api/events/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: gameState.siteId,
          sol: gameState.sol,
          donkiTitle: `${donki.classType} - ${donki.title}`,
          customInstructions: customInstructions.customRules,
        }),
      });
      const data = await res.json();
      if (data.event) {
        spaceAudio.playEmergencyAlert();
        onReplaceEvent(data.event);
      }
    } catch {
      // Keep current event if offline
    } finally {
      setGeneratingAiEvent(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 pointer-events-auto"
      role="dialog"
      aria-label="Emergency Outpost Trade-Off Decision"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#0F172A] border-2 border-amber-500 shadow-2xl overflow-hidden flex flex-col">
        {/* Alert Banner */}
        <div className="px-6 py-4 bg-amber-500/15 border-b border-amber-500/40 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono font-bold text-amber-400">
              🚨 OUTPOST EMERGENCY TRADE-OFF · {event.nasaSourceTag}
            </div>
            <h2 className="text-xl font-bold font-display text-white mt-0.5">{event.title}</h2>
          </div>
          <button
            type="button"
            disabled={generatingAiEvent}
            onClick={handleGenerateAiEvent}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 cursor-pointer whitespace-nowrap"
          >
            {generatingAiEvent ? 'Asking Gemini...' : '✨ New AI Crisis'}
          </button>
        </div>

        {/* Story & Kid Lesson */}
        <div className="p-6 space-y-4">
          <p className="text-base text-slate-100 leading-relaxed">{event.storyPrompt}</p>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-cyan-300">
            <strong>💡 NASA Science Fact:</strong> {event.kidLesson}
          </div>

          <div className="text-xs font-mono text-slate-400">
            CHOOSE ONE ACTION (BOTH CARRY A REAL ENGINEERING COST):
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[event.optionA, event.optionB].map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  spaceAudio.playTaskComplete();
                  onResolveChoice(opt);
                }}
                className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 hover:border-cyan-400 text-left transition-all flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="text-xs font-mono text-amber-400 mb-1">
                    OPTION {idx === 0 ? 'A' : 'B'}
                  </div>
                  <div className="text-base font-bold text-white">{opt.label}</div>
                  <p className="text-xs text-slate-300 mt-2">{opt.kidConsequence}</p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-800 flex flex-wrap gap-2 text-xs font-mono">
                  {opt.deltas.oxygen !== 0 && (
                    <span className={opt.deltas.oxygen > 0 ? 'text-sky-400' : 'text-amber-400'}>
                      O2 {opt.deltas.oxygen > 0 ? '+' : ''}
                      {opt.deltas.oxygen}%
                    </span>
                  )}
                  {opt.deltas.food !== 0 && (
                    <span className={opt.deltas.food > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                      Food {opt.deltas.food > 0 ? '+' : ''}
                      {opt.deltas.food}%
                    </span>
                  )}
                  {opt.deltas.radiationMsv !== 0 && (
                    <span
                      className={
                        opt.deltas.radiationMsv <= 2 ? 'text-purple-400' : 'text-rose-400'
                      }
                    >
                      Rad +{opt.deltas.radiationMsv}mSv
                    </span>
                  )}
                  {opt.deltas.science !== 0 && (
                    <span className="text-pink-400">
                      Science {opt.deltas.science > 0 ? '+' : ''}
                      {opt.deltas.science}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
            >
              Decide Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
