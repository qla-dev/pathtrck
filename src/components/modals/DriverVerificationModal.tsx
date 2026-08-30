import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Eye,
  FileText,
  Hash,
  IdCard,
  Loader2,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { confirmAction, showError } from '../../lib/swal';
import { api } from '../../services/api';
import { Button } from '../ui/Button';

type DriverVerificationModalProps = {
  open: boolean;
  lang: Language;
  userId: number | null;
  onClose: () => void;
  onChanged?: () => void;
};

type DocumentRow = Record<string, unknown>;

export type DriverDocumentType =
  | 'DRIVING_LICENCE'
  | 'CODE_95'
  | 'PASSPORT_ID'
  | 'DRIVER_ATTESTATION'
  | 'ADR_CERTIFICATE';

type Slot = {
  type: DriverDocumentType;
  labelKey: string;
  label: string;
  hintKey: string;
  hint: string;
  required: boolean;
  /** Required only once the driver says the condition applies to them. */
  conditional?: 'attestation' | 'adr';
  accent: string;
};

const SLOTS: Slot[] = [
  {
    type: 'DRIVING_LICENCE',
    labelKey: 'driverVerification.drivingLicence',
    label: 'Driving licence',
    hintKey: 'driverVerification.drivingLicenceHint',
    hint: 'Both sides, valid for the categories you drive.',
    required: true,
    accent: 'text-sky-500',
  },
  {
    type: 'CODE_95',
    labelKey: 'driverVerification.code95',
    label: 'Code 95',
    hintKey: 'driverVerification.code95Hint',
    hint: 'Driver CPC card or the licence entry showing code 95.',
    required: false,
    accent: 'text-violet-500',
  },
  {
    type: 'PASSPORT_ID',
    labelKey: 'driverVerification.passportId',
    label: 'Passport / ID number',
    hintKey: 'driverVerification.passportIdHint',
    hint: 'Passport or national ID used at border crossings.',
    required: true,
    accent: 'text-emerald-500',
  },
  {
    type: 'DRIVER_ATTESTATION',
    labelKey: 'driverVerification.attestation',
    label: 'Driver Attestation',
    hintKey: 'driverVerification.attestationHint',
    hint: 'Where applicable — non-EU drivers working for an EU operator.',
    required: false,
    conditional: 'attestation',
    accent: 'text-amber-500',
  },
  {
    type: 'ADR_CERTIFICATE',
    labelKey: 'driverVerification.adr',
    label: 'ADR certificate',
    hintKey: 'driverVerification.adrHint',
    hint: 'Only if you carry dangerous goods.',
    required: false,
    conditional: 'adr',
    accent: 'text-rose-500',
  },
];

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';
const MAX_BYTES = 25 * 1024 * 1024;

const formatSize = (bytes: unknown) => {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value: unknown) => {
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : '';
};

export const DriverVerificationModal = ({ open, lang, userId, onClose, onChanged }: DriverVerificationModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingType, setUploadingType] = useState<DriverDocumentType | null>(null);
  const [dragType, setDragType] = useState<DriverDocumentType | null>(null);
  const [error, setError] = useState('');
  // The last two slots only become obligations once the driver states they apply, so the checklist
  // never demands a certificate a domestic non-ADR driver will never hold.
  const [carriesAdr, setCarriesAdr] = useState(false);
  const [needsAttestation, setNeedsAttestation] = useState(false);
  // The number printed on the document. Typed before an upload it rides along with the file;
  // typed afterwards it is saved onto the rows already filed under that slot.
  const [references, setReferences] = useState<Partial<Record<DriverDocumentType, string>>>({});
  const [savingReference, setSavingReference] = useState<DriverDocumentType | null>(null);

  const reload = async (id: number) => {
    setLoading(true);
    try {
      const response = await api.documents.list({ user_id: id, per_page: 200 });
      const rows = response.data as DocumentRow[];
      setDocuments(rows);
      setReferences((current) => {
        const next = { ...current };
        for (const row of rows) {
          const type = String(row.type || '') as DriverDocumentType;
          const reference = String(row.reference || '').trim();
          if (reference && !next[type]) next[type] = reference;
        }
        return next;
      });
      setError('');
    } catch {
      setError(u('driverVerification.loadFailed', 'Your documents could not be loaded.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !userId) return undefined;
    void reload(userId);
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !uploadingType) onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  const byType = useMemo(() => {
    const map = new Map<string, DocumentRow[]>();
    for (const document of documents) {
      const key = String(document.type || 'OTHER');
      map.set(key, [...(map.get(key) || []), document]);
    }
    return map;
  }, [documents]);

  const isRequired = (slot: Slot) =>
    slot.required
    || (slot.conditional === 'adr' && carriesAdr)
    || (slot.conditional === 'attestation' && needsAttestation);

  const requiredSlots = SLOTS.filter(isRequired);
  const satisfied = requiredSlots.filter((slot) => (byType.get(slot.type) || []).length > 0);
  const percent = requiredSlots.length === 0 ? 100 : Math.round((satisfied.length / requiredSlots.length) * 100);
  const complete = satisfied.length === requiredSlots.length;

  const uploadFiles = async (slot: Slot, files: File[]) => {
    if (!userId || files.length === 0) return;
    const tooBig = files.find((file) => file.size > MAX_BYTES);
    if (tooBig) {
      void showError(
        u('driverVerification.fileTooBigTitle', 'File is too large'),
        `${tooBig.name} — ${u('driverVerification.fileTooBigText', 'the maximum upload size is 25 MB.')}`
      );
      return;
    }

    setUploadingType(slot.type);
    try {
      for (const file of files) {
        await api.documents.upload({ file, userId, type: slot.type, name: file.name, reference: references[slot.type] || null });
      }
      await reload(userId);
      onChanged?.();
    } catch {
      void showError(
        u('driverVerification.uploadFailedTitle', 'Upload failed'),
        u('driverVerification.uploadFailedText', 'The document could not be uploaded. Please try again.')
      );
    } finally {
      setUploadingType(null);
    }
  };

  const saveReference = async (slot: Slot) => {
    const reference = (references[slot.type] || '').trim();
    const rows = byType.get(slot.type) || [];
    // Nothing filed yet: the value waits in state and is attached to the first upload instead.
    if (rows.length === 0 || rows.every((row) => String(row.reference || '') === reference)) return;
    setSavingReference(slot.type);
    try {
      await Promise.all(rows.map((row) => api.documents.update(Number(row.id), { reference })));
      if (userId) await reload(userId);
    } catch {
      void showError(
        u('driverVerification.referenceFailedTitle', 'Could not save the number'),
        u('driverVerification.referenceFailedText', 'The document number could not be saved. Please try again.')
      );
    } finally {
      setSavingReference(null);
    }
  };

  const removeDocument = async (document: DocumentRow) => {
    const confirmed = await confirmAction({
      title: u('driverVerification.removeTitle', 'Remove this document?'),
      text: String(document.name || ''),
      confirmText: u('driverVerification.remove', 'Remove'),
      icon: 'warning',
    });
    if (!confirmed || !userId) return;
    try {
      await api.documents.remove(Number(document.id));
      await reload(userId);
      onChanged?.();
    } catch {
      void showError(
        u('driverVerification.removeFailedTitle', 'Could not remove'),
        u('driverVerification.removeFailedText', 'The document could not be removed. Please try again.')
      );
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[230] flex items-stretch justify-center overflow-hidden bg-slate-950/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget && !uploadingType) onClose(); }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5 md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white transition-colors', complete ? 'bg-emerald-500' : 'bg-primary')}>
                  {complete ? <BadgeCheck className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black dark:text-white">{u('driverVerification.title', 'Driver verification')}</h2>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{u('driverVerification.subtitle', 'Upload the documents that let you take loads across borders.')}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={cn(
                  'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold sm:inline-flex',
                  complete
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400'
                )}>
                  {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
                  {satisfied.length}/{requiredSlots.length} {u('driverVerification.required', 'required')}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={Boolean(uploadingType)}
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="w-full space-y-3 p-3 pb-6 sm:p-4 sm:pb-6">
                <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                    <p className="text-xs font-black uppercase tracking-wider">{u('driverVerification.progress', 'Verification progress')}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <span className={cn('text-3xl font-black tabular-nums', complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>{percent}%</span>
                    <div className="min-w-[12rem] flex-1">
                      <div
                        className={cn('h-2 w-full overflow-hidden rounded-full', complete ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-amber-100 dark:bg-amber-500/15')}
                        role="img"
                        aria-label={`${u('driverVerification.progress', 'Verification progress')}: ${percent}%`}
                      >
                        <div className={cn('h-full rounded-full transition-all duration-500', complete ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${percent}%` }} />
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        {complete
                          ? u('driverVerification.completeHint', 'Every required document is on file.')
                          : u('driverVerification.incompleteHint', 'Documents marked with * are required before you can be verified.')}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-slate-500">
                      {satisfied.length} / {requiredSlots.length} {u('driverVerification.required', 'required')}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 p-10 text-sm text-slate-500 dark:border-slate-800">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    {u('common.loading', 'Loading...')}
                  </div>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-3">
                    {/* Leads the grid: what the driver switches on here is what turns the last two
                        slots into obligations. */}
                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-emerald-500">
                        <IdCard className="h-4 w-4 shrink-0" />
                        <p className="truncate text-xs font-black uppercase tracking-wider">{u('driverVerification.appliesToMe', 'What applies to me')}</p>
                      </div>
                      <p className="text-[11px] leading-tight text-slate-500">{u('driverVerification.appliesToMeHint', 'Turn these on and the matching document becomes required.')}</p>
                      <div className="space-y-2">
                        {[
                          { on: needsAttestation, set: setNeedsAttestation, title: u('driverVerification.attestation', 'Driver Attestation'), description: u('driverVerification.attestationToggle', 'I am a non-EU driver for an EU operator'), icon: FileText },
                          { on: carriesAdr, set: setCarriesAdr, title: u('driverVerification.adr', 'ADR certificate'), description: u('driverVerification.adrToggle', 'I carry dangerous goods'), icon: AlertTriangle },
                        ].map((toggle) => {
                          const ToggleIcon = toggle.icon;
                          return (
                            <button
                              key={toggle.title}
                              type="button"
                              onClick={() => toggle.set(!toggle.on)}
                              aria-pressed={toggle.on}
                              className={cn(
                                'flex w-full cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all',
                                toggle.on
                                  ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
                                  : 'border-slate-200 bg-white hover:border-primary/40 hover:bg-primary/5 dark:border-slate-800 dark:bg-slate-950'
                              )}
                            >
                              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', toggle.on ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>
                                <ToggleIcon className="h-3.5 w-3.5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-bold dark:text-white">{toggle.title}</span>
                                <span className="block truncate text-[11px] leading-tight text-slate-500">{toggle.description}</span>
                              </span>
                              <span className={cn('h-4 w-4 shrink-0 rounded-full border-2 transition-colors', toggle.on ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600')} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {SLOTS.map((slot) => {
                      const files = byType.get(slot.type) || [];
                      const required = isRequired(slot);
                      const done = files.length > 0;
                      const busy = uploadingType === slot.type;
                      const dragging = dragType === slot.type;
                      return (
                        <div
                          key={slot.type}
                          className={cn(
                            'flex flex-col gap-3 rounded-2xl border p-4 transition-colors',
                            done ? 'border-emerald-200 dark:border-emerald-500/25' : required ? 'border-amber-200 dark:border-amber-500/25' : 'border-slate-200 dark:border-slate-800'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className={cn('flex min-w-0 items-center gap-2', slot.accent)}>
                              <FileText className="h-4 w-4 shrink-0" />
                              <p className="truncate text-xs font-black uppercase tracking-wider">
                                {u(slot.labelKey, slot.label)}{required ? ' *' : ''}
                              </p>
                            </div>
                            <span className={cn(
                              'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                              done
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : required
                                  ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400'
                                  : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-950'
                            )}>
                              {done ? <CheckCircle2 className="h-3 w-3" /> : required ? <TriangleAlert className="h-3 w-3" /> : null}
                              {done ? u('driverVerification.onFile', 'On file') : required ? u('driverVerification.missing', 'Missing') : u('driverVerification.optional', 'Optional')}
                            </span>
                          </div>

                          <p className="text-[11px] leading-tight text-slate-500">{u(slot.hintKey, slot.hint)}</p>

                          <label
                            onDragOver={(event) => { event.preventDefault(); setDragType(slot.type); }}
                            onDragLeave={() => setDragType((current) => (current === slot.type ? null : current))}
                            onDrop={(event) => {
                              event.preventDefault();
                              setDragType(null);
                              void uploadFiles(slot, Array.from(event.dataTransfer.files || []));
                            }}
                            className={cn(
                              'group relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-4 text-center transition-colors',
                              busy
                                ? 'border-primary bg-primary/5'
                                : dragging
                                  ? 'border-primary bg-primary/10'
                                  : done
                                    ? 'border-emerald-300 bg-emerald-50/60 hover:border-primary hover:bg-primary/5 dark:border-emerald-500/30 dark:bg-emerald-950/10'
                                    : 'border-slate-300 hover:border-primary hover:bg-primary/5 dark:border-slate-700'
                            )}
                          >
                            <input
                              type="file"
                              multiple
                              accept={ACCEPT}
                              className="sr-only"
                              disabled={busy}
                              onChange={(event) => {
                                void uploadFiles(slot, Array.from(event.target.files || []));
                                event.target.value = '';
                              }}
                            />
                            <span className={cn(
                              'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                              busy ? 'bg-primary text-white' : done ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-primary/10 text-primary'
                            )}>
                              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                              {busy ? u('driverVerification.uploading', 'Uploading...') : u('driverVerification.dropHere', 'Drop a file or click to browse')}
                            </span>
                            <span className="text-[10px] text-slate-400">{u('driverVerification.accepted', 'PDF or image, up to 25 MB')}</span>
                          </label>

                          {files.length > 0 && (
                            <div className="space-y-1.5">
                              {files.map((document) => (
                                <div key={String(document.id)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 dark:bg-slate-900">
                                    <FileText className="h-3.5 w-3.5" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[11px] font-bold text-slate-800 dark:text-slate-200" title={String(document.name || '')}>{String(document.name || '')}</span>
                                    <span className="block truncate text-[10px] text-slate-500">
                                      {[formatSize(document.size_bytes), formatDate(document.created_at)].filter(Boolean).join(' · ')}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    title={u('driverVerification.view', 'View')}
                                    onClick={() => api.documents.open(Number(document.id), String(document.name || 'document'), true)}
                                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-primary dark:hover:bg-slate-900"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    title={u('driverVerification.remove', 'Remove')}
                                    onClick={() => void removeDocument(document)}
                                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-rose-500 dark:hover:bg-slate-900"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="relative mt-auto">
                            <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                              value={references[slot.type] || ''}
                              onChange={(event) => setReferences((current) => ({ ...current, [slot.type]: event.target.value }))}
                              onBlur={() => void saveReference(slot)}
                              placeholder={u('driverVerification.documentNumber', 'Document number')}
                              aria-label={`${u(slot.labelKey, slot.label)} - ${u('driverVerification.documentNumber', 'Document number')}`}
                              className="h-10 w-full cursor-text rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                            />
                            {savingReference === slot.type && (
                              <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-primary" />
                            )}
                          </div>
                        </div>
                      );
                    })}

                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40 sm:px-5 md:px-6">
              <p className={cn('flex items-center gap-1.5 text-xs font-bold', complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                {complete ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
                {complete
                  ? u('driverVerification.completeHint', 'Every required document is on file.')
                  : u('driverVerification.incompleteHint', 'Documents marked with * are required before you can be verified.')}
              </p>
              <Button className="h-10" disabled={Boolean(uploadingType)} onClick={onClose}>
                {u('common.done', 'Done')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
