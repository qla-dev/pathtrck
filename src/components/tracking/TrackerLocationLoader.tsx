import { useEffect, useState } from 'react';
import { LoaderCircle, Plane, Ship, Train, Truck } from 'lucide-react';
import type { Language } from '../../types';

const COPY = {
  en: { air: 'Locating your aircraft', sea: 'Locating your ship', rail: 'Locating your train', road: 'Locating your vehicle', steps: ['Checking the connected transport…', 'Waiting for its latest position…', 'Still checking for a location signal…'] },
  bs: { air: 'Tražimo vaš avion', sea: 'Tražimo vaš brod', rail: 'Tražimo vaš voz', road: 'Tražimo vaše vozilo', steps: ['Provjeravamo povezani transport…', 'Čekamo najnoviju lokaciju…', 'Još tražimo signal lokacije…'] },
  de: { air: 'Flugzeug wird geortet', sea: 'Schiff wird geortet', rail: 'Zug wird geortet', road: 'Fahrzeug wird geortet', steps: ['Zugeordnetes Transportmittel wird geprüft…', 'Warten auf die neueste Position…', 'Positionssignal wird weiterhin gesucht…'] },
};

export const TrackerLocationLoader = ({ mode, lang }: { mode: string; lang: Language }) => {
  const [step, setStep] = useState(0);
  const kind = mode === 'air' || mode === 'sea' || mode === 'rail' ? mode : 'road';
  const Icon = { air: Plane, sea: Ship, rail: Train, road: Truck }[kind];
  const copy = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  useEffect(() => {
    const timer = window.setInterval(() => setStep((value) => Math.min(value + 1, 2)), 3500);
    return () => window.clearInterval(timer);
  }, []);
  return <div role="status" aria-live="polite" aria-atomic="true"
    className="absolute inset-0 z-[1200] flex items-center justify-center bg-slate-950/35 px-6 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-3xl border border-white/50 bg-white/95 px-8 py-9 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900/95">
      <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
        <span aria-hidden="true" className="absolute inset-0 rounded-full border border-primary/30 motion-safe:animate-ping" />
        <Icon aria-hidden="true" className="h-9 w-9 motion-safe:animate-pulse" />
      </div>
      <p className="text-lg font-black text-slate-900 dark:text-white">{copy[kind]}</p>
      <p className="mt-3 min-h-10 text-sm text-slate-500 dark:text-slate-300">{copy.steps[step]}</p>
      <LoaderCircle aria-hidden="true" className="mx-auto mt-4 h-5 w-5 text-primary motion-safe:animate-spin" />
    </div>
  </div>;
};
