import { useEffect, useCallback } from 'react';
import { useBeforeUnload } from 'react-router-dom';

/**
 * Hook to prevent data loss when a user tries to navigate away with unsaved changes.
 */

export const useUnsavedChanges = (isDirty: boolean, message = 'Você tem alterações não salvas. Deseja realmente sair?') => {
  // Handle browser close/refresh
  useBeforeUnload(
    useCallback(
      (event) => {
        if (isDirty) {
          event.preventDefault();
          event.returnValue = message;
        }
      },
      [isDirty, message]
    )
  );

  useEffect(() => {
    if (!isDirty) return;

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor && anchor.href && !anchor.href.startsWith(window.location.origin)) {
        if (!window.confirm(message)) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('click', handleAnchorClick, true);
    return () => window.removeEventListener('click', handleAnchorClick, true);
  }, [isDirty, message]);

  return null;
};
