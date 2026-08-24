import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, CreditCard, ShieldCheck, Sparkles, X, Zap } from 'lucide-react';
import { Language, SubscriptionPackage } from '../../types';
import { ui } from '../../i18n';
import { api } from '../../services/api';
import { planName, planTagline, FEATURE_ICONS } from '../pricing/PricingPlanCard';
import { BrandWordmark } from '../ui/BrandWordmark';
import { PaymentPanelArt } from './PaymentPanelArt';

type PaymentModalProps = {
  open: boolean;
  lang: Language;
  packageId: number | null;
  onClose: () => void;
  onSuccess: () => void;
};

const formatCardNumber = (value: string): string => value.replace(/[^0-9]/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
const formatExpiry = (value: string): string => {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};
const formatCvc = (value: string): string => value.replace(/[^0-9]/g, '').slice(0, 4);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PaymentModal = ({ open, lang, packageId, onClose, onSuccess }: PaymentModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  const [pkg, setPkg] = useState<SubscriptionPackage | null>(null);
  const [loadingPkg, setLoadingPkg] = useState(Boolean(packageId));
  const [pkgError, setPkgError] = useState('');
  const [amount, setAmount] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [succeeded, setSucceeded] = useState(false);
  const [creditedTokens, setCreditedTokens] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    setAmount('');
    setCardName('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvc('');
    setEmail('');
    setSubmitError('');
    setSucceeded(false);
    setCreditedTokens(0);
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !submitting) onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, packageId]);

  useEffect(() => {
    if (!open || !packageId) {
      setPkg(null);
      return;
    }
    let active = true;
    setLoadingPkg(true);
    setPkgError('');
    api.subscriptionPackages.get(packageId)
      .then((response) => { if (active) setPkg(response.data as unknown as SubscriptionPackage); })
      .catch((error) => { if (active) setPkgError(error instanceof Error ? error.message : 'Unable to load plan.'); })
      .finally(() => { if (active) setLoadingPkg(false); });
    return () => { active = false; };
  }, [open, packageId]);

  const parsedAmount = Number(amount.replace(',', '.'));
  const estimatedTokens = Number.isFinite(parsedAmount) && parsedAmount > 0 ? Math.floor(parsedAmount / 0.05) : 0;
  const cardDigits = cardNumber.replace(/\s/g, '');
  const isCardFormValid = cardName.trim().length > 1
    && cardDigits.length >= 13
    && /^\d{2}\/\d{2}$/.test(cardExpiry)
    && cardCvc.length >= 3
    && EMAIL_PATTERN.test(email);
  const canCheckout = (packageId ? Boolean(pkg) : parsedAmount > 0) && isCardFormValid;

  const checkout = async () => {
    if (!canCheckout || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = packageId
        ? await api.payments.checkout({ subscription_package_id: packageId })
        : await api.payments.checkout({ amount: parsedAmount });
      setCreditedTokens(Number(response.data.tokens || 0));
      setSucceeded(true);
      onSuccess();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : u('payments.checkoutFailed', 'Payment could not be completed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const title = packageId ? (pkg ? planName(u, pkg) : u('payments.title', 'Checkout')) : u('payments.quickTopup', 'Quick Top-up');
  const price = packageId ? Number(pkg?.price_monthly || 0) : parsedAmount || 0;
  const priceLabel = `${price.toLocaleString()} KM`;
  const itemLabel = packageId ? (pkg ? planName(u, pkg) : '—') : u('payments.quickTopup', 'Quick Top-up');
  const itemCaption = packageId ? u('payments.monthlyPrice', 'Monthly price') : u('payments.oneTime', 'One-time');

  const tips = [
    u('usage.tip1', 'Chatting with the LenaAI dispatcher assistant'),
    u('usage.tip2', 'Scanning a document to auto-fill a load'),
    u('usage.tip3', 'Parsing a load from pasted text'),
    u('usage.tip4', 'Bulk-importing multiple loads at once'),
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-stretch justify-center overflow-hidden bg-slate-950/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.992 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: 16, scale: 0.996 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col bg-white dark:bg-slate-900 shadow-2xl w-full h-[100dvh] overflow-hidden border-0 rounded-none"
          >
            <div className="sticky top-0 z-20 border-b border-slate-100 dark:border-slate-800 bg-white/96 dark:bg-slate-900/96 backdrop-blur-sm">
              <div className="h-16 px-5 md:px-7 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                    <CreditCard className="text-primary w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base md:text-lg font-black tracking-tight dark:text-white leading-tight truncate">
                      {u('payments.title', 'Checkout')}
                    </p>
                    <p className="hidden sm:block text-xs text-slate-500 truncate">
                      {packageId ? u('payments.subtitlePlan', 'Confirm your plan to activate it.') : u('payments.subtitleTopup', 'Add more LenaAI messages to your account at any time.')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { if (!submitting) onClose(); }}
                  className="shrink-0 h-10 w-10 cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                  aria-label={u('common.cancel', 'Cancel')}
                  title={u('common.cancel', 'Cancel')}
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {succeeded ? (
                <div className="flex min-h-full items-center justify-center p-6">
                  <div className="w-full max-w-md space-y-6 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black dark:text-white">{u('payments.success', 'Payment successful')}</h2>
                      <p className="text-slate-500 mt-2">{u('payments.successDesc', 'LenaAI messages have been added to your account.')}</p>
                    </div>
                    <div className="rounded-2xl bg-primary/5 ring-1 ring-primary/10 p-5 flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <span className="text-lg font-black dark:text-white">+{creditedTokens.toLocaleString()}</span>
                      <span className="text-sm text-slate-500">{u('pricing.tokensLeft', 'LenaAI messages left')}</span>
                    </div>
                    <button
                      onClick={onClose}
                      className="w-full h-14 rounded-xl bg-primary text-white font-black uppercase tracking-wide transition-colors hover:bg-primary-dark cursor-pointer"
                    >
                      {u('payments.backToPricing', 'Back to Plans & Pricing')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 min-h-full">
                  <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-[#03142f] text-white p-10 xl:p-14">
                    <PaymentPanelArt className="absolute inset-0 h-full w-full" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-sky-700/75 to-indigo-900/90" />

                    <div className="relative z-10">
                      <BrandWordmark className="text-lg text-white" />
                      <div className="mt-10 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15 shadow-2xl backdrop-blur-sm">
                        {packageId ? <Sparkles className="h-8 w-8" /> : <Zap className="h-8 w-8" />}
                      </div>
                      <h1 className="mt-6 text-4xl font-black tracking-tight">{title}</h1>
                      {packageId && pkg ? (
                        <p className="mt-3 max-w-sm text-white/80">{planTagline(u, pkg)}</p>
                      ) : (
                        <p className="mt-3 max-w-sm text-white/80">{u('payments.quickTopupDesc', 'Enter any amount you want to add to your balance.')}</p>
                      )}
                      {packageId && pkg && (
                        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
                          <Sparkles className="h-4 w-4" />
                          {pkg.lena_ai_tokens.toLocaleString()} {u('pricing.lenaTokens', 'LenaAI messages / mo')}
                        </div>
                      )}
                    </div>

                    <div className="relative z-10 space-y-4">
                      {packageId && pkg ? (
                        pkg.features.slice(0, 5).map((feature) => {
                          const FeatureIcon = FEATURE_ICONS[feature.icon || ''] || CheckCircle2;
                          return (
                            <div key={feature.key} className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15">
                                <FeatureIcon className="h-4 w-4" />
                              </div>
                              <p className="text-sm text-white/90">{u(`pricing.feature.${feature.key}.title`, feature.title)}</p>
                            </div>
                          );
                        })
                      ) : (
                        tips.map((tip) => (
                          <div key={tip} className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15">
                              <Sparkles className="h-4 w-4" />
                            </div>
                            <p className="text-sm text-white/90">{tip}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-center p-6 sm:p-10 xl:p-14">
                    <div className="w-full max-w-md space-y-6">
                      <div>
                        <p className="text-sm font-semibold text-slate-500">{u('payments.title', 'Checkout')} · Freightbook</p>
                        <h2 className="mt-2 text-4xl font-semibold tracking-tight dark:text-white">{priceLabel}</h2>
                      </div>

                      {packageId && (loadingPkg || pkgError) ? (
                        <p className="text-sm text-slate-500">{pkgError || u('common.loading', 'Loading…')}</p>
                      ) : (
                        <>
                          <div className="flex items-center gap-4">
                            <div className="h-14 w-14 shrink-0 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                              {packageId ? <Sparkles className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold leading-snug dark:text-white truncate">{itemLabel}</p>
                              <p className="mt-1 text-sm text-slate-500">{itemCaption}</p>
                            </div>
                            <p className="font-semibold dark:text-white shrink-0">{priceLabel}</p>
                          </div>

                          {!packageId && (
                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {u('payments.amountLabel', 'Amount (KM)')}
                              </span>
                              <div className="flex overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min="1"
                                  step="1"
                                  value={amount}
                                  onChange={(e) => setAmount(e.target.value)}
                                  placeholder="20"
                                  className="min-w-0 flex-1 px-4 py-3 text-base outline-none bg-transparent dark:text-white"
                                />
                                <span className="flex items-center bg-slate-50 dark:bg-slate-900 px-4 text-sm font-bold text-slate-500">KM</span>
                              </div>
                              {estimatedTokens > 0 && (
                                <p className="mt-2 text-xs text-slate-500">
                                  ≈ {estimatedTokens.toLocaleString()} {u('pricing.tokensLeft', 'LenaAI messages left')}
                                </p>
                              )}
                            </label>
                          )}

                          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            <CreditCard className="h-4 w-4" />
                            {u('payments.paymentMethodCard', 'Pay with card')}
                          </div>

                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{u('payments.nameOnCard', 'Name on card')}</span>
                            <input
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              placeholder={u('payments.nameOnCardPlaceholder', 'Jane Doe')}
                              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                            />
                          </label>

                          <div>
                            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{u('payments.cardDetails', 'Card details')}</p>
                            <div className="overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                              <input
                                aria-label={u('payments.cardNumber', 'Card number')}
                                value={cardNumber}
                                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                placeholder="1234 1234 1234 1234"
                                inputMode="numeric"
                                className="w-full border-b border-slate-200 dark:border-slate-800 px-4 py-3 outline-none bg-transparent dark:text-white"
                              />
                              <div className="grid grid-cols-2">
                                <input
                                  aria-label={u('payments.expiry', 'Expiry date')}
                                  value={cardExpiry}
                                  onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                  placeholder="MM/YY"
                                  inputMode="numeric"
                                  className="border-r border-slate-200 dark:border-slate-800 px-4 py-3 outline-none bg-transparent dark:text-white"
                                />
                                <input
                                  aria-label={u('payments.cvc', 'CVC')}
                                  value={cardCvc}
                                  onChange={(e) => setCardCvc(formatCvc(e.target.value))}
                                  placeholder="CVC"
                                  inputMode="numeric"
                                  className="px-4 py-3 outline-none bg-transparent dark:text-white"
                                />
                              </div>
                            </div>
                          </div>

                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{u('payments.email', 'Email')}</span>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                            />
                          </label>

                          <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-5 text-base font-bold dark:text-white">
                            <span>{u('payments.total', 'Total due')}</span>
                            <span>{priceLabel}</span>
                          </div>

                          {submitError && <p className="text-sm text-rose-600 dark:text-rose-400">{submitError}</p>}

                          <button
                            onClick={() => void checkout()}
                            disabled={!canCheckout || submitting}
                            className="flex h-14 w-full items-center justify-center rounded-xl bg-primary text-white font-black uppercase tracking-wide transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 cursor-pointer"
                          >
                            {submitting ? u('common.loading', 'Loading…') : `${u('payments.checkout', 'Checkout')} · ${priceLabel}`}
                          </button>

                          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {u('payments.secureNotice', 'Payments are encrypted and processed securely.')}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
