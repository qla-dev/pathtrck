import { useEffect, useState, type ComponentType } from 'react';
import {
  Award,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  MessageSquarePlus,
  ShieldCheck,
  Star,
  Truck,
  UserCircle2,
} from 'lucide-react';
import { Language, Role } from '../../types';
import { ui } from '../../i18n';
import { Button } from '../ui/Button';
import { ApiUser, api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';

type ProfileStat = {
  label: string;
  value: string;
  meta: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
};

type Achievement = {
  title: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
};

type Feedback = {
  by: string;
  route: string;
  text: string;
  score: string;
};

const getProfileContent = (lang: Language, role: Role) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  if (role === 'driver') {
    const stats: ProfileStat[] = [
      {
        label: u('legacy.profile.driver.stats.finished-routes.label', 'Finished Routes'),
        value: '428',
        meta: u('legacy.profile.driver.stats.finished-routes.meta', '+21 this month'),
        icon: Truck,
        tone: 'from-sky-500/15 to-sky-600/5 text-sky-500',
      },
      {
        label: u('legacy.profile.driver.stats.satisfaction.label', 'Satisfaction'),
        value: '4.9 / 5',
        meta: u('legacy.profile.driver.stats.satisfaction.meta', '312 verified reviews'),
        icon: Star,
        tone: 'from-emerald-500/15 to-emerald-600/5 text-emerald-500',
      },
      {
        label: u('legacy.profile.driver.stats.trust-level.label', 'Povjerljivost Lvl'),
        value: 'Level 5',
        meta: u('legacy.profile.driver.stats.trust-level.meta', 'Premium trusted driver'),
        icon: ShieldCheck,
        tone: 'from-violet-500/15 to-violet-600/5 text-violet-500',
      },
    ];

    const achievements: Achievement[] = [
      {
        title: u('legacy.profile.driver.achievements.zero-claim-streak.title', 'Zero claim streak'),
        desc: u('legacy.profile.driver.achievements.zero-claim-streak.desc', '120 days'),
        icon: BadgeCheck,
      },
      {
        title: u('legacy.profile.driver.achievements.on-time-champion.title', 'On-time champion'),
        desc: u('legacy.profile.driver.achievements.on-time-champion.desc', '97.8% on-time delivery'),
        icon: Clock3,
      },
      {
        title: u('legacy.profile.driver.achievements.top-rated-partner.title', 'Top rated partner'),
        desc: u('legacy.profile.driver.achievements.top-rated-partner.desc', '4.9 average score'),
        icon: Award,
      },
      {
        title: u('legacy.profile.driver.achievements.safe-route-master.title', 'Safe route master'),
        desc: u('legacy.profile.driver.achievements.safe-route-master.desc', '0 critical incidents'),
        icon: ShieldCheck,
      },
      {
        title: u('legacy.profile.driver.achievements.fuel-saver-elite.title', 'Fuel saver elite'),
        desc: u('legacy.profile.driver.achievements.fuel-saver-elite.desc', 'Top 10% efficiency'),
        icon: Truck,
      },
      {
        title: u('legacy.profile.driver.achievements.instant-responder.title', 'Instant responder'),
        desc: u('legacy.profile.driver.achievements.instant-responder.desc', 'Under 3 min avg reply'),
        icon: CheckCircle2,
      },
    ];

    const feedback: Feedback[] = [
      {
        by: u('legacy.profile.driver.feedback.blue-line-logistics.by', 'BlueLine Logistics'),
        route: 'Hamburg -> Sarajevo',
        text: u('legacy.profile.driver.feedback.blue-line-logistics.text', 'Very proactive communication and precise ETA updates.'),
        score: '5.0',
      },
      {
        by: u('legacy.profile.driver.feedback.nord-cargo.by', 'Nord Cargo'),
        route: 'Vienna -> Zagreb',
        text: u('legacy.profile.driver.feedback.nord-cargo.text', 'Route handled without delays and with full proof of delivery.'),
        score: '4.8',
      },
      {
        by: u('legacy.profile.driver.feedback.alpine-freight.by', 'Alpine Freight'),
        route: 'Munich -> Cologne',
        text: u('legacy.profile.driver.feedback.alpine-freight.text', 'Fast loading and perfect handoff notes for every checkpoint.'),
        score: '4.9',
      },
      {
        by: u('legacy.profile.driver.feedback.delta-supply.by', 'Delta Supply'),
        route: 'Berlin -> Vienna',
        text: u('legacy.profile.driver.feedback.delta-supply.text', 'Driver kept all SLAs and delivered with full transparency.'),
        score: '4.7',
      },
    ];

    return {
      title: u('legacy.profile.driver.title', 'Driver Profile'),
      subtitle: u('legacy.profile.driver.subtitle', 'Your trust, reviews, and route performance in one place.'),
      rolePill: u('legacy.profile.driver.role-pill', 'Verified Driver'),
      stats,
      achievements,
      feedback,
      metrics: [
        { label: u('legacy.profile.driver.metrics.acceptance-rate', 'Acceptance rate'), value: 96 },
        { label: u('legacy.profile.driver.metrics.eta-precision', 'ETA precision'), value: 93 },
        { label: u('legacy.profile.driver.metrics.customer-response', 'Customer response'), value: 89 },
        { label: u('legacy.profile.driver.metrics.route-safety', 'Route safety'), value: 98 },
      ],
      primaryAction: u('legacy.profile.driver.primary-action', 'Ask for Review'),
      secondaryAction: u('legacy.profile.driver.secondary-action', 'View All Reviews'),
    };
  }

  const stats: ProfileStat[] = [
    {
      label: u('legacy.profile.customer.stats.finished-loads.label', 'Finished Loads'),
      value: '186',
      meta: u('legacy.profile.customer.stats.finished-loads.meta', '+12 this month'),
      icon: CheckCircle2,
      tone: 'from-sky-500/15 to-sky-600/5 text-sky-500',
    },
    {
      label: u('legacy.profile.customer.stats.carrier-satisfaction.label', 'Carrier Satisfaction'),
      value: '4.8 / 5',
      meta: u('legacy.profile.customer.stats.carrier-satisfaction.meta', '247 driver reviews'),
      icon: Star,
      tone: 'from-emerald-500/15 to-emerald-600/5 text-emerald-500',
    },
    {
      label: u('legacy.profile.customer.stats.partner-trust.label', 'Partner Trust'),
      value: 'Level 4',
      meta: u('legacy.profile.customer.stats.partner-trust.meta', 'Top shipper tier'),
      icon: ShieldCheck,
      tone: 'from-violet-500/15 to-violet-600/5 text-violet-500',
    },
  ];

  const achievements: Achievement[] = [
    {
      title: u('legacy.profile.customer.achievements.fast-payout-profile.title', 'Fast payout profile'),
      desc: u('legacy.profile.customer.achievements.fast-payout-profile.desc', 'Average payment in 24h'),
      icon: BadgeCheck,
    },
    {
      title: u('legacy.profile.customer.achievements.priority-shipper.title', 'Priority shipper'),
      desc: u('legacy.profile.customer.achievements.priority-shipper.desc', 'Preferred by top drivers'),
      icon: Award,
    },
    {
      title: u('legacy.profile.customer.achievements.reliable-planner.title', 'Reliable planner'),
      desc: u('legacy.profile.customer.achievements.reliable-planner.desc', 'Low cancellation rate'),
      icon: Clock3,
    },
    {
      title: u('legacy.profile.customer.achievements.trusted-by-carriers.title', 'Trusted by carriers'),
      desc: u('legacy.profile.customer.achievements.trusted-by-carriers.desc', '98% repeat partners'),
      icon: ShieldCheck,
    },
    {
      title: u('legacy.profile.customer.achievements.accurate-documents.title', 'Accurate documents'),
      desc: u('legacy.profile.customer.achievements.accurate-documents.desc', '99.2% no corrections'),
      icon: CheckCircle2,
    },
    {
      title: u('legacy.profile.customer.achievements.rapid-coordination.title', 'Rapid coordination'),
      desc: u('legacy.profile.customer.achievements.rapid-coordination.desc', 'Avg assign time 7 min'),
      icon: Truck,
    },
  ];

  const feedback: Feedback[] = [
    {
      by: u('legacy.profile.customer.feedback.m-kovac.by', 'M. Kovac (Driver)'),
      route: 'Zagreb -> Berlin',
      text: u('legacy.profile.customer.feedback.m-kovac.text', 'Pickup process was clear and documents were ready on time.'),
      score: '5.0',
    },
    {
      by: u('legacy.profile.customer.feedback.transitpro-team.by', 'TransitPro Team'),
      route: 'Munich -> Amsterdam',
      text: u('legacy.profile.customer.feedback.transitpro-team.text', 'Communication was smooth and unloading instructions were precise.'),
      score: '4.7',
    },
    {
      by: u('legacy.profile.customer.feedback.l-schmidt.by', 'L. Schmidt (Driver)'),
      route: 'Vienna -> Prague',
      text: u('legacy.profile.customer.feedback.l-schmidt.text', 'Pickup slot was respected and docs were signed instantly.'),
      score: '4.9',
    },
    {
      by: u('legacy.profile.customer.feedback.cargojet-fleet.by', 'CargoJet Fleet'),
      route: 'Sarajevo -> Budapest',
      text: u('legacy.profile.customer.feedback.cargojet-fleet.text', 'Clear communication and zero waiting time at unload point.'),
      score: '4.8',
    },
  ];

  return {
    title: u('legacy.profile.customer.title', 'Customer Profile'),
    subtitle: u('legacy.profile.customer.subtitle', 'See your load success, carrier feedback, and trust reputation.'),
    rolePill: u('legacy.profile.customer.role-pill', 'Enterprise Customer'),
    stats,
    achievements,
    feedback,
    metrics: [
      { label: u('legacy.profile.customer.metrics.route-fill-rate', 'Route fill rate'), value: 95 },
      { label: u('legacy.profile.customer.metrics.driver-retention', 'Driver retention'), value: 91 },
      { label: u('legacy.profile.customer.metrics.review-response', 'Review response'), value: 87 },
      { label: u('legacy.profile.customer.metrics.issue-free-deliveries', 'Issue-free deliveries'), value: 94 },
    ],
    primaryAction: u('legacy.profile.customer.primary-action', 'Give Review'),
    secondaryAction: u('legacy.profile.customer.secondary-action', 'Manage Partners'),
  };
};

export const ProfileView = ({ role, lang }: { role: Role; lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const baseContent = getProfileContent(lang, role);
  const loads = useApiList(api.loads.list, { per_page: 100 });
  const routes = useApiList(api.routes.list, { per_page: 100 });
  const [user, setUser] = useState<ApiUser | null>(null);
  useEffect(() => { void api.auth.me().then(setUser); }, []);
  const userRecord = (user || {}) as ApiUser & { driver?: Record<string, unknown> };
  const profile = userRecord.driver || {};
  const ownLoads = loads.items.filter((row) => role === 'driver' ? Number(row.assigned_driver_user_id) === user?.id : Number(row.customer_user_id) === user?.id);
  const completed = ownLoads.filter((row) => String(row.status).toLowerCase() === 'finished').length;
  const active = ownLoads.filter((row) => ['sent', 'in_delivery'].includes(String(row.status).toLowerCase())).length;
  const completedRoutes = routes.items.filter((row) => String(row.status).toLowerCase() === 'completed' && (role !== 'driver' || Number(row.driver_user_id) === user?.id)).length;
  const rating = Number(profile.rating || 0);
  const content = {
    ...baseContent,
    stats: baseContent.stats.map((stat, index) => ({ ...stat, value: String([role === 'driver' ? Number(profile.completed_trips || completedRoutes) : completed, role === 'driver' ? `${rating.toFixed(2)} / 5` : active, ownLoads.length][index] ?? 0), meta: u('legacy.profile.liveDatabaseValue', 'Live account data') })),
    achievements: [] as Achievement[], feedback: [] as Feedback[],
    metrics: baseContent.metrics.map((metric, index) => ({ ...metric, value: [ownLoads.length ? Math.round((completed / ownLoads.length) * 100) : 0, active, completedRoutes, rating ? Math.round((rating / 5) * 100) : 0][index] ?? 0 })),
  };
  const showTopReviewActions = true;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-linear-to-br from-white to-sky-50 dark:from-slate-900 dark:to-slate-900/60 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-2">
              {u('legacy.profile.header.my-profile', 'My Profile')}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{content.title}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">{content.subtitle}</p>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{content.rolePill}</span>
        </div>

        <div
          className={
            showTopReviewActions
              ? 'mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4'
              : 'mt-6 grid gap-4 md:grid-cols-3'
          }
        >
          {content.stats.map((stat) => (
            <article
              key={stat.label}
              className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-5 shadow-sm"
            >
              <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{stat.label}</p>
                <div className={`h-9 w-9 rounded-xl bg-linear-to-br flex items-center justify-center ${stat.tone}`}>
                  <stat.icon className="w-4.5 h-4.5" />
                </div>
              </div>
              <p className="relative mt-3 text-4xl leading-none font-black text-slate-900 dark:text-white">{stat.value}</p>
              <p className="relative mt-2 inline-flex px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                {stat.meta}
              </p>
            </article>
          ))}
          {showTopReviewActions && (
            <article className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-lg shadow-slate-200/60 dark:shadow-[0_16px_50px_rgba(2,6,23,0.55)]">
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">
                {u('legacy.profile.review-actions.title', 'Review Actions')}
              </p>
              <div className="space-y-3">
                <Button className="w-full h-11 gap-2 text-base font-bold">
                  <MessageSquarePlus className="w-4 h-4" />
                  {content.primaryAction}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  {content.secondaryAction}
                </Button>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className={showTopReviewActions ? 'lg:col-span-8 space-y-6' : 'lg:col-span-9'}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {u('legacy.profile.performance-board.title', 'Performance Board')}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {content.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{metric.label}</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{metric.value}%</p>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${metric.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {showTopReviewActions && (
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-1.5">
                      {role === 'driver'
                        ? u('legacy.profile.snapshot.driver-stats', 'Driver Stats Snapshot')
                        : u('legacy.profile.snapshot.customer-stats', 'Customer Stats Snapshot')}
                    </p>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {u('legacy.profile.snapshot.weekly-performance-insights', 'Weekly Performance Insights')}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {u('legacy.profile.snapshot.live-kpi-summary', 'Live KPI summary from the last 7 days.')}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold">
                    {u('legacy.profile.snapshot.top-percentile', 'Top 8%')}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {role === 'driver'
                        ? u('legacy.profile.snapshot.completed', 'Completed')
                        : u('legacy.profile.snapshot.posted-loads', 'Posted Loads')}
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{role === 'driver' ? '34' : '51'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {role === 'driver'
                        ? u('legacy.profile.snapshot.on-time', 'On-time')
                        : u('legacy.profile.snapshot.fill-rate', 'Fill Rate')}
                    </p>
                    <p className="mt-1 text-xl font-black text-emerald-500">{role === 'driver' ? '97.8%' : '94.1%'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {u('legacy.profile.snapshot.avg-rating', 'Avg Rating')}
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{role === 'driver' ? '4.9' : '4.8'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {role === 'driver'
                        ? u('legacy.profile.snapshot.claims', 'Claims')
                        : u('legacy.profile.snapshot.disputes', 'Disputes')}
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{role === 'driver' ? '0' : '1'}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>
                        {role === 'driver'
                          ? u('legacy.profile.snapshot.fuel-efficiency', 'Fuel Efficiency')
                          : u('legacy.profile.snapshot.cost-efficiency', 'Cost Efficiency')}
                      </span>
                      <span>{role === 'driver' ? '91%' : '89%'}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className={`h-full rounded-full bg-primary ${role === 'driver' ? 'w-[91%]' : 'w-[89%]'}`} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>
                        {role === 'driver'
                          ? u('legacy.profile.snapshot.customer-feedback', 'Customer Feedback')
                          : u('legacy.profile.snapshot.carrier-feedback', 'Carrier Feedback')}
                      </span>
                      <span>{role === 'driver' ? '96%' : '94%'}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className={`h-full rounded-full bg-emerald-500 ${role === 'driver' ? 'w-[96%]' : 'w-[94%]'}`} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {showTopReviewActions ? (
            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 h-full flex flex-col">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">
                    {u('legacy.profile.achievements.title', 'Achievements')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {content.achievements.map((item) => (
                      <div key={item.title} className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 min-h-[112px] flex flex-col items-center justify-center text-center">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mb-1.5">
                          <item.icon className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-h-0">
                          <p className="font-bold text-slate-900 dark:text-white text-[13px] leading-tight">{item.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-3 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
                    <p className="text-xl font-black text-slate-900 dark:text-white">97%</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {u('legacy.profile.stats.reliability', 'Reliability')}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
                    <p className="text-xl font-black text-slate-900 dark:text-white">24h</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {u('legacy.profile.stats.avg-response', 'Avg response')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-lg shadow-slate-200/60 dark:shadow-[0_16px_50px_rgba(2,6,23,0.55)]">
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">
                  {u('legacy.profile.review-actions.title', 'Review Actions')}
                </p>
                <div className="space-y-3">
                  <Button className="w-full h-11 gap-2 text-base font-bold">
                    <MessageSquarePlus className="w-4 h-4" />
                    {content.primaryAction}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-11 border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    {content.secondaryAction}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {showTopReviewActions ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">
              {u('legacy.profile.recent-reviews.title', 'Recent Reviews')}
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {content.feedback.map((item) => (
                <article key={`${item.by}-${item.route}`} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{item.by}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.route}</p>
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-bold inline-flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {item.score}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <UserCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">John Doe</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{content.rolePill}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">
                    {u('legacy.profile.achievements.title', 'Achievements')}
                  </p>
                  <div className="space-y-3">
                    {content.achievements.map((item) => (
                      <div key={item.title} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <item.icon className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{item.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
                    <p className="text-xl font-black text-slate-900 dark:text-white">97%</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {u('legacy.profile.stats.reliability', 'Reliability')}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
                    <p className="text-xl font-black text-slate-900 dark:text-white">24h</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {u('legacy.profile.stats.avg-response', 'Avg response')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8">
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">
                  {u('legacy.profile.recent-reviews.title', 'Recent Reviews')}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {content.feedback.map((item) => (
                    <article key={`${item.by}-${item.route}`} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{item.by}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.route}</p>
                        </div>
                        <div className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-bold inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {item.score}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{item.text}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
