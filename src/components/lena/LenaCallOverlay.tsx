import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2, Mic, MicOff, PhoneOff, Sparkles } from 'lucide-react';
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
 *
 * This component is mounted once, above the router (see LenaCallProvider), and never by a view.
 * The connection, the microphone and the data channel all live in refs inside the hook below, so
 * unmounting this is hanging up - which is why minimising only swaps what it renders.
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
  /** Lets a thread open behind the call refresh itself after each turn. */
  onTurnComplete?: () => void;
  /** Shown as a header button only when the caller is somewhere the panel can actually open. */
  onOpenDraftPanel?: () => void;
  /** Collapsed to the corner, with the call still up. */
  minimised?: boolean;
  onMinimise?: () => void;
  onRestore?: () => void;
  onError: (error: unknown) => void;
  connectingLabel?: string;
  listeningLabel?: string;
  speakingLabel?: string;
  consultingLabel?: string;
  hangUpLabel?: string;
  titleLabel?: string;
  emptyTranscriptLabel?: string;
  callerLabel?: string;
  muteLabel?: string;
  unmuteLabel?: string;
  minimiseLabel?: string;
  restoreLabel?: string;
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
  onOpenDraftPanel,
  minimised = false,
  onMinimise,
  onRestore,
  onError,
  connectingLabel = 'Connecting',
  listeningLabel = 'Listening',
  speakingLabel = 'Lena is speaking',
  consultingLabel = 'Checking with Lena',
  hangUpLabel = 'Hang up',
  titleLabel = 'Call with Lena',
  emptyTranscriptLabel = 'Say something to start.',
  callerLabel = 'You',
  muteLabel = 'Mute microphone',
  unmuteLabel = 'Unmute microphone',
  minimiseLabel = 'Minimise call',
  restoreLabel = 'Back to call',
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

  const { status, turns, consultingLena, lenaSpeaking, muted, inputLevel, toggleMute, start, stop } = useLenaRealtimeCall({
    lang,
    conversationId,
    askLena: delegate.ask,
    onError,
  });

  const transcriptRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  // Opening the panel places the call; closing it hangs up. Guarded so React's development double
  // effect run cannot dial twice.
  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true;
      // The thread is created as the call is placed, so a call that never delegates a question
      // still leaves a conversation behind to reopen. A failure here must not stop the call.
      void delegate.ensureConversation().catch(() => undefined).then(() => start());
    }
    if (!open && startedRef.current) {
      startedRef.current = false;
      setSkills([]);
      stop();
    }
  }, [delegate, open, start, stop]);

  useEffect(() => {
    if (minimised) return;
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns.length, consultingLena, minimised]);

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

  const micButton = (large: boolean) => (
    <button
      type="button"
      onClick={toggleMute}
      aria-label={muted ? unmuteLabel : muteLabel}
      aria-pressed={muted}
      title={muted ? unmuteLabel : muteLabel}
      className={cn(
        'relative flex cursor-pointer items-center justify-center rounded-full transition-all',
        large ? 'h-16 w-16' : 'h-10 w-10',
        muted ? 'bg-rose-600/20 text-rose-300 hover:bg-rose-600/30' : 'bg-white/10 text-white hover:bg-white/20',
      )}
    >
      {/* The ring is the level meter: it grows with the caller's voice, so a driver can see at a
          glance that the call is hearing them. It is hidden while muted, where a moving ring
          would say the opposite of what the button says. */}
      {!muted && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary/70"
          style={{ transform: `scale(${1 + inputLevel * 0.45})`, opacity: 0.25 + inputLevel * 0.75 }}
        />
      )}
      {muted
        ? <MicOff className={large ? 'h-6 w-6' : 'h-4 w-4'} />
        : <Mic className={large ? 'h-6 w-6' : 'h-4 w-4'} />}
    </button>
  );

  const hangUpButton = (large: boolean) => (
    <button
      type="button"
      onClick={hangUp}
      aria-label={hangUpLabel}
      title={hangUpLabel}
      className={cn(
        'flex cursor-pointer items-center justify-center rounded-full bg-rose-600 text-white transition-all hover:bg-rose-500',
        large ? 'h-16 w-16' : 'h-10 w-10',
      )}
    >
      <PhoneOff className={large ? 'h-6 w-6' : 'h-4 w-4'} />
    </button>
  );

  return createPortal(
    <AnimatePresence>
      {open && (minimised ? (
        // Minimised: a bar in the corner, deliberately above the app but not over it, so the
        // caller can work the draft panel and the thread while still talking.
        <motion.div
          key="lena-call-minimised"
          className="fixed bottom-4 right-4 z-[400] flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 shadow-2xl backdrop-blur-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          role="dialog"
          aria-label={titleLabel}
        >
          <button
            type="button"
            onClick={onRestore}
            aria-label={restoreLabel}
            title={restoreLabel}
            className="flex cursor-pointer items-center gap-2 text-left"
          >
            <span className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-all',
              lenaSpeaking && 'animate-pulse',
            )}>
              {status === 'connecting' || consultingLena
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Sparkles className="h-4 w-4" />}
            </span>
            <span className="flex flex-col">
              <span className="text-xs font-bold text-white">{titleLabel}</span>
              <span className="text-[11px] text-slate-300" aria-live="polite">{skillLine || statusLabel}</span>
            </span>
          </button>
          {micButton(false)}
          {hangUpButton(false)}
        </motion.div>
      ) : (
        <motion.div
          key="lena-call"
          className="fixed inset-0 z-[400] flex flex-col items-center justify-between bg-slate-950/95 px-6 py-10 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={titleLabel}
        >
          {/* Header actions: leaving the call up while looking at the draft it is filling in is the
              whole point of minimising, so both buttons sit together. */}
          <div className="absolute right-4 top-4 flex items-center gap-2">
            {onOpenDraftPanel && (
              <button
                type="button"
                onClick={onOpenDraftPanel}
                aria-label={draftPanelLabel}
                title={draftPanelLabel}
                className="flex h-10 cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 text-xs font-bold text-white transition-all hover:bg-white/20"
              >
                <Sparkles className="h-4 w-4" />
                {draftPanelLabel}
              </button>
            )}
            {onMinimise && (
              <button
                type="button"
                onClick={onMinimise}
                aria-label={minimiseLabel}
                title={minimiseLabel}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-all hover:bg-white/20"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            )}
          </div>

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
            {skillLine && (
              <p className="flex items-center gap-1.5 text-xs font-bold text-primary" aria-live="polite">
                <Sparkles className="h-3.5 w-3.5" />
                {skillLine}
              </p>
            )}
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

          <div className="flex items-center gap-5">
            {micButton(true)}
            {hangUpButton(true)}
          </div>
        </motion.div>
      ))}
    </AnimatePresence>,
    document.body,
  );
};
