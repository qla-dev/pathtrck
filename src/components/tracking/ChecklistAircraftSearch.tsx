import { nextInput } from '../../lib/enterNavigation';
import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { Language } from '../../types';
import { api } from '../../services/api';

const COPY = {
  en: { missing: 'No matching aircraft found.', failed: 'Aircraft lookup failed. Try again.', saveFailed: 'The aircraft could not be saved.', retry: 'Retry' },
  bs: { missing: 'Nije pronađen odgovarajući avion.', failed: 'Pretraga nije uspjela. Pokušaj ponovo.', saveFailed: 'Avion nije spremljen.', retry: 'Pokušaj ponovo' },
  de: { missing: 'Kein passendes Flugzeug gefunden.', failed: 'Flugzeugsuche fehlgeschlagen. Bitte erneut versuchen.', saveFailed: 'Das Flugzeug konnte nicht gespeichert werden.', retry: 'Erneut versuchen' },
};
type Match = { hex: string; name: string };
const savedMatch = (value: string): Match | null => {
  try {
    const parsed = JSON.parse(value);
    return parsed?.matched === true && /^[a-f0-9]{6}$/i.test(parsed.hex) ? { hex: String(parsed.hex), name: String(parsed.name || '') } : null;
  } catch { return null; }
};

export const ChecklistAircraftSearch = ({ value, lang, disabled, onSave, retrySignal = 0 }: {
  value: string; lang: Language; disabled: boolean; onSave: (value: string) => Promise<void>; retrySignal?: number;
}) => {
  const text = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  const initial = savedMatch(value);
  const [query, setQuery] = useState(initial?.hex || value);
  const [match, setMatch] = useState<Match | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [results, setResults] = useState<Match[]>([]);
  const [saving, setSaving] = useState(false);
  const searchLabel = lang === 'bs' ? 'npr. B-226S ili 782177' : lang === 'de' ? 'z. B. B-226S oder 782177' : 'e.g. B-226S or 782177';
  const revision = useRef(0);
  const committed = useRef(false);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  useEffect(() => {
    const saved = savedMatch(value);
    setMatch(saved);
    setQuery(saved?.hex || value);
  }, [value]);
  useEffect(() => {
    const hex = query.trim();
    if (hex.length < 2 || match?.hex === hex) return;
    if (committed.current) return;
    const version = revision.current;
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.aircraft.list({ south: -90, west: -180, north: 90, east: 180, search: hex });
        if (!active || version !== revision.current) return;
        const matches = response.data.filter((row) => /^[a-f0-9]{6}$/i.test(String(row.hex)));
        if (!matches.length) { setError(text.missing); return; }

        // A registration or hex identifies one aircraft, so link it straight away
        // the way an MMSI does for a vessel. Only an ambiguous term needs a list.
        if (matches.length > 1) {
          setResults(matches.map((row) => ({ hex: String(row.hex), name: row.r || row.flight?.trim() || row.hex })));
          return;
        }
        const row = matches[0];
        const aircraft = { hex: String(row.hex), name: row.r || row.flight?.trim() || String(row.hex) };
        try {
          await saveRef.current(JSON.stringify({ ...aircraft, matched: true }));
          if (!active || version !== revision.current) return;
          setMatch(aircraft);
          setQuery(aircraft.hex);
          setResults([]);
        } catch { if (active && version === revision.current) setError(text.saveFailed); }
      } catch { if (active && version === revision.current) setError(text.failed); }
      finally { if (active && version === revision.current) setLoading(false); }
    }, 400);
    return () => { active = false; window.clearTimeout(timer); setLoading(false); };
  }, [query, match?.hex, retry, retrySignal, text]);

  return <div aria-busy={loading || saving} className="ml-auto w-full max-w-[220px] space-y-1.5 text-left" onBlur={async (event) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null) || disabled || saving || committed.current) return;
      const entered = query.trim();
      if (entered === value || entered === match?.hex) return;
      setSaving(true);
      try { await saveRef.current(entered); }
      catch { setError(text.saveFailed); }
      finally { setSaving(false); }
    }}>
    <div className="relative">
      <input value={query} maxLength={100} aria-label={searchLabel} placeholder={searchLabel}
        onKeyDown={async (event) => {
          if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
          event.preventDefault(); event.stopPropagation();
          if (disabled || saving) return;
          const advance = nextInput(event.currentTarget);
          revision.current++; committed.current = true;
          setLoading(false); setSaving(true); setError('');
          try {
            const entered = query.trim();
            if (entered !== match?.hex && entered !== value) await saveRef.current(entered);
            setResults([]); advance();
          } catch { committed.current = false; setError(text.saveFailed); }
          finally { setSaving(false); }
        }}
        disabled={disabled || saving} onChange={(event) => { revision.current++; committed.current = false; setQuery(event.target.value); setError(''); setResults([]); }}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 pr-8 text-xs font-bold outline-none focus:border-primary disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
      {loading && <LoaderCircle aria-hidden="true" className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-primary" />}
    </div>
    {results.length > 0 && <ul aria-label={searchLabel} className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950">
      {results.map((vessel) => <li key={vessel.hex}><button type="button" disabled={disabled || saving}
        className="w-full cursor-pointer rounded-md p-2 text-left text-xs hover:bg-primary/10 focus-visible:outline-primary disabled:opacity-60"
        onClick={async () => {
          setSaving(true);
          setError('');
          try {
            await saveRef.current(JSON.stringify({ ...vessel, matched: true }));
            setMatch(vessel);
            setQuery(vessel.hex);
            setResults([]);
          } catch { setError(text.saveFailed); }
          finally { setSaving(false); }
        }}>
        <span className="block font-bold dark:text-slate-200">{vessel.name || vessel.hex}</span>
        <span className="text-slate-500">ICAO {vessel.hex}</span>
      </button></li>)}
    </ul>}
    <div role="status" aria-live="polite">
      {error && error !== text.missing && <div className="text-[11px] text-rose-500">{error} <button type="button" disabled={disabled || loading} onClick={() => { committed.current = false; setRetry((count) => count + 1); }} className="font-bold underline">{text.retry}</button></div>}
    </div>
  </div>;
};
