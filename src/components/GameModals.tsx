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
} from 'lucide-react';
import { JETS, type BackendState, type GamePhase, type HudSnapshot, type JetId, type SaveSlotRecord } from '../game/types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface GameModalsProps {
  phase: GamePhase;
  hud: HudSnapshot;
  backendState: BackendState | null;
  backendStatus: string | null;
  busy: boolean;
  lastRunCredits: number | null;
  activeTab: 'none' | 'slots' | 'hangar' | 'leaderboard';
  setActiveTab: (tab: 'none' | 'slots' | 'hangar' | 'leaderboard') => void;
  onStartNewGame: (startLevel?: number) => void;
  onResumeGame: () => void;
  onSaveToSlot: (slotId: string) => void;
  onLoadSlot: (slot: SaveSlotRecord) => void;
  onDeleteSlot: (slotId: string) => void;
  onPurchaseUpgrade: (type: 'hull_upgrade' | 'shield_upgrade' | 'laser_upgrade') => void;
  onSelectJet: (jetId: JetId) => void;
  onUpdatePilotName: (name: string) => void;
  onReviveWithCredits: () => void;
  onReturnToTitle: () => void;
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
  onUpdatePilotName,
  onReviveWithCredits,
  onReturnToTitle,
}) => {
  const [pilotDraft, setPilotDraft] = useState(backendState?.profile.pilot_name || 'VANGUARD-01');
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const profile = backendState?.profile;
  const selectedJetId: JetId = profile?.selected_jet || hud.jetId || 'vanguard';
  const activeJet = JETS[selectedJetId];
  const slots = backendState?.slots ?? [];
  const autosaveSlot = slots.find((s) => s.slot_id === 'autosave') || slots[0];
  const leaderboard = backendState?.leaderboard ?? [];

  if (activeTab !== 'none') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#02060d]/84 font-mono">
        <div className="w-full max-w-3xl bg-[#06101b] border border-emerald-400/50 rounded-sm shadow-[0_0_40px_rgba(0,255,136,0.16)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-emerald-500/30 bg-[#040a12]">
            <div className="flex items-center gap-2.5 text-emerald-300 font-bold tracking-[0.18em] text-xs sm:text-sm uppercase">
              <Database className="w-4 h-4" />
              <span>
                {activeTab === 'slots' && 'Python SQLite Save Checkpoints'}
                {activeTab === 'hangar' && 'Vanguard Hangar · Jets & Upgrades'}
                {activeTab === 'leaderboard' && 'Sector High Scores'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('none')}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-5 max-h-[78vh] overflow-y-auto space-y-4">
            {activeTab === 'slots' && (
              <>
                {phase === 'paused' && (
                  <div className="p-3 bg-emerald-950/35 border border-emerald-500/40 rounded-sm">
                    <div className="text-xs text-emerald-300 uppercase tracking-wider mb-2">
                      Save Level {hud.wave}/20 Progress ({hud.score.toLocaleString()} PTS)
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
                              LVL {slot.wave}/20 · {slot.score.toLocaleString()} PTS
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

            {activeTab === 'hangar' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#040a12] border border-slate-700/80 rounded-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 uppercase">Callsign:</span>
                    <input
                      type="text"
                      maxLength={20}
                      value={pilotDraft}
                      onChange={(e) => setPilotDraft(e.target.value)}
                      className="px-2.5 py-1 bg-[#081320] border border-emerald-500/40 text-white text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onUpdatePilotName(pilotDraft)}
                      className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/60 text-emerald-200 text-xs font-bold uppercase"
                    >
                      Save
                    </button>
                  </div>
                  <div className="text-sm font-bold text-amber-300 tabular-nums">
                    CREDITS: {(profile?.credits ?? 0).toLocaleString()} CR
                  </div>
                </div>

                {/* Jet Fleet Selection (8 Jets including Cyberpunk Designs) */}
                <div>
                  <div className="text-xs tracking-[0.18em] text-emerald-300 uppercase mb-2 flex items-center gap-1.5">
                    <Plane className="w-4 h-4" /> Select Combat &amp; Cyberpunk Jet ([Q] / Mobile Power Button)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(JETS) as JetId[]).map((jetKey) => {
                      const jet = JETS[jetKey];
                      const isSelected = selectedJetId === jet.id;
                      return (
                        <button
                          key={jet.id}
                          type="button"
                          disabled={busy}
                          onClick={() => onSelectJet(jet.id)}
                          className={`text-left p-3.5 rounded-sm border transition-colors ${
                            isSelected
                              ? 'bg-emerald-950/45 border-emerald-400 shadow-[0_0_18px_rgba(0,255,136,0.2)]'
                              : 'bg-[#040a12] border-slate-700/80 hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm" style={{ color: jet.primaryColor }}>
                              {jet.name}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 font-bold uppercase border ${
                                isSelected
                                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                                  : 'border-slate-600 text-slate-400'
                              }`}
                            >
                              {isSelected ? 'ACTIVE JET' : 'SELECT'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {jet.role} · Speed {Math.round(jet.speedMult * 100)}% · Dmg{' '}
                            {Math.round(jet.damageMult * 100)}%
                          </div>
                          <div className="mt-2 p-2 bg-black/45 border border-slate-800 rounded-sm">
                            <div className="text-[11px] font-bold text-amber-300 flex items-center justify-between">
                              <span>⚡ {jet.specialName}</span>
                              <span className="text-[10px] text-slate-400">{jet.specialCooldown}s CD</span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-300 leading-snug">{jet.specialDesc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Persistent Upgrades */}
                {profile && (
                  <div>
                    <div className="text-xs tracking-[0.18em] text-amber-300 uppercase mb-2">
                      Fleet Armor &amp; Core Upgrades
                    </div>
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
                              {maxed ? 'MAXED OUT' : `UPGRADE · ${cost} CR`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

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
                            Lvl {entry.wave}/20 · {entry.kills} Kills
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
            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={install}
                className="px-3 py-1.5 bg-sky-500/25 hover:bg-sky-500/40 border border-sky-400 text-sky-100 text-[11px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App</span>
              </button>
            )}
            {!isInstalled && !isInstallable && isIOS && (
              <button
                type="button"
                onClick={() => setShowIOSGuide(true)}
                className="px-3 py-1.5 bg-sky-500/20 border border-sky-400/70 text-sky-100 text-[11px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install iOS App</span>
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
              VECTOR 20
            </text>
          </svg>

          <p className="title-screen__description mt-2 text-xs sm:text-sm text-slate-300/90 max-w-md leading-relaxed">
            20 levels across 5 deep-space celestial arenas with an end-of-level boss fight in every stage.
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
          </div>
        </div>

        <div className="title-screen__footer text-center text-[10px] sm:text-xs tracking-[0.15em] text-emerald-300/80 uppercase">
          WASD / Touch Joystick Move · Auto-Fire Active · Q / Power Button Special · Shift Roll · Esc Pause
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 pointer-events-auto">
            <div className="w-full max-w-sm bg-[#06101b] border border-sky-400/60 p-5 rounded-sm space-y-3">
              <h3 className="text-sm font-bold text-sky-300 uppercase tracking-wider">Install on iPhone / iPad</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                1. Tap the <strong>Share</strong> icon in Safari.<br />
                2. Scroll down and select <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 bg-sky-500/25 border border-sky-400 text-sky-100 text-xs font-bold uppercase"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Pause Modal
  if (phase === 'paused') {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-[#02060d]/78 font-mono">
        <div className="w-full max-w-md bg-[#06101b] border border-emerald-400/50 p-6 rounded-sm shadow-[0_0_35px_rgba(0,255,136,0.18)] space-y-5">
          <div className="text-center">
            <div className="text-xs tracking-[0.25em] text-emerald-300 uppercase">Mission Paused</div>
            <h2 className="mt-1 text-2xl font-bold text-white tracking-wider">
              LEVEL {hud.wave}/20 · {hud.score.toLocaleString()} PTS
            </h2>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onResumeGame}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-[#020806] font-extrabold text-xs tracking-[0.2em] uppercase rounded-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume Flight</span>
            </button>

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

            <button
              type="button"
              onClick={onReturnToTitle}
              className="w-full py-2.5 bg-[#040a12] hover:border-rose-400 border border-slate-700 text-slate-300 font-semibold text-xs tracking-[0.18em] uppercase rounded-sm flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Abort to Title</span>
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
    const canRevive = !isVictory && credits >= 1000;
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-[#02060d]/84 font-mono">
        <div
          className={`w-full max-w-md bg-[#06101b] border p-6 rounded-sm space-y-5 ${
            isVictory
              ? 'border-emerald-400/70 shadow-[0_0_45px_rgba(0,255,136,0.28)]'
              : 'border-orange-500/60 shadow-[0_0_40px_rgba(249,115,22,0.22)]'
          }`}
        >
          <div className="text-center">
            <div
              className={`text-xs tracking-[0.25em] uppercase flex items-center justify-center gap-1.5 ${
                isVictory ? 'text-emerald-300' : 'text-orange-400'
              }`}
            >
              {isVictory && <Award className="w-4 h-4" />}
              <span>{isVictory ? 'All 20 Sectors Liberated' : 'Hull Integrity Lost'}</span>
            </div>
            <h2 className="mt-1 text-3xl font-extrabold text-white tracking-wider">
              {isVictory ? 'CAMPAIGN VICTORY' : 'MISSION ENDED'}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 bg-[#040a12] border border-slate-800">
              <div className="text-slate-400">FINAL SCORE</div>
              <div className="text-lg font-bold text-emerald-300 tabular-nums">
                {hud.score.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-[#040a12] border border-slate-800">
              <div className="text-slate-400">LEVEL REACHED</div>
              <div className="text-lg font-bold text-white tabular-nums">LEVEL {hud.wave}/20</div>
            </div>
            <div className="p-3 bg-[#040a12] border border-slate-800">
              <div className="text-slate-400">HOSTILES DESTROYED</div>
              <div className="text-lg font-bold text-orange-300 tabular-nums">{hud.kills}</div>
            </div>
            <div className="p-3 bg-[#040a12] border border-slate-800">
              <div className="text-slate-400">ACCURACY</div>
              <div className="text-lg font-bold text-fuchsia-300 tabular-nums">{accuracy}%</div>
            </div>
          </div>

          <div className="p-2.5 bg-[#040a12] border border-amber-500/40 text-center space-y-1">
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

          <div className="space-y-2.5">
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
