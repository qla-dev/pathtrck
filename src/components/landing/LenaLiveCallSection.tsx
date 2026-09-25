import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AudioLines, ArrowUpRight, Loader2, LockKeyhole, Phone, X } from 'lucide-react';
import { api, ApiError, createApiClient, type ApiClient } from '../../services/api';
import { useLenaCall } from '../../lib/useLenaCall';
import { loadDraftRecordToScan } from '../../lib/lenaLoadCanvas';
import { buildScanFieldRows } from '../modals/scanFieldRows';
import { lenaGuestCopy } from './lenaGuestCopy';
import type { Language } from '../../types';

type Session = { client: ApiClient; userId: number; conversationId: number };

export function LenaLiveCallSection({ lang }: { lang: Language }) {
  const t = lenaGuestCopy(lang);
  const call = useLenaCall();
  const [auth, setAuth] = useState(false);
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'cbm' | 'free'>('cbm');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [review, setReview] = useState(false);
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!auth && !review) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>('input, button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) { setAuth(false); setReview(false); }
      if (event.key !== 'Tab') return;
      const items = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]');
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [auth, review, busy]);

  const refresh = async (current = session) => {
    if (!current) return;
    try { const response = await current.client.lenaGuest.current(); if (mounted.current) setRecord(response.data); }
    catch { if (mounted.current) setError(t.failed); }
  };
  const connect = (current: Session) => {
    setError('');
    call?.startCall({
      client: current.client, lang, userId: current.userId, conversationId: current.conversationId,
      onError: () => { if (mounted.current) setError(t.error); call.endCall(); },
      onOpenDraftPanel: () => { setReview(true); void refresh(current); },
      onTurnComplete: () => { if (mounted.current) void refresh(current); },
      titleLabel: t.title, connectingLabel: t.connecting, listeningLabel: t.listening,
      speakingLabel: t.speaking, consultingLabel: t.consulting, hangUpLabel: t.hangup,
      muteLabel: t.mute, unmuteLabel: t.unmute, draftPanelLabel: t.draft, usingSkillLabel: t.using,
    });
  };
  const authenticate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !call || call.active) return;
    setBusy(true); setError('');
    try {
      const { data } = await api.lenaGuest.start(code, lang, mode);
      if (!mounted.current) return;
      const current = { client: createApiClient(data.token), userId: data.user_id, conversationId: data.conversation_id };
      setSession(current); setAuth(false); setCode(''); connect(current);
    } catch (e) { setError(e instanceof ApiError && e.errors.code ? t.invalid : t.error); }
    finally { setBusy(false); }
  };
  const draft = record?.freight_load_draft as Record<string, unknown> | undefined;
  const scan = draft ? loadDraftRecordToScan(draft) : undefined;
  const rows = scan ? buildScanFieldRows(scan, lang) : [];
  const publish = async () => {
    if (!session || !draft || busy) return;
    setBusy(true); setError('');
    try {
      await session.client.lenaGuest.publish(String(draft.updated_at));
      await refresh();
      call?.notifyUserAction('click', t.published);
    } catch (e) {
      setError(e instanceof ApiError ? [e.message, ...Object.values(e.errors).flat()].join(' ') : t.failed);
      await refresh();
    } finally { setBusy(false); }
  };

  return <>
    <section className="relative my-12 overflow-hidden rounded-[2rem] bg-slate-950 px-7 py-9 text-white sm:px-10" aria-label={t.title}>
      <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-cyan-300"><span className="h-2 w-2 rounded-full bg-cyan-300 motion-safe:animate-pulse" />{t.title}</p>
          <h3 className="max-w-xl text-2xl font-bold sm:text-3xl">{t.subtitle}</h3>
          <p className="mt-3 max-w-xl text-sm text-slate-300">{t.description}</p>
        </div>
        <button ref={opener} disabled={!call || call.active} onClick={() => { setError(''); session ? connect(session) : setAuth(true); }} className="flex shrink-0 items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 font-bold text-slate-950 transition hover:bg-cyan-100 disabled:opacity-50"><Phone size={19} />{session ? t.resume : t.call}<ArrowUpRight size={18} /></button>
      </div>
      {session && <button className="relative mt-5 text-sm font-semibold text-cyan-300 underline" onClick={() => { setReview(true); void refresh(); }}>{t.draft}</button>}
      {error && !auth && !review && <p role="alert" className="relative mt-4 text-sm text-rose-300">{error}</p>}
    </section>
    {(auth || review) && createPortal(<div className="fixed inset-0 z-[390] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
      <div ref={dialog} role="dialog" aria-modal="true" aria-label={auth ? t.auth : t.draft} className={`relative max-h-[85dvh] w-full overflow-y-auto rounded-3xl border border-white/10 bg-slate-950 p-7 text-white shadow-2xl ${review ? 'max-w-2xl' : 'max-w-md'}`}>
        <button disabled={busy} className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-white/10" aria-label={t.close} onClick={() => { setAuth(false); setReview(false); opener.current?.focus(); }}><X size={20} /></button>
        {auth ? <form onSubmit={authenticate}>
          <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-300"><AudioLines size={32} /></div>
          <p className="text-xs font-bold tracking-widest text-cyan-300">{t.title}</p>
          <h3 className="mt-2 text-3xl font-bold">{t.auth}</h3>
          <div className="my-6 grid grid-cols-2 gap-2">{(['cbm', 'free'] as const).map(item => <button type="button" key={item} aria-pressed={mode === item} onClick={() => setMode(item)} className={`rounded-xl border px-3 py-3 text-sm ${mode === item ? 'border-cyan-300 bg-cyan-300/10 text-cyan-200' : 'border-white/10 text-slate-400'}`}>{t[item]}</button>)}</div>
          <label className="mb-2 block text-sm text-slate-300" htmlFor="lena-guest-code">{t.code}</label>
          <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4"><LockKeyhole size={18} className="text-slate-400" /><input id="lena-guest-code" autoFocus type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required value={code} onChange={e => setCode(e.target.value)} autoComplete="off" className="w-full bg-transparent py-4 text-2xl tracking-[0.5em] outline-none" /></div>
          <p className="my-4 text-xs leading-relaxed text-slate-400">{t.notice}</p>
          <button disabled={busy || code.length !== 4} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 py-4 font-bold text-slate-950 disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={18} /> : <Phone size={18} />}{busy ? t.connecting : t.enter}</button>
        </form> : <>
          <h3 className="pr-8 text-2xl font-bold">{record?.load_id ? t.published : t.draft}</h3>
          <p className="my-4 text-sm text-slate-400">{draft ? t.review : t.empty}</p>
          <dl className="divide-y divide-white/10">{rows.map(row => <div key={row.key} className="grid grid-cols-2 gap-4 py-3 text-sm"><dt className="text-slate-400">{row.label}</dt><dd className="break-words">{row.value}</dd></div>)}</dl>
          <div className="mt-6 flex flex-wrap gap-3"><button disabled={busy} onClick={() => void refresh()} className="rounded-xl border border-white/20 px-4 py-3">{t.refresh}</button>{draft && !record?.load_id && <button disabled={busy} onClick={() => void publish()} className="rounded-xl bg-cyan-300 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{busy ? t.connecting : t.publish}</button>}</div>
        </>}
        {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
      </div>
    </div>, document.body)}
  </>;
}
