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
} from 'lucide-react';
import { JETS, type HudSnapshot, type WeaponPattern } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  touchMode: boolean;
  onToggleTouchMode: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onTriggerSpecial: () => void;
  onTriggerBarrelRoll: () => void;
  onTouchSteer: (nx: number, ny: number) => void;
}

const WEAPON_LABELS: Record<WeaponPattern, string> = {
  twin: 'TWIN LASER',
  spread: 'SPREAD FAN',
  stream: 'MULTI-STREAM',
  plasma: 'PLASMA ORB',
  seeker: 'HOMING SEEKER',
};

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  muted,
  touchMode,
  onToggleTouchMode,
  onToggleMute,
  onPause,
  onTriggerSpecial,
  onTriggerBarrelRoll,
  onTouchSteer,
}) => {
  const shieldPct = Math.max(0, Math.min(100, (hud.shield / Math.max(1, hud.maxShield)) * 100));
  const healthPct = Math.max(0, Math.min(100, (hud.health / Math.max(1, hud.maxHealth)) * 100));
  const specialReady = hud.specialCooldown <= 0;
  const specialCooldownPct =
    hud.specialMaxCooldown > 0
      ? Math.max(0, Math.min(100, (1 - hud.specialCooldown / hud.specialMaxCooldown) * 100))
      : 100;
  const jet = JETS[hud.jetId];

  // Virtual Joystick state
  const joyOriginRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const maxRadius = 42;

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

  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 sm:p-5 font-mono">
      {/* Top Perimeter */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        {/* Top-Left: Score, Level & Arena */}
        <div className="bg-[#040b14]/82 border border-emerald-400/35 px-3 py-2 rounded-sm shadow-[0_0_20px_rgba(0,255,136,0.12)]">
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] tracking-[0.18em] text-emerald-300/85 uppercase">
            <span>LVL {hud.wave}/{hud.totalLevels}</span>
            <span className="text-slate-500">·</span>
            <span className="hidden sm:inline text-slate-300">{hud.arenaName}</span>
          </div>
          <div className="text-xl sm:text-3xl font-bold tracking-wider text-white tabular-nums leading-tight">
            {hud.score.toLocaleString()}
          </div>
          <div className="mt-0.5 flex items-center gap-2.5 text-[10px] sm:text-[11px] text-emerald-200/75 tabular-nums">
            <span>HI {hud.highScore.toLocaleString()}</span>
            <span>·</span>
            <span>
              HOSTILES {hud.waveProgress}/{hud.waveTotal}
            </span>
          </div>
        </div>

        {/* Top-Center: Boss Bar or Wave Banner */}
        <div className="flex-1 max-w-md mx-auto flex flex-col items-center gap-2">
          {hud.bossName && (
            <div className="w-full bg-[#180705]/88 border border-orange-500/70 px-3 py-1.5 rounded-sm">
              <div className="flex justify-between text-[10px] sm:text-[11px] tracking-widest text-orange-300 font-bold mb-1">
                <span className="truncate">{hud.bossName}</span>
                <span className="tabular-nums ml-2">{Math.ceil(hud.bossHpRatio * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-black/70 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-600 to-amber-400 transition-[width] duration-75"
                  style={{ width: `${Math.max(0, Math.min(100, hud.bossHpRatio * 100))}%` }}
                />
              </div>
            </div>
          )}

          {hud.bannerText && (
            <div className="bg-[#040b14]/90 border border-emerald-400/55 px-3.5 py-1.5 text-[11px] sm:text-sm font-bold tracking-[0.18em] text-emerald-300 uppercase text-center shadow-[0_0_18px_rgba(0,255,136,0.2)]">
              {hud.bannerText}
            </div>
          )}
        </div>

        {/* Top-Right: Multiplier & Compact Controls */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="bg-[#040b14]/82 border border-fuchsia-400/35 px-3 py-1.5 rounded-sm text-right">
            <div className="text-[10px] tracking-[0.2em] text-fuchsia-300/80 uppercase">MULT</div>
            <div className="text-xl sm:text-2xl font-bold text-fuchsia-300 tabular-nums leading-tight">
              x{hud.multiplier}
            </div>
            <div className="mt-1 h-1 w-20 sm:w-24 bg-slate-800 overflow-hidden">
              <div className="h-full bg-fuchsia-400" style={{ width: `${Math.round(hud.comboTimer * 100)}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={onToggleTouchMode}
              title="Toggle Mobile Touch Controls"
              className={`p-1 border rounded-sm transition-colors ${
                touchMode
                  ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                  : 'bg-[#040b14]/85 border-slate-600/60 text-slate-300 hover:border-emerald-400/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              title={muted ? 'Unmute Audio' : 'Mute Audio'}
              className="p-1 bg-[#040b14]/85 border border-slate-600/60 hover:border-emerald-400/60 text-slate-200 rounded-sm transition-colors"
            >
              {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-300" />}
            </button>

            <button
              type="button"
              onClick={onPause}
              title="Pause & Save Checkpoint (Esc)"
              className="px-2 py-1 bg-[#040b14]/85 border border-emerald-400/45 hover:bg-emerald-500/20 text-emerald-200 text-[10px] font-semibold tracking-wider uppercase rounded-sm flex items-center gap-1 transition-colors"
            >
              <Pause className="w-3 h-3" />
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Touch Controls Layer (Virtual Joystick Left + Special Power & Roll Buttons Right) */}
      {touchMode && (
        <div className="flex items-end justify-between px-2 pb-2 sm:px-6 sm:pb-4 pointer-events-none">
          {/* Left Virtual Flight Pad */}
          <div
            onPointerDown={handleJoyDown}
            onPointerMove={handleJoyMove}
            onPointerUp={handleJoyUp}
            onPointerCancel={handleJoyUp}
            className="pointer-events-auto relative w-28 h-28 rounded-full border-2 border-emerald-400/50 bg-[#040d17]/65 flex items-center justify-center touch-none"
          >
            <div className="w-10 h-10 rounded-full border border-emerald-400/30" />
            <div
              className="absolute w-11 h-11 rounded-full bg-emerald-400/80 border-2 border-white shadow-[0_0_14px_rgba(0,255,136,0.6)]"
              style={{
                transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
              }}
            />
          </div>

          {/* Right Special Power & Barrel Roll Arcade Buttons */}
          <div className="pointer-events-auto flex items-end gap-3">
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onTriggerBarrelRoll();
              }}
              className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center text-[10px] font-bold uppercase tracking-wider touch-none transition-colors ${
                hud.barrelRollCooldown <= 0
                  ? 'bg-sky-500/30 border-sky-300 text-sky-100 active:bg-sky-400/50'
                  : 'bg-[#040b14]/75 border-slate-600 text-slate-400'
              }`}
            >
              <RotateCw className="w-5 h-5" />
              <span>{hud.barrelRollCooldown <= 0 ? 'ROLL' : `${hud.barrelRollCooldown.toFixed(1)}`}</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onTriggerSpecial();
              }}
              className={`relative w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center text-[10px] font-extrabold uppercase tracking-wider touch-none overflow-hidden transition-transform active:scale-95 ${
                specialReady
                  ? 'bg-fuchsia-600/40 border-fuchsia-300 text-white shadow-[0_0_24px_rgba(232,121,249,0.5)]'
                  : 'bg-[#040b14]/80 border-slate-600 text-slate-300'
              }`}
            >
              <div
                className="absolute bottom-0 left-0 right-0 bg-fuchsia-500/25 pointer-events-none"
                style={{ height: `${specialCooldownPct}%` }}
              />
              <Zap className={`w-6 h-6 relative z-10 ${specialReady ? 'text-amber-300' : 'text-slate-400'}`} />
              <span className="relative z-10 mt-0.5">
                {hud.specialActiveTimer > 0
                  ? 'ACTIVE'
                  : specialReady
                  ? 'POWER'
                  : `${Math.ceil(hud.specialCooldown)}s`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Perimeter */}
      <div className="flex items-end justify-between gap-3">
        {/* Bottom-Left: Shield & Hull Health */}
        <div className="w-48 sm:w-64 bg-[#040b14]/84 border border-sky-400/30 p-2.5 sm:p-3 rounded-sm">
          {hud.dangerAlert && (
            <div className="mb-1 text-[11px] font-bold tracking-[0.2em] text-rose-400 uppercase">
              ▲ DANGER · LOW HULL
            </div>
          )}

          <div className="mb-1.5">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-sky-300 mb-0.5">
              <span className="flex items-center gap-1 tracking-wider">
                <Shield className="w-3 h-3" /> SHIELD
              </span>
              <span className="tabular-nums">
                {hud.shield}/{hud.maxShield}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-900 border border-sky-500/30 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-[width] duration-75"
                style={{ width: `${shieldPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] mb-0.5">
              <span
                className={`flex items-center gap-1 tracking-wider ${
                  hud.dangerAlert ? 'text-rose-400' : 'text-emerald-300'
                }`}
              >
                <Heart className="w-3 h-3" /> HULL
              </span>
              <span className="tabular-nums text-slate-200">
                {hud.health}/{hud.maxHealth}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-900 border border-emerald-500/30 overflow-hidden">
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
        </div>

        {/* Bottom-Center (Desktop): Special Power [Q] Status Bar */}
        {!touchMode && (
          <div className="hidden md:flex items-center gap-3 bg-[#040b14]/84 border border-fuchsia-400/35 px-3.5 py-2 rounded-sm">
            <div className="text-left">
              <div className="text-[10px] tracking-[0.18em] text-slate-400 uppercase">
                {jet.name} · [Q] SPECIAL
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-bold ${specialReady ? 'text-fuchsia-300' : 'text-slate-300'}`}>
                  {hud.specialName}
                </span>
                <span className="text-[11px] text-amber-300 tabular-nums">
                  {hud.specialActiveTimer > 0
                    ? `ACTIVE ${hud.specialActiveTimer.toFixed(1)}s`
                    : specialReady
                    ? 'READY'
                    : `${hud.specialCooldown.toFixed(1)}s`}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-44 bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${specialReady ? 'bg-fuchsia-400' : 'bg-sky-400'}`}
                  style={{ width: `${specialCooldownPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottom-Right: Auto-Shoot Weapon Pattern + Tactical Radar */}
        <div className="flex items-end gap-2.5">
          <div className="bg-[#040b14]/84 border border-emerald-400/35 px-2.5 py-2 rounded-sm text-right">
            <div className="text-[10px] tracking-[0.18em] text-slate-400 uppercase">AUTO-FIRE</div>
            <div className="text-xs sm:text-sm font-bold tracking-wider text-emerald-300 tabular-nums">
              {WEAPON_LABELS[hud.weaponPattern]} LV.{hud.laserLevel}
            </div>
            <div className="mt-1 flex items-center justify-end gap-1 text-[10px] tracking-wider text-slate-300">
              <RotateCw className="w-3 h-3 text-sky-300" />
              <span>
                {hud.barrelRollCooldown <= 0 ? 'ROLL READY' : `ROLL ${hud.barrelRollCooldown.toFixed(1)}s`}
              </span>
            </div>
          </div>

          <div className="w-20 h-20 sm:w-28 sm:h-28 bg-[#040b14]/85 border border-emerald-400/45 rounded-sm relative overflow-hidden">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="84" r="32" fill="none" stroke="rgba(16,185,129,0.22)" strokeWidth="1" />
              <circle cx="50" cy="84" r="58" fill="none" stroke="rgba(16,185,129,0.22)" strokeWidth="1" />
              <line x1="50" y1="84" x2="12" y2="10" stroke="rgba(16,185,129,0.25)" strokeWidth="1" />
              <line x1="50" y1="84" x2="88" y2="10" stroke="rgba(16,185,129,0.25)" strokeWidth="1" />
              <line x1="50" y1="84" x2="50" y2="6" stroke="rgba(16,185,129,0.18)" strokeWidth="1" />
              <polygon points="50,79 45,89 55,89" fill="#e879f9" />

              {hud.radarBlips.map((blip, idx) => {
                const cx = 50 + blip.nx * 40;
                const cy = 78 - blip.nz * 66;
                const r = blip.kind === 'dreadnought' ? 4.2 : blip.kind === 'bomb' ? 2.5 : 2.6;
                const fill =
                  blip.kind === 'bomb'
                    ? '#ef4444'
                    : blip.kind === 'dreadnought'
                    ? '#f97316'
                    : '#fb923c';
                return <circle key={idx} cx={cx} cy={cy} r={r} fill={fill} />;
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
