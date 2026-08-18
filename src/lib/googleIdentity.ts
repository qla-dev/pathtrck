declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';

let loadPromise: Promise<void> | null = null;
let loadedHl: string | undefined;

// Google's own button chrome only respects the app's language via this script-level `hl`
// hint (there's no per-render locale option). Only these two are wired up for now.
const GIS_LOCALES: Record<string, string> = { de: 'de', bs: 'bs' };

// Loads the Google Identity Services script once and reuses it across every mount
// (LoginProcess/SetupProcess can both request it without racing duplicate <script> tags).
export const loadGoogleIdentityScript = (lang?: string): Promise<void> => {
  const hl = lang ? GIS_LOCALES[lang] : undefined;

  if (window.google?.accounts?.id) {
    if (loadedHl === hl) return Promise.resolve();
    // The locale is baked into the script at load time, so a previously loaded script
    // can't just be re-localized in place — tear it down and fetch it again.
    document.querySelectorAll('script[src*="accounts.google.com/gsi/client"]').forEach((el) => el.remove());
    window.google = undefined;
    loadPromise = null;
  }

  if (loadPromise) return loadPromise;

  loadedHl = hl;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = hl ? `https://accounts.google.com/gsi/client?hl=${hl}` : 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Identity Services.'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
};
