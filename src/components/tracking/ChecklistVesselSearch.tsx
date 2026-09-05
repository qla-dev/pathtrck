import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { Language } from '../../types';
import { api } from '../../services/api';

const COPY = {
  en: { search: 'Search by MMSI', matched: 'Matched', missing: 'No matching vessel found.', failed: 'Vessel lookup failed. Try again.', saveFailed: 'The vessel could not be saved.', invalid: 'Enter a 9-digit MMSI.', retry: 'Retry' },
  bs: { search: 'Pretraži po MMSI-u', matched: 'Brod povezan', missing: 'Nije pronađen odgovarajući brod.', failed: 'Pretraga nije uspjela. Pokušaj ponovo.', saveFailed: 'Brod nije spremljen.', invalid: 'Unesi MMSI od 9 cifara.', retry: 'Pokušaj ponovo' },
  de: { search: 'Nach MMSI suchen', matched: 'Zugeordnet', missing: 'Kein passendes Schiff gefunden.', failed: 'Schiffssuche fehlgeschlagen. Bitte erneut versuchen.', saveFailed: 'Das Schiff konnte nicht gespeichert werden.', invalid: 'Eine 9-stellige MMSI eingeben.', retry: 'Erneut versuchen' },
};
type Match = { mmsi: string; name: string };
const savedMatch = (value: string): Match | null => {
  try {
    const parsed = JSON.parse(value);
    return parsed?.matched === true && /^\d{9}$/.test(parsed.mmsi) ? { mmsi: String(parsed.mmsi), name: String(parsed.name || '') } : null;
  } catch { return null; }
};

export const ChecklistVesselSearch = ({ value, lang, disabled, onSave }: {
  value: string; lang: Language; disabled: boolean; onSave: (value: string) => Promise<void>;
}) => {
  const text = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  const initial = savedMatch(value);
  const [query, setQuery] = useState(initial?.mmsi || value);
  const [match, setMatch] = useState<Match | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [results, setResults] = useState<Match[]>([]);
  const [saving, setSaving] = useState(false);
  const searchLabel = lang === 'bs' ? 'Naziv broda ili MMSI' : lang === 'de' ? 'Schiffsname oder MMSI' : 'Vessel name or MMSI';
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  useEffect(() => {
    const saved = savedMatch(value);
    setMatch(saved);
    setQuery(saved?.mmsi || value);
  }, [value]);
  useEffect(() => {
    const mmsi = query.trim();
    const numeric = /^\d+$/.test(mmsi);
    if (mmsi.length < 2 || (numeric && !/^\d{9}$/.test(mmsi)) || match?.mmsi === mmsi) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.vessels.list({ south: -90, west: -180, north: 90, east: 180, search: mmsi });
        if (!active) return;
        const matches = response.data.filter((row) => /^\d{9}$/.test(String(row.mmsi)) && (numeric
          ? String(row.mmsi) === mmsi
          : String(row.name || '').toLocaleLowerCase().includes(mmsi.toLocaleLowerCase())));
        if (!numeric) {
          setResults(matches.map((row) => ({ mmsi: String(row.mmsi), name: row.name || '' })));
          if (!matches.length) setError(text.missing);
          return;
        }
        const vessel = matches[0];
        if (!vessel) { setError(text.missing); return; }
        const result = { mmsi, name: vessel.name || '' };
        try {
          await saveRef.current(JSON.stringify({ ...result, matched: true }));
          if (active) setMatch(result);
        } catch { if (active) setError(text.saveFailed); }
      } catch { if (active) setError(text.failed); }
      finally { if (active) setLoading(false); }
    }, 400);
    return () => { active = false; window.clearTimeout(timer); setLoading(false); };
  }, [query, match?.mmsi, retry, text]);

  return <div aria-busy={loading || saving} className="ml-auto w-full max-w-[220px] space-y-1.5 text-left">
    <div className="relative">
      <input value={query} maxLength={100} aria-label={searchLabel} placeholder={searchLabel}
        disabled={disabled || saving} onChange={(event) => { setQuery(event.target.value); setError(''); setResults([]); }}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 pr-8 text-xs font-bold outline-none focus:border-primary disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
      {loading && <LoaderCircle aria-hidden="true" className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-primary" />}
    </div>
    {results.length > 0 && <ul aria-label={searchLabel} className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950">
      {results.map((vessel) => <li key={vessel.mmsi}><button type="button" disabled={disabled || saving}
        className="w-full rounded-md p-2 text-left text-xs hover:bg-primary/10 focus-visible:outline-primary disabled:opacity-60"
        onClick={async () => {
          setSaving(true);
          setError('');
          try {
            await saveRef.current(JSON.stringify({ ...vessel, matched: true }));
            setMatch(vessel);
            setQuery(vessel.mmsi);
            setResults([]);
          } catch { setError(text.saveFailed); }
          finally { setSaving(false); }
        }}>
        <span className="block font-bold dark:text-slate-200">{vessel.name || vessel.mmsi}</span>
        <span className="text-slate-500">MMSI {vessel.mmsi}</span>
      </button></li>)}
    </ul>}
    <div role="status" aria-live="polite">
      {/^[0-9]+$/.test(query.trim()) && !/^\d{9}$/.test(query.trim()) && <p className="text-[11px] text-slate-500">{text.invalid}</p>}
      {error && <div className="text-[11px] text-rose-500">{error} <button type="button" disabled={disabled || loading} onClick={() => setRetry((count) => count + 1)} className="font-bold underline">{text.retry}</button></div>}
    </div>
  </div>;
};
