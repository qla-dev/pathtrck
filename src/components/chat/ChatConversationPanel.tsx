import { AlertCircle, Bot, Check, Copy, Image as ImageIcon, Loader2, Mic, Paperclip, Phone, RefreshCw, Send, Video } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { defaultStyles, FileIcon } from 'react-file-icon';
import { cn } from '../../lib/cn';
import { ChatMessage, Conversation } from './types';
import { TypewriterText } from './TypewriterText';
import { LenaThinkingIndicator } from './LenaThinkingIndicator';
import type { LenaThinkingTimeline } from '../../lib/lenaThinkingTimeline';
import { formatAttachmentSize, isInlineViewableLenaAttachment } from '../../lib/lenaLoadCanvas';
import { api } from '../../services/api';
import { showError } from '../../lib/swal';
import { motion } from 'motion/react';

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

// Renders a real per-format badge (PDF/XLSX/CSV/JPG/...) instead of a generic file glyph -
// lucide-react has no such icons, so this reads the extension straight off the file name.
const attachmentExtension = (name: string): string => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
const attachmentIconStyle = (extension: string) => (defaultStyles as Record<string, object>)[extension] || {};

const renderMessageText = (text: string) =>
  text.split(URL_PATTERN).map((part, index) => {
    if (index % 2 === 0) return part;
    const trailingMatch = part.match(/[.,)\]]+$/);
    const trailing = trailingMatch ? trailingMatch[0] : '';
    const url = trailing ? part.slice(0, -trailing.length) : part;
    return (
      <span key={index}>
        <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 break-all hover:opacity-80">
          {url}
        </a>
        {trailing}
      </span>
    );
  });

type ChatConversationPanelProps = {
  activeConversation: Conversation;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  messagePlaceholder: string;
  className?: string;
  otherTyping?: boolean;
  thinkingLabel?: string;
  thinkingPhrases?: string[];
  /** The reply in flight: names the skills LenaAI uses between its thinking phrases. */
  thinkingTimeline?: LenaThinkingTimeline | null;
  /** Shown before a skill's name, e.g. "koristi skill". */
  thinkingSkillLabel?: string;
  onTitleClick?: () => void;
  headerLeading?: ReactNode;
  /** Reserves space for header actions in narrow side panels. */
  compactHeader?: boolean;
  headerActions?: ReactNode;
  headerActionsLeading?: ReactNode;
  renderMessageExtra?: (message: ChatMessage) => ReactNode;
  /** Content that belongs to the reply itself (e.g. LenaAI's legal source links) and so is laid
   *  out inside the bubble, directly under the text and above the hover timestamp. */
  renderMessageBeforeTime?: (message: ChatMessage) => ReactNode;
  extraContentVersion?: string | number;
  /** Remounts the message list (replaying its entry animation and resetting its scroll) when this
   *  changes. Defaults to the conversation id; pass a token that only moves on a real thread switch
   *  when the id itself can change under a thread that the user is already reading. */
  entryAnimationKey?: string | number;
  attachmentLimitLabel?: string;
  onAttachFile?: (files: File[]) => void | Promise<void>;
  attachmentAccept?: string;
  attachmentBusy?: boolean;
  attachmentDropLabel?: string;
  // Covers both a text message in flight and an attachment upload/scan in flight, so the send
  // button can't be double-clicked into firing a second request while the first is still pending.
  sendBusy?: boolean;
  notSentMessageLabel?: string;
  retryMessageLabel?: string;
  copyMessageLabel?: string;
  copiedMessageLabel?: string;
  uploadingMessageLabel?: string;
  attachmentOpenFailedLabel?: string;
  // Drives an inline unit hint and live input formatting for the draft field, keyed to whatever
  // structured questionnaire step LenaAI is currently waiting on (see lenaStepInputMask.ts).
  inputMask?: { unit?: string; format: (value: string) => string } | null;
  // True while LenaAI is waiting on a pill-driven single/multi-select questionnaire step - the
  // typed field is disabled so the answer can only come from the pills (which always include a
  // "later"/"none" escape option), never from free text that the pills wouldn't expect.
  inputLocked?: boolean;
  inputLockedPlaceholder?: string;
  loadingOlderMessages?: boolean;
  hasOlderMessages?: boolean;
  onLoadOlderMessages?: () => void;
};

export const ChatConversationPanel = ({
  activeConversation,
  draft,
  onDraftChange,
  onSend,
  messagePlaceholder,
  className,
  otherTyping = false,
  thinkingLabel = 'Thinking',
  thinkingPhrases,
  thinkingTimeline,
  thinkingSkillLabel,
  onTitleClick,
  headerLeading,
  compactHeader = false,
  headerActions,
  headerActionsLeading,
  renderMessageExtra,
  renderMessageBeforeTime,
  extraContentVersion,
  entryAnimationKey,
  onAttachFile,
  attachmentLimitLabel = 'Select up to 5 files at once.',
  attachmentAccept,
  attachmentBusy = false,
  sendBusy = false,
  attachmentDropLabel = 'Drop file for LenaAI',
  notSentMessageLabel = 'Not sent',
  retryMessageLabel = 'Retry',
  copyMessageLabel = 'Copy message',
  copiedMessageLabel = 'Copied',
  uploadingMessageLabel = 'Uploading...',
  attachmentOpenFailedLabel = 'The file could not be opened',
  inputMask = null,
  inputLocked = false,
  inputLockedPlaceholder,
  loadingOlderMessages = false,
  hasOlderMessages = false,
  onLoadOlderMessages,
}: ChatConversationPanelProps) => {
  const primaryActionButtonClass = 'h-9 rounded-lg bg-primary text-white flex items-center justify-center cursor-pointer transition-all hover:brightness-95';
  const messageListRef = useRef<HTMLDivElement>(null);
  const messageContentRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const previousConversationIdRef = useRef<string | null>(null);
  const restoreScrollPositionRef = useRef<{ height: number; top: number } | null>(null);
  const preservingOlderMessagesRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const knownMessageIdsRef = useRef(new Set(activeConversation.messages.map((message) => message.id)));
  const knownMessagesConversationIdRef = useRef<string | null>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  // The reply lands a render or two after the assistant stops "thinking" (the saved messages are
  // merged into the history by an effect). Dropping the indicator the moment thinking ends would
  // shrink the thread by its height and grow it straight back, which reads as the conversation
  // jumping. So the indicator holds its place until the reply it is standing in for is on screen.
  const [holdThinkingIndicator, setHoldThinkingIndicator] = useState(false);
  const previousOtherTypingRef = useRef(false);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const hasAttachmentHandler = activeConversation.isAiDispatch && Boolean(onAttachFile);
  const canAttach = hasAttachmentHandler && !attachmentBusy;

  const copyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      window.setTimeout(() => setCopiedMessageId((current) => current === id ? null : current), 1500);
    } catch {
      // Clipboard permission can be denied by the browser; the message text stays selectable regardless.
    }
  };

  const handleAttachmentDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasAttachmentHandler || !event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    if (canAttach) setIsDraggingAttachment(true);
  };

  const handleAttachmentDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDraggingAttachment(false);
  };

  const handleAttachmentDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!hasAttachmentHandler) return;
    event.preventDefault();
    setIsDraggingAttachment(false);
    if (!canAttach) return;
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length > 5) { window.alert(attachmentLimitLabel); return; }
    if (files.length) void onAttachFile?.(files);
  };

  // A freshly appended assistant reply has to render through the typewriter from its very first
  // render. setTypingMessageId can only switch it on from a layout effect, one commit later, which
  // leaves a commit where the reply is laid out at its full height - and the scroll effects in that
  // same commit measure exactly that height, so the thread lurches down by the whole length of the
  // reply and snaps back when the typewriter takes over at one character. Known ids are updated in
  // that same effect, so a reply that is not in them yet is one this render is seeing for the first
  // time. The conversation check keeps a freshly opened thread from replaying its last reply: the
  // known ids still belong to the previous conversation until that effect catches up.
  const latestMessage = activeConversation.messages.at(-1);
  const freshAiReplyId = Boolean(activeConversation.isAiDispatch)
    && knownMessagesConversationIdRef.current === activeConversation.id
    && latestMessage?.sender === 'other'
    && !knownMessageIdsRef.current.has(latestMessage.id)
    ? latestMessage.id
    : null;
  const animatingMessageId = freshAiReplyId ?? typingMessageId;

  const scrollMessageListToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const messageList = messageListRef.current;
    shouldStickToBottomRef.current = true;
    messageList?.scrollTo({ top: messageList.scrollHeight, behavior });
  }, []);

  const scrollMessageListAfterLayout = useCallback(() => {
    if (preservingOlderMessagesRef.current || !shouldStickToBottomRef.current) return;
    scrollMessageListToBottom('smooth');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollMessageListToBottom('auto'));
    });
    window.setTimeout(() => scrollMessageListToBottom('auto'), 180);
  }, [scrollMessageListToBottom]);

  useLayoutEffect(() => {
    if (knownMessagesConversationIdRef.current !== activeConversation.id) {
      knownMessagesConversationIdRef.current = activeConversation.id;
      knownMessageIdsRef.current = new Set(activeConversation.messages.map((message) => message.id));
      const welcomeMessage = activeConversation.messages.length === 1
        && activeConversation.messages[0]?.sender === 'other'
        && activeConversation.messages[0]?.id.startsWith('welcome-')
        ? activeConversation.messages[0]
        : null;
      setTypingMessageId(activeConversation.isAiDispatch ? welcomeMessage?.id ?? null : null);
      return;
    }

    // History hydration and "load older" prepend messages before IDs we already know. Those are
    // saved messages, not a fresh Lena reply, so only animate when the actual last message is new.
    const latestMessage = activeConversation.messages.at(-1);
    const appendedNewMessage = latestMessage && !knownMessageIdsRef.current.has(latestMessage.id)
      ? latestMessage
      : null;
    activeConversation.messages.forEach((message) => knownMessageIdsRef.current.add(message.id));

    if (activeConversation.isAiDispatch && appendedNewMessage?.sender === 'other') {
      setTypingMessageId(appendedNewMessage.id);
      // The reply is on screen in this same commit, so the indicator can go without a gap.
      setHoldThinkingIndicator(false);
    }
  }, [activeConversation.id, activeConversation.isAiDispatch, activeConversation.messages]);

  useLayoutEffect(() => {
    const wasTyping = previousOtherTypingRef.current;
    previousOtherTypingRef.current = otherTyping;
    // Arm on the rising edge only. Re-arming while thinking is still flagged could hold an
    // indicator for a reply that has already rendered.
    if (otherTyping) {
      if (!wasTyping) {
        setHoldThinkingIndicator(true);
      }
      return undefined;
    }
    if (!holdThinkingIndicator) return undefined;
    // Released above as soon as the reply renders; this is only the escape hatch for a reply that
    // never arrives (a failed request), so the indicator cannot get stuck.
    const timer = window.setTimeout(() => setHoldThinkingIndicator(false), 1000);
    return () => window.clearTimeout(timer);
  }, [holdThinkingIndicator, otherTyping]);

  useLayoutEffect(() => {
    // Scroll only the message list. scrollIntoView also scrolls outer ancestors,
    // which can move the entire application when this view opens from the header.
    const isSameConversation = previousConversationIdRef.current === activeConversation.id;
    previousConversationIdRef.current = activeConversation.id;
    if (restoreScrollPositionRef.current !== null) {
      const messageList = messageListRef.current;
      const previous = restoreScrollPositionRef.current;
      if (messageList) messageList.scrollTop = previous.top + messageList.scrollHeight - previous.height;
      restoreScrollPositionRef.current = null;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => { preservingOlderMessagesRef.current = false; });
      });
      return;
    }
    scrollMessageListToBottom(isSameConversation ? 'smooth' : 'auto');
  }, [activeConversation.id, activeConversation.messages.length, entryAnimationKey, otherTyping, scrollMessageListToBottom]);

  useLayoutEffect(() => {
    if (extraContentVersion === undefined) return;
    scrollMessageListAfterLayout();
  }, [extraContentVersion, scrollMessageListAfterLayout]);

  useLayoutEffect(() => {
    const messageContent = messageContentRef.current;
    if (!messageContent || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(() => {
      if (!preservingOlderMessagesRef.current && shouldStickToBottomRef.current) scrollMessageListAfterLayout();
    });
    observer.observe(messageContent);
    return () => observer.disconnect();
  }, [activeConversation.id, scrollMessageListAfterLayout]);

  return (
  <div
    className={cn("relative w-full min-w-0 max-w-full lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden h-full min-h-0", className)}
    onDragEnter={handleAttachmentDragOver}
    onDragOver={handleAttachmentDragOver}
    onDragLeave={handleAttachmentDragLeave}
    onDrop={handleAttachmentDrop}
  >
    {isDraggingAttachment && (
      <div className="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-white/95 text-sm font-black text-primary shadow-lg backdrop-blur-sm dark:bg-slate-900/95">
        {attachmentDropLabel}
      </div>
    )}
    <div className="min-w-0 overflow-hidden p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
      {headerLeading ?? <div className={`min-w-0 flex-1 ${compactHeader ? 'max-w-[calc(100%-7rem)]' : ''}`}>
        {onTitleClick ? (
          <button
            type="button"
            onClick={onTitleClick}
            className="block max-w-full truncate text-sm font-bold text-primary hover:underline cursor-pointer text-left"
          >
            {activeConversation.name}
          </button>
        ) : (
          <p className="truncate text-sm font-bold dark:text-white">{activeConversation.name}</p>
        )}
        {activeConversation.meta && (
          <p className="text-[11px] text-slate-400 truncate">{activeConversation.meta}</p>
        )}
        {activeConversation.isAiDispatch ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            <Bot className="h-3 w-3" />
            {activeConversation.role}
          </span>
        ) : (
          <p className="text-[11px] text-slate-500">{activeConversation.role}</p>
        )}
      </div>}
      {headerActions ? <div className="flex shrink-0 items-center gap-2">{headerActions}</div> : <div className="flex shrink-0 items-center gap-2">
        {headerActionsLeading}
        <div className="flex items-center gap-1">
          {!activeConversation.isAiDispatch && (
            <>
              <button className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer">
                <Phone className="w-4 h-4" />
              </button>
              <button className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer">
                <Video className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>}
    </div>

    <div className="relative flex-1 min-h-0 overflow-hidden bg-slate-50/70 dark:bg-slate-950/40">
      <motion.div
        key={entryAnimationKey ?? activeConversation.id}
        ref={messageListRef}
        className="absolute inset-0 overflow-x-hidden overflow-y-auto p-4"
        onScroll={(event) => {
          shouldStickToBottomRef.current = event.currentTarget.scrollHeight - event.currentTarget.scrollTop - event.currentTarget.clientHeight < 80;
          if (event.currentTarget.scrollTop > 32 || !hasOlderMessages || loadingOlderMessages || !onLoadOlderMessages) return;
          preservingOlderMessagesRef.current = true;
          restoreScrollPositionRef.current = { height: event.currentTarget.scrollHeight, top: event.currentTarget.scrollTop };
          onLoadOlderMessages();
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
      <div ref={messageContentRef}>
      {loadingOlderMessages && (
        <div className="mb-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      )}
      {activeConversation.messages.map((m, index) => {
        const isAiAnswer = Boolean(activeConversation.isAiDispatch) && m.sender === 'other';
        const previousSender = activeConversation.messages[index - 1]?.sender;
        const turnChanged = index > 0 && previousSender !== undefined && previousSender !== m.sender;
        return (
        <div key={m.id} className={cn('group relative', index > 0 && (turnChanged ? 'mt-14' : 'mt-3'), isAiAnswer ? 'w-full' : 'w-fit max-w-[min(85%,36rem)]', m.sender === 'me' ? 'ml-auto' : m.sender === 'system' ? 'mx-auto' : 'mr-auto')}>
          {/* The greeting and the out-of-messages card carry no copyable answer of their own, so
              neither offers the copy affordance - both are recognised by their message id. */}
          {m.sender === 'other' && animatingMessageId !== m.id && !m.id.startsWith('welcome-') && !m.id.startsWith('blocked-') && (
            <button
              type="button"
              onClick={() => void copyMessage(m.id, m.copyText ?? m.text)}
              title={copyMessageLabel}
              aria-label={copiedMessageId === m.id ? copiedMessageLabel : copyMessageLabel}
              className="absolute -top-7 left-0 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 opacity-0 shadow-sm transition-opacity hover:text-slate-600 focus-visible:opacity-100 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:text-slate-300"
            >
              {copiedMessageId === m.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
          <div
            className={cn(
              isAiAnswer ? 'w-full' : 'w-fit max-w-full rounded-2xl px-3 py-2',
              m.sender === 'me'
                ? 'ml-auto bg-primary text-white'
                : m.sender === 'system'
                  ? 'mx-auto bg-amber-100 text-amber-800 text-xs'
                  : isAiAnswer
                    ? ''
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
            )}
          >
            <p
              className={cn(
                // text-base's line-height leaves visible dead space above the glyphs themselves;
                // this pulls the text back up to sit flush with the top of the bubble/row.
                'whitespace-pre-wrap text-base -mt-[3px]',
                m.sender === 'me'
                  ? 'text-right text-white'
                  : m.sender === 'system'
                    ? 'text-amber-800'
                    : 'dark:text-slate-200'
              )}
            >
              {animatingMessageId === m.id ? (
                <TypewriterText
                  text={m.text}
                  render={renderMessageText}
                  onUpdate={scrollMessageListToBottom}
                  onComplete={() => {
                    setTypingMessageId((currentId) => currentId === m.id ? null : currentId);
                    scrollMessageListAfterLayout();
                  }}
                />
              ) : renderMessageText(m.text)}
            </p>
            {animatingMessageId !== m.id && renderMessageBeforeTime?.(m)}
            {m.time && m.sender !== 'me' && (
              <p
                className={cn(
                  'text-[10px] mt-1 opacity-0 transition-opacity group-hover:opacity-100',
                  m.sender === 'system' ? 'text-amber-700' : 'text-slate-400'
                )}
              >
                {m.time}
              </p>
            )}
          </div>
          {m.attachments?.filter((attachment) => attachment.name !== 'LenaAI conversation').map((attachment, index) => {
            const extension = attachmentExtension(attachment.name);
            const uploading = m.sender === 'me' && m.deliveryStatus === 'uploading';
            const cardClassName = cn(
              'relative mt-2 flex w-fit max-w-full items-center gap-2 overflow-hidden rounded-xl border px-2.5 py-2 text-left transition-colors',
              'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
              m.sender === 'me' ? 'ml-auto' : 'mr-auto',
              attachment.path && 'cursor-pointer hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10'
            );
            const cardContent = (
              <>
                <span className="w-5 shrink-0">
                  <FileIcon extension={extension} {...attachmentIconStyle(extension)} />
                </span>
                <span className="min-w-0">
                  <span className="block max-w-52 truncate text-xs font-bold text-slate-900 dark:text-white">{attachment.name}</span>
                  <span className="block text-[10px] text-slate-400">{extension ? extension.toUpperCase() : attachment.type.split('/').at(-1)?.toUpperCase()} · {formatAttachmentSize(attachment.size)}</span>
                </span>
                {uploading && (
                  <span
                    role="progressbar"
                    aria-label={uploadingMessageLabel}
                    className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-slate-100 dark:bg-slate-800"
                  >
                    <span className="absolute inset-y-0 w-1/3 animate-upload-progress rounded-full bg-primary" />
                  </span>
                )}
              </>
            );
            return attachment.path ? (
              <button
                key={`${attachment.name}-${index}`}
                type="button"
                onClick={() => void api.messageAttachments.open(
                  attachment.path!,
                  attachment.name,
                  isInlineViewableLenaAttachment(attachment.name, attachment.type)
                ).catch((error) => void showError(attachmentOpenFailedLabel, error instanceof Error ? error.message : undefined))}
                className={cardClassName}
              >
                {cardContent}
              </button>
            ) : (
              <div key={`${attachment.name}-${index}`} className={cardClassName}>
                {cardContent}
              </div>
            );
          })}
          {m.time && m.sender === 'me' && (
            <p className="mt-1 text-right text-[10px] text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
              {m.time}
            </p>
          )}
          {m.sender === 'me' && m.deliveryStatus === 'failed' && (
            <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-rose-500">
              <AlertCircle className="h-3 w-3" />
              <span>{notSentMessageLabel}</span>
              {m.onRetry && (
                <button
                  type="button"
                  onClick={m.onRetry}
                  className="ml-1 inline-flex cursor-pointer items-center gap-1 font-bold text-rose-600 hover:underline dark:text-rose-400"
                >
                  <RefreshCw className="h-3 w-3" />
                  {retryMessageLabel}
                </button>
              )}
            </div>
          )}
          {animatingMessageId !== m.id && renderMessageExtra?.(m)}
        </div>
        );
      })}
      {(otherTyping || holdThinkingIndicator) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mr-auto mt-14 w-fit px-0.5 py-1 text-base"
          role={thinkingPhrases?.length ? undefined : 'status'}
          aria-label={thinkingPhrases?.length ? undefined : thinkingLabel}
        >
          {thinkingPhrases?.length ? <LenaThinkingIndicator key={activeConversation.id} phrases={thinkingPhrases} timeline={thinkingTimeline} skillLabel={thinkingSkillLabel} /> : <span
            aria-hidden="true"
            className="animate-text-shimmer bg-[length:200%_100%] bg-[linear-gradient(90deg,#94a3b8_20%,#334155_50%,#94a3b8_80%)] bg-clip-text text-transparent dark:bg-[linear-gradient(90deg,#64748b_20%,#f8fafc_50%,#64748b_80%)]"
          >
            {thinkingLabel}
          </span>}
        </motion.div>
      )}
      </div>
      </motion.div>
    </div>

    <div className="p-3 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <input
          ref={attachmentInputRef}
          type="file"
          multiple
          accept={attachmentAccept}
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            if (files.length > 5) window.alert(attachmentLimitLabel);
            else if (files.length) void onAttachFile?.(files);
            event.target.value = '';
          }}
        />
        <button type="button" disabled={attachmentBusy} onClick={() => onAttachFile && attachmentInputRef.current?.click()} className="h-9 w-9 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer disabled:cursor-wait disabled:opacity-60" title={activeConversation.isAiDispatch ? 'Excel, CSV, image or PDF' : undefined}>
          {attachmentBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        </button>
        {!activeConversation.isAiDispatch && <button className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer"><ImageIcon className="w-4 h-4" /></button>}
        <div className="relative min-w-0 flex-1">
          <input
            value={draft}
            disabled={inputLocked}
            onChange={(e) => {
              const nextValue = inputMask ? inputMask.format(e.target.value) : e.target.value;
              // When the masked/capped result is identical to the previous value (e.g. typing
              // past a mask's character cap), React sees no state change and skips writing back
              // to the DOM - the browser's own uncommitted keystroke would otherwise linger on
              // screen even though state is correctly capped underneath. Setting it here forces
              // the input to reflect the real, capped value every time.
              e.target.value = nextValue;
              onDraftChange(nextValue);
            }}
            onKeyDown={(e) => e.key === 'Enter' && !sendBusy && !inputLocked && onSend()}
            placeholder={inputLocked ? (inputLockedPlaceholder ?? messagePlaceholder) : messagePlaceholder}
            className={cn(
              'h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white outline-none pl-3 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-slate-900',
              inputMask?.unit ? 'pr-10' : 'pr-3'
            )}
          />
          {inputMask?.unit && !inputLocked && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              {inputMask.unit}
            </span>
          )}
        </div>
        {!activeConversation.isAiDispatch && <button className="h-9 w-9 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center cursor-pointer transition-all"><Mic className="w-4 h-4" /></button>}
        <button type="button" onClick={onSend} disabled={sendBusy || inputLocked} className={cn(primaryActionButtonClass, 'w-9 shrink-0 disabled:cursor-not-allowed disabled:opacity-60')}>
          {sendBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  </div>
  );
};
