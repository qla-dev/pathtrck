import type { ComponentType } from 'react';
import {
  Rocket,
  Gem,
  Building2,
  Boxes,
  Package as PackageIcon,
  Map as MapIcon,
  Truck,
  Sparkles,
  MessageSquare,
  BarChart3,
  Globe,
  Banknote,
  Users,
  Smartphone,
  Navigation,
  Navigation2,
  Bell,
  IdCard,
  Check,
  ArrowRight,
} from 'lucide-react';
import { Language, SubscriptionFeature, SubscriptionPackage } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export type IconComponent = ComponentType<{ className?: string }>;

export const PACKAGE_ICONS: Record<string, IconComponent> = { Rocket, Gem, Building2 };

export const FEATURE_ICONS: Record<string, IconComponent> = {
  Boxes, Package: PackageIcon, Map: MapIcon, Truck, Sparkles, MessageSquare, BarChart3, Globe, Banknote, Users,
  Smartphone, Navigation, Navigation2, Bell, IdCard,
};

const ROLE_LABELS: Record<string, string> = {
  user: 'Customer', driver: 'Driver', company: 'Company', manager: 'Manager', dispatcher: 'Dispatcher', customs_officer: 'Customs Agent', finance: 'Finance', superadmin: 'Admin', master: 'Admin',
};

export const planName = (u: (key: string, fallback: string) => string, pkg: SubscriptionPackage) =>
  u(`pricing.plan.${pkg.slug}.name`, pkg.name);
export const planTagline = (u: (key: string, fallback: string) => string, pkg: SubscriptionPackage) =>
  u(`pricing.plan.${pkg.slug}.tagline`, pkg.tagline || '');

// Same card everywhere a plan is shown - the in-app Pricing screen and the public landing page
// pricing table both render this, so the two never drift apart.
export const PricingPlanCard = ({
  pkg,
  lang,
  isCurrent = false,
  isUnlimited = false,
  onSelect,
  onLearnMoreLenaAI,
  ctaLabel,
}: {
  pkg: SubscriptionPackage;
  lang: Language;
  isCurrent?: boolean;
  isUnlimited?: boolean;
  onSelect: () => void;
  onLearnMoreLenaAI: () => void;
  ctaLabel?: string;
}) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const PkgIcon = PACKAGE_ICONS[pkg.icon] || Rocket;

  const roleLabel = (role: string) => u(`pricing.role.${role}`, ROLE_LABELS[role] || role);
  const formatRoles = (roles: string[]): string => {
    if (!roles || roles.includes('*')) return u('pricing.allRoles', 'Available to all roles');
    // Superadmin/master have unlimited God Mode access regardless of plan - listing them here would
    // just be noise, since every plan is implicitly available to them.
    const visibleRoles = roles.filter((role) => role !== 'superadmin' && role !== 'master');
    if (visibleRoles.length === 0) return u('pricing.allRoles', 'Available to all roles');
    const labels = Array.from(new Set(visibleRoles.map(roleLabel)));
    return `${u('pricing.availableTo', 'Available to')}: ${labels.join(', ')}`;
  };
  const featureTitle = (feature: SubscriptionFeature) => u(`pricing.feature.${feature.key}.title`, feature.title);

  const resolvedCtaLabel = ctaLabel ?? (
    isUnlimited
      ? u('pricing.included', 'Included in God Mode')
      : isCurrent
        ? u('pricing.currentPlanButton', 'Current Plan')
        : u('pricing.choosePlan', 'Choose Plan')
  );

  return (
    <div className={cn('relative flex flex-col', pkg.is_popular && 'pt-3')}>
      {pkg.is_popular && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider shadow-lg whitespace-nowrap">
          {u('pricing.mostPopular', 'Most Popular')}
        </span>
      )}
      <Card
        className={cn('flex flex-col flex-1', pkg.is_popular && 'ring-2 ring-primary')}
        contentClassName="p-6 flex flex-col flex-1 gap-6"
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-3 rounded-2xl', pkg.color)}>
            <PkgIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-lg font-black dark:text-white">{planName(u, pkg)}</p>
            <p className="text-xs text-slate-500">{planTagline(u, pkg)}</p>
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black dark:text-white">{Number(pkg.price_monthly).toLocaleString()}</span>
            <span className="text-sm font-bold text-slate-500">{pkg.currency === 'BAM' ? 'KM' : pkg.currency} / {u('pricing.month', 'mo')}</span>
          </div>
        </div>

        <div className="flex-1">
          {pkg.features.filter((feature) => feature.key === 'lena_ai').map((feature) => {
            const FeatureIcon = FEATURE_ICONS[feature.icon || ''] || Check;
            return (
              <div key={feature.key} className="pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex gap-3 min-w-0">
                  <FeatureIcon className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold dark:text-white leading-tight">{featureTitle(feature)}</p>
                    <p className="text-[11px] text-slate-500 leading-tight">{pkg.lena_ai_tokens.toLocaleString()} {u('pricing.lenaTokens', 'LenaAI messages / mo')}</p>
                  </div>
                </div>
                <button
                  onClick={onLearnMoreLenaAI}
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer whitespace-nowrap"
                >
                  {u('pricing.learnMoreLenaAI', 'Learn more about LenaAI')}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <div className="space-y-3">
            {pkg.features.filter((feature) => feature.key !== 'lena_ai').map((feature) => {
              const FeatureIcon = FEATURE_ICONS[feature.icon || ''] || Check;
              return (
                <div key={feature.key} className="flex gap-3">
                  <FeatureIcon className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold dark:text-white leading-tight">{featureTitle(feature)}</p>
                    <p className="text-[11px] text-slate-500 leading-tight">{formatRoles(feature.roles)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Button
          variant={isCurrent ? 'secondary' : pkg.is_popular ? 'primary' : 'outline'}
          disabled={isCurrent || isUnlimited}
          onClick={onSelect}
          className="w-full justify-center"
        >
          {resolvedCtaLabel}
        </Button>
      </Card>
    </div>
  );
};
