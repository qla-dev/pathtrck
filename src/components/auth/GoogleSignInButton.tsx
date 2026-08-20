import { useEffect, useState } from 'react';
import { Language } from '../../types';
import { GOOGLE_CLIENT_ID, loadGoogleIdentityScript } from '../../lib/googleIdentity';

type GoogleSignInButtonProps = {
  onCredential: (accessToken: string) => void;
  label: string;
  lang?: Language;
};

function GoogleLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" className="shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A24 24 0 0 0 0 24c0 3.87.92 7.53 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// A fully custom, always-static button — deliberately NOT Google's own renderButton()/One Tap
// UI. Those are personalized by Chrome's native FedCM account chooser once a session exists
// (renders as "Continue as {Name}" with the user's photo, which page CSS/JS cannot override
// since it's browser-drawn, not page DOM). This uses the imperative OAuth2 token-client API
// instead — same family as Apple's imperative signIn() — so there is never a live Google
// element sitting in the page to be re-skinned; a real Google consent popup only ever appears
// after the user clicks, exactly like Apple's button.
export function GoogleSignInButton({ onCredential, label, lang }: GoogleSignInButtonProps) {
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGoogleIdentityScript(lang || undefined)
      .then(() => {
        if (cancelled || !window.google) return;
        setReady(true);
      })
      .catch(() => setReady(false));
    return () => { cancelled = true; };
  }, [lang]);

  const handleClick = () => {
    if (!window.google || submitting) return;
    setSubmitting(true);
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: (response) => {
        setSubmitting(false);
        if (response.access_token) onCredential(response.access_token);
      },
      error_callback: () => setSubmitting(false),
    });
    client.requestAccessToken();
  };

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!ready || submitting}
      className="flex h-[50px] w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-orange-500 bg-orange-500 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white">
        <GoogleLogo />
      </span>
      {label}
    </button>
  );
}
