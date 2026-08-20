import { useEffect, useMemo, useState } from 'react';
import { Bot, LayoutGrid, MessageCircle } from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { showError } from '../../lib/swal';
import { ChatConversationPanel } from '../chat/ChatConversationPanel';
import { ChatSidebar } from '../chat/ChatSidebar';
import { Channel, Conversation } from '../chat/types';
import { AI_DISPATCH_SUBJECT_PREFIX, ApiUser, api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { mapLoadStatus } from '../../lib/loadDetails';
import { trPackageStatus } from '../../i18n';
import { useLenaEmbeddedMessages } from '../lena/useLenaEmbeddedMessages';

export const MessagesView = ({ lang, onOpenLoad }: { lang: Language; onOpenLoad?: (loadId: string) => void }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const result = useApiList(api.conversations.list, { per_page: 100 });
  const [user, setUser] = useState<ApiUser | null>(null);
  useEffect(() => { void api.auth.me().then(setUser); }, []);
  const conversations = useMemo<Conversation[]>(() => result.items.map((row) => {
    const participants = Array.isArray(row.participants) ? row.participants as Array<Record<string, unknown>> : [];
    const counterpart = participants.find((participant) => Number(participant.id) !== user?.id) || participants[0];
    const messages = Array.isArray(row.messages) ? row.messages as Array<Record<string, unknown>> : [];
    const isAiDispatch = typeof row.subject === 'string' && row.subject.startsWith(AI_DISPATCH_SUBJECT_PREFIX);
    const generatedAiTitle = isAiDispatch ? String(row.subject).slice(AI_DISPATCH_SUBJECT_PREFIX.length).trim() : '';
    const visibleAiTitle = generatedAiTitle && generatedAiTitle !== 'General' ? generatedAiTitle : '';
    const load = row.freight_load as Record<string, unknown> | undefined;
    const consignee = (load?.consignee || {}) as Record<string, unknown>;
    const loadName = load
      ? String(consignee.company_name || consignee.name || load.title || load.public_id || (load.id ? `Load #${load.id}` : '') || '')
      : '';
    const stops = load && Array.isArray(load.stops) ? load.stops as Array<Record<string, unknown>> : [];
    const origin = stops.find((stop) => stop.type === 'pickup')?.city;
    const destination = stops.find((stop) => stop.type === 'delivery')?.city;
    const meta = isAiDispatch
      ? [
          load?.booking_reference ? `${u('Booking reference', 'Booking reference')}: ${load.booking_reference}` : null,
          origin && destination ? `${origin} → ${destination}` : null,
        ].filter(Boolean).join(' · ')
      : '';
    const status = load ? trPackageStatus(lang, mapLoadStatus(load.status)) : undefined;
    return {
      id: String(row.id),
      name: isAiDispatch
        ? String(loadName || visibleAiTitle || (row.load_id ? `Load #${row.load_id}` : `Conversation ${row.id}`))
        : String(row.subject || counterpart?.name || `Conversation ${row.id}`),
      role: isAiDispatch ? u('LenaAI', 'LenaAI') : String(((counterpart?.role || {}) as Record<string, unknown>).label || ''),
      channel: (String(row.channel || 'inapp') as Channel),
      online: false, unread: 0, lastTime: String(row.last_message_at || '').slice(11, 16),
      messages: messages.map((message) => ({ id: String(message.id), sender: Number(message.sender_user_id) === user?.id ? 'me' : 'other', text: String(message.body || ''), time: String(message.sent_at || message.created_at || '').slice(11, 16), attachments: Array.isArray(message.attachments) ? message.attachments as import('../../lib/lenaLoadCanvas').LenaAttachment[] : undefined })),
      loadId: row.load_id ? String(row.load_id) : undefined,
      isAiDispatch,
      canvas: Boolean(row.canvas),
      meta: meta || undefined,
      status,
    };
  }), [result.items, user, lang]);
  const [channelFilter, setChannelFilter] = useState<'all' | 'ai' | 'direct'>('all');
  const [activeId, setActiveId] = useState('');
  const [draft, setDraft] = useState('');
  const [aiReplying, setAiReplying] = useState(false);
  const [optimisticText, setOptimisticText] = useState<string | null>(null);

  const channels = [
    { id: 'all' as const, label: u('All', 'All'), icon: LayoutGrid },
    { id: 'ai' as const, label: u('LenaAI', 'LenaAI'), icon: Bot },
    { id: 'direct' as const, label: u('Direct messages', 'Direct messages'), icon: MessageCircle },
  ];

  const filteredConversations = useMemo(
    () => conversations.filter((c) => {
      if (channelFilter === 'ai') return c.isAiDispatch;
      if (channelFilter === 'direct') return !c.isAiDispatch;
      return true;
    }),
    [channelFilter, conversations]
  );

  const activeConversation = useMemo(() => {
    const base = filteredConversations.find((c) => c.id === activeId) ?? filteredConversations[0] ?? conversations[0] ?? { id: '', name: u('messages.empty', 'No conversation'), role: '', channel: 'inapp' as const, online: false, unread: 0, lastTime: '', messages: [] };
    if (!optimisticText) return base;
    return { ...base, messages: [...base.messages, { id: 'optimistic', sender: 'me' as const, text: optimisticText, time: '' }] };
  }, [filteredConversations, activeId, conversations, optimisticText]);

  const { displayMessages, renderMessageExtra, extraContentVersion } = useLenaEmbeddedMessages({
    messages: activeConversation.messages,
    lang,
    fallbackLoadId: activeConversation.loadId,
    onOpenLoad,
  });

  const displayConversation = useMemo(() => ({
    ...activeConversation,
    messages: displayMessages,
  }), [activeConversation, displayMessages]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !activeConversation.id || !user || aiReplying) return;

    setDraft('');
    setOptimisticText(text);
    try {
      await api.messages.create({ conversation_id: Number(activeConversation.id), sender_user_id: user.id, body: text, sent_at: new Date().toISOString() });
      await result.refresh();
      setOptimisticText(null);

      if (activeConversation.isAiDispatch) {
        setAiReplying(true);
        try {
          await api.dispatchChat.reply(Number(activeConversation.id));
          await result.refresh();
        } finally {
          setAiReplying(false);
        }
      }
    } catch (error) {
      setOptimisticText(null);
      void showError(
        u('messages.sendFailed', 'Message could not be sent'),
        error instanceof Error ? error.message : undefined
      );
    }
  };

  return (
    <div className="h-full">
      <div className="h-full grid lg:grid-cols-12 gap-4">
        <ChatSidebar
          searchPlaceholder={u('Search messages...', 'Search messages...')}
          channels={channels}
          channelFilter={channelFilter}
          onChannelFilterChange={(id) => setChannelFilter(id as 'all' | 'ai' | 'direct')}
          conversations={filteredConversations}
          activeConversationId={activeConversation.id}
          onSelectConversation={setActiveId}
        />

        <ChatConversationPanel
          activeConversation={displayConversation}
          draft={draft}
          onDraftChange={setDraft}
          onSend={sendMessage}
          messagePlaceholder={u('Write a message...', 'Write a message...')}
          className="lg:col-span-8"
          otherTyping={aiReplying}
          onTitleClick={activeConversation.loadId && onOpenLoad ? () => onOpenLoad(activeConversation.loadId!) : undefined}
          renderMessageExtra={renderMessageExtra}
          extraContentVersion={`${activeConversation.id}:${extraContentVersion}`}
        />
      </div>
    </div>
  );
};
