import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, FileSpreadsheet, Loader2, PackagePlus, Save, Sparkles } from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { api, BulkLoadRow } from '../../services/api';
import { latestLoadScan, LenaAttachment, LenaCanvasMode, scanPatchToDraftPayload } from '../../lib/lenaLoadCanvas';
import { buildScanFieldRows, ScanFieldPatch } from '../modals/scanFieldRows';
import { buildBulkLoadPayload } from '../modals/bulkLoadRows';
import { BulkLoadRowsTable } from '../modals/BulkLoadRowsTable';
import { HsCodeChip } from '../hs/HsCodeChip';

type LenaLoadCanvasProps = {
  lang: Language;
  mode: LenaCanvasMode;
  attachments: LenaAttachment[];
  conversationId: string;
  draftId?: string | null;
  onApplyPrefill?: (patch: ScanFieldPatch, conversationId: string, draftId?: string | null) => void;
  onBulkImported?: (rows: BulkLoadRow[]) => void;
};

export const LenaLoadCanvas = ({ lang, mode, attachments, conversationId, draftId, onApplyPrefill, onBulkImported }: LenaLoadCanvasProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [importing, setImporting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const bulkRows = attachments.flatMap((attachment) => attachment.bulkRows || []);
  // The backend carries the draft forward on every scan, so the most recently scanned
  // attachment already reflects the full, up-to-date state of the load (see latestLoadScan).
  const mergedScan = useMemo(() => latestLoadScan(attachments) ?? null, [attachments]);
  const rows = mergedScan ? buildScanFieldRows(mergedScan) : [];
  const patch = rows.reduce<ScanFieldPatch>((result, row) => ({ ...result, ...row.patch }), {});

  // Show when the draft was actually last saved as soon as the canvas opens, not just after the
  // user manually saves in this session - fetch its real updated_at from the server.
  useEffect(() => {
    if (!draftId) return undefined;
    let cancelled = false;
    void api.loadDrafts.get(draftId).then((response) => {
      if (cancelled) return;
      const updatedAt = response.data.updated_at;
      if (typeof updatedAt === 'string') {
        const parsed = new Date(updatedAt);
        if (!Number.isNaN(parsed.getTime())) setLastSavedAt(parsed);
      }
    }).catch(() => {
      // Non-critical - the badge just won't show an initial timestamp.
    });
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  const importRows = async () => {
    if (bulkRows.length === 0 || importing) return;
    setImporting(true);
    try {
      await api.loads.createBulk(bulkRows.map(buildBulkLoadPayload));
      onBulkImported?.(bulkRows);
    } finally {
      setImporting(false);
    }
  };

  const saveDraftNow = async () => {
    if (quickSaving || !draftId) return;
    setQuickSaving(true);
    try {
      await api.loadDrafts.update(draftId, scanPatchToDraftPayload(patch));
      setLastSavedAt(new Date());
    } catch {
      // This is just a lightweight status indicator, not a blocking action.
    } finally {
      setQuickSaving(false);
    }
  };

  const saveDraftAndContinue = async () => {
    if (savingDraft) return;
    setSavingDraft(true);
    try {
      if (draftId) {
        try {
          await api.loadDrafts.update(draftId, scanPatchToDraftPayload(patch));
          setLastSavedAt(new Date());
        } catch {
          // A stale/removed draft must not block handing the already-collected data to
          // PostLoadModal, which can still save a fresh draft from there.
        }
      }
      onApplyPrefill?.(patch, conversationId, draftId);
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {mode === 'bulk' ? <FileSpreadsheet className="h-5 w-5" /> : <PackagePlus className="h-5 w-5" />}
          </span>
          <p className="text-sm font-black text-slate-900 dark:text-white">
            {mode === 'bulk' ? u('LenaAI bulk canvas', 'Bulk load canvas') : u('LenaAI new load canvas', 'New load canvas')}
          </p>
        </div>
        {mode !== 'bulk' && draftId && (
          <button
            type="button"
            onClick={() => void saveDraftNow()}
            disabled={quickSaving}
            title={u('postLoadModal.draftAutosaved', 'Autosaved')}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary transition-colors hover:bg-primary/15 disabled:cursor-wait disabled:opacity-70 dark:border-primary/30 dark:bg-primary/15 dark:hover:bg-primary/20"
          >
            {quickSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            <span className="whitespace-nowrap">
              {u('postLoadModal.draftAutosaved', 'Autosaved')}
              {lastSavedAt ? ` · ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </span>
          </button>
        )}
      </div>

      {bulkRows.length === 0 && rows.length === 0 && (
        <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 px-8 text-center">
          <Sparkles className="h-6 w-6 text-slate-300 dark:text-slate-600" />
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {mode === 'bulk'
              ? u('Attach a file and LenaAI will extract your loads here', 'Attach a file and LenaAI will extract your loads here')
              : u('LenaAI will collect your load details here as you chat', 'LenaAI will collect your load details here as you chat')}
          </p>
        </div>
      )}

      {(bulkRows.length > 0 || rows.length > 0) && (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {bulkRows.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-primary/10 p-4 text-sm font-bold text-primary">{bulkRows.length} {u('loads detected', 'loads detected')}</div>
              <BulkLoadRowsTable rows={bulkRows} />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="flex w-full items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70"
                >
                  <row.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{row.label}</p>
                    {row.key === 'hsCodes' && mergedScan?.hsCodes?.length ? (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {mergedScan.hsCodes.map((item) => <HsCodeChip key={item.code} item={item} />)}
                      </div>
                    ) : (
                      <p className="mt-0.5 text-xs font-bold leading-snug text-slate-900 dark:text-white">{row.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {bulkRows.length === 0 && rows.length > 0 && (
        <div className="border-t border-slate-100 p-3 dark:border-slate-800">
          <button type="button" onClick={() => void saveDraftAndContinue()} disabled={savingDraft} className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-xs font-black text-white transition-colors hover:bg-primary-dark disabled:opacity-60">
            {draftId
              ? u('postLoadModal.continueEditing', 'Nastavi sa draftom')
              : u('postLoadModal.saveDraftAndContinue', 'Spasi draft i provjeri')}
            {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}

      {bulkRows.length > 0 && (
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <button type="button" onClick={() => void importRows()} disabled={importing} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-white disabled:opacity-50">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {u('Import loads', 'Import loads')} ({bulkRows.length})
          </button>
        </div>
      )}
    </aside>
  );
};
