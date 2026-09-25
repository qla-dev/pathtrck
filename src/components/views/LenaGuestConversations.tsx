import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { Language } from '../../types';
import { lenaGuestCopy } from '../landing/lenaGuestCopy';

export function LenaGuestConversations({ lang }: { lang: Language }) {
  const t = lenaGuestCopy(lang);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    void api.lenaGuest.conversations(page).then(result => { if (active) setRows(result.data); })
      .catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, version]);
  useEffect(() => {
    setDetail(null);
    if (!selected) return;
    let active = true;
    void api.lenaGuest.conversation(selected).then(result => { if (active) setDetail(result.data); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [selected, version]);
  const messages = (detail?.messages ?? []) as Array<{ id: number; body: string; sent_at: string; sender?: { username?: string } }>;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-bold">{t.saved}</h2><button onClick={() => setVersion(v => v + 1)} className="text-sm font-semibold text-primary">{t.refresh}</button></div>
    {error && <p role="alert" className="mb-3 text-sm text-rose-500">{t.failed}</p>}
    {loading ? <p role="status">…</p> : rows.length === 0 ? <p className="text-sm text-slate-500">{t.noCalls}</p> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map(row => <button key={String(row.id)} onClick={() => setSelected(Number(row.id))} className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left text-sm hover:text-primary"><span className="font-semibold">#{String(row.id)} · {String(row.subject)}</span><span className="text-xs text-slate-500">{new Date(String(row.created_at)).toLocaleString(lang)} · {String(row.messages_count)}</span></button>)}</div>}
    <div className="mt-3 flex justify-end gap-4 text-xs"><button disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)} className="disabled:opacity-30">{t.previous}</button><span>{page}</span><button disabled={rows.length < 20 || loading} onClick={() => setPage(p => p + 1)} className="disabled:opacity-30">{t.next}</button></div>
    {selected && <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
      <div className="mb-4 flex justify-between"><h3 className="font-bold">{t.transcript} #{selected}</h3><button onClick={() => setSelected(null)} className="text-sm text-primary">{t.close}</button></div>
      {detail?.load_id && <p className="mb-3 text-sm text-emerald-600">{t.published} #{String(detail.load_id)}</p>}
      {!detail ? <p role="status">…</p> : <div className="max-h-96 space-y-4 overflow-y-auto">{messages.map(message => {
        const text = message.body.replace(/\[\[[\s\S]*?\]\]/g, '').trim();
        if (!text) return null;
        return <div key={message.id} className="text-sm"><p className="mb-1 text-xs font-bold text-slate-500">{message.sender?.username === 'ai_dispatcher' ? 'Lena' : t.guest} · {new Date(message.sent_at).toLocaleTimeString(lang)}</p><p className="whitespace-pre-wrap break-words">{text}</p></div>;
      })}</div>}
    </div>}
  </section>;
}
