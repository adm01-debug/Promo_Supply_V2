import { useEffect, useRef, useState, useCallback } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeState {
  swiping: boolean;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  deltaX: number;
  deltaY: number;
}

export function useSwipeGesture(
  handlers: SwipeHandlers,
  options: { threshold?: number; enabled?: boolean } = {}
) {
  const { threshold = 50, enabled = true } = options;
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [swipeState, setSwipeState] = useState<SwipeState>({
    swiping: false,
    direction: null,
    deltaX: 0,
    deltaY: 0,
  });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    setSwipeState({ swiping: true, direction: null, deltaX: 0, deltaY: 0 });
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !touchStart.current) return;
    
    const deltaX = e.touches[0].clientX - touchStart.current.x;
    const deltaY = e.touches[0].clientY - touchStart.current.y;
    
    let direction: SwipeState['direction'] = null;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }
    
    setSwipeState({ swiping: true, direction, deltaX, deltaY });
  }, [enabled]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !touchStart.current) return;
    
    const { deltaX, deltaY, direction } = swipeState;
    
    if (Math.abs(deltaX) > threshold && direction === 'left') {
      handlers.onSwipeLeft?.();
    } else if (Math.abs(deltaX) > threshold && direction === 'right') {
      handlers.onSwipeRight?.();
    } else if (Math.abs(deltaY) > threshold && direction === 'up') {
      handlers.onSwipeUp?.();
    } else if (Math.abs(deltaY) > threshold && direction === 'down') {
      handlers.onSwipeDown?.();
    }
    
    touchStart.current = null;
    setSwipeState({ swiping: false, direction: null, deltaX: 0, deltaY: 0 });
  }, [enabled, threshold, swipeState, handlers]);

  return {
    swipeState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

// Pull to refresh hook
interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  enabled?: boolean;
}

export function usePullToRefresh({ onRefresh, threshold = 80, enabled = true }: PullToRefreshOptions) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || refreshing) return;
    
    const container = containerRef.current;
    if (container && container.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, [enabled, refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !pulling || touchStartY.current === null || refreshing) return;
    
    const deltaY = e.touches[0].clientY - touchStartY.current;
    
    if (deltaY > 0) {
      // Resistance effect
      const resistance = 0.4;
      const distance = Math.min(deltaY * resistance, threshold * 1.5);
      setPullDistance(distance);
    }
  }, [enabled, pulling, refreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !pulling) return;
    
    if (pullDistance >= threshold) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    
    touchStartY.current = null;
    setPulling(false);
    setPullDistance(0);
  }, [enabled, pulling, pullDistance, threshold, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);

  return {
    containerRef,
    pulling,
    refreshing,
    pullDistance,
    progress,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

// Long press hook
export function useLongPress(
  callback: () => void,
  options: { delay?: number; enabled?: boolean } = {}
) {
  const { delay = 500, enabled = true } = options;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressing, setPressing] = useState(false);

  const start = useCallback(() => {
    if (!enabled) return;
    
    setPressing(true);
    timeoutRef.current = setTimeout(() => {
      callback();
      setPressing(false);
    }, delay);
  }, [callback, delay, enabled]);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPressing(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    pressing,
    handlers: {
      onMouseDown: start,
      onMouseUp: stop,
      onMouseLeave: stop,
      onTouchStart: start,
      onTouchEnd: stop,
    },
  };
}

// Haptic feedback (if supported)
export function useHapticFeedback() {
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const lightTap = useCallback(() => vibrate(10), [vibrate]);
  const mediumTap = useCallback(() => vibrate(20), [vibrate]);
  const heavyTap = useCallback(() => vibrate([30, 10, 30]), [vibrate]);
  const success = useCallback(() => vibrate([10, 50, 20]), [vibrate]);
  const error = useCallback(() => vibrate([50, 30, 50, 30, 50]), [vibrate]);

  return {
    vibrate,
    lightTap,
    mediumTap,
    heavyTap,
    success,
    error,
    isSupported: 'vibrate' in navigator,
  };
}
