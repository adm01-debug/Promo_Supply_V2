import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationContextType {
  breadcrumbLabel: string | null;
  setBreadcrumbLabel: (label: string | null) => void;
  canGoBack: boolean;
  entryPath: string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

/**
 * High-performance navigation provider.
 * Uses React Router's history index (window.history.state.idx) as source of
 * truth so browser back/forward is respected — a monotonic counter would keep
 * canGoBack=true after returning to the entry page and break SmartBackButton.
 */
export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [breadcrumbLabel, setBreadcrumbLabel] = useState<string | null>(null);
  const location = useLocation();

  const [entryPath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );

  // MED-C11: read the router-managed history index instead of a growing counter
  const [historyIdx, setHistoryIdx] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    return typeof idx === 'number' ? idx : 0;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number') setHistoryIdx(idx);
  }, [location.key, location.pathname]);

  const value = useMemo(
    () => ({
      breadcrumbLabel,
      setBreadcrumbLabel,
      canGoBack: historyIdx > 0,
      entryPath,
    }),
    [breadcrumbLabel, historyIdx, entryPath],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    // Return a default value instead of throwing to prevent application-wide crashes
    // while we debug the provider placement
    console.warn('useNavigation must be used within a NavigationProvider. Returning default values.');
    return {
      breadcrumbLabel: null,
      setBreadcrumbLabel: () => {},
      canGoBack: false,
      entryPath: '/',
    };
  }
  return context;
};
