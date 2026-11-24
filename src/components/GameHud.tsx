import React, { useRef, useState } from 'react';
import {
  Pause,
  Shield,
  Heart,
  Volume2,
  VolumeX,
  RotateCw,
  Zap,
  Smartphone,
  Flame,
  Rocket,
  ShieldPlus,
  BookOpen,
  Users,
} from 'lucide-react';
import { CYBER_MODS, JETS, type HudSnapshot, type WeaponPattern } from '../game/types';
import type { TutorialStepId } from '../game/tutorial';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  touchMode: boolean;
  tutorialHighlight?: TutorialStepId | null;
  onToggleTouchMode: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onOpenTutorials: () => void;
  onTriggerSpecial: () => void;
  onTriggerAfterburner: () => void;
  onTriggerMissileBarrage: () => void;
  onTriggerShieldPulse: () => void;
  onTriggerBarrelRoll: () => void;
  onTouchSteer: (nx: number, ny: number) => void;
}

const WEAPON_LABELS: Record<WeaponPattern, string> = {
  twin: 'TWIN',
  spread: 'SPREAD',
  stream: 'STREAM',
  plasma: 'PLASMA',
  seeker: 'SEEKER',
};

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  muted,
  touchMode,
  tutorialHighlight = null,
  onToggleTouchMode,
  onToggleMute,
  onPause,
  onOpenTutorials,
  onTriggerSpecial,
  onTriggerAfterburner,
  onTriggerMissileBarrage,
  onTriggerShieldPulse,
  onTriggerBarrelRoll,
  onTouchSteer,
}) => {
  const shieldPct = Math.max(0, Math.min(100, (hud.shield / Math.max(1, hud.maxShield)) * 100));
  const healthPct = Math.max(0, Math.min(100, (hud.health / Math.max(1, hud.maxHealth)) * 100));

  const specialReady = hud.specialCooldown <= 0;
  const specialPct =
    hud.specialMaxCooldown > 0
      ? Math.max(0, Math.min(100, (1 - hud.specialCooldown / hud.specialMaxCooldown) * 100))
      : 100;

  const afterburnerActive = hud.afterburnerActiveTimer > 0;
  const afterburnerReady = hud.afterburnerCooldown <= 0 && !afterburnerActive;
  const afterburnerPct = afterburnerActive
    ? Math.max(0, Math.min(100, (hud.afterburnerActiveTimer / 5) * 100))
    : hud.afterburnerMaxCooldown > 0
    ? Math.max(0, Math.min(100, (1 - hud.afterburnerCooldown / hud.afterburnerMaxCooldown) * 100))
    : 100;

  const missileReady = hud.missileCooldown <= 0;
  const missilePct =
    hud.missileMaxCooldown > 0
      ? Math.max(0, Math.min(100, (1 - hud.missileCooldown / hud.missileMaxCooldown) * 100))
      : 100;

  const pulseActive = hud.shieldPulseActiveTimer > 0;
  const pulseReady = hud.shieldPulseCooldown <= 0;
  const pulsePct =
    hud.shieldPulseMaxCooldown > 0
      ? Math.max(0, Math.min(100, (1 - hud.shieldPulseCooldown / hud.shieldPulseMaxCooldown) * 100))
      : 100;

  const rollReady = hud.barrelRollCooldown <= 0;

  // Virtual Joystick state
  const joyOriginRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const maxRadius = 38;

  const handleJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    joyOriginRef.current = { x: cx, y: cy, pointerId: e.pointerId };
    updateJoystick(e.clientX, e.clientY, cx, cy);
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const origin = joyOriginRef.current;
    if (!origin || origin.pointerId !== e.pointerId) return;
    e.stopPropagation();
    updateJoystick(e.clientX, e.clientY, origin.x, origin.y);
  };

  const handleJoyUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const origin = joyOriginRef.current;
    if (!origin || origin.pointerId !== e.pointerId) return;
    e.stopPropagation();
    joyOriginRef.current = null;
    setJoyKnob({ x: 0, y: 0 });
    onTouchSteer(0, 0);
  };

  const updateJoystick = (px: number, py: number, cx: number, cy: number) => {
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;
    setJoyKnob({ x: kx, y: ky });
    onTouchSteer(kx / maxRadius, -ky / maxRadius);
  };

  const spotlightClass =
    'ring-4 ring-amber-300 shadow-[0_0_26px_rgba(251,191,36,0.95)] scale-110 z-30 animate-pulse';

  return (
    <div className="fixed inset-0 pointer-events-none z-20 font-mono select-none">
      {hud.hitFlash > 0.03 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: `inset 0 0 96px rgba(239, 68, 68, ${(hud.hitFlash * 0.72).toFixed(2)})`,
            border: `2px solid rgba(248, 113, 113, ${(hud.hitFlash * 0.55).toFixed(2)})`,
          }}
        />
      )}
      {hud.feverActive && hud.hitFlash <= 0.03 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 64px rgba(250, 204, 21, 0.28)',
            border: '1px solid rgba(250, 204, 21, 0.35)',
          }}
        />
      )}
      {/* Top Perimeter */}
      <div className="absolute top-0 inset-x-0 flex items-start justify-between gap-2 sm:gap-4 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pl-[max(0.625rem,env(safe-area-inset-left))] pr-[max(0.625rem,env(safe-area-inset-right))] sm:p-4">
        {/* Top-Left: Primary Score & Optional Co-Op Partner Telemetry */}
        <div className="flex flex-col items-start gap-1.5">
          <div className="bg-[#040b14]/78 border border-emerald-400/30 px-2.5 py-1.5 rounded-sm">
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] tracking-[0.14em] text-emerald-300/75 uppercase">
              <span>LVL {hud.wave}/{hud.totalLevels}</span>
              {hud.coop?.active ? (
                <>
                  <span className="text-sky-400">·</span>
                  <span className="text-sky-300 font-bold">2P · {hud.coop.roomCode}</span>
                </>
              ) : (
                <>
                  <span className="hidden md:inline text-slate-500">·</span>
                  <span className="hidden md:inline text-slate-400">{hud.arenaName}</span>
                </>
              )}
            </div>
            <div className="text-base sm:text-2xl font-bold tracking-wider text-white tabular-nums leading-tight">
              {hud.coop?.active
                ? `TEAM ${hud.coop.teamScore.toLocaleString()}`
                : hud.score.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 text-[9px] text-slate-400 tabular-nums">
              {hud.coop?.active ? (
                <span>YOU {hud.score.toLocaleString()}</span>
              ) : (
                <span>HI {hud.highScore.toLocaleString()}</span>
              )}
              <span>·</span>
              <span>
                {hud.waveProgress}/{hud.waveTotal}
              </span>
            </div>
          </div>

          {hud.coop?.active && hud.coop.partner && (
            <div className="w-36 sm:w-52 bg-[#04111d]/88 border border-sky-400/55 px-2 py-1 rounded-sm">
              <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase">
                <span className="text-sky-200 truncate">
                  P{hud.coop.partner.slot} · {hud.coop.partner.pilotName}
                </span>
                <span
                  className={`shrink-0 tabular-nums ${
                    !hud.coop.partner.connected
                      ? 'text-rose-400'
                      : hud.coop.partner.downed
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                  }`}
                >
                  {!hud.coop.partner.connected
                    ? 'LEFT'
                    : hud.coop.partner.downed
                    ? `${hud.coop.partner.respawnTimeLeft.toFixed(1)}s`
                    : 'LIVE'}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-[8px] text-slate-400 tabular-nums">
                <span className="truncate">{JETS[hud.coop.partner.jetId]?.name || hud.coop.partner.jetId}</span>
                <span className="shrink-0 ml-1">
                  {hud.coop.partner.score.toLocaleString()} · {hud.coop.partner.kills}K
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                <div className="h-1 w-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-sky-400 transition-[width] duration-75"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, (hud.coop.partner.shield / Math.max(1, hud.coop.partner.maxShield)) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <div className="h-1 w-full bg-slate-900 overflow-hidden">
                  <div
                    className={`h-full transition-[width] duration-75 ${
                      hud.coop.partner.downed ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, (hud.coop.partner.health / Math.max(1, hud.coop.partner.maxHealth)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top-Center: Boss Bar & Brief Tactical Banner */}
        <div className="flex-1 max-w-sm mx-auto flex flex-col items-center gap-1.5">
          {hud.bossName && (
            <div className="w-full bg-[#180705]/88 border border-orange-500/75 px-2.5 py-1 rounded-sm">
              <div className="flex justify-between text-[9px] sm:text-[10px] tracking-widest text-orange-300 font-bold mb-0.5">
                <span className="truncate">{hud.bossName}</span>
                <span className="tabular-nums ml-2">{Math.ceil(hud.bossHpRatio * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-black/75 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-600 to-amber-400 transition-[width] duration-75"
                  style={{ width: `${Math.max(0, Math.min(100, hud.bossHpRatio * 100))}%` }}
                />
              </div>
            </div>
          )}

          {hud.bossChaseActive && (
            <div className="w-full bg-[#1d060a]/90 border border-rose-400/85 px-2.5 py-1 rounded-sm">
              <div className="flex justify-between text-[9px] sm:text-[10px] tracking-[0.14em] text-rose-200 font-bold uppercase mb-0.5">
                <span>CHASE PHASE · EVADE · WEAPONS LOCKED</span>
                <span className="tabular-nums text-amber-300 ml-2">
                  {hud.bossChaseTimeLeft.toFixed(1)}s
                </span>
              </div>
              <div className="h-1 w-full bg-black/75 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-300 transition-[width] duration-75"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, (hud.bossChaseTimeLeft / Math.max(0.1, hud.bossChaseDuration)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {hud.coop?.active && hud.coop.localDowned && (
            <div className="w-full bg-[#1b0910]/92 border border-amber-400/85 px-2.5 py-1 rounded-sm text-center">
              <div className="text-[9px] sm:text-[10px] tracking-[0.14em] text-amber-200 font-bold uppercase tabular-nums">
                REBOOTING {hud.coop.localRespawnTimeLeft.toFixed(1)}s · PARTNER HOLDING ARENA
              </div>
            </div>
          )}

          {hud.bannerText && (
            <div className="bg-[#040b14]/88 border border-emerald-400/50 px-3 py-1 text-[10px] sm:text-xs font-bold tracking-[0.16em] text-emerald-200 uppercase text-center">
              {hud.bannerText}
            </div>
          )}
        </div>

        {/* Top-Right: Controls, Compact Multiplier & Unobtrusive Mini Radar */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <div
              className={`px-2 py-1 rounded-sm text-right border transition-colors ${
                hud.feverActive
                  ? 'bg-[#211502]/88 border-amber-300 shadow-[0_0_16px_rgba(250,204,21,0.55)]'
                  : 'bg-[#040b14]/75 border-fuchsia-400/30'
              }`}
            >
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-[9px] font-bold ${
                    hud.feverActive ? 'text-amber-300 animate-pulse' : 'text-fuchsia-300/70'
                  }`}
                >
                  {hud.feverActive ? 'FEVER' : 'MULT'}
                </span>
                <span
                  className={`text-sm sm:text-base font-bold tabular-nums leading-none ${
                    hud.feverActive ? 'text-amber-200' : 'text-fuchsia-300'
                  }`}
                >
                  x{hud.multiplier}
                </span>
              </div>
              <div className="mt-1 h-0.5 w-14 sm:w-16 bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-[width] duration-75 ${
                    hud.feverActive ? 'bg-amber-300' : 'bg-fuchsia-400'
                  }`}
                  style={{
                    width: `${Math.round((hud.feverActive ? hud.feverMeter : hud.comboTimer) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1 pointer-events-auto">
              <button
                type="button"
                onClick={onToggleTouchMode}
                title="Toggle Mobile Touch Controls"
                className={`p-1.5 border rounded-sm transition-colors ${
                  touchMode
                    ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                    : 'bg-[#040b14]/80 border-slate-600/60 text-slate-300 hover:border-emerald-400/60'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                title={muted ? 'Unmute Audio' : 'Mute Audio'}
                className="p-1.5 bg-[#040b14]/80 border border-slate-600/60 hover:border-emerald-400/60 text-slate-200 rounded-sm transition-colors"
              >
                {muted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
                )}
              </button>

              <button
                type="button"
                onClick={onOpenTutorials}
                title="How to Play & Power-Ups"
                className="px-2 py-1.5 bg-[#040b14]/80 border border-sky-400/50 hover:bg-sky-500/20 text-sky-200 text-[10px] font-semibold tracking-wider uppercase rounded-sm flex items-center gap-1 transition-colors"
              >
                <BookOpen className="w-3 h-3" />
                <span>Tutorials</span>
              </button>

              <button
                type="button"
                onClick={onPause}
                title="Pause & Save Checkpoint (Esc)"
                className="px-2 py-1.5 bg-[#040b14]/80 border border-emerald-400/40 hover:bg-emerald-500/20 text-emerald-200 text-[10px] font-semibold tracking-wider uppercase rounded-sm flex items-center gap-1 transition-colors"
              >
                <Pause className="w-3 h-3" />
                <span className="hidden sm:inline">Menu</span>
              </button>
            </div>
          </div>

          {/* Compact, low-prominence tactical mini-radar tucked under top-right */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#040b14]/55 border border-emerald-400/25 rounded-sm relative overflow-hidden opacity-80">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="84" r="32" fill="none" stroke="rgba(16,185,129,0.18)" strokeWidth="1" />
              <circle cx="50" cy="84" r="58" fill="none" stroke="rgba(16,185,129,0.18)" strokeWidth="1" />
              <line x1="50" y1="84" x2="12" y2="10" stroke="rgba(16,185,129,0.18)" strokeWidth="1" />
              <line x1="50" y1="84" x2="88" y2="10" stroke="rgba(16,185,129,0.18)" strokeWidth="1" />
              <polygon points="50,79 46,89 54,89" fill="#e879f9" />

              {hud.radarBlips.map((blip, idx) => {
                const cx = 50 + blip.nx * 40;
                const cy = 78 - blip.nz * 66;
                if (blip.kind === 'partner') {
                  return (
                    <circle
                      key={idx}
                      cx={cx}
                      cy={cy}
                      r={3.8}
                      fill="#38bdf8"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                  );
                }
                const r =
                  blip.kind === 'dreadnought'
                    ? 4.4
                    : blip.kind === 'golden_drone'
                    ? 3.6
                    : blip.kind === 'bomb'
                    ? 2.6
                    : 2.8;
                const fill =
                  blip.kind === 'bomb'
                    ? '#ef4444'
                    : blip.kind === 'golden_drone'
                    ? '#facc15'
                    : blip.kind === 'dreadnought'
                    ? '#f97316'
                    : '#fb923c';
                return <circle key={idx} cx={cx} cy={cy} r={r} fill={fill} />;
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom-Left: Wingman Timer, Compact Shield/Hull Bars + Optional Virtual Joystick */}
      <div className="absolute bottom-0 left-0 flex flex-col items-start gap-1.5 pl-[max(0.625rem,env(safe-area-inset-left))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4">

          {hud.wingmanTimeLeft > 0 && (
            <div className="w-36 sm:w-52 bg-[#04121d]/88 border border-sky-400/70 px-2.5 py-1.5 rounded-sm">
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold tracking-wider text-sky-200 uppercase mb-0.5">
                <span className="flex items-center gap-1">
                  <Users className="w-2.5 h-2.5 text-sky-300" /> WINGMEN
                </span>
                <span className="tabular-nums text-cyan-300">{hud.wingmanTimeLeft.toFixed(1)}s</span>
              </div>
              <div className="h-1 w-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-[width] duration-75"
                  style={{ width: `${Math.max(0, Math.min(100, (hud.wingmanTimeLeft / 14) * 100))}%` }}
                />
              </div>
            </div>
          )}

          <div
            className={`w-36 sm:w-52 bg-[#040b14]/84 border px-2.5 py-2 rounded-sm transition-all ${
              tutorialHighlight === 'shield_pulse'
                ? 'border-amber-300 ring-2 ring-amber-300/90 shadow-[0_0_22px_rgba(251,191,36,0.65)]'
                : 'border-sky-400/30'
            }`}
          >
            {tutorialHighlight === 'shield_pulse' && (
              <div className="mb-1 text-[9px] font-bold tracking-[0.12em] text-amber-300 uppercase">
                ▲ SHIELD BREAKS BEFORE HULL
              </div>
            )}
            {tutorialHighlight === 'move' && !touchMode && (
              <div className="mb-1 text-[9px] font-bold tracking-[0.12em] text-amber-300 uppercase">
                ▲ WASD / ARROWS / DRAG · AUTO-FIRE ON
              </div>
            )}
            {hud.dangerAlert && (
              <div className="mb-1 text-[9px] font-bold tracking-[0.16em] text-rose-400 uppercase">
                ▲ LOW HULL
              </div>
            )}

            <div className="mb-1">
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-sky-300 mb-0.5">
                <span className="flex items-center gap-1 tracking-wider">
                  <Shield className="w-2.5 h-2.5" /> SHD
                </span>
                <span className="tabular-nums">
                  {hud.shield}/{hud.maxShield}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 border border-sky-500/25 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-[width] duration-75"
                  style={{ width: `${shieldPct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] mb-0.5">
                <span
                  className={`flex items-center gap-1 tracking-wider ${
                    hud.dangerAlert ? 'text-rose-400' : 'text-emerald-300'
                  }`}
                >
                  <Heart className="w-2.5 h-2.5" /> HULL
                </span>
                <span className="tabular-nums text-slate-200">
                  {hud.health}/{hud.maxHealth}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 border border-emerald-500/25 overflow-hidden">
                <div
                  className={`h-full transition-[width] duration-75 ${
                    hud.dangerAlert
                      ? 'bg-gradient-to-r from-rose-600 to-orange-400'
                      : 'bg-gradient-to-r from-emerald-500 to-lime-400'
                  }`}
                  style={{ width: `${healthPct}%` }}
                />
              </div>
            </div>

            <div className="mt-1 flex items-center justify-between text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-wider">
              <span>{WEAPON_LABELS[hud.weaponPattern]} LV.{hud.laserLevel}</span>
              <span className={hud.bossChaseActive ? 'text-rose-400 font-bold' : 'text-emerald-400/75'}>
                {hud.bossChaseActive ? 'LOCKED' : 'AUTO'}
              </span>
            </div>

            {hud.equippedMods.length > 0 && (
              <div className="mt-1 pt-1 border-t border-slate-800/80 text-[8px] text-amber-300/90 truncate uppercase tracking-wider">
                MODS: {hud.equippedMods.map((id) => CYBER_MODS[id]?.name || id).join(' · ')}
              </div>
            )}
          </div>

          {touchMode && (
            <div
              onPointerDown={handleJoyDown}
              onPointerMove={handleJoyMove}
              onPointerUp={handleJoyUp}
              onPointerCancel={handleJoyUp}
              className={`pointer-events-auto ml-11 mb-4 sm:ml-14 sm:mb-5 relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 bg-[#040d17]/65 flex items-center justify-center touch-none ${
                tutorialHighlight === 'move'
                  ? 'border-amber-300 ring-4 ring-amber-300/90 shadow-[0_0_24px_rgba(251,191,36,0.85)] animate-pulse'
                  : 'border-emerald-400/50'
              }`}
            >
              <div className="w-9 h-9 rounded-full border border-emerald-400/30" />
              <div
                className="absolute w-10 h-10 rounded-full bg-emerald-400/80 border-2 border-white shadow-[0_0_12px_rgba(0,255,136,0.55)]"
                style={{
                  transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
                }}
              />
            </div>
          )}
        </div>

        {/* Bottom-Right: Ergonomic Combat Abilities Cluster (Pinned Independently to Bottom-Right) */}
        <div className="absolute bottom-0 right-0 pointer-events-auto flex flex-col items-end gap-1.5 sm:gap-2 pr-[max(0.625rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4">
          {/* Top Tactical Row: Missiles [R], Shield Pulse [C], Roll [SHIFT] */}
          <div className="flex items-center gap-2">
            {/* Homing Missile Barrage */}
            <div className="relative flex flex-col items-center">
              {tutorialHighlight === 'missile' && (
                <span className="mb-1.5 px-1.5 py-0.5 bg-amber-400 text-[#090600] text-[9px] font-extrabold uppercase tracking-wider rounded-sm whitespace-nowrap shadow">
                  TAP MSL ▼
                </span>
              )}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onTriggerMissileBarrage();
                }}
                title="Homing Missile Barrage (R)"
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center text-[8px] sm:text-[9px] font-bold uppercase tracking-wider touch-none overflow-hidden transition-transform active:scale-95 ${
                  missileReady
                    ? 'bg-orange-600/35 border-orange-300 text-orange-100 shadow-[0_0_14px_rgba(249,115,22,0.45)] hover:bg-orange-500/45'
                    : 'bg-[#040b14]/82 border-slate-700 text-slate-400'
                } ${tutorialHighlight === 'missile' ? spotlightClass : tutorialHighlight ? 'opacity-55' : ''}`}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 bg-orange-500/25 pointer-events-none"
                  style={{ height: `${missilePct}%` }}
                />
                <Rocket className={`w-4 h-4 relative z-10 ${missileReady ? 'text-orange-200' : 'text-slate-500'}`} />
                <span className="relative z-10 leading-none mt-0.5 tabular-nums">
                  {missileReady ? 'MSL' : `${Math.ceil(hud.missileCooldown)}s`}
                </span>
                {!touchMode && (
                  <span className="relative z-10 text-[7px] text-orange-200/80 leading-none mt-0.5">[R]</span>
                )}
              </button>
            </div>

            {/* Shield Pulse */}
            <div className="relative flex flex-col items-center">
              {tutorialHighlight === 'shield_pulse' && (
                <span className="mb-1.5 px-1.5 py-0.5 bg-amber-400 text-[#090600] text-[9px] font-extrabold uppercase tracking-wider rounded-sm whitespace-nowrap shadow">
                  TAP PULSE ▼
                </span>
              )}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onTriggerShieldPulse();
                }}
                title="Shield Pulse (C)"
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center text-[8px] sm:text-[9px] font-bold uppercase tracking-wider touch-none overflow-hidden transition-transform active:scale-95 ${
                  pulseActive
                    ? 'bg-teal-400/50 border-white text-white shadow-[0_0_18px_rgba(45,212,191,0.75)]'
                    : pulseReady
                    ? 'bg-teal-600/35 border-teal-300 text-teal-100 shadow-[0_0_14px_rgba(45,212,191,0.4)] hover:bg-teal-500/45'
                    : 'bg-[#040b14]/82 border-slate-700 text-slate-400'
                } ${tutorialHighlight === 'shield_pulse' ? spotlightClass : tutorialHighlight ? 'opacity-55' : ''}`}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 bg-teal-400/25 pointer-events-none"
                  style={{ height: `${pulsePct}%` }}
                />
                <ShieldPlus
                  className={`w-4 h-4 relative z-10 ${pulseReady || pulseActive ? 'text-teal-200' : 'text-slate-500'}`}
                />
                <span className="relative z-10 leading-none mt-0.5 tabular-nums">
                  {pulseActive ? 'ON' : pulseReady ? 'PULSE' : `${Math.ceil(hud.shieldPulseCooldown)}s`}
                </span>
                {!touchMode && (
                  <span className="relative z-10 text-[7px] text-teal-200/80 leading-none mt-0.5">[C]</span>
                )}
              </button>
            </div>

            {/* Barrel Roll */}
            <div className="relative flex flex-col items-center">
              {tutorialHighlight === 'roll' && (
                <span className="mb-1.5 px-1.5 py-0.5 bg-amber-400 text-[#090600] text-[9px] font-extrabold uppercase tracking-wider rounded-sm whitespace-nowrap shadow">
                  TAP ROLL ▼
                </span>
              )}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onTriggerBarrelRoll();
                }}
                title="Barrel Roll Dodge (Shift)"
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center text-[8px] sm:text-[9px] font-bold uppercase tracking-wider touch-none transition-transform active:scale-95 ${
                  rollReady
                    ? 'bg-sky-500/30 border-sky-300 text-sky-100 hover:bg-sky-500/45'
                    : 'bg-[#040b14]/82 border-slate-700 text-slate-400'
                } ${tutorialHighlight === 'roll' ? spotlightClass : tutorialHighlight ? 'opacity-55' : ''}`}
              >
                <RotateCw className={`w-4 h-4 ${rollReady ? 'text-sky-200' : 'text-slate-500'}`} />
                <span className="leading-none mt-0.5 tabular-nums">
                  {rollReady ? 'ROLL' : `${hud.barrelRollCooldown.toFixed(1)}`}
                </span>
                {!touchMode && (
                  <span className="text-[7px] text-sky-200/80 leading-none mt-0.5">[SHF]</span>
                )}
              </button>
            </div>
          </div>

          {/* Primary Row: Afterburner [SPACE/F] & Jet Special Power [Q] */}
          <div className="flex items-center gap-2.5">
            {/* Afterburner Button */}
            <div className="relative flex flex-col items-center">
              {tutorialHighlight === 'afterburner' && (
                <span className="mb-1.5 px-1.5 py-0.5 bg-amber-400 text-[#090600] text-[9px] font-extrabold uppercase tracking-wider rounded-sm whitespace-nowrap shadow">
                  TAP BURN ▼
                </span>
              )}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onTriggerAfterburner();
                }}
                title="Afterburner 5s Ram Speed (Space / F)"
                className={`relative w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full border-2 flex flex-col items-center justify-center text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider touch-none overflow-hidden transition-transform active:scale-95 ${
                  afterburnerActive
                    ? 'bg-cyan-500/55 border-amber-300 text-white shadow-[0_0_24px_rgba(56,189,248,0.8)]'
                    : afterburnerReady
                    ? 'bg-sky-600/40 border-cyan-300 text-white shadow-[0_0_18px_rgba(56,189,248,0.5)] hover:bg-sky-500/50'
                    : 'bg-[#040b14]/84 border-slate-600 text-slate-300'
                } ${tutorialHighlight === 'afterburner' ? spotlightClass : tutorialHighlight ? 'opacity-55' : ''}`}
              >
                <div
                  className={`absolute bottom-0 left-0 right-0 pointer-events-none ${
                    afterburnerActive ? 'bg-amber-400/40' : 'bg-cyan-400/25'
                  }`}
                  style={{ height: `${afterburnerPct}%` }}
                />
                <Flame
                  className={`w-5 h-5 relative z-10 ${
                    afterburnerActive ? 'text-amber-200' : afterburnerReady ? 'text-cyan-200' : 'text-slate-400'
                  }`}
                />
                <span className="relative z-10 leading-none mt-0.5 tabular-nums">
                  {afterburnerActive
                    ? `${hud.afterburnerActiveTimer.toFixed(1)}s`
                    : afterburnerReady
                    ? 'BURN'
                    : `${Math.ceil(hud.afterburnerCooldown)}s`}
                </span>
                {!touchMode && (
                  <span className="relative z-10 text-[7px] text-cyan-200/85 leading-none mt-0.5">[SPC]</span>
                )}
              </button>
            </div>

            {/* Existing Jet Special Power Button */}
            <div className="relative flex flex-col items-center">
              {tutorialHighlight === 'special' && (
                <span className="mb-1.5 px-1.5 py-0.5 bg-amber-400 text-[#090600] text-[9px] font-extrabold uppercase tracking-wider rounded-sm whitespace-nowrap shadow">
                  TAP POWER ▼
                </span>
              )}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onTriggerSpecial();
                }}
                title={`${hud.specialName} (Q)`}
                className={`relative w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full border-2 flex flex-col items-center justify-center text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider touch-none overflow-hidden transition-transform active:scale-95 ${
                  hud.specialActiveTimer > 0
                    ? 'bg-fuchsia-500/55 border-amber-300 text-white shadow-[0_0_24px_rgba(232,121,249,0.75)]'
                    : specialReady
                    ? 'bg-fuchsia-600/40 border-fuchsia-300 text-white shadow-[0_0_20px_rgba(232,121,249,0.5)] hover:bg-fuchsia-500/50'
                    : 'bg-[#040b14]/84 border-slate-600 text-slate-300'
                } ${tutorialHighlight === 'special' ? spotlightClass : tutorialHighlight ? 'opacity-55' : ''}`}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 bg-fuchsia-500/25 pointer-events-none"
                  style={{ height: `${specialPct}%` }}
                />
                <Zap
                  className={`w-5 h-5 relative z-10 ${
                    specialReady || hud.specialActiveTimer > 0 ? 'text-amber-300' : 'text-slate-400'
                  }`}
                />
                <span className="relative z-10 leading-none mt-0.5 tabular-nums">
                  {hud.specialActiveTimer > 0
                    ? `${hud.specialActiveTimer.toFixed(1)}s`
                    : specialReady
                    ? 'POWER'
                    : `${Math.ceil(hud.specialCooldown)}s`}
                </span>
                {!touchMode && (
                  <span className="relative z-10 text-[7px] text-fuchsia-200/85 leading-none mt-0.5">[Q]</span>
                )}
              </button>
            </div>
          </div>
        </div>
    </div>
  );
};
