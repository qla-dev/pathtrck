import { useMemo, useState } from 'react';
import { Conversation } from '../components/chat/types';
import { AI_DISPATCH_SUBJECT_PREFIX, api } from '../services/api';
import { useApiList } from '../hooks/useApiList';
import { showError } from './swal';

export const LENA_AI_GENERAL_SUBJECT = `${AI_DISPATCH_SUBJECT_PREFIX}General`;

type UseLenaAiChatOptions = {
  userId?: number;
  companyIds?: number[];
  loadId?: string;
  loadLabel?: string;
  welcomeText: string;
  welcomeRole: string;
  sendFailedTitle: string;
};

// Shared conversation logic behind the reusable LenaAI chat (frontend/src/components/lena/LenaAI.tsx).
// Mirrors the find-or-create/send/reply flow already proven in LoadDetailsModal.tsx's AI Dispatch
// tab, generalized to also support a load-less "general" conversation (load_id: null).
export const useLenaAiChat = ({ userId, companyIds = [], loadId, loadLabel, welcomeText, welcomeRole, sendFailedTitle }: UseLenaAiChatOptions) => {
  const result = useApiList(
    api.conversations.list,
    loadId ? { load_id: Number(loadId), per_page: 50 } : { per_page: 100 }
  );

  // "New chat" doesn't delete anything — it just tells the hook to ignore whatever conversation
  // it would otherwise find until the next message creates a fresh one, so the old thread stays
  // intact (visible in Messages) while the active session starts blank.
  const [startingNewChat, setStartingNewChat] = useState(false);

  const row = useMemo(() => {
    if (startingNewChat) return undefined;
    const items = result.items.filter((item) => item.channel === 'inapp');
    if (loadId) return items[0] as Record<string, unknown> | undefined;
    return items
      .filter((item) => !item.load_id && item.subject === LENA_AI_GENERAL_SUBJECT)
      .sort((a, b) => Number(b.id) - Number(a.id))[0] as Record<string, unknown> | undefined;
  }, [result.items, loadId, startingNewChat]);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [optimisticText, setOptimisticText] = useState<string | null>(null);

  const conversation = useMemo<Conversation>(() => {
    const messages: Conversation['messages'] = row
      ? (Array.isArray(row.messages) ? row.messages as Array<Record<string, unknown>> : []).map((message) => ({
          id: String(message.id),
          sender: Number(message.sender_user_id) === userId ? 'me' : 'other',
          text: String(message.body || ''),
          time: String(message.sent_at || message.created_at || '').slice(11, 16),
        }))
      : [{ id: 'welcome', sender: 'other', text: welcomeText, time: '' }];

    if (optimisticText) messages.push({ id: 'optimistic', sender: 'me', text: optimisticText, time: '' });

    return {
      id: row ? String(row.id) : '',
      name: 'LenaAI',
      role: welcomeRole,
      channel: 'inapp',
      online: true,
      unread: 0,
      lastTime: 'now',
      messages,
      isAiDispatch: true,
    };
  }, [row, userId, optimisticText, welcomeText, welcomeRole]);

  const startNewChat = () => {
    setDraft('');
    setOptimisticText(null);
    setStartingNewChat(true);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !userId || sending) return;

    setDraft('');
    setOptimisticText(text);
    setSending(true);
    try {
      let conversationId = row ? Number(row.id) : null;

      if (!conversationId) {
        const created = await api.conversations.create({
          load_id: loadId ? Number(loadId) : undefined,
          company_id: companyIds[0],
          created_by_user_id: userId,
          channel: 'inapp',
          subject: loadId ? `${AI_DISPATCH_SUBJECT_PREFIX}${loadLabel || loadId}` : LENA_AI_GENERAL_SUBJECT,
          last_message_at: new Date().toISOString(),
          participant_ids: [userId],
        });
        conversationId = Number(created.data.id);
      }

      await api.messages.create({
        conversation_id: conversationId,
        sender_user_id: userId,
        body: text,
        sent_at: new Date().toISOString(),
      });
      await result.refresh();
      setOptimisticText(null);
      setStartingNewChat(false);

      await api.dispatchChat.reply(conversationId);
      await result.refresh();
    } catch (error) {
      setOptimisticText(null);
      void showError(sendFailedTitle, error instanceof Error ? error.message : undefined);
    } finally {
      setSending(false);
    }
  };

  return { conversation, draft, setDraft, send, sending, startNewChat, hasActiveConversation: Boolean(row) };
};
