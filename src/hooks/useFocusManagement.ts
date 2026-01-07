import { useEffect, useRef, useCallback } from 'react';

interface UseFocusManagementOptions {
  containerRef: React.RefObject<HTMLElement>;
  isActive: boolean;
  restoreFocus?: boolean;
  autoFocus?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  finalFocusRef?: React.RefObject<HTMLElement>;
}

export function useFocusManagement({
  containerRef,
  isActive,
  restoreFocus = true,
  autoFocus = true,
  initialFocusRef,
  finalFocusRef,
}: UseFocusManagementOptions) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store previously focused element
  useEffect(() => {
    if (isActive) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [isActive]);

  // Auto focus on initial element
  useEffect(() => {
    if (!isActive || !autoFocus) return;

    const timer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (containerRef.current) {
        const focusable = getFocusableElements(containerRef.current);
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isActive, autoFocus, initialFocusRef, containerRef]);

  // Restore focus on close
  useEffect(() => {
    if (isActive) return;

    if (restoreFocus && previousActiveElement.current) {
      const elementToFocus = finalFocusRef?.current || previousActiveElement.current;
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (elementToFocus && typeof elementToFocus.focus === 'function') {
          elementToFocus.focus();
        }
      });
    }
  }, [isActive, restoreFocus, finalFocusRef]);

  const focusFirst = useCallback(() => {
    if (!containerRef.current) return;
    const focusable = getFocusableElements(containerRef.current);
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }, [containerRef]);

  const focusLast = useCallback(() => {
    if (!containerRef.current) return;
    const focusable = getFocusableElements(containerRef.current);
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus();
    }
  }, [containerRef]);

  return { focusFirst, focusLast };
}

// Arrow key navigation for lists
interface UseArrowNavigationOptions {
  containerRef: React.RefObject<HTMLElement>;
  itemSelector: string;
  orientation?: 'vertical' | 'horizontal' | 'both';
  loop?: boolean;
  onSelect?: (element: HTMLElement, index: number) => void;
}

export function useArrowNavigation({
  containerRef,
  itemSelector,
  orientation = 'vertical',
  loop = true,
  onSelect,
}: UseArrowNavigationOptions) {
  const currentIndex = useRef(0);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!containerRef.current) return;

    const items = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(itemSelector)
    );

    if (items.length === 0) return;

    let nextIndex = currentIndex.current;
    let shouldHandle = false;

    switch (event.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          nextIndex = currentIndex.current + 1;
          shouldHandle = true;
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          nextIndex = currentIndex.current - 1;
          shouldHandle = true;
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          nextIndex = currentIndex.current + 1;
          shouldHandle = true;
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          nextIndex = currentIndex.current - 1;
          shouldHandle = true;
        }
        break;
      case 'Home':
        nextIndex = 0;
        shouldHandle = true;
        break;
      case 'End':
        nextIndex = items.length - 1;
        shouldHandle = true;
        break;
      case 'Enter':
      case ' ':
        if (onSelect) {
          event.preventDefault();
          onSelect(items[currentIndex.current], currentIndex.current);
        }
        return;
    }

    if (!shouldHandle) return;

    event.preventDefault();

    // Handle looping
    if (loop) {
      if (nextIndex < 0) nextIndex = items.length - 1;
      if (nextIndex >= items.length) nextIndex = 0;
    } else {
      nextIndex = Math.max(0, Math.min(items.length - 1, nextIndex));
    }

    currentIndex.current = nextIndex;
    items[nextIndex].focus();
  }, [containerRef, itemSelector, orientation, loop, onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, handleKeyDown]);

  const setCurrentIndex = useCallback((index: number) => {
    currentIndex.current = index;
  }, []);

  return { setCurrentIndex };
}

// Roving tabindex for toolbar-like components
export function useRovingTabIndex(
  containerRef: React.RefObject<HTMLElement>,
  itemSelector: string
) {
  const currentIndex = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
    
    // Set initial tabindex
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

      event.preventDefault();
      const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
      
      let nextIndex = currentIndex.current;

      switch (event.key) {
        case 'ArrowRight':
          nextIndex = (currentIndex.current + 1) % items.length;
          break;
        case 'ArrowLeft':
          nextIndex = (currentIndex.current - 1 + items.length) % items.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = items.length - 1;
          break;
      }

      // Update tabindex
      items[currentIndex.current].setAttribute('tabindex', '-1');
      items[nextIndex].setAttribute('tabindex', '0');
      items[nextIndex].focus();
      currentIndex.current = nextIndex;
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, itemSelector]);
}

// Helper function
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelectors)
  ).filter((el) => el.offsetParent !== null);
}
