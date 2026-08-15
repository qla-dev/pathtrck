import { useEffect, useMemo, useState } from 'react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { ChatConversationPanel } from '../chat/ChatConversationPanel';
import { ChatSidebar } from '../chat/ChatSidebar';
import { Channel, Conversation } from '../chat/types';
import { ApiUser, api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';

export const MessagesView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const result = useApiList(api.conversations.list, { per_page: 100 });
  const [user, setUser] = useState<ApiUser | null>(null);
  useEffect(() => { void api.auth.me().then(setUser); }, []);
  const conversations = useMemo<Conversation[]>(() => result.items.map((row) => {
    const participants = Array.isArray(row.participants) ? row.participants as Array<Record<string, unknown>> : [];
    const counterpart = participants.find((participant) => Number(participant.id) !== user?.id) || participants[0];
    const messages = Array.isArray(row.messages) ? row.messages as Array<Record<string, unknown>> : [];
    return {
      id: String(row.id), name: String(row.subject || counterpart?.name || `Conversation ${row.id}`),
      role: String(((counterpart?.role || {}) as Record<string, unknown>).label || ''), channel: (String(row.channel || 'inapp') as Channel),
      online: false, unread: 0, lastTime: String(row.last_message_at || '').slice(11, 16),
      messages: messages.map((message) => ({ id: String(message.id), sender: Number(message.sender_user_id) === user?.id ? 'me' : 'other', text: String(message.body || ''), time: String(message.sent_at || message.created_at || '').slice(11, 16) })),
    };
  }), [result.items, user]);
  const [channelFilter, setChannelFilter] = useState<'all' | Channel>('all');
  const [activeId, setActiveId] = useState('');
  const [draft, setDraft] = useState('');

  const channels = [
    { id: 'all' as const, label: u('All', 'All') },
    { id: 'whatsapp' as const, label: 'WhatsApp' },
    { id: 'telegram' as const, label: 'Telegram' },
    { id: 'inapp' as const, label: u('In App', 'In App') },
  ];

  const filteredConversations = useMemo(
    () => conversations.filter((c) => channelFilter === 'all' || c.channel === channelFilter),
    [channelFilter, conversations]
  );

  const activeConversation = useMemo(
    () => filteredConversations.find((c) => c.id === activeId) ?? filteredConversations[0] ?? conversations[0] ?? { id: '', name: u('messages.empty', 'No conversation'), role: '', channel: 'inapp', online: false, unread: 0, lastTime: '', messages: [] },
    [filteredConversations, activeId, conversations]
  );

  const sendMessage = async () => {
    if (!draft.trim()) return;
    if (activeConversation.id && user) await api.messages.create({ conversation_id: Number(activeConversation.id), sender_user_id: user.id, body: draft.trim(), sent_at: new Date().toISOString() });
    setDraft('');
    await result.refresh();
  };

  const handleAiDispatchCompose = () => {
    const seed = u(
      'Draft an ETA update for dispatch and clients on this route.',
      'Draft an ETA update for dispatch and clients on this route.',
    );
    setDraft(seed);
  };

  return (
    <div className="h-full">
      <div className="h-full grid lg:grid-cols-12 gap-4">
        <ChatSidebar
          searchPlaceholder={u('Search messages...', 'Search messages...')}
          channels={channels}
          channelFilter={channelFilter}
          onChannelFilterChange={setChannelFilter}
          conversations={filteredConversations}
          activeConversationId={activeConversation.id}
          onSelectConversation={setActiveId}
        />

        <ChatConversationPanel
          activeConversation={activeConversation}
          draft={draft}
          onDraftChange={setDraft}
          onSend={sendMessage}
          messagePlaceholder={u('Write a message...', 'Write a message...')}
          className="lg:col-span-8"
          showAiDispatchButton
          aiDispatchLabel={u('Write with AI Dispatch', 'Write with AI Dispatch')}
          onAiDispatchClick={handleAiDispatchCompose}
        />
      </div>
    </div>
  );
};
