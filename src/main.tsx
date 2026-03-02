import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import 'flatpickr/dist/flatpickr.min.css';
import App from './App.tsx';
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
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
