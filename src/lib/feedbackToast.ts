import { toast as sonnerToast } from "sonner";
import { useFeedbackPreferences, hapticPatterns, soundConfigs, FeedbackType } from "@/hooks/useFeedback";

// Trigger feedback without using hooks (for use outside React components)
const triggerFeedback = (type: FeedbackType) => {
  const { soundEnabled, hapticEnabled, volume } = useFeedbackPreferences.getState();
  
  // Haptic feedback
  if (hapticEnabled && 'vibrate' in navigator) {
    navigator.vibrate(hapticPatterns[type]);
  }
  
  // Sound feedback
  if (soundEnabled && typeof AudioContext !== 'undefined') {
    try {
      const audioContext = new AudioContext();
      const config = soundConfigs[type];
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);
      
      if (config.frequencyEnd) {
        oscillator.frequency.exponentialRampToValueAtTime(
          config.frequencyEnd,
          audioContext.currentTime + config.duration
        );
      }
      
      gainNode.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + config.duration
      );
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + config.duration);
    } catch {
      // Audio context not available
    }
  }
};

// Wrapper for toast that automatically triggers feedback
export const toast = {
  success: (message: string, options?: Parameters<typeof sonnerToast.success>[1]) => {
    triggerFeedback('success');
    return sonnerToast.success(message, options);
  },
  error: (message: string, options?: Parameters<typeof sonnerToast.error>[1]) => {
    triggerFeedback('error');
    return sonnerToast.error(message, options);
  },
  warning: (message: string, options?: Parameters<typeof sonnerToast.warning>[1]) => {
    triggerFeedback('warning');
    return sonnerToast.warning(message, options);
  },
  info: (message: string, options?: Parameters<typeof sonnerToast.info>[1]) => {
    triggerFeedback('info');
    return sonnerToast.info(message, options);
  },
  // For custom toasts without feedback
  custom: sonnerToast,
  // Re-export other methods
  dismiss: sonnerToast.dismiss,
  promise: sonnerToast.promise,
  loading: sonnerToast.loading,
};
