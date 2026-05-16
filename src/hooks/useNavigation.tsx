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
 * Tracks history depth to determine if logical "back" or browser "back" should be used.
 */
export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [breadcrumbLabel, setBreadcrumbLabel] = useState<string | null>(null);
  const location = useLocation();
  
  // Use a ref to track entry path once
  const [entryPath] = useState(() => window.location.pathname);
  
  // Track history stack depth within the app session
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    setHistoryCount(prev => prev + 1);
  }, [location.pathname]);

  const value = useMemo(() => ({
    breadcrumbLabel,
    setBreadcrumbLabel,
    canGoBack: historyCount > 1,
    entryPath
  }), [breadcrumbLabel, historyCount, entryPath]);

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
