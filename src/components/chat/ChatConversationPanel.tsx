import { Bot, Image as ImageIcon, Mic, Paperclip, Phone, Send, Video } from 'lucide-react';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { ChatMessage, Conversation } from './types';

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
  onTitleClick?: () => void;
  renderMessageExtra?: (message: ChatMessage) => ReactNode;
};

export const ChatConversationPanel = ({
  activeConversation,
  draft,
  onDraftChange,
  onSend,
  messagePlaceholder,
  className,
  otherTyping = false,
  onTitleClick,
  renderMessageExtra,
}: ChatConversationPanelProps) => {
  const primaryActionButtonClass = 'h-9 rounded-lg bg-primary text-white flex items-center justify-center cursor-pointer transition-all hover:brightness-95';
  const messageListRef = useRef<HTMLDivElement>(null);
  const previousConversationIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    // Scroll only the message list. scrollIntoView also scrolls outer ancestors,
    // which can move the entire application when this view opens from the header.
    const isSameConversation = previousConversationIdRef.current === activeConversation.id;
    previousConversationIdRef.current = activeConversation.id;
    const messageList = messageListRef.current;
    messageList?.scrollTo({
      top: messageList.scrollHeight,
      behavior: isSameConversation ? 'smooth' : 'auto',
    });
  }, [activeConversation.id, activeConversation.messages.length, otherTyping]);

  return (
  <div className={cn("lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden h-full min-h-0", className)}>
    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
      <div>
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
        {!activeConversation.isAiDispatch && (
          <p className="text-[11px] text-slate-500">{activeConversation.role}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {activeConversation.isAiDispatch ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
            <Bot className="h-3.5 w-3.5" />
            {activeConversation.role}
          </span>
        ) : (
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
    </div>

    <div ref={messageListRef} className="flex-1 min-h-0 p-4 space-y-3 overflow-y-auto bg-slate-50/70 dark:bg-slate-950/40">
      {activeConversation.messages.map((m) => (
        <div key={m.id} className={cn('w-fit max-w-[min(85%,36rem)]', m.sender === 'me' ? 'ml-auto' : m.sender === 'system' ? 'mx-auto' : 'mr-auto')}>
          <div
            className={cn(
              'w-fit max-w-full rounded-2xl px-3 py-2',
              m.sender === 'me'
                ? 'ml-auto bg-primary text-white'
                : m.sender === 'system'
                  ? 'mx-auto bg-amber-100 text-amber-800 text-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
            )}
          >
            <p
              className={cn(
                'text-sm',
                m.sender === 'me'
                  ? 'text-right text-white'
                  : m.sender === 'system'
                    ? 'text-amber-800'
                    : 'dark:text-slate-200'
              )}
            >
              {renderMessageText(m.text)}
            </p>
            <p
              className={cn(
                'text-[10px] mt-1',
                m.sender === 'me'
                  ? 'text-right text-white/70'
                  : m.sender === 'system'
                    ? 'text-amber-700'
                    : 'text-slate-400'
              )}
            >
              {m.time}
            </p>
          </div>
          {renderMessageExtra?.(m)}
        </div>
      ))}
      {otherTyping && (
        <div className="max-w-[85%] mr-auto rounded-2xl rounded-tl-none px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 w-fit">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
        </div>
      )}
    </div>

    <div className="p-3 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <button className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer">
          <Paperclip className="w-4 h-4" />
        </button>
        <button className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer">
          <ImageIcon className="w-4 h-4" />
        </button>
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
          placeholder={messagePlaceholder}
          className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white outline-none"
        />
        <button className="h-9 w-9 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center cursor-pointer transition-all">
          <Mic className="w-4 h-4" />
        </button>
        <button onClick={onSend} className={cn(primaryActionButtonClass, 'w-9')}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
  );
};
