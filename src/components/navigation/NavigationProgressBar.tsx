import { useEffect, useState, useTransition } from 'react';
import { useLocation } from 'react-router-dom';

export function NavigationProgressBar() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const location = useLocation();

  useEffect(() => {
    // Brief progress bar on route change
    setIsNavigating(true);
    setProgress(30);

    const t1 = setTimeout(() => setProgress(70), 100);
    const t2 = setTimeout(() => setProgress(100), 250);
    const t3 = setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
    }, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [location.pathname]);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-0.5">
      <div
        className="h-full bg-primary transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default NavigationProgressBar;
