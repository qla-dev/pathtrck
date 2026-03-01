import { Bot, Image as ImageIcon, Mic, Paperclip, Phone, Send, Video } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Conversation } from './types';

type ChatConversationPanelProps = {
  activeConversation: Conversation;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  messagePlaceholder: string;
  className?: string;
  showAiDispatchButton?: boolean;
  aiDispatchLabel?: string;
  onAiDispatchClick?: () => void;
};

export const ChatConversationPanel = ({
  activeConversation,
  draft,
  onDraftChange,
  onSend,
  messagePlaceholder,
  className,
  showAiDispatchButton = false,
  aiDispatchLabel = 'Write with AI Dispatch',
  onAiDispatchClick,
}: ChatConversationPanelProps) => {
  const primaryActionButtonClass = 'h-9 rounded-lg bg-primary text-white flex items-center justify-center cursor-pointer transition-all hover:brightness-95';

  return (
  <div className={cn("lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden h-full min-h-0", className)}>
    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
      <div>
        <p className="text-sm font-bold dark:text-white">{activeConversation.name}</p>
        <p className="text-[11px] text-slate-500">{activeConversation.role}</p>
      </div>
      <div className="flex items-center gap-1">
        <button className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer">
          <Phone className="w-4 h-4" />
        </button>
        <button className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer">
          <Video className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div className="flex-1 min-h-0 p-4 space-y-3 overflow-y-auto bg-slate-50/70 dark:bg-slate-950/40">
      {activeConversation.messages.map((m) => (
        <div
          key={m.id}
          className={cn(
            'max-w-[85%] rounded-2xl px-3 py-2',
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
                ? 'text-white'
                : m.sender === 'system'
                  ? 'text-amber-800'
                  : 'dark:text-slate-200'
            )}
          >
            {m.text}
          </p>
          <p
            className={cn(
              'text-[10px] mt-1',
              m.sender === 'me'
                ? 'text-white/70'
                : m.sender === 'system'
                  ? 'text-amber-700'
                  : 'text-slate-400'
            )}
          >
            {m.time}
          </p>
        </div>
      ))}
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
        {showAiDispatchButton && (
          <button
            onClick={onAiDispatchClick}
            className={cn(primaryActionButtonClass, 'px-3 text-xs font-bold gap-1.5')}
          >
            <Bot className="w-4 h-4" />
            {aiDispatchLabel}
          </button>
        )}
        <button onClick={onSend} className={cn(primaryActionButtonClass, 'w-9')}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
  );
};
