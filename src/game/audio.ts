import type { FragmentKind, JetId } from './types';

/**
 * Procedural Web Audio synthesizer for arcade 3D space combat.
 * Zero external audio file dependencies.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private lastLaserTime = 0;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.4, this.ctx.currentTime, 0.03);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.4;
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 1.2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public playLaser(overdrive: boolean): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    if (now - this.lastLaserTime < 0.065) return;
    this.lastLaserTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = overdrive ? 'sawtooth' : 'triangle';

    const pitchJitter = 1 + (Math.random() - 0.5) * 0.08;
    const startFreq = (overdrive ? 920 : 720) * pitchJitter;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(165, now + 0.08);

    gain.gain.setValueAtTime(overdrive ? 0.14 : 0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playSpecialAbility(jetId: JetId): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const freqs =
      jetId === 'phantom'
        ? [880, 220, 1240]
        : jetId === 'valkyrie'
        ? [320, 480, 640, 820]
        : jetId === 'chrono'
        ? [523, 784, 1046, 1318]
        : jetId === 'cyber_kitsune'
        ? [740, 1110, 1480, 1975]
        : jetId === 'ronin_x'
        ? [260, 520, 1040, 1560]
        : jetId === 'netrunner'
        ? [620, 465, 930, 1240]
        : jetId === 'shogun_mk9'
        ? [330, 495, 660, 990]
        : [440, 660, 990, 1320];

    freqs.forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + i * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type =
        jetId === 'phantom' || jetId === 'ronin_x' || jetId === 'cyber_kitsune'
          ? 'sawtooth'
          : 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * (jetId === 'phantom' ? 0.45 : 1.35), t + 0.22);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  public playHitConfirm(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1180, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.045);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playExplosion(weight: 'small' | 'medium' | 'boss'): void {
    if (this.muted || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const duration = weight === 'boss' ? 0.85 : weight === 'medium' ? 0.45 : 0.28;
    const volume = weight === 'boss' ? 0.5 : weight === 'medium' ? 0.32 : 0.2;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(weight === 'boss' ? 950 : 1400, now);
    filter.frequency.exponentialRampToValueAtTime(95, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + duration);

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(weight === 'boss' ? 110 : 145, now);
    sub.frequency.exponentialRampToValueAtTime(32, now + duration * 0.85);
    subGain.gain.setValueAtTime(volume * 0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.85);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + duration);
  }

  public playPlayerHit(shielded: boolean): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = shielded ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(shielded ? 420 : 180, now);
    osc.frequency.exponentialRampToValueAtTime(shielded ? 130 : 52, now + 0.22);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playBarrelRoll(): void {
    if (this.muted || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.2;
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + 0.16);
    filter.frequency.exponentialRampToValueAtTime(360, now + 0.36);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.26, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.4);
  }

  public playPowerUp(kind: FragmentKind): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes =
      kind === 'spread' || kind === 'stream' || kind === 'plasma' || kind === 'seeker'
        ? [523.25, 659.25, 783.99, 1046.5]
        : [440, 554.37, 659.25];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  public playWaveClear(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [392.0, 493.88, 587.33, 783.99];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + i * 0.075;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2200;

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  private lastWarningTime = 0;

  public playAfterburner(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Rising turbine surge
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.38);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.72);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(2800, now + 0.35);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.78);

    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(450, now);
      bp.frequency.exponentialRampToValueAtTime(2200, now + 0.45);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.24, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      src.connect(bp);
      bp.connect(nGain);
      nGain.connect(this.masterGain);
      src.start(now);
      src.stop(now + 0.68);
    }
  }

  public playMissileBarrage(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520 + i * 70, t);
      osc.frequency.exponentialRampToValueAtTime(1280, t + 0.14);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.17);
    }
  }

  public playShieldPulse(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [330, 495, 660, 990].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + i * 0.03;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.45, t + 0.3);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  public playEnemyWarning(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    if (now - this.lastWarningTime < 0.35) return;
    this.lastWarningTime = now;

    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.11;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(i === 0 ? 880 : 1175, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.09);
    }
  }

  public playAreaBeam(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.38);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  public playFeverStart(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + i * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.18, t + 0.19);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3200;
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playGoldenDroneAlert(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [987.77, 1318.51, 1760].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + i * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  public playGoldenDroneDrop(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [659.25, 880, 1174.66, 1567.98].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + i * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  public dispose(): void {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
