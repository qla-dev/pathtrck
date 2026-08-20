import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Building2, CheckCircle2, UserRoundCheck, X } from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { Button } from '../ui/Button';

type AssignmentOption = {
  id: string;
  label: string;
};

type LoadAssignmentModalProps = {
  open: boolean;
  lang: Language;
  mode: 'company' | 'superadmin';
  companies: AssignmentOption[];
  drivers: AssignmentOption[];
  companyId: string;
  driverId: string;
  assignDriver: boolean;
  loading: boolean;
  onCompanyChange: (value: string) => void;
  onDriverChange: (value: string) => void;
  onAssignDriverChange: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export const LoadAssignmentModal = ({
  open,
  lang,
  mode,
  companies,
  drivers,
  companyId,
  driverId,
  assignDriver,
  loading,
  onCompanyChange,
  onDriverChange,
  onAssignDriverChange,
  onClose,
  onConfirm,
}: LoadAssignmentModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [loading, onClose, open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-160 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !loading) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="load-assignment-title"
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-slate-950/25 dark:border-slate-700 dark:bg-slate-900"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-primary/10 via-cyan-500/5 to-transparent px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                  <UserRoundCheck className="h-5 w-5" />
                </div>
                <div>
                  <p id="load-assignment-title" className="font-black text-slate-900 dark:text-white">
                    {u('legacy.loadDetails.bookConfirmTitle', 'Book this load?')}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {u('legacy.loadDetails.bookAndDedicate', 'Book & dedicate')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:text-primary disabled:cursor-not-allowed dark:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {mode === 'superadmin' && (
                <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                  <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                    <Building2 className="h-4 w-4 text-primary" />
                    {u('Company', 'Company')}
                  </span>
                  <select
                    value={companyId}
                    onChange={(event) => onCompanyChange(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="">{u('legacy.loadDetails.selectCompanyOptional', 'Company (optional)')}</option>
                    {companies.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}
                  </select>
                </label>
              )}

              {mode === 'company' && (
                <button
                  type="button"
                  onClick={() => onAssignDriverChange(!assignDriver)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-primary/50 dark:border-slate-700 dark:bg-slate-950/60"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRoundCheck className="h-5 w-5" /></span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{u('legacy.loadDetails.assignDriverNow', 'Assign a driver now')}</span>
                  </span>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${assignDriver ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                    {assignDriver && <CheckCircle2 className="h-4 w-4" />}
                  </span>
                </button>
              )}

              {(mode === 'superadmin' || assignDriver) && (
                <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                  <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                    <UserRoundCheck className="h-4 w-4 text-primary" />
                    {u('Driver', 'Driver')}
                  </span>
                  <select
                    value={driverId}
                    onChange={(event) => onDriverChange(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="">{u('legacy.loadDetails.selectDriverOptional', 'Driver (optional)')}</option>
                    {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.label}</option>)}
                  </select>
                </label>
              )}

              <Button
                className="h-12 w-full rounded-xl text-sm shadow-lg shadow-primary/20"
                disabled={loading || (mode === 'company' && assignDriver && !driverId)}
                onClick={onConfirm}
              >
                {loading ? u('legacy.loadDetails.booking', 'Booking…') : u('common.bookLoad', 'Reserve')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
