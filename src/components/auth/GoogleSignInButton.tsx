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
    let themeObserver: MutationObserver | null = null;
    let buttonObserver: MutationObserver | null = null;
    let lastWidth = 0;
    let lastDark = false;

    const isDark = () => document.documentElement.classList.contains('dark');

    // Google only offers canned button shapes/sizes (no arbitrary radius or height), so we
    // reach into the rendered button (plain DOM, not a shadow root or iframe) and force its
    // border-radius/background/border to match the input fields — but only ever touch those
    // few properties. Google re-renders its own internal markup live (e.g. once it detects an
    // already-signed-in browser session and swaps in an account chip); leaving `display`,
    // layout and sizing untouched, and re-applying via a MutationObserver instead of tearing
    // the button down and rebuilding it, keeps that live behavior (and its hover states)
    // intact instead of fighting it.
    const restyleButton = () => {
      const btn = buttonRef.current?.querySelector<HTMLElement>('div[role="button"]');
      if (!btn) return;
      btn.style.borderRadius = '12px';
      btn.style.boxSizing = 'border-box';
      btn.style.paddingTop = '5px';
      btn.style.paddingBottom = '5px';
      // filled_black's own near-black fill clashes with the app's actual dark:bg-slate-900
      // card; pin it to the app's real slate-900/slate-800 tokens so it blends in like the
      // quick-login buttons do (dark:bg-slate-900 dark:border-slate-800).
      btn.style.backgroundColor = isDark() ? 'oklch(20.8% 0.042 265.755)' : '';
      btn.style.borderColor = isDark() ? 'oklch(27.9% 0.041 260.031)' : '';
      btn.style.borderWidth = isDark() ? '1px' : '';
      btn.style.borderStyle = isDark() ? 'solid' : '';
    };

    const renderButton = (force = false) => {
      if (!window.google || !buttonRef.current || !containerRef.current) return;
      const width = Math.floor(containerRef.current.getBoundingClientRect().width);
      if (!width) return;
      const dark = isDark();
      if (!force && width === lastWidth && dark === lastDark) return;
      lastWidth = width;
      lastDark = dark;

      buttonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: dark ? 'filled_black' : 'outline',
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
        });
        renderButton(true);
        if (containerRef.current) {
          resizeObserver = new ResizeObserver(() => renderButton());
          resizeObserver.observe(containerRef.current);
        }
        // The dark class toggles on <html> at runtime (theme switcher), so re-render the
        // button with the matching Google theme instead of leaving it stuck light-on-dark.
        themeObserver = new MutationObserver(() => renderButton());
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      })
      .catch(() => setReady(false));

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
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
