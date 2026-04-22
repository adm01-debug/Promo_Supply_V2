/// <reference types="vite/client" />

// Augment Vite's ImportMetaEnv with explicit fields for our VITE_* vars.
// This removes the open `[key: string]: any` index signature for these
// keys, so `import.meta.env.VITE_SUPABASE_URL` (dot access) is allowed
// under tsconfig's `noPropertyAccessFromIndexSignature`. Vite's built-in
// fields (MODE, DEV, PROD, SSR, BASE_URL) come from the reference above.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: Error) => void;
  }
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
