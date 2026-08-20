import { useMemo, useState } from 'react';
import { Check, FileSpreadsheet, Loader2, PackagePlus, Pencil } from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { api, BulkLoadRow, LoadScanResult } from '../../services/api';
import { LenaAttachment, LenaCanvasMode } from '../../lib/lenaLoadCanvas';
import { buildScanFieldRows, ScanFieldPatch } from '../modals/scanFieldRows';
import { buildBulkLoadPayload } from '../modals/bulkLoadRows';
import { BulkLoadRowsTable } from '../modals/BulkLoadRowsTable';

type LenaLoadCanvasProps = {
  lang: Language;
  mode: LenaCanvasMode;
  attachments: LenaAttachment[];
  onApplyPrefill?: (patch: ScanFieldPatch) => void;
  onBulkImported?: (rows: BulkLoadRow[]) => void;
};

const mergeScans = (scans: LoadScanResult[]): LoadScanResult | null => {
  if (scans.length === 0) return null;
  return scans.reduce<LoadScanResult>((merged, scan) => ({
    ...merged,
    ...Object.fromEntries(Object.entries(scan).filter(([, value]) => value !== '' && value !== 0 && value !== false && (!Array.isArray(value) || value.length > 0))),
    warnings: [...(merged.warnings || []), ...(scan.warnings || [])],
  }), scans[0]);
};

export const LenaLoadCanvas = ({ lang, mode, attachments, onApplyPrefill, onBulkImported }: LenaLoadCanvasProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [importing, setImporting] = useState(false);
  const scans = attachments.flatMap((attachment) => attachment.loadScan ? [attachment.loadScan] : []);
  const bulkRows = attachments.flatMap((attachment) => attachment.bulkRows || []);
  const mergedScan = useMemo(() => mergeScans(scans), [attachments]);
  const rows = mergedScan ? buildScanFieldRows(mergedScan) : [];
  const patch = rows.reduce<ScanFieldPatch>((result, row) => ({ ...result, ...row.patch }), {});

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

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white lg:w-[420px] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {mode === 'bulk' ? <FileSpreadsheet className="h-5 w-5" /> : <PackagePlus className="h-5 w-5" />}
          </span>
          <p className="text-sm font-black text-slate-900 dark:text-white">
            {mode === 'bulk' ? u('LenaAI bulk canvas', 'Bulk load canvas') : u('LenaAI new load canvas', 'New load canvas')}
          </p>
        </div>
      </div>

      {(bulkRows.length > 0 || rows.length > 0) && (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {bulkRows.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-primary/10 p-4 text-sm font-bold text-primary">{bulkRows.length} {u('loads detected', 'loads detected')}</div>
              <BulkLoadRowsTable rows={bulkRows} />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {rows.map((row) => (
                <div key={row.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{row.label}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{row.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {bulkRows.length === 0 && rows.length > 0 && (
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
            <p className="text-sm font-black text-slate-900 dark:text-white">{u('Load data detected', 'Load data detected')}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{u('Open edit mode to review and complete the posting.', 'Open edit mode to review and complete the posting.')}</p>
            <button type="button" onClick={() => onApplyPrefill?.(patch)} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-black text-white">
              <Pencil className="h-4 w-4" /> {u('Open edit mode', 'Open edit mode')}
            </button>
          </div>
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
