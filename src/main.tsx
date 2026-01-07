import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';
import { initWebVitals } from './lib/webVitals';

// Initialize Web Vitals monitoring in production
if (import.meta.env.PROD) {
  initWebVitals({
    debug: false,
    onReport: (report) => {
      // Send to your analytics endpoint
      // Example: fetch('/api/vitals', { method: 'POST', body: JSON.stringify(report) });
      console.log('📊 Web Vitals Report:', report);
    },
  });
}

// Register service worker for PWA
registerSW({
  onNeedRefresh() {
    // Show a prompt to the user to refresh the page
    if (confirm('Nova versão disponível. Atualizar agora?')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log('App pronto para uso offline');
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
