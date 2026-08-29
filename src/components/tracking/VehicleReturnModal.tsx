import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Camera, CarFront, Check, CheckCircle2,
  Fuel, Gauge, History, ImagePlus, LoaderCircle, MapPin, ShieldCheck, Sparkles,
  Trash2, TriangleAlert, X,
} from 'lucide-react';

import { ApiError, api, type VehicleReturnInspection, type VehicleReturnPhoto } from '../../services/api';
import type { Language } from '../../types';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';

const COPY = {
  en: {
    eyebrow: 'Vehicle handover', title: 'Car drop report', subtitle: 'Close the route with a verifiable vehicle condition record.',
    condition: 'Condition', photos: 'Parking photos', review: 'Review', history: 'Vehicle history', noHistory: 'No previous return records.',
    mileage: 'Current mileage', fuel: 'Fuel level', damage: 'Is there any new damage?', noDamage: 'No new damage', hasDamage: 'Damage found', damageNotes: 'Describe the damage', damagePlaceholder: 'Location, size and visible condition…',
    parking: 'Parking location', parkingPlaceholder: 'Yard, bay or street', photoTitle: 'Add current parking-lot photos', photoHelp: 'At least 3 new photos are required. Show front, rear and one side of the vehicle.',
    addPhotos: 'Add photos', minimum: 'Minimum 3 photos', previous: 'Previous', next: 'Continue', submit: 'Finish car drop', submitting: 'Saving report…',
    ready: 'Ready to close', readyText: 'The vehicle history will be updated and the load marked as finished.', km: 'km', recordedBy: 'Recorded by',
    error: 'The vehicle return could not be saved.', missingVehicle: 'No vehicle is assigned to this load.', close: 'Close car drop',
  },
  bs: {
    eyebrow: 'Primopredaja vozila', title: 'Car drop zapisnik', subtitle: 'Zatvorite rutu provjerljivim zapisom o stanju vozila.',
    condition: 'Stanje', photos: 'Fotografije parkinga', review: 'Pregled', history: 'Historija vozila', noHistory: 'Nema prethodnih zapisa povrata.',
    mileage: 'Trenutna kilometraža', fuel: 'Nivo goriva', damage: 'Postoji li novo oštećenje?', noDamage: 'Nema nove štete', hasDamage: 'Šteta pronađena', damageNotes: 'Opišite oštećenje', damagePlaceholder: 'Mjesto, veličina i vidljivo stanje…',
    parking: 'Lokacija parkinga', parkingPlaceholder: 'Dvorište, parking mjesto ili ulica', photoTitle: 'Dodajte trenutne fotografije na parkingu', photoHelp: 'Potrebne su najmanje 3 nove fotografije. Snimite prednju, zadnju i jednu bočnu stranu vozila.',
    addPhotos: 'Dodaj fotografije', minimum: 'Najmanje 3 fotografije', previous: 'Nazad', next: 'Nastavi', submit: 'Završi car drop', submitting: 'Čuvanje zapisnika…',
    ready: 'Spremno za završetak', readyText: 'Historija vozila će biti ažurirana, a teret označen kao završen.', km: 'km', recordedBy: 'Zabilježio/la',
    error: 'Povrat vozila nije moguće sačuvati.', missingVehicle: 'Ovom teretu nije dodijeljeno vozilo.', close: 'Zatvori car drop',
  },
  de: {
    eyebrow: 'Fahrzeugübergabe', title: 'Fahrzeugrückgabe', subtitle: 'Schließen Sie die Route mit einem nachvollziehbaren Zustandsbericht ab.',
    condition: 'Zustand', photos: 'Parkplatzfotos', review: 'Prüfung', history: 'Fahrzeughistorie', noHistory: 'Keine früheren Rückgaben vorhanden.',
    mileage: 'Aktueller Kilometerstand', fuel: 'Tankfüllstand', damage: 'Gibt es neue Schäden?', noDamage: 'Keine neuen Schäden', hasDamage: 'Schaden festgestellt', damageNotes: 'Schaden beschreiben', damagePlaceholder: 'Position, Größe und sichtbarer Zustand…',
    parking: 'Parkposition', parkingPlaceholder: 'Hof, Stellplatz oder Straße', photoTitle: 'Aktuelle Parkplatzfotos hinzufügen', photoHelp: 'Mindestens 3 neue Fotos sind erforderlich. Fotografieren Sie Front, Heck und eine Fahrzeugseite.',
    addPhotos: 'Fotos hinzufügen', minimum: 'Mindestens 3 Fotos', previous: 'Zurück', next: 'Weiter', submit: 'Rückgabe abschließen', submitting: 'Bericht wird gespeichert…',
    ready: 'Bereit zum Abschluss', readyText: 'Die Fahrzeughistorie wird aktualisiert und die Ladung abgeschlossen.', km: 'km', recordedBy: 'Erfasst von',
    error: 'Die Fahrzeugrückgabe konnte nicht gespeichert werden.', missingVehicle: 'Dieser Ladung ist kein Fahrzeug zugeordnet.', close: 'Fahrzeugrückgabe schließen',
  },
} as const;

const locale = (lang: Language): keyof typeof COPY => lang === 'bs' || lang === 'de' ? lang : 'en';

const ProtectedPhoto = ({ photo, className }: { photo: VehicleReturnPhoto; className?: string }) => {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    api.vehicleReturns.photo(photo.id).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo.id]);

  return url
    ? <img src={url} alt={photo.name} className={cn('h-full w-full object-cover', className)} />
    : <div className={cn('flex h-full w-full animate-pulse items-center justify-center bg-slate-200 text-slate-400 dark:bg-slate-800', className)}><Camera className="h-4 w-4" /></div>;
};

type VehicleReturnModalProps = {
  open: boolean;
  loadId: string;
  vehicleId?: number;
  vehicleName?: string;
  lang: Language;
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
};

export const VehicleReturnModal = ({ open, loadId, vehicleId, vehicleName, lang, onClose, onCompleted }: VehicleReturnModalProps) => {
  const text = COPY[locale(lang)];
  const inputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<Array<{ file: File; url: string }>>([]);
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState<VehicleReturnInspection[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [mileage, setMileage] = useState('');
  const [fuelLevel, setFuelLevel] = useState(50);
  const [hasDamage, setHasDamage] = useState(false);
  const [damageNotes, setDamageNotes] = useState('');
  const [parkingLocation, setParkingLocation] = useState('');
  const [photos, setPhotos] = useState<Array<{ file: File; url: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !submitting) onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = '';
    };
  }, [onClose, open, submitting]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError('');
    if (!vehicleId) return;
    setHistoryLoading(true);
    api.vehicleReturns.history(vehicleId)
      .then((response) => {
        setHistory(response.data);
        const latest = response.data[0];
        if (latest) setMileage(String(latest.mileage_km));
      })
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [open, vehicleId]);

  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), []);

  const lastMileage = history[0]?.mileage_km || 0;
  const conditionValid = Number.isInteger(Number(mileage)) && Number(mileage) >= lastMileage && (!hasDamage || damageNotes.trim().length > 0);
  const photosValid = photos.length >= 3;
  const steps = [text.condition, text.photos, text.review];
  const fuelColor = fuelLevel < 25 ? 'bg-rose-500' : fuelLevel < 55 ? 'bg-amber-500' : 'bg-emerald-500';

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const additions = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, Math.max(0, 10 - photos.length))
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos((current) => [...current, ...additions]);
    setError('');
  };

  const removePhoto = (index: number) => {
    setPhotos((current) => {
      URL.revokeObjectURL(current[index].url);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const submit = async () => {
    if (!vehicleId || !conditionValid || !photosValid || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await api.vehicleReturns.create(loadId, {
        mileageKm: Number(mileage), fuelLevelPercent: fuelLevel, hasDamage,
        damageNotes: damageNotes.trim(), parkingLocation: parkingLocation.trim(), photos: photos.map((photo) => photo.file),
      });
      await onCompleted();
    } catch (caught) {
      const validation = caught instanceof ApiError ? Object.values(caught.errors).flat()[0] : null;
      setError(validation || (caught instanceof Error ? caught.message : text.error));
    } finally {
      setSubmitting(false);
    }
  };

  const reviewRows = useMemo(() => [
    [text.mileage, `${Number(mileage || 0).toLocaleString()} ${text.km}`, Gauge],
    [text.fuel, `${fuelLevel}%`, Fuel],
    [text.damage, hasDamage ? text.hasDamage : text.noDamage, hasDamage ? TriangleAlert : ShieldCheck],
    [text.photos, String(photos.length), Camera],
  ] as const, [fuelLevel, hasDamage, mileage, photos.length, text]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[1800] bg-slate-950/70 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-950"
            initial={{ opacity: 0, y: 30, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.99 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} role="dialog" aria-modal="true" aria-label={text.title}
          >
            <header className="relative flex h-[76px] shrink-0 items-center gap-4 overflow-hidden border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-950 md:px-8">
              <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-400 via-primary to-violet-500" />
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-cyan-300 shadow-lg shadow-cyan-500/10 dark:bg-white dark:text-primary"><CarFront className="h-6 w-6" /></div>
              <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">{text.eyebrow}</p><h2 className="truncate text-xl font-black text-slate-950 dark:text-white">{text.title} <span className="text-slate-400">· {vehicleName || `#${vehicleId || '—'}`}</span></h2></div>
              <div className="hidden items-center gap-2 md:flex">{steps.map((label, index) => <div key={label} className={cn('flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition', index === step ? 'bg-primary text-white shadow-lg shadow-primary/20' : index < step ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-900')}><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">{index < step ? <Check className="h-3 w-3" /> : index + 1}</span>{label}</div>)}</div>
              <button type="button" disabled={submitting} onClick={onClose} aria-label={text.close} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:rotate-90 hover:border-primary hover:text-primary dark:border-slate-700"><X className="h-5 w-5" /></button>
            </header>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[340px_minmax(0,1fr)]">
              <aside className="hidden min-h-0 overflow-y-auto border-r border-slate-200 bg-slate-950 p-6 text-white lg:block">
                <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-400/20 via-primary/20 to-violet-500/20 p-5 ring-1 ring-white/10">
                  <Sparkles className="h-5 w-5 text-cyan-300" /><h3 className="mt-3 text-lg font-black">{text.history}</h3><p className="mt-1 text-xs leading-5 text-slate-300">{text.subtitle}</p>
                </div>
                <div className="space-y-3">
                  {historyLoading && [0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-white/5" />)}
                  {!historyLoading && history.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-sm text-slate-400"><History className="mx-auto mb-2 h-6 w-6" />{text.noHistory}</div>}
                  {history.map((record, index) => (
                    <motion.article key={record.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">{Number(record.mileage_km).toLocaleString()} {text.km}</p><p className="mt-1 text-[11px] text-slate-400">{new Date(record.inspected_at).toLocaleString()}</p></div><span className={cn('rounded-full px-2 py-1 text-[10px] font-black', record.has_damage ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300')}>{record.has_damage ? text.hasDamage : text.noDamage}</span></div>
                      <div className="mt-3 flex gap-1.5">{record.photos.slice(0, 4).map((photo) => <div key={photo.id} className="h-12 min-w-0 flex-1 overflow-hidden rounded-lg ring-1 ring-white/10"><ProtectedPhoto photo={photo} /></div>)}</div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400"><span>{record.parking_location || '—'}</span><span>{record.fuel_level_percent}%</span></div>
                    </motion.article>
                  ))}
                </div>
              </aside>

              <main className="min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-10">
                <div className="mx-auto max-w-4xl">
                  <div className="mb-6 flex items-center gap-2 md:hidden">{steps.map((label, index) => <div key={label} className={cn('h-1.5 flex-1 rounded-full', index <= step ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800')} />)}</div>
                  {!vehicleId ? <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/30"><AlertTriangle className="mx-auto h-10 w-10 text-amber-500" /><p className="mt-4 font-black text-amber-900 dark:text-amber-200">{text.missingVehicle}</p></div> : (
                    <AnimatePresence mode="wait">
                      <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.22 }}>
                        {step === 0 && <div className="space-y-5">
                          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">01 · {text.condition}</p><h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{text.subtitle}</h3></div>
                          <div className="grid gap-5 md:grid-cols-2">
                            <label className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><span className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white"><Gauge className="h-4 w-4 text-primary" />{text.mileage}</span><div className="mt-4 flex items-end gap-2"><input type="number" min={lastMileage} value={mileage} onChange={(event) => setMileage(event.target.value)} className="min-w-0 flex-1 border-0 bg-transparent text-4xl font-black tracking-tight text-slate-950 outline-none dark:text-white" placeholder="0" /><span className="pb-1 font-bold text-slate-400">{text.km}</span></div>{lastMileage > 0 && <p className="mt-2 text-xs text-slate-400">≥ {Number(lastMileage).toLocaleString()} {text.km}</p>}</label>
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><span className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white"><Fuel className="h-4 w-4 text-primary" />{text.fuel}</span><div className="mt-4 flex items-center gap-4"><div className="relative h-6 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><motion.div className={cn('absolute inset-y-0 left-0 rounded-full', fuelColor)} animate={{ width: `${fuelLevel}%` }} /></div><strong className="w-12 text-right text-xl text-slate-900 dark:text-white">{fuelLevel}%</strong></div><input aria-label={text.fuel} type="range" min="0" max="100" step="5" value={fuelLevel} onChange={(event) => setFuelLevel(Number(event.target.value))} className="mt-4 w-full accent-primary" /></div>
                          </div>
                          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-sm font-black text-slate-800 dark:text-white">{text.damage}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setHasDamage(false)} className={cn('flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition', !hasDamage ? 'border-emerald-400 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400/20 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-slate-200 dark:border-slate-700')}><ShieldCheck className="h-6 w-6" /><span className="font-black">{text.noDamage}</span></button><button type="button" onClick={() => setHasDamage(true)} className={cn('flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition', hasDamage ? 'border-rose-400 bg-rose-50 text-rose-800 ring-2 ring-rose-400/20 dark:bg-rose-950/30 dark:text-rose-200' : 'border-slate-200 dark:border-slate-700')}><TriangleAlert className="h-6 w-6" /><span className="font-black">{text.hasDamage}</span></button></div>{hasDamage && <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 block"><span className="text-xs font-black uppercase tracking-wider text-rose-600">{text.damageNotes}</span><textarea value={damageNotes} onChange={(event) => setDamageNotes(event.target.value)} rows={4} placeholder={text.damagePlaceholder} className="mt-2 w-full resize-none rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-sm outline-none focus:border-rose-400 dark:border-rose-900 dark:bg-rose-950/20 dark:text-white" /></motion.label>}</div>
                          <label className="block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><span className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white"><MapPin className="h-4 w-4 text-primary" />{text.parking}</span><input value={parkingLocation} onChange={(event) => setParkingLocation(event.target.value)} placeholder={text.parkingPlaceholder} className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
                        </div>}

                        {step === 1 && <div className="space-y-6"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">02 · {text.photos}</p><h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{text.photoTitle}</h3><p className="mt-2 text-sm text-slate-500">{text.photoHelp}</p></div><button type="button" onClick={() => inputRef.current?.click()} onDrop={(event) => { event.preventDefault(); addPhotos(event.dataTransfer.files); }} onDragOver={(event) => event.preventDefault()} className="group flex min-h-56 w-full cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-primary/30 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-8 text-center transition hover:border-primary hover:shadow-xl hover:shadow-primary/10 dark:from-cyan-950/20 dark:via-slate-900 dark:to-violet-950/20"><span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-white shadow-xl shadow-primary/25 transition group-hover:-translate-y-1 group-hover:rotate-3"><ImagePlus className="h-8 w-8" /></span><strong className="mt-5 text-lg text-slate-900 dark:text-white">{text.addPhotos}</strong><span className="mt-1 text-sm text-slate-500">{text.minimum} · {photos.length}/10</span></button><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" multiple className="hidden" onChange={(event) => { addPhotos(event.target.files); event.target.value = ''; }} /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{photos.map((photo, index) => <motion.div layout key={`${photo.file.name}-${photo.file.lastModified}`} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-200 shadow-sm"><img src={photo.url} alt={photo.file.name} className="h-full w-full object-cover" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent px-3 pb-2 pt-8 text-left text-[10px] font-bold text-white"><p className="truncate">{photo.file.name}</p></div><button type="button" onClick={() => removePhoto(index)} className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-slate-950/70 text-white opacity-100 backdrop-blur transition hover:bg-rose-500 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></motion.div>)}</div></div>}

                        {step === 2 && <div className="space-y-6"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">03 · {text.review}</p><h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{text.ready}</h3><p className="mt-2 text-sm text-slate-500">{text.readyText}</p></div><div className="grid gap-3 sm:grid-cols-2">{reviewRows.map(([label, value, Icon]) => <div key={label} className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 font-black text-slate-900 dark:text-white">{value}</p></div></div>)}</div><div className="grid grid-cols-3 gap-3">{photos.slice(0, 3).map((photo) => <img key={photo.url} src={photo.url} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover shadow-md" />)}</div><div className="flex items-start gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" /><div><p className="font-black">{text.ready}</p><p className="mt-1 text-sm opacity-80">{text.readyText}</p></div></div></div>}
                      </motion.div>
                    </AnimatePresence>
                  )}
                  {error && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"><AlertTriangle className="h-5 w-5 shrink-0" />{error}</motion.div>}
                </div>
              </main>
            </div>

            <footer className="flex h-[76px] shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-950 md:px-8">
              <Button type="button" variant="outline" disabled={step === 0 || submitting} onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeft className="mr-2 h-4 w-4" />{text.previous}</Button>
              <div className="text-xs font-bold text-slate-400">{step + 1} / 3</div>
              {step < 2 ? <Button type="button" disabled={!vehicleId || (step === 0 ? !conditionValid : !photosValid)} onClick={() => setStep((current) => Math.min(2, current + 1))}>{text.next}<ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button type="button" disabled={submitting || !conditionValid || !photosValid} onClick={() => void submit()} className="bg-gradient-to-r from-primary to-violet-600 px-5 shadow-lg shadow-primary/20">{submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}{submitting ? text.submitting : text.submit}</Button>}
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
