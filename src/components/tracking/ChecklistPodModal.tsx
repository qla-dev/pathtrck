import { useState } from 'react';
import { Upload } from 'lucide-react';
import type { Language } from '../../types';
import { SmallModal } from '../ui/SmallModal';

export const podFailureReason = (value: unknown): string => {
  try {
    const data = JSON.parse(String(value || ''));
    return data?.outcome === 'failed' && typeof data.reason === 'string' ? data.reason : '';
  } catch { return ''; }
};

const COPY = {
  en: { title: 'Enter data', upload: 'Upload document', drop: 'Drop a document here or click to choose', failure: 'I could not deliver the load', reason: 'Explain why delivery was unsuccessful', submit: 'Submit', cancel: 'Cancel', or: 'or', failed: 'Unsuccessful', error: 'The data could not be saved.' },
  de: { title: 'Daten eingeben', upload: 'Dokument hochladen', drop: 'Dokument hier ablegen oder zum Auswählen klicken', failure: 'Ich konnte die Ladung nicht zustellen', reason: 'Grund für die erfolglose Zustellung', submit: 'Absenden', cancel: 'Abbrechen', or: 'oder', failed: 'Fehlgeschlagen', error: 'Die Daten konnten nicht gespeichert werden.' },
  bs: { title: 'Unesi podatke', upload: 'Priloži dokument', drop: 'Prevuci dokument ovdje ili klikni za odabir', failure: 'Nisam mogao isporučiti teret', reason: 'Obrazloženje neuspjele isporuke', submit: 'Pošalji', cancel: 'Odustani', or: 'ili', failed: 'Neuspjelo', error: 'Podaci nisu spremljeni.' },
  hr: { title: 'Unesi podatke', upload: 'Priloži dokument', drop: 'Povuci dokument ovdje ili klikni za odabir', failure: 'Nisam mogao isporučiti teret', reason: 'Obrazloženje neuspjele isporuke', submit: 'Pošalji', cancel: 'Odustani', or: 'ili', failed: 'Neuspjelo', error: 'Podaci nisu spremljeni.' },
  sr: { title: 'Unesi podatke', upload: 'Priloži dokument', drop: 'Prevuci dokument ovde ili klikni za izbor', failure: 'Nisam mogao isporučiti teret', reason: 'Obrazloženje neuspele isporuke', submit: 'Pošalji', cancel: 'Odustani', or: 'ili', failed: 'Neuspjelo', error: 'Podaci nisu sačuvani.' },
};
export const podCopy = (lang: Language) => COPY[lang as keyof typeof COPY] || COPY.en;

export const ChecklistPodModal = ({ lang, value, onUpload, onFailure, onClose }: {
  lang: Language; value: unknown; onUpload: (file: File) => Promise<void>;
  onFailure: (value: string) => Promise<void>; onClose: () => void;
}) => {
  const text = podCopy(lang);
  const [reason, setReason] = useState(() => podFailureReason(value));
  const [expanded, setExpanded] = useState(() => Boolean(podFailureReason(value)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); onClose(); }
    catch { setError(text.error); setBusy(false); }
  };
  return <SmallModal labelledBy="pod-title" onClose={onClose} closeDisabled={busy} className="max-w-3xl">
    <h3 id="pod-title" className="mb-5 text-base font-black">POD — {text.title}</h3>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <label className={`flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-primary ${busy ? 'pointer-events-none opacity-60' : ''}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file && !busy) void save(() => onUpload(file)); }}>
        <Upload className="h-8 w-8 text-primary" />
        <strong>{text.upload}</strong><span className="text-xs text-slate-500">{text.drop}</span>
        {!podFailureReason(value) && Boolean(value) && <span className="max-w-full break-words text-xs">{String(value)}</span>}
        <input type="file" aria-label={text.upload} disabled={busy} className="sr-only" onChange={(event) => {
          const file = event.target.files?.[0]; event.target.value = ''; if (file) void save(() => onUpload(file));
        }} />
      </label>
      <div className="pointer-events-none relative flex items-center justify-center">
        <div className="absolute w-full border-t border-slate-200 md:h-full md:w-0 md:border-l md:border-t-0" />
        <span className="relative bg-white px-2 py-2 text-xs font-bold text-slate-400 dark:bg-slate-900">{text.or}</span>
      </div>
      <form className="flex flex-col justify-center gap-3" onSubmit={(event) => { event.preventDefault(); if (reason.trim()) void save(() => onFailure(JSON.stringify({ outcome: 'failed', reason: reason.trim() }))); }}>
        <button type="button" disabled={busy} aria-expanded={expanded} onClick={() => setExpanded(true)} className="rounded-lg border border-rose-200 px-4 py-3 text-sm font-bold text-rose-600">{text.failure}</button>
        {expanded && <><label className="text-xs font-bold">{text.reason}<textarea required maxLength={4000} disabled={busy} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 bg-transparent p-3 dark:border-slate-700" /></label>
          <button type="submit" disabled={busy || !reason.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{text.submit}</button></>}
      </form>
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-rose-600">{error}</p>}
    <div className="mt-5 text-right"><button type="button" disabled={busy} onClick={onClose} className="text-sm font-bold">{text.cancel}</button></div>
  </SmallModal>;
};
