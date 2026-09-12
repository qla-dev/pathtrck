import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import 'flatpickr/dist/flatpickr.min.css';
import { api } from './services/api';
import { installLenaCatalog } from './lib/lenaCatalog';
import './index.css';

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
    root.render(<div role="status" className="p-6">Loading…</div>);
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
      root.render(<div role="alert" className="p-6">Unable to load the application. <button onClick={() => void start()}>Retry</button></div>);
    }
  };
  void start();
}
