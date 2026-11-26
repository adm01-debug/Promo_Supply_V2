import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { DEFAULT_TRANSITION, ROUTE_OVERRIDES } from "./config";
import { resolvePreset, type PageMotion } from "./presets";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

export function usePageTransition(): PageMotion {
  const { pathname } = useLocation();
  const reduced = usePrefersReducedMotion();

  return useMemo(() => {
    if (reduced) return resolvePreset("none");
    const match = ROUTE_OVERRIDES.find((o) => o.pattern.test(pathname));
    if (match) {
      return resolvePreset(match.preset, {
        duration: match.duration,
        ease: match.ease,
      });
    }
    return resolvePreset(DEFAULT_TRANSITION);
  }, [pathname, reduced]);
}
