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
    const timer = setTimeout(() => {
      nprogress.done();
    }, 100);

    return () => {
      clearTimeout(timer);
      nprogress.done();
    };
  }, [location.pathname]);

  return null;
};
