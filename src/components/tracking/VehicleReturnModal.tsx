import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Camera, CarFront, Check, CheckCircle2,
  Fuel, Gauge, History, ImagePlus, LoaderCircle, LocateFixed, Map, MapPin,
  ShieldCheck, Trash2, TriangleAlert, X,
} from 'lucide-react';

import { ApiError, api, type VehicleReturnInspection, type VehicleReturnPhoto } from '../../services/api';
import type { Language } from '../../types';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { AddressAutocompleteField } from '../modals/PostLoadModal/AddressAutocompleteField';
import { AddressMapModal } from '../maps/AddressMapModal';
import { reverseLocation, type LocationSearchResult } from '../../services/locationSearch';

const COPY = {
  en: {
    eyebrow: 'Vehicle handover', title: 'Car drop report', subtitle: 'Close the route with a verifiable vehicle condition record.',
    condition: 'Condition', photos: 'Parking photos', review: 'Review', history: 'Vehicle history', noHistory: 'No previous return records.',
    mileage: 'Current mileage', fuel: 'Fuel level', damage: 'Is there any new damage?', noDamage: 'No new damage', hasDamage: 'Damage found', damageNotes: 'Describe the damage', damagePlaceholder: 'Location, size and visible condition…',
    parking: 'Parking location', parkingPlaceholder: 'Search the yard, street or address', myLocation: 'My location', locationFailed: 'Your current location could not be read.',
    photoTitle: 'Add current parking-lot photos', photoHelp: 'At least 3 new photos are required. Show front, rear and one side of the vehicle.',
    addPhotos: 'Add photos', minimum: 'Minimum 3 photos', previous: 'Previous', next: 'Continue', submit: 'Finish car drop', submitting: 'Saving report…',
    ready: 'Ready to close', readyText: 'The vehicle history will be updated and the load marked as finished.', km: 'km', recordedBy: 'Recorded by',
    error: 'The vehicle return could not be saved.', missingVehicle: 'No vehicle is assigned to this load.', close: 'Close car drop',
  },
  bs: {
    eyebrow: 'Primopredaja vozila', title: 'Car drop zapisnik', subtitle: 'Zatvorite rutu provjerljivim zapisom o stanju vozila.',
    condition: 'Stanje', photos: 'Fotografije parkinga', review: 'Pregled', history: 'Historija vozila', noHistory: 'Nema prethodnih zapisa povrata.',
    mileage: 'Trenutna kilometraža', fuel: 'Nivo goriva', damage: 'Postoji li novo oštećenje?', noDamage: 'Nema nove štete', hasDamage: 'Šteta pronađena', damageNotes: 'Opišite oštećenje', damagePlaceholder: 'Mjesto, veličina i vidljivo stanje…',
    parking: 'Lokacija parkinga', parkingPlaceholder: 'Pretraži dvorište, ulicu ili adresu', myLocation: 'Moja lokacija', locationFailed: 'Trenutnu lokaciju nije moguće očitati.',
    photoTitle: 'Dodajte trenutne fotografije na parkingu', photoHelp: 'Potrebne su najmanje 3 nove fotografije. Snimite prednju, zadnju i jednu bočnu stranu vozila.',
    addPhotos: 'Dodaj fotografije', minimum: 'Najmanje 3 fotografije', previous: 'Nazad', next: 'Nastavi', submit: 'Završi car drop', submitting: 'Čuvanje zapisnika…',
    ready: 'Spremno za završetak', readyText: 'Historija vozila će biti ažurirana, a teret označen kao završen.', km: 'km', recordedBy: 'Zabilježio/la',
    error: 'Povrat vozila nije moguće sačuvati.', missingVehicle: 'Ovom teretu nije dodijeljeno vozilo.', close: 'Zatvori car drop',
  },
  de: {
    eyebrow: 'Fahrzeugübergabe', title: 'Fahrzeugrückgabe', subtitle: 'Schließen Sie die Route mit einem nachvollziehbaren Zustandsbericht ab.',
    condition: 'Zustand', photos: 'Parkplatzfotos', review: 'Prüfung', history: 'Fahrzeughistorie', noHistory: 'Keine früheren Rückgaben vorhanden.',
    mileage: 'Aktueller Kilometerstand', fuel: 'Tankfüllstand', damage: 'Gibt es neue Schäden?', noDamage: 'Keine neuen Schäden', hasDamage: 'Schaden festgestellt', damageNotes: 'Schaden beschreiben', damagePlaceholder: 'Position, Größe und sichtbarer Zustand…',
    parking: 'Parkposition', parkingPlaceholder: 'Hof, Straße oder Adresse suchen', myLocation: 'Mein Standort', locationFailed: 'Ihr aktueller Standort konnte nicht ermittelt werden.',
    photoTitle: 'Aktuelle Parkplatzfotos hinzufügen', photoHelp: 'Mindestens 3 neue Fotos sind erforderlich. Fotografieren Sie Front, Heck und eine Fahrzeugseite.',
    addPhotos: 'Fotos hinzufügen', minimum: 'Mindestens 3 Fotos', previous: 'Zurück', next: 'Weiter', submit: 'Rückgabe abschließen', submitting: 'Bericht wird gespeichert…',
    ready: 'Bereit zum Abschluss', readyText: 'Die Fahrzeughistorie wird aktualisiert und die Ladung abgeschlossen.', km: 'km', recordedBy: 'Erfasst von',
    error: 'Die Fahrzeugrückgabe konnte nicht gespeichert werden.', missingVehicle: 'Dieser Ladung ist kein Fahrzeug zugeordnet.', close: 'Fahrzeugrückgabe schließen',
  },
} as const;

const locale = (lang: Language): keyof typeof COPY => lang === 'bs' || lang === 'de' ? lang : lang === 'hr' || lang === 'sr' ? 'bs' : 'en';

// The cards share the surrounding app's panel styling, so the report reads as part of the workspace.
const CARD = 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900';
const CARD_TITLE = 'flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400';

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
  const [parkingPoint, setParkingPoint] = useState<[number, number] | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [photos, setPhotos] = useState<Array<{ file: File; url: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    // The map picker opens on top of the report, so escape steps back out of it first.
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || submitting) return;
      if (mapOpen) setMapOpen(false);
      else onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = '';
    };
  }, [mapOpen, onClose, open, submitting]);

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

  const selectLocation = (location: LocationSearchResult) => {
    setParkingLocation(location.label.slice(0, 255));
    setParkingPoint([location.latitude, location.longitude]);
  };

  // Drivers park where they stand, so the fastest entry is the phone's own position.
  const useCurrentLocation = () => {
    if (locating || !navigator.geolocation) return setError(text.locationFailed);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setParkingPoint([coords.latitude, coords.longitude]);
        void reverseLocation(coords.latitude, coords.longitude)
          .then((result) => setParkingLocation(result.label.slice(0, 255)))
          .catch(() => setParkingLocation(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`))
          .finally(() => setLocating(false));
      },
      () => { setLocating(false); setError(text.locationFailed); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

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
        damageNotes: damageNotes.trim(), parkingLocation: parkingLocation.trim(),
        parkingLatitude: parkingPoint?.[0] ?? null, parkingLongitude: parkingPoint?.[1] ?? null,
        photos: photos.map((photo) => photo.file),
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
    [text.parking, parkingLocation.trim() || '—', MapPin],
  ] as const, [fuelLevel, hasDamage, mileage, parkingLocation, photos.length, text]);

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
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CarFront className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">{text.eyebrow}</p>
                <h2 className="truncate text-sm font-black text-slate-900 dark:text-white">{text.title} <span className="font-bold text-slate-400">· {vehicleName || `#${vehicleId || '—'}`}</span></h2>
              </div>
              <div className="hidden items-center gap-1.5 md:flex">
                {steps.map((label, index) => (
                  <div key={label} className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition', index === step ? 'bg-primary text-white' : index < step ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}>
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/25">{index < step ? <Check className="h-2.5 w-2.5" /> : index + 1}</span>{label}
                  </div>
                ))}
              </div>
              <button type="button" disabled={submitting} onClick={onClose} aria-label={text.close} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-primary hover:text-primary dark:border-slate-700"><X className="h-4 w-4" /></button>
            </header>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="hidden min-h-0 overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:block">
                <h3 className={CARD_TITLE}><History className="h-4 w-4 text-primary" />{text.history}</h3>
                <div className="mt-3 space-y-2">
                  {historyLoading && [0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
                  {!historyLoading && history.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700">{text.noHistory}</p>}
                  {history.map((record, index) => (
                    <motion.article key={record.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 dark:text-white">{Number(record.mileage_km).toLocaleString()} {text.km}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">{new Date(record.inspected_at).toLocaleString()}</p>
                        </div>
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black', record.has_damage ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300')}>{record.has_damage ? text.hasDamage : text.noDamage}</span>
                      </div>
                      <div className="mt-2 flex gap-1">{record.photos.slice(0, 4).map((photo) => <div key={photo.id} className="h-10 min-w-0 flex-1 overflow-hidden rounded-lg ring-1 ring-slate-200 dark:ring-slate-800"><ProtectedPhoto photo={photo} /></div>)}</div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400"><span className="truncate">{record.parking_location || '—'}</span><span className="shrink-0">{record.fuel_level_percent}%</span></div>
                    </motion.article>
                  ))}
                </div>
              </aside>

              <main className="min-h-0 overflow-y-auto p-4 sm:p-5 lg:p-6">
                <div className="mx-auto max-w-3xl">
                  <div className="mb-4 flex items-center gap-1.5 md:hidden">{steps.map((label, index) => <div key={label} className={cn('h-1 flex-1 rounded-full', index <= step ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800')} />)}</div>
                  {!vehicleId ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900 dark:bg-amber-950/30">
                      <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
                      <p className="mt-3 font-black text-amber-900 dark:text-amber-200">{text.missingVehicle}</p>
                    </div>
                  ) : (
                    <AnimatePresence mode="wait">
                      <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                        {step === 0 && (
                          <div className="space-y-3">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">01 · {text.condition}</p>
                              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">{text.subtitle}</h3>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className={CARD}>
                                <span className={CARD_TITLE}><Gauge className="h-4 w-4 text-primary" />{text.mileage}</span>
                                <div className="mt-2 flex items-end gap-2">
                                  <input type="number" min={lastMileage} value={mileage} onChange={(event) => setMileage(event.target.value)} className="min-w-0 flex-1 border-0 bg-transparent text-2xl font-black tracking-tight text-slate-950 outline-none dark:text-white" placeholder="0" />
                                  <span className="pb-0.5 text-sm font-bold text-slate-400">{text.km}</span>
                                </div>
                                {lastMileage > 0 && <p className="mt-1 text-[11px] text-slate-400">≥ {Number(lastMileage).toLocaleString()} {text.km}</p>}
                              </label>
                              <div className={CARD}>
                                <span className={CARD_TITLE}><Fuel className="h-4 w-4 text-primary" />{text.fuel}</span>
                                <div className="mt-2 flex items-center gap-3">
                                  <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><motion.div className={cn('absolute inset-y-0 left-0 rounded-full', fuelColor)} animate={{ width: `${fuelLevel}%` }} /></div>
                                  <strong className="w-10 text-right text-base text-slate-900 dark:text-white">{fuelLevel}%</strong>
                                </div>
                                <input aria-label={text.fuel} type="range" min="0" max="100" step="5" value={fuelLevel} onChange={(event) => setFuelLevel(Number(event.target.value))} className="mt-2 w-full accent-primary" />
                              </div>
                            </div>
                            <div className={CARD}>
                              <p className={CARD_TITLE}>{text.damage}</p>
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                <button type="button" onClick={() => setHasDamage(false)} className={cn('flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-left text-sm font-black transition', !hasDamage ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}><ShieldCheck className="h-5 w-5 shrink-0" />{text.noDamage}</button>
                                <button type="button" onClick={() => setHasDamage(true)} className={cn('flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-left text-sm font-black transition', hasDamage ? 'border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}><TriangleAlert className="h-5 w-5 shrink-0" />{text.hasDamage}</button>
                              </div>
                              {hasDamage && (
                                <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 block">
                                  <span className="text-[11px] font-black uppercase tracking-wide text-rose-600">{text.damageNotes}</span>
                                  <textarea value={damageNotes} onChange={(event) => setDamageNotes(event.target.value)} rows={3} placeholder={text.damagePlaceholder} className="mt-1.5 w-full resize-none rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-sm outline-none focus:border-rose-400 dark:border-rose-900 dark:bg-rose-950/20 dark:text-white" />
                                </motion.label>
                              )}
                            </div>
                            <div className={CARD}>
                              <div className="flex items-center justify-between gap-2">
                                <span className={CARD_TITLE}><MapPin className="h-4 w-4 text-primary" />{text.parking}</span>
                                <button type="button" onClick={useCurrentLocation} disabled={locating} className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-wait dark:border-slate-700 dark:text-slate-300">
                                  {locating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}{text.myLocation}
                                </button>
                              </div>
                              <div className="mt-2">
                                <AddressAutocompleteField
                                  value={parkingLocation}
                                  onChange={(value) => { setParkingLocation(value.slice(0, 255)); setParkingPoint(null); }}
                                  onSelectLocation={selectLocation}
                                  placeholder={text.parkingPlaceholder}
                                  onOpenMap={() => setMapOpen(true)}
                                  mapButtonLabel={text.parking}
                                  mapButtonIcon={Map}
                                  accentClassName="text-primary"
                                />
                              </div>
                              {parkingPoint && <p className="mt-1.5 text-[11px] font-semibold text-slate-400">{parkingPoint[0].toFixed(5)}, {parkingPoint[1].toFixed(5)}</p>}
                            </div>
                          </div>
                        )}

                        {step === 1 && (
                          <div className="space-y-3">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">02 · {text.photos}</p>
                              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">{text.photoTitle}</h3>
                              <p className="mt-1 text-xs text-slate-500">{text.photoHelp}</p>
                            </div>
                            <button type="button" onClick={() => inputRef.current?.click()} onDrop={(event) => { event.preventDefault(); addPhotos(event.dataTransfer.files); }} onDragOver={(event) => event.preventDefault()} className="group flex min-h-36 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-white p-5 text-center transition hover:border-primary dark:bg-slate-900">
                              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white transition group-hover:-translate-y-0.5"><ImagePlus className="h-5 w-5" /></span>
                              <strong className="mt-3 text-sm text-slate-900 dark:text-white">{text.addPhotos}</strong>
                              <span className="mt-0.5 text-xs text-slate-500">{text.minimum} · {photos.length}/10</span>
                            </button>
                            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" multiple className="hidden" onChange={(event) => { addPhotos(event.target.files); event.target.value = ''; }} />
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                              {photos.map((photo, index) => (
                                <motion.div layout key={`${photo.file.name}-${photo.file.lastModified}`} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-200">
                                  <img src={photo.url} alt={photo.file.name} className="h-full w-full object-cover" />
                                  <button type="button" onClick={() => removePhoto(index)} className="absolute right-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-slate-950/70 text-white backdrop-blur transition hover:bg-rose-500 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {step === 2 && (
                          <div className="space-y-3">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">03 · {text.review}</p>
                              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">{text.ready}</h3>
                              <p className="mt-1 text-xs text-slate-500">{text.readyText}</p>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {reviewRows.map(([label, value, Icon]) => (
                                <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                                    <p className="mt-0.5 truncate text-sm font-black text-slate-900 dark:text-white">{value}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-3 gap-2">{photos.slice(0, 3).map((photo) => <img key={photo.url} src={photo.url} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />)}</div>
                            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                              <div><p className="text-sm font-black">{text.ready}</p><p className="mt-0.5 text-xs opacity-80">{text.readyText}</p></div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  )}
                  {error && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</motion.div>}
                </div>
              </main>
            </div>

            <footer className="flex h-14 shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
              <Button type="button" variant="outline" disabled={step === 0 || submitting} onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeft className="mr-2 h-4 w-4" />{text.previous}</Button>
              <div className="text-xs font-bold text-slate-400">{step + 1} / 3</div>
              {step < 2
                ? <Button type="button" disabled={!vehicleId || (step === 0 ? !conditionValid : !photosValid)} onClick={() => setStep((current) => Math.min(2, current + 1))}>{text.next}<ArrowRight className="ml-2 h-4 w-4" /></Button>
                : <Button type="button" disabled={submitting || !conditionValid || !photosValid} onClick={() => void submit()}>{submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}{submitting ? text.submitting : text.submit}</Button>}
            </footer>

            <AddressMapModal
              open={mapOpen}
              lang={lang}
              title={text.parking}
              initialQuery={parkingLocation}
              initialPosition={parkingPoint}
              onClose={() => setMapOpen(false)}
              onSelect={(location) => { selectLocation(location); setMapOpen(false); }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
