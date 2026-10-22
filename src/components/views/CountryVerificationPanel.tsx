import { useOpsCopy } from './opsCopy';
import { DataTable } from '../ui/DataTable';
import { ShieldCheck, FileCheck2, Clock3, BadgeCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { api } from '../../services/api';

import { Button } from '../ui/Button';

import { Notice } from '../ui/Notice';



type Row = Record<string, any>;

const field = 'rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

const labels: Record<string, string> = { customer: 'Kupac / naručilac', carrier: 'Prevoznik', forwarder: 'Špediter', warehouse: 'Skladišni partner', customs_representative: 'Carinski zastupnik', overseas_agent: 'Overseas agent', driver: 'Vozač', domestic: 'Domaća aktivnost', international: 'Međunarodna aktivnost', own_account: 'Za vlastite potrebe', submitted: 'Podneseno', in_review: 'U provjeri', supplement_requested: 'Tražena dopuna', verified: 'Provjereno', rejected: 'Odbijeno', suspended: 'Suspendovano', expired: 'Isteklo' };



export function CountryVerificationPanel({ company, canSetup, showTemplates = false, members = [] }: { company: number; canSetup: boolean; showTemplates?: boolean; members?: Row[] }) {

  const {t}=useOpsCopy();
  const [data, setData] = useState<Row | null>(null), [country, setCountry] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState<Row>({ capability: 'customer', activity: 'domestic', registry_reference: '', expires_at: '', document_ids: [] });

  const [admin, setAdmin] = useState(false), [review, setReview] = useState<Row | null>(null), [templates, setTemplates] = useState<Row[]>([]);

  const [template, setTemplate] = useState<Row[]>([]);

  const load = useCallback(async () => {

    const r = await api.accounting.get<Row>(company, 'country-profile'); setData(r.data); setCountry(current => current || r.data.default_country_code || r.data.profile?.country_code || 'BA');

    if (showTemplates) { const v = await api.accounting.get<Row[]>(company, 'ops/checklist-versions'); setTemplates(v.data); }

  }, [company, showTemplates]);

  useEffect(() => { setData(null); setCountry(''); setError(''); void load().catch(e => setError(e.message)); void api.auth.me().then(u => setAdmin(['superadmin','master'].includes(String(u.role?.name)))).catch(() => setAdmin(false)); }, [load]);

  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setError(''); try { await fn(); await load(); setReview(null); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } };

  if (!data) return <Notice tone={error ? 'bad' : 'info'}>{error || t('Učitavanje postavki…')}</Notice>;

  const canManage = Boolean(data.can_manage ?? canSetup);

  return <section className="space-y-4" aria-label={t("Verifikacija firme")}>

    {error && <Notice tone="bad">{error}</Notice>}

    <header className="flex items-center gap-3"><span className="rounded-xl bg-sky-500/10 p-3 text-sky-600"><ShieldCheck className="h-6 w-6"/></span><div><h3 className="font-bold">{t("Verifikacija firme")}</h3><p className="text-sm text-slate-500">{t("Podaci firme, dokumentacija i status pregleda na jednom mjestu.")}</p></div></header>
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-900 dark:bg-sky-950"><strong>{data.company?.name}</strong><p>{t('Firma je automatski preuzeta iz vašeg postojećeg profila. Nije potrebno ponovno dodavanje firme.')}</p></div>
    <div className="grid gap-3 sm:grid-cols-3">{[[FileCheck2,'Zahtjevi',data.verifications.filter((v:Row)=>v.capability!=='driver').length],[Clock3,'U obradi',data.verifications.filter((v:Row)=>v.capability!=='driver'&&['submitted','in_review','supplement_requested'].includes(v.effective_status)).length],[BadgeCheck,'Provjereno',data.verifications.filter((v:Row)=>v.capability!=='driver'&&v.effective_status==='verified').length]].map(([Icon,label,count])=>{const StatusIcon=Icon as typeof ShieldCheck;return <div key={t(String(label))} className="flex items-center gap-3 rounded-xl border p-4 dark:border-slate-700"><StatusIcon className="h-5 w-5 text-sky-600"/><div><p className="text-xs text-slate-500">{t(String(label))}</p><strong className="text-xl">{Number(count)}</strong></div></div>;})}</div>

    <p className="text-sm text-slate-500">{t("Verifikacija firme i verifikacija vozača imaju odvojene statuse i dokumente. Vozačke dozvole, identifikacija i primjenjivi certifikati uređuju se kroz postojeću verifikaciju u profilu vozača.")}</p>

    <div className="flex flex-wrap items-end gap-3"><label className="grid gap-1">{t("Sjedište kompanije")}<select className={field} disabled={!canManage || busy} value={country} onChange={e => setCountry(e.target.value)}>{Object.entries(data.rules.countries).map(([code, pack]) => <option value={code} key={code}>{t((pack as Row).name)}</option>)}</select></label>

      <p className="text-sm">{data.rules.countries[country].currency}{t("·")}{data.rules.countries[country].timezone}{t("·")}{data.rules.countries[country].language}</p>

      {canManage && <Button type="button" size="sm" disabled={busy} onClick={() => void run(() => api.accounting.send(company, 'country-profile', { country_code: country, revision: data.profile?.revision || 0 }, 'PUT'))}>{t("Sačuvaj postavke")}</Button>}</div>

    <details className="rounded-xl border p-3 dark:border-slate-700"><summary className="cursor-pointer text-sm font-semibold">{t("Službeni izvori i pravila provjere")}</summary>
    <div className="overflow-x-auto"><DataTable className="w-full text-left text-sm"><thead><tr><th className="p-2">{t("Država")}</th><th className="p-2">{t("Službeni izvor za provjeru")}</th><th className="p-2">{t("Obavezan upload")}</th></tr></thead><tbody>{Object.entries(data.rules.sources).map(([code, link]) => <tr className="border-t dark:border-slate-700" key={code}><td className="p-2">{code}</td><td className="p-2"><a className="text-primary underline" href={String(link)} target="_blank" rel="noreferrer">{t("Nadležni organ / propis")}</a></td><td className="p-2">{t("Nije aktiviran bez potvrde primjenjivosti")}</td></tr>)}</tbody></DataTable></div>

    <p className="mt-2 text-xs text-slate-500">{t("Pravna matrica je nacrt. Potrebni dokazi zavise od potvrđene primjenjivosti; upload sam po sebi ne potvrđuje verifikaciju.")}</p></details>
    <h4 className="font-semibold">{t("Verifikacija poslovne sposobnosti")}</h4>

    <div className="overflow-x-auto"><DataTable className="w-full text-left text-sm"><thead><tr>{['Država / aktivnost','Sposobnost','Status','Važenje','Razlog / odluka',''].map((x, i) => <th className="p-2" key={i}>{t(x)}</th>)}</tr></thead><tbody>{data.verifications.map((v: Row) => <tr className="border-t dark:border-slate-700" key={v.id}><td className="p-2">{v.country_code}{t("·")}{t(labels[v.activity])}</td><td className="p-2">{t(labels[v.capability])}{v.subject_user_id && ` · korisnik #${v.subject_user_id}`}{v.document_ids.map((id: number) => <button className="block text-xs text-primary underline" key={id} onClick={() => void run(() => api.accounting.verificationEvidence(company, id))}>{t("Preuzmi dokaz #")}{id}</button>)}</td><td className="p-2">{t(labels[v.effective_status])}<small className="block">{t("Zahtjev #")}{v.id}{t(", rev.")}{v.revision}</small></td><td className="p-2">{v.expires_at || t('Nije naveden')}</td><td className="p-2">{v.reason || t('Čeka pregled')}</td><td className="p-2">{admin && <Button type="button" size="sm" variant="outline" onClick={() => setReview({ id: v.id, revision: v.revision, status: v.status === 'submitted' || v.status === 'suspended' ? 'in_review' : v.status === 'verified' ? 'suspended' : 'verified', reason: '', verification_method: 'registry' })}>{t("Pregled")}</Button>}</td></tr>)}</tbody></DataTable></div>

    {canManage && <form className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); void run(async () => { await api.accounting.send(company, 'verifications', { ...draft, subject_user_id: draft.capability === 'driver' ? draft.subject_user_id || null : null, country_code: country, registry_reference: draft.registry_reference || null, expires_at: draft.expires_at || null }); setDraft({ ...draft, document_ids: [] }); }); }}>

      <h4 className="font-semibold sm:col-span-2">{t("Novi zahtjev (")}{country}{t(")")}</h4>

      <label className="grid gap-1">{t("Sposobnost")}<select className={field} value={draft.capability} onChange={e => setDraft({ ...draft, capability: e.target.value })}>{data.rules.capabilities.filter((s:string)=>s!=='driver').map((s: string) => <option key={s} value={s}>{t(labels[s])}</option>)}</select></label>

      <label className="grid gap-1">{t("Aktivnost")}<select className={field} value={draft.activity} onChange={e => setDraft({ ...draft, activity: e.target.value })}>{data.rules.activities.map((s: string) => <option key={s} value={s}>{t(labels[s])}</option>)}</select></label>

      {draft.capability === 'driver' && <label className="grid gap-1">{t("Vozač / član kompanije")}<select className={field} value={draft.subject_user_id || ''} onChange={e => setDraft({ ...draft, subject_user_id: Number(e.target.value) || null })}><option value="">{t("Izaberite člana")}</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}

      <label className="grid gap-1">{t("Referenca javnog registra")}<input className={field} type="url" value={draft.registry_reference} onChange={e => setDraft({ ...draft, registry_reference: e.target.value })} /></label>

      <label className="grid gap-1">{t("Važenje dokumentacije")}<input className={field} type="date" value={draft.expires_at} onInput={e=>setDraft({...draft,expires_at:e.currentTarget.value})} onChange={e => setDraft({ ...draft, expires_at: e.target.value })} /></label>

      <label className="grid gap-1 sm:col-span-2">{t("Priloži dokaz (samo potreban dokument; PDF/slika)")}<input type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void run(async () => { const doc = await api.documents.upload({ file, type: 'capability_evidence' }); setDraft(d => ({ ...d, document_ids: [...d.document_ids, Number(doc.id)] })); }); }} /><small>{draft.document_ids.length}{t("prilog(a). Upload nije verifikacija. Za dopunu podnesite novu verziju zahtjeva; raniji ostaje u historiji.")}</small></label>

      <Button type="submit" size="sm" disabled={busy}>{t("Podnesi na provjeru")}</Button>

    </form>}

    {review && <form className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); void run(() => api.accounting.send(company, `verifications/${review.id}/review`, review, 'PATCH')); }}>

      <label className="grid gap-1">{t("Odluka")}<select className={field} value={review.status} onChange={e => setReview({ ...review, status: e.target.value })}>{['in_review','supplement_requested','verified','rejected','suspended'].map(s => <option value={s} key={s}>{t(labels[s])}</option>)}</select></label>

      <label className="grid gap-1">{t("Metoda provjere")}<select className={field} value={review.verification_method} onChange={e => setReview({ ...review, verification_method: e.target.value })}><option value="registry">{t("Registar")}</option><option value="manual_document">{t("Dokument")}</option><option value="combined">{t("Kombinovano")}</option></select></label>

      <label className="grid gap-1 sm:col-span-2">{t("Obrazloženje")}<textarea required className={field} value={review.reason} onChange={e => setReview({ ...review, reason: e.target.value })} /></label><Button type="submit" size="sm" disabled={busy}>{t("Evidentiraj pregled")}</Button>

    </form>}

    {canManage && showTemplates && <details className="rounded-xl border p-3 dark:border-slate-700"><summary className="cursor-pointer font-semibold">{t("Verzionisani šabloni checkliste za ručne naloge")}</summary><p className="my-2 text-sm">{t("Objava važi za nove ručne naloge. Aktivni nalozi čuvaju snimljenu verziju, a shipment nalozi koriste svoju postojeću checklistu.")}</p><p className="text-sm">{t("Objavljene verzije:")}{templates.map(v => v.version).join(', ') || t('ugrađena osnova')}</p>

      {template.map((x, i) => <div className="my-2 grid gap-2 sm:grid-cols-3" key={i}><input aria-label="Šifra stavke" className={field} placeholder="sifra_stavke" value={x.key} onChange={e => setTemplate(t => t.map((v, n) => i === n ? { ...v, key: e.target.value } : v))} /><input aria-label={t("Naziv stavke")} className={field} placeholder={t("Naziv stavke")} value={x.label} onChange={e => setTemplate(t => t.map((v, n) => i === n ? { ...v, label: e.target.value } : v))} /><select aria-label={t("Uslov primjene")} className={field} value={x.applies_when?.[0] || ''} onChange={e => setTemplate(t => t.map((v, n) => i === n ? { ...v, applies_when: e.target.value ? [e.target.value] : [] } : v))}><option value="">{t("Uvijek primjenjiva")}</option><option value="inspection_required">{t("Inspekcija")}</option><option value="dangerous_goods">{t("Opasna roba")}</option><option value="temperature_controlled">{t("Temperaturni režim")}</option></select></div>)}

      <div className="mt-2 flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setTemplate([...template, { key: '', label: '', applies_when: [] }])}>{t("Dodaj stavku")}</Button><Button type="button" size="sm" disabled={busy || !template.length} onClick={() => void run(async () => { await api.accounting.send(company, 'ops/checklist-versions', { items: template }); setTemplate([]); })}>{t("Objavi novu verziju")}</Button></div>

    </details>}

  </section>;

}
