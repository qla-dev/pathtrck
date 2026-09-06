import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Hash, LoaderCircle, MapPin, Plane, PlaneTakeoff, Radio, Ship, Tag, X, type LucideIcon } from 'lucide-react';
import type { Language } from '../../types';
import { api, type AircraftAirport, type AircraftDetails, type VesselDetails } from '../../services/api';
import { cn } from '../../lib/cn';
import { countryFlagUrl } from '../../lib/loadGeo';

const COPY = {
  en: {
    airline: 'Airline', route: 'Route', squawk: 'Squawk', flags: 'DB flags', none: 'none',
    altitude: 'Altitude', speed: 'Ground speed', heading: 'Heading', ground: 'Ground',
    notAirborne: 'Not airborne', loading: 'Loading details...', failed: 'Details are unavailable.',
    unknownRegistration: 'Unknown registration', unknownType: 'Unknown type', close: 'Close',
    destination: 'Destination', status: 'Status', course: 'Course', speedKn: 'Speed',
    unknownVessel: 'Unknown vessel', unknownShipType: 'Unknown ship type', updated: 'Updated',
    registration: 'Registration', icaoHex: 'ICAO hex', model: 'Model', callsign: 'Call sign', mmsi: 'MMSI', shipType: 'Ship type',
  },
  bs: {
    airline: 'Avio-kompanija', route: 'Ruta', squawk: 'Squawk', flags: 'DB oznake', none: 'nema',
    altitude: 'Visina', speed: 'Brzina', heading: 'Smjer', ground: 'Na zemlji',
    notAirborne: 'Nije u zraku', loading: 'Učitavanje podataka...', failed: 'Podaci nisu dostupni.',
    unknownRegistration: 'Nepoznata registracija', unknownType: 'Nepoznat tip', close: 'Zatvori',
    destination: 'Odredište', status: 'Status', course: 'Kurs', speedKn: 'Brzina',
    unknownVessel: 'Nepoznat brod', unknownShipType: 'Nepoznat tip broda', updated: 'Ažurirano',
    registration: 'Reg. broj', icaoHex: 'ICAO hex', model: 'Model', callsign: 'Pozivni znak', mmsi: 'MMSI', shipType: 'Tip broda',
  },
  de: {
    airline: 'Fluggesellschaft', route: 'Route', squawk: 'Squawk', flags: 'DB-Kennungen', none: 'keine',
    altitude: 'Höhe', speed: 'Geschwindigkeit', heading: 'Kurs', ground: 'Am Boden',
    notAirborne: 'Nicht in der Luft', loading: 'Daten werden geladen...', failed: 'Daten sind nicht verfügbar.',
    unknownRegistration: 'Unbekanntes Kennzeichen', unknownType: 'Unbekannter Typ', close: 'Schließen',
    destination: 'Ziel', status: 'Status', course: 'Kurs', speedKn: 'Geschwindigkeit',
    unknownVessel: 'Unbekanntes Schiff', unknownShipType: 'Unbekannter Schiffstyp', updated: 'Aktualisiert',
    registration: 'Kennzeichen', icaoHex: 'ICAO-Hex', model: 'Modell', callsign: 'Rufzeichen', mmsi: 'MMSI', shipType: 'Schiffstyp',
  },
};

type Text = (typeof COPY)['en'];

const FLAG_NAMES: Record<string, string> = {
  military: 'Military', interesting: 'Interesting', pia: 'PIA', ladd: 'LADD',
};

/**
 * Windows ships no flag emoji font, so regional-indicator characters render as
 * the bare country letters there. The rest of the app uses flagcdn images.
 */
const CountryFlag = ({ country }: { country: { name: string; code: string } | null }) => country && /^[A-Za-z]{2}$/.test(country.code)
  ? <img src={countryFlagUrl(country.code)} alt={country.name} title={country.name}
      className="h-4 w-6 shrink-0 rounded-sm object-cover shadow-sm" loading="lazy" />
  : null;

const seenAgo = (seenAt: number | null, lang: Language): string => {
  if (!seenAt) return '';
  const minutes = Math.max(0, (Date.now() / 1000 - seenAt) / 60);
  const value = minutes < 60 ? `${Math.round(minutes)} min` : `${Math.round(minutes / 60)} h`;
  return lang === 'bs' ? `Posljednji signal prije ${value}` : lang === 'de' ? `Letztes Signal vor ${value}` : `Last signal ${value} ago`;
};

const Tile = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
    <strong className="text-slate-800 dark:text-white">{children}</strong>
  </div>
);

const Airport = ({ airport, align }: { airport: AircraftAirport | undefined; align: 'left' | 'right' }) => (
  <div className={cn('min-w-0 flex-1', align === 'right' && 'text-right')}>
    <p className="text-base font-black leading-tight text-slate-900 dark:text-white">{airport?.iata || '—'}</p>
    <p className="truncate text-[11px] font-semibold text-slate-500" title={airport?.name || undefined}>{airport?.location || airport?.name || ''}</p>
  </div>
);

/** One labelled row: every fact reads the same, whatever the transport. */
type Fact = { icon: LucideIcon; label: string; value: string };

/** The shape both transports are rendered from, so the card stays one layout. */
type View = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  country: { name: string; code: string } | null;
  live: boolean;
  statusLabel: string;
  badges: string[];
  facts: Fact[];
  route: ReactNode;
  tiles: Array<{ label: string; value: string }>;
  footerRight: string;
};

const aircraftView = (details: AircraftDetails, text: Text, lang: Language): View => {
  const [from, to] = details.route?.airports ?? [];
  const live = details.position_source === 'live';

  return {
    icon: <Plane className="h-5 w-5" />,
    title: details.callsign || details.registration || details.hex.toUpperCase(),
    subtitle: details.description || details.type || text.unknownType,
    country: details.country,
    live,
    statusLabel: live ? 'Live' : details.position_source === 'registry' ? text.notAirborne : seenAgo(details.seen_at, lang),
    badges: details.db_flags.map((flag) => FLAG_NAMES[flag] || flag),
    facts: [
      { icon: Building2, label: text.airline, value: details.operator?.name || '—' },
      { icon: Tag, label: text.registration, value: details.registration || text.unknownRegistration },
      { icon: Hash, label: text.icaoHex, value: details.hex.toUpperCase() },
      { icon: PlaneTakeoff, label: text.model, value: details.type || text.unknownType },
    ],
    route: details.route ? (
      <div className="flex items-center gap-3">
        <Airport airport={from} align="left" />
        <div className="flex shrink-0 flex-col items-center text-primary">
          <Plane className="h-4 w-4 rotate-90" />
          <span className="mt-0.5 block h-px w-12 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
        </div>
        <Airport airport={to} align="right" />
      </div>
    ) : null,
    tiles: [
      { label: text.altitude, value: details.altitude === 'ground' ? text.ground : details.altitude == null ? '—' : `${Number(details.altitude).toLocaleString()} ft` },
      { label: text.speed, value: details.ground_speed == null ? '—' : `${Math.round(details.ground_speed)} kt` },
      { label: text.heading, value: details.track == null ? '—' : `${Math.round(details.track)}°` },
      { label: text.squawk, value: details.squawk || '—' },
    ],
    footerRight: `${text.flags}: ${details.db_flags.length ? details.db_flags.map((flag) => FLAG_NAMES[flag] || flag).join(', ') : text.none}`,
  };
};

const vesselView = (details: VesselDetails, text: Text): View => {
  // AIS only reports while the transponder is in range, so a fresh report is
  // the closest equivalent to an aircraft's live feed.
  const updatedAt = details.updated_at ? Date.parse(details.updated_at) : NaN;
  const minutesOld = Number.isNaN(updatedAt) ? null : (Date.now() - updatedAt) / 60000;
  const live = minutesOld !== null && minutesOld < 15;

  return {
    icon: <Ship className="h-5 w-5" />,
    title: details.name || `MMSI ${details.mmsi}`,
    subtitle: details.ship_type || text.unknownShipType,
    country: details.country,
    live,
    statusLabel: live ? 'Live' : minutesOld === null ? text.none
      : minutesOld < 60 ? `${Math.round(minutesOld)} min` : `${Math.round(minutesOld / 60)} h`,
    badges: details.navigation_status ? [details.navigation_status] : [],
    facts: [
      { icon: MapPin, label: text.destination, value: details.destination || '—' },
      { icon: Radio, label: text.callsign, value: details.callsign || '—' },
      { icon: Hash, label: text.mmsi, value: details.mmsi },
      { icon: Ship, label: text.shipType, value: details.ship_type || text.unknownShipType },
    ],
    route: null,
    tiles: [
      { label: text.speedKn, value: details.speed == null ? '—' : `${details.speed.toFixed(1)} kn` },
      { label: text.course, value: details.course == null ? '—' : `${Math.round(details.course)}°` },
      { label: text.heading, value: details.heading == null ? '—' : `${Math.round(details.heading)}°` },
      { label: text.status, value: details.navigation_status || '—' },
    ],
    footerRight: details.updated_at ? `${text.updated} ${new Date(details.updated_at).toLocaleTimeString()}` : '',
  };
};

const Body = ({ view }: { view: View }) => <>
  <div className="flex items-center gap-3">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{view.icon}</span>
    <div className="min-w-0 flex-1">
      {/* The name keeps clear of the close button; the status shares the line below it. */}
      <p className="flex items-center gap-2 pr-6 text-lg font-black leading-tight text-slate-900 dark:text-white">
        <CountryFlag country={view.country} />
        <span className="truncate">{view.title}</span>
      </p>
      <div className="mt-0.5 flex items-center gap-2">
        <p className="truncate text-xs font-semibold text-slate-400">{view.subtitle}</p>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1">
          <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold',
            view.live ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400')}>
            {view.live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
            {view.statusLabel}
          </span>
          {view.badges.map((badge) => (
            <span key={badge} className="whitespace-nowrap rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">{badge}</span>
          ))}
        </div>
      </div>
    </div>
  </div>

  {view.route && <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">{view.route}</div>}

  <dl className="mt-3 space-y-1.5">
    {view.facts.map((fact) => (
      <div key={fact.label} className="flex items-center gap-2">
        <fact.icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <dt className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">{fact.label}</dt>
        <dd className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200" title={fact.value}>{fact.value}</dd>
      </div>
    ))}
  </dl>

  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
    {view.tiles.map((tile) => <Tile key={tile.label} label={tile.label}>{tile.value}</Tile>)}
  </div>

  <p className="mt-3 truncate text-right text-[10px] font-semibold text-slate-400">{view.footerRight}</p>
</>;

export const TransportDetails = ({ kind, id, lang, variant, onClose, footer }: {
  kind: 'aircraft' | 'vessel';
  /** ICAO hex for an aircraft, MMSI for a vessel. */
  id: string;
  lang: Language;
  variant: 'inline' | 'modal';
  onClose: () => void;
  footer?: ReactNode;
}) => {
  const text = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  const [view, setView] = useState<View | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setView(null);
    const load = kind === 'aircraft'
      ? api.aircraft.details(id).then((response) => aircraftView(response.data, text, lang))
      : api.vessels.details(id).then((response) => vesselView(response.data, text));
    load
      .then((next) => { if (active) setView(next); })
      .catch(() => { if (active) setError(text.failed); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind, id, lang, text]);

  useEffect(() => {
    if (variant !== 'modal') return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [variant, onClose]);

  const card = (
    <div className={cn(
      'relative rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900',
      variant === 'modal' ? 'w-[min(420px,calc(100vw-32px))] max-h-[90vh] overflow-y-auto' : 'w-full',
    )}>
      <button type="button" onClick={onClose} aria-label={text.close}
        className="absolute right-3 top-3 cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
        <X className="h-4 w-4" />
      </button>
      {loading && <p className="flex items-center gap-2 py-6 text-xs font-semibold text-primary"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />{text.loading}</p>}
      {error && !loading && <p className="py-6 text-xs font-semibold text-rose-500">{error}</p>}
      {view && !loading && <Body view={view} />}
      {footer}
    </div>
  );

  if (variant === 'inline') {
    return <div className="absolute bottom-5 left-5 z-[500] w-[min(360px,calc(100%-40px))]">{card}</div>;
  }

  return createPortal(
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      {card}
    </div>,
    document.body,
  );
};
