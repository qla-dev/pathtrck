import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Mic, MicOff, PhoneOff, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/cn';
import { createLenaCallDelegate } from '../../lib/lenaCallDelegate';
import { useLenaRealtimeCall } from '../../lib/useLenaRealtimeCall';

/**
 * The live call with Lena: a bar in the corner, never a full screen.
 *
 * A call is something you do *while* working, not instead of working - the caller is filling in a
 * load, watching the draft panel build itself, reading the thread. A full-screen panel hid exactly
 * the things the call was producing, so there is only this one state.
 *
 * Everything Lena actually does during a call runs through the ordinary chat pipeline (see
 * lenaCallDelegate), so what is said appears in the conversation as normal messages - which is
 * where the transcript lives, and why this bar does not carry one of its own.
 *
 * Mounted once, above the router (see LenaCallProvider), and never by a view: the connection, the
 * microphone and the data channel all live in refs inside the hook below, so unmounting this is
 * hanging up.
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
  /** Lets the thread behind the call refresh itself after each turn. */
  onTurnComplete?: () => void;
  /** Each finished caller turn, so the screen behind the bar can show what was heard. */
  onCallerTranscript?: (text: string) => void;
  /** Offered only when the caller is somewhere the panel can actually open. */
  onOpenDraftPanel?: () => void;
  onError: (error: unknown) => void;
  connectingLabel?: string;
  listeningLabel?: string;
  speakingLabel?: string;
  consultingLabel?: string;
  hangUpLabel?: string;
  titleLabel?: string;
  muteLabel?: string;
  unmuteLabel?: string;
  draftPanelLabel?: string;
  usingSkillLabel?: string;
};

export const LenaCallOverlay = ({
  open,
  onClose,
  lang,
  userId,
  companyId,
  conversationId,
  onConversationCreated,
  onTurnComplete,
  onCallerTranscript,
  onOpenDraftPanel,
  onError,
  connectingLabel = 'Connecting',
  listeningLabel = 'Listening',
  speakingLabel = 'Lena is speaking',
  consultingLabel = 'Checking with Lena',
  hangUpLabel = 'Hang up',
  titleLabel = 'Call with Lena',
  muteLabel = 'Mute microphone',
  unmuteLabel = 'Unmute microphone',
  draftPanelLabel = 'Draft panel',
  usingSkillLabel = 'is using skill',
}: LenaCallOverlayProps) => {
  /** The skills the pending reply uses, named by the server; empty between turns. */
  const [skills, setSkills] = useState<string[]>([]);

  // Rebuilt only when the call's identity changes, so one call keeps one thread across its turns.
  const delegate = useMemo(
    () => createLenaCallDelegate({
      userId, companyId, lang, conversationId, onConversationCreated,
      onSkills: setSkills,
      onTurnComplete,
    }),
    [companyId, conversationId, lang, onConversationCreated, onTurnComplete, userId],
  );

  const { status, consultingLena, lenaSpeaking, muted, inputLevel, toggleMute, start, stop } = useLenaRealtimeCall({
    lang,
    conversationId,
    askLena: delegate.ask,
    onCallerTranscript,
    onError,
  });

  const startedRef = useRef(false);

  // Opening places the call; closing hangs up. Guarded so React's development double effect run
  // cannot dial twice.
  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true;
      // The thread is created as the call is placed, so a call that never delegates a question
      // still leaves a conversation behind - and so the session is minted against a thread that
      // exists, which a call from a blank chat otherwise is not.
      void delegate.ensureConversation()
        .then((id) => start(id))
        // The thread could not be created, so the call is placed unscoped rather than not at all.
        .catch(() => start());
    }
    if (!open && startedRef.current) {
      startedRef.current = false;
      setSkills([]);
      stop();
    }
  }, [delegate, open, start, stop]);

  const hangUp = () => { stop(); onClose(); };

  const statusLabel = status === 'connecting' ? connectingLabel
    : consultingLena ? consultingLabel
      : lenaSpeaking ? speakingLabel
        : listeningLabel;

  // While a turn is in flight the skill is the more useful of the two: "checking with Lena" says
  // only that something is happening, where the skill's name says what.
  const skillLine = consultingLena && skills.length > 0
    ? `${usingSkillLabel} ${skills.join(', ')}`
    : null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="lena-call"
          className="fixed bottom-4 right-4 z-[400] flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 shadow-2xl backdrop-blur-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          role="dialog"
          aria-label={titleLabel}
        >
          <span className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-all',
            lenaSpeaking && 'animate-pulse',
          )}>
            {status === 'connecting' || consultingLena
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Sparkles className="h-4 w-4" />}
          </span>

          <span className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-bold text-white">{titleLabel}</span>
            <span className="truncate text-[11px] text-slate-300" aria-live="polite">
              {skillLine || statusLabel}
            </span>
          </span>

          {onOpenDraftPanel && (
            <button
              type="button"
              onClick={onOpenDraftPanel}
              aria-label={draftPanelLabel}
              title={draftPanelLabel}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-all hover:bg-white/20"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? unmuteLabel : muteLabel}
            aria-pressed={muted}
            title={muted ? unmuteLabel : muteLabel}
            className={cn(
              'relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-all',
              muted ? 'bg-rose-600/20 text-rose-300 hover:bg-rose-600/30' : 'bg-white/10 text-white hover:bg-white/20',
            )}
          >
            {/* The ring is the level meter: it grows with the caller's voice, so a driver can see
                at a glance that the call is hearing them. It is hidden while muted, where a moving
                ring would say the opposite of what the button says. */}
            {!muted && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary/70"
                style={{ transform: `scale(${1 + inputLevel * 0.45})`, opacity: 0.25 + inputLevel * 0.75 }}
              />
            )}
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={hangUp}
            aria-label={hangUpLabel}
            title={hangUpLabel}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-rose-600 text-white transition-all hover:bg-rose-500"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
