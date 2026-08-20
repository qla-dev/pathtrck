import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { confirmAction } from '../../lib/swal';
import { ChatConversationPanel } from '../chat/ChatConversationPanel';
import { ChatMessage } from '../chat/types';
import { useLenaAiChat } from '../../lib/useLenaAiChat';

const BOOKING_MARKER = '[[OFFER_BOOKING]]';

type LenaAIProps = {
  open: boolean;
  onClose: () => void;
  lang: Language;
  userId?: number;
  companyIds?: number[];
  loadId?: string;
  loadLabel?: string;
  onBookLoad?: () => void | Promise<void>;
};

// Reusable LenaAI chat overlay — with no loadId it's a general app assistant (opened from the
// sidebar); with a loadId it's the same per-load dispatch chat used elsewhere, plus an optional
// embedded booking action when the backend signals booking intent (see onBookLoad/BOOKING_MARKER).
// Full-screen takeover with the same enter/exit animation as TrackingItemDetails.tsx.
export function LenaAI({ open, onClose, lang, userId, companyIds, loadId, loadLabel, onBookLoad }: LenaAIProps) {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  const { conversation, draft, setDraft, send, sending, startNewChat, hasActiveConversation } = useLenaAiChat({
    userId,
    companyIds,
    loadId,
    loadLabel,
    welcomeRole: u('LenaAI', 'LenaAI'),
    welcomeText: loadId
      ? u('Hi, I\'m LenaAI. Ask me anything about this load.', 'Hi, I\'m LenaAI. Ask me anything about this load.')
      : u('Hi, I\'m LenaAI. Ask me anything about Freightbook.ai.', 'Hi, I\'m LenaAI. Ask me anything about Freightbook.ai.'),
    sendFailedTitle: u('Message could not be sent', 'Message could not be sent'),
  });

  const bookingMessageIds = useMemo(
    () => new Set(conversation.messages.filter((message) => message.text.includes(BOOKING_MARKER)).map((message) => message.id)),
    [conversation.messages]
  );

  const displayConversation = useMemo(() => ({
    ...conversation,
    messages: conversation.messages.map((message) => ({ ...message, text: message.text.replace(BOOKING_MARKER, '').trim() })),
  }), [conversation]);

  const renderMessageExtra = onBookLoad
    ? (message: ChatMessage) => bookingMessageIds.has(message.id) ? (
        <div className="mt-2 flex w-fit max-w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <p className="text-xs font-semibold text-primary">{u('This load is available to book.', 'This load is available to book.')}</p>
          <button
            type="button"
            onClick={() => void onBookLoad()}
            className="shrink-0 cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition-all hover:brightness-95"
          >
            {u('Book this load', 'Book this load')}
          </button>
        </div>
      ) : null
    : undefined;

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
            <div className="flex h-full min-h-0 w-full flex-col">
              <div className="mb-4 md:mb-7 flex shrink-0 items-center justify-between gap-2">
                {hasActiveConversation ? (
                  <button
                    type="button"
                    onClick={() => void handleNewChat()}
                    className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    {u('New chat', 'New chat')}
                  </button>
                ) : <span />}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={u('login.close', 'Close')}
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ChatConversationPanel
                activeConversation={displayConversation}
                draft={draft}
                onDraftChange={setDraft}
                onSend={() => void send()}
                messagePlaceholder={u('Write a message...', 'Write a message...')}
                className="min-h-0 flex-1"
                otherTyping={sending}
                renderMessageExtra={renderMessageExtra}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
