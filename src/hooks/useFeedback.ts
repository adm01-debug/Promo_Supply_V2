import { useCallback, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'notification' | 'click' | 'approval' | 'rejection';

interface FeedbackPreferences {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  volume: number;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
}

// Zustand store for preferences
export const useFeedbackPreferences = create<FeedbackPreferences>()(
  persist(
    (set) => ({
      soundEnabled: true,
      hapticEnabled: true,
      volume: 0.5,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setHapticEnabled: (enabled) => set({ hapticEnabled: enabled }),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
    }),
    {
      name: 'feedback-preferences',
    }
  )
);

// Haptic patterns (duration in ms)
export const hapticPatterns: Record<FeedbackType, number[]> = {
  success: [10, 50, 20],
  error: [50, 30, 50, 30, 50],
  warning: [30, 20, 30],
  info: [10],
  notification: [20, 40, 20],
  click: [5],
  approval: [10, 30, 10, 30, 50],
  rejection: [100, 50, 100],
};

// Sound configurations
export type SoundConfig = { frequency: number; frequencyEnd?: number; duration: number; type: OscillatorType; pattern?: number[] };

export const soundConfigs: Record<FeedbackType, SoundConfig> = {
  success: { frequency: 880, duration: 0.15, type: 'sine', pattern: [523, 659, 784] },
  error: { frequency: 200, duration: 0.3, type: 'sawtooth', pattern: [300, 200] },
  warning: { frequency: 440, duration: 0.2, type: 'triangle', pattern: [440, 520, 440] },
  info: { frequency: 660, duration: 0.1, type: 'sine' },
  notification: { frequency: 800, duration: 0.1, type: 'sine', pattern: [600, 800] },
  click: { frequency: 1000, duration: 0.03, type: 'sine' },
  approval: { frequency: 523, duration: 0.1, type: 'sine', pattern: [523, 659, 784, 1047] },
  rejection: { frequency: 300, duration: 0.15, type: 'sawtooth', pattern: [400, 300, 200] },
};

// Main hook
export function useFeedback() {
  const { soundEnabled, hapticEnabled, volume } = useFeedbackPreferences();
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext lazily
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play haptic feedback
  const playHaptic = useCallback((type: FeedbackType) => {
    if (!hapticEnabled || !('vibrate' in navigator)) return;
    
    const pattern = hapticPatterns[type];
    navigator.vibrate(pattern);
  }, [hapticEnabled]);

  // Play sound feedback
  const playSound = useCallback(async (type: FeedbackType) => {
    if (!soundEnabled) return;

    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const config = soundConfigs[type];
      const frequencies = config.pattern || [config.frequency];
      const noteDuration = config.duration / frequencies.length;

      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = config.type;
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + (index * noteDuration / 1000));

        // Apply envelope
        const startTime = ctx.currentTime + (index * noteDuration / 1000);
        const endTime = startTime + (noteDuration / 1000);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(startTime);
        oscillator.stop(endTime + 0.1);
      });
    } catch (error) {
      logger.warn('Sound feedback failed', { error: error instanceof Error ? error.message : String(error) });
    }
  }, [soundEnabled, volume, getAudioContext]);

  // Combined feedback
  const triggerFeedback = useCallback((type: FeedbackType) => {
    playHaptic(type);
    playSound(type);
  }, [playHaptic, playSound]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    triggerFeedback,
    playHaptic,
    playSound,
    // Convenience methods
    success: () => triggerFeedback('success'),
    error: () => triggerFeedback('error'),
    warning: () => triggerFeedback('warning'),
    info: () => triggerFeedback('info'),
    notification: () => triggerFeedback('notification'),
    click: () => triggerFeedback('click'),
    approval: () => triggerFeedback('approval'),
    rejection: () => triggerFeedback('rejection'),
  };
}

// Note: For haptic-only feedback, use useHapticFeedback from useMobileGestures.ts
