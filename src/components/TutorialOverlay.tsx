import React from 'react';
import { FastForward, Play, Sparkles } from 'lucide-react';
import { JETS, type JetId } from '../game/types';
import { TUTORIAL_STEPS, type TutorialStepDef } from '../game/tutorial';

interface TutorialOverlayProps {
  mode: 'paused_step' | 'live_play';
  step: TutorialStepDef;
  jetId: JetId;
  onTriggerStepAction: () => void;
  onSkip: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  mode,
  step,
  jetId,
  onTriggerStepAction,
  onSkip,
}) => {
  const jet = JETS[jetId] ?? JETS.vanguard;

  if (mode === 'live_play') {
    return (
      <div className="fixed top-14 sm:top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto font-mono">
        <div className="flex items-center gap-3 px-3.5 py-1.5 bg-[#040d18]/90 border border-amber-400/70 rounded-sm shadow-[0_0_20px_rgba(251,191,36,0.25)]">
          <span className="text-[10px] sm:text-xs font-bold tracking-[0.14em] text-amber-200 uppercase">
            LIVE PLAY {step.stepNumber}/{TUTORIAL_STEPS.length} · {step.title}
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-600 text-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Subtle perimeter dim that leaves highlighted HUD buttons & center view clear */}
      <div className="fixed inset-0 z-[15] bg-[#02060d]/42 pointer-events-none" />

      {/* Compact upper-center tactical callout (keeps ship, joystick, and ability cluster unobstructed) */}
      <div className="fixed top-14 sm:top-5 left-1/2 -translate-x-1/2 z-30 w-[92vw] max-w-md pointer-events-auto font-mono">
        <div className="bg-[#05101c]/95 border-2 border-amber-400/85 rounded-sm p-3.5 sm:p-4 shadow-[0_0_32px_rgba(251,191,36,0.28)] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold tracking-[0.18em] text-amber-300 uppercase">
              TUTORIAL PAUSE · STEP {step.stepNumber}/{TUTORIAL_STEPS.length}
            </span>
            <button
              type="button"
              onClick={onSkip}
              className="px-2 py-0.5 bg-slate-900/90 hover:border-slate-400 border border-slate-600/80 text-slate-300 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1 transition-colors"
            >
              <FastForward className="w-3 h-3" />
              <span>Skip Tutorial</span>
            </button>
          </div>

          <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wider">{step.title}</h3>

          <p className="text-[11px] sm:text-xs text-slate-200 leading-relaxed">{step.instruction}</p>

          {step.id === 'special' && (
            <div className="p-2 bg-fuchsia-950/45 border border-fuchsia-400/50 rounded-sm text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {jet.name}: {jet.specialName}
                </span>
              </div>
              <div className="text-fuchsia-100/90 mt-0.5">{jet.specialDesc}</div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
            <span className="text-[10px] sm:text-[11px] font-semibold text-amber-300">{step.buttonHint}</span>
            <button
              type="button"
              onClick={onTriggerStepAction}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#090600] text-[11px] font-extrabold uppercase tracking-wider rounded-sm flex items-center gap-1.5 shrink-0 shadow-[0_0_16px_rgba(251,191,36,0.4)] transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{step.actionLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
