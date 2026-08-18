import { useEffect, useState } from 'react';
import { APPLE_CLIENT_ID, loadAppleIdentityScript } from '../../lib/appleIdentity';

type AppleSignInButtonProps = {
  onCredential: (identityToken: string, fullName?: string) => void;
  label: string;
};

function AppleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor" className="shrink-0">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2Zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3Z" />
    </svg>
  );
}

export function AppleSignInButton({ onCredential, label }: AppleSignInButtonProps) {
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!APPLE_CLIENT_ID) return;
    let cancelled = false;
    loadAppleIdentityScript()
      .then(() => {
        if (cancelled || !window.AppleID) return;
        window.AppleID.auth.init({
          clientId: APPLE_CLIENT_ID,
          scope: 'name email',
          redirectURI: window.location.origin,
          usePopup: true,
        });
        setReady(true);
      })
      .catch(() => setReady(false));
    return () => { cancelled = true; };
  }, []);

  const handleClick = async () => {
    if (!window.AppleID || submitting) return;
    setSubmitting(true);
    try {
      const result = await window.AppleID.auth.signIn();
      const fullName = result.user?.name
        ? [result.user.name.firstName, result.user.name.lastName].filter(Boolean).join(' ')
        : undefined;
      onCredential(result.authorization.id_token, fullName || undefined);
    } catch {
      // Popup closed/cancelled by the user — nothing to surface, same as native's silent cancel.
    } finally {
      setSubmitting(false);
    }
  };

  if (!APPLE_CLIENT_ID) return null;

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={!ready || submitting}
      className="flex h-[50px] w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-slate-200 bg-black text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800"
    >
      <AppleLogo />
      {label}
    </button>
  );
}
