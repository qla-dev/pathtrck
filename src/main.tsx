import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import 'flatpickr/dist/flatpickr.min.css';
import { api } from './services/api';
import { installLenaCatalog } from './lib/lenaCatalog';
import './index.css';

/**
 * What fills the screen while the server-owned LenaAI catalog is fetched, before App can mount.
 *
 * It is deliberately the same full-screen, centred shape the app's own loading screen has, so
 * startup reads as one wait rather than a stray line of text followed by a spinner. No translation
 * is available yet - the catalog that carries the wording is exactly what is still loading.
 */
const BootScreen = ({ onRetry }: { onRetry?: () => void }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="flex flex-col items-center gap-4 text-slate-500">
      {onRetry ? (
        <>
          <p role="alert" className="text-sm font-bold">Unable to load the application.</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Retry
          </button>
        </>
      ) : (
        <>
          <div role="status" aria-label="Loading" className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-b-transparent" />
          <span className="text-sm font-bold">Loading</span>
        </>
      )}
    </div>
  </div>
);

if (window.location.protocol === 'file:') {
  document.body.innerHTML = `
    <div style="font-family: Arial, sans-serif; padding: 24px; line-height: 1.6; color: #0f172a;">
      <h2 style="margin: 0 0 8px;">This app must be opened over HTTP</h2>
      <p style="margin: 0 0 8px;">
        You opened <code>dist/index.html</code> as a local file, so module scripts are blocked.
      </p>
      <p style="margin: 0;">
        Open:
        <a href="http://localhost/pathtrck/dist/" style="color: #0284c7;">http://localhost/pathtrck/dist/</a>
      </p>
    </div>
  `;
} else {
  const root = createRoot(document.getElementById('root')!);
  const start = async () => {
    root.render(<BootScreen />);
    try {
      try {
        const response = await api.lenaCatalog();
        installLenaCatalog(response.data);
        try { localStorage.setItem('lena-catalog-v1', JSON.stringify(response.data)); } catch { /* Storage is optional. */ }
      } catch (error) {
        const cached = localStorage.getItem('lena-catalog-v1');
        if (!cached) throw error;
        installLenaCatalog(JSON.parse(cached));
      }
      // Option imports are evaluated only after the server-owned catalog is installed.
      const { default: App } = await import('./App.tsx');
      root.render(<StrictMode><App /></StrictMode>);
    } catch {
      root.render(<BootScreen onRetry={() => void start()} />);
    }
  };
  void start();
}
