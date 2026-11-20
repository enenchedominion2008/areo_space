import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteCheckpointFromPython,
  fetchBackendState,
  purchaseUpgradeFromPython,
  reviveRunWithCredits,
  saveCheckpointToPython,
  selectJetInPython,
  submitScoreToPython,
  updatePilotNameInPython,
} from './api/saveClient';
import { GameHud } from './components/GameHud';
import { GameModals } from './components/GameModals';
import { TutorialOverlay } from './components/TutorialOverlay';
import { SpaceShooterEngine } from './game/engine';
import { TUTORIAL_STEPS, type TutorialStepId } from './game/tutorial';
import type { BackendState, GameCheckpointPayload, HudSnapshot, JetId, SaveSlotRecord } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  jetId: 'vanguard',
  score: 0,
  highScore: 0,
  multiplier: 1,
  maxMultiplier: 1,
  comboTimer: 0,
  wave: 1,
  totalLevels: 20,
  waveProgress: 0,
  waveTotal: 6,
  kills: 0,
  shotsFired: 0,
  shotsHit: 0,
  health: 100,
  maxHealth: 100,
  shield: 100,
  maxShield: 100,
  laserLevel: 1,
  weaponPattern: 'twin',
  specialName: 'HYPER OVERDRIVE',
  specialCooldown: 0,
  specialMaxCooldown: 11,
  specialActiveTimer: 0,
  afterburnerCooldown: 0,
  afterburnerMaxCooldown: 14,
  afterburnerActiveTimer: 0,
  missileCooldown: 0,
  missileMaxCooldown: 9,
  shieldPulseCooldown: 0,
  shieldPulseMaxCooldown: 12,
  shieldPulseActiveTimer: 0,
  barrelRollCooldown: 0,
  sectorMode: 'emerald_trench',
  arenaName: 'EMERALD CYBER-TRENCH',
  dangerAlert: false,
  hitFlash: 0,
  bannerText: null,
  bossName: null,
  bossHpRatio: 0,
  bossChaseActive: false,
  bossChaseTimeLeft: 0,
  bossChaseDuration: 11.5,
  radarBlips: [],
};

function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window ||
    window.innerWidth <= 820
  );
}

function enterMobileLandscape(): void {
  if (!detectTouchDevice()) return;

  const fullscreen = document.documentElement.requestFullscreen;
  if (fullscreen) {
    void fullscreen.call(document.documentElement)
      .then(() => screen.orientation?.lock('landscape').catch(() => {}))
      .catch(() => {});
  }
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SpaceShooterEngine | null>(null);
  const backendStateRef = useRef<BackendState | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [backendState, setBackendState] = useState<BackendState | null>(null);
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [touchMode, setTouchMode] = useState<boolean>(() => detectTouchDevice());
  const [lastRunCredits, setLastRunCredits] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'none' | 'slots' | 'hangar' | 'leaderboard'>('none');
  const [tutorialMode, setTutorialMode] = useState<'inactive' | 'paused_step' | 'live_play'>('inactive');
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [showIntroVideo, setShowIntroVideo] = useState(() => !detectTouchDevice());

  const handleSkipIntro = useCallback(() => setShowIntroVideo(false), []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  }, []);

  // Load initial Python SQLite state & health status
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [healthRes, state] = await Promise.all([
          fetch('/api/health').then((r) => (r.ok ? r.json() : null)),
          fetchBackendState(),
        ]);
        if (!active) return;
        backendStateRef.current = state;
        setBackendState(state);
        engineRef.current?.setHighScore(state.profile.high_score ?? 0);
        if (state.profile.selected_jet) {
          engineRef.current?.setSelectedJet(state.profile.selected_jet);
        }
        if (healthRes?.python_version) {
          setBackendStatus(`PYTHON ${healthRes.python_version} · SQLITE`);
        }
      } catch {
        if (active) setBackendStatus('PYTHON BACKEND OFFLINE');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Mount isolated Three.js engine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new SpaceShooterEngine(
      mount,
      {
        onHudUpdate: (snapshot) => {
          setHud(snapshot);
        },
        onWaveCleared: (checkpoint: GameCheckpointPayload) => {
          const pilotName = backendStateRef.current?.profile.pilot_name || 'VANGUARD-01';
          saveCheckpointToPython('autosave', pilotName, checkpoint)
            .then((res) => {
              backendStateRef.current = res.state;
              setBackendState(res.state);
              showToast(`LEVEL ${checkpoint.wave - 1} CLEARED · CHECKPOINT SAVED`);
            })
            .catch(() => {});
        },
        onGameOver: (summary) => {
          const pilotName = backendStateRef.current?.profile.pilot_name || 'VANGUARD-01';
          const selectedJet = backendStateRef.current?.profile.selected_jet || 'vanguard';
          submitScoreToPython({
            pilotName,
            selectedJet,
            score: summary.score,
            wave: summary.wave,
            kills: summary.kills,
            maxMultiplier: summary.maxMultiplier,
            accuracy: summary.accuracy,
            clearAutosave: true,
          })
            .then((res) => {
              backendStateRef.current = res.state;
              setBackendState(res.state);
              setLastRunCredits(res.earned_credits);
              engine.setHighScore(res.state.profile.high_score ?? summary.score);
            })
            .catch(() => {});
        },
      },
      backendStateRef.current?.profile.high_score ?? 0,
      backendStateRef.current?.profile.selected_jet ?? 'vanguard'
    );

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [showToast]);

  const handleStartNewGame = useCallback((startLevel = 1) => {
    enterMobileLandscape();
    setLastRunCredits(null);
    setActiveTab('none');
    engineRef.current?.startNewGame(backendStateRef.current?.profile, startLevel);
  }, []);

  const handleResumeGame = useCallback(() => {
    setActiveTab('none');
    engineRef.current?.setPaused(false);
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.setPaused(true);
  }, []);

  const handleOpenTutorials = useCallback(() => {
    const phase = engineRef.current?.getPhase();
    if (phase === 'title' || phase === 'gameover' || phase === 'victory') {
      enterMobileLandscape();
      setLastRunCredits(null);
      setActiveTab('none');
      engineRef.current?.startNewGame(backendStateRef.current?.profile, 1);
    }
    const firstStep = TUTORIAL_STEPS[0];
    setTutorialStepIndex(0);
    setTutorialMode('paused_step');
    engineRef.current?.setPaused(true);
    engineRef.current?.prepareTutorialStep(firstStep.id);
  }, []);

  const handleSkipTutorials = useCallback(() => {
    setTutorialMode('inactive');
    engineRef.current?.setPaused(false);
    showToast('GAMEPLAY RESUMED');
  }, [showToast]);

  const beginLiveTutorialPlay = useCallback((stepId: TutorialStepId) => {
    engineRef.current?.setPaused(false, true);
    if (stepId === 'roll') engineRef.current?.triggerBarrelRoll();
    if (stepId === 'afterburner') engineRef.current?.triggerAfterburner();
    if (stepId === 'missile') engineRef.current?.triggerMissileBarrage();
    if (stepId === 'shield_pulse') engineRef.current?.triggerShieldPulse();
    if (stepId === 'special') {
      engineRef.current?.triggerSpecial();
      engineRef.current?.spawnTutorialFragment();
    }
    setTutorialMode('live_play');
  }, []);

  // Advance automatically from short live gameplay windows to the next short pause (or resume normal gameplay at the end)
  useEffect(() => {
    if (tutorialMode !== 'live_play') return;
    const step = TUTORIAL_STEPS[tutorialStepIndex];
    const timer = window.setTimeout(() => {
      if (tutorialStepIndex + 1 < TUTORIAL_STEPS.length) {
        const nextIdx = tutorialStepIndex + 1;
        const nextStep = TUTORIAL_STEPS[nextIdx];
        setTutorialStepIndex(nextIdx);
        engineRef.current?.setPaused(true);
        engineRef.current?.prepareTutorialStep(nextStep.id);
        setTutorialMode('paused_step');
      } else {
        setTutorialMode('inactive');
        showToast('TUTORIAL COMPLETE · GAMEPLAY RESUMED');
      }
    }, step.liveDurationMs);
    return () => window.clearTimeout(timer);
  }, [tutorialMode, tutorialStepIndex, showToast]);

  // Cancel tutorial cleanly if match ends or returns to title
  useEffect(() => {
    if (tutorialMode !== 'inactive' && (hud.phase === 'gameover' || hud.phase === 'victory' || hud.phase === 'title')) {
      setTutorialMode('inactive');
    }
  }, [hud.phase, tutorialMode]);

  const handleToggleMute = useCallback(() => {
    if (!engineRef.current) return;
    const next = engineRef.current.audio.toggleMute();
    setMuted(next);
  }, []);

  const handleToggleTouchMode = useCallback(() => {
    setTouchMode((prev) => !prev);
  }, []);

  const currentTutorialStep = TUTORIAL_STEPS[tutorialStepIndex] ?? TUTORIAL_STEPS[0];

  const handleTriggerSpecial = useCallback(() => {
    if (tutorialMode === 'paused_step' && currentTutorialStep.id === 'special') {
      beginLiveTutorialPlay('special');
      return;
    }
    engineRef.current?.triggerSpecial();
  }, [beginLiveTutorialPlay, currentTutorialStep.id, tutorialMode]);

  const handleTriggerAfterburner = useCallback(() => {
    if (tutorialMode === 'paused_step' && currentTutorialStep.id === 'afterburner') {
      beginLiveTutorialPlay('afterburner');
      return;
    }
    engineRef.current?.triggerAfterburner();
  }, [beginLiveTutorialPlay, currentTutorialStep.id, tutorialMode]);

  const handleTriggerMissileBarrage = useCallback(() => {
    if (tutorialMode === 'paused_step' && currentTutorialStep.id === 'missile') {
      beginLiveTutorialPlay('missile');
      return;
    }
    engineRef.current?.triggerMissileBarrage();
  }, [beginLiveTutorialPlay, currentTutorialStep.id, tutorialMode]);

  const handleTriggerShieldPulse = useCallback(() => {
    if (tutorialMode === 'paused_step' && currentTutorialStep.id === 'shield_pulse') {
      beginLiveTutorialPlay('shield_pulse');
      return;
    }
    engineRef.current?.triggerShieldPulse();
  }, [beginLiveTutorialPlay, currentTutorialStep.id, tutorialMode]);

  const handleTriggerBarrelRoll = useCallback(() => {
    if (tutorialMode === 'paused_step' && currentTutorialStep.id === 'roll') {
      beginLiveTutorialPlay('roll');
      return;
    }
    engineRef.current?.triggerBarrelRoll();
  }, [beginLiveTutorialPlay, currentTutorialStep.id, tutorialMode]);

  const handleTouchSteer = useCallback(
    (nx: number, ny: number) => {
      if (tutorialMode === 'paused_step' && currentTutorialStep.id === 'move' && (Math.abs(nx) > 0.25 || Math.abs(ny) > 0.25)) {
        beginLiveTutorialPlay('move');
      }
      engineRef.current?.setTouchSteer(nx, ny);
    },
    [beginLiveTutorialPlay, currentTutorialStep.id, tutorialMode]
  );

  const handleSaveToSlot = useCallback(
    async (slotId: string) => {
      if (!engineRef.current) return;
      setBusy(true);
      try {
        const checkpoint = engineRef.current.exportCheckpoint();
        const pilotName = backendStateRef.current?.profile.pilot_name || 'VANGUARD-01';
        const res = await saveCheckpointToPython(slotId, pilotName, checkpoint);
        backendStateRef.current = res.state;
        setBackendState(res.state);
        showToast(`SAVED TO ${slotId.toUpperCase()} (PYTHON SQLITE)`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Save failed');
      } finally {
        setBusy(false);
      }
    },
    [showToast]
  );

  const handleLoadSlot = useCallback(
    (slot: SaveSlotRecord) => {
      setLastRunCredits(null);
      setActiveTab('none');
      engineRef.current?.restoreCheckpoint(slot.payload, backendStateRef.current?.profile);
      showToast(`LOADED ${slot.slot_id.toUpperCase()} · LEVEL ${slot.wave}`);
    },
    [showToast]
  );

  const handleDeleteSlot = useCallback(
    async (slotId: string) => {
      setBusy(true);
      try {
        const state = await deleteCheckpointFromPython(slotId);
        backendStateRef.current = state;
        setBackendState(state);
        showToast(`DELETED ${slotId.toUpperCase()}`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Delete failed');
      } finally {
        setBusy(false);
      }
    },
    [showToast]
  );

  const handlePurchaseUpgrade = useCallback(
    async (type: 'hull_upgrade' | 'shield_upgrade' | 'laser_upgrade') => {
      setBusy(true);
      try {
        const state = await purchaseUpgradeFromPython(type);
        backendStateRef.current = state;
        setBackendState(state);
        showToast('HANGAR UPGRADE INSTALLED');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Upgrade failed');
      } finally {
        setBusy(false);
      }
    },
    [showToast]
  );

  const handleSelectJet = useCallback(
    async (jetId: JetId) => {
      engineRef.current?.setSelectedJet(jetId);
      setBusy(true);
      try {
        const state = await selectJetInPython(jetId);
        backendStateRef.current = state;
        setBackendState(state);
        showToast(`JET SELECTED: ${jetId.toUpperCase()}`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Jet selection failed');
      } finally {
        setBusy(false);
      }
    },
    [showToast]
  );

  const handleUpdatePilotName = useCallback(
    async (name: string) => {
      setBusy(true);
      try {
        const state = await updatePilotNameInPython(name);
        backendStateRef.current = state;
        setBackendState(state);
        showToast('PILOT CALLSIGN UPDATED');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Update failed');
      } finally {
        setBusy(false);
      }
    },
    [showToast]
  );

  const handleReviveWithCredits = useCallback(async () => {
    setBusy(true);
    try {
      const state = await reviveRunWithCredits();
      backendStateRef.current = state;
      setBackendState(state);
      setLastRunCredits(null);
      setActiveTab('none');
      engineRef.current?.reviveCurrentLevel();
      showToast('CONTINUE ACTIVATED · -1,000 CR');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Continue failed');
    } finally {
      setBusy(false);
    }
  }, [showToast]);

  const handleReturnToTitle = useCallback(() => {
    setActiveTab('none');
    engineRef.current?.returnToTitle();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showIntroVideo) {
        if (e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleSkipIntro();
        }
        return;
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (tutorialMode !== 'inactive') {
        if (e.code === 'Escape') {
          e.preventDefault();
          handleSkipTutorials();
          return;
        }
        if (tutorialMode === 'paused_step') {
          const stepId = currentTutorialStep.id;
          if (
            stepId === 'move' &&
            (e.code === 'KeyW' ||
              e.code === 'KeyA' ||
              e.code === 'KeyS' ||
              e.code === 'KeyD' ||
              e.code === 'ArrowUp' ||
              e.code === 'ArrowDown' ||
              e.code === 'ArrowLeft' ||
              e.code === 'ArrowRight')
          ) {
            beginLiveTutorialPlay('move');
          } else if (stepId === 'roll' && (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE')) {
            beginLiveTutorialPlay('roll');
          } else if (stepId === 'afterburner' && (e.code === 'Space' || e.code === 'KeyF')) {
            beginLiveTutorialPlay('afterburner');
          } else if (stepId === 'missile' && e.code === 'KeyR') {
            beginLiveTutorialPlay('missile');
          } else if (stepId === 'shield_pulse' && e.code === 'KeyC') {
            beginLiveTutorialPlay('shield_pulse');
          } else if (stepId === 'special' && e.code === 'KeyQ') {
            beginLiveTutorialPlay('special');
          }
        }
        return;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (activeTab !== 'none') {
          setActiveTab('none');
          return;
        }
        const phase = engineRef.current?.getPhase();
        if (phase === 'playing') {
          engineRef.current?.setPaused(true);
        } else if (phase === 'paused') {
          engineRef.current?.setPaused(false);
        }
      } else if (e.code === 'Enter' && activeTab === 'none') {
        if (engineRef.current?.getPhase() === 'title') {
          handleStartNewGame(1);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeTab,
    beginLiveTutorialPlay,
    currentTutorialStep.id,
    handleSkipTutorials,
    handleStartNewGame,
    handleSkipIntro,
    showIntroVideo,
    tutorialMode,
  ]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#02060d] touch-none">
      <div ref={canvasMountRef} className="fixed inset-0 w-full h-full touch-none" />

      {showIntroVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <video
            className="h-full w-full object-contain"
            src="/assets/aistudio/Spaceship_firing_lasers_in_battle_2310d8bf_ad30afee.mp4"
            autoPlay
            muted
            playsInline
            onEnded={handleSkipIntro}
            onError={handleSkipIntro}
            aria-label="Game introduction"
          />
          <button
            type="button"
            onClick={handleSkipIntro}
            className="absolute right-5 top-5 rounded-sm border border-emerald-300/70 bg-[#04111ddd] px-5 py-2.5 font-mono text-sm font-bold uppercase tracking-[0.18em] text-emerald-100 shadow-[0_0_24px_rgba(0,255,136,0.28)] transition-colors hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            Skip intro <span className="ml-2 text-emerald-300/70">Esc</span>
          </button>
        </div>
      )}

      {(hud.phase === 'playing' || tutorialMode !== 'inactive') && (
        <GameHud
          hud={hud}
          muted={muted}
          touchMode={touchMode}
          tutorialHighlight={tutorialMode === 'paused_step' ? currentTutorialStep.id : null}
          onToggleTouchMode={handleToggleTouchMode}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onOpenTutorials={handleOpenTutorials}
          onTriggerSpecial={handleTriggerSpecial}
          onTriggerAfterburner={handleTriggerAfterburner}
          onTriggerMissileBarrage={handleTriggerMissileBarrage}
          onTriggerShieldPulse={handleTriggerShieldPulse}
          onTriggerBarrelRoll={handleTriggerBarrelRoll}
          onTouchSteer={handleTouchSteer}
        />
      )}

      {hud.phase === 'playing' && touchMode && (
        <div className="rotate-device-overlay fixed inset-0 z-40 hidden items-center justify-center bg-[#02060d]/95 p-8 text-center font-mono">
          <div className="max-w-sm">
            <div className="mb-4 text-6xl text-emerald-300" aria-hidden="true">↻</div>
            <h2 className="text-xl font-black uppercase tracking-[0.16em] text-white">Rotate your phone</h2>
            <p className="mt-3 text-sm leading-6 text-emerald-100/75">Turn your device sideways to play in landscape.</p>
          </div>
        </div>
      )}

      <GameModals
        phase={hud.phase}
        hud={hud}
        backendState={backendState}
        backendStatus={backendStatus}
        busy={busy}
        lastRunCredits={lastRunCredits}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onStartNewGame={handleStartNewGame}
        onResumeGame={handleResumeGame}
        onSaveToSlot={handleSaveToSlot}
        onLoadSlot={handleLoadSlot}
        onDeleteSlot={handleDeleteSlot}
        onPurchaseUpgrade={handlePurchaseUpgrade}
        onSelectJet={handleSelectJet}
        onUpdatePilotName={handleUpdatePilotName}
        onReviveWithCredits={handleReviveWithCredits}
        onReturnToTitle={handleReturnToTitle}
        onOpenTutorials={handleOpenTutorials}
        suppressPauseModal={tutorialMode !== 'inactive'}
      />

      {tutorialMode !== 'inactive' && (
        <TutorialOverlay
          mode={tutorialMode}
          step={currentTutorialStep}
          jetId={hud.jetId}
          onTriggerStepAction={() => beginLiveTutorialPlay(currentTutorialStep.id)}
          onSkip={handleSkipTutorials}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none px-4 py-2 bg-[#040d17] border border-emerald-400/70 text-emerald-200 font-mono text-xs font-bold tracking-[0.16em] uppercase shadow-[0_0_24px_rgba(0,255,136,0.28)]">
          {toast}
        </div>
      )}
    </div>
  );
}
