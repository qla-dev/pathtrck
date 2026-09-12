import { Pin } from 'lucide-react';

import { Language } from '../../types';
import { LenaAI } from './LenaAI';

type PinnedSidebarProps = {
  open: boolean;
  lang: Language;
  userId?: number;
  companyIds?: number[];
  loadId?: string;
  loadLabel?: string;
  onClose: () => void;
};

/** A persistent Lena host owned by the app shell, rather than by a modal or a page. */
export const PinnedSidebar = ({ open, lang, userId, companyIds, loadId, loadLabel, onClose }: PinnedSidebarProps) => (
  <aside className="fixed inset-y-0 right-0 z-[320]">
    {open && <div className="pointer-events-none absolute -left-28 top-3 flex items-center gap-1 rounded-l-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-black text-primary shadow-lg dark:border-slate-700 dark:bg-slate-900/95"><Pin className="h-3.5 w-3.5" />Pinned</div>}
    <LenaAI open={open} sideBarMode onClose={onClose} lang={lang} userId={userId} companyIds={companyIds} loadId={loadId} loadLabel={loadLabel} />
  </aside>
);
