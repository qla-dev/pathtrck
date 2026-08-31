import { CreditCard, Sparkles, Zap } from 'lucide-react';

import { flatpickrI18n, ui } from '../../i18n';
import { Language } from '../../types';

type LenaOutOfTokensCardProps = {
  lang: Language;
  // UserSubscription.expires_at - when the plan's message allowance renews. Optional: a plan can be
  // open-ended, in which case the card drops the "resets on ..." sentence instead of inventing one.
  resetAt?: string | null;
  onUpgrade?: () => void;
  onTopUp?: () => void;
};

// Shown inside the LenaAI chat instead of an AI reply once the user's plan has no LenaAI messages
// left - the user's message still lands in the thread, this card answers it, and no AI call is made.
export const LenaOutOfTokensCard = ({ lang, resetAt, onUpgrade, onTopUp }: LenaOutOfTokensCardProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  // bs-BA has poor ICU coverage in most JS runtimes, so the month name comes from the app's own
  // translated flatpickr locale data rather than Intl (same approach as UsageView.tsx).
  const formattedReset = (() => {
    if (!resetAt) return '';
    const parsed = new Date(resetAt);
    if (Number.isNaN(parsed.getTime())) return '';
    const month = flatpickrI18n(lang).months.shorthand[parsed.getMonth()];
    return lang === 'en'
      ? `${month} ${parsed.getDate()}, ${parsed.getFullYear()}`
      : `${parsed.getDate()}. ${month} ${parsed.getFullYear()}.`;
  })();

  const body = formattedReset
    ? u('lena.outOfTokens.body', 'Your message limit resets on {date}. To keep using LenaAI, add credits or upgrade your plan today.').replace('{date}', formattedReset)
    : u('lena.outOfTokens.bodyNoReset', 'To keep using LenaAI, add credits or upgrade your plan today.');

  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"><Sparkles className="h-4 w-4" /></span>
        <p className="text-sm font-black text-slate-900 dark:text-white">{u('lena.outOfTokens.title', 'You are out of LenaAI messages')}</p>
      </div>
      <p className="mt-2.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{body}</p>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <button type="button" onClick={onUpgrade} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-black text-white transition-all hover:brightness-95">
          <Zap className="h-3.5 w-3.5" />
          {u('lena.outOfTokens.upgrade', 'Upgrade')}
        </button>
        <button type="button" onClick={onTopUp} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <CreditCard className="h-3.5 w-3.5" />
          {u('lena.outOfTokens.addCredits', 'Add credits')}
        </button>
      </div>
    </div>
  );
};
