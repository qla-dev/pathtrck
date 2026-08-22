import { Circle, Search, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Conversation } from './types';

type ChannelTab = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type ChatSidebarProps = {
  searchPlaceholder: string;
  channels: ChannelTab[];
  channelFilter: string;
  onChannelFilterChange: (filter: string) => void;
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  statusText?: (conversation: Conversation) => string;
};

export const ChatSidebar = ({
  searchPlaceholder,
  channels,
  channelFilter,
  onChannelFilterChange,
  conversations,
  activeConversationId,
  onSelectConversation,
  statusText,
}: ChatSidebarProps) => (
  <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-col h-full min-h-0">
    <div className="relative mb-3">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        placeholder={searchPlaceholder}
        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
      />
    </div>

    <div className="mb-2.5 grid grid-cols-3 gap-1">
      {channels.map((ch) => {
        const Icon = ch.icon;
        return (
          <button
            key={ch.id}
            onClick={() => onChannelFilterChange(ch.id)}
            className={cn(
              'flex h-8 items-center justify-center gap-1 rounded-lg px-1.5 text-[10px] font-bold cursor-pointer transition-all',
              channelFilter === ch.id
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            )}
          >
            <Icon className="h-3 w-3 shrink-0" />
            <span className="truncate">{ch.label}</span>
          </button>
        );
      })}
    </div>

    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
      {conversations.map((chat) => (
        <button
          key={chat.id}
          onClick={() => onSelectConversation(chat.id)}
          className={cn(
            'w-full rounded-xl border p-2.5 text-left transition-all cursor-pointer',
            activeConversationId === chat.id
              ? 'border-primary bg-primary/5'
              : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold dark:text-white">{chat.name}</p>
              {!chat.isAiDispatch && <p className="truncate text-[10px] text-slate-500">{chat.role}</p>}
            </div>
            <p className="shrink-0 text-[9px] text-slate-400">{chat.lastTime}</p>
          </div>
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <Circle className={cn('h-2 w-2 shrink-0', chat.online ? 'fill-current text-emerald-500' : 'text-slate-300')} />
              <span className="truncate text-[10px] uppercase text-slate-500">{statusText?.(chat) || chat.status || chat.channel}</span>
            </div>
            {chat.unread > 0 && (
              <span className="inline-flex shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white">
                {chat.unread}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  </div>
);

