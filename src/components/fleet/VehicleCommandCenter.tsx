import { Building2, CheckCircle2, ClipboardCheck, Fuel, Gauge, MapPin, Route, ShieldAlert, UserRound, Wrench } from 'lucide-react';
import type { Language } from '../../types';
import { Button } from '../ui/Button';
import { Notice } from '../ui/Notice';
import type { FleetRow } from './FleetOperationsPanel';
import { fleetCopy, statusKey } from './fleetCopy';
import {formatVehicleServiceDate} from './vehicleFormOptions';

export function VehicleCommandCenter({ detail, lang, can, onHandover, onStatus, onDepot, onHistory, onDamages, onService }: {
  detail: FleetRow; lang: Language; can: (ability: string) => boolean;
  onHandover: () => void; onStatus: () => void; onDepot: () => void; onHistory: () => void; onDamages: () => void; onService: () => void;
}) {
  const t = fleetCopy(lang), v = detail.vehicle;
  const archived = ['sold', 'returned', 'stolen'].includes(v.status);
  const latest = detail.last_handover;
  const pending = detail.pending_handovers;
  const damages = detail.open_damages;
  const tours: FleetRow[] = v.active_tours || [];
  const mileage = v.last_mileage;
  const locale = ['bs', 'hr', 'sr'].includes(lang) ? 'hr-HR' : lang === 'de' ? 'de-DE' : 'en-GB';
  const date = (value: string) => new Date(value).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' });
  const ownership = ({ owned: 'Vlastito', rented: 'Rentano', leasing: 'Leasing', financed: 'Finansirano', other: 'Ostalo' } as FleetRow)[v.ownership_type];
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{t('Trenutni status')}</p><span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold ${v.dispatch_blocked ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' : archived ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'}`}>{v.dispatch_blocked ? <ShieldAlert className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{t(statusKey[v.status] || v.status)}</span></div>
      <button type="button" onClick={onHistory} className="rounded-xl bg-slate-50 p-3 text-left hover:bg-sky-50 dark:bg-slate-800/50 dark:hover:bg-slate-800"><p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{t('Kontrola primopredaje')}</p><span className={`text-xs font-bold ${pending ? 'text-rose-600 dark:text-rose-300' : 'text-slate-700 dark:text-slate-200'}`}>{pending == null ? '—' : pending > 0 ? `${pending} · ${t('Čeka pregled')}` : t('Nema otvorenih kontrola')}</span></button>
    </div>
    {!!v.dispatch_blocked && <Notice tone="bad">{t('Vozilo je blokirano za vožnju.')}</Notice>}
    {archived && <Notice tone="info">{t('Arhivirano vozilo')}</Notice>}
    <section className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-primary" /><p className="text-xs text-slate-500">{t('Zaduženi vozač')}</p></div><p className="mt-1 text-sm font-bold">{v.assigned_driver?.name || t('Bez dodijeljenog vozača')}</p><div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800"><p className="flex items-center gap-2 text-xs text-slate-500"><Route className="h-4 w-4 text-primary" />{t('Današnje ture')}</p>{tours.length ? <div className="mt-2 flex flex-wrap gap-2">{tours.map(tour => <span key={tour.id} className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{tour.partner} · {tour.tour_code}</span>)}</div> : <p className="mt-1 text-xs">{t('Nema aktivnih tura danas.')}</p>}</div></section>
    <dl className="grid grid-cols-2 gap-3 text-sm">{[
      [Building2, 'Matični depo', detail.home_depot?.name || '—'],
      [MapPin, 'Trenutni depo', detail.depot?.name || v.depot_name || '—'],
      [Gauge, 'Kilometraža', mileage != null ? `${Number(mileage).toLocaleString(locale)} km` : '—'],
      [Fuel, 'Gorivo pri primopredaji', latest?.fuel_level_percent != null ? `${latest.fuel_level_percent}%` : '—'],
    ].map(([Icon, label, value]: any) => <div key={label} className="min-w-0"><dt className="flex items-center gap-1.5 text-[11px] text-slate-500"><Icon className="h-3.5 w-3.5 shrink-0" />{t(label)}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>)}</dl>
    {latest && <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50"><ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="font-semibold">{t('Posljednja primopredaja')} · #{latest.id}</p><p className="mt-1 text-slate-500">{date(latest.effective_at)}</p><p className="mt-1">{t(latest.review_status === 'pending' ? 'Čeka pregled' : 'Završena')}</p></div></div>}
    {can('damage') && <button type="button" onClick={onDamages} className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-left text-xs dark:border-slate-800"><span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" />{t('Otvoreni predmeti štete')}</span><strong>{damages ?? '—'}</strong></button>}
    <button type="button" onClick={onService} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 p-3 text-left dark:border-slate-800"><Wrench className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0"><span className="block text-[11px] text-slate-500">{t('Sljedeći servis')}</span><span className="block break-words text-sm font-semibold">{v.features?.next_service ? formatVehicleServiceDate(v.features.next_service,locale) : t('Nije evidentirano')}</span></span></button>
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-200 pt-3 text-xs dark:border-slate-800"><p className="text-slate-500">VIN</p><p className="break-all font-medium">{v.vin || '—'}</p><p className="text-slate-500">{t('Vlasništvo')}</p><p className="font-medium">{ownership ? t(ownership) : '—'}</p><p className="text-slate-500">{t('Nosivost i zapremina')}</p><p className="font-medium">{v.capacity_kg != null ? `${Number(v.capacity_kg).toLocaleString(locale)} kg` : '—'} / {v.capacity_m3 != null ? `${Number(v.capacity_m3).toLocaleString(locale)} m³` : '—'}</p></div>
    <dl className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">{[['Homologacijska kategorija',v.features?.legal_category||'—'],['Najveća dopuštena masa',v.features?.gross_weight_kg!=null?`${(Number(v.features.gross_weight_kg)/1000).toLocaleString(locale)} t`:'—'],['Masa vozila iz dokumentacije',v.features?.unladen_weight_kg!=null?`${(Number(v.features.unladen_weight_kg)/1000).toLocaleString(locale)} t`:'—'],['Najveća dopuštena masa skupa',v.features?.gross_combination_weight_kg!=null?`${(Number(v.features.gross_combination_weight_kg)/1000).toLocaleString(locale)} t`:'—'],['Paletna mjesta',v.features?.pallet_positions??'—'],['Utovarna dužina',v.features?.cargo_length_m!=null?`${v.features.cargo_length_m} m`:'—'],['Utovarna širina',v.features?.cargo_width_m!=null?`${v.features.cargo_width_m} m`:'—'],['Utovarna visina',v.features?.cargo_height_m!=null?`${v.features.cargo_height_m} m`:'—']].map(([label,value])=><div key={label}><dt className="text-slate-500">{t(label)}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>
    {v.features?.mass_conditions&&<p className="whitespace-pre-wrap text-xs text-slate-500">{t('Uslovi mase iz dokumentacije')}: {v.features.mass_conditions}</p>}
    <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">{can('handover') && !archived && <Button onClick={onHandover}>{t('Primopredaja vozila')}</Button>}{can('status') && <Button variant="outline" onClick={onStatus}>{t('Promjena statusa')}</Button>}{can('depots') && <Button variant="outline" onClick={onDepot}>{t('Dodjela depoa')}</Button>}</div>
  </div>;
}
