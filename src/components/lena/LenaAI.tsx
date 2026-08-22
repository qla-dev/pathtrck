import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, LayoutGrid, MessageCircle, PanelRightOpen, Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { confirmAction } from '../../lib/swal';
import { ChatConversationPanel } from '../chat/ChatConversationPanel';
import { ChatSidebar } from '../chat/ChatSidebar';
import { useLenaAiChat } from '../../lib/useLenaAiChat';
import { useLenaEmbeddedMessages } from './useLenaEmbeddedMessages';
import { LenaLoadCanvas } from './LenaLoadCanvas';
import { LENA_LOAD_FILE_ACCEPT, LenaCanvasMode } from '../../lib/lenaLoadCanvas';
import { ScanFieldPatch } from '../modals/scanFieldRows';
import { BulkLoadRow } from '../../services/api';

type LenaAIProps = {
  open: boolean;
  onClose: () => void;
  lang: Language;
  userId?: number;
  companyIds?: number[];
  loadId?: string;
  loadLabel?: string;
  onBookLoad?: (loadId?: string) => void | Promise<void>;
  onOpenLoad?: (loadId: string) => void;
  initialCanvasMode?: LenaCanvasMode | null;
  onApplyLoadPrefill?: (patch: ScanFieldPatch) => void;
  onBulkImported?: (rows: BulkLoadRow[]) => void;
};

// Reusable LenaAI chat overlay — with no loadId it's a general app assistant (opened from the
// sidebar); with a loadId it's the same per-load dispatch chat used elsewhere, plus an optional
// embedded booking action when the backend signals booking intent.
// Full-screen takeover with the same enter/exit animation as TrackingItemDetails.tsx.
export function LenaAI({ open, onClose, lang, userId, companyIds, loadId, loadLabel, onBookLoad, onOpenLoad, initialCanvasMode = null, onApplyLoadPrefill, onBulkImported }: LenaAIProps) {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const generalWelcome = `${u('Lena welcome general', 'Hello, I\'m LenaAI, Freightbook.ai\'s AI freight dispatcher.\n\nI can find loads by booking reference and help you book them, show routes and stops, check shipment statuses, explain cargo and financial terms, draft operational updates, and guide you through tracking, maps, return routes, invoices, reports, messages, and fleet management.\n\nWrite to me in any language. I\'ll reply entirely in the language you use.')}\n\n${u('Lena welcome posting', 'To post a new load, I can open a working canvas, collect details from our conversation, and prepare the form prefill. Attach an Excel, CSV, image, or PDF file; bulk import for multiple loads is supported too.')}`;

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  const { conversation, draft, setDraft, send, sending, startNewChat, selectConversation, sidebarConversations, canvasEnabled, canvasMode, setCanvasEnabled, canvasAttachments, attachFile, processingAttachment } = useLenaAiChat({
    userId,
    companyIds,
    loadId,
    loadLabel,
    welcomeRole: u('LenaAI', 'LenaAI'),
    welcomeText: loadId
      ? u('Lena welcome load', 'Hello, I\'m LenaAI, your AI dispatcher for this load.\n\nUsing the latest data you are authorized to access, I can explain its route and stops, dates, cargo, status, booking reference, financial terms, tracking, and booking options.\n\nWrite to me in any language. I\'ll reply entirely in the language you use.')
      : generalWelcome,
    sendFailedTitle: u('Message could not be sent', 'Message could not be sent'),
    initialCanvasMode,
  });

  const { displayMessages, renderMessageExtra, extraContentVersion } = useLenaEmbeddedMessages({
    messages: conversation.messages,
    lang,
    fallbackLoadId: loadId,
    onOpenLoad,
    onBookLoad,
  });

  const displayConversation = useMemo(() => ({
    ...conversation,
    messages: displayMessages,
  }), [conversation, displayMessages]);
  const [channelFilter, setChannelFilter] = useState('all');
  const channels = [
    { id: 'all', label: u('All', 'All'), icon: LayoutGrid },
    { id: 'ai', label: u('LenaAI', 'LenaAI'), icon: Bot },
    { id: 'direct', label: u('Direct messages', 'Direct messages'), icon: MessageCircle },
  ];
  const visibleSidebarConversations = channelFilter === 'direct' ? [] : sidebarConversations;

  const handleNewChat = async () => {
    const confirmed = await confirmAction({
      title: u('Start a new chat?', 'Start a new chat?'),
      text: u(
        'This starts a fresh conversation with LenaAI. Your current chat is kept and still visible in Messages.',
        'This starts a fresh conversation with LenaAI. Your current chat is kept and still visible in Messages.'
      ),
      confirmText: u('New chat', 'New chat'),
    });
    if (confirmed) startNewChat();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-150 bg-white dark:bg-slate-950"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.div
            className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-white dark:bg-slate-950 p-4 md:p-7"
            initial={{ opacity: 0, y: 24, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.996 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="grid h-full min-h-0 w-full gap-4 lg:grid-cols-12">
              {!loadId && !canvasEnabled && (
                <ChatSidebar
                  searchPlaceholder={u('Search messages...', 'Search messages...')}
                  channels={channels}
                  channelFilter={channelFilter}
                  onChannelFilterChange={setChannelFilter}
                  conversations={visibleSidebarConversations}
                  activeConversationId={conversation.id}
                  onSelectConversation={selectConversation}
                />
              )}
              <div className={`flex min-h-0 gap-4 ${!loadId && !canvasEnabled ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
              <ChatConversationPanel
                activeConversation={displayConversation}
                draft={draft}
                onDraftChange={setDraft}
                onSend={() => void send()}
                messagePlaceholder={u('Write a message...', 'Write a message...')}
                className="min-h-[320px] flex-1"
                otherTyping={sending}
                renderMessageExtra={renderMessageExtra}
                extraContentVersion={extraContentVersion}
                onAttachFile={attachFile}
                attachmentAccept={LENA_LOAD_FILE_ACCEPT}
                attachmentBusy={processingAttachment}
                attachmentDropLabel={u('Drop file for LenaAI', 'Drop file for LenaAI')}
                headerLeading={(
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                    <Bot className="h-3.5 w-3.5" />
                    {u('LenaAI', 'LenaAI')}
                  </span>
                )}
                headerActions={(
                  <div className="flex items-center gap-2">
                  {!loadId && <button
                    type="button"
                    onClick={() => void setCanvasEnabled(!canvasEnabled, initialCanvasMode || canvasMode)}
                    className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-all cursor-pointer ${canvasEnabled ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-slate-100 text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
                  >
                    <PanelRightOpen className="h-4 w-4" />
                    {u('Prepare load', 'Prepare load')}
                  </button>}
                  <button
                    type="button"
                    onClick={() => void handleNewChat()}
                    className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    {u('New chat', 'New chat')}
                  </button>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label={u('login.close', 'Close')}
                      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              />
              <AnimatePresence initial={false}>
                {canvasEnabled && (
                  <motion.div key="load-canvas" className="h-[42%] min-h-0 shrink-0 lg:h-full" initial={{ opacity: 0, x: 24, width: 0 }} animate={{ opacity: 1, x: 0, width: 'auto' }} exit={{ opacity: 0, x: 24, width: 0 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
                    <LenaLoadCanvas
                      lang={lang}
                      mode={canvasMode}
                      attachments={canvasAttachments}
                      onApplyPrefill={onApplyLoadPrefill}
                      onBulkImported={onBulkImported}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
