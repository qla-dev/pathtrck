import { useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  MapPin,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';

import { cn } from '../../lib/cn';
import { Language, Load } from '../../types';
import { translateTriplet } from '../../i18n';
import { Button } from '../ui/Button';

type LoadDetailsProps = {
  open: boolean;
  load: Load | null;
  onClose: () => void;
  lang: Language;
};

const tr = translateTriplet;

const getGoodsNote = (lang: Language, goodsType: string) => {
  if (goodsType === 'Flammable') {
    return tr(
      lang,
      'UN-compliant packaging, no open heat sources, and ADR route preference required.',
      'UN-kompatibilno pakovanje, bez izvora toplote i ADR preferirana ruta.',
      'UN-konforme Verpackung, keine Hitzequellen und ADR-Route bevorzugt.'
    );
  }
  if (goodsType === 'Fragile') {
    return tr(
      lang,
      'Shock-safe loading, anti-vibration support, and double handling checkpoints.',
      'Zastita od udara, anti-vibraciona podrska i dupla kontrola rukovanja.',
      'Stosssichere Verladung, vibrationsarme Unterstuetzung und doppelte Handhabungskontrolle.'
    );
  }
  if (goodsType === 'High Value') {
    return tr(
      lang,
      'Sealed loading bay, signed chain of custody, and insured transfer protocol.',
      'Zapecacena utovarna zona, potpisani chain of custody i osigurani transfer protokol.',
      'Versiegelte Ladezone, unterschriebene Chain of Custody und versicherter Transferprozess.'
    );
  }
  return tr(
    lang,
    'Standard handling with route optimization and live checkpoint visibility.',
    'Standardno rukovanje uz optimizaciju rute i vidljivost checkpointa uzivo.',
    'Standardabwicklung mit Routenoptimierung und Live-Checkpoint-Sichtbarkeit.'
  );
};

const getStatusTone = (status: Load['status']) =>
  status === 'Available'
    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
    : status === 'Assigned'
      ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
      : status === 'In Transit'
        ? 'text-sky-500 bg-sky-500/10 border-sky-500/30'
        : 'text-slate-500 bg-slate-500/10 border-slate-500/30';

const getGoodsTone = (goodsType: string) =>
  goodsType === 'Flammable'
    ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
    : goodsType === 'Fragile'
      ? 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30'
      : goodsType === 'High Value'
        ? 'text-violet-500 bg-violet-500/10 border-violet-500/30'
        : 'text-slate-500 bg-slate-500/10 border-slate-500/30';

const getPaymentTone = (terms: Load['paymentTerms']) =>
  terms === 'In Advance'
    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
    : terms === 'On Delivery'
      ? 'text-sky-500 bg-sky-500/10 border-sky-500/30'
      : 'text-blue-500 bg-blue-500/10 border-blue-500/30';

export const LoadDetails = ({ open, load, onClose, lang }: LoadDetailsProps) => {
  useEffect(() => {
    if (!open) return undefined;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open || !load) return null;

  const goodsNote = getGoodsNote(lang, load.goodsType);

  return (
    <div className="fixed inset-0 z-[140]">
      <button
        type="button"
        aria-label="Close load details"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      <div className="absolute inset-0 p-3 md:p-6">
        <div className="h-full w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden flex flex-col">
          <div className="px-5 md:px-7 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-primary">
                {tr(lang, 'Load Details', 'Detalji tereta', 'Ladungsdetails')}
              </p>
              <h2 className="text-xl md:text-2xl font-black dark:text-white truncate">{load.title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:border-primary hover:text-primary transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 md:p-7">
            <div className="space-y-6">
              <div className="grid xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-5 space-y-4">
                  <p className="text-xs font-black uppercase tracking-wider text-primary">
                    {tr(lang, 'Posting Info', 'Podaci objave', 'Post-Informationen')}
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">{tr(lang, 'Posted by', 'Objavio', 'Erstellt von')}</p>
                        <p className="font-bold dark:text-white">{load.author}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">{tr(lang, 'Posted date', 'Datum objave', 'Erstelldatum')}</p>
                        <p className="font-bold dark:text-white">{load.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock3 className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">{tr(lang, 'Latest ETA', 'Posljednji ETA', 'Letzte ETA')}</p>
                        <p className="font-bold dark:text-white">{load.eta}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Truck className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">{tr(lang, 'Cargo category', 'Kategorija tereta', 'Ladungskategorie')}</p>
                        <p className="font-bold dark:text-white">{load.cargoType}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="text-xs font-black uppercase tracking-wider">
                      {tr(lang, 'Ready Actions', 'Spremne akcije', 'Sofortaktionen')}
                    </p>
                  </div>
                  <Button className="w-full">
                    {tr(lang, 'Request Assignment', 'Posalji zahtjev', 'Zuweisung anfragen')}
                  </Button>
                  <Button variant="outline" className="w-full">
                    {tr(lang, 'Negotiate Terms', 'Pregovaraj uslove', 'Bedingungen verhandeln')}
                  </Button>
                </div>
              </div>

              <div className="grid xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8 space-y-6">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className={cn('px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider', getStatusTone(load.status))}>
                        {load.status}
                      </span>
                      <span className={cn('px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider', getGoodsTone(load.goodsType))}>
                        {load.goodsType}
                      </span>
                      <span className={cn('px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider', getPaymentTone(load.paymentTerms))}>
                        {load.paymentTerms}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {tr(lang, 'Cargo Weight', 'Tezina tereta', 'Ladungsgewicht')}
                        </p>
                        <p className="mt-2 text-2xl font-black dark:text-white">{load.weight} kg</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {tr(lang, 'Price Offer', 'Ponuda cijene', 'Preisangebot')}
                        </p>
                        <p className="mt-2 text-2xl font-black text-primary">{load.price}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {tr(lang, 'ETA', 'ETA', 'ETA')}
                        </p>
                        <p className="mt-2 text-2xl font-black dark:text-white">{load.eta}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-primary mb-4">
                      {tr(lang, 'Route Plan', 'Plan rute', 'Routenplan')}
                    </p>
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase text-slate-500">{tr(lang, 'Pickup', 'Preuzimanje', 'Abholung')}</p>
                          <p className="font-bold dark:text-white truncate">{load.pickup}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 hidden md:block" />
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase text-slate-500">{tr(lang, 'Delivery', 'Dostava', 'Lieferung')}</p>
                          <p className="font-bold dark:text-white truncate">{load.delivery}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-primary mb-4">
                      {tr(lang, 'Handling & Compliance', 'Rukovanje i uskladjenost', 'Handhabung und Compliance')}
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-slate-700 dark:text-slate-300">{goodsNote}</p>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {tr(
                            lang,
                            'Live route alerts are enabled for risk, congestion, and checkpoint delay anomalies.',
                            'Ukljucena su upozorenja uzivo za rizik, guzvu i kasnjenja na checkpointima.',
                            'Live-Warnungen sind fuer Risiko, Stau und Checkpoint-Verzoegerungen aktiviert.'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-4 space-y-6">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                    <p className="text-xs font-black uppercase tracking-wider text-primary">
                      {tr(lang, 'Financial Terms', 'Finansijski uslovi', 'Finanzbedingungen')}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-xs text-slate-500">{tr(lang, 'Price', 'Cijena', 'Preis')}</p>
                        <p className="text-xl font-black text-primary mt-1">{load.price}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-xs text-slate-500">{tr(lang, 'Terms', 'Uslovi', 'Bedingungen')}</p>
                        <p className="text-sm font-bold dark:text-white mt-1">{load.paymentTerms}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-start gap-2">
                      <Coins className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {tr(
                          lang,
                          'Smart split payout available after automated POD confirmation.',
                          'Pametna podjela isplate dostupna nakon automatske POD potvrde.',
                          'Intelligente Auszahlungsaufteilung nach automatischer POD-Bestaetigung verfuegbar.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
