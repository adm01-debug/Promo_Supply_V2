/**
 * Utility for elite haptic feedback.
 * Uses the vibration API with patterns optimized for UX.
 */
export const haptics = {
  /** Light tap for button clicks or subtle interactions */
  light: () => {
    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  },
  
  /** Medium impact for more significant actions */
  medium: () => {
    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      window.navigator.vibrate(25);
    }
  },
  
  /** Success pattern: double tap */
  success: () => {
    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      window.navigator.vibrate([10, 50, 10]);
    }
  },
  
  /** Error pattern: triple tap or long-short */
  error: () => {
    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      window.navigator.vibrate([50, 100, 50, 100, 50]);
    }
  },

  /** Warning pattern */
  warning: () => {
    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      window.navigator.vibrate([30, 40, 30]);
    }
  }
};
