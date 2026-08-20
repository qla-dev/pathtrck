import { useEffect, useRef, useState } from 'react';
import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { GOOGLE_CLIENT_ID, loadGoogleIdentityScript } from '../../lib/googleIdentity';

type GoogleSignInButtonProps = {
  onCredential: (idToken: string) => void;
  lang?: Language;
};

export function GoogleSignInButton({ onCredential, lang }: GoogleSignInButtonProps) {
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let buttonObserver: MutationObserver | null = null;
    let lastWidth = 0;

    // Google actively disables click handling on its rendered button once it detects the
    // button is hidden/overlaid (anti-clickjacking) — a fully custom decoy button doesn't
    // survive contact with real browsers even though it can look fine in automated tests.
    // So this stays the real, visible, Google-rendered button; we restyle it in place
    // (background/border/radius only — never layout/display) and reapply via a
    // MutationObserver instead of tearing it down, so Google's own live redraws still work.
    const restyleButton = () => {
      const btn = buttonRef.current?.querySelector<HTMLElement>('div[role="button"]');
      if (!btn) return;
      btn.style.height = '50px';
      btn.style.borderRadius = '12px';
      btn.style.boxSizing = 'border-box';
      btn.style.backgroundColor = '#f97316';
      btn.style.borderColor = '#f97316';
    };

    const renderButton = (force = false) => {
      if (!window.google || !buttonRef.current || !containerRef.current) return;
      const width = Math.floor(containerRef.current.getBoundingClientRect().width);
      if (!width) return;
      if (!force && width === lastWidth) return;
      lastWidth = width;

      buttonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'left',
        width,
      });
      restyleButton();
      requestAnimationFrame(restyleButton);
      setReady(true);

      buttonObserver?.disconnect();
      buttonObserver = new MutationObserver(() => restyleButton());
      buttonObserver.observe(buttonRef.current, { childList: true, subtree: true, attributes: true });
    };

    loadGoogleIdentityScript(lang || undefined)
      .then(() => {
        if (cancelled || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredentialRef.current(response.credential),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        // Without this, Google remembers a returning visitor's account and renders the
        // button as "Continue as {Name}" with their photo instead of the generic label —
        // this forces it back to a static, generic button every time, like Apple's.
        window.google.accounts.id.disableAutoSelect();
        renderButton(true);
        if (containerRef.current) {
          resizeObserver = new ResizeObserver(() => renderButton());
          resizeObserver.observe(containerRef.current);
        }
      })
      .catch(() => setReady(false));

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      buttonObserver?.disconnect();
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div
      ref={containerRef}
      className={cn('w-full overflow-hidden rounded-xl transition-opacity', !ready && 'opacity-0 pointer-events-none h-0')}
    >
      <div ref={buttonRef} />
    </div>
  );
}
