import { useEffect, useMemo, useState } from 'react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { showError } from '../../lib/swal';
import { ChatConversationPanel } from '../chat/ChatConversationPanel';
import { ChatSidebar } from '../chat/ChatSidebar';
import { Channel, Conversation } from '../chat/types';
import { AI_DISPATCH_SUBJECT_PREFIX, ApiUser, api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';

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
    const load = row.freightLoad as Record<string, unknown> | undefined;
    const consignee = (load?.consignee || {}) as Record<string, unknown>;
    const loadName = load ? String(consignee.company_name || consignee.name || load.title || '') : '';
    return {
      id: String(row.id), name: isAiDispatch && loadName ? loadName : String(row.subject || counterpart?.name || `Conversation ${row.id}`),
      role: String(((counterpart?.role || {}) as Record<string, unknown>).label || ''), channel: (String(row.channel || 'inapp') as Channel),
      online: false, unread: 0, lastTime: String(row.last_message_at || '').slice(11, 16),
      messages: messages.map((message) => ({ id: String(message.id), sender: Number(message.sender_user_id) === user?.id ? 'me' : 'other', text: String(message.body || ''), time: String(message.sent_at || message.created_at || '').slice(11, 16) })),
      loadId: row.load_id ? String(row.load_id) : undefined,
      isAiDispatch,
    };
  }), [result.items, user]);
  const [channelFilter, setChannelFilter] = useState<'all' | Channel>('all');
  const [activeId, setActiveId] = useState('');
  const [draft, setDraft] = useState('');
  const [aiReplying, setAiReplying] = useState(false);

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
    () => filteredConversations.find((c) => c.id === activeId) ?? filteredConversations[0] ?? conversations[0] ?? { id: '', name: u('messages.empty', 'No conversation'), role: '', channel: 'inapp' as const, online: false, unread: 0, lastTime: '', messages: [] },
    [filteredConversations, activeId, conversations]
  );

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !activeConversation.id || !user || aiReplying) return;

    setDraft('');
    try {
      await api.messages.create({ conversation_id: Number(activeConversation.id), sender_user_id: user.id, body: text, sent_at: new Date().toISOString() });
      await result.refresh();

      if (activeConversation.isAiDispatch) {
        setAiReplying(true);
        try {
          await api.dispatchChat.reply(Number(activeConversation.id));
        } finally {
          setAiReplying(false);
        }
        await result.refresh();
      }
    } catch (error) {
      void showError(
        u('messages.sendFailed', 'Message could not be sent'),
        error instanceof Error ? error.message : undefined
      );
    }
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
          otherTyping={aiReplying}
          onTitleClick={activeConversation.loadId && onOpenLoad ? () => onOpenLoad(activeConversation.loadId!) : undefined}
        />
      </div>
    </div>
  );
};
