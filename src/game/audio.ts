export interface AdaptiveSoundtrackData {
  title: string;
  source?: string;
  bpm: number;
  synthWave?: 'sine' | 'triangle' | 'sawtooth';
  melodyNotes: number[];
  bassNotes: number[];
  padNotes?: number[];
}

class SpaceAudioEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private sequencerTimer: number | null = null;
  private htmlAudio: HTMLAudioElement | null = null;
  private isPlayingMusic: boolean = false;
  private activeContextKey: string | null = null;
  private activeTrackTitle: string = '';
  private manualOverride: boolean = false;

  private ensureCtx(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (mute) {
      this.stopMusic(false);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public isMusicActive(): boolean {
    return this.isPlayingMusic;
  }

  public getCurrentTrackTitle(): string {
    return this.activeTrackTitle;
  }

  public isManualJukeboxActive(): boolean {
    return this.manualOverride;
  }

  public clearManualMusicOverride(): void {
    this.manualOverride = false;
    this.activeContextKey = null;
  }

  public playFootstep(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pitchJitter = 0.92 + Math.random() * 0.16;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(115 * pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime(55 * pitchJitter, now + 0.045);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playBreakerClick(up: boolean = true): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(up ? 420 : 340, now);
    osc.frequency.exponentialRampToValueAtTime(up ? 680 : 220, now + 0.07);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playTaskComplete(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  public playEmergencyAlert(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    [0, 0.18, 0.36].forEach((offset) => {
      const now = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    });
  }

  public playSolAdvance(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const chord = [440, 554.37, 659.25, 880];
    chord.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    });
  }

  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private startSynthLoop(track: {
    bpm: number;
    synthWave?: 'sine' | 'triangle' | 'sawtooth';
    melodyNotes: number[];
    bassNotes: number[];
    padNotes?: number[];
    isAmbient?: boolean;
  }): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    this.isPlayingMusic = true;

    const stepMs = Math.max(165, Math.round((60 / (track.bpm || 108)) * 500));
    const melody = track.melodyNotes?.length
      ? track.melodyNotes
      : [60, 64, 67, 72, 71, 67, 64, 62];
    const bass = track.bassNotes?.length ? track.bassNotes : [36, 38, 41, 43];
    const pad = track.padNotes?.length ? track.padNotes : [48, 55, 60];
    const wave = track.synthWave || 'triangle';
    const ambientScale = track.isAmbient ? 0.58 : 1.0;

    let step = 0;

    const tick = () => {
      if (!this.isPlayingMusic || this.muted) return;
      const c = this.ensureCtx();
      if (!c) return;
      const now = c.currentTime;

      // Soft filtered lead voice
      const mNote = melody[step % melody.length];
      const leadOsc = c.createOscillator();
      const filter = c.createBiquadFilter();
      const leadGain = c.createGain();
      leadOsc.type = wave;
      leadOsc.frequency.setValueAtTime(this.midiToFreq(mNote), now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(wave === 'sawtooth' ? 1450 : 2400, now);
      leadGain.gain.setValueAtTime(0.048 * ambientScale, now);
      leadGain.gain.exponentialRampToValueAtTime(0.001, now + (stepMs * 0.95) / 1000);
      leadOsc.connect(filter);
      filter.connect(leadGain);
      leadGain.connect(c.destination);
      leadOsc.start(now);
      leadOsc.stop(now + stepMs / 1000);

      // Warm bass note every 2 steps
      if (step % 2 === 0) {
        const bNote = bass[Math.floor(step / 2) % bass.length];
        const bassOsc = c.createOscillator();
        const bassGain = c.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(this.midiToFreq(bNote), now);
        bassGain.gain.setValueAtTime(0.068 * ambientScale, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + (stepMs * 1.85) / 1000);
        bassOsc.connect(bassGain);
        bassGain.connect(c.destination);
        bassOsc.start(now);
        bassOsc.stop(now + (stepMs * 1.9) / 1000);
      }

      // Soft space pad chord every 4 steps
      if (step % 4 === 0 && pad.length > 0) {
        const pNote = pad[Math.floor(step / 4) % pad.length];
        const padOsc = c.createOscillator();
        const padGain = c.createGain();
        padOsc.type = 'sine';
        padOsc.frequency.setValueAtTime(this.midiToFreq(pNote), now);
        padGain.gain.setValueAtTime(0.025 * ambientScale, now);
        padGain.gain.exponentialRampToValueAtTime(0.001, now + (stepMs * 3.8) / 1000);
        padOsc.connect(padGain);
        padGain.connect(c.destination);
        padOsc.start(now);
        padOsc.stop(now + (stepMs * 3.9) / 1000);
      }

      step++;
      this.sequencerTimer = window.setTimeout(tick, stepMs);
    };

    tick();
  }

  public playSoundtrack(track: {
    title?: string;
    audioDataUrl?: string | null;
    bpm: number;
    synthWave?: 'sine' | 'triangle' | 'sawtooth';
    melodyNotes: number[];
    bassNotes: number[];
    padNotes?: number[];
  }): void {
    this.stopMusic(false);
    this.manualOverride = true;
    this.activeContextKey = null;
    this.activeTrackTitle = track.title || 'Custom Jukebox Mix';
    if (this.muted) return;

    if (track.audioDataUrl) {
      try {
        this.htmlAudio = new Audio(track.audioDataUrl);
        this.htmlAudio.loop = true;
        this.htmlAudio.volume = 0.42;
        this.htmlAudio.play().catch(() => {});
        this.isPlayingMusic = true;
        return;
      } catch {
        // Fallback to Web Audio synth
      }
    }

    this.startSynthLoop({ ...track, isAmbient: false });
  }

  public playAdaptiveSoundtrack(
    contextKey: string,
    track: AdaptiveSoundtrackData,
    forceUpdate: boolean = false
  ): void {
    if (this.manualOverride) return;
    if (!forceUpdate && this.isPlayingMusic && this.activeContextKey === contextKey) {
      return;
    }

    this.stopMusic(false);
    this.activeContextKey = contextKey;
    this.activeTrackTitle = track.title;
    if (this.muted) return;

    this.startSynthLoop({
      bpm: track.bpm,
      synthWave: track.synthWave,
      melodyNotes: track.melodyNotes,
      bassNotes: track.bassNotes,
      padNotes: track.padNotes,
      isAmbient: true,
    });
  }

  public stopMusic(clearManual: boolean = true): void {
    this.isPlayingMusic = false;
    this.activeContextKey = null;
    if (clearManual) {
      this.manualOverride = false;
    }
    if (this.sequencerTimer !== null) {
      clearTimeout(this.sequencerTimer);
      this.sequencerTimer = null;
    }
    if (this.htmlAudio) {
      this.htmlAudio.pause();
      this.htmlAudio = null;
    }
  }
}

export const spaceAudio = new SpaceAudioEngine();
