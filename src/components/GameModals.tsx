import React, { useState } from 'react';
import {
  Play,
  Save,
  FolderOpen,
  Trash2,
  Trophy,
  Wrench,
  RotateCcw,
  Home,
  Database,
  Shield,
  Heart,
  Zap,
  X,
  Plane,
  Download,
  Award,
  BookOpen,
  Palette,
  Sparkles,
  Cpu,
  Users,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Radio,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  CYBER_MODS,
  JET_SKINS,
  JETS,
  LEVELS,
  TRAIL_COLORS,
  type BackendState,
  type CyberModId,
  type GamePhase,
  type HudSnapshot,
  type JetId,
  type JetSkinId,
  type SaveSlotRecord,
  type TrailColorId,
} from '../game/types';
import type { WsConnStatus } from '../api/multiplayerClient';
import type {
  CoopMatchEndPayload,
  OpenRoomListing,
  RoomStatePayload,
} from '../game/multiplayerTypes';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { JetPreviewCanvas } from './JetPreviewCanvas';

export type ModalTab = 'none' | 'slots' | 'hangar' | 'leaderboard' | 'coop';

interface GameModalsProps {
  phase: GamePhase;
  hud: HudSnapshot;
  backendState: BackendState | null;
  backendStatus: string | null;
  busy: boolean;
  lastRunCredits: number | null;
  activeTab: ModalTab;
  setActiveTab: (tab: ModalTab) => void;
  onStartNewGame: (startLevel?: number) => void;
  onResumeGame: () => void;
  onSaveToSlot: (slotId: string) => void;
  onLoadSlot: (slot: SaveSlotRecord) => void;
  onDeleteSlot: (slotId: string) => void;
  onPurchaseUpgrade: (type: 'hull_upgrade' | 'shield_upgrade' | 'laser_upgrade') => void;
  onSelectJet: (jetId: JetId) => void;
  onSelectCosmetic: (kind: 'skin' | 'trail', id: JetSkinId | TrailColorId) => void;
  onManageMod: (modId: CyberModId, action: 'buy' | 'toggle') => void;
  onUpdatePilotName: (name: string) => void;
  onReviveWithCredits: () => void;
  onReturnToTitle: () => void;
  onOpenTutorials: () => void;
  suppressPauseModal?: boolean;
  wsStatus: WsConnStatus;
  coopRoom: RoomStatePayload | null;
  coopPlayerId: string | null;
  openRooms: OpenRoomListing[];
  coopError: string | null;
  coopJoinCodeDraft: string;
  setCoopJoinCodeDraft: (code: string) => void;
  coopMatchSummary: CoopMatchEndPayload | null;
  onOpenCoop: () => void;
  onCreateCoopRoom: (startLevel: number) => void;
  onJoinCoopRoom: (code: string) => void;
  onLeaveCoopRoom: () => void;
  onToggleCoopReady: () => void;
  onSetCoopLevel: (level: number) => void;
  onStartCoopMatch: () => void;
  onRefreshCoopRooms: () => void;
  onReturnToCoopLobby: () => void;
}

export const GameModals: React.FC<GameModalsProps> = ({
  phase,
  hud,
  backendState,
  backendStatus,
  busy,
  lastRunCredits,
  activeTab,
  setActiveTab,
  onStartNewGame,
  onResumeGame,
  onSaveToSlot,
  onLoadSlot,
  onDeleteSlot,
  onPurchaseUpgrade,
  onSelectJet,
  onSelectCosmetic,
  onManageMod,
  onUpdatePilotName,
  onReviveWithCredits,
  onReturnToTitle,
  onOpenTutorials,
  suppressPauseModal = false,
  wsStatus,
  coopRoom,
  coopPlayerId,
  openRooms,
  coopError,
  coopJoinCodeDraft,
  setCoopJoinCodeDraft,
  coopMatchSummary,
  onOpenCoop,
  onCreateCoopRoom,
  onJoinCoopRoom,
  onLeaveCoopRoom,
  onToggleCoopReady,
  onSetCoopLevel,
  onStartCoopMatch,
  onRefreshCoopRooms,
  onReturnToCoopLobby,
}) => {
  const [pilotDraft, setPilotDraft] = useState(backendState?.profile.pilot_name || 'VANGUARD-01');
  const [createLevel, setCreateLevel] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [jetSlideDir, setJetSlideDir] = useState<1 | -1>(1);
  const [inViewDrawer, setInViewDrawer] = useState<'none' | 'colors' | 'thrusters'>('none');
  const [hangarBottomTab, setHangarBottomTab] = useState<'upgrades' | 'mods'>('upgrades');
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [copiedAppUrl, setCopiedAppUrl] = useState(false);
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();

  const profile = backendState?.profile;
  const selectedJetId: JetId = profile?.selected_jet || hud.jetId || 'vanguard';
  const selectedSkinId: JetSkinId = profile?.selected_skin || 'factory';
  const selectedTrailId: TrailColorId = profile?.selected_trail || 'jet_default';
  const unlockedSkins: JetSkinId[] = profile?.unlocked_skins || ['factory'];
  const unlockedTrails: TrailColorId[] = profile?.unlocked_trails || ['jet_default'];
  const unlockedMods: CyberModId[] = profile?.unlocked_mods || [];
  const equippedMods: CyberModId[] = profile?.equipped_mods || [];
  const activeJet = JETS[selectedJetId];
  const slots = backendState?.slots ?? [];
  const autosaveSlot = slots.find((s) => s.slot_id === 'autosave') || slots[0];
  const leaderboard = backendState?.leaderboard ?? [];

  const handleCopyInviteLink = () => {
    if (!coopRoom) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${coopRoom.code}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1800);
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowInstallGuide(true);
  };

  const handleCopyAppUrl = () => {
    const url = window.location.origin;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedAppUrl(true);
    window.setTimeout(() => setCopiedAppUrl(false), 1800);
  };

  if (activeTab !== 'none') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#02060d]/84 font-mono">
        <div className="w-full max-w-3xl bg-[#06101b] border border-emerald-400/50 rounded-sm shadow-[0_0_40px_rgba(0,255,136,0.16)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-emerald-500/30 bg-[#040a12]">
            <div className="flex items-center gap-2.5 text-emerald-300 font-bold tracking-[0.18em] text-xs sm:text-sm uppercase">
              {activeTab === 'coop' ? <Users className="w-4 h-4 text-sky-300" /> : <Database className="w-4 h-4" />}
              <span>
                {activeTab === 'slots' && 'Python SQLite Save Checkpoints'}
                {activeTab === 'hangar' && 'Vanguard Hangar · Jets & Upgrades'}
                {activeTab === 'leaderboard' && 'Sector High Scores'}
                {activeTab === 'coop' && '2P Co-Op Arena · Strict 2-Pilot Room'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'hangar' && coopRoom && (
                <button
                  type="button"
                  onClick={() => setActiveTab('coop')}
                  className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/60 text-sky-200 text-[10px] font-bold uppercase tracking-wider rounded-sm"
                >
                  Back to 2P Room
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('none')}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 max-h-[78vh] overflow-y-auto space-y-4">
            {activeTab === 'slots' && (
              <>
                {phase === 'paused' && (
                  <div className="p-3 bg-emerald-950/35 border border-emerald-500/40 rounded-sm">
                    <div className="text-xs text-emerald-300 uppercase tracking-wider mb-2">
                      Save Level {hud.wave}/{hud.totalLevels} Progress ({hud.score.toLocaleString()} PTS)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['autosave', 'slot_1', 'slot_2', 'slot_3'].map((slotId) => (
                        <button
                          key={slotId}
                          type="button"
                          disabled={busy}
                          onClick={() => onSaveToSlot(slotId)}
                          className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/60 text-emerald-200 text-xs font-semibold uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{slotId === 'autosave' ? 'Autosave' : slotId.replace('_', ' ')}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {slots.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    No saved checkpoints in Python SQLite yet. Clear a level boss or pause mid-flight to save!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {slots.map((slot) => (
                      <div
                        key={slot.slot_id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#040a12] border border-slate-700/80 rounded-sm"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-fuchsia-500/20 border border-fuchsia-400/50 text-fuchsia-200">
                              {slot.slot_id}
                            </span>
                            <span className="text-sm font-bold text-white">{slot.pilot_name}</span>
                            <span className="text-xs text-sky-300">
                              {JETS[slot.selected_jet || 'vanguard']?.name}
                            </span>
                            <span className="text-xs text-emerald-300 tabular-nums">
                              LVL {slot.wave}/30 · {slot.score.toLocaleString()} PTS
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400 tabular-nums">
                            Hull {Math.round(slot.health)}/{Math.round(slot.max_health)} · Shield{' '}
                            {Math.round(slot.shield)}/{Math.round(slot.max_shield)} ·{' '}
                            {new Date(slot.updated_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onLoadSlot(slot)}
                            className="px-3 py-1.5 bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-400 text-emerald-100 text-xs font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Load</span>
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onDeleteSlot(slot.slot_id)}
                            className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 rounded-sm"
                            title="Delete Save"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'hangar' &&
              (() => {
                const jetKeys = Object.keys(JETS) as JetId[];
                const currentJetIdx = Math.max(0, jetKeys.indexOf(selectedJetId));
                const activeSkin = JET_SKINS[selectedSkinId];
                const activeTrail = TRAIL_COLORS[selectedTrailId];

                const stepJet = (dir: 1 | -1) => {
                  setJetSlideDir(dir);
                  const nextIdx = (currentJetIdx + dir + jetKeys.length) % jetKeys.length;
                  onSelectJet(jetKeys[nextIdx]);
                };

                const jumpToJet = (idx: number) => {
                  if (idx === currentJetIdx) return;
                  setJetSlideDir(idx > currentJetIdx ? 1 : -1);
                  onSelectJet(jetKeys[idx]);
                };

                return (
                  <div className="space-y-4">
                    {/* Top Callsign & Credits Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#040a12] border border-slate-700/80 rounded-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Callsign</span>
                        <input
                          type="text"
                          maxLength={20}
                          value={pilotDraft}
                          onChange={(e) => setPilotDraft(e.target.value)}
                          className="px-2.5 py-1.5 bg-[#081320] border border-emerald-500/40 text-white text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-emerald-400"
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onUpdatePilotName(pilotDraft)}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/60 text-emerald-200 text-xs font-bold whitespace-nowrap shrink-0"
                        >
                          Save
                        </button>
                      </div>
                      <div className="text-sm font-bold text-amber-300 tabular-nums">
                        {(profile?.credits ?? 0).toLocaleString()} CR
                      </div>
                    </div>

                    {/* Hero 3D Jet Showcase with < > Carousel & In-View Color / Wingtip Thrusters Controls */}
                    <JetPreviewCanvas
                      jetId={selectedJetId}
                      skinId={selectedSkinId}
                      trailId={selectedTrailId}
                      slideDirection={jetSlideDir}
                      className="h-56 sm:h-72 md:h-[340px]"
                    >
                      {/* Top Info Overlay (Unboxed, Non-Obstructing) */}
                      <div className="pointer-events-none absolute top-3 left-3.5 right-3.5 flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-300 tabular-nums">
                            <span>
                              Jet {currentJetIdx + 1} of {jetKeys.length}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{activeJet.role}</span>
                          </div>
                          <h3
                            className="text-lg sm:text-xl font-extrabold tracking-wide leading-tight"
                            style={{ color: activeJet.primaryColor }}
                          >
                            {activeJet.name}
                          </h3>
                        </div>
                        <span className="hidden sm:inline text-[11px] text-slate-400 bg-[#030812]/70 px-2 py-1 rounded-sm">
                          Drag jet to rotate
                        </span>
                      </div>

                      {/* Left (<) Previous Jet Button */}
                      <button
                        type="button"
                        aria-label="Previous Jet"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => stepJet(-1)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-[#040b14]/85 hover:bg-emerald-500/25 border border-emerald-400/60 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>

                      {/* Right (>) Next Jet Button */}
                      <button
                        type="button"
                        aria-label="Next Jet"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => stepJet(1)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-[#040b14]/85 hover:bg-emerald-500/25 border border-emerald-400/60 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>

                      {/* Bottom In-View Drawers + Color & Wingtip Thrusters Triggers */}
                      <div
                        onPointerDown={(e) => e.stopPropagation()}
                        className="absolute bottom-0 inset-x-0 z-10 p-3 bg-gradient-to-t from-[#02060d]/95 via-[#02060d]/70 to-transparent space-y-2"
                      >
                        {/* In-View Livery Color Selector (Jet Remains Clearly Visible Above) */}
                        {inViewDrawer === 'colors' && (
                          <div className="p-2.5 bg-[#040c17]/92 backdrop-blur-md border border-sky-400/50 rounded-sm space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-sky-200">Livery Color</span>
                              <button
                                type="button"
                                aria-label="Close colors"
                                onClick={() => setInViewDrawer('none')}
                                className="p-0.5 text-slate-400 hover:text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                              {(Object.keys(JET_SKINS) as JetSkinId[]).map((skinKey) => {
                                const skin = JET_SKINS[skinKey];
                                const unlocked = unlockedSkins.includes(skin.id) || skin.cost === 0;
                                const equipped = selectedSkinId === skin.id;
                                const canAfford = (profile?.credits ?? 0) >= skin.cost;
                                return (
                                  <button
                                    key={skin.id}
                                    type="button"
                                    disabled={busy || (!unlocked && !canAfford)}
                                    onClick={() => onSelectCosmetic('skin', skin.id)}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-sm border text-left transition-colors disabled:opacity-45 ${
                                      equipped
                                        ? 'bg-sky-500/25 border-sky-300 text-white'
                                        : 'bg-[#07111f]/90 hover:border-sky-400/70 border-slate-700 text-slate-200'
                                    }`}
                                  >
                                    <span
                                      className="w-4 h-4 rounded-sm border border-white/40 shrink-0"
                                      style={{
                                        backgroundColor: skin.swatchColor,
                                        boxShadow: skin.aeroKit ? `0 0 8px ${skin.swatchColor}` : undefined,
                                      }}
                                    />
                                    <div className="min-w-0">
                                      <div className="text-[11px] font-bold truncate">{skin.name}</div>
                                      <div className="text-[10px] text-slate-400 tabular-nums">
                                        {equipped ? 'Equipped' : unlocked ? (skin.cost === 0 ? 'Free' : 'Owned') : `${skin.cost} CR`}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* In-View Wingtip Thrusters Selector (Jet Remains Clearly Visible Above) */}
                        {inViewDrawer === 'thrusters' && (
                          <div className="p-2.5 bg-[#040c17]/92 backdrop-blur-md border border-fuchsia-400/50 rounded-sm space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-fuchsia-200">Wingtip &amp; Thruster Glow</span>
                              <button
                                type="button"
                                aria-label="Close wingtip thrusters"
                                onClick={() => setInViewDrawer('none')}
                                className="p-0.5 text-slate-400 hover:text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                              {(Object.keys(TRAIL_COLORS) as TrailColorId[]).map((trailKey) => {
                                const trail = TRAIL_COLORS[trailKey];
                                const unlocked = unlockedTrails.includes(trail.id) || trail.cost === 0;
                                const equipped = selectedTrailId === trail.id;
                                const canAfford = (profile?.credits ?? 0) >= trail.cost;
                                return (
                                  <button
                                    key={trail.id}
                                    type="button"
                                    disabled={busy || (!unlocked && !canAfford)}
                                    onClick={() => onSelectCosmetic('trail', trail.id)}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-sm border text-left transition-colors disabled:opacity-45 ${
                                      equipped
                                        ? 'bg-fuchsia-500/25 border-fuchsia-300 text-white'
                                        : 'bg-[#07111f]/90 hover:border-fuchsia-400/70 border-slate-700 text-slate-200'
                                    }`}
                                  >
                                    <span
                                      className="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0"
                                      style={{
                                        backgroundColor: trail.cssColor,
                                        boxShadow: `0 0 8px ${trail.cssColor}`,
                                      }}
                                    />
                                    <div className="min-w-0">
                                      <div className="text-[11px] font-bold truncate">{trail.name}</div>
                                      <div className="text-[10px] text-slate-400 tabular-nums">
                                        {equipped ? 'Active' : unlocked ? (trail.cost === 0 ? 'Free' : 'Owned') : `${trail.cost} CR`}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* In-View Action Buttons & Carousel Dots */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setInViewDrawer((prev) => (prev === 'colors' ? 'none' : 'colors'))
                              }
                              className={`px-3 py-2 rounded-sm border text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                                inViewDrawer === 'colors'
                                  ? 'bg-sky-500/30 border-sky-300 text-white'
                                  : 'bg-[#040c17]/90 hover:border-sky-400 border-slate-600 text-sky-100'
                              }`}
                            >
                              <Palette className="w-3.5 h-3.5 text-sky-300" />
                              <span>Colors</span>
                              <span
                                className="w-3 h-3 rounded-sm border border-white/40"
                                style={{ backgroundColor: activeSkin.swatchColor }}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setInViewDrawer((prev) => (prev === 'thrusters' ? 'none' : 'thrusters'))
                              }
                              className={`px-3 py-2 rounded-sm border text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                                inViewDrawer === 'thrusters'
                                  ? 'bg-fuchsia-500/30 border-fuchsia-300 text-white'
                                  : 'bg-[#040c17]/90 hover:border-fuchsia-400 border-slate-600 text-fuchsia-100'
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
                              <span>Wingtip Thrusters</span>
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-white/40"
                                style={{
                                  backgroundColor: activeTrail.cssColor,
                                  boxShadow: `0 0 6px ${activeTrail.cssColor}`,
                                }}
                              />
                            </button>
                          </div>

                          {/* 8-Jet Selector Dots */}
                          <div className="flex items-center gap-1.5 px-1" aria-label="Jet lineup">
                            {jetKeys.map((key, idx) => {
                              const active = idx === currentJetIdx;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  aria-label={`Select ${JETS[key].name}`}
                                  onClick={() => jumpToJet(idx)}
                                  className={`h-2 rounded-full transition-all ${
                                    active
                                      ? 'w-5 bg-emerald-400'
                                      : 'w-2 bg-slate-600 hover:bg-slate-400'
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </JetPreviewCanvas>

                    {/* Concise Jet Performance & Special Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 bg-[#040a12] border border-slate-800 rounded-sm">
                        <div className="text-[10px] text-slate-400">Speed</div>
                        <div className="text-sm font-bold text-sky-300 tabular-nums">
                          {Math.round(activeJet.speedMult * 100)}%
                        </div>
                      </div>
                      <div className="p-2.5 bg-[#040a12] border border-slate-800 rounded-sm">
                        <div className="text-[10px] text-slate-400">Firepower</div>
                        <div className="text-sm font-bold text-amber-300 tabular-nums">
                          {Math.round(activeJet.damageMult * 100)}%
                        </div>
                      </div>
                      <div className="p-2.5 bg-[#040a12] border border-slate-800 rounded-sm">
                        <div className="text-[10px] text-slate-400">Hull / Shield Bonus</div>
                        <div className="text-sm font-bold text-emerald-300 tabular-nums">
                          {activeJet.hullBonus >= 0 ? `+${activeJet.hullBonus}` : activeJet.hullBonus} /{' '}
                          {activeJet.shieldBonus >= 0 ? `+${activeJet.shieldBonus}` : activeJet.shieldBonus}
                        </div>
                      </div>
                      <div className="p-2.5 bg-[#040a12] border border-slate-800 rounded-sm">
                        <div className="text-[10px] text-amber-300 font-bold truncate">
                          Special · {activeJet.specialName}
                        </div>
                        <div className="text-[11px] text-slate-300 truncate" title={activeJet.specialDesc}>
                          {activeJet.specialDesc}
                        </div>
                      </div>
                    </div>

                    {/* Clean Toggle for Upgrades vs Cyber-Mods */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1 p-1 bg-[#040a12] border border-slate-800 rounded-sm w-fit">
                        <button
                          type="button"
                          onClick={() => setHangarBottomTab('upgrades')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                            hangarBottomTab === 'upgrades'
                              ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-200'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Ship Upgrades</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHangarBottomTab('mods')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                            hangarBottomTab === 'mods'
                              ? 'bg-cyan-500/20 border border-cyan-400/60 text-cyan-200'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Cpu className="w-3.5 h-3.5" />
                          <span>Cyber-Mods ({equippedMods.length}/2)</span>
                        </button>
                      </div>

                      {hangarBottomTab === 'upgrades' && profile && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            {
                              key: 'hull_upgrade' as const,
                              label: 'Reinforced Hull',
                              desc: '+25 Max Hull Armor per tier',
                              level: profile.hull_upgrade,
                              icon: Heart,
                            },
                            {
                              key: 'shield_upgrade' as const,
                              label: 'Deflector Matrix',
                              desc: '+25 Max Shield per tier',
                              level: profile.shield_upgrade,
                              icon: Shield,
                            },
                            {
                              key: 'laser_upgrade' as const,
                              label: 'Laser Overclock',
                              desc: '+22% Weapon Output per tier',
                              level: profile.laser_upgrade,
                              icon: Zap,
                            },
                          ].map((item) => {
                            const Icon = item.icon;
                            const maxed = item.level >= 5;
                            const cost = 120 * (item.level + 1);
                            const canAfford = profile.credits >= cost;
                            return (
                              <div
                                key={item.key}
                                className="p-3 bg-[#040a12] border border-slate-700/80 rounded-sm flex flex-col justify-between gap-2.5"
                              >
                                <div>
                                  <div className="flex items-center justify-between text-white font-bold text-xs sm:text-sm">
                                    <span className="flex items-center gap-1.5">
                                      <Icon className="w-4 h-4 text-emerald-300" />
                                      {item.label}
                                    </span>
                                    <span className="text-xs text-emerald-300 tabular-nums">LVL {item.level}/5</span>
                                  </div>
                                  <p className="mt-1 text-[11px] text-slate-400">{item.desc}</p>
                                </div>

                                <button
                                  type="button"
                                  disabled={busy || maxed || !canAfford}
                                  onClick={() => onPurchaseUpgrade(item.key)}
                                  className="w-full py-2 text-xs font-bold uppercase tracking-wider border rounded-sm transition-colors disabled:opacity-45 bg-emerald-500/20 hover:bg-emerald-500/35 border-emerald-400/60 text-emerald-200"
                                >
                                  {maxed ? 'Maxed Out' : `Upgrade · ${cost} CR`}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {hangarBottomTab === 'mods' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {(Object.keys(CYBER_MODS) as CyberModId[]).map((modKey) => {
                            const mod = CYBER_MODS[modKey];
                            const unlocked = unlockedMods.includes(mod.id);
                            const equipped = equippedMods.includes(mod.id);
                            const canAfford = (profile?.credits ?? 0) >= mod.cost;
                            return (
                              <div
                                key={mod.id}
                                className={`p-3 rounded-sm border flex flex-col justify-between gap-2 ${
                                  equipped
                                    ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.18)]'
                                    : 'bg-[#040a12] border-slate-700/80'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold" style={{ color: mod.accentColor }}>
                                      {mod.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 tabular-nums">
                                      {equipped ? 'Equipped' : unlocked ? 'Owned' : `${mod.cost} CR`}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] text-slate-300 leading-snug">{mod.desc}</p>
                                </div>
                                <button
                                  type="button"
                                  disabled={busy || (!unlocked && !canAfford)}
                                  onClick={() => onManageMod(mod.id, unlocked ? 'toggle' : 'buy')}
                                  className={`w-full py-1.5 text-[11px] font-bold uppercase tracking-wider border rounded-sm transition-colors disabled:opacity-45 ${
                                    equipped
                                      ? 'bg-cyan-500/30 hover:bg-cyan-500/45 border-cyan-300 text-cyan-100'
                                      : unlocked
                                      ? 'bg-emerald-500/20 hover:bg-emerald-500/35 border-emerald-400/60 text-emerald-200'
                                      : 'bg-amber-500/20 hover:bg-amber-500/35 border-amber-400/70 text-amber-200'
                                  }`}
                                >
                                  {equipped
                                    ? 'Unequip'
                                    : unlocked
                                    ? equippedMods.length >= 2
                                      ? 'Swap In'
                                      : 'Equip'
                                    : `Unlock · ${mod.cost} CR`}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            {activeTab === 'leaderboard' && (
              <>
                {leaderboard.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    No completed sorties recorded yet. Launch a mission to set the first high score!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800 border border-slate-800 bg-[#040a12]">
                    {leaderboard.map((entry, idx) => (
                      <div key={entry.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="w-6 text-amber-300 font-bold tabular-nums">#{idx + 1}</span>
                          <span className="font-bold text-white">{entry.pilot_name}</span>
                          <span className="text-fuchsia-300">
                            {JETS[entry.selected_jet || 'vanguard']?.name}
                          </span>
                          <span className="text-slate-400 tabular-nums">
                            Lvl {entry.wave}/30 · {entry.kills} Kills
                          </span>
                        </div>
                        <span className="text-emerald-300 font-bold tabular-nums text-sm">
                          {entry.score.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'coop' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#040a12] border border-sky-500/35 rounded-sm text-xs">
                  <div className="flex items-center gap-2">
                    <Radio
                      className={`w-3.5 h-3.5 ${
                        wsStatus === 'connected'
                          ? 'text-emerald-400'
                          : wsStatus === 'connecting'
                          ? 'text-amber-300 animate-pulse'
                          : 'text-rose-400'
                      }`}
                    />
                    <span className="uppercase tracking-wider text-slate-200 font-bold">
                      {wsStatus === 'connected'
                        ? 'ARENA LINK ONLINE · MAX 2 PILOTS'
                        : wsStatus === 'connecting'
                        ? 'CONNECTING TO ARENA SERVER...'
                        : 'ARENA LINK DISCONNECTED'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    <span className="font-bold text-white">{profile?.pilot_name || 'VANGUARD-01'}</span>
                    <span className="mx-1.5 text-slate-500">·</span>
                    <span style={{ color: activeJet.primaryColor }}>{activeJet.name}</span>
                  </div>
                </div>

                {coopError && (
                  <div className="p-2.5 bg-rose-950/60 border border-rose-500/70 text-rose-200 text-xs font-bold uppercase tracking-wider rounded-sm">
                    {coopError}
                  </div>
                )}

                {!coopRoom ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 bg-[#040a12] border border-emerald-500/40 rounded-sm space-y-3">
                        <div className="text-xs font-bold text-emerald-300 uppercase tracking-[0.16em]">
                          Host 2-Player Arena
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Create a private or open 2-pilot room. Only 2 pilots can connect and fly together.
                        </p>
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase mb-1">
                            Starting Sector Level
                          </label>
                          <select
                            value={createLevel}
                            onChange={(e) => setCreateLevel(Number(e.target.value))}
                            className="w-full px-2.5 py-2 bg-[#081320] border border-slate-600 text-white text-xs font-bold rounded-sm focus:outline-none focus:border-emerald-400"
                          >
                            {LEVELS.map((lvl) => (
                              <option key={lvl.level} value={lvl.level}>
                                LVL {lvl.level} · {lvl.bossTitle}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          disabled={wsStatus !== 'connected'}
                          onClick={() => onCreateCoopRoom(createLevel)}
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#020806] font-extrabold text-xs tracking-[0.18em] uppercase rounded-sm"
                        >
                          Create 2P Room
                        </button>
                      </div>

                      <div className="p-4 bg-[#040a12] border border-sky-500/40 rounded-sm flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-sky-300 uppercase tracking-[0.16em]">
                            Join by Room Code
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            Enter the 4-character squadron code shared by Pilot 1.
                          </p>
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="ABCD"
                            value={coopJoinCodeDraft}
                            onChange={(e) => setCoopJoinCodeDraft(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                            className="w-full px-3 py-2 bg-[#081320] border border-sky-500/50 text-white text-base font-extrabold tracking-[0.35em] text-center uppercase rounded-sm focus:outline-none focus:border-sky-300"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={wsStatus !== 'connected' || coopJoinCodeDraft.trim().length < 4}
                          onClick={() => onJoinCoopRoom(coopJoinCodeDraft.trim())}
                          className="w-full py-2.5 bg-sky-500/25 hover:bg-sky-500/40 disabled:opacity-45 border border-sky-400 text-sky-100 font-extrabold text-xs tracking-[0.18em] uppercase rounded-sm"
                        >
                          Join 2P Room
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-[#040a12] border border-slate-700/80 rounded-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 uppercase tracking-[0.16em]">
                          Open Squadrons (1/2 Waiting)
                        </span>
                        <button
                          type="button"
                          onClick={onRefreshCoopRooms}
                          className="px-2.5 py-1 bg-[#081320] hover:border-sky-400 border border-slate-600 text-sky-200 text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Refresh</span>
                        </button>
                      </div>

                      {openRooms.length === 0 ? (
                        <div className="py-5 text-center text-xs text-slate-400">
                          No open 1/2 rooms right now — create a room or enter a room code above.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {openRooms.map((r) => (
                            <div
                              key={r.code}
                              className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#06101b] border border-slate-700 rounded-sm text-xs"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 bg-sky-500/20 border border-sky-400/60 text-sky-200 font-extrabold tracking-widest">
                                  {r.code}
                                </span>
                                <span className="font-bold text-white">{r.hostName}</span>
                                <span style={{ color: JETS[r.hostJet]?.primaryColor || '#38bdf8' }}>
                                  {JETS[r.hostJet]?.name || r.hostJet}
                                </span>
                                <span className="text-slate-400">LVL {r.startLevel}</span>
                                <span className="text-emerald-300 font-bold">
                                  {r.playersCount}/{r.maxPlayers}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onJoinCoopRoom(r.code)}
                                className="px-3 py-1.5 bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-400 text-emerald-100 text-[11px] font-bold uppercase tracking-wider rounded-sm"
                              >
                                Join
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveTab('hangar')}
                        className="px-3.5 py-2 bg-[#040a12] hover:border-amber-400 border border-amber-400/50 text-amber-200 text-xs font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Customize Jet &amp; Mods in Hangar</span>
                      </button>
                    </div>
                  </>
                ) : (
                  (() => {
                    const isHost = coopRoom.hostId === coopPlayerId;
                    const localPlayer = coopRoom.players.find((p) => p.playerId === coopPlayerId) || null;
                    const slot1 = coopRoom.players.find((p) => p.slot === 1) || null;
                    const slot2 = coopRoom.players.find((p) => p.slot === 2) || null;
                    const guestReady = slot2 ? slot2.ready : false;
                    const canHostLaunch = isHost && coopRoom.players.length === 2 && guestReady;

                    return (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#040a12] border border-sky-400/50 rounded-sm">
                          <div className="flex flex-wrap items-center gap-3">
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Room Code</div>
                              <div className="text-2xl font-black tracking-[0.28em] text-sky-300">
                                {coopRoom.code}
                              </div>
                            </div>
                            <span
                              className={`px-2.5 py-1 text-[10px] font-bold uppercase border rounded-sm ${
                                coopRoom.players.length === 2
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                  : 'bg-amber-500/20 border-amber-400 text-amber-200'
                              }`}
                            >
                              {coopRoom.players.length}/2 PILOTS LOCKED
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCopyInviteLink}
                              className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400 text-sky-100 text-[11px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5"
                            >
                              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedLink ? 'Link Copied' : 'Copy Invite Link'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={onLeaveCoopRoom}
                              className="px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/70 border border-rose-500/50 text-rose-200 text-[11px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Leave</span>
                            </button>
                          </div>
                        </div>

                        {/* Strict 2-Pilot Bays */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { slotNum: 1 as const, player: slot1 },
                            { slotNum: 2 as const, player: slot2 },
                          ].map(({ slotNum, player }) => {
                            if (!player) {
                              return (
                                <div
                                  key={slotNum}
                                  className="p-4 bg-[#040a12]/70 border border-dashed border-sky-500/45 rounded-sm flex flex-col items-center justify-center text-center min-h-[136px] space-y-2"
                                >
                                  <div className="text-xs font-bold text-sky-300 uppercase tracking-widest animate-pulse">
                                    Waiting for Pilot 2 (1/2)
                                  </div>
                                  <p className="text-[11px] text-slate-400">
                                    Share code <strong className="text-white">{coopRoom.code}</strong> or invite link.
                                    Strict 2-player cap enforced.
                                  </p>
                                </div>
                              );
                            }

                            const jet = JETS[player.jetId];
                            const skin = JET_SKINS[player.skinId];
                            const trail = TRAIL_COLORS[player.trailId];
                            const isSelf = player.playerId === coopPlayerId;
                            const isBayHost = player.playerId === coopRoom.hostId;

                            return (
                              <div
                                key={slotNum}
                                className={`p-3.5 rounded-sm border space-y-2 ${
                                  isSelf
                                    ? 'bg-emerald-950/30 border-emerald-400/70'
                                    : 'bg-[#040a12] border-sky-400/50'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    SLOT {slotNum} · {isBayHost ? 'HOST' : 'WINGMATE'}
                                    {isSelf ? ' · YOU' : ''}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-bold uppercase border rounded-sm ${
                                      isBayHost || player.ready
                                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                        : 'bg-amber-500/20 border-amber-400 text-amber-200'
                                    }`}
                                  >
                                    {isBayHost ? 'COMMANDER' : player.ready ? 'READY' : 'STANDBY'}
                                  </span>
                                </div>

                                <div className="text-base font-extrabold text-white truncate">
                                  {player.pilotName}
                                </div>

                                <div className="text-xs font-bold" style={{ color: jet?.primaryColor || '#38bdf8' }}>
                                  {jet?.name || player.jetId}
                                </div>

                                <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2 gap-y-0.5">
                                  <span>Livery: {skin?.name || player.skinId}</span>
                                  <span>·</span>
                                  <span>Trail: {trail?.name || player.trailId}</span>
                                  <span>·</span>
                                  <span>{player.equippedMods.length}/2 Mods</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#040a12] border border-slate-700/80 rounded-sm">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400 uppercase">Mission Level:</span>
                            {isHost ? (
                              <select
                                value={coopRoom.startLevel}
                                onChange={(e) => onSetCoopLevel(Number(e.target.value))}
                                className="px-2.5 py-1.5 bg-[#081320] border border-emerald-500/50 text-white text-xs font-bold rounded-sm focus:outline-none"
                              >
                                {LEVELS.map((lvl) => (
                                  <option key={lvl.level} value={lvl.level}>
                                    LVL {lvl.level} · {lvl.bossTitle}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="font-bold text-emerald-300">
                                LVL {coopRoom.startLevel} · {LEVELS[coopRoom.startLevel - 1]?.bossTitle}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveTab('hangar')}
                            className="px-3 py-1.5 bg-[#081320] hover:border-amber-400 border border-amber-400/50 text-amber-200 text-xs font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Hangar Loadout</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-3">
                          {isHost ? (
                            <button
                              type="button"
                              disabled={!canHostLaunch}
                              onClick={onStartCoopMatch}
                              className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-400 disabled:border disabled:border-slate-600 text-[#020806] font-extrabold text-xs tracking-[0.2em] uppercase rounded-sm flex items-center justify-center gap-2"
                            >
                              <Play className="w-4 h-4 fill-current" />
                              <span>
                                {coopRoom.players.length < 2
                                  ? 'Waiting for Pilot 2 (1/2)'
                                  : !guestReady
                                  ? 'Waiting for Pilot 2 Ready'
                                  : 'Launch 2P Arena'}
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={onToggleCoopReady}
                              className={`w-full sm:w-auto px-6 py-3 font-extrabold text-xs tracking-[0.2em] uppercase rounded-sm border flex items-center justify-center gap-2 ${
                                localPlayer?.ready
                                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 hover:bg-emerald-500/35'
                                  : 'bg-sky-500 hover:bg-sky-400 border-sky-300 text-[#02080e]'
                              }`}
                            >
                              <Check className="w-4 h-4" />
                              <span>{localPlayer?.ready ? 'Ready · Click to Unready' : 'Ready for Launch'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Title Screen
  if (phase === 'title') {
    return (
      <div className="title-screen fixed inset-0 z-20 flex flex-col justify-between overflow-y-auto p-5 sm:p-10 pointer-events-none font-mono">
        <div className="title-screen__header flex flex-wrap items-center justify-between gap-2">
          <div className="bg-[#040b14]/84 border border-emerald-400/40 px-3 py-1.5 rounded-sm text-[11px] sm:text-xs">
            <span className="text-slate-400">PILOT </span>
            <span className="text-white font-bold">{profile?.pilot_name || 'VANGUARD-01'}</span>
            <span className="mx-2 text-emerald-500">·</span>
            <span className="font-bold" style={{ color: activeJet.primaryColor }}>
              {activeJet.name}
            </span>
            <span className="mx-2 text-emerald-500">·</span>
            <span className="text-emerald-300 tabular-nums">
              HI {(profile?.high_score ?? 0).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-3 py-1.5 bg-sky-500/25 hover:bg-sky-500/40 border border-sky-400 text-sky-100 text-[11px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5 shadow-[0_0_16px_rgba(56,189,248,0.22)] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-sky-300" />
                <span>{isInstallable ? 'Install App' : 'Get Phone App'}</span>
              </button>
            )}

            <div className="bg-[#040b14]/84 border border-fuchsia-400/35 px-3 py-1.5 rounded-sm text-[10px] sm:text-[11px] text-fuchsia-200 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>{backendStatus || 'PYTHON SQLITE'}</span>
            </div>
          </div>
        </div>

        <div className="title-screen__main max-w-xl my-auto pointer-events-auto">
          <svg
            viewBox="0 0 560 112"
            className="title-screen__logo w-full max-w-lg h-auto drop-shadow-[0_0_22px_rgba(0,255,136,0.35)]"
            aria-label="Vanguard Vector"
          >
            <defs>
              <linearGradient id="vvGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="55%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#e879f9" />
              </linearGradient>
            </defs>
            <polygon points="4,14 26,14 14,96 2,96" fill="#00ff88" opacity="0.85" />
            <text
              x="38"
              y="56"
              fill="url(#vvGrad)"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontWeight="900"
              fontSize="44"
              letterSpacing="6"
            >
              VANGUARD
            </text>
            <text
              x="40"
              y="95"
              fill="#e879f9"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontWeight="800"
              fontSize="27"
              letterSpacing="14"
            >
              VECTOR 30
            </text>
          </svg>

          <p className="title-screen__description mt-2 text-xs sm:text-sm text-slate-300/90 max-w-md leading-relaxed">
            30 levels across 15 deep-space cyberpunk arenas with an end-of-level boss fight in every stage.
            Auto-firing weapons, fragment upgrades, enemy bombs, and 8 cyberpunk hangar jets with special powers.
          </p>

          <div className="title-screen__primary-actions mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onStartNewGame(1)}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-[#020806] font-extrabold text-sm tracking-[0.2em] uppercase rounded-sm shadow-[0_0_25px_rgba(0,255,136,0.4)] flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Mission</span>
            </button>

            <button
              type="button"
              onClick={onOpenCoop}
              className="px-5 py-3 bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400 text-sky-100 font-extrabold text-xs tracking-[0.18em] uppercase rounded-sm shadow-[0_0_20px_rgba(56,189,248,0.22)] flex items-center gap-2 transition-colors"
            >
              <Users className="w-4 h-4 text-sky-300" />
              <span>2P Co-Op Arena</span>
            </button>

            {autosaveSlot && (
              <button
                type="button"
                onClick={() => onLoadSlot(autosaveSlot)}
                className="px-5 py-3 bg-[#06131f]/90 hover:bg-fuchsia-500/25 border border-fuchsia-400/70 text-fuchsia-200 font-bold text-xs tracking-[0.18em] uppercase rounded-sm flex items-center gap-2 transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Resume Lvl {autosaveSlot.wave}</span>
              </button>
            )}
          </div>

          <div className="title-screen__secondary-actions mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('hangar')}
              className="px-3.5 py-2 bg-[#040b14]/90 hover:border-emerald-400 border border-amber-400/50 text-amber-200 text-xs font-semibold uppercase tracking-wider rounded-sm flex items-center gap-1.5"
            >
              <Plane className="w-3.5 h-3.5 text-amber-300" />
              <span>Hangar · Jets ({profile?.credits ?? 0} CR)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('slots')}
              className="px-3.5 py-2 bg-[#040b14]/90 hover:border-emerald-400 border border-slate-600/70 text-slate-200 text-xs font-semibold uppercase tracking-wider rounded-sm flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-emerald-300" />
              <span>Saves ({slots.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className="px-3.5 py-2 bg-[#040b14]/90 hover:border-emerald-400 border border-slate-600/70 text-slate-200 text-xs font-semibold uppercase tracking-wider rounded-sm flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-fuchsia-300" />
              <span>Leaderboard</span>
            </button>
            <button
              type="button"
              onClick={onOpenTutorials}
              className="px-3.5 py-2 bg-[#040b14]/90 hover:border-sky-400 border border-sky-400/50 text-sky-200 text-xs font-semibold uppercase tracking-wider rounded-sm flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-300" />
              <span>Tutorials</span>
            </button>
          </div>
        </div>

        <div className="title-screen__footer text-center text-[10px] sm:text-xs tracking-[0.15em] text-emerald-300/80 uppercase">
          WASD / Touch Move · Space/F Afterburner · Q Special · R Missiles · C Shield Pulse · Shift Roll · Esc Pause
        </div>

        {showInstallGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 pointer-events-auto">
            <div className="w-full max-w-md bg-[#06101b] border border-sky-400/60 p-5 rounded-sm space-y-4 shadow-[0_0_35px_rgba(56,189,248,0.22)]">
              <div className="flex items-center justify-between border-b border-sky-500/30 pb-2.5">
                <h3 className="text-sm font-bold text-sky-300 uppercase tracking-wider flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>Install Vanguard Vector as App</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowInstallGuide(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Install directly onto your home screen to launch fullscreen with its own app icon, no browser bar, and offline solo support:
              </p>

              {isIOS ? (
                <div className="p-3 bg-[#040a12] border border-slate-700/80 rounded-sm space-y-1.5 text-xs text-slate-200">
                  <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider">iPhone / iPad (Safari)</div>
                  <p>1. Open this link directly in <strong>Safari</strong>.</p>
                  <p>2. Tap the <strong>Share</strong> icon in the bottom/top bar.</p>
                  <p>3. Tap <strong>Add to Home Screen</strong> → <strong>Add</strong>.</p>
                </div>
              ) : isAndroid ? (
                <div className="p-3 bg-[#040a12] border border-slate-700/80 rounded-sm space-y-1.5 text-xs text-slate-200">
                  <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Android (Chrome / Edge)</div>
                  <p>1. Open this link directly in <strong>Chrome</strong> (not inside an in-app preview).</p>
                  <p>2. Tap the <strong>⋮ menu</strong> at top-right → <strong>Add to Home screen</strong> → <strong>Install</strong>.</p>
                  <p className="text-[11px] text-slate-400">Chrome creates a standalone fullscreen app on your home screen & app drawer.</p>
                </div>
              ) : (
                <div className="space-y-2.5 text-xs text-slate-200">
                  <div className="p-3 bg-[#040a12] border border-slate-700/80 rounded-sm space-y-1">
                    <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Android Phone</div>
                    <p>Open in Chrome → tap <strong>⋮</strong> → <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</p>
                  </div>
                  <div className="p-3 bg-[#040a12] border border-slate-700/80 rounded-sm space-y-1">
                    <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider">iPhone / iPad</div>
                    <p>Open in Safari → tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.</p>
                  </div>
                  <div className="p-3 bg-[#040a12] border border-slate-700/80 rounded-sm space-y-1">
                    <div className="text-[11px] font-bold text-fuchsia-300 uppercase tracking-wider">Desktop (Chrome / Edge)</div>
                    <p>Click the <strong>Install</strong> icon on the right side of your address bar.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyAppUrl}
                  className="flex-1 py-2 bg-[#040a12] hover:border-emerald-400 border border-emerald-500/50 text-emerald-200 text-xs font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5"
                >
                  {copiedAppUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAppUrl ? 'Link Copied' : 'Copy App Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowInstallGuide(false)}
                  className="px-5 py-2 bg-sky-500/25 hover:bg-sky-500/40 border border-sky-400 text-sky-100 text-xs font-bold uppercase rounded-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Pause Modal
  if (phase === 'paused') {
    if (suppressPauseModal) return null;
    const isCoopMatch = Boolean(hud.coop?.active);
    return (
      <div className="end-screen-overlay fixed inset-0 z-20 flex items-center justify-center p-4 bg-[#02060d]/78 font-mono">
        <div className="pause-screen-card w-full max-w-md max-h-[calc(100vh-1rem)] overflow-y-auto bg-[#06101b] border border-emerald-400/50 p-6 rounded-sm shadow-[0_0_35px_rgba(0,255,136,0.18)] space-y-5">
          <div className="text-center">
            <div className="end-screen-subtitle text-xs tracking-[0.25em] text-emerald-300 uppercase">
              {isCoopMatch ? `2P Co-Op Live · Room ${hud.coop?.roomCode}` : 'Mission Paused'}
            </div>
            <h2 className="end-screen-title mt-1 text-2xl font-bold text-white tracking-wider">
              LEVEL {hud.wave}/{hud.totalLevels} · {(isCoopMatch ? hud.coop?.teamScore ?? hud.score : hud.score).toLocaleString()} PTS
            </h2>
            {isCoopMatch && (
              <p className="mt-1 text-[11px] text-sky-300/90">
                Arena simulation remains live while your wingmate is flying.
              </p>
            )}
          </div>

          <div className="end-screen-actions space-y-2.5">
            <button
              type="button"
              onClick={onResumeGame}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-[#020806] font-extrabold text-xs tracking-[0.2em] uppercase rounded-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isCoopMatch ? 'Resume Controls' : 'Resume Flight'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenTutorials}
              className="w-full py-2.5 bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/70 text-sky-100 font-bold text-xs tracking-[0.18em] uppercase rounded-sm flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-sky-300" />
              <span>Tutorials</span>
            </button>

            {!isCoopMatch && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSaveToSlot('autosave')}
                  className="w-full py-2.5 bg-fuchsia-500/20 hover:bg-fuchsia-500/35 border border-fuchsia-400 text-fuchsia-100 font-bold text-xs tracking-[0.18em] uppercase rounded-sm flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{busy ? 'Saving to Python...' : 'Save Checkpoint (Python DB)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('slots')}
                  className="w-full py-2.5 bg-[#040a12] hover:border-emerald-400 border border-slate-600 text-slate-200 font-semibold text-xs tracking-[0.18em] uppercase rounded-sm flex items-center justify-center gap-2"
                >
                  <FolderOpen className="w-4 h-4 text-emerald-300" />
                  <span>Manage Save Slots</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onReturnToTitle}
              className="w-full py-2.5 bg-[#040a12] hover:border-rose-400 border border-slate-700 text-slate-300 font-semibold text-xs tracking-[0.18em] uppercase rounded-sm flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>{isCoopMatch ? 'Leave 2P Match' : 'Abort to Title'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Victory or Game Over Modal
  if (phase === 'gameover' || phase === 'victory') {
    const isVictory = phase === 'victory';
    const accuracy = hud.shotsFired > 0 ? Math.round((hud.shotsHit / hud.shotsFired) * 100) : 0;
    const credits = profile?.credits ?? 0;
    const canRevive = !isVictory && !coopMatchSummary && credits >= 1000;
    return (
      <div className="end-screen-overlay fixed inset-0 z-20 flex items-center justify-center p-4 bg-[#02060d]/84 font-mono">
        <div
          className={`end-screen-card w-full max-w-md max-h-[calc(100vh-1rem)] overflow-y-auto bg-[#06101b] border p-6 rounded-sm space-y-5 ${
            isVictory
              ? 'border-emerald-400/70 shadow-[0_0_45px_rgba(0,255,136,0.28)]'
              : 'border-orange-500/60 shadow-[0_0_40px_rgba(249,115,22,0.22)]'
          }`}
        >
          <div className="end-screen-header text-center">
            <div
              className={`end-screen-subtitle text-xs tracking-[0.25em] uppercase flex items-center justify-center gap-1.5 ${
                isVictory ? 'text-emerald-300' : 'text-orange-400'
              }`}
            >
              {isVictory && <Award className="w-4 h-4" />}
              <span>
                {coopMatchSummary
                  ? isVictory
                    ? '2P Squadron · All 30 Sectors Liberated'
                    : '2P Squadron Destroyed'
                  : isVictory
                  ? 'All 30 Sectors Liberated'
                  : 'Hull Integrity Lost'}
              </span>
            </div>
            <h2 className="end-screen-title mt-1 text-3xl font-extrabold text-white tracking-wider">
              {coopMatchSummary
                ? isVictory
                  ? '2P CO-OP VICTORY'
                  : 'SQUADRON DOWN'
                : isVictory
                ? 'CAMPAIGN VICTORY'
                : 'MISSION ENDED'}
            </h2>
          </div>

          {coopMatchSummary ? (
            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-[#040a12] border border-slate-800">
                  <div className="text-slate-400">TEAM SCORE</div>
                  <div className="text-lg font-bold text-emerald-300 tabular-nums">
                    {coopMatchSummary.teamScore.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-[#040a12] border border-slate-800">
                  <div className="text-slate-400">LEVEL REACHED</div>
                  <div className="text-lg font-bold text-white tabular-nums">
                    LEVEL {coopMatchSummary.wave}/{hud.totalLevels}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-[#04111d] border border-emerald-500/40">
                  <div className="text-[10px] text-emerald-300 uppercase">P1 · {coopMatchSummary.p1Name}</div>
                  <div className="mt-1 text-base font-bold text-white tabular-nums">
                    {coopMatchSummary.p1Score.toLocaleString()} PTS
                  </div>
                  <div className="text-[11px] text-slate-400 tabular-nums">{coopMatchSummary.p1Kills} Kills</div>
                </div>
                <div className="p-3 bg-[#04111d] border border-sky-500/40">
                  <div className="text-[10px] text-sky-300 uppercase">P2 · {coopMatchSummary.p2Name}</div>
                  <div className="mt-1 text-base font-bold text-white tabular-nums">
                    {coopMatchSummary.p2Score.toLocaleString()} PTS
                  </div>
                  <div className="text-[11px] text-slate-400 tabular-nums">{coopMatchSummary.p2Kills} Kills</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="end-screen-stats grid grid-cols-2 gap-2.5 text-xs">
              <div className="end-screen-stat p-3 bg-[#040a12] border border-slate-800">
                <div className="text-slate-400">FINAL SCORE</div>
                <div className="end-screen-stat-value text-lg font-bold text-emerald-300 tabular-nums">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div className="end-screen-stat p-3 bg-[#040a12] border border-slate-800">
                <div className="text-slate-400">LEVEL REACHED</div>
                <div className="end-screen-stat-value text-lg font-bold text-white tabular-nums">
                  LEVEL {hud.wave}/{hud.totalLevels}
                </div>
              </div>
              <div className="end-screen-stat p-3 bg-[#040a12] border border-slate-800">
                <div className="text-slate-400">HOSTILES DESTROYED</div>
                <div className="end-screen-stat-value text-lg font-bold text-orange-300 tabular-nums">{hud.kills}</div>
              </div>
              <div className="end-screen-stat p-3 bg-[#040a12] border border-slate-800">
                <div className="text-slate-400">ACCURACY</div>
                <div className="end-screen-stat-value text-lg font-bold text-fuchsia-300 tabular-nums">{accuracy}%</div>
              </div>
            </div>
          )}

          <div className="end-screen-credits p-2.5 bg-[#040a12] border border-amber-500/40 text-center space-y-1">
            {lastRunCredits !== null && (
              <div className="text-xs text-amber-300 font-bold">
                +{lastRunCredits.toLocaleString()} CREDITS EARNED THIS RUN
              </div>
            )}
            <div className="text-xs text-slate-300 tabular-nums">
              PYTHON CREDIT BALANCE:{' '}
              <span className="font-bold text-amber-300">{credits.toLocaleString()} CR</span>
            </div>
          </div>

          <div className="end-screen-actions space-y-2.5">
            {coopMatchSummary ? (
              <button
                type="button"
                onClick={onReturnToCoopLobby}
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-[#02080e] font-extrabold text-xs tracking-[0.2em] uppercase rounded-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>{coopRoom ? 'Back to 2P Room Lobby' : 'Re-Open 2P Co-Op'}</span>
              </button>
            ) : (
              <>
                {!isVictory && (
                  <button
                    type="button"
                    disabled={busy || !canRevive}
                    onClick={onReviveWithCredits}
                    className={`w-full py-2.5 font-extrabold text-xs tracking-[0.16em] uppercase rounded-sm flex items-center justify-center gap-2 transition-colors border ${
                      canRevive
                        ? 'bg-amber-500 hover:bg-amber-400 border-amber-300 text-[#090500] shadow-[0_0_22px_rgba(245,158,11,0.35)]'
                        : 'bg-[#040a12] border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>
                      {canRevive
                        ? `CONTINUE LEVEL ${hud.wave} · 1,000 CR`
                        : `NEED 1,000 CR TO CONTINUE (${credits.toLocaleString()}/1,000)`}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onStartNewGame(1)}
                  className={`w-full py-2.5 font-extrabold text-xs tracking-[0.2em] uppercase rounded-sm flex items-center justify-center gap-2 transition-colors ${
                    canRevive
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/70 text-emerald-200'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-[#020806]'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isVictory ? 'Re-Launch Campaign' : 'Restart From Level 1'}</span>
                </button>
              </>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('hangar')}
                className="py-2 bg-[#040a12] hover:border-amber-400 border border-slate-600 text-amber-200 text-xs font-semibold uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Hangar</span>
              </button>
              <button
                type="button"
                onClick={onReturnToTitle}
                className="py-2 bg-[#040a12] hover:border-slate-400 border border-slate-700 text-slate-300 text-xs font-semibold uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Title</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
