import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, LayoutGrid, MessageCircle, PanelRightClose, PanelRightOpen, Plus, X } from 'lucide-react';
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
  onApplyLoadPrefill?: (patch: ScanFieldPatch, conversationId: string, draftId?: string | null) => void;
  onBulkImported?: (rows: BulkLoadRow[]) => void;
};

// Reusable LenaAI chat overlay — with no loadId it's a general app assistant (opened from the
// sidebar); with a loadId it's the same per-load dispatch chat used elsewhere, plus an optional
// embedded booking action when the backend signals booking intent.
// Full-screen takeover with the same enter/exit animation as TrackingItemDetails.tsx.
export function LenaAI({ open, onClose, lang, userId, companyIds, loadId, loadLabel, onBookLoad, onOpenLoad, initialCanvasMode = null, onApplyLoadPrefill, onBulkImported }: LenaAIProps) {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const quickActionLabels = {
    add: u('Add a new load', 'Add a new load'),
    tracking: u('Check load status', 'Check load status'),
    booking: u('Reserve a load', 'Reserve a load'),
    hs: u('Check HS code', 'Check HS code'),
    free: u('Ask about Freightbook.ai', 'Ask about Freightbook.ai'),
    upload_yes: u('Yes, I have a file', 'Yes, I have a file'),
    upload_no: u('No, enter it manually', 'No, enter it manually'),
    start_add_yes: u('Yes, start creating', 'Yes, start creating'),
    start_add_no: u('No, not now', 'No, not now'),
    continue_add_yes: u('Yes, continue', 'Yes, continue'),
    continue_add_no: u('No, leave load creation', 'No, leave load creation'),
  } as const;
  const generalWelcome = `${u('Lena welcome general', 'Hello, I am LenaAI, your AI dispatcher in Freightbook.ai.\n\nYou can write to me in any language. I will reply exclusively in the language you use. How can I help you today?')}\n\n[[LENA_OPTIONS:add,tracking,booking,hs,free]]`;

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  const { conversation, draft, setDraft, send, sendQuickAction, sendSuggestedReply, sending, startNewChat, selectConversation, sidebarConversations, canvasEnabled, canvasMode, setCanvasEnabled, canvasAttachments, attachFile, processingAttachment, loadDraftId } = useLenaAiChat({
    userId,
    companyIds,
    loadId,
    loadLabel,
    welcomeRole: u('LenaAI', 'LenaAI'),
    welcomeText: loadId
      ? u('Lena welcome load', 'Hello, I\'m LenaAI, your AI dispatcher for this load.\n\nUsing the latest data you are authorized to access, I can explain its route and stops, dates, cargo, status, booking reference, financial terms, tracking, and booking options.\n\nWrite to me in any language. I\'ll reply entirely in the language you use.')
      : generalWelcome,
    sendFailedTitle: u('Message could not be sent', 'Message could not be sent'),
    replyFailedTitle: u('chat.replyFailed', 'LenaAI could not reply'),
    newConversationLabel: u('New LenaAI conversation', 'New LenaAI conversation'),
    initialCanvasMode,
    quickActionLabels,
  });
  const [canvasPanelOpen, setCanvasPanelOpen] = useState(false);
  const previousCanvas = useRef({ conversationId: '', active: false });
  useEffect(() => {
    const previous = previousCanvas.current;
    if (previous.conversationId !== conversation.id || (!previous.active && canvasEnabled)) {
      setCanvasPanelOpen(canvasEnabled);
    } else if (!canvasEnabled) {
      setCanvasPanelOpen(false);
    }
    previousCanvas.current = { conversationId: conversation.id, active: canvasEnabled };
  }, [conversation.id, canvasEnabled]);
  const showCanvas = !loadId && canvasEnabled && canvasPanelOpen;

  const { displayMessages, renderMessageExtra, extraContentVersion } = useLenaEmbeddedMessages({
    messages: conversation.messages,
    lang,
    fallbackLoadId: loadId,
    onOpenLoad,
    onBookLoad,
    quickActionLabels,
    onQuickAction: (action) => void sendQuickAction(action),
    onSuggestedReply: (value, displayText) => void sendSuggestedReply(value, displayText),
    onSuggestedDraftChange: setDraft,
    onLoadReady: () => {
      void setCanvasEnabled(true);
      setCanvasPanelOpen(true);
    },
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
          <button
            type="button"
            onClick={onClose}
            aria-label={u('login.close', 'Close')}
            className="absolute right-0 top-0 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-bl-xl border-b border-l border-slate-200 bg-slate-100 text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
          <motion.div
            className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-white dark:bg-slate-950 p-4 md:p-7"
            initial={{ opacity: 0, y: 24, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.996 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="grid h-full min-h-0 w-full gap-4 lg:grid-cols-12">
              {!loadId && !showCanvas && (
                <ChatSidebar
                  searchPlaceholder={u('Search messages...', 'Search messages...')}
                  channels={channels}
                  channelFilter={channelFilter}
                  onChannelFilterChange={setChannelFilter}
                  conversations={visibleSidebarConversations}
                  activeConversationId={conversation.id}
                  onSelectConversation={selectConversation}
                  statusText={(chat) => chat.status === 'load-detected' ? u('Load detected', 'Load detected') : u('Draft', 'Draft')}
                />
              )}
              <div className={`flex min-h-0 gap-4 ${!loadId && !showCanvas ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
              <ChatConversationPanel
                activeConversation={displayConversation}
                draft={draft}
                onDraftChange={setDraft}
                onSend={() => void send()}
                messagePlaceholder={u('Write a message...', 'Write a message...')}
                className="min-h-[320px] flex-1"
                otherTyping={sending}
                thinkingLabel={u('Thinking', 'Thinking')}
                renderMessageExtra={renderMessageExtra}
                extraContentVersion={extraContentVersion}
                onAttachFile={attachFile}
                attachmentAccept={LENA_LOAD_FILE_ACCEPT}
                attachmentBusy={processingAttachment}
                attachmentDropLabel={u('Drop file for LenaAI', 'Drop file for LenaAI')}
                notSentMessageLabel={u('chat.notSent', 'Not sent')}
                retryMessageLabel={u('chat.retry', 'Retry')}
                copyMessageLabel={u('chat.copy', 'Copy message')}
                copiedMessageLabel={u('chat.copied', 'Copied')}
                headerActions={(
                  <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleNewChat()}
                    className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    {u('New chat', 'New chat')}
                  </button>
                  {!loadId && <button
                    type="button"
                    onClick={() => {
                      if (canvasEnabled) setCanvasPanelOpen((current) => !current);
                      else void sendQuickAction('add');
                    }}
                    className={`flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-all ${showCanvas ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-slate-100 text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
                  >
                    {showCanvas ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                    {showCanvas ? u('Hide load preparation', 'Hide load preparation') : u('Prepare load', 'Prepare load')}
                  </button>}
                  </div>
                )}
              />
              <AnimatePresence initial={false}>
                {showCanvas && (
                  <motion.div key="load-canvas" className="h-[42%] min-h-0 shrink-0 lg:h-full" initial={{ opacity: 0, x: 24, width: 0 }} animate={{ opacity: 1, x: 0, width: 'auto' }} exit={{ opacity: 0, x: 24, width: 0 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
                    <LenaLoadCanvas
                      lang={lang}
                      mode={canvasMode}
                      attachments={canvasAttachments}
                      conversationId={conversation.id}
                      draftId={loadDraftId}
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
