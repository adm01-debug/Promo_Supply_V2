import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to warn user about unsaved changes when navigating away.
 * @param isDirty Whether there are unsaved changes
 * @param message Custom message to show (optional)
 */
export function useUnsavedChangesWarning(isDirty: boolean, message = "Você tem alterações não salvas. Tem certeza que deseja sair?") {
  const location = useLocation();

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);

  // Note: Modern browsers (Chrome 80+, etc.) have limited ability to block 
  // programmatic navigation via react-router without complex workarounds, 
  // but this covers the browser back/close actions which are most common.
}
