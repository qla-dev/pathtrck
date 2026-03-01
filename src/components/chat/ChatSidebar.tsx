import { Circle, Search } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Channel, Conversation } from './types';

type ChatChannelFilter = 'all' | Channel;

type ChannelTab = {
  id: ChatChannelFilter;
  label: string;
};

type ChatSidebarProps = {
  searchPlaceholder: string;
  channels: ChannelTab[];
  channelFilter: ChatChannelFilter;
  onChannelFilterChange: (filter: ChatChannelFilter) => void;
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
};

export const ChatSidebar = ({
  searchPlaceholder,
  channels,
  channelFilter,
  onChannelFilterChange,
  conversations,
  activeConversationId,
  onSelectConversation,
}: ChatSidebarProps) => (
  <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-col h-full min-h-0">
    <div className="relative mb-3">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        placeholder={searchPlaceholder}
        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
      />
    </div>

    <div className="grid grid-cols-4 gap-1 mb-3">
      {channels.map((ch) => (
        <button
          key={ch.id}
          onClick={() => onChannelFilterChange(ch.id)}
          className={cn(
            'h-8 rounded-lg text-[11px] font-bold cursor-pointer transition-all',
            channelFilter === ch.id
              ? 'bg-primary text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          )}
        >
          {ch.label}
        </button>
      ))}
    </div>

    <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
      {conversations.map((chat) => (
        <button
          key={chat.id}
          onClick={() => onSelectConversation(chat.id)}
          className={cn(
            'w-full p-3 rounded-xl border text-left transition-all cursor-pointer',
            activeConversationId === chat.id
              ? 'border-primary bg-primary/5'
              : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold dark:text-white">{chat.name}</p>
              <p className="text-[11px] text-slate-500">{chat.role}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">{chat.lastTime}</p>
              {chat.unread > 0 && (
                <span className="inline-flex mt-1 px-1.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">
                  {chat.unread}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Circle className={cn('w-2.5 h-2.5', chat.online ? 'text-emerald-500 fill-current' : 'text-slate-300')} />
            <span className="text-[11px] text-slate-500 uppercase">{chat.channel}</span>
          </div>
        </button>
      ))}
    </div>
  </div>
);

