import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Language } from '../../types';
import { LenaAI } from './LenaAI';

type PinnedSidebarProps = {
  open: boolean;
  lang: Language;
  userId?: number;
  companyIds?: number[];
  loadId?: string;
  loadLabel?: string;
  refreshToken: number;
  onClose: () => void;
};

/** A persistent Lena host owned by the app shell, rather than by a modal or a page. */
export const PinnedSidebar = ({ open, lang, userId, companyIds, loadId, loadLabel, refreshToken, onClose }: PinnedSidebarProps) => {
  const [visibleToken, setVisibleToken] = useState(refreshToken);
  const [refreshing, setRefreshing] = useState(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!open) {
      hasMounted.current = false;
      setVisibleToken(refreshToken);
      return undefined;
    }
    if (!hasMounted.current) {
      hasMounted.current = true;
      setVisibleToken(refreshToken);
      return undefined;
    }
    if (refreshToken === visibleToken) return undefined;
    setRefreshing(true);
    const timer = window.setTimeout(() => {
      setVisibleToken(refreshToken);
      setRefreshing(false);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [open, refreshToken, visibleToken]);

  return <aside className="fixed inset-y-0 right-0 z-[320]">
    <LenaAI key={visibleToken} open={open} sideBarMode pinnedMode onClose={onClose} lang={lang} userId={userId} companyIds={companyIds} loadId={loadId} loadLabel={loadLabel} />
    {open && refreshing && <div className="fixed inset-y-0 right-0 z-[400] flex w-full items-center justify-center bg-white/82 backdrop-blur-sm dark:bg-slate-950/82 lg:w-[440px] xl:w-[480px]" aria-live="polite" aria-label="Refreshing pinned conversation"><div className="flex flex-col items-center gap-3 text-primary"><LoaderCircle className="h-9 w-9 animate-spin" /><span className="text-sm font-bold">Loading conversation...</span></div></div>}
  </aside>;
};
