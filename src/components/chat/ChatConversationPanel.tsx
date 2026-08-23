import { AlertCircle, Bot, Check, Copy, FileImage, FileSpreadsheet, FileText, Image as ImageIcon, Loader2, Mic, Paperclip, Phone, RefreshCw, Send, Video } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { ChatMessage, Conversation } from './types';
import { TypewriterText } from './TypewriterText';
import { formatAttachmentSize } from '../../lib/lenaLoadCanvas';
import { motion } from 'motion/react';

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

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
  onTitleClick?: () => void;
  headerLeading?: ReactNode;
  headerActions?: ReactNode;
  headerActionsLeading?: ReactNode;
  renderMessageExtra?: (message: ChatMessage) => ReactNode;
  extraContentVersion?: string | number;
  onAttachFile?: (file: File) => void | Promise<void>;
  attachmentAccept?: string;
  attachmentBusy?: boolean;
  attachmentDropLabel?: string;
  notSentMessageLabel?: string;
  retryMessageLabel?: string;
  copyMessageLabel?: string;
  copiedMessageLabel?: string;
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
  onTitleClick,
  headerLeading,
  headerActions,
  headerActionsLeading,
  renderMessageExtra,
  extraContentVersion,
  onAttachFile,
  attachmentAccept,
  attachmentBusy = false,
  attachmentDropLabel = 'Drop file for LenaAI',
  notSentMessageLabel = 'Not sent',
  retryMessageLabel = 'Retry',
  copyMessageLabel = 'Copy message',
  copiedMessageLabel = 'Copied',
}: ChatConversationPanelProps) => {
  const primaryActionButtonClass = 'h-9 rounded-lg bg-primary text-white flex items-center justify-center cursor-pointer transition-all hover:brightness-95';
  const messageListRef = useRef<HTMLDivElement>(null);
  const messageContentRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const previousConversationIdRef = useRef<string | null>(null);
  const knownMessageIdsRef = useRef(new Set(activeConversation.messages.map((message) => message.id)));
  const knownMessagesConversationIdRef = useRef<string | null>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
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
    const file = event.dataTransfer.files?.[0];
    if (file) void onAttachFile?.(file);
  };

  const scrollMessageListToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const messageList = messageListRef.current;
    messageList?.scrollTo({ top: messageList.scrollHeight, behavior });
  }, []);

  const scrollMessageListAfterLayout = useCallback(() => {
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

    const newMessages = activeConversation.messages.filter((message) => !knownMessageIdsRef.current.has(message.id));
    newMessages.forEach((message) => knownMessageIdsRef.current.add(message.id));

    const latestNewMessage = newMessages.at(-1);
    if (activeConversation.isAiDispatch && latestNewMessage?.sender === 'other') {
      setTypingMessageId(latestNewMessage.id);
    }
  }, [activeConversation.id, activeConversation.isAiDispatch, activeConversation.messages]);

  useLayoutEffect(() => {
    // Scroll only the message list. scrollIntoView also scrolls outer ancestors,
    // which can move the entire application when this view opens from the header.
    const isSameConversation = previousConversationIdRef.current === activeConversation.id;
    previousConversationIdRef.current = activeConversation.id;
    scrollMessageListToBottom(isSameConversation ? 'smooth' : 'auto');
  }, [activeConversation.id, activeConversation.messages.length, otherTyping, scrollMessageListToBottom]);

  useLayoutEffect(() => {
    if (extraContentVersion === undefined) return;
    scrollMessageListAfterLayout();
  }, [extraContentVersion, scrollMessageListAfterLayout]);

  useLayoutEffect(() => {
    const messageContent = messageContentRef.current;
    if (!messageContent || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(() => scrollMessageListAfterLayout());
    observer.observe(messageContent);
    return () => observer.disconnect();
  }, [activeConversation.id, scrollMessageListAfterLayout]);

  return (
  <div
    className={cn("relative lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden h-full min-h-0", className)}
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
    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
      {headerLeading ?? <div>
        {onTitleClick ? (
          <button
            type="button"
            onClick={onTitleClick}
            className="text-sm font-bold text-primary hover:underline cursor-pointer text-left"
          >
            {activeConversation.name}
          </button>
        ) : (
          <p className="text-sm font-bold dark:text-white">{activeConversation.name}</p>
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
      {headerActions ?? <div className="flex items-center gap-2">
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
        key={activeConversation.id}
        ref={messageListRef}
        className="absolute inset-0 overflow-y-auto p-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
      <div ref={messageContentRef}>
      {activeConversation.messages.map((m, index) => {
        const isAiAnswer = Boolean(activeConversation.isAiDispatch) && m.sender === 'other';
        const previousSender = activeConversation.messages[index - 1]?.sender;
        const turnChanged = index > 0 && previousSender !== undefined && previousSender !== m.sender;
        return (
        <div key={m.id} className={cn('group relative', index > 0 && (turnChanged ? 'mt-14' : 'mt-3'), isAiAnswer ? 'w-full' : 'w-fit max-w-[min(85%,36rem)]', m.sender === 'me' ? 'ml-auto' : m.sender === 'system' ? 'mx-auto' : 'mr-auto')}>
          {m.sender === 'other' && typingMessageId !== m.id && (
            <button
              type="button"
              onClick={() => void copyMessage(m.id, m.text)}
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
                'whitespace-pre-wrap text-base',
                m.sender === 'me'
                  ? 'text-right text-white'
                  : m.sender === 'system'
                    ? 'text-amber-800'
                    : 'dark:text-slate-200'
              )}
            >
              {typingMessageId === m.id ? (
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
            {m.attachments?.filter((attachment) => attachment.name !== 'LenaAI conversation').map((attachment, index) => {
              const AttachmentIcon = attachment.type.includes('spreadsheet') || /\.(xlsx?|csv)$/i.test(attachment.name)
                ? FileSpreadsheet
                : attachment.type.startsWith('image/')
                  ? FileImage
                  : FileText;
              return (
                <div key={`${attachment.name}-${index}`} className={cn('mt-2 flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left', m.sender === 'me' ? 'border-white/25 bg-white/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800')}>
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', m.sender === 'me' ? 'bg-white/15 text-white' : 'bg-primary/10 text-primary')}><AttachmentIcon className="h-4 w-4" /></span>
                  <span className="min-w-0"><span className="block max-w-52 truncate text-xs font-bold">{attachment.name}</span><span className={cn('block text-[10px]', m.sender === 'me' ? 'text-white/70' : 'text-slate-400')}>{attachment.type.split('/').at(-1)?.toUpperCase()} · {formatAttachmentSize(attachment.size)}</span></span>
                </div>
              );
            })}
          </div>
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
          {typingMessageId !== m.id && renderMessageExtra?.(m)}
        </div>
        );
      })}
      {otherTyping && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mr-auto mt-14 w-fit px-0.5 py-1 text-base"
          role="status"
          aria-label={thinkingLabel}
        >
          <span
            aria-hidden="true"
            className="animate-text-shimmer bg-[length:200%_100%] bg-[linear-gradient(90deg,#94a3b8_20%,#334155_50%,#94a3b8_80%)] bg-clip-text text-transparent dark:bg-[linear-gradient(90deg,#64748b_20%,#f8fafc_50%,#64748b_80%)]"
          >
            {thinkingLabel}
          </span>
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
          accept={attachmentAccept}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onAttachFile?.(file);
            event.target.value = '';
          }}
        />
        <button type="button" disabled={attachmentBusy} onClick={() => onAttachFile && attachmentInputRef.current?.click()} className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer disabled:cursor-wait disabled:opacity-60" title={activeConversation.isAiDispatch ? 'Excel, CSV, image or PDF' : undefined}>
          {attachmentBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        </button>
        {!activeConversation.isAiDispatch && <button className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer"><ImageIcon className="w-4 h-4" /></button>}
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
          placeholder={messagePlaceholder}
          className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white outline-none"
        />
        {!activeConversation.isAiDispatch && <button className="h-9 w-9 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center cursor-pointer transition-all"><Mic className="w-4 h-4" /></button>}
        <button onClick={onSend} className={cn(primaryActionButtonClass, 'w-9')}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
  );
};
