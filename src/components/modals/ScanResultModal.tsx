import { motion } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { LoadScanResult } from '../../services/api';
import { buildScanFieldRows } from './scanFieldRows';
import { ScanFieldsTable } from './ScanFieldsTable';

type ScanResultModalProps = {
  open: boolean;
  onClose: () => void;
  imageDataUrl: string | null;
  result: LoadScanResult | null;
};

export const ScanResultModal = ({ open, onClose, imageDataUrl, result }: ScanResultModalProps) => {
  if (!open || !result) return null;
  const rows = buildScanFieldRows(result);

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg space-y-5 rounded-3xl bg-white p-5 shadow-2xl sm:p-6 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {imageDataUrl && <img src={imageDataUrl} alt="Scanned document" className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <p className="text-[11px] font-black uppercase tracking-wide">AI scan</p>
              </div>
              <p className="truncate text-sm font-black text-slate-900 dark:text-white">Extracted data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {rows.length > 0 ? (
          <ScanFieldsTable rows={rows} />
        ) : (
          <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            No usable fields were detected in this document.
          </p>
        )}
      </div>
    </motion.div>
  );
};
