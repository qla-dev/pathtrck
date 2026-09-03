import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare } from 'lucide-react';

import type { Language } from '../../types';
import { api } from '../../services/api';
import { ChatConversationPanel } from '../chat/ChatConversationPanel';
import type { ChatMessage, Conversation } from '../chat/types';

type Props = {
  workspace: Record<string, unknown>;
  lang: Language;
  userId?: number;
};

const COPY = {
  en: { messages: 'Messages', placeholder: 'Write a message about this shipment...', unavailable: 'Shipment chat is not available yet.', customer: 'Customer', provider: 'Provider', driver: 'Driver' },
  bs: { messages: 'Poruke', placeholder: 'Napišite poruku o ovom shipmentu...', unavailable: 'Chat za ovaj shipment još nije dostupan.', customer: 'Customer', provider: 'Provider', driver: 'Vozač' },
  de: { messages: 'Nachrichten', placeholder: 'Nachricht zu dieser Sendung schreiben...', unavailable: 'Der Sendungs-Chat ist noch nicht verfügbar.', customer: 'Kunde', provider: 'Anbieter', driver: 'Fahrer' },
} as const;

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const array = (value: unknown): Array<Record<string, unknown>> => Array.isArray(value) ? value as Array<Record<string, unknown>> : [];

export const ShipmentMessagesTab = ({ workspace, lang, userId }: Props) => {
  const text = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  const conversationId = Number(workspace.conversation_id || 0);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationRow, setConversationRow] = useState<Record<string, unknown>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const refreshMessages = useCallback(async () => {
    if (!conversationId) return;
    const [conversationResponse, messagesResponse] = await Promise.all([
      api.conversations.get(conversationId),
      api.messages.list({ conversation_id: conversationId, per_page: 100 }),
    ]);
    setConversationRow(conversationResponse.data);
    setMessages([...messagesResponse.data].reverse().map((message) => ({
      id: String(message.id),
      sender: Number(message.sender_user_id) === userId ? 'me' : 'other',
      text: String(message.body || ''),
      time: String(message.sent_at || message.created_at || '').slice(11, 16),
      attachments: Array.isArray(message.attachments) ? message.attachments as ChatMessage['attachments'] : undefined,
    })));
  }, [conversationId, userId]);

  useEffect(() => {
    if (!conversationId) return undefined;
    void refreshMessages();
    const interval = window.setInterval(() => void refreshMessages(), 4000);
    return () => window.clearInterval(interval);
  }, [conversationId, refreshMessages]);

  const conversation = useMemo<Conversation>(() => {
    const participants = array(conversationRow.participants);
    const participant = participants.find((entry) => Number(entry.id) !== userId) || participants[0] || {};
    // Who you are talking to depends on which side you are: the customer sees the carrier, the
    // carrier sees the customer. The workspace snapshot names both, so the header never sits empty.
    const parties = record(workspace.parties_snapshot);
    const viewerIsCustomer = Boolean(userId) && Number(workspace.customer_user_id) === Number(userId);
    const counterpart = record(viewerIsCustomer ? parties.provider : parties.customer);
    const driver = record(parties.driver);
    const counterpartName = String(counterpart.name || participant.name || conversationRow.subject || text.messages);
    const counterpartRole = viewerIsCustomer
      ? [text.provider, driver.name ? `${text.driver}: ${driver.name}` : ''].filter(Boolean).join(' · ')
      : text.customer;

    return {
      id: String(conversationId),
      name: counterpartName,
      role: String(record(participant.role).label || counterpartRole),
      channel: 'inapp',
      online: false,
      unread: 0,
      lastTime: messages.at(-1)?.time || '',
      messages,
      loadId: workspace.load_id ? String(workspace.load_id) : undefined,
    };
  }, [conversationId, conversationRow, messages, text, userId, workspace]);

  const sendMessage = async () => {
    const body = draft.trim();
    if (!body || !conversationId || !userId || sending) return;
    setSending(true);
    try {
      await api.messages.create({ conversation_id: conversationId, sender_user_id: userId, body, sent_at: new Date().toISOString() });
      setDraft('');
      await refreshMessages();
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="h-full min-h-0 overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {conversationId ? (
        <ChatConversationPanel
          activeConversation={conversation}
          draft={draft}
          onDraftChange={setDraft}
          onSend={() => void sendMessage()}
          messagePlaceholder={text.placeholder}
          sendBusy={sending}
          className="h-full min-h-0 rounded-none border-0"
        />
      ) : (
        <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-8 text-center text-slate-500">
          <MessageSquare className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold">{text.unavailable}</p>
        </div>
      )}
    </section>
  );
};
