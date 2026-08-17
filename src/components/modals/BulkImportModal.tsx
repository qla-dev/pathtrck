import { useRef, useState, type DragEvent } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Check, FileSpreadsheet, Layers, Loader2, RotateCcw, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api, ApiError, BulkLoadRow } from '../../services/api';
import { buildBulkLoadPayload } from './bulkLoadRows';
import { BulkLoadRowsTable } from './BulkLoadRowsTable';

type BulkImportModalProps = {
  open: boolean;
  onClose: () => void;
  onImported: (rows: BulkLoadRow[]) => void;
};

type Phase = 'idle' | 'scanning' | 'review' | 'importing' | 'done';

const SPREADSHEET_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

const isSpreadsheetFile = (file: File) =>
  SPREADSHEET_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
  || file.type === 'text/csv'
  || file.type === 'application/vnd.ms-excel'
  || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error('Could not read the file.'));
    reader.readAsArrayBuffer(file);
  });

const spreadsheetToText = async (file: File): Promise<string> => {
  const buffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheets = workbook.SheetNames.map((name) => {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
    return workbook.SheetNames.length > 1 ? `# ${name}\n${csv}` : csv;
  });
  return sheets.join('\n\n').trim();
};

export const BulkImportModal = ({ open, onClose, onImported }: BulkImportModalProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [rows, setRows] = useState<BulkLoadRow[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setIsDragging(false);
    setPhase('idle');
    setRows([]);
    setSelected({});
    setImportedCount(0);
    setError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isSpreadsheet = isSpreadsheetFile(file);
    if (!isImage && !isSpreadsheet) {
      setError('Please choose an image, an Excel file (.xlsx/.xls) or a CSV of the list.');
      return;
    }
    setError('');
    setPhase('scanning');
    try {
      const response = isImage
        ? await (async () => {
            const dataUrl = await readFileAsDataUrl(file);
            const base64 = dataUrl.split(',')[1] || '';
            return api.loads.scanBulk([{ base64, mimeType: file.type }]);
          })()
        : await (async () => {
            const text = await spreadsheetToText(file);
            if (text.length < 8) {
              throw new ApiError('This spreadsheet appears to be empty.', 422, {});
            }
            return api.loads.scanBulkText(text);
          })();
      if (response.data.rows.length === 0) {
        setPhase('idle');
        setError(response.data.warnings[0] || 'No load rows could be detected in this document.');
        return;
      }
      setRows(response.data.rows);
      setSelected(Object.fromEntries(response.data.rows.map((_row, index) => [index, true])));
      setPhase('review');
    } catch (scanError) {
      setPhase('idle');
      setError(scanError instanceof ApiError ? scanError.message : 'The document could not be read. Please try again.');
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  };

  const toggleRow = (index: number) => {
    setSelected((prev) => ({ ...prev, [index]: prev[index] === false }));
  };

  const selectedRows = rows.filter((_row, index) => selected[index] !== false);

  const confirmImport = async () => {
    if (selectedRows.length === 0 || phase === 'importing') return;
    setPhase('importing');
    setError('');
    try {
      const payloads = selectedRows.map(buildBulkLoadPayload);
      await api.loads.createBulk(payloads);
      setImportedCount(selectedRows.length);
      setPhase('done');
      onImported(selectedRows);
    } catch (importError) {
      setPhase('review');
      setError(importError instanceof ApiError ? importError.message : 'Could not import the loads. Please try again.');
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex flex-col bg-slate-950/92 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-between p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Bulk import</h3>
            <p className="text-xs text-white/60">
              {phase === 'review' ? 'Select which loads to import' : phase === 'done' ? 'Import complete' : 'Drop a spreadsheet export, manifest, or list of loads'}
            </p>
          </div>
        </div>
        <button
          onClick={close}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white/70 transition-colors hover:bg-white/10"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {(phase === 'review' || phase === 'importing' || phase === 'done') && rows.length > 0 ? (
        <div className="flex flex-1 flex-col items-center overflow-y-auto p-5 sm:p-10">
          <div className="w-full max-w-lg space-y-5 rounded-3xl bg-white p-5 shadow-2xl sm:p-6 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                {phase === 'done' ? <Check className="h-5 w-5 text-primary" /> : <Layers className="h-5 w-5 text-primary" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                  {phase === 'done' ? `${importedCount} load${importedCount === 1 ? '' : 's'} imported` : `${rows.length} load${rows.length === 1 ? '' : 's'} detected`}
                </p>
                <p className="text-xs text-slate-500">
                  {phase === 'done' ? 'You can review them from the freight exchange.' : 'Uncheck any rows you don’t want to add'}
                </p>
              </div>
            </div>

            <BulkLoadRowsTable
              rows={rows}
              selected={phase === 'review' ? selected : undefined}
              onToggle={phase === 'review' ? toggleRow : undefined}
            />

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {phase === 'done' ? (
              <button
                onClick={close}
                className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white shadow-md transition-all hover:bg-primary-dark"
              >
                <Check className="h-4 w-4" /> Done
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => { setPhase('idle'); setRows([]); setSelected({}); }}
                  disabled={phase === 'importing'}
                  className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="h-4 w-4" /> Scan again
                </button>
                <button
                  onClick={confirmImport}
                  disabled={selectedRows.length === 0 || phase === 'importing'}
                  className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white shadow-md transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {phase === 'importing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {phase === 'importing' ? 'Importing…' : `Import selected (${selectedRows.length})`}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-5 sm:p-10">
          <div
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => phase !== 'scanning' && inputRef.current?.click()}
            className={`flex w-full max-w-xl flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-10 sm:p-16 text-center transition-colors ${
              phase === 'scanning' ? 'cursor-default' : 'cursor-pointer'
            } ${isDragging ? 'border-primary bg-primary/10' : 'border-white/25 bg-white/[0.03] hover:border-white/40'}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
              {phase === 'scanning' ? <Loader2 className="h-8 w-8 animate-spin text-white" /> : <FileSpreadsheet className="h-8 w-8 text-white/70" />}
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-white">
                {phase === 'scanning' ? 'Reading the list…' : 'Drop the list here'}
              </p>
              <p className="text-sm text-white/50">
                {phase === 'scanning' ? 'This can take a bit longer for many rows.' : 'an Excel/CSV file, or a manifest photo - or click to browse'}
              </p>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
