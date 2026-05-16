import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavigationContextType {
  breadcrumbLabel: string | null;
  setBreadcrumbLabel: (label: string | null) => void;
  canGoBack: boolean;
  entryPath: string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [breadcrumbLabel, setBreadcrumbLabel] = useState<string | null>(null);
  const [entryPath] = useState(window.location.pathname);
  const location = useLocation();
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    setHistoryCount(prev => prev + 1);
  }, [location.pathname]);

  const canGoBack = historyCount > 1;

  return (
    <NavigationContext.Provider value={{ breadcrumbLabel, setBreadcrumbLabel, canGoBack, entryPath }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
