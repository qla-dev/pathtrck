import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle, Plane, Ship, X } from 'lucide-react';
import type { Language } from '../../types';
import { api, type AircraftAirport, type AircraftDetails, type VesselDetails } from '../../services/api';
import { cn } from '../../lib/cn';

const COPY = {
  en: {
    airline: 'Airline', route: 'Route', squawk: 'Squawk', flags: 'DB flags', none: 'none',
    altitude: 'Altitude', speed: 'Ground speed', heading: 'Heading', ground: 'Ground',
    notAirborne: 'Not airborne', loading: 'Loading details...', failed: 'Details are unavailable.',
    unknownRegistration: 'Unknown registration', unknownType: 'Unknown type', close: 'Close',
    destination: 'Destination', status: 'Status', course: 'Course', speedKn: 'Speed',
    unknownVessel: 'Unknown vessel', unknownShipType: 'Unknown ship type', updated: 'Updated',
  },
  bs: {
    airline: 'Avio-kompanija', route: 'Ruta', squawk: 'Squawk', flags: 'DB oznake', none: 'nema',
    altitude: 'Visina', speed: 'Brzina', heading: 'Smjer', ground: 'Na zemlji',
    notAirborne: 'Nije u zraku', loading: 'Učitavanje podataka...', failed: 'Podaci nisu dostupni.',
    unknownRegistration: 'Nepoznata registracija', unknownType: 'Nepoznat tip', close: 'Zatvori',
    destination: 'Odredište', status: 'Status', course: 'Kurs', speedKn: 'Brzina',
    unknownVessel: 'Nepoznat brod', unknownShipType: 'Nepoznat tip broda', updated: 'Ažurirano',
  },
  de: {
    airline: 'Fluggesellschaft', route: 'Route', squawk: 'Squawk', flags: 'DB-Kennungen', none: 'keine',
    altitude: 'Höhe', speed: 'Geschwindigkeit', heading: 'Kurs', ground: 'Am Boden',
    notAirborne: 'Nicht in der Luft', loading: 'Daten werden geladen...', failed: 'Daten sind nicht verfügbar.',
    unknownRegistration: 'Unbekanntes Kennzeichen', unknownType: 'Unbekannter Typ', close: 'Schließen',
    destination: 'Ziel', status: 'Status', course: 'Kurs', speedKn: 'Geschwindigkeit',
    unknownVessel: 'Unbekanntes Schiff', unknownShipType: 'Unbekannter Schiffstyp', updated: 'Aktualisiert',
  },
};

type Text = (typeof COPY)['en'];

const FLAG_NAMES: Record<string, string> = {
  military: 'Military', interesting: 'Interesting', pia: 'PIA', ladd: 'LADD',
};

/** Turns an ISO 3166-1 alpha-2 code into its regional-indicator flag emoji. */
const flagEmoji = (code: string | null | undefined): string => {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
};

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

/** The shape both transports are rendered from, so the card stays one layout. */
type View = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  country: { name: string; code: string } | null;
  live: boolean;
  statusLabel: string;
  badges: string[];
  lead: { label: string; value: string } | null;
  note: string | null;
  route: ReactNode;
  tiles: Array<{ label: string; value: string }>;
  footerLeft: string;
  footerRight: string;
};

const aircraftView = (details: AircraftDetails, text: Text, lang: Language): View => {
  const [from, to] = details.route?.airports ?? [];
  const live = details.position_source === 'live';

  return {
    icon: <Plane className="h-5 w-5" />,
    title: details.callsign || details.registration || details.hex.toUpperCase(),
    subtitle: `${details.registration || text.unknownRegistration} · ${details.type || text.unknownType}`,
    country: details.country,
    live,
    statusLabel: live ? 'Live' : details.position_source === 'registry' ? text.notAirborne : seenAgo(details.seen_at, lang),
    badges: details.db_flags.map((flag) => FLAG_NAMES[flag] || flag),
    lead: details.operator?.name ? { label: text.airline, value: details.operator.name } : null,
    note: details.description,
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
    footerLeft: `ICAO ${details.hex.toUpperCase()}`,
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
    subtitle: `${details.callsign || details.mmsi} · ${details.ship_type || text.unknownShipType}`,
    country: details.country,
    live,
    statusLabel: live ? 'Live' : minutesOld === null ? text.none
      : minutesOld < 60 ? `${Math.round(minutesOld)} min` : `${Math.round(minutesOld / 60)} h`,
    badges: details.navigation_status ? [details.navigation_status] : [],
    lead: details.destination ? { label: text.destination, value: details.destination } : null,
    note: details.navigation_status,
    route: null,
    tiles: [
      { label: text.speedKn, value: details.speed == null ? '—' : `${details.speed.toFixed(1)} kn` },
      { label: text.course, value: details.course == null ? '—' : `${Math.round(details.course)}°` },
      { label: text.heading, value: details.heading == null ? '—' : `${Math.round(details.heading)}°` },
      { label: text.status, value: details.navigation_status || '—' },
    ],
    footerLeft: `MMSI ${details.mmsi}`,
    footerRight: details.updated_at ? `${text.updated} ${new Date(details.updated_at).toLocaleTimeString()}` : '',
  };
};

const Body = ({ view }: { view: View }) => <>
  <div className="flex items-start gap-3 pr-6">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{view.icon}</span>
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-lg font-black leading-tight text-slate-900 dark:text-white">
        {view.country && <span aria-label={view.country.name} title={view.country.name}>{flagEmoji(view.country.code)}</span>}
        <span className="truncate">{view.title}</span>
      </p>
      <p className="truncate text-xs font-semibold text-slate-400">{view.subtitle}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
          view.live ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400')}>
          {view.live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
          {view.statusLabel}
        </span>
        {view.badges.map((badge) => (
          <span key={badge} className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">{badge}</span>
        ))}
      </div>
    </div>
  </div>

  {view.lead && (
    <p className="mt-3 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
      <span className="text-[10px] font-bold uppercase text-slate-400">{view.lead.label}: </span>{view.lead.value}
    </p>
  )}
  {view.note && <p className="truncate text-xs text-slate-500">{view.note}</p>}

  {view.route && <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">{view.route}</div>}

  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
    {view.tiles.map((tile) => <Tile key={tile.label} label={tile.label}>{tile.value}</Tile>)}
  </div>

  <p className="mt-3 flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-400">
    <span>{view.footerLeft}</span><span className="truncate">{view.footerRight}</span>
  </p>
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
