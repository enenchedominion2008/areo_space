import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteCheckpointFromPython,
  fetchBackendState,
  manageModInPython,
  purchaseUpgradeFromPython,
  reviveRunWithCredits,
  saveCheckpointToPython,
  selectJetInPython,
  setCosmeticInPython,
  submitScoreToPython,
  updatePilotNameInPython,
} from './api/saveClient';
import { MultiplayerClient, type WsConnStatus } from './api/multiplayerClient';
import { GameHud } from './components/GameHud';
import { GameModals, type ModalTab } from './components/GameModals';
import { TutorialOverlay } from './components/TutorialOverlay';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { SpaceShooterEngine } from './game/engine';
import type {
  CoopMatchEndPayload,
  OpenRoomListing,
  RoomPlayerProfile,
  RoomStatePayload,
} from './game/multiplayerTypes';
import { TUTORIAL_STEPS, type TutorialStepId } from './game/tutorial';
import {
  CYBER_MODS,
  getPilotRank,
  type BackendState,
  type CyberModId,
  type GameCheckpointPayload,
  type HudSnapshot,
  type JetId,
  type JetSkinId,
  type PilotProfile,
  type SaveSlotRecord,
  type TrailColorId,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  jetId: 'vanguard',
  score: 0,
  highScore: 0,
  multiplier: 1,
  maxMultiplier: 1,
  comboTimer: 0,
  feverActive: false,
  feverMeter: 0,
  feverTimeLeft: 0,
  bossSlowMoActive: false,
  wave: 1,
  totalLevels: 30,
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
  wingmanTimeLeft: 0,
  equippedMods: [],
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

  const lockLandscape = () => {
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: 'landscape' | 'landscape-primary' | 'any') => Promise<void>;
      };
      void orientation?.lock?.('landscape')?.catch(() => {});
    } catch {
      // Ignore unsupported orientation lock
    }
  };

  lockLandscape();
  const fullscreen = document.documentElement.requestFullscreen;
  if (fullscreen) {
    void fullscreen
      .call(document.documentElement)
      .then(lockLandscape)
      .catch(() => {});
  }
}

function profileToRoomProfile(profile?: PilotProfile | null): RoomPlayerProfile {
  return {
    pilotName: profile?.pilot_name || 'VANGUARD-01',
    pilotRank: getPilotRank(profile).id,
    jetId: profile?.selected_jet || 'vanguard',
    skinId: profile?.selected_skin || 'factory',
    trailId: profile?.selected_trail || 'jet_default',
    equippedMods: profile?.equipped_mods || [],
  };
}

function getInitialRoomCodeFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const code = new URLSearchParams(window.location.search).get('room') || '';
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SpaceShooterEngine | null>(null);
  const backendStateRef = useRef<BackendState | null>(null);
  const mpClientRef = useRef<MultiplayerClient | null>(null);
  const coopPlayerIdRef = useRef<string | null>(null);
  const coopRoomRef = useRef<RoomStatePayload | null>(null);
  const autoJoinedRoomRef = useRef(false);
  const jetSelectSeqRef = useRef(0);

  const initialRoomCode = getInitialRoomCodeFromUrl();

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [backendState, setBackendState] = useState<BackendState | null>(null);
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [touchMode, setTouchMode] = useState<boolean>(() => detectTouchDevice());
  const [lastRunCredits, setLastRunCredits] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ModalTab>(() => (initialRoomCode ? 'coop' : 'none'));
  const [tutorialMode, setTutorialMode] = useState<'inactive' | 'paused_step' | 'live_play'>('inactive');
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [showIntroVideo, setShowIntroVideo] = useState(() => !detectTouchDevice() && !initialRoomCode);

  const [wsStatus, setWsStatus] = useState<WsConnStatus>('disconnected');
  const [coopRoom, setCoopRoom] = useState<RoomStatePayload | null>(null);
  const [coopPlayerId, setCoopPlayerId] = useState<string | null>(null);
  const [openRooms, setOpenRooms] = useState<OpenRoomListing[]>([]);
  const [coopError, setCoopError] = useState<string | null>(null);
  const [coopJoinCodeDraft, setCoopJoinCodeDraft] = useState<string>(initialRoomCode);
  const [coopMatchSummary, setCoopMatchSummary] = useState<CoopMatchEndPayload | null>(null);
  const isOnline = useOnlineStatus();

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
        engineRef.current?.setLoadout(
          state.profile.selected_jet || 'vanguard',
          state.profile.selected_skin || 'factory',
          state.profile.selected_trail || 'jet_default',
          state.profile.equipped_mods || []
        );
        if (healthRes?.python_version) {
          setBackendStatus(`PYTHON ${healthRes.python_version} · SQLITE`);
        } else {
          setBackendStatus('OFFLINE · LOCAL SAVE');
        }
      } catch {
        if (active) setBackendStatus('OFFLINE · LOCAL SAVE');
      }
    })();
    return () => {
      active = false;
    };
  }, [isOnline]);

  // Lock standalone/APK mobile launches into landscape automatically when possible
  useEffect(() => {
    if (!detectTouchDevice()) return;
    const isAppMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches;
    if (!isAppMode) return;
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: 'landscape') => Promise<void>;
      };
      void orientation?.lock?.('landscape')?.catch(() => {});
    } catch {
      // Ignore if browser restricts lock before user gesture
    }
  }, []);

  // Keep phone screen awake during active flight when installed or playing on mobile
  useEffect(() => {
    if (hud.phase !== 'playing' || !('wakeLock' in navigator)) return;
    let sentinel: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } })
      .wakeLock?.request('screen')
      .then((s) => {
        if (cancelled) {
          void s.release().catch(() => {});
        } else {
          sentinel = s;
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (sentinel) void sentinel.release().catch(() => {});
    };
  }, [hud.phase]);

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
        onCoopSend: (msg) => {
          mpClientRef.current?.send(msg);
        },
        onCoopMatchEnd: (summary) => {
          setCoopMatchSummary(summary);
          const prof = backendStateRef.current?.profile;
          const localSlot =
            coopRoomRef.current?.players.find((p) => p.playerId === coopPlayerIdRef.current)?.slot ?? 1;
          const localScore = localSlot === 1 ? summary.p1Score : summary.p2Score;
          const localKills = localSlot === 1 ? summary.p1Kills : summary.p2Kills;
          submitScoreToPython({
            pilotName: prof?.pilot_name || 'VANGUARD-01',
            selectedJet: prof?.selected_jet || 'vanguard',
            score: localScore,
            wave: summary.wave,
            kills: localKills,
            maxMultiplier: 1,
            accuracy: 0,
            clearAutosave: false,
          })
            .then((res) => {
              backendStateRef.current = res.state;
              setBackendState(res.state);
              setLastRunCredits(res.earned_credits);
              engine.setHighScore(res.state.profile.high_score ?? localScore);
            })
            .catch(() => {});
        },
      },
      backendStateRef.current?.profile.high_score ?? 0,
      backendStateRef.current?.profile.selected_jet ?? 'vanguard'
    );

    engineRef.current = engine;
    const prof = backendStateRef.current?.profile;
    if (prof) {
      engine.setLoadout(
        prof.selected_jet || 'vanguard',
        prof.selected_skin || 'factory',
        prof.selected_trail || 'jet_default',
        prof.equipped_mods || []
      );
    }
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [showToast]);

  // WebSocket Multiplayer Client lifecycle
  useEffect(() => {
    const client = new MultiplayerClient({
      onStatusChange: (status) => {
        setWsStatus(status);
        if (status === 'connected') {
          setCoopError((prev) =>
            prev && prev.includes('retrying link') ? null : prev
          );
          client.refreshRooms();
        }
      },
      onConnectionIssue: (message) => {
        setCoopError(message);
      },
      onWelcome: (id) => {
        coopPlayerIdRef.current = id;
        setCoopPlayerId(id);
      },
      onRoomList: (rooms) => {
        setOpenRooms(rooms);
      },
      onRoomState: (room, yourId) => {
        coopPlayerIdRef.current = yourId;
        coopRoomRef.current = room;
        setCoopPlayerId(yourId);
        setCoopRoom(room);
        setCoopError(null);
      },
      onRoomError: (message) => {
        setCoopError(message);
        showToast(message);
      },
      onGameStarted: (room) => {
        const myId = coopPlayerIdRef.current;
        const localPlayer = room.players.find((p) => p.playerId === myId);
        const partner = room.players.find((p) => p.playerId !== myId);
        if (!localPlayer || !partner) {
          setCoopError('Waiting for both pilots to connect before launching.');
          return;
        }
        enterMobileLandscape();
        setShowIntroVideo(false);
        coopRoomRef.current = room;
        setCoopRoom(room);
        setCoopMatchSummary(null);
        setLastRunCredits(null);
        setActiveTab('none');
        engineRef.current?.startCoopGame(backendStateRef.current?.profile, {
          roomCode: room.code,
          localSlot: localPlayer.slot,
          localName: localPlayer.pilotName,
          partner,
          startLevel: room.startLevel,
        });
      },
      onReturnedLobby: (room) => {
        coopRoomRef.current = room;
        setCoopRoom(room);
      },
      onGameMessage: (msg) => {
        engineRef.current?.handleCoopMessage(msg);
      },
    });
    mpClientRef.current = client;

    if (initialRoomCode) {
      client.setAutoReconnect(true);
      client.connect();
    }

    return () => {
      client.dispose();
      mpClientRef.current = null;
    };
  }, [initialRoomCode, showToast]);

  // Keep WebSocket auto-reconnect active whenever Co-Op UI or match is active
  useEffect(() => {
    const client = mpClientRef.current;
    if (!client) return;
    const needed = activeTab === 'coop' || coopRoom !== null || Boolean(hud.coop?.active);
    client.setAutoReconnect(needed);
    if (needed && client.getStatus() === 'disconnected') {
      client.connect();
    }
  }, [activeTab, coopRoom, hud.coop?.active]);

  // Auto-join when opened via ?room=CODE invite link once connected
  useEffect(() => {
    if (
      !initialRoomCode ||
      initialRoomCode.length !== 4 ||
      autoJoinedRoomRef.current ||
      wsStatus !== 'connected' ||
      coopRoom !== null
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (autoJoinedRoomRef.current || coopRoomRef.current) return;
      autoJoinedRoomRef.current = true;
      mpClientRef.current?.joinRoom(
        initialRoomCode,
        profileToRoomProfile(backendStateRef.current?.profile)
      );
      if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete('room');
        window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      }
    }, backendState ? 50 : 350);
    return () => window.clearTimeout(timer);
  }, [backendState, coopRoom, initialRoomCode, wsStatus]);

  const syncCoopProfile = useCallback((profile?: PilotProfile | null) => {
    if (!mpClientRef.current || !coopRoom) return;
    mpClientRef.current.updateProfile(profileToRoomProfile(profile));
  }, [coopRoom]);

  const handleOpenCoop = useCallback(() => {
    setCoopError(null);
    setActiveTab('coop');
    mpClientRef.current?.setAutoReconnect(true);
    mpClientRef.current?.connect();
    mpClientRef.current?.refreshRooms();
  }, []);

  const handleCreateCoopRoom = useCallback((startLevel: number) => {
    setCoopError(null);
    mpClientRef.current?.setAutoReconnect(true);
    mpClientRef.current?.createRoom(profileToRoomProfile(backendStateRef.current?.profile), startLevel);
  }, []);

  const handleJoinCoopRoom = useCallback((code: string) => {
    setCoopError(null);
    mpClientRef.current?.setAutoReconnect(true);
    mpClientRef.current?.joinRoom(code, profileToRoomProfile(backendStateRef.current?.profile));
  }, []);

  const handleReconnectCoop = useCallback(() => {
    setCoopError(null);
    mpClientRef.current?.setAutoReconnect(true);
    mpClientRef.current?.reconnectNow();
  }, []);

  const handleLeaveCoopRoom = useCallback(() => {
    mpClientRef.current?.leaveRoom();
    coopRoomRef.current = null;
    setCoopRoom(null);
    setCoopError(null);
    mpClientRef.current?.refreshRooms();
  }, []);

  const handleToggleCoopReady = useCallback(() => {
    if (!coopRoom) return;
    const me = coopRoom.players.find((p) => p.playerId === coopPlayerIdRef.current);
    if (!me) return;
    mpClientRef.current?.setReady(!me.ready);
  }, [coopRoom]);

  const handleSetCoopLevel = useCallback((level: number) => {
    mpClientRef.current?.setStartLevel(level);
  }, []);

  const handleStartCoopMatch = useCallback(() => {
    mpClientRef.current?.startGame();
  }, []);

  const handleRefreshCoopRooms = useCallback(() => {
    mpClientRef.current?.setAutoReconnect(true);
    mpClientRef.current?.connect();
    mpClientRef.current?.refreshRooms();
  }, []);

  const handleReturnToCoopLobby = useCallback(() => {
    setCoopMatchSummary(null);
    setLastRunCredits(null);
    engineRef.current?.returnToTitle();
    if (coopRoom) {
      mpClientRef.current?.returnToLobby();
    } else {
      mpClientRef.current?.setAutoReconnect(true);
      mpClientRef.current?.connect();
      mpClientRef.current?.refreshRooms();
    }
    setActiveTab('coop');
  }, [coopRoom]);

  const handleStartNewGame = useCallback((startLevel = 1) => {
    enterMobileLandscape();
    setCoopMatchSummary(null);
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
      const seq = ++jetSelectSeqRef.current;
      const prof = backendStateRef.current?.profile;
      engineRef.current?.setLoadout(
        jetId,
        prof?.selected_skin || 'factory',
        prof?.selected_trail || 'jet_default',
        prof?.equipped_mods || []
      );
      if (backendStateRef.current) {
        const optimisticState: BackendState = {
          ...backendStateRef.current,
          profile: {
            ...backendStateRef.current.profile,
            selected_jet: jetId,
          },
        };
        backendStateRef.current = optimisticState;
        setBackendState(optimisticState);
      }
      try {
        const state = await selectJetInPython(jetId);
        if (seq !== jetSelectSeqRef.current) return;
        backendStateRef.current = state;
        setBackendState(state);
        syncCoopProfile(state.profile);
      } catch (err) {
        if (seq === jetSelectSeqRef.current) {
          showToast(err instanceof Error ? err.message : 'Jet selection failed');
        }
      }
    },
    [showToast, syncCoopProfile]
  );

  const handleSelectCosmetic = useCallback(
    async (kind: 'skin' | 'trail', id: JetSkinId | TrailColorId) => {
      setBusy(true);
      try {
        const state = await setCosmeticInPython(kind, id);
        backendStateRef.current = state;
        setBackendState(state);
        engineRef.current?.setLoadout(
          state.profile.selected_jet || 'vanguard',
          state.profile.selected_skin || 'factory',
          state.profile.selected_trail || 'jet_default',
          state.profile.equipped_mods || []
        );
        syncCoopProfile(state.profile);
        showToast(`${kind === 'skin' ? 'LIVERY' : 'TRAIL'} UPDATED`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Cosmetic update failed');
      } finally {
        setBusy(false);
      }
    },
    [showToast, syncCoopProfile]
  );

  const handleManageMod = useCallback(
    async (modId: CyberModId, action: 'buy' | 'toggle') => {
      setBusy(true);
      try {
        const state = await manageModInPython(modId, action);
        backendStateRef.current = state;
        setBackendState(state);
        engineRef.current?.setLoadout(
          state.profile.selected_jet || 'vanguard',
          state.profile.selected_skin || 'factory',
          state.profile.selected_trail || 'jet_default',
          state.profile.equipped_mods || []
        );
        syncCoopProfile(state.profile);
        const modName = CYBER_MODS[modId]?.name || modId;
        const nowEquipped = state.profile.equipped_mods.includes(modId);
        showToast(
          action === 'buy'
            ? `UNLOCKED & EQUIPPED: ${modName.toUpperCase()}`
            : nowEquipped
            ? `EQUIPPED: ${modName.toUpperCase()}`
            : `UNEQUIPPED: ${modName.toUpperCase()}`
        );
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Cyber-Mod update failed');
      } finally {
        setBusy(false);
      }
    },
    [showToast, syncCoopProfile]
  );

  const handleUpdatePilotName = useCallback(
    async (name: string) => {
      setBusy(true);
      try {
        const state = await updatePilotNameInPython(name);
        backendStateRef.current = state;
        setBackendState(state);
        syncCoopProfile(state.profile);
        showToast('PILOT CALLSIGN UPDATED');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Update failed');
      } finally {
        setBusy(false);
      }
    },
    [showToast, syncCoopProfile]
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
    if (engineRef.current?.isCoopActive() || coopMatchSummary) {
      mpClientRef.current?.leaveRoom();
      coopRoomRef.current = null;
      setCoopRoom(null);
      setCoopMatchSummary(null);
    }
    setActiveTab('none');
    engineRef.current?.returnToTitle();
  }, [coopMatchSummary]);

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
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#02060d] touch-none">
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
        onSelectCosmetic={handleSelectCosmetic}
        onManageMod={handleManageMod}
        onUpdatePilotName={handleUpdatePilotName}
        onReviveWithCredits={handleReviveWithCredits}
        onReturnToTitle={handleReturnToTitle}
        onOpenTutorials={handleOpenTutorials}
        suppressPauseModal={tutorialMode !== 'inactive'}
        wsStatus={wsStatus}
        coopRoom={coopRoom}
        coopPlayerId={coopPlayerId}
        openRooms={openRooms}
        coopError={coopError}
        coopJoinCodeDraft={coopJoinCodeDraft}
        setCoopJoinCodeDraft={setCoopJoinCodeDraft}
        coopMatchSummary={coopMatchSummary}
        onOpenCoop={handleOpenCoop}
        onCreateCoopRoom={handleCreateCoopRoom}
        onJoinCoopRoom={handleJoinCoopRoom}
        onLeaveCoopRoom={handleLeaveCoopRoom}
        onToggleCoopReady={handleToggleCoopReady}
        onSetCoopLevel={handleSetCoopLevel}
        onStartCoopMatch={handleStartCoopMatch}
        onRefreshCoopRooms={handleRefreshCoopRooms}
        onReconnectCoop={handleReconnectCoop}
        onReturnToCoopLobby={handleReturnToCoopLobby}
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

      {!isOnline && hud.phase !== 'playing' && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center gap-1.5 rounded-sm border border-amber-400/55 bg-[#040d17]/90 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-amber-200/90">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span>Offline</span>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none px-4 py-2 bg-[#040d17] border border-emerald-400/70 text-emerald-200 font-mono text-xs font-bold tracking-[0.16em] uppercase shadow-[0_0_24px_rgba(0,255,136,0.28)]">
          {toast}
        </div>
      )}
    </div>
  );
}
