import { useRef, useState, type DragEvent } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Check, Loader2, RotateCcw, Sparkles, UploadCloud, X } from 'lucide-react';
import { api, ApiError, LoadScanResult } from '../../services/api';
import { buildScanFieldRows, ScanFieldPatch } from './scanFieldRows';
import { ScanFieldsTable } from './ScanFieldsTable';

type DocumentDropzoneProps = {
  open: boolean;
  onClose: () => void;
  onApply: (result: LoadScanResult, imageDataUrl: string | null, patch: ScanFieldPatch) => void;
};

type Phase = 'idle' | 'scanning' | 'review';
type Source = 'image' | 'text' | null;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });

export const DocumentDropzone = ({ open, onClose, onApply }: DocumentDropzoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [source, setSource] = useState<Source>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<LoadScanResult | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setIsDragging(false);
    setPhase('idle');
    setSource(null);
    setPreview(null);
    setDescription('');
    setResult(null);
    setSelected({});
    setError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image of the document (photo or screenshot).');
      return;
    }
    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPreview(dataUrl);
      setSource('image');
      setPhase('scanning');
      const base64 = dataUrl.split(',')[1] || '';
      const response = await api.loads.scan([{ base64, mimeType: file.type }]);
      const rows = buildScanFieldRows(response.data);
      setSelected(Object.fromEntries(rows.map((row) => [row.key, true])));
      setResult(response.data);
      setPhase('review');
    } catch (scanError) {
      setPhase('idle');
      setPreview(null);
      setError(scanError instanceof ApiError ? scanError.message : 'The document could not be read. Please try again.');
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  };

  const handleDescribe = async () => {
    if (description.trim().length < 8 || phase === 'scanning') return;
    setError('');
    setSource('text');
    setPhase('scanning');
    try {
      const response = await api.loads.scanText(description.trim());
      const rows = buildScanFieldRows(response.data);
      setSelected(Object.fromEntries(rows.map((row) => [row.key, true])));
      setResult(response.data);
      setPhase('review');
    } catch (scanError) {
      setPhase('idle');
      setError(scanError instanceof ApiError ? scanError.message : 'Could not read that description. Please try again.');
    }
  };

  const toggleField = (key: string) => {
    setSelected((prev) => ({ ...prev, [key]: prev[key] === false }));
  };

  const confirmApply = () => {
    if (!result) return;
    const rows = buildScanFieldRows(result);
    const patch = rows.reduce<ScanFieldPatch>((acc, row) => (
      selected[row.key] === false ? acc : { ...acc, ...row.patch }
    ), {});
    onApply(result, preview, patch);
    reset();
    onClose();
  };

  const rows = result ? buildScanFieldRows(result) : [];
  const selectedCount = rows.filter((row) => selected[row.key] !== false).length;

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
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Fill up with AI</h3>
            <p className="text-xs text-white/60">
              {phase === 'review' ? 'Review the extracted data below' : 'Describe the load, or drop a document photo'}
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

      {phase === 'review' && result ? (
        <div className="flex flex-1 flex-col items-center overflow-y-auto p-5 sm:p-10">
          <div className="w-full max-w-lg space-y-5 rounded-3xl bg-white p-5 shadow-2xl sm:p-6 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              {preview && <img src={preview} alt="Scanned document" className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900 dark:text-white">Freight data detected</p>
                <p className="text-xs text-slate-500">Select the fields you want to prefill</p>
              </div>
            </div>

            {rows.length > 0 ? (
              <ScanFieldsTable rows={rows} selected={selected} onToggle={toggleField} />
            ) : (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                No usable fields were detected in this document.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setPhase('idle'); setSource(null); setPreview(null); setResult(null); }}
                className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" /> Scan again
              </button>
              <button
                onClick={confirmApply}
                disabled={selectedCount === 0}
                className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white shadow-md transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check className="h-4 w-4" /> Use as prefill{selectedCount ? ` (${selectedCount})` : ''}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-5 sm:p-10">
          <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-[1fr_auto_1fr] sm:gap-0">
            <div className="flex flex-col justify-center gap-3 sm:pr-6">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={phase === 'scanning'}
                rows={6}
                placeholder="e.g. 24 pallets of electronics from Munich to Zagreb, pickup Monday, needs a curtain-sider, budget 1200 EUR..."
                className="w-full resize-none rounded-2xl border-2 border-white/15 bg-white/[0.03] p-4 text-sm text-white shadow-sm outline-none transition-colors placeholder:text-white/40 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void handleDescribe()}
                disabled={phase === 'scanning' || description.trim().length < 8}
                className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white shadow-md transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                {phase === 'scanning' && source === 'text' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {phase === 'scanning' && source === 'text' ? 'Reading…' : 'Generate'}
              </button>
            </div>

            <div className="hidden sm:flex sm:flex-col sm:items-center sm:px-6">
              <div className="w-px flex-1 bg-white/15" />
              <span className="my-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-slate-900 text-[11px] font-black text-white/50">
                ILI
              </span>
              <div className="w-px flex-1 bg-white/15" />
            </div>
            <div className="flex items-center gap-3 sm:hidden">
              <div className="h-px flex-1 bg-white/15" />
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-slate-900 text-[11px] font-black text-white/50">
                ILI
              </span>
              <div className="h-px flex-1 bg-white/15" />
            </div>

            <div
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => phase !== 'scanning' && inputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-10 text-center transition-colors sm:pl-6 ${
                phase === 'scanning' ? 'cursor-default opacity-60' : 'cursor-pointer'
              } ${isDragging ? 'border-primary bg-primary/10' : 'border-white/25 bg-white/[0.03] hover:border-white/40'}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Uploaded document" className="max-h-40 rounded-2xl object-contain shadow-lg" />
                  {phase === 'scanning' && source === 'image' && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/60">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                  {phase === 'scanning' && source === 'image' ? <Loader2 className="h-8 w-8 animate-spin text-white" /> : <UploadCloud className="h-8 w-8 text-white/70" />}
                </div>
              )}
              <div className="space-y-1">
                <p className="text-base font-bold text-white">
                  {phase === 'scanning' && source === 'image' ? 'Reading the document…' : 'Drop the document here'}
                </p>
                <p className="text-sm text-white/50">
                  {phase === 'scanning' && source === 'image' ? 'This can take a few seconds.' : 'or click to browse a photo or screenshot'}
                </p>
              </div>
            </div>
          </div>
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
