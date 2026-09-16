import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Language } from '../../types';
import { LenaAI } from './LenaAI';
import { ScanFieldPatch } from '../modals/scanFieldRows';

type PinnedSidebarProps = {
  open: boolean;
  lang: Language;
  userId?: number;
  companyIds?: number[];
  loadId?: string;
  loadLabel?: string;
  conversationId?: string;
  refreshToken: number;
  onClose: () => void;
  onApplyLoadPrefill?: (patch: ScanFieldPatch, conversationId: string, draftId?: string | null) => void;
  onStartGenericChat?: () => void;
  /** The edge it docks to; the app shell's own is on the right. */
  side?: 'left' | 'right';
  /** Opens on the welcome greeting rather than the latest conversation. */
  startFresh?: boolean;
};

/** A persistent Lena host owned by the app shell, rather than by a modal or a page. */
export const PinnedSidebar = ({ open, lang, userId, companyIds, loadId, loadLabel, conversationId, refreshToken, onClose, onApplyLoadPrefill, onStartGenericChat, side = 'right', startFresh }: PinnedSidebarProps) => {
  const [visibleToken, setVisibleToken] = useState(refreshToken);
  const [refreshing, setRefreshing] = useState(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!open) {
      hasMounted.current = false;
      setRefreshing(false);
      setVisibleToken(refreshToken);
      return undefined;
    }
    if (!hasMounted.current) {
      hasMounted.current = true;
      setVisibleToken(refreshToken);
      setRefreshing(true);
      return undefined;
    }
    if (refreshToken === visibleToken) return undefined;
    setRefreshing(true);
    setVisibleToken(refreshToken);
    return undefined;
  }, [open, refreshToken, visibleToken]);

  return <aside className={`fixed inset-y-0 z-[320] ${side === 'left' ? 'left-0' : 'right-0'}`}>
    <LenaAI key={visibleToken} open={open} sideBarMode sideBarSide={side} pinnedMode onClose={onClose} lang={lang} userId={userId} companyIds={companyIds} loadId={loadId} loadLabel={loadLabel} initialConversationId={conversationId} startFresh={startFresh} onConversationReady={() => setRefreshing(false)} onApplyLoadPrefill={onApplyLoadPrefill} onStartGenericChat={onStartGenericChat} />
    {open && refreshing && <div className={`fixed inset-y-0 z-[400] flex w-full items-center justify-center bg-white/82 backdrop-blur-sm dark:bg-slate-950/82 ${side === 'left' ? 'left-0 md:w-[max(20vw,360px)]' : 'right-0 lg:w-[440px] xl:w-[480px]'}`} aria-live="polite" aria-label="Refreshing pinned conversation"><div className="flex flex-col items-center gap-3 text-primary"><LoaderCircle className="h-9 w-9 animate-spin" /><span className="text-sm font-bold">Loading conversation...</span></div></div>}
  </aside>;
};
