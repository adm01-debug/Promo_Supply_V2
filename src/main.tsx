import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

const ACCESSIBILITY_STORAGE_KEY = 'accessibility-settings';

const recoverAccessibilityVisualState = () => {
  try {
    const raw = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;

    const next = {
      ...parsed,
      highContrast: false,
      reducedMotion: false,
      colorBlindMode: 'none',
    };

    localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(next));

    const root = document.documentElement;
    root.classList.remove('high-contrast', 'reduced-motion');
    root.setAttribute('data-color-blind', 'none');
  } catch {
    // Ignore recovery parsing errors
  }
};

recoverAccessibilityVisualState();

// Register service worker for PWA
registerSW({
  onNeedRefresh() {
    // Show a prompt to the user to refresh the page
    if (confirm('Nova versão disponível. Atualizar agora?')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    // PWA ready for offline usage
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
