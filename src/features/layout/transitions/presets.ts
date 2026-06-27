import type { Transition, TargetAndTransition } from "framer-motion";

export type TransitionName =
  | "fade"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "zoom-in"
  | "zoom-out"
  | "flip-x"
  | "flip-y"
  | "parallax"
  | "blur-scale"
  | "none";

export interface PageMotion {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.23, 1, 0.32, 1];

const baseTransition: Transition = { duration: 0.4, ease: EASE_OUT_EXPO };

export const PRESETS: Record<TransitionName, PageMotion> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: baseTransition,
  },
  "slide-left": {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
    transition: baseTransition,
  },
  "slide-right": {
    initial: { opacity: 0, x: -40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 40 },
    transition: baseTransition,
  },
  "slide-up": {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -40 },
    transition: baseTransition,
  },
  "slide-down": {
    initial: { opacity: 0, y: -40 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 40 },
    transition: baseTransition,
  },
  "zoom-in": {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.04 },
    transition: baseTransition,
  },
  "zoom-out": {
    initial: { opacity: 0, scale: 1.08 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
    transition: baseTransition,
  },
  "flip-x": {
    initial: { opacity: 0, rotateX: 12 },
    animate: { opacity: 1, rotateX: 0 },
    exit: { opacity: 0, rotateX: -12 },
    transition: { duration: 0.45, ease: EASE_OUT_EXPO },
  },
  "flip-y": {
    initial: { opacity: 0, rotateY: 12 },
    animate: { opacity: 1, rotateY: 0 },
    exit: { opacity: 0, rotateY: -12 },
    transition: { duration: 0.45, ease: EASE_OUT_EXPO },
  },
  parallax: {
    initial: { opacity: 0, y: 80 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -40 },
    transition: { duration: 0.55, ease: EASE_OUT_EXPO },
  },
  "blur-scale": {
    initial: { opacity: 0, y: 20, filter: "blur(8px)", scale: 0.98 },
    animate: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 },
    exit: { opacity: 0, y: -20, filter: "blur(8px)", scale: 0.98 },
    transition: baseTransition,
  },
  none: {
    initial: {},
    animate: {},
    exit: {},
    transition: { duration: 0 },
  },
};

export interface PresetOverrides {
  duration?: number;
  ease?: Transition["ease"];
  delay?: number;
}

export function resolvePreset(name: TransitionName, overrides?: PresetOverrides): PageMotion {
  const base = PRESETS[name] ?? PRESETS.fade;
  if (!overrides) return base;
  return {
    ...base,
    transition: {
      ...base.transition,
      ...(overrides.duration !== undefined ? { duration: overrides.duration } : {}),
      ...(overrides.ease !== undefined ? { ease: overrides.ease } : {}),
      ...(overrides.delay !== undefined ? { delay: overrides.delay } : {}),
    },
  };
}
