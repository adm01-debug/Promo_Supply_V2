// Type declarations for the JS-only fix-preview lib. Located alongside the
// .mjs so `moduleResolution: "bundler"` picks it up automatically.
export interface PackageDelta {
  name: string;
  installed: string | null;
  wouldInstall: string | null;
  declared: string | null;
  status:
    | "unchanged"
    | "would-change"
    | "missing-locally"
    | "would-be-removed"
    | "missing-from-lockfile";
}
export interface FixPreview {
  command: string;
  packages: PackageDelta[];
  lockfileDiff: string;
  lockfileChanged: boolean;
  warnings: string[];
  elapsedMs: number;
}
export function buildFixPreview(opts?: {
  rootDir?: string;
  packages?: string[];
  timeoutMs?: number;
}): FixPreview;
export function renderFixPreview(
  preview: FixPreview,
  opts?: { color?: boolean; maxDiffLines?: number },
): string;
