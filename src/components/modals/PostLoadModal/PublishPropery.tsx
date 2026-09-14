import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Landmark, Loader2, Plus, Radar, Send, Warehouse, X } from 'lucide-react';
import type { Language } from '../../../types';
import { cn } from '../../../lib/cn';
import { Button } from '../../ui/Button';
import { Select } from './FormFields';
import type { OwnedWarehouse } from './WarehouseFormFields';

export type PublishDestination = 'exchange' | 'warehouse' | 'tracking';
export type PublishVehicle = { id: number; name: string };

const bs = {
  title: 'Odredište objave', hint: 'Odaberite gdje želite poslati ovaj teret.',
  exchange: 'Berza tereta', storageExchange: 'Berza skladištenja', available: 'Uvijek dostupno',
  warehouse: 'Privatno skladište', receipt: 'Zaprimi robu i kreiraj prijem u skladište.',
  tracking: 'Praćenje', trackingHint: 'Dodaj teret u praćenje i dodijeli vozilo.',
  noWarehouse: 'Prvo dodajte svoje skladište.', noFleet: 'Prvo dodajte vozilo u flotu.',
  createWarehouse: 'Kreiraj skladište', createVehicle: 'Dodaj vozilo',
  chooseWarehouse: 'Odaberite skladište', chooseVehicle: 'Odaberite vozilo',
  confirm: 'Potvrdi', close: 'Zatvori', loading: 'Učitavanje…',
  storageTracking: 'Za skladištenje odaberite berzu skladištenja ili prijem robe.',
  loadError: 'Nije moguće učitati skladišta ili flotu.', retry: 'Pokušaj ponovo',
  receiptRetry: 'Teret je kreiran, ali prijem nije dovršen. Potvrdite ponovo da dovršite prijem.',
};
const en: typeof bs = {
  title: 'Publication destination', hint: 'Choose where to send this load.',
  exchange: 'Freight exchange', storageExchange: 'Storage exchange', available: 'Always available',
  warehouse: 'Private warehouse', receipt: 'Receive goods and create a warehouse receipt.',
  tracking: 'Tracking', trackingHint: 'Add the load to tracking and assign a vehicle.',
  noWarehouse: 'Add your warehouse first.', noFleet: 'Add a vehicle to your fleet first.',
  createWarehouse: 'Create warehouse', createVehicle: 'Add vehicle',
  chooseWarehouse: 'Select warehouse', chooseVehicle: 'Select vehicle',
  confirm: 'Confirm', close: 'Close', loading: 'Loading…',
  storageTracking: 'For storage, choose the storage exchange or goods receipt.',
  loadError: 'Could not load warehouses or fleet.', retry: 'Try again',
  receiptRetry: 'The load was created, but its receipt is incomplete. Confirm again to finish the receipt.',
};
const de: typeof bs = {
  title: 'Veröffentlichungsziel', hint: 'Wählen Sie, wohin diese Ladung gesendet wird.',
  exchange: 'Frachtenbörse', storageExchange: 'Lagerbörse', available: 'Immer verfügbar',
  warehouse: 'Eigenes Lager', receipt: 'Waren annehmen und einen Lagereingang erstellen.',
  tracking: 'Sendungsverfolgung', trackingHint: 'Ladung zur Verfolgung hinzufügen und ein Fahrzeug zuweisen.',
  noWarehouse: 'Fügen Sie zuerst Ihr Lager hinzu.', noFleet: 'Fügen Sie zuerst ein Fahrzeug zum Fuhrpark hinzu.',
  createWarehouse: 'Lager erstellen', createVehicle: 'Fahrzeug hinzufügen',
  chooseWarehouse: 'Lager auswählen', chooseVehicle: 'Fahrzeug auswählen',
  confirm: 'Bestätigen', close: 'Schließen', loading: 'Wird geladen…',
  storageTracking: 'Wählen Sie für die Lagerung die Lagerbörse oder den Wareneingang.',
  loadError: 'Lager oder Fuhrpark konnten nicht geladen werden.', retry: 'Erneut versuchen',
  receiptRetry: 'Die Ladung wurde erstellt, der Wareneingang ist unvollständig. Bestätigen Sie erneut, um ihn abzuschließen.',
};
export const publishText = (lang: Language): typeof bs => ({ en, de, bs, hr: { ...bs, exchange: 'Burza tereta', storageExchange: 'Burza skladištenja', retry: 'Pokušaj ponovno' }, sr: { ...bs, title: 'Odredište objave', hint: 'Izaberite gde želite poslati ovaj teret.', receipt: 'Primi robu i kreiraj prijem u skladište.', chooseWarehouse: 'Izaberite skladište', chooseVehicle: 'Izaberite vozilo' } }[lang || 'en'] ?? en);

type Props = {
  open: boolean; lang: Language; storage: boolean; transportLabel: string;
  destination: PublishDestination; onDestination: (value: PublishDestination) => void;
  warehouses: OwnedWarehouse[]; warehouseId: string; onWarehouse: (warehouse: OwnedWarehouse) => void;
  vehicles: PublishVehicle[]; vehicleId: string; onVehicle: (id: string) => void;
  loading: boolean; resourceError: boolean; onRetry: () => void;
  onCreateWarehouse: () => void; onCreateVehicle: () => void;
  busy: boolean; locked?: boolean; error: string; onClose: () => void; onConfirm: () => void;
};

/** Same right-edge width and slide-in treatment as the pinned conversation sidebar. */
export const PublishPropery = (props: Props) => {
  const text = publishText(props.lang);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!props.open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => previous?.focus();
  }, [props.open]);
  const ready = props.destination === 'exchange' || (!props.loading && !props.resourceError && (
    props.destination === 'warehouse' ? props.warehouses.some(w => String(w.id) === props.warehouseId)
      : !props.storage && props.vehicles.some(v => String(v.id) === props.vehicleId)
  ));
  const option = (value: PublishDestination, title: string, hint: string, Icon: typeof Warehouse, disabled = false, action?: { label: string; onClick: () => void }) => (
    <div className="relative">
      <button type="button" role="radio" aria-checked={props.destination === value} disabled={disabled || props.busy || props.locked}
        onClick={() => props.onDestination(value)}
        className={cn('flex w-full items-center gap-3 rounded-2xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-50', action && 'pr-36', props.destination === value ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-slate-800')}>
        <Icon className="h-5 w-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-xs text-slate-500">{hint}</span></span>
        {props.destination === value && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
      </button>
      {action && <button type="button" disabled={props.busy || props.locked} onClick={action.onClick} className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-50"><Plus className="h-4 w-4" />{action.label}</button>}
    </div>
  );
  return createPortal(<AnimatePresence>{props.open && <>
    <motion.div className="fixed inset-0 z-[330] bg-slate-950/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (!props.busy) props.onClose(); }} />
    <motion.aside ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="publish-property-title"
      onKeyDown={event => {
        if (event.key === 'Escape' && !props.busy) { event.stopPropagation(); props.onClose(); }
        if (event.key === 'Tab') {
          const elements = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), input:not(:disabled), textarea:not(:disabled)');
          const first = elements?.[0]; const last = elements?.[elements.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}
      className="fixed inset-y-0 right-0 z-[340] flex h-[100dvh] w-full flex-col border-l border-slate-200 bg-white text-slate-800 shadow-2xl outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white lg:w-[440px] xl:w-[480px]"
      initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} transition={{ duration: 0.22 }}>
      <header className="flex items-start gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
        <Send className="mt-1 h-5 w-5 text-primary" /><div className="flex-1"><h2 id="publish-property-title" className="font-black">{text.title}</h2><p className="mt-1 text-xs text-slate-500">{props.transportLabel} · {text.hint}</p></div>
        <button type="button" aria-label={text.close} disabled={props.busy} onClick={props.onClose}><X className="h-5 w-5" /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <div role="radiogroup" aria-label={text.title} className="space-y-3">
          {option('exchange', props.storage ? text.storageExchange : text.exchange, text.available, Landmark)}
          {option('warehouse', text.warehouse, props.warehouses.length ? text.receipt : text.noWarehouse, Warehouse, props.loading || props.resourceError || !props.warehouses.length,
            !props.loading && !props.resourceError && !props.warehouses.length ? { label: text.createWarehouse, onClick: props.onCreateWarehouse } : undefined)}
          {props.destination === 'warehouse' && <Select aria-label={text.chooseWarehouse} value={props.warehouseId} disabled={props.busy || props.locked} onChange={event => { const warehouse = props.warehouses.find(w => String(w.id) === event.target.value); if (warehouse) props.onWarehouse(warehouse); }}><option value="">{text.chooseWarehouse}</option>{props.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>}
          {option('tracking', text.tracking, props.storage ? text.storageTracking : props.vehicles.length ? text.trackingHint : text.noFleet, Radar, props.storage || props.loading || props.resourceError || !props.vehicles.length,
            !props.storage && !props.loading && !props.resourceError && !props.vehicles.length ? { label: text.createVehicle, onClick: props.onCreateVehicle } : undefined)}
          {props.destination === 'tracking' && <Select aria-label={text.chooseVehicle} value={props.vehicleId} disabled={props.busy} onChange={event => props.onVehicle(event.target.value)}><option value="">{text.chooseVehicle}</option>{props.vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>}
        </div>
        {props.loading && <p role="status" className="text-xs text-slate-500">{text.loading}</p>}
        {props.resourceError && <div role="alert" className="text-sm text-rose-500">{text.loadError} <button type="button" onClick={props.onRetry} className="underline">{text.retry}</button></div>}
      </div>
      <footer className="space-y-3 border-t border-slate-200 px-5 py-3 dark:border-slate-800 md:px-7">
        {props.error && <p role="alert" className="text-sm text-rose-500">{props.error}</p>}
        <Button className="h-11 w-full gap-2" disabled={props.busy || !ready} onClick={props.onConfirm}>{props.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{text.confirm}</Button>
      </footer>
    </motion.aside>
  </>}</AnimatePresence>, document.body);
};
