import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to track if a form is dirty and prevent accidental navigation.
 */
export const useFormDirty = (isDirty: boolean, message: string = "Você tem alterações não salvas. Deseja realmente sair?") => {
  const [shouldPrevent, setShouldPrevent] = useState(isDirty);

  useEffect(() => {
    setShouldPrevent(isDirty);
  }, [isDirty]);

  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (shouldPrevent) {
      e.preventDefault();
      e.returnValue = message;
      return message;
    }
  }, [shouldPrevent, message]);

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [handleBeforeUnload]);

  // Handle in-app navigation (React Router) via custom event that components can listen to
  useEffect(() => {
    const handleNavigation = (e: any) => {
      if (shouldPrevent && !window.confirm(message)) {
        e.preventDefault();
        // This is a simplified version; real RR navigation blocking needs unstable_useBlocker
      }
    };
    
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, [shouldPrevent, message]);

  return { isDirty: shouldPrevent };
};
