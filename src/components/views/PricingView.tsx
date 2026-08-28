import { useEffect, useState } from 'react';
import { Sparkles, Crown, Zap } from 'lucide-react';
import { Language, SubscriptionPackage } from '../../types';
import { ui } from '../../i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { InlineDataState } from '../ui/InlineDataState';
import { api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { PricingPlanCard, planName } from '../pricing/PricingPlanCard';

type MySubscriptionPayload = { subscription_package_id: number; remaining_tokens: number; expires_at?: string | null } | null;

export const PricingView = ({
  lang,
  onOpenUsage,
  onLearnMoreLenaAI,
  onOpenCheckout,
  refreshSignal,
}: {
  lang: Language;
  onOpenUsage: () => void;
  onLearnMoreLenaAI: () => void;
  onOpenCheckout: (packageId?: number) => void;
  refreshSignal?: number;
}) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const packagesResult = useApiList(api.subscriptionPackages.list, { per_page: 20 });
  const packages = (packagesResult.items as unknown as SubscriptionPackage[]).slice().sort((a, b) => a.sort_order - b.sort_order);

  const [mySubscription, setMySubscription] = useState<MySubscriptionPayload>(null);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [loadingMine, setLoadingMine] = useState(true);

  const refreshMine = async () => {
    setLoadingMine(true);
    try {
      const response = await api.subscriptions.mine();
      setIsUnlimited(Boolean(response.meta?.unlimited));
      setMySubscription((response.data as MySubscriptionPayload) ?? null);
    } catch {
      setMySubscription(null);
    } finally {
      setLoadingMine(false);
    }
  };

  useEffect(() => { void refreshMine(); }, [refreshSignal]);

  const currentPackage = mySubscription ? packages.find((pkg) => pkg.id === mySubscription.subscription_package_id) : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Crown}
        title={u('pricing.title', 'Plans & Pricing')}
        subtitle={u('pricing.subtitle', 'Pick the plan that matches how much you move - every plan unlocks the full Freightbook feature set.')}
      />

      {isUnlimited && (
        <Card contentClassName="p-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold dark:text-white">{u('pricing.godMode', 'God Mode - Unlimited Access')}</p>
              <p className="text-sm text-slate-500">{u('pricing.godModeSubtitle', 'Your role has unlimited access to every feature and LenaAI message, no plan required.')}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onOpenUsage}>
            <Sparkles className="w-4 h-4 mr-2" />
            {u('pricing.seeUsage', 'See Usage')}
          </Button>
        </Card>
      )}

      {!isUnlimited && !loadingMine && mySubscription && (
        <Card contentClassName="p-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Zap className="w-4 h-4 text-primary" />
            <span>
              {u('pricing.currentPlan', 'Current plan')}:{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {currentPackage ? planName(u, currentPackage) : '—'}
              </span>
              {' · '}
              {mySubscription.remaining_tokens.toLocaleString()} {u('pricing.tokensLeft', 'LenaAI messages left')}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => onOpenCheckout()}>
              <Zap className="w-4 h-4 mr-2" />
              {u('payments.quickTopup', 'Quick Top-up')}
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenUsage}>
              <Sparkles className="w-4 h-4 mr-2" />
              {u('pricing.seeUsage', 'See Usage')}
            </Button>
          </div>
        </Card>
      )}

      {packagesResult.loading || packagesResult.error || packages.length === 0 ? (
        <InlineDataState
          loading={packagesResult.loading}
          error={packagesResult.error}
          empty={u('pricing.empty', 'No plans available yet.')}
          onRetry={packagesResult.refresh}
        />
      ) : (
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {packages.map((pkg) => (
            <PricingPlanCard
              key={pkg.id}
              pkg={pkg}
              lang={lang}
              isCurrent={!isUnlimited && mySubscription?.subscription_package_id === pkg.id}
              isUnlimited={isUnlimited}
              onSelect={() => onOpenCheckout(pkg.id)}
              onLearnMoreLenaAI={onLearnMoreLenaAI}
            />
          ))}
        </div>
      )}
    </div>
  );
};
