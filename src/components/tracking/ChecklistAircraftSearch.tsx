import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { Language } from '../../types';
import { api } from '../../services/api';

const COPY = {
  en: { search: 'Search by ICAO', matched: 'Matched', missing: 'No matching live aircraft found.', failed: 'Aircraft lookup failed. Try again.', saveFailed: 'The aircraft could not be saved.', invalid: 'Enter a 9-digit ICAO.', retry: 'Retry' },
  bs: { search: 'Pretraži po ICAO-u', matched: 'Brod povezan', missing: 'Nije pronađen odgovarajući brod.', failed: 'Pretraga nije uspjela. Pokušaj ponovo.', saveFailed: 'Avion nije spremljen.', invalid: 'Unesi ICAO od 9 cifara.', retry: 'Pokušaj ponovo' },
  de: { search: 'Nach ICAO suchen', matched: 'Zugeordnet', missing: 'Kein passendes Live-Flugzeug gefunden.', failed: 'Flugzeugsuche fehlgeschlagen. Bitte erneut versuchen.', saveFailed: 'Das Flugzeug konnte nicht gespeichert werden.', invalid: 'Eine 9-stellige ICAO eingeben.', retry: 'Erneut versuchen' },
};
type Match = { hex: string; name: string };
const savedMatch = (value: string): Match | null => {
  try {
    const parsed = JSON.parse(value);
    return parsed?.matched === true && /^[a-f0-9]{6}$/i.test(parsed.hex) ? { hex: String(parsed.hex), name: String(parsed.name || '') } : null;
  } catch { return null; }
};

export const ChecklistAircraftSearch = ({ value, lang, disabled, onSave }: {
  value: string; lang: Language; disabled: boolean; onSave: (value: string) => Promise<void>;
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
  const searchLabel = lang === 'bs' ? 'Registracija, npr. B-226S' : lang === 'de' ? 'Kennzeichen, z. B. B-226S' : 'Registration, e.g. B-226S';
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  useEffect(() => {
    const saved = savedMatch(value);
    setMatch(saved);
    setQuery(saved?.hex || value);
  }, [value]);
  useEffect(() => {
    const hex = query.trim();
    const numeric = false;
    if (hex.length < 2 || (numeric && !/^[a-f0-9]{6}$/i.test(hex)) || match?.hex === hex) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.aircraft.list({ south: -90, west: -180, north: 90, east: 180, search: hex });
        if (!active) return;
        const matches = response.data.filter((row) => /^[a-f0-9]{6}$/i.test(String(row.hex)) && (numeric
          ? String(row.hex) === hex
          : true));
        if (!numeric) {
          setResults(matches.map((row) => ({ hex: String(row.hex), name: row.r || row.flight?.trim() || row.hex })));
          if (!matches.length) setError(text.missing);
          return;
        }
        const vessel = matches[0];
        if (!vessel) { setError(text.missing); return; }
        const result = { hex, name: vessel.r || vessel.flight?.trim() || vessel.hex };
        try {
          await saveRef.current(JSON.stringify({ ...result, matched: true }));
          if (active) setMatch(result);
        } catch { if (active) setError(text.saveFailed); }
      } catch { if (active) setError(text.failed); }
      finally { if (active) setLoading(false); }
    }, 400);
    return () => { active = false; window.clearTimeout(timer); setLoading(false); };
  }, [query, match?.hex, retry, text]);

  return <div aria-busy={loading || saving} className="ml-auto w-full max-w-[220px] space-y-1.5 text-left">
    <div className="relative">
      <input value={query} maxLength={100} aria-label={searchLabel} placeholder={searchLabel}
        disabled={disabled || saving} onChange={(event) => { setQuery(event.target.value); setError(''); setResults([]); }}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 pr-8 text-xs font-bold outline-none focus:border-primary disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
      {loading && <LoaderCircle aria-hidden="true" className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-primary" />}
    </div>
    {results.length > 0 && <ul aria-label={searchLabel} className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950">
      {results.map((vessel) => <li key={vessel.hex}><button type="button" disabled={disabled || saving}
        className="w-full rounded-md p-2 text-left text-xs hover:bg-primary/10 focus-visible:outline-primary disabled:opacity-60"
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
      {error && <div className="text-[11px] text-rose-500">{error} <button type="button" disabled={disabled || loading} onClick={() => setRetry((count) => count + 1)} className="font-bold underline">{text.retry}</button></div>}
    </div>
  </div>;
};
