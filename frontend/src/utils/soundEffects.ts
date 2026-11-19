/**
 * FoodWise AI - Premium Web Audio API Sound Effects Engine
 *
 * Provides subtle, modern, SaaS-grade synthesized sound effects using pure Web Audio API.
 * Features:
 * - 100% synthesized on-device: zero external audio files, zero network downloads, zero external dependencies.
 * - Gentle, polished acoustic profiles (soft sine/triangle waves, gentle lowpass/bandpass filters, exponential decay).
 * - Autoplay restriction compliant: respects suspended AudioContext and resumes on user gestures.
 * - Rate-limited and debounced: prevents cacophony and audio distortion from rapid repeated clicks or actions.
 * - Completely silent when disabled or muted (zero audio node allocations).
 * - Fully compatible with desktop and mobile browsers (iOS Safari, Android Chrome, desktop browsers).
 */

export type SoundEffectType =
  | 'click'
  | 'favorite_add'
  | 'favorite_remove'
  | 'deal_saved'
  | 'modal_open'
  | 'modal_close'
  | 'search_initiate'
  | 'comparison_complete'
  | 'action_success'
  | 'action_error';

export interface SoundPreferences {
  soundEnabled: boolean;
  volume: number; // Normalized 0.0 to 1.0
}

export const SOUND_STORAGE_KEY = 'foodwise_sound_preferences';

export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = {
  soundEnabled: false, // Default is strictly OFF per specifications
  volume: 0.5,         // Pleasant mid-range volume
};

/**
 * Global audio state holder
 */
class WebAudioSoundEngine {
  private audioCtx: AudioContext | null = null;
  private lastPlayedTimestamps: Map<string, number> = new Map();
  private globalLastPlayedTime = 0;

  /** Minimum interval in milliseconds between consecutive sounds */
  private readonly cooldowns: Record<SoundEffectType, number> = {
    click: 50,
    favorite_add: 120,
    favorite_remove: 120,
    deal_saved: 200,
    modal_open: 100,
    modal_close: 100,
    search_initiate: 150,
    comparison_complete: 250,
    action_success: 150,
    action_error: 180,
  };

  /**
   * Safe getter for AudioContext. Initializes lazily on user interaction.
   */
  public getOrCreateContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtxClass) {
        return null;
      }

      try {
        this.audioCtx = new AudioCtxClass();
      } catch {
        return null;
      }
    }

    // Modern browsers start AudioContext in 'suspended' state until user gesture
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {
        // Autoplay policy prevented resumption; will retry on next user interaction
      });
    }

    return this.audioCtx;
  }

  /**
   * Check whether a sound type is rate-limited
   */
  private shouldThrottle(type: SoundEffectType): boolean {
    const now = Date.now();
    const minGlobalInterval = 25; // 25ms global debounce
    if (now - this.globalLastPlayedTime < minGlobalInterval) {
      return true;
    }

    const lastTime = this.lastPlayedTimestamps.get(type) || 0;
    const cooldown = this.cooldowns[type] || 60;
    if (now - lastTime < cooldown) {
      return true;
    }

    this.lastPlayedTimestamps.set(type, now);
    this.globalLastPlayedTime = now;
    return false;
  }

  /**
   * Plays a synthesized sound effect if enabled and volume > 0.
   */
  public play(type: SoundEffectType, volume: number): void {
    if (volume <= 0) return;
    if (this.shouldThrottle(type)) return;

    const ctx = this.getOrCreateContext();
    if (!ctx) return;

    // Clamp master volume between 0.0 and 1.0
    const masterVol = Math.max(0, Math.min(1, volume));

    try {
      const now = ctx.currentTime;

      switch (type) {
        case 'click':
          this.synthesizeClick(ctx, now, masterVol);
          break;
        case 'favorite_add':
          this.synthesizeFavoriteAdd(ctx, now, masterVol);
          break;
        case 'favorite_remove':
          this.synthesizeFavoriteRemove(ctx, now, masterVol);
          break;
        case 'deal_saved':
          this.synthesizeDealSaved(ctx, now, masterVol);
          break;
        case 'modal_open':
          this.synthesizeModalOpen(ctx, now, masterVol);
          break;
        case 'modal_close':
          this.synthesizeModalClose(ctx, now, masterVol);
          break;
        case 'search_initiate':
          this.synthesizeSearchInitiate(ctx, now, masterVol);
          break;
        case 'comparison_complete':
          this.synthesizeComparisonComplete(ctx, now, masterVol);
          break;
        case 'action_success':
          this.synthesizeActionSuccess(ctx, now, masterVol);
          break;
        case 'action_error':
          this.synthesizeActionError(ctx, now, masterVol);
          break;
      }
    } catch {
      // Audio playback fails gracefully without interrupting application UI
    }
  }

  /**
   * 1. Click: Soft micro-tap with triangle wave and lowpass softening.
   */
  private synthesizeClick(ctx: AudioContext, t: number, vol: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.035);

    const peakGain = 0.12 * vol;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peakGain, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * 2. Favorite Added: Warm ascending major third (C5 -> E5).
   */
  private synthesizeFavoriteAdd(ctx: AudioContext, t: number, vol: number): void {
    // Note 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, t);

    gain1.gain.setValueAtTime(0.0001, t);
    gain1.gain.linearRampToValueAtTime(0.14 * vol, t + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.1);

    // Note 2: E5 (659.25 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    const t2 = t + 0.06;
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, t2);

    gain2.gain.setValueAtTime(0.0001, t2);
    gain2.gain.linearRampToValueAtTime(0.16 * vol, t2 + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.14);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.15);
  }

  /**
   * 3. Favorite Removed: Gentle descending tone (D5 -> A4).
   */
  private synthesizeFavoriteRemove(ctx: AudioContext, t: number, vol: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t); // D5
    osc.frequency.exponentialRampToValueAtTime(440.0, t + 0.12); // A4

    const peakGain = 0.12 * vol;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peakGain, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  /**
   * 4. Deal Saved: Luxurious three-note arpeggio (C5 -> E5 -> G5).
   */
  private synthesizeDealSaved(ctx: AudioContext, t: number, vol: number): void {
    const notes = [
      { freq: 523.25, offset: 0, duration: 0.18, volScale: 0.12 },
      { freq: 659.25, offset: 0.05, duration: 0.20, volScale: 0.14 },
      { freq: 783.99, offset: 0.10, duration: 0.26, volScale: 0.16 },
    ];

    notes.forEach(({ freq, offset, duration, volScale }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = t + offset;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(volScale * vol, noteTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + duration + 0.01);
    });
  }

  /**
   * 5. Modal Open: Subtle airy upward glide.
   */
  private synthesizeModalOpen(ctx: AudioContext, t: number, vol: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(750, t);
    filter.Q.setValueAtTime(1.2, t);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(480, t + 0.08);

    const peakGain = 0.11 * vol;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peakGain, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  /**
   * 6. Modal Close: Muted downward airy tap.
   */
  private synthesizeModalClose(ctx: AudioContext, t: number, vol: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.06);

    const peakGain = 0.09 * vol;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peakGain, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  /**
   * 7. Search Initiated: Crisp modern frequency sweep.
   */
  private synthesizeSearchInitiate(ctx: AudioContext, t: number, vol: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.07);

    const peakGain = 0.12 * vol;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peakGain, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * 8. Comparison Completed: Polished two-tone bell chord (F5 + A5).
   */
  private synthesizeComparisonComplete(ctx: AudioContext, t: number, vol: number): void {
    const frequencies = [698.46, 880.0]; // F5 and A5

    frequencies.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const peakGain = 0.12 * vol;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(peakGain, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  /**
   * 9. Action Success: Elegant confirmation chime (G5 -> C6).
   */
  private synthesizeActionSuccess(ctx: AudioContext, t: number, vol: number): void {
    // Note 1: G5 (783.99 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, t);

    gain1.gain.setValueAtTime(0.0001, t);
    gain1.gain.linearRampToValueAtTime(0.13 * vol, t + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.09);

    // Note 2: C6 (1046.50 Hz)
    const t2 = t + 0.05;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, t2);

    gain2.gain.setValueAtTime(0.0001, t2);
    gain2.gain.linearRampToValueAtTime(0.16 * vol, t2 + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.18);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.19);
  }

  /**
   * 10. Action Error: Low double-tap cautionary tone (200Hz -> 150Hz).
   */
  private synthesizeActionError(ctx: AudioContext, t: number, vol: number): void {
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(220, t);
    osc1.frequency.exponentialRampToValueAtTime(150, t + 0.06);

    const peakGain = 0.13 * vol;
    gain1.gain.setValueAtTime(0.0001, t);
    gain1.gain.linearRampToValueAtTime(peakGain, t + 0.005);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.07);

    // Second softer tap
    const t2 = t + 0.08;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(170, t2);
    osc2.frequency.exponentialRampToValueAtTime(130, t2 + 0.06);

    gain2.gain.setValueAtTime(0.0001, t2);
    gain2.gain.linearRampToValueAtTime(peakGain * 0.8, t2 + 0.005);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.06);

    osc2.connect(filter);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.07);
  }
}

/**
 * Singleton instance of the audio engine
 */
export const soundEngine = new WebAudioSoundEngine();

/**
 * Safely reads sound preferences from localStorage.
 * Falls back to DEFAULT_SOUND_PREFERENCES if unavailable.
 */
export function loadSoundPreferences(): SoundPreferences {
  if (typeof window === 'undefined') return DEFAULT_SOUND_PREFERENCES;
  try {
    const raw = localStorage.getItem(SOUND_STORAGE_KEY);
    if (!raw) return DEFAULT_SOUND_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : false,
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : 0.5,
    };
  } catch {
    return DEFAULT_SOUND_PREFERENCES;
  }
}

/**
 * Safely persists sound preferences to localStorage.
 */
export function saveSoundPreferences(prefs: SoundPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    const sanitized: SoundPreferences = {
      soundEnabled: Boolean(prefs.soundEnabled),
      volume: Math.max(0, Math.min(1, Number(prefs.volume) || 0)),
    };
    localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // Ignore storage quota or disabled storage errors
  }
}
