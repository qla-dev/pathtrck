import { useEffect, useState } from 'react';
import {
  Sparkles,
  Crown,
  Zap,
  Clock,
  Calendar,
  Gauge,
  MessageSquare,
  ScanSearch,
  FileText,
  Layers,
  ArrowUpCircle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Language, Role } from '../../types';
import { ui, flatpickrI18n } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { InlineDataState } from '../ui/InlineDataState';
import { api } from '../../services/api';

type DailyUsage = { date: string; tokens: string | number; calls: number };
type ServiceUsage = { service: string; tokens: string | number; calls: number };
type UsageTotals = { tokens_30d: number; calls_30d: number; tokens_all_time: number; calls_all_time: number };
type UsagePayload = { daily: DailyUsage[]; by_service: ServiceUsage[]; totals: UsageTotals };

type SubscriptionPackagePayload = { id: number; slug: string; name: string; lena_ai_tokens: number };
type MySubscriptionPayload = {
  subscription_package_id: number;
  remaining_tokens: number;
  started_at?: string | null;
  expires_at?: string | null;
  subscription_package?: SubscriptionPackagePayload;
} | null;

const SERVICE_ICONS: Record<string, typeof MessageSquare> = {
  dispatch_chat: MessageSquare,
  guided_answer: MessageSquare,
  load_scan: ScanSearch,
  load_scan_text: FileText,
  bulk_scan: Layers,
  bulk_scan_text: Layers,
};

// guided_answer replies are free/deterministic and always log 0 real tokens - superadmin sees a
// fixed placeholder per message instead (never the real, always-0 figure) so this row doesn't read
// as broken, mirroring AiStatsView's LENA_ALPHA_DISPLAY_TOKENS convention. Only master sees the
// true 0.
const GUIDED_ANSWER_DISPLAY_TOKENS = 1280;

export const UsageView = ({
  lang,
  role,
  onTopUp,
  onUpgrade,
}: {
  lang: Language;
  role: Role;
  onTopUp: () => void;
  onUpgrade: () => void;
}) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const isMaster = role === 'master';

  const [subscription, setSubscription] = useState<MySubscriptionPayload>(null);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [subscriptionResponse, usageResponse] = await Promise.all([api.subscriptions.mine(), api.usage.mine()]);
      setIsUnlimited(Boolean(subscriptionResponse.meta?.unlimited));
      setSubscription((subscriptionResponse.data as MySubscriptionPayload) ?? null);
      setUsage(usageResponse.data as UsagePayload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load usage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const serviceLabel = (service: string) => u(`usage.service.${service}`, service);

  // bs-BA has poor ICU coverage in most JS runtimes (Intl.DateTimeFormat falls back to "M08 23"
  // instead of a real month name), so months/days are formatted from the app's own translated
  // flatpickr locale data instead of relying on Intl for bs/de/en alike.
  const monthShort = (date: Date) => flatpickrI18n(lang).months.shorthand[date.getMonth()];
  const monthLong = (date: Date) => flatpickrI18n(lang).months.longhand[date.getMonth()];

  const formatDay = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return lang === 'en' ? `${monthShort(parsed)} ${parsed.getDate()}` : `${parsed.getDate()}. ${monthShort(parsed)}`;
  };

  // Raw LLM token counts (ai_call_logs.total_tokens) are a technical detail - only superadmin/master
  // (the same isUnlimited flag /my-subscription already returns for God Mode roles) see them. Every
  // other role sees message/call counts only, which is also the unit plans are now sold in.
  const chartData = (usage?.daily || []).map((row) => ({ label: formatDay(row.date), messages: Number(row.calls) }));
  const maxServiceMessages = Math.max(1, ...((usage?.by_service || []).map((row) => Number(row.calls))));

  const plan = subscription?.subscription_package;
  const totalTokens = plan?.lena_ai_tokens || 0;
  const remainingTokens = subscription?.remaining_tokens ?? 0;
  // Floor, not round: 4,993/5,000 must read as 99%, never 100% - that figure is reserved for a
  // genuinely untouched balance, so a partial value can never round up into looking full.
  const percentRemaining = totalTokens > 0 ? Math.max(0, Math.min(100, Math.floor((remainingTokens / totalTokens) * 100))) : 0;
  const barTone = percentRemaining <= 15 ? 'bg-rose-500' : percentRemaining <= 40 ? 'bg-amber-500' : 'bg-emerald-500';

  const daysUntil = (value?: string | null) => {
    if (!value) return null;
    const diffMs = new Date(value).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };
  const renewsInDays = daysUntil(subscription?.expires_at);

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return lang === 'en'
      ? `${monthLong(parsed)} ${parsed.getDate()}, ${parsed.getFullYear()}`
      : `${parsed.getDate()}. ${monthLong(parsed)} ${parsed.getFullYear()}.`;
  };

  const tips = [
    u('usage.tip1', 'Chatting with the LenaAI dispatcher assistant'),
    u('usage.tip2', 'Scanning a document to auto-fill a load'),
    u('usage.tip3', 'Parsing a load from pasted text'),
    u('usage.tip4', 'Bulk-importing multiple loads at once'),
    u('usage.tip5', 'Looking up HS codes for your cargo'),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Gauge}
        title={u('usage.title', 'Usage')}
        subtitle={u('usage.subtitle', 'Track how your LenaAI messages are being used this month.')}
        actions={<>
          <Button variant="outline" size="sm" onClick={onTopUp}>
            <Zap className="w-4 h-4 mr-2" />{u('payments.quickTopup', 'Quick Top-up')}
          </Button>
          <Button variant="outline" size="sm" onClick={onUpgrade}>
            <ArrowUpCircle className="w-4 h-4 mr-2" />{u('usage.upgradePlan', 'Upgrade Plan')}
          </Button>
        </>}
      />

      {loading || error ? (
        <InlineDataState loading={loading} error={error} empty="" onRetry={load} />
      ) : (
        <>
          {isUnlimited ? (
            <Card contentClassName="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold dark:text-white">{u('pricing.godMode', 'God Mode - Unlimited Access')}</p>
                <p className="text-sm text-slate-500">{u('pricing.godModeSubtitle', 'Your role has unlimited access to every feature and LenaAI message, no plan required.')}</p>
              </div>
            </Card>
          ) : percentRemaining <= 15 && totalTokens > 0 ? (
            <Card contentClassName="p-5 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Gauge className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold dark:text-white">{u('usage.lowBanner', "You're running low on LenaAI messages")}</p>
                  <p className="text-sm text-slate-500">{u('usage.lowBannerSubtitle', 'Upgrade your plan for more messages, or wait for your monthly reset.')}</p>
                </div>
              </div>
              <Button size="sm" onClick={onUpgrade}>{u('usage.upgradePlan', 'Upgrade Plan')}</Button>
            </Card>
          ) : null}

          {!isUnlimited && (
            <div>
              <div className="grid md:grid-cols-3 gap-6">
                <Card contentClassName="p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{u('usage.tokensRemaining', 'Messages Remaining')}</p>
                  <p className="mt-2 text-2xl font-black dark:text-white">
                    {percentRemaining}% <span className="text-sm font-medium text-slate-500">{u('usage.remaining', 'remaining')}</span>
                  </p>
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={cn('h-full rounded-full', barTone)} style={{ width: `${percentRemaining}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {remainingTokens.toLocaleString()} / {totalTokens.toLocaleString()} · {u('usage.resets', 'Resets')} {formatDate(subscription?.expires_at)}
                  </p>
                </Card>
                <Card contentClassName="p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{u('usage.currentPlan', 'Current Plan')}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <p className="text-2xl font-black dark:text-white">{plan?.name || '—'}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{totalTokens.toLocaleString()} {u('pricing.lenaTokens', 'LenaAI messages / mo')}</p>
                </Card>
                <Card contentClassName="p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{u('usage.renewsIn', 'Renews In')}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <p className="text-2xl font-black dark:text-white">{renewsInDays ?? '—'} <span className="text-sm font-medium text-slate-500">{u('usage.days', 'days')}</span></p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{formatDate(subscription?.expires_at)}</p>
                </Card>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-black dark:text-white mb-4">{u('usage.allTime', 'All-Time Totals')}</h2>
            <div className={cn('grid gap-6', isUnlimited ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
              {isUnlimited && (
                <Card contentClassName="p-5 flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-primary"><Zap className="w-6 h-6" /></div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{u('usage.tokensUsed', 'Tokens Used')}</p>
                    <p className="text-2xl font-black dark:text-white">{(usage?.totals.tokens_all_time || 0).toLocaleString()}</p>
                  </div>
                </Card>
              )}
              <Card contentClassName="p-5 flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-primary"><Sparkles className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{u('usage.totalCalls', 'LenaAI Messages')}</p>
                  <p className="text-2xl font-black dark:text-white">{(usage?.totals.calls_all_time || 0).toLocaleString()}</p>
                </div>
              </Card>
              <Card contentClassName="p-5 flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-primary"><Clock className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{u('usage.memberSince', 'Plan Started')}</p>
                  <p className="text-2xl font-black dark:text-white">{formatDate(subscription?.started_at)}</p>
                </div>
              </Card>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card title={u('usage.byFeature', 'Usage by Feature')} contentClassName="p-6">
              <p className="text-xs text-slate-500 -mt-4 mb-4">{u('usage.byFeatureSubtitle', 'Which LenaAI features are using your messages.')}</p>
              {(usage?.by_service || []).length === 0 ? (
                <p className="text-sm text-slate-500">{u('usage.noActivity', 'No LenaAI activity in the last 30 days yet.')}</p>
              ) : (
                <div className="space-y-4">
                  {(usage?.by_service || []).map((row) => {
                    const Icon = SERVICE_ICONS[row.service] || Zap;
                    const calls = Number(row.calls);
                    const tokens = row.service === 'guided_answer' && !isMaster
                      ? calls * GUIDED_ANSWER_DISPLAY_TOKENS
                      : Number(row.tokens);
                    return (
                      <div key={row.service} className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold dark:text-white truncate">{serviceLabel(row.service)}</span>
                            <span className="text-slate-500 shrink-0 ml-2">
                              {isUnlimited && `${tokens.toLocaleString()} ${u('usage.tokens', 'tokens')} · `}
                              {calls.toLocaleString()} {u('usage.messages', 'messages')}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((calls / maxServiceMessages) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card title={u('usage.whatUsesTokens', 'What uses LenaAI messages?')} contentClassName="p-6">
              <div className="space-y-4">
                {tips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 pt-1.5">{tip}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card title={u('usage.overTime', 'Usage Over Time')} headerAction={<span className="text-xs text-slate-500">{u('usage.overTimeSubtitle', 'LenaAI messages sent per day, last 30 days.')}</span>}>
            {chartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">{u('usage.noActivity', 'No LenaAI activity in the last 30 days yet.')}</p>
            ) : (
              <div className="h-[260px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip cursor={false} />
                    <Bar dataKey="messages" fill="#00AEEF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
