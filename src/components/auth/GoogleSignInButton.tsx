import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { GOOGLE_CLIENT_ID, loadGoogleIdentityScript } from '../../lib/googleIdentity';

type GoogleSignInButtonProps = {
  onCredential: (idToken: string) => void;
  label: string;
};

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 210 210" fill="currentColor" className="shrink-0">
      <path d="M0 105C0 47.103 47.103 0 105 0c23.383 0 45.515 7.523 64.004 21.756l-24.4 31.696C133.172 44.652 119.477 40 105 40c-35.841 0-65 29.159-65 65s29.159 65 65 65c28.867 0 53.398-18.913 61.852-45H105V85h105v20c0 57.897-47.103 105-105 105S0 162.897 0 105Z" />
    </svg>
  );
}

export function GoogleSignInButton({ onCredential, label }: GoogleSignInButtonProps) {
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let lastWidth = 0;

    // We never show Google's own rendered button — it's kept fully transparent and
    // stacked on top purely so a click lands on it and Google issues a real ID token
    // through its own supported flow. What the user actually sees is our own static
    // button underneath (same treatment as the Apple button), so none of Google's live
    // redraws — hover states, or the "already signed in as X" account chip it injects
    // once it detects a browser session — are ever visible or fight with our styling.
    const renderButton = () => {
      if (!window.google || !buttonRef.current || !containerRef.current) return;
      const width = Math.floor(containerRef.current.getBoundingClientRect().width);
      if (!width || width === lastWidth) return;
      lastWidth = width;
      buttonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        size: 'large',
        width,
      });
      setReady(true);
    };

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredentialRef.current(response.credential),
        });
        renderButton();
        if (containerRef.current) {
          resizeObserver = new ResizeObserver(() => renderButton());
          resizeObserver.observe(containerRef.current);
        }
      })
      .catch(() => setReady(false));

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="relative h-[50px] w-full">
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-0 flex items-center justify-center gap-3 rounded-xl border border-orange-500 bg-orange-500 text-sm font-bold text-white transition-opacity',
          !ready && 'opacity-60'
        )}
      >
        <GoogleLogo />
        {label}
      </div>
      <div
        ref={containerRef}
        className={cn('absolute inset-0 z-10 overflow-hidden rounded-xl opacity-0', !ready && 'pointer-events-none')}
      >
        <div ref={buttonRef} className="h-full w-full" />
      </div>
    </div>
  );
}
