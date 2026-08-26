import { Plus, Circle, Search, Sparkles, Trash2, X, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/cn';
import { Conversation } from './types';

type ChannelTab = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type ChatSidebarProps = {
  searchPlaceholder: string;
  compactSearchPlaceholder?: string;
  channels: ChannelTab[];
  channelFilter: string;
  onChannelFilterChange: (filter: string) => void;
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  statusText?: (conversation: Conversation) => string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateActionLabel?: string;
  onEmptyStateAction?: () => void;
  emptyStateActionDisabled?: boolean;
  onDeleteConversation?: (id: string) => void;
  deleteConversationLabel?: string;
  cancelLabel?: string;
  // Shrinks to a narrow fixed-width rail instead of disappearing, so the conversation list
  // stays reachable while the draft panel is open. Search stays; channel filters drop their
  // labels down to icon-only; each row keeps its subtitle/timestamp and just crops harder.
  compact?: boolean;
  loading?: boolean;
};

export const ChatSidebar = ({
  searchPlaceholder,
  compactSearchPlaceholder = 'Search',
  channels,
  channelFilter,
  onChannelFilterChange,
  conversations,
  activeConversationId,
  onSelectConversation,
  statusText,
  emptyStateTitle,
  emptyStateDescription,
  emptyStateActionLabel,
  onEmptyStateAction,
  emptyStateActionDisabled,
  onDeleteConversation,
  deleteConversationLabel = 'Delete conversation',
  cancelLabel = 'Cancel',
  compact = false,
  loading = false,
}: ChatSidebarProps) => {
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!contextMenu) return undefined;
    const close = () => setContextMenu(null);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [contextMenu]);

  const menuWidth = 190;
  const menuHeight = 88;
  const menuStyle = contextMenu
    ? {
        left: Math.min(contextMenu.x, window.innerWidth - menuWidth - 8),
        top: Math.min(contextMenu.y, window.innerHeight - menuHeight - 8),
      }
    : undefined;
  // Anchors the scale/fade animation to whichever corner of the menu the cursor actually
  // landed on, so it opens outward from the click point instead of always from top-left -
  // matters once the position gets clamped to stay inside the viewport.
  const menuOrigin = contextMenu && menuStyle
    ? {
        x: Math.min(100, Math.max(0, ((contextMenu.x - menuStyle.left) / menuWidth) * 100)),
        y: Math.min(100, Math.max(0, ((contextMenu.y - menuStyle.top) / menuHeight) * 100)),
      }
    : { x: 0, y: 0 };

  return (
  <>
  <div className={cn('shrink-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-col h-full min-h-0', compact ? 'w-full lg:w-40' : 'w-full lg:w-80')}>
    <div className="relative mb-3">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        placeholder={compact ? compactSearchPlaceholder : searchPlaceholder}
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
            title={compact ? ch.label : undefined}
            className={cn(
              'flex h-8 items-center justify-center gap-1 rounded-lg px-1.5 text-[10px] font-bold cursor-pointer transition-all',
              channelFilter === ch.id
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            )}
          >
            <Icon className="h-3 w-3 shrink-0" />
            {!compact && <span className="truncate">{ch.label}</span>}
          </button>
        );
      })}
    </div>

    {loading ? (
      <div className="min-h-0 flex-1 space-y-1.5 overflow-hidden pr-1 animate-pulse">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="rounded-xl border border-slate-100 px-2.5 py-2 dark:border-slate-800">
            <div className="flex justify-between gap-3"><div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" /><div className="h-3 w-8 rounded bg-slate-100 dark:bg-slate-800" /></div>
            <div className="mt-1.5 h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    ) : conversations.length === 0 ? (
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-7 w-7" />
        </span>
        {emptyStateTitle && <p className="text-sm font-bold text-slate-900 dark:text-white">{emptyStateTitle}</p>}
        {emptyStateDescription && <p className="max-w-[220px] text-xs text-slate-400 dark:text-slate-500">{emptyStateDescription}</p>}
        {emptyStateActionLabel && onEmptyStateAction && (
          <button
            type="button"
            onClick={onEmptyStateAction}
            disabled={emptyStateActionDisabled}
            className="mt-1 flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {emptyStateActionLabel}
          </button>
        )}
      </div>
    ) : (
    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
      {conversations.map((chat) => (
        <button
          key={chat.id}
          onClick={() => onSelectConversation(chat.id)}
          onContextMenu={(event) => {
            if (!onDeleteConversation) return;
            event.preventDefault();
            event.stopPropagation();
            setContextMenu({ id: chat.id, x: event.clientX, y: event.clientY });
          }}
          className={cn(
            'w-full rounded-xl border text-left transition-all cursor-pointer',
            compact ? 'px-2 py-1.5' : 'px-2.5 py-2',
            activeConversationId === chat.id
              ? 'border-primary bg-primary/5'
              : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={cn('truncate font-bold dark:text-white', compact ? 'text-xs' : 'text-sm')}>{chat.name}</p>
              {!chat.isAiDispatch && <p className="truncate text-[10px] text-slate-500">{chat.role}</p>}
            </div>
            <p className="shrink-0 text-[9px] text-slate-400">{chat.lastTime}</p>
          </div>
          <div className="mt-1 flex items-end justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {typeof chat.detectedFieldCount === 'number' ? (
                <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 px-1 text-[9px] font-black leading-none text-primary">
                  {chat.detectedFieldCount}
                </span>
              ) : (
                <Circle className={cn('h-2 w-2 shrink-0', chat.online ? 'fill-current text-emerald-500' : 'text-slate-300')} />
              )}
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
    )}
  </div>
  <AnimatePresence>
  {contextMenu && (
    <motion.div
      className="fixed z-50 w-[190px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
      style={{ ...menuStyle, transformOrigin: `${menuOrigin.x}% ${menuOrigin.y}%` }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <button
        type="button"
        onClick={() => {
          const id = contextMenu.id;
          setContextMenu(null);
          onDeleteConversation?.(id);
        }}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {deleteConversationLabel}
      </button>
      <button
        type="button"
        onClick={() => setContextMenu(null)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60"
      >
        <X className="h-3.5 w-3.5" />
        {cancelLabel}
      </button>
    </motion.div>
  )}
  </AnimatePresence>
  </>
);
};

