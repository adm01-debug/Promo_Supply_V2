import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

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
