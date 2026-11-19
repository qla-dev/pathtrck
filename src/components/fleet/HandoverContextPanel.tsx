import { Suspense } from 'react';
import { Building2, Fuel, Gauge, Info, Route, ShieldAlert, UserRound, Wrench } from 'lucide-react';
import type { Language } from '../../types';
import type { FleetRow } from './FleetOperationsPanel';
import { VehicleIllustration } from './VehicleIllustration';
import { fleetCopy, statusKey } from './fleetCopy';
import { bodyRequirementLabel, registryLabel } from './vehicleRegistry';
import Model from './VehiclePreview';

export function HandoverContextPanel({ vehicle, detail, lang, driverName, depotName, draft }: {
  vehicle: FleetRow | null; detail: FleetRow | null; lang: Language; driverName: string; depotName: string;
  draft: Array<[string, string]>;
}) {
  const t = fleetCopy(lang), v = detail?.vehicle || vehicle;
  const number = (n: unknown, suffix = '') => n == null ? t('Nije evidentirano') : `${Number(n).toLocaleString(['bs', 'hr', 'sr'].includes(lang) ? 'hr-HR' : lang === 'de' ? 'de-DE' : 'en-GB')}${suffix}`;
  return <div className="space-y-3">
    <div><p className="text-[10px] font-bold uppercase tracking-widest text-primary">{t('Komandni centar vozila')}</p><h3 className="mt-1 break-words text-lg font-black">{v?.registration_number || '—'}</h3>{v && <p className="mt-1 text-xs text-slate-500">{registryLabel(lang, v.features?.resource_type || v.vehicle_type || '')}{v.features?.legal_category ? ` · ${v.features.legal_category}` : ''}{v.features?.body_type_code || v.features?.body_type ? ` · ${bodyRequirementLabel(lang, v.features.body_type_code || v.features.body_type)}` : ''}</p>}</div>
    {v && <><div className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-sky-50/80 to-white dark:border-slate-800 dark:from-sky-950/30 dark:to-slate-900"><div className="h-[190px]"><Suspense fallback={<VehicleIllustration vehicle={v} label={t('Generički prikaz vozila')} />}><Model vehicle={v} label={t('3D pregled vozila')} angle="perspective" /></Suspense></div><p className="border-t border-slate-200 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800">{t('Generički prikaz')} · {t(statusKey[v.status] || v.status || '')}</p></div>
      <dl className="grid grid-cols-2 gap-2">{[[UserRound, 'Zaduženi vozač', driverName], [Building2, 'Trenutni depo', depotName], [Gauge, 'Kilometraža', number(detail?.vehicle?.last_mileage, ' km')], [Fuel, 'Gorivo pri primopredaji', number(detail?.last_handover?.fuel_level_percent, '%')], [Wrench, 'Sljedeći servis', v.features?.next_service || t('Nije evidentirano')], [Route, 'Današnje ture', number(detail?.vehicle?.active_tours?.length)]].map(([Icon, label, value]: any) => <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900"><dt className="flex items-center gap-1 text-[10px] text-slate-500"><Icon className="h-3 w-3 shrink-0" />{t(label)}</dt><dd className="mt-1 break-words text-xs font-bold">{value}</dd></div>)}</dl>
      {detail?.abilities?.includes('damage') && detail.open_damages > 0 && <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"><ShieldAlert className="h-4 w-4 shrink-0" />{t('Otvoreni predmeti štete')}: {detail.open_damages}</p>}
      {!!v.dispatch_blocked && <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{t('Vozilo je blokirano za vožnju.')}</p>}
    </>}
    <section className="rounded-xl border border-primary/20 bg-primary/5 p-3"><h4 className="mb-3 text-xs font-bold">{t('Sažetak ove primopredaje')}</h4><dl className="space-y-2 text-xs">{draft.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="max-w-[65%] break-words text-right font-semibold">{value}</dd></div>)}</dl></section>
    <p className="flex gap-2 text-[11px] text-slate-500"><Info className="h-4 w-4 shrink-0 text-primary" />{t('Primopredaja ne završava turu.')}</p>
  </div>;
}
