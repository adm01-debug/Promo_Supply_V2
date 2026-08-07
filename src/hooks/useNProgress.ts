import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import nprogress from 'nprogress';
import 'nprogress/nprogress.css';

// Configure nprogress
nprogress.configure({ 
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.08
});

/**
 * Hook to show a progress bar on route changes.
 */
export const useNProgress = () => {
  const location = useLocation();

  useEffect(() => {
    nprogress.start();
    
    // Use a small delay to ensure visual feedback even for fast loads
    const timer = setTimeout(() => {
      nprogress.done();
    }, 250);

    return () => {
      clearTimeout(timer);
      nprogress.done();
    };
  }, [location.pathname, location.search]);

  return null;
};
