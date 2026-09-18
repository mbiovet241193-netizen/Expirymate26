import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(async (registration) => {
        // Best-effort only: supported on Chrome/Edge (installed PWA) and not
        // at all on Safari/iOS or Firefox. The on-open check in AppContext
        // is the mechanism guaranteed to work everywhere.
        try {
          const anyReg = registration as any;
          if ('periodicSync' in anyReg) {
            const status = await navigator.permissions.query({ name: 'periodic-background-sync' as any });
            if (status.state === 'granted') {
              await anyReg.periodicSync.register('qualitymate-daily-check', { minInterval: 24 * 60 * 60 * 1000 });
            }
          }
        } catch {
          // Unsupported - silently ignore.
        }
      })
      .catch(() => {
        // Offline-first app should still function without the SW.
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
