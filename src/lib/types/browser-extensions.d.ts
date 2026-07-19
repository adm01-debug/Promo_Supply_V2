/**
 * Type extensions for browser APIs that lack full TypeScript definitions.
 */

/** PerformanceEntry subtype for layout-shift events (CLS). */
interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

/** PerformanceEntry subtype for first-input events (FID). */
interface FirstInputEntry extends PerformanceEntry {
  processingStart: number;
}

/** Vendor-prefixed AudioContext for Safari compatibility. */
interface Window {
  webkitAudioContext?: typeof AudioContext;
}
