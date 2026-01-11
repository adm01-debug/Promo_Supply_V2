/**
 * Componente Link com prefetch automático
 */

import React, { useCallback, useRef, forwardRef } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { usePrefetch } from '@/hooks/usePrefetch';

interface PrefetchLinkProps extends LinkProps {
  prefetch?: boolean;
  prefetchDelay?: number;
}

export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  function PrefetchLinkInner(
    { to, prefetch = true, prefetchDelay = 100, onMouseEnter, onFocus, ...props },
    ref
  ) {
    const { prefetchByRoute } = usePrefetch();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const route = typeof to === 'string' ? to : to.pathname || '';

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (prefetch) {
          timeoutRef.current = setTimeout(() => {
            prefetchByRoute(route);
          }, prefetchDelay);
        }
        onMouseEnter?.(e);
      },
      [prefetch, prefetchDelay, route, onMouseEnter, prefetchByRoute]
    );

    const handleMouseLeave = useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }, []);

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLAnchorElement>) => {
        if (prefetch) {
          prefetchByRoute(route);
        }
        onFocus?.(e);
      },
      [prefetch, route, onFocus, prefetchByRoute]
    );

    return (
      <Link
        ref={ref}
        to={to}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);

PrefetchLink.displayName = 'PrefetchLink';
