import type { Transition } from "framer-motion";
import type { TransitionName } from "./presets";

export interface TransitionOverride {
  pattern: RegExp;
  preset: TransitionName;
  duration?: number;
  ease?: Transition["ease"];
}

export const DEFAULT_TRANSITION: TransitionName = "blur-scale";

/**
 * Per-route overrides. First match wins.
 * Add new rules here to customize transitions per area.
 */
export const ROUTE_OVERRIDES: TransitionOverride[] = [
  { pattern: /^\/compras\/wizard/, preset: "slide-left" },
  { pattern: /^\/admin/, preset: "fade" },
  { pattern: /^\/auth/, preset: "zoom-in", duration: 0.35 },
];
