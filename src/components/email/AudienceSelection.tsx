import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Building2, Send, Users, X } from 'lucide-react';

import { Button } from '../ui/Button';

export type AudienceOption = {
  id: string;
  label: string;
  count: number;
};

type AudienceSelectionProps = {
  open: boolean;
  audiences: AudienceOption[];
  audience: string;
  testEmail: string;
  feedback?: string;
  preparing: boolean;
  onAudienceChange: (value: string) => void;
  onTestEmailChange: (value: string) => void;
  onSendTest: () => void;
  onConfirm: () => void;
  onClose: () => void;
};

export const AudienceSelection = ({
  open,
  audiences,
  audience,
  testEmail,
  feedback,
  preparing,
  onAudienceChange,
  onTestEmailChange,
  onSendTest,
  onConfirm,
  onClose,
}: AudienceSelectionProps) => {
  const selectedAudience = audiences.find((item) => item.id === audience) || audiences[0];

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !preparing) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open, preparing]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !preparing) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="audience-selection-title"
            className="my-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-slate-950/25 dark:border-slate-700 dark:bg-slate-900"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-primary/10 via-cyan-500/5 to-transparent px-6 py-5 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="audience-selection-title" className="text-lg font-black text-slate-900 dark:text-white">Audience selection</h2>
                  <p className="text-sm text-slate-500">Review recipients and test the campaign before preparing it.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={preparing}
                aria-label="Close audience selection"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:text-primary disabled:cursor-not-allowed dark:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="space-y-5 p-6">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Audience</span>
                <select
                  value={audience}
                  onChange={(event) => onAudienceChange(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {audiences.map((item) => <option key={item.id} value={item.id}>{item.label} ({item.count})</option>)}
                </select>
              </label>

              <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-black text-slate-900 dark:text-white">Audience summary</h3>
                </div>
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-violet-500" />
                    <div>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{selectedAudience?.count || 0}</p>
                      <p className="text-sm text-slate-500">{selectedAudience?.label || 'No audience selected'}</p>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">Recipients will be resolved from verified company billing and operations contacts before sending.</p>
              </section>

              <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  <h3 className="font-black text-slate-900 dark:text-white">Send a test</h3>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(event) => onTestEmailChange(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    placeholder="you@company.com"
                  />
                  <Button onClick={onSendTest}>Send</Button>
                </div>
                <p className="mt-3 text-xs text-slate-500">Test delivery uses the current live design and content.</p>
                {feedback && <p className="mt-2 text-xs font-semibold text-primary">{feedback}</p>}
              </section>
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose} disabled={preparing}>Cancel</Button>
              <Button onClick={onConfirm} disabled={preparing} className="gap-2">
                <Send className="h-4 w-4" />
                {preparing ? 'Preparing...' : 'Create campaign draft'}
              </Button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
