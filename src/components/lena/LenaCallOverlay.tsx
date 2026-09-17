import { useEffect, useMemo, useRef } from 'react';
import { Loader2, PhoneOff, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/cn';
import { createLenaCallDelegate } from '../../lib/lenaCallDelegate';
import { useLenaRealtimeCall } from '../../lib/useLenaRealtimeCall';

/**
 * The live call with Lena: a full-screen panel with a transcript, because a caller who mishears a
 * reference number on a bad connection needs to be able to read it back.
 *
 * Everything Lena actually does during a call runs through the ordinary chat pipeline (see
 * lenaCallDelegate), so the call leaves a normal conversation behind that can be reopened and
 * continued by typing.
 */

type LenaCallOverlayProps = {
  open: boolean;
  onClose: () => void;
  lang: string;
  userId: number;
  companyId?: number;
  /** The thread the call joins. Omitted for a call started from a new chat. */
  conversationId?: number;
  /** Fires when a call started from a new chat creates its thread. */
  onConversationCreated?: (id: number) => void;
  onError: (error: unknown) => void;
  connectingLabel?: string;
  listeningLabel?: string;
  speakingLabel?: string;
  consultingLabel?: string;
  hangUpLabel?: string;
  titleLabel?: string;
  emptyTranscriptLabel?: string;
  callerLabel?: string;
};

export const LenaCallOverlay = ({
  open,
  onClose,
  lang,
  userId,
  companyId,
  conversationId,
  onConversationCreated,
  onError,
  connectingLabel = 'Connecting',
  listeningLabel = 'Listening',
  speakingLabel = 'Lena is speaking',
  consultingLabel = 'Checking with Lena',
  hangUpLabel = 'Hang up',
  titleLabel = 'Call with Lena',
  emptyTranscriptLabel = 'Say something to start.',
  callerLabel = 'You',
}: LenaCallOverlayProps) => {
  // Rebuilt only when the call's identity changes, so one call keeps one thread across its turns.
  const askLena = useMemo(
    () => createLenaCallDelegate({ userId, companyId, lang, conversationId, onConversationCreated }),
    [companyId, conversationId, lang, onConversationCreated, userId],
  );

  const { status, turns, consultingLena, lenaSpeaking, start, stop } = useLenaRealtimeCall({
    lang,
    conversationId,
    askLena,
    onError,
  });

  const transcriptRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  // Opening the panel places the call; closing it hangs up. Guarded so React's development double
  // effect run cannot dial twice.
  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true;
      void start();
    }
    if (!open && startedRef.current) {
      startedRef.current = false;
      stop();
    }
  }, [open, start, stop]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns.length, consultingLena]);

  const hangUp = () => { stop(); onClose(); };

  const statusLabel = status === 'connecting' ? connectingLabel
    : consultingLena ? consultingLabel
      : lenaSpeaking ? speakingLabel
        : listeningLabel;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950/95 px-6 py-10 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={titleLabel}
        >
          <div className="flex flex-col items-center gap-4">
            {/* The ring tracks who holds the floor, so a caller can see at a glance whether Lena is
                still talking or waiting on them - the thing that is hardest to judge by ear. */}
            <div className="relative flex h-28 w-28 items-center justify-center">
              <span
                className={cn(
                  'absolute inset-0 rounded-full transition-all duration-300',
                  lenaSpeaking ? 'animate-ping bg-primary/30' : 'bg-primary/10',
                )}
              />
              <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary text-white">
                {status === 'connecting' || consultingLena
                  ? <Loader2 className="h-9 w-9 animate-spin" />
                  : <Sparkles className="h-9 w-9" />}
              </span>
            </div>
            <p className="text-lg font-bold text-white">{titleLabel}</p>
            <p className="text-sm font-medium text-slate-300" aria-live="polite">{statusLabel}</p>
          </div>

          <div
            ref={transcriptRef}
            className="my-6 w-full max-w-2xl flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white/5 p-5"
          >
            {turns.length === 0 && (
              <p className="text-center text-sm text-slate-400">{emptyTranscriptLabel}</p>
            )}
            {turns.map((turn) => (
              <div key={turn.id} className={cn('flex', turn.speaker === 'caller' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                    turn.speaker === 'caller' ? 'bg-primary text-white' : 'bg-slate-800 text-slate-100',
                  )}
                >
                  <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide opacity-60">
                    {turn.speaker === 'caller' ? callerLabel : 'Lena'}
                  </span>
                  {turn.text}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={hangUp}
            aria-label={hangUpLabel}
            className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-rose-600 text-white transition-all hover:bg-rose-500"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
