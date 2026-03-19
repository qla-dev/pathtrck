import {
  ArrowRight,
  ChevronRight,
  Clock3,
  Copy,
  MapPin,
  Truck,
} from 'lucide-react';

import { Language } from '../../types';
import { ui } from '../../i18n';
import { Offer } from './FrightTypes';

type FrightItemProps = {
  key?: string;
  offer: Offer;
  lang: Language;
};

export const FrightItem = ({ offer, lang }: FrightItemProps) => (
  <article
    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5"
  >
    <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="inline-flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary text-[10px] font-black tracking-wider flex items-center justify-center">
              {offer.badge}
            </div>
            <p className="text-2xl font-black tracking-tight dark:text-white">{offer.carrier}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1">
              <Truck className="w-3.5 h-3.5" />
              {offer.freeDays}
              {ui(lang, 'd', 'd')}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1">
              <Clock3 className="w-3.5 h-3.5" />
              {offer.transitDays}
              {ui(lang, 'd', 'd')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="inline-flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-bold dark:text-white truncate">{offer.origin}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className="inline-flex items-center justify-end gap-2 min-w-0">
            <span className="font-bold dark:text-white truncate">{offer.destination}</span>
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">{offer.originPort}</p>
          <div className="relative h-2">
            <div className="absolute inset-0 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="absolute left-[4%] right-[3%] inset-y-0 rounded-full bg-primary" />
            <span className="absolute left-[4%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border border-slate-300 dark:border-slate-700" />
            <span className="absolute right-[3%] top-1/2 translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border border-slate-300 dark:border-slate-700" />
          </div>
        </div>
      </div>

      <div className="lg:w-52 shrink-0 flex flex-col items-end gap-2">
        <p className="text-3xl font-black tracking-tight dark:text-white">
          <span className="text-base font-bold text-slate-500 mr-1">USD</span>
          {offer.priceUsd}
        </p>
        <button className="w-full rounded-xl bg-primary hover:bg-primary-dark text-white font-bold py-2.5 transition-all">
          {ui(lang, 'Book now', 'Book now')}
        </button>
        <div className="inline-flex items-center gap-2">
          <button
            aria-label="Copy offer"
            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary transition-colors flex items-center justify-center"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            aria-label="Open offer"
            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary transition-colors flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </article>
);
