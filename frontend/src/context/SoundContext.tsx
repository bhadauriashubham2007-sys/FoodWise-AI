import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  SoundEffectType,
  soundEngine,
  loadSoundPreferences,
  saveSoundPreferences,
  DEFAULT_SOUND_PREFERENCES,
} from '../utils/soundEffects';

interface SoundContextType {
  soundEnabled: boolean;
  volume: number; // 0.0 to 1.0
  setSoundEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  toggleSound: () => void;
  play: (type: SoundEffectType) => void;
  testSound: (type?: SoundEffectType) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState(() => loadSoundPreferences());
  const soundEnabledRef = useRef(preferences.soundEnabled);
  const volumeRef = useRef(preferences.volume);

  // Keep ref synchronized for callbacks without recreating handlers
  useEffect(() => {
    soundEnabledRef.current = preferences.soundEnabled;
    volumeRef.current = preferences.volume;
    saveSoundPreferences(preferences);
  }, [preferences]);

  // Unlock AudioContext on first deliberate user gesture (click/touchend)
  useEffect(() => {
    const handleFirstGesture = () => {
      // Lazy context initialization on user interaction (complies with browser autoplay policy)
      soundEngine.getOrCreateContext();
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('pointerdown', handleFirstGesture, { passive: true, once: true });
    window.addEventListener('keydown', handleFirstGesture, { passive: true, once: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, soundEnabled: enabled }));
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setPreferences((prev) => ({ ...prev, volume: clamped }));
  }, []);

  const toggleSound = useCallback(() => {
    setPreferences((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  /**
   * Main playback dispatcher.
   * Completely silent if sound is disabled or volume is 0.
   */
  const play = useCallback((type: SoundEffectType) => {
    if (!soundEnabledRef.current || volumeRef.current <= 0) {
      return;
    }
    soundEngine.play(type, volumeRef.current);
  }, []);

  /**
   * Test/preview function for preferences UI.
   * Plays the sound effect at current volume level.
   */
  const testSound = useCallback((type: SoundEffectType = 'action_success') => {
    soundEngine.play(type, volumeRef.current > 0 ? volumeRef.current : 0.5);
  }, []);

  const value: SoundContextType = {
    soundEnabled: preferences.soundEnabled,
    volume: preferences.volume,
    setSoundEnabled,
    setVolume,
    toggleSound,
    play,
    testSound,
  };

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
};

export const useSound = (): SoundContextType => {
  const context = useContext(SoundContext);
  if (!context) {
    // Provide a safe fallback if used outside SoundProvider
    return {
      soundEnabled: false,
      volume: 0,
      setSoundEnabled: () => {},
      setVolume: () => {},
      toggleSound: () => {},
      play: () => {},
      testSound: () => {},
    };
  }
  return context;
};
