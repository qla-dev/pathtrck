import type { ComponentType } from 'react';
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
import { Button } from '../ui/Button';

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

const tr = (lang: Language, en: string, bs: string, de: string) => {
  if (lang === 'bs') return bs;
  if (lang === 'de') return de;
  return en;
};

const getProfileContent = (lang: Language, role: Role) => {
  if (role === 'driver') {
    const stats: ProfileStat[] = [
      {
        label: tr(lang, 'Finished Routes', 'Zavrsene rute', 'Abgeschlossene Routen'),
        value: '428',
        meta: tr(lang, '+21 this month', '+21 ovaj mjesec', '+21 diesen Monat'),
        icon: Truck,
        tone: 'from-sky-500/15 to-sky-600/5 text-sky-500',
      },
      {
        label: tr(lang, 'Satisfaction', 'Zadovoljstvo', 'Zufriedenheit'),
        value: '4.9 / 5',
        meta: tr(lang, '312 verified reviews', '312 potvrdenih recenzija', '312 verifizierte Bewertungen'),
        icon: Star,
        tone: 'from-emerald-500/15 to-emerald-600/5 text-emerald-500',
      },
      {
        label: tr(lang, 'Povjerljivost Lvl', 'Povjerljivost Lvl', 'Vertrauensebene'),
        value: 'Level 5',
        meta: tr(lang, 'Premium trusted driver', 'Premium pouzdan vozac', 'Premium vertrauenswuerdiger Fahrer'),
        icon: ShieldCheck,
        tone: 'from-violet-500/15 to-violet-600/5 text-violet-500',
      },
    ];

    const achievements: Achievement[] = [
      {
        title: tr(lang, 'Zero claim streak', 'Niz bez reklamacija', 'Serie ohne Reklamation'),
        desc: tr(lang, '120 days', '120 dana', '120 Tage'),
        icon: BadgeCheck,
      },
      {
        title: tr(lang, 'On-time champion', 'Sampion tacnosti', 'Puenktlichkeits-Champion'),
        desc: tr(lang, '97.8% on-time delivery', '97.8% dostava na vrijeme', '97.8% puenktliche Zustellungen'),
        icon: Clock3,
      },
      {
        title: tr(lang, 'Top rated partner', 'Najbolje ocijenjen partner', 'Top bewerteter Partner'),
        desc: tr(lang, '4.9 average score', 'Prosjek 4.9', 'Durchschnitt 4.9'),
        icon: Award,
      },
      {
        title: tr(lang, 'Safe route master', 'Majstor sigurnih ruta', 'Sicherheits-Routenmeister'),
        desc: tr(lang, '0 critical incidents', '0 kriticnih incidenata', '0 kritische Vorfaelle'),
        icon: ShieldCheck,
      },
      {
        title: tr(lang, 'Fuel saver elite', 'Elita ustede goriva', 'Kraftstoff-Sparelite'),
        desc: tr(lang, 'Top 10% efficiency', 'Top 10% efikasnosti', 'Top 10% Effizienz'),
        icon: Truck,
      },
      {
        title: tr(lang, 'Instant responder', 'Brzi odgovor', 'Sofort-Reagierer'),
        desc: tr(lang, 'Under 3 min avg reply', 'Ispod 3 min prosjek', 'Unter 3 Min Antwortzeit'),
        icon: CheckCircle2,
      },
    ];

    const feedback: Feedback[] = [
      {
        by: tr(lang, 'BlueLine Logistics', 'BlueLine Logistics', 'BlueLine Logistics'),
        route: 'Hamburg -> Sarajevo',
        text: tr(
          lang,
          'Very proactive communication and precise ETA updates.',
          'Odlicna komunikacija i precizni ETA update-i.',
          'Sehr proaktive Kommunikation und praezise ETA-Updates.'
        ),
        score: '5.0',
      },
      {
        by: tr(lang, 'Nord Cargo', 'Nord Cargo', 'Nord Cargo'),
        route: 'Vienna -> Zagreb',
        text: tr(
          lang,
          'Route handled without delays and with full proof of delivery.',
          'Ruta bez kasnjenja i sa kompletnim dokazom isporuke.',
          'Route ohne Verzoegerung und mit vollem Zustellnachweis.'
        ),
        score: '4.8',
      },
      {
        by: tr(lang, 'Alpine Freight', 'Alpine Freight', 'Alpine Freight'),
        route: 'Munich -> Cologne',
        text: tr(
          lang,
          'Fast loading and perfect handoff notes for every checkpoint.',
          'Brz utovar i savrsene biljeske za svaku kontrolnu tacku.',
          'Schnelle Beladung und perfekte Uebergabe-Notizen je Checkpoint.'
        ),
        score: '4.9',
      },
      {
        by: tr(lang, 'Delta Supply', 'Delta Supply', 'Delta Supply'),
        route: 'Berlin -> Vienna',
        text: tr(
          lang,
          'Driver kept all SLAs and delivered with full transparency.',
          'Vozac ispunio sve SLA i isporucio uz punu transparentnost.',
          'Fahrer hat alle SLAs eingehalten und mit voller Transparenz geliefert.'
        ),
        score: '4.7',
      },
    ];

    return {
      title: tr(lang, 'Driver Profile', 'Profil vozaca', 'Fahrerprofil'),
      subtitle: tr(
        lang,
        'Your trust, reviews, and route performance in one place.',
        'Vase povjerenje, recenzije i rezultat ruta na jednom mjestu.',
        'Vertrauen, Bewertungen und Routenleistung an einem Ort.'
      ),
      rolePill: tr(lang, 'Verified Driver', 'Verifikovani vozac', 'Verifizierter Fahrer'),
      stats,
      achievements,
      feedback,
      metrics: [
        { label: tr(lang, 'Acceptance rate', 'Stopa prihvatanja', 'Annahmequote'), value: 96 },
        { label: tr(lang, 'ETA precision', 'Preciznost ETA', 'ETA-Genauigkeit'), value: 93 },
        { label: tr(lang, 'Customer response', 'Odgovor kupcima', 'Kundenreaktion'), value: 89 },
        { label: tr(lang, 'Route safety', 'Sigurnost rute', 'Routensicherheit'), value: 98 },
      ],
      primaryAction: tr(lang, 'Ask for Review', 'Zatrazi recenziju', 'Bewertung anfordern'),
      secondaryAction: tr(lang, 'View All Reviews', 'Sve recenzije', 'Alle Bewertungen'),
    };
  }

  const stats: ProfileStat[] = [
    {
      label: tr(lang, 'Finished Loads', 'Zavrseni tereti', 'Abgeschlossene Ladungen'),
      value: '186',
      meta: tr(lang, '+12 this month', '+12 ovaj mjesec', '+12 diesen Monat'),
      icon: CheckCircle2,
      tone: 'from-sky-500/15 to-sky-600/5 text-sky-500',
    },
    {
      label: tr(lang, 'Carrier Satisfaction', 'Zadovoljstvo prevoznika', 'Fahrerzufriedenheit'),
      value: '4.8 / 5',
      meta: tr(lang, '247 driver reviews', '247 recenzija vozaca', '247 Fahrerbewertungen'),
      icon: Star,
      tone: 'from-emerald-500/15 to-emerald-600/5 text-emerald-500',
    },
    {
      label: tr(lang, 'Partner Trust', 'Povjerenje partnera', 'Partnervertrauen'),
      value: 'Level 4',
      meta: tr(lang, 'Top shipper tier', 'Top nivo klijenta', 'Top-Versenderstufe'),
      icon: ShieldCheck,
      tone: 'from-violet-500/15 to-violet-600/5 text-violet-500',
    },
  ];

  const achievements: Achievement[] = [
    {
      title: tr(lang, 'Fast payout profile', 'Profil brze isplate', 'Schnelle Auszahlungsprofil'),
      desc: tr(lang, 'Average payment in 24h', 'Prosjecna uplata za 24h', 'Durchschnittliche Zahlung in 24h'),
      icon: BadgeCheck,
    },
    {
      title: tr(lang, 'Priority shipper', 'Prioritetni posiljalac', 'Prioritaetsversender'),
      desc: tr(lang, 'Preferred by top drivers', 'Preferiraju vrhunski vozaci', 'Von Top-Fahrern bevorzugt'),
      icon: Award,
    },
    {
      title: tr(lang, 'Reliable planner', 'Pouzdan planer', 'Zuverlaessiger Planer'),
      desc: tr(lang, 'Low cancellation rate', 'Niska stopa otkazivanja', 'Niedrige Stornoquote'),
      icon: Clock3,
    },
    {
      title: tr(lang, 'Trusted by carriers', 'Povjerenje prevoznika', 'Von Fahrern vertraut'),
      desc: tr(lang, '98% repeat partners', '98% ponovnih partnera', '98% wiederkehrende Partner'),
      icon: ShieldCheck,
    },
    {
      title: tr(lang, 'Accurate documents', 'Tacna dokumentacija', 'Praezise Dokumente'),
      desc: tr(lang, '99.2% no corrections', '99.2% bez ispravki', '99.2% ohne Korrekturen'),
      icon: CheckCircle2,
    },
    {
      title: tr(lang, 'Rapid coordination', 'Brza koordinacija', 'Schnelle Koordination'),
      desc: tr(lang, 'Avg assign time 7 min', 'Prosjecno dodjela 7 min', 'Durchschnittliche Zuweisung 7 Min'),
      icon: Truck,
    },
  ];

  const feedback: Feedback[] = [
    {
      by: tr(lang, 'M. Kovac (Driver)', 'M. Kovac (Vozac)', 'M. Kovac (Fahrer)'),
      route: 'Zagreb -> Berlin',
      text: tr(
        lang,
        'Pickup process was clear and documents were ready on time.',
        'Preuzimanje jasno, dokumenti spremni na vrijeme.',
        'Abholung war klar, Dokumente waren rechtzeitig bereit.'
      ),
      score: '5.0',
    },
    {
      by: tr(lang, 'TransitPro Team', 'TransitPro tim', 'TransitPro Team'),
      route: 'Munich -> Amsterdam',
      text: tr(
        lang,
        'Communication was smooth and unloading instructions were precise.',
        'Komunikacija glatka i upute za istovar precizne.',
        'Kommunikation war reibungslos und Entladeanweisungen praezise.'
      ),
      score: '4.7',
    },
    {
      by: tr(lang, 'L. Schmidt (Driver)', 'L. Schmidt (Vozac)', 'L. Schmidt (Fahrer)'),
      route: 'Vienna -> Prague',
      text: tr(
        lang,
        'Pickup slot was respected and docs were signed instantly.',
        'Termin preuzimanja ispostovan, dokumenti potpisani odmah.',
        'Abholzeit wurde eingehalten und Dokumente sofort unterschrieben.'
      ),
      score: '4.9',
    },
    {
      by: tr(lang, 'CargoJet Fleet', 'CargoJet flota', 'CargoJet Flotte'),
      route: 'Sarajevo -> Budapest',
      text: tr(
        lang,
        'Clear communication and zero waiting time at unload point.',
        'Jasna komunikacija i nula cekanja na istovaru.',
        'Klare Kommunikation und keine Wartezeit am Entladepunkt.'
      ),
      score: '4.8',
    },
  ];

  return {
    title: tr(lang, 'Customer Profile', 'Profil korisnika', 'Kundenprofil'),
    subtitle: tr(
      lang,
      'See your load success, carrier feedback, and trust reputation.',
      'Pratite uspjeh tereta, feedback vozaca i reputaciju povjerenja.',
      'Sehen Sie Ladungserfolg, Fahrerfeedback und Vertrauensreputation.'
    ),
    rolePill: tr(lang, 'Enterprise Customer', 'Enterprise korisnik', 'Enterprise-Kunde'),
    stats,
    achievements,
    feedback,
    metrics: [
      { label: tr(lang, 'Route fill rate', 'Popunjenost ruta', 'Routenfuellrate'), value: 95 },
      { label: tr(lang, 'Driver retention', 'Zadrzavanje vozaca', 'Fahrerbindung'), value: 91 },
      { label: tr(lang, 'Review response', 'Odgovor na recenzije', 'Bewertungsantworten'), value: 87 },
      { label: tr(lang, 'Issue-free deliveries', 'Isporuke bez problema', 'Problemfreie Lieferungen'), value: 94 },
    ],
    primaryAction: tr(lang, 'Give Review', 'Ostavi recenziju', 'Bewertung abgeben'),
    secondaryAction: tr(lang, 'Manage Partners', 'Upravljaj partnerima', 'Partner verwalten'),
  };
};

export const ProfileView = ({ role, lang }: { role: Role; lang: Language }) => {
  const content = getProfileContent(lang, role);
  const showTopReviewActions = true;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-sky-50 dark:from-slate-900 dark:to-slate-900/60 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-2">
              {tr(lang, 'My Profile', 'Moj profil', 'Mein Profil')}
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
                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center ${stat.tone}`}>
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
            <article className="rounded-2xl border border-slate-800 bg-slate-950 dark:bg-slate-900 p-5 shadow-[0_16px_50px_rgba(2,6,23,0.55)]">
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">
                {tr(lang, 'Review Actions', 'Akcije recenzija', 'Bewertungsaktionen')}
              </p>
              <div className="space-y-3">
                <Button className="w-full h-11 gap-2 text-base font-bold">
                  <MessageSquarePlus className="w-4 h-4" />
                  {content.primaryAction}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 border-slate-700 text-slate-100 hover:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
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
                {tr(lang, 'Performance Board', 'Tabla performansi', 'Leistungsboard')}
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
                        ? tr(lang, 'Driver Stats Snapshot', 'Pregled statistike vozaca', 'Fahrer-Statistik-Snapshot')
                        : tr(lang, 'Customer Stats Snapshot', 'Pregled statistike korisnika', 'Kunden-Statistik-Snapshot')}
                    </p>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {tr(lang, 'Weekly Performance Insights', 'Sedmicni uvidi performansi', 'Woechentliche Performance-Einblicke')}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {tr(
                        lang,
                        'Live KPI summary from the last 7 days.',
                        'Uzivo KPI pregled iz zadnjih 7 dana.',
                        'Live-KPI-Uebersicht aus den letzten 7 Tagen.'
                      )}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold">
                    {tr(lang, 'Top 8%', 'Top 8%', 'Top 8%')}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {role === 'driver'
                        ? tr(lang, 'Completed', 'Zavrseno', 'Abgeschlossen')
                        : tr(lang, 'Posted Loads', 'Objavljeni tereti', 'Veroeffentlichte Ladungen')}
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{role === 'driver' ? '34' : '51'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {role === 'driver'
                        ? tr(lang, 'On-time', 'Na vrijeme', 'Puenktlich')
                        : tr(lang, 'Fill Rate', 'Popunjenost', 'Fuellrate')}
                    </p>
                    <p className="mt-1 text-xl font-black text-emerald-500">{role === 'driver' ? '97.8%' : '94.1%'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {tr(lang, 'Avg Rating', 'Prosjecna ocjena', 'Durchschnittsbewertung')}
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{role === 'driver' ? '4.9' : '4.8'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {role === 'driver'
                        ? tr(lang, 'Claims', 'Reklamacije', 'Reklamationen')
                        : tr(lang, 'Disputes', 'Sporovi', 'Streitfaelle')}
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{role === 'driver' ? '0' : '1'}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>
                        {role === 'driver'
                          ? tr(lang, 'Fuel Efficiency', 'Efikasnost goriva', 'Kraftstoffeffizienz')
                          : tr(lang, 'Cost Efficiency', 'Efikasnost troska', 'Kosteneffizienz')}
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
                          ? tr(lang, 'Customer Feedback', 'Povratna informacija', 'Kundenfeedback')
                          : tr(lang, 'Carrier Feedback', 'Feedback prevoznika', 'Fahrerfeedback')}
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
                    {tr(lang, 'Achievements', 'Postignuca', 'Erfolge')}
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
                      {tr(lang, 'Reliability', 'Pouzdanost', 'Zuverlaessigkeit')}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
                    <p className="text-xl font-black text-slate-900 dark:text-white">24h</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {tr(lang, 'Avg response', 'Prosj. odgovor', 'Durchschnittsantwort')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 dark:bg-slate-900 p-5 shadow-[0_16px_50px_rgba(2,6,23,0.55)]">
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">
                  {tr(lang, 'Review Actions', 'Akcije recenzija', 'Bewertungsaktionen')}
                </p>
                <div className="space-y-3">
                  <Button className="w-full h-11 gap-2 text-base font-bold">
                    <MessageSquarePlus className="w-4 h-4" />
                    {content.primaryAction}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-11 border-slate-700 text-slate-100 hover:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
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
              {tr(lang, 'Recent Reviews', 'Nedavne recenzije', 'Aktuelle Bewertungen')}
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
                    {tr(lang, 'Achievements', 'Postignuca', 'Erfolge')}
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
                      {tr(lang, 'Reliability', 'Pouzdanost', 'Zuverlaessigkeit')}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
                    <p className="text-xl font-black text-slate-900 dark:text-white">24h</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {tr(lang, 'Avg response', 'Prosj. odgovor', 'Durchschnittsantwort')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8">
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">
                  {tr(lang, 'Recent Reviews', 'Nedavne recenzije', 'Aktuelle Bewertungen')}
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
