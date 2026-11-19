import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Building2, Check, ClipboardCheck, Fuel, Gauge, Handshake, Info, Rotate3D, Route, Search, ShieldAlert, Truck, UserRound, Wrench } from 'lucide-react';
import type { Language } from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Notice } from '../ui/Notice';
import type { FleetRow } from './FleetOperationsPanel';
import { VehicleIllustration } from './VehicleIllustration';
import { fleetCopy, fleetField as field, statusKey } from './fleetCopy';
import { bodyRequirementLabel, registryLabel } from './vehicleRegistry';
import { filterHandoverVehicles, handoverCandidates } from './handoverSelection';
const Model = lazy(() => import('./VehicleModel3D'));

export function HandoverVehiclePicker({ company, context, vehicles, lang, onClose, onSelect }: {
  company: number; context: FleetRow; vehicles: FleetRow[]; lang: Language;
  onClose: () => void; onSelect: (vehicle: FleetRow) => void;
}) {
  const t = fleetCopy(lang), locale = ['bs', 'hr', 'sr'].includes(lang) ? 'hr-HR' : lang === 'de' ? 'de-DE' : 'en-GB';
  const [search, setSearch] = useState(''), [depot, setDepot] = useState(''), [type, setType] = useState(''), [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null), [result, setResult] = useState<{ id: number; data: FleetRow } | null>(null);
  const [error, setError] = useState(''), [loading, setLoading] = useState(false), [continuing, setContinuing] = useState(false), [retry, setRetry] = useState(0);
  const candidates = useMemo(() => handoverCandidates(vehicles), [vehicles]);
  const rows = useMemo(() => filterHandoverVehicles(vehicles, search, depot, type, status), [vehicles, search, depot, type, status]);
  const selected = rows.find(v => v.id === selectedId) || rows[0];
  const id = selected?.id;
  const detail = result?.id === id ? result.data : null;
  const v = detail?.vehicle || selected;
  const depots: FleetRow[] = context.depot_records || [], drivers: FleetRow[] = context.drivers || [];
  const types = [...new Set(candidates.map(v => v.features?.resource_type || v.vehicle_type || '').filter(Boolean))];
  const statuses = [...new Set(candidates.map(v => v.status).filter(Boolean))];
  const driver = (row: FleetRow) => row.assigned_driver?.name || drivers.find(d => d.id === row.assigned_driver_user_id)?.name || t('Bez dodijeljenog vozača');
  const depotName = (row: FleetRow) => depots.find(d => String(d.id) === String(row.depot_id))?.name || row.depot_name || t('Nerazvrstano');
  const number = (value: unknown, suffix = '') => value == null || value === '' ? t('Nije evidentirano') : `${Number(value).toLocaleString(locale)}${suffix}`;
  const date = (value?: string) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' }) : t('Nije evidentirano');
  useEffect(() => {
    setResult(null); setError('');
    if (!id) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true);
    const timer = setTimeout(() => {
      api.fleetOperations.get(company, `vehicle-details/${id}`, { signal: controller.signal }).then(r => {
        if (!controller.signal.aborted) setResult({ id, data: r.data });
      }).catch(e => { if (!controller.signal.aborted) setError(e.message); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 150);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [company, id, retry]);
  const proceed = async () => {
    if (!id || !detail || continuing) return;
    setContinuing(true); setError('');
    try {
      // Read again before continuing: status and authorization may have changed while the dialog was open.
      const response = await api.fleetOperations.get(company, `vehicle-details/${id}`);
      if (!response.data.abilities?.includes('handover')) throw new Error(t('Nema pristupa floti.'));
      if (!handoverCandidates([response.data.vehicle]).length) throw new Error(t('Vozilo više nije dostupno za primopredaju. Osvježite flotu.'));
      onSelect(response.data.vehicle);
    } catch (e) { setError((e as Error).message); }
    finally { setContinuing(false); }
  };
  return <Dialog size="xl" icon={Handshake} title={t('Izaberi vozilo')} subtitle={t('Odaberite vozilo i provjerite podatke prije primopredaje.')} closeLabel={t('Zatvori')} onClose={onClose} closeDisabled={continuing}
    footer={<><div className="mr-auto min-w-0 text-xs"><p className="font-bold text-slate-900 dark:text-white">{selected?.registration_number || t('Nije odabrano vozilo')}</p><p className="mt-0.5 text-slate-500">{t('Primopredaja ne završava turu.')}</p></div><Button variant="outline" disabled={continuing} onClick={onClose}>{t('Odustani')}</Button><Button disabled={!detail || loading || continuing} onClick={() => void proceed()}>{t('Nastavi na primopredaju')}<ArrowRight className="ml-2 h-4 w-4" /></Button></>}>
    <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500" aria-label={t('Koraci primopredaje')}><span aria-current="step" className="rounded-lg bg-primary/10 px-3 py-1.5 text-primary">1 · {t('Vozilo')}</span><ArrowRight className="h-3 w-3" /><span>2 · {t('Primopredaja vozila')}</span></div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <section className="min-w-0" aria-label={t('Vozila')}>
        <label className="relative block"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input disabled={continuing} type="search" aria-label={t('Tablice, VIN, model…')} placeholder={t('Tablice, VIN, model…')} className={`${field} pl-9`} value={search} onChange={e => setSearch(e.target.value)} /></label>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select disabled={continuing} aria-label={t('Trenutni depo')} className={field} value={depot} onChange={e => setDepot(e.target.value)}><option value="">{t('Svi dozvoljeni depoi')}</option><option value="unassigned">{t('Nerazvrstano')}</option>{depots.map(d => <option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}</select>
          <select disabled={continuing} aria-label={t('Vrsta sredstva')} className={field} value={type} onChange={e => setType(e.target.value)}><option value="">{t('Sve vrste vozila')}</option>{types.map(code => <option key={code} value={code}>{registryLabel(lang, code)}</option>)}</select>
          <select disabled={continuing} aria-label={t('Status')} className={field} value={status} onChange={e => setStatus(e.target.value)}><option value="">{t('Svi statusi')}</option>{statuses.map(code => <option key={code} value={code}>{t(statusKey[code] || code)}</option>)}</select>
        </div>
        <p className="my-3 text-xs text-slate-500" role="status">{t('Prikazano vozila')}: {rows.length} · {t('Ukupno u obuhvatu')}: {candidates.length}</p>
        <div className="space-y-2 lg:max-h-[530px] lg:overflow-y-auto lg:pr-1" role="group" aria-label={t('Izaberi vozilo')}>
          {rows.map(row => <button key={row.id} type="button" aria-pressed={id === row.id} disabled={continuing} onClick={() => setSelectedId(row.id)} className={`flex w-full items-center gap-2 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary ${id === row.id ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${id === row.id ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-slate-600'}`}>{id === row.id && <Check className="h-3 w-3" />}</span>
            <span className="hidden w-20 shrink-0 sm:block"><VehicleIllustration vehicle={row} label={t('Generički prikaz vozila')} /></span>
            <span className="min-w-0 flex-1"><strong className="block break-words text-sm">{row.registration_number}</strong><span className="mt-0.5 block text-[11px] text-slate-500">{registryLabel(lang, row.features?.resource_type || row.vehicle_type || '')}{row.features?.legal_category ? ` · ${row.features.legal_category}` : ''}</span><span className="mt-1 block truncate text-[11px] text-slate-500">{driver(row)} · {depotName(row)}</span><span className={`mt-1.5 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${row.dispatch_blocked || row.status === 'maintenance' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{t(row.dispatch_blocked ? 'Blokirano' : statusKey[row.status] || row.status)}</span></span>
          </button>)}
          {!rows.length && <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800"><Truck className="mx-auto mb-3 h-7 w-7 text-slate-400" /><p className="text-sm font-semibold">{t('Nema vozila za odabrane filtere.')}</p><p className="mt-2 text-xs text-slate-500">{t('Prikazuju se vozila u vašem dozvoljenom obuhvatu.')}</p>{(search || depot || type || status) && <Button className="mt-3" size="sm" variant="outline" onClick={() => { setSearch(''); setDepot(''); setType(''); setStatus(''); }}>{t('Očisti filtere')}</Button>}</div>}
        </div>
      </section>
      <section className="min-w-0 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0" aria-label={t('Komandni centar vozila')} aria-busy={loading}>
        {v ? <><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words text-lg font-black">{v.registration_number}</h3><p className="mt-1 text-xs text-slate-500">{registryLabel(lang, v.features?.resource_type || v.vehicle_type || '')}{v.features?.legal_category ? ` · ${v.features.legal_category}` : ''}{v.features?.body_type_code || v.features?.body_type ? ` · ${bodyRequirementLabel(lang, v.features.body_type_code || v.features.body_type)}` : ''}</p></div><span className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">{t('Pregled vozila')}</span></div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-sky-50/70 to-slate-50 dark:border-slate-800 dark:from-sky-950/20 dark:to-slate-900"><div className="h-[210px] sm:h-[240px]"><Suspense fallback={<VehicleIllustration vehicle={v} label={t('Generički prikaz vozila')} />}><Model vehicle={v} angle="perspective" label={`${t('3D pregled vozila')} · ${v.registration_number}`} /></Suspense></div><div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800"><span>{t('Generički prikaz')}</span><span className="flex items-center gap-1"><Rotate3D className="h-3 w-3" />{t('Povuci za rotaciju')}</span></div></div>
          {loading && <p role="status" className="text-xs text-slate-500">{t('Učitavanje…')}</p>}
          {error && <Notice tone="bad"><p>{error}</p><Button variant="outline" size="sm" className="mt-2" disabled={loading || continuing} onClick={() => setRetry(n => n + 1)}>{t('Osvježi')}</Button></Notice>}
          {detail && <><dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">{[
            [UserRound, 'Zaduženi vozač', driver(v)], [Building2, 'Trenutni depo', detail.depot?.name || depotName(v)],
            [Gauge, 'Kilometraža', number(v.last_mileage, ' km')], [Fuel, 'Gorivo pri primopredaji', number(detail.last_handover?.fuel_level_percent, '%')],
            [Wrench, 'Sljedeći servis', v.features?.next_service || t('Nije evidentirano')], [Route, 'Današnje ture', number(v.active_tours?.length)],
          ].map(([Icon, label, value]: any) => <div key={label} className="min-w-0 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800"><dt className="flex items-center gap-1 text-[10px] text-slate-500"><Icon className="h-3 w-3 shrink-0" />{t(label)}</dt><dd className="mt-1 break-words text-xs font-bold">{value}</dd></div>)}</dl>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><h4 className="mb-2 text-xs font-bold">{t('Prije primopredaje')}</h4><dl className="space-y-2 text-xs"><div className="flex items-center justify-between gap-2"><dt className="flex items-center gap-2"><ClipboardCheck className="h-3.5 w-3.5 text-slate-400" />{t('Kontrole koje čekaju pregled')}</dt><dd className={detail.pending_handovers ? 'font-bold text-amber-700 dark:text-amber-300' : 'font-semibold'}>{number(detail.pending_handovers)}</dd></div>
              {detail.abilities?.includes('damage') && detail.open_damages != null && <div className={`flex items-center justify-between gap-2 rounded-lg ${detail.open_damages ? 'bg-amber-50 p-2 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' : ''}`}><dt className="flex items-center gap-2"><ShieldAlert className="h-3.5 w-3.5" />{t('Otvoreni predmeti štete')}</dt><dd className="font-bold">{number(detail.open_damages)}</dd></div>}
              <div className="flex items-center justify-between gap-2"><dt>{t('Posljednja primopredaja')}</dt><dd className="text-right font-semibold">{date(detail.last_handover?.effective_at)}</dd></div></dl>
              <p className="mt-3 border-t border-slate-200 pt-2 text-[11px] text-slate-500 dark:border-slate-800">{t('Priložen dokument nije automatski odobren dokument.')}</p></div>
            {!!v.dispatch_blocked && <Notice tone="warn">{t('Vozilo je blokirano za vožnju.')}</Notice>}
            {!!v.registry_warnings?.length && <Notice tone="warn">{t('Podaci o klasifikaciji ili kapacitetu zahtijevaju provjeru.')}</Notice>}
            <p className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-[11px] text-slate-600 dark:text-slate-300"><Info className="h-4 w-4 shrink-0 text-primary" />{t('Stanje vozila, gorivo i fotografije potvrdite u sljedećem koraku. Primopredaja nije odobrenje za vožnju.')}</p>
          </>}
        </> : <p className="p-8 text-center text-sm text-slate-500">{t('Odaberite vozilo za pregled podataka.')}</p>}
      </section>
    </div>
  </Dialog>;
}
