import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { LoaderCircle, MessageSquareText, Send, SlidersHorizontal, Star, X } from 'lucide-react';

import type { Language, Role } from '../../types';
import { ApiError, api, type ApiEnvelope } from '../../services/api';
import { showSuccess } from '../../lib/swal';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';

export type ReviewMode = 'company' | 'warehouse' | 'customer' | 'driver' | 'load';

export type ReviewSummary = {
  reviews: Array<Record<string, unknown>>;
  averageRating: number;
  total: number;
  hasReviewed: boolean;
  canReview: boolean;
  myReview: Record<string, unknown> | null;
};

type Question = { key: string; label: string };

const QUESTIONS: Record<'en' | 'bs' | 'de', Record<ReviewMode, Question[]>> = {
  en: {
    company: [{ key: 'communication', label: 'Communication' }, { key: 'reliability', label: 'Reliability' }, { key: 'service_quality', label: 'Service quality' }],
    warehouse: [{ key: 'facility_quality', label: 'Facility quality' }, { key: 'handling_efficiency', label: 'Handling efficiency' }, { key: 'staff_communication', label: 'Staff communication' }],
    customer: [{ key: 'communication', label: 'Communication' }, { key: 'payment_reliability', label: 'Payment reliability' }, { key: 'cooperation', label: 'Cooperation' }],
    driver: [{ key: 'punctuality', label: 'Punctuality' }, { key: 'cargo_care', label: 'Cargo care' }, { key: 'communication', label: 'Communication' }],
    load: [{ key: 'description_accuracy', label: 'Description accuracy' }, { key: 'route_readiness', label: 'Pickup and delivery readiness' }, { key: 'execution', label: 'Overall execution' }],
  },
  bs: {
    company: [{ key: 'communication', label: 'Komunikacija' }, { key: 'reliability', label: 'Pouzdanost' }, { key: 'service_quality', label: 'Kvalitet usluge' }],
    warehouse: [{ key: 'facility_quality', label: 'Kvalitet objekta' }, { key: 'handling_efficiency', label: 'Efikasnost rukovanja' }, { key: 'staff_communication', label: 'Komunikacija osoblja' }],
    customer: [{ key: 'communication', label: 'Komunikacija' }, { key: 'payment_reliability', label: 'Pouzdanost plaćanja' }, { key: 'cooperation', label: 'Saradnja' }],
    driver: [{ key: 'punctuality', label: 'Tačnost' }, { key: 'cargo_care', label: 'Briga o teretu' }, { key: 'communication', label: 'Komunikacija' }],
    load: [{ key: 'description_accuracy', label: 'Tačnost opisa' }, { key: 'route_readiness', label: 'Spremnost utovara i istovara' }, { key: 'execution', label: 'Ukupna realizacija' }],
  },
  de: {
    company: [{ key: 'communication', label: 'Kommunikation' }, { key: 'reliability', label: 'Zuverlässigkeit' }, { key: 'service_quality', label: 'Servicequalität' }],
    warehouse: [{ key: 'facility_quality', label: 'Qualität der Anlage' }, { key: 'handling_efficiency', label: 'Effizienz der Abwicklung' }, { key: 'staff_communication', label: 'Kommunikation des Personals' }],
    customer: [{ key: 'communication', label: 'Kommunikation' }, { key: 'payment_reliability', label: 'Zahlungszuverlässigkeit' }, { key: 'cooperation', label: 'Zusammenarbeit' }],
    driver: [{ key: 'punctuality', label: 'Pünktlichkeit' }, { key: 'cargo_care', label: 'Umgang mit der Fracht' }, { key: 'communication', label: 'Kommunikation' }],
    load: [{ key: 'description_accuracy', label: 'Genauigkeit der Beschreibung' }, { key: 'route_readiness', label: 'Bereitschaft bei Abholung und Zustellung' }, { key: 'execution', label: 'Gesamtabwicklung' }],
  },
};

const COPY = {
  en: { quickTitle: 'Leave a quick review', quickText: 'How was your experience with', adjust: 'Adjust more', post: 'Post a review', posting: 'Posting…', fullTitle: 'Share your experience', publicText: 'Your review helps other Freightbook partners make better decisions.', overall: 'Overall rating', details: 'Rate the details', comment: 'Describe your experience (optional)', placeholder: 'Share useful details about communication, reliability and the completed service.', cancel: 'Cancel', error: 'The review could not be submitted.', star: 'stars' },
  bs: { quickTitle: 'Ostavite brzu recenziju', quickText: 'Kako biste ocijenili iskustvo sa', adjust: 'Detaljnije', post: 'Objavi recenziju', posting: 'Objavljivanje…', fullTitle: 'Podijelite svoje iskustvo', publicText: 'Vaša recenzija pomaže drugim Freightbook partnerima pri donošenju odluka.', overall: 'Ukupna ocjena', details: 'Ocijenite detalje', comment: 'Opišite svoje iskustvo (nije obavezno)', placeholder: 'Podijelite korisne detalje o komunikaciji, pouzdanosti i završenoj usluzi.', cancel: 'Odustani', error: 'Recenziju nije moguće objaviti.', star: 'zvjezdica' },
  de: { quickTitle: 'Kurze Bewertung abgeben', quickText: 'Wie war Ihre Erfahrung mit', adjust: 'Detaillierter', post: 'Bewertung veröffentlichen', posting: 'Wird veröffentlicht…', fullTitle: 'Teilen Sie Ihre Erfahrung', publicText: 'Ihre Bewertung hilft anderen Freightbook-Partnern bei besseren Entscheidungen.', overall: 'Gesamtbewertung', details: 'Details bewerten', comment: 'Erfahrung beschreiben (optional)', placeholder: 'Teilen Sie hilfreiche Details zu Kommunikation, Zuverlässigkeit und Leistung.', cancel: 'Abbrechen', error: 'Die Bewertung konnte nicht veröffentlicht werden.', star: 'Sterne' },
} as const;

const EDIT_COPY = {
  en: { title: 'Edit your review', post: 'Save review', posting: 'Saving…' },
  bs: { title: 'Uredite svoju recenziju', post: 'Sačuvaj recenziju', posting: 'Čuvanje…' },
  de: { title: 'Bewertung bearbeiten', post: 'Bewertung speichern', posting: 'Wird gespeichert…' },
} as const;

const locale = (lang: Language): 'en' | 'bs' | 'de' => lang === 'bs' || lang === 'de' ? lang : 'en';

const summaryFrom = (response: ApiEnvelope<Array<Record<string, unknown>>>): ReviewSummary => ({
  reviews: response.data,
  averageRating: Number(response.meta?.average_rating || 0),
  total: Number(response.meta?.total || response.data.length),
  hasReviewed: Boolean(response.meta?.has_reviewed),
  canReview: Boolean(response.meta?.can_review),
  myReview: response.meta?.my_review || null,
});

const StarPicker = ({ value, onChange, label, large = false }: { value: number; onChange: (rating: number) => void; label: string; large?: boolean }) => {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onMouseEnter={() => setHovered(rating)}
          onFocus={() => setHovered(rating)}
          onBlur={() => setHovered(0)}
          onClick={() => onChange(rating)}
          aria-label={`${rating} ${label}`}
          className="cursor-pointer rounded-md p-0.5 text-slate-300 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-600"
        >
          <Star className={cn(large ? 'h-8 w-8' : 'h-6 w-6', rating <= shown && 'fill-amber-400 text-amber-400')} />
        </button>
      ))}
    </div>
  );
};

export const ReviewComposer = ({
  mode,
  targetId,
  targetName,
  viewerRole,
  lang,
  onSummaryChange,
  submitLabel,
  submittingLabel,
  onSubmitted,
}: {
  mode: ReviewMode;
  targetId: number | string;
  targetName: string;
  viewerRole: Role;
  lang: Language;
  onSummaryChange?: (summary: ReviewSummary) => void;
  submitLabel?: string;
  submittingLabel?: string;
  onSubmitted?: (summary: ReviewSummary) => void | Promise<void>;
}) => {
  const language = locale(lang);
  const text = COPY[language];
  const questions = QUESTIONS[language][mode];
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [rating, setRating] = useState(0);
  const [criteria, setCriteria] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const protectedRole = viewerRole === 'superadmin' || viewerRole === 'master' || viewerRole === null;

  const blankCriteria = useMemo(
    () => Object.fromEntries(questions.map((question) => [question.key, 0])),
    [questions],
  );

  useEffect(() => {
    if (protectedRole || !targetId) return undefined;
    let active = true;
    setSummary(null);
    setRating(0);
    setCriteria(blankCriteria);
    setComment('');
    setError('');
    api.reviews.list(mode, targetId)
      .then((response) => {
        if (!active) return;
        const next = summaryFrom(response);
        setSummary(next);
        if (next.myReview) {
          const savedCriteria = next.myReview.criteria;
          setRating(Number(next.myReview.rating || 0));
          setCriteria({
            ...blankCriteria,
            ...(savedCriteria && typeof savedCriteria === 'object'
              ? savedCriteria as Record<string, number>
              : {}),
          });
          setComment(String(next.myReview.comment || ''));
        }
        onSummaryChange?.(next);
      })
      .catch(() => {
        if (active) setSummary({ reviews: [], averageRating: 0, total: 0, hasReviewed: false, canReview: false, myReview: null });
      });
    return () => { active = false; };
  }, [blankCriteria, mode, onSummaryChange, protectedRole, targetId]);

  const submit = async (full: boolean) => {
    if (rating < 1) return;
    const submittedCriteria = full
      ? criteria
      : Object.fromEntries(questions.map((question) => [question.key, rating]));
    if (Object.values(submittedCriteria).some((score) => score < 1)) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await api.reviews.create({
        reviewable_type: mode,
        reviewable_id: targetId,
        rating,
        criteria: submittedCriteria,
        comment: comment.trim() || undefined,
      });
      const next = summaryFrom(response);
      setSummary(next);
      onSummaryChange?.(next);
      await onSubmitted?.(next);
      setExpanded(false);
      if (!submitLabel) void showSuccess(summary?.hasReviewed ? EDIT_COPY[language].post : text.post, text.publicText);
    } catch (caught) {
      const validation = caught instanceof ApiError ? Object.values(caught.errors).flat()[0] : null;
      setError(validation || (caught instanceof Error ? caught.message : text.error));
    } finally {
      setSubmitting(false);
    }
  };

  if (protectedRole || !summary?.canReview) return null;
  const editing = summary.hasReviewed;
  const actionCopy = editing ? EDIT_COPY[language] : null;

  return (
    <>
      <section className="rounded-3xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-900/60 dark:bg-sky-950/30">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm dark:bg-slate-900"><MessageSquareText className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h3 className="font-black text-slate-950 dark:text-white">{actionCopy?.title || text.quickTitle}</h3>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{text.quickText} <strong>{targetName}</strong>?</p>
            <div className="mt-3"><StarPicker value={rating} onChange={setRating} label={text.star} /></div>
          </div>
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => { setCriteria(Object.fromEntries(questions.map((question) => [question.key, rating]))); setExpanded(true); setError(''); }} className="cursor-pointer justify-center px-3">
            <SlidersHorizontal className="mr-2 h-4 w-4" />{text.adjust}
          </Button>
          <Button type="button" disabled={rating < 1 || submitting} onClick={() => void submit(false)} className="cursor-pointer justify-center px-3">
            {submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{submitting ? (submittingLabel || actionCopy?.posting || text.posting) : (submitLabel || actionCopy?.post || text.post)}
          </Button>
        </div>
      </section>

      {typeof document !== 'undefined' && createPortal(<AnimatePresence>
        {expanded && (
          <motion.div className="fixed left-0 top-0 z-[500] flex h-[100dvh] w-screen items-stretch justify-center bg-slate-950/70 p-0 backdrop-blur-sm md:items-center md:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="absolute inset-0 cursor-default" aria-label={text.cancel} onClick={() => !submitting && setExpanded(false)} />
            <motion.section className="relative z-10 flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900 md:h-auto md:max-h-[calc(100dvh-2.5rem)] md:rounded-3xl" initial={{ opacity: 0, y: 24, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.99 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} role="dialog" aria-modal="true">
              <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div><h2 className="text-lg font-black text-slate-950 dark:text-white">{text.fullTitle}</h2><p className="mt-1 text-sm text-slate-500">{targetName}</p></div>
                <button type="button" disabled={submitting} onClick={() => setExpanded(false)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-primary hover:text-primary dark:border-slate-700"><X className="h-4 w-4" /></button>
              </header>
              <div className="flex-1 space-y-6 overflow-y-auto p-5 md:p-7">
                <section className="text-center">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{text.overall}</p>
                  <div className="mt-3 flex justify-center"><StarPicker large value={rating} onChange={setRating} label={text.star} /></div>
                  <p className="mx-auto mt-3 max-w-md text-sm text-slate-500">{text.publicText}</p>
                </section>
                <section className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">{text.details}</h3>
                  {questions.map((question) => (
                    <div key={question.key} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{question.label}</span>
                      <StarPicker value={criteria[question.key] || 0} onChange={(score) => setCriteria((current) => ({ ...current, [question.key]: score }))} label={text.star} />
                    </div>
                  ))}
                </section>
                <label className="block"><span className="text-sm font-black text-slate-800 dark:text-slate-100">{text.comment}</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={4000} rows={6} placeholder={text.placeholder} className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
                {error && <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
              </div>
              <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                <Button type="button" variant="outline" disabled={submitting} onClick={() => setExpanded(false)}>{text.cancel}</Button>
                <Button type="button" disabled={submitting || rating < 1 || questions.some((question) => !criteria[question.key])} onClick={() => void submit(true)}>{submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{submitting ? (submittingLabel || actionCopy?.posting || text.posting) : (submitLabel || actionCopy?.post || text.post)}</Button>
              </footer>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </>
  );
};
