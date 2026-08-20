import { useMemo, useState } from 'react';
import { Check, FileSpreadsheet, Loader2, PackagePlus, Pencil } from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { api, BulkLoadRow } from '../../services/api';
import { cn } from '../../lib/cn';
import { latestLoadScan, LenaAttachment, LenaCanvasMode } from '../../lib/lenaLoadCanvas';
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

export const LenaLoadCanvas = ({ lang, mode, attachments, onApplyPrefill, onBulkImported }: LenaLoadCanvasProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [importing, setImporting] = useState(false);
  const bulkRows = attachments.flatMap((attachment) => attachment.bulkRows || []);
  // The backend carries the draft forward on every scan, so the most recently scanned
  // attachment already reflects the full, up-to-date state of the load (see latestLoadScan).
  const mergedScan = useMemo(() => latestLoadScan(attachments) ?? null, [attachments]);
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
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {bulkRows.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-primary/10 p-4 text-sm font-bold text-primary">{bulkRows.length} {u('loads detected', 'loads detected')}</div>
              <BulkLoadRowsTable rows={bulkRows} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className={cn(
                    'flex items-start gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/70',
                    row.value.length > 22 && 'col-span-2'
                  )}
                >
                  <row.icon className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{row.label}</p>
                    <p className="mt-0.5 text-xs font-bold leading-snug text-slate-900 dark:text-white">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {bulkRows.length === 0 && rows.length > 0 && (
        <div className="border-t border-slate-100 p-3 dark:border-slate-800">
          <button type="button" onClick={() => onApplyPrefill?.(patch)} className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-black text-white">
            <Pencil className="h-3.5 w-3.5" /> {u('Open edit mode', 'Open edit mode')}
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
