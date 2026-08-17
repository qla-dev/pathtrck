import { motion } from 'motion/react';
import { Layers, X } from 'lucide-react';
import { BulkLoadRow } from '../../services/api';
import { BulkLoadRowsTable } from './BulkLoadRowsTable';

type BulkResultModalProps = {
  open: boolean;
  onClose: () => void;
  rows: BulkLoadRow[];
};

export const BulkResultModal = ({ open, onClose, rows }: BulkResultModalProps) => {
  if (!open || rows.length === 0) return null;

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
          <div className="flex items-center gap-2 text-primary">
            <Layers className="h-4 w-4" />
            <p className="text-[11px] font-black uppercase tracking-wide">Bulk import · {rows.length} load{rows.length === 1 ? '' : 's'}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <BulkLoadRowsTable rows={rows} />
      </div>
    </motion.div>
  );
};
