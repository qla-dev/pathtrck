import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Camera, CarFront, Check, CheckCircle2,
  Fuel, Gauge, History, ImagePlus, LoaderCircle, LocateFixed, Map, MapPin,
  ShieldCheck, Trash2, TriangleAlert, X, UserRound, Building2, Wrench, RotateCcw,
} from 'lucide-react';

import { ApiError, api, type VehicleReturnInspection, type VehicleReturnPhoto } from '../../services/api';
import type { Language } from '../../types';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { AddressAutocompleteField } from '../modals/PostLoadModal/AddressAutocompleteField';
import { AddressMapModal } from '../maps/AddressMapModal';
import { reverseLocation, type LocationSearchResult } from '../../services/locationSearch';
import { fleetCopy, fleetField } from '../fleet/fleetCopy';
import { VehicleIllustration } from '../fleet/VehicleIllustration';
import { HandoverContextPanel } from '../fleet/HandoverContextPanel';
import { acceptableHandoverPhoto, handoverDestinationIssue, handoverDestinationLabel, validHandoverCondition } from '../fleet/handoverForm';

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
    (photo.fleet_company_id ? api.fleetOperations.file(photo.fleet_company_id,photo.id) : api.vehicleReturns.photo(photo.id)).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo.id,photo.fleet_company_id]);

  return url
    ? <img src={url} alt={photo.name} className={cn('h-full w-full object-cover', className)} />
    : <div className={cn('flex h-full w-full animate-pulse items-center justify-center bg-slate-200 text-slate-400 dark:bg-slate-800', className)}><Camera className="h-4 w-4" /></div>;
};

type VehicleReturnModalProps = {
  open: boolean;
  loadId?: string;
  companyId?: number;
  drivers?: Array<{id:number;name:string}>;
  depots?: Array<{id:number;name:string;code:string;active?:boolean}>;
  vehicleId?: number;
  vehicleName?: string;
  initialVehicle?: Record<string, any>;
  fleetContext?: Record<string, any>;
  lang: Language;
  onClose: () => void;
  onChangeVehicle?: () => void;
  onCompleted: () => void | Promise<void>;
};

export const VehicleReturnModal = ({ open, loadId, companyId, drivers = [], depots = [], vehicleId, vehicleName, initialVehicle, fleetContext, lang, onClose, onChangeVehicle, onCompleted }: VehicleReturnModalProps) => {
  const t = fleetCopy(lang);
  const text = companyId ? { ...COPY[locale(lang)], title:t('Primopredaja vozila'), subtitle:t('Evidentirajte trenutno stanje vozila.'), photos:t('Fotografije vozila'), photoTitle:t('Fotografišite vozilo pri primopredaji'), photoHelp:t('Najmanje tri nove fotografije: prednja, zadnja i bočna strana. Do 10 fotografija, po 12 MB.'), ready:t('Provjerite i sačuvajte zapisnik'), readyText:t('Zapisnik se šalje na kontrolu. Primopredaja ne završava turu.'), noHistory:t('Nema prethodnih primopredaja.'), submit:t('Sačuvaj primopredaju'),close:t('Zatvori') } : COPY[locale(lang)];
  const dialogId = useId(), dialogRef = useRef<HTMLDivElement>(null), submittingRef = useRef(false), mileageTouched = useRef(false);
  const [destination,setDestination]=useState('driver');
  const [toDriver,setToDriver]=useState('');
  const [depot,setDepot]=useState('');
  const [depotChoices,setDepotChoices]=useState(depots);
  const [rental,setRental]=useState(false);
  const [allowReturn,setAllowReturn]=useState(false);
  const [vehiclePreview,setVehiclePreview]=useState<Record<string,any>|null>(initialVehicle || null);
  const [fleetDetail,setFleetDetail]=useState<Record<string,any>|null>(null),[contextLoading,setContextLoading]=useState(false),[contextError,setContextError]=useState(''),[contextRetry,setContextRetry]=useState(0);
  const [driverChoices,setDriverChoices]=useState(drivers),[fuelConfirmed,setFuelConfirmed]=useState(false),[damageConfirmed,setDamageConfirmed]=useState(false),[saved,setSaved]=useState(false),[historyError,setHistoryError]=useState(false);
  useEffect(()=>{
    if(!open||!companyId||!vehicleId)return;
    const controller=new AbortController();setContextLoading(true);setContextError('');setFleetDetail(null);
    Promise.all([api.fleetOperations.get(companyId,`vehicle-details/${vehicleId}`,{signal:controller.signal}),fleetContext?Promise.resolve({data:fleetContext}):api.fleetOperations.get(companyId,'context',{signal:controller.signal})]).then(([r,c])=>{
      if(controller.signal.aborted)return;
      if(!r.data.abilities?.includes('handover'))throw new Error(t('Nema pristupa floti.'));
      const v=r.data.vehicle;setFleetDetail(r.data);setVehiclePreview(v);setDepotChoices(c.data.depot_records||[]);setDriverChoices(c.data.drivers||[]);
      if(v.dispatch_blocked||!['active','available','idle','in_use','depot'].includes(v.status))setDestination(current=>current==='driver'?'depot':current);
      setDepot(current=>current|| (v.depot_id?String(v.depot_id):''));setRental(v.ownership_type==='rented');setAllowReturn(c.data.role!=='driver');setFleetMileage(Number(v.last_mileage)||0);
    }).catch(e=>{if(!controller.signal.aborted)setContextError(e.message);}).finally(()=>{if(!controller.signal.aborted)setContextLoading(false);});
    return()=>controller.abort();
  },[open,companyId,vehicleId,contextRetry]);
  const [fleetMileage,setFleetMileage]=useState(0);
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

  useEffect(()=>{
    if(!open)return;
    photosRef.current.forEach(photo=>URL.revokeObjectURL(photo.url));photosRef.current=[];setPhotos([]);
    setMileage('');mileageTouched.current=false;setFuelLevel(50);setFuelConfirmed(false);setHasDamage(false);setDamageConfirmed(false);setDamageNotes('');setParkingLocation('');setParkingPoint(null);setMapOpen(false);
    setDestination('driver');setToDriver('');setDepot(initialVehicle?.depot_id?String(initialVehicle.depot_id):'');setVehiclePreview(initialVehicle||null);setSaved(false);setHistory([]);setHistoryError(false);submittingRef.current=false;
  },[open,companyId,vehicleId,loadId]);

  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement as HTMLElement|null;
    dialogRef.current?.focus();
    const trap=(event:KeyboardEvent)=>{
      if(event.key!=='Tab'||mapOpen)return;
      const controls=Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')||[]).filter(node=>node.getClientRects().length&&!node.closest('fieldset:disabled'));
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialogRef.current)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    window.addEventListener('keydown',trap);
    return()=>{window.removeEventListener('keydown',trap);if(previous?.isConnected)previous.focus();};
  },[open,mapOpen]);

  useEffect(() => {
    if (!open) return undefined;
    // The map picker opens on top of the report, so escape steps back out of it first.
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || submitting) return;
      if (mapOpen) setMapOpen(false);
      else onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    const previousOverflow=document.body.style.overflow;document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [mapOpen, onClose, open, submitting]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError('');
    if (!vehicleId) return;
    setFleetMileage(0);
    setHistoryLoading(true);
    setHistoryError(false);
    let active=true;
    const historyRequest=companyId?api.fleetOperations.get(companyId,`handovers?vehicle_id=${vehicleId}&with_photos=1`).then(r=>({data:r.data.data.map((h:Record<string,any>)=>({...h,inspected_at:h.effective_at,damage_notes:h.notes,parking_location:h.depot_name,recorded_by:{id:h.recorded_by,name:h.author},photos:h.photos||[]})) as VehicleReturnInspection[]})):api.vehicleReturns.history(vehicleId);
    historyRequest
      .then((response) => {
        if(!active)return;
        setHistory(response.data);
        const latest = response.data[0];
        if (latest && !mileageTouched.current) setMileage(String(latest.mileage_km));
      })
      .catch(() => {if(active){setHistory([]);setHistoryError(true);}})
      .finally(() => {if(active)setHistoryLoading(false);});
    return ()=>{active=false;};
  }, [open, vehicleId, companyId]);

  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), []);

  const lastMileage = Math.max(history[0]?.mileage_km || 0,fleetMileage);
  const conditionValid = validHandoverCondition({mileage,minimum:lastMileage,fuel:fuelLevel,damage:hasDamage,notes:damageNotes,confirmed:!companyId||fuelConfirmed&&damageConfirmed}) && (!companyId||!!fleetDetail);
  const photosValid = photos.length >= 3 && photos.length <= 10;
  const steps = companyId?[t('Vrsta primopredaje'),text.condition,text.photos,text.review]:[text.condition,text.photos,text.review];
  const conditionStep=companyId?1:0,photosStep=companyId?2:1,reviewStep=steps.length-1;
  const destinationIssue=companyId&&fleetDetail?handoverDestinationIssue({destination,vehicle:fleetDetail.vehicle,driverId:toDriver,depotId:depot,drivers:driverChoices,depots:depotChoices,vehicles:fleetContext?.vehicles||[],allowReturn}):'';
  const destinationValid=!companyId||!!fleetDetail&&!contextLoading&&!destinationIssue;
  const fuelColor = fuelLevel < 25 ? 'bg-rose-500' : fuelLevel < 55 ? 'bg-amber-500' : 'bg-emerald-500';
  const stepHint = companyId ? contextLoading?t('Učitavanje…'):step===0?t(destinationIssue||'Odaberite Nastavi za unos stanja vozila.'):step===conditionStep&&!conditionValid?t('Unesite kilometražu i potvrdite gorivo i stanje oštećenja.'):step===photosStep&&!photosValid?text.minimum:step===reviewStep?text.readyText:'' : '';

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
    const accepted=Array.from(files).filter(acceptableHandoverPhoto);
    const additions = accepted
      .slice(0, Math.max(0, 10 - photos.length))
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos((current) => [...current, ...additions].slice(0,10));
    setError(accepted.length!==files.length?t('Koristite JPG, PNG, WebP ili HEIC fotografije do 12 MB.'):accepted.length>10-photos.length?t('Najviše 10 fotografija po primopredaji.'):'');
  };

  const removePhoto = (index: number) => {
    setPhotos((current) => {
      URL.revokeObjectURL(current[index].url);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const submit = async () => {
    if (submittingRef.current) return;
    if(saved){try{await onCompleted();}catch{setError(t('Zapisnik je sačuvan. Pokušajte ponovo osvježiti pregled.'));}return;}
    if (!vehicleId || !conditionValid || !destinationValid || !photosValid || submitting || (!companyId&&!loadId)) return;
    submittingRef.current=true;
    setSubmitting(true);
    setError('');
    try {
      if(companyId){
        const form=new FormData();
        Object.entries({vehicle_id:String(vehicleId),destination,to_driver_id:destination==='driver'?toDriver:'',depot_id:depot,depot_name:depotChoices.find(d=>String(d.id)===depot)?.name||'',mileage_km:mileage,fuel_level_percent:String(fuelLevel),has_damage:hasDamage?'1':'0',notes:hasDamage?damageNotes.trim():''}).forEach(([k,v])=>form.append(k,v));
        photos.forEach(p=>form.append('photos[]',p.file));
        await api.fleetOperations.send(companyId,'handovers',form);
      } else if(loadId) await api.vehicleReturns.create(loadId, {
        mileageKm: Number(mileage), fuelLevelPercent: fuelLevel, hasDamage,
        damageNotes: hasDamage?damageNotes.trim():'', parkingLocation: parkingLocation.trim(),
        parkingLatitude: parkingPoint?.[0] ?? null, parkingLongitude: parkingPoint?.[1] ?? null,
        photos: photos.map((photo) => photo.file),
      });
      setSaved(true);
      try { await onCompleted(); } catch { setError(t('Zapisnik je sačuvan. Pokušajte ponovo osvježiti pregled.')); }
    } catch (caught) {
      const validation = caught instanceof ApiError ? Object.values(caught.errors).flat()[0] : null;
      setError(validation || (caught instanceof Error ? caught.message : text.error));
    } finally {
      setSubmitting(false);
      submittingRef.current=false;
    }
  };

  const recipient=driverChoices.find(d=>String(d.id)===toDriver)?.name||t('Nije odabrano'),selectedDepot=depotChoices.find(d=>String(d.id)===depot);
  const draftRows: Array<[string,string]>=companyId?[[t('Vrsta primopredaje'),t(handoverDestinationLabel(destination))],...(destination==='driver'?[[t('Preuzeo'),recipient] as [string,string]]:[]),[t('Depo i grad'),selectedDepot?`${selectedDepot.code} · ${selectedDepot.name}`:t('Nije odabrano')],[text.mileage,mileage?`${Number(mileage).toLocaleString()} km`:t('Nije evidentirano')],[text.fuel,fuelConfirmed?`${fuelLevel}%`:t('Potvrdite očitano stanje')],[text.damage,damageConfirmed?(hasDamage?text.hasDamage:text.noDamage):t('Potvrdite očitano stanje')],[text.photos,`${photos.length} / 10`]]:[];
  const reviewRows = useMemo(() => [
    ...draftRows.slice(0,companyId?(destination==='driver'?3:2):0).map(([label,value])=>[label,value,Building2] as const),
    [text.mileage, `${Number(mileage || 0).toLocaleString()} ${text.km}`, Gauge],
    [text.fuel, `${fuelLevel}%`, Fuel],
    [text.damage, hasDamage ? text.hasDamage : text.noDamage, hasDamage ? TriangleAlert : ShieldCheck],
    [text.photos, String(photos.length), Camera],
    ...(!companyId?[[text.parking, parkingLocation.trim() || '—', MapPin] as const]:[]),
  ] as const, [fuelLevel, hasDamage, mileage, parkingLocation, photos.length, text]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className={cn('fixed inset-0 z-[1800] bg-slate-950/60 backdrop-blur-sm',companyId&&'flex items-center justify-center p-2 sm:p-5')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            ref={dialogRef} tabIndex={-1}
            className={cn('flex w-full flex-col overflow-hidden bg-slate-50 outline-none dark:bg-slate-950',companyId?'h-[94dvh] max-h-[960px] max-w-6xl rounded-2xl border border-slate-200 shadow-2xl dark:border-slate-800':'h-[100dvh]')}
            initial={{ opacity: 0, y: 30, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.99 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} role="dialog" aria-modal="true" aria-labelledby={dialogId}
          >
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CarFront className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">{text.eyebrow}</p>
                <h2 id={dialogId} className="truncate text-sm font-black text-slate-900 dark:text-white">{text.title} <span className="font-bold text-slate-400">· {vehicleName || `#${vehicleId || '—'}`}</span></h2>
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

            <div className={cn('grid min-h-0 flex-1',companyId?'lg:grid-cols-[minmax(0,1.25fr)_minmax(0,.85fr)]':'lg:grid-cols-[280px_minmax(0,1fr)]')}>
              <aside className={cn('hidden min-h-0 overflow-y-auto bg-white p-4 dark:bg-slate-900 lg:block',companyId?'order-2 border-l border-slate-200 dark:border-slate-800':'border-r border-slate-200 dark:border-slate-800')}>
                {companyId&&<div className="mb-5"><HandoverContextPanel vehicle={vehiclePreview} detail={fleetDetail} lang={lang} driverName={fleetDetail?.vehicle?.assigned_driver?.name||driverChoices.find(d=>d.id===vehiclePreview?.assigned_driver_user_id)?.name||t('Bez dodijeljenog vozača')} depotName={fleetDetail?.depot?.name||vehiclePreview?.depot_name||t('Nerazvrstano')} draft={draftRows}/></div>}
                <h3 className={CARD_TITLE}><History className="h-4 w-4 text-primary" />{text.history}</h3>
                <div className="mt-3 space-y-2">
                  {historyLoading && [0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
                  {historyError&&<p className="text-xs text-amber-700 dark:text-amber-300">{t('Historija trenutno nije dostupna.')}</p>}
                  {!historyLoading && !historyError && history.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700">{text.noHistory}</p>}
                  {history.slice(0,companyId?3:history.length).map((record, index) => (
                    <motion.article key={record.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 dark:text-white">{Number(record.mileage_km).toLocaleString()} {text.km}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">{new Date(record.inspected_at).toLocaleString()}</p>
                        </div>
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black', record.has_damage ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300')}>{record.has_damage ? text.hasDamage : text.noDamage}</span>
                      </div>
                      <div className="mt-2 flex gap-1">{record.photos.slice(0, 3).map((photo) => <div key={photo.id} className="h-10 min-w-0 flex-1 overflow-hidden rounded-lg ring-1 ring-slate-200 dark:ring-slate-800"><ProtectedPhoto photo={photo} /></div>)}</div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400"><span className="truncate">{record.parking_location || '—'}</span><span className="shrink-0">{record.fuel_level_percent}%</span></div>
                    </motion.article>
                  ))}{companyId&&history.length>3&&<p className="text-[11px] text-slate-500">{t('Prikazane su tri posljednje primopredaje. Cijela evidencija je u pregledu vozila.')}</p>}
                </div>
              </aside>

              <main className={cn('min-h-0 overflow-y-auto p-4 sm:p-5 lg:p-6',companyId&&'order-1')}>
                <div className="mx-auto max-w-3xl">
                  {companyId&&<div className="mb-5 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><p className="text-[10px] font-bold uppercase tracking-widest text-primary">{t('Vozilo')} · {vehicleName}</p><h3 className="mt-1 text-base font-black">{steps[step]}</h3><p className="mt-1 text-xs text-slate-500">{t(step===0?'Odredite kome ili gdje predajete vozilo.':step===conditionStep?'Evidentirajte trenutno stanje vozila.':step===photosStep?'Fotografije dokumentuju stanje u trenutku primopredaje.':'Provjerite podatke prije slanja na kontrolu.')}</p>{contextLoading&&<p role="status" className="mt-2 text-xs text-primary">{t('Učitavanje…')}</p>}{contextError&&<div role="alert" className="mt-2 text-xs text-rose-700 dark:text-rose-300">{contextError}<Button size="sm" variant="outline" className="ml-2" onClick={()=>setContextRetry(n=>n+1)}>{t('Osvježi')}</Button></div>}</div>}
                  <fieldset className="min-w-0" disabled={submitting||saved}>
                  <div className="mb-4 flex items-center gap-1.5 md:hidden">{steps.map((label, index) => <div key={label} className={cn('h-1 flex-1 rounded-full', index <= step ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800')} />)}</div>
                  {!vehicleId ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900 dark:bg-amber-950/30">
                      <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
                      <p className="mt-3 font-black text-amber-900 dark:text-amber-200">{text.missingVehicle}</p>
                    </div>
                  ) : (
                    <AnimatePresence mode="wait">
                      <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                        {companyId&&step===0&&<div className="space-y-4"><div className="grid gap-2 sm:grid-cols-3">{[['driver','Vozač',UserRound],['depot','Na depou ili parkingu',Building2],['workshop','U radionici',Wrench],['returned','Vraćen najmodavcu',RotateCcw]].filter(([key])=>key!=='returned'||rental&&allowReturn).map(([key,label,Icon]:any)=><button key={key} type="button" aria-pressed={destination===key} onClick={()=>setDestination(key)} className={cn('flex min-h-28 flex-col items-start justify-between gap-3 rounded-xl border p-4 text-left text-xs font-bold',destination===key?'border-primary bg-primary/5 text-primary':'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300')}><span className="flex w-full items-center justify-between"><Icon className="h-5 w-5"/>{destination===key&&<CheckCircle2 className="h-4 w-4"/>}</span>{t(label)}</button>)}</div><div className={CARD}><h4 className="mb-3 text-sm font-bold">{t('Podaci predaje')}</h4><p className="mb-4 text-xs text-slate-500">{t(({driver:'Vozilo se zadužuje odabranom vozaču.',depot:'Vozač se razdužuje, a vozilo evidentira na depou.',workshop:'Vozač se razdužuje, a vozilo prelazi u radionicu.',returned:'Rentano vozilo se vraća najmodavcu.'} as Record<string,string>)[destination])}</p><div className="grid gap-4 sm:grid-cols-2">{destination==='driver'&&<label className="grid gap-1.5 text-xs font-semibold">{t('Preuzeo')} *<select className={fleetField} value={toDriver} onChange={e=>setToDriver(e.target.value)}><option value="">{t('Izaberi vozača')}</option>{driverChoices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>{!driverChoices.length&&<span className="font-normal text-amber-700">{t('Nema dostupnih vozača u ovom obuhvatu.')}</span>}</label>}<label className="grid gap-1.5 text-xs font-semibold">{t('Depo i grad')}{destination==='depot'?' *':` · ${t('Opcionalno')}`}<select className={fleetField} value={depot} onChange={e=>setDepot(e.target.value)}><option value="">{t('Izaberi depo')}</option>{depotChoices.filter(d=>d.active!==false).map(d=><option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}</select></label></div></div><p className="rounded-xl bg-primary/5 p-3 text-xs text-slate-600 dark:text-slate-300">{t('Primopredaja ne završava turu.')}</p></div>}
                        {companyId&&step===0&&destinationIssue&&<p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">{t(destinationIssue)}</p>}
                        {step === conditionStep && (
                          <div className="space-y-3">

                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">{companyId?'02':'01'} · {text.condition}</p>
                              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">{text.subtitle}</h3>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className={CARD}>
                                <span className={CARD_TITLE}><Gauge className="h-4 w-4 text-primary" />{text.mileage}</span>
                                <div className="mt-2 flex items-end gap-2">
                                  <input aria-label={text.mileage} type="number" min={lastMileage} max="999999999" step="1" value={mileage} onChange={(event) => {mileageTouched.current=true;setMileage(event.target.value);}} className="min-w-0 flex-1 border-0 bg-transparent text-2xl font-black tracking-tight text-slate-950 outline-none dark:text-white" placeholder="0" />
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
                                <input aria-label={text.fuel} type="range" min="0" max="100" step="5" value={fuelLevel} onChange={(event) => {setFuelLevel(Number(event.target.value));setFuelConfirmed(true);}} className="mt-2 w-full accent-primary" />
                                {companyId&&<label className="mt-2 flex items-start gap-2 text-[11px] text-slate-500"><input type="checkbox" checked={fuelConfirmed} onChange={e=>setFuelConfirmed(e.target.checked)} className="mt-0.5 accent-primary"/>{t('Potvrđujem očitani nivo goriva.')}</label>}
                              </div>
                            </div>
                            <div className={CARD}>
                              <p className={CARD_TITLE}>{text.damage}</p>
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                <button type="button" aria-pressed={!hasDamage&&(!companyId||damageConfirmed)} onClick={() => {setHasDamage(false);setDamageConfirmed(true);}} className={cn('flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-left text-sm font-black transition', !hasDamage&&(!companyId||damageConfirmed) ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}><ShieldCheck className="h-5 w-5 shrink-0" />{text.noDamage}</button>
                                <button type="button" aria-pressed={hasDamage} onClick={() => {setHasDamage(true);setDamageConfirmed(true);}} className={cn('flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-left text-sm font-black transition', hasDamage ? 'border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}><TriangleAlert className="h-5 w-5 shrink-0" />{text.hasDamage}</button>
                              </div>
                              {hasDamage && (
                                <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 block">
                                  <span className="text-[11px] font-black uppercase tracking-wide text-rose-600">{text.damageNotes}</span>
                                  <textarea value={damageNotes} onChange={(event) => setDamageNotes(event.target.value)} rows={3} placeholder={text.damagePlaceholder} className="mt-1.5 w-full resize-none rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-sm outline-none focus:border-rose-400 dark:border-rose-900 dark:bg-rose-950/20 dark:text-white" />
                                </motion.label>
                              )}
                            </div>
                            {!companyId&&<div className={CARD}>
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
                            </div>}
                          </div>
                        )}

                        {step === photosStep && (
                          <div className="space-y-3">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">{companyId?'03':'02'} · {text.photos}</p>
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
                                <motion.div layout key={photo.url} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-200">
                                  <img src={photo.url} alt={photo.file.name} className="h-full w-full object-cover" />
                                  <button aria-label={`${t('Ukloni fotografiju')} ${index+1}`} type="button" onClick={() => removePhoto(index)} className="absolute right-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-slate-950/70 text-white backdrop-blur transition hover:bg-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {step === reviewStep && (
                          <div className="space-y-3">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">{companyId?'04':'03'} · {text.review}</p>
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
                            {hasDamage&&<p className="whitespace-pre-wrap rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{damageNotes}</p>}
                            <div className="grid grid-cols-3 gap-2">{photos.map((photo) => <img key={photo.url} src={photo.url} alt={photo.file.name} className="aspect-[4/3] w-full rounded-xl object-cover" />)}</div>
                            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                              <div><p className="text-sm font-black">{text.ready}</p><p className="mt-0.5 text-xs opacity-80">{text.readyText}</p></div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  )}
                  </fieldset>
                  {error && <motion.div role="alert" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</motion.div>}
                </div>
              </main>
            </div>

            <footer className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:px-6">
              <Button type="button" variant="outline" disabled={(step === 0 && !onChangeVehicle) || submitting || saved} onClick={() => step===0?onChangeVehicle?.():setStep((current) => Math.max(0, current - 1))}><ArrowLeft className="mr-2 h-4 w-4" />{step===0&&onChangeVehicle?t('Izaberi drugo vozilo'):text.previous}</Button>
              <div className="min-w-0 text-center text-xs font-bold text-slate-400"><span>{step + 1} / {steps.length}</span>{stepHint&&<p role="status" className="mt-1 hidden max-w-sm text-[10px] font-normal sm:block">{stepHint}</p>}</div>
              {step < reviewStep
                ? <Button type="button" disabled={!vehicleId || (step === conditionStep ? !conditionValid : step === photosStep ? !photosValid : !destinationValid)} onClick={() => setStep((current) => Math.min(reviewStep, current + 1))}>{text.next}<ArrowRight className="ml-2 h-4 w-4" /></Button>
                : <Button type="button" disabled={submitting || (!saved&&(!conditionValid || !destinationValid || !photosValid))} onClick={() => void submit()}>{submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}{submitting ? text.submitting : saved?t('Osvježi pregled'):text.submit}</Button>}
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
