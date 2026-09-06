import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle, Plane, X } from 'lucide-react';
import type { Language } from '../../types';
import { api, type AircraftAirport, type AircraftDetails } from '../../services/api';
import { cn } from '../../lib/cn';

const COPY = {
  en: {
    airline: 'Airline', route: 'Route', type: 'Type', squawk: 'Squawk', flags: 'DB flags', none: 'none',
    altitude: 'Altitude', speed: 'Ground speed', heading: 'Heading', ground: 'Ground', registry: 'Registered',
    notAirborne: 'Not airborne', loading: 'Loading aircraft details...', failed: 'Aircraft details are unavailable.',
    unknownRegistration: 'Unknown registration', unknownType: 'Unknown type', close: 'Close',
  },
  bs: {
    airline: 'Avio-kompanija', route: 'Ruta', type: 'Tip', squawk: 'Squawk', flags: 'DB oznake', none: 'nema',
    altitude: 'Visina', speed: 'Brzina', heading: 'Smjer', ground: 'Na zemlji', registry: 'Registrovan',
    notAirborne: 'Nije u zraku', loading: 'Učitavanje podataka o avionu...', failed: 'Podaci o avionu nisu dostupni.',
    unknownRegistration: 'Nepoznata registracija', unknownType: 'Nepoznat tip', close: 'Zatvori',
  },
  de: {
    airline: 'Fluggesellschaft', route: 'Route', type: 'Typ', squawk: 'Squawk', flags: 'DB-Kennungen', none: 'keine',
    altitude: 'Höhe', speed: 'Geschwindigkeit', heading: 'Kurs', ground: 'Am Boden', registry: 'Registriert',
    notAirborne: 'Nicht in der Luft', loading: 'Flugzeugdaten werden geladen...', failed: 'Flugzeugdaten sind nicht verfügbar.',
    unknownRegistration: 'Unbekanntes Kennzeichen', unknownType: 'Unbekannter Typ', close: 'Schließen',
  },
};

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
  const minutes = Math.max(0, Math.round(Date.now() / 1000 - seenAt) / 60);
  const value = minutes < 60 ? `${Math.round(minutes)} min` : `${Math.round(minutes / 60)} h`;
  return lang === 'bs' ? `Posljednji signal prije ${value}` : lang === 'de' ? `Letztes Signal vor ${value}` : `Last signal ${value} ago`;
};

const Tile = ({ label, children }: { label: string; children: React.ReactNode }) => (
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

const Body = ({ details, lang }: { details: AircraftDetails; lang: Language }) => {
  const text = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  const [from, to] = details.route?.airports ?? [];
  const live = details.position_source === 'live';

  return <>
    <div className="flex items-start gap-3 pr-6">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Plane className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-lg font-black leading-tight text-slate-900 dark:text-white">
          {details.country && <span aria-label={details.country.name} title={details.country.name}>{flagEmoji(details.country.code)}</span>}
          <span className="truncate">{details.callsign || details.registration || details.hex.toUpperCase()}</span>
        </p>
        <p className="truncate text-xs font-semibold text-slate-400">
          {details.registration || text.unknownRegistration} · {details.type || text.unknownType}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
            live ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400')}>
            {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
            {live ? 'Live' : details.position_source === 'registry' ? text.notAirborne : seenAgo(details.seen_at, lang)}
          </span>
          {details.db_flags.map((flag) => (
            <span key={flag} className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {FLAG_NAMES[flag] || flag}
            </span>
          ))}
        </div>
      </div>
    </div>

    {details.operator && (
      <p className="mt-3 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
        <span className="text-[10px] font-bold uppercase text-slate-400">{text.airline}: </span>
        {details.operator.name}
      </p>
    )}
    {details.description && <p className="truncate text-xs text-slate-500">{details.description}</p>}

    {details.route && (
      <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <Airport airport={from} align="left" />
          <div className="flex shrink-0 flex-col items-center text-primary">
            <Plane className="h-4 w-4 rotate-90" />
            <span className="mt-0.5 block h-px w-12 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
          </div>
          <Airport airport={to} align="right" />
        </div>
      </div>
    )}

    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
      <Tile label={text.altitude}>{details.altitude === 'ground' ? text.ground : details.altitude == null ? '—' : `${Number(details.altitude).toLocaleString()} ft`}</Tile>
      <Tile label={text.speed}>{details.ground_speed == null ? '—' : `${Math.round(details.ground_speed)} kt`}</Tile>
      <Tile label={text.heading}>{details.track == null ? '—' : `${Math.round(details.track)}°`}</Tile>
      <Tile label={text.squawk}>{details.squawk || '—'}</Tile>
    </div>

    <p className="mt-3 flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-400">
      <span>ICAO {details.hex.toUpperCase()}</span>
      <span>{text.flags}: {details.db_flags.length ? details.db_flags.map((flag) => FLAG_NAMES[flag] || flag).join(', ') : text.none}</span>
    </p>
  </>;
};

export const TransportDetails = ({ hex, lang, variant, onClose, footer }: {
  hex: string;
  lang: Language;
  variant: 'inline' | 'modal';
  onClose: () => void;
  footer?: React.ReactNode;
}) => {
  const text = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  const [details, setDetails] = useState<AircraftDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setDetails(null);
    api.aircraft.details(hex)
      .then((response) => { if (active) setDetails(response.data); })
      .catch(() => { if (active) setError(text.failed); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [hex, text]);

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
      {details && !loading && <Body details={details} lang={lang} />}
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
