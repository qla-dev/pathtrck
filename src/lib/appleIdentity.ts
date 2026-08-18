declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope?: string;
          redirectURI: string;
          usePopup?: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: { id_token: string; code: string; state?: string };
          user?: { name?: { firstName?: string; lastName?: string }; email?: string };
        }>;
      };
    };
  }
}

export const APPLE_CLIENT_ID = (import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined)?.trim() || '';

let loadPromise: Promise<void> | null = null;

// Loads Apple's Sign In JS SDK once and reuses it across every mount, mirroring
// googleIdentity.ts's loader.
export const loadAppleIdentityScript = (): Promise<void> => {
  if (window.AppleID) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Sign in with Apple.'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
};
