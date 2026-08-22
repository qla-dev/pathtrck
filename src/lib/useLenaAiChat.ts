import { useEffect, useMemo, useState } from 'react';
import { Conversation } from '../components/chat/types';
import { AI_DISPATCH_SUBJECT_PREFIX, api } from '../services/api';
import { useApiList } from '../hooks/useApiList';
import { showError } from './swal';
import { analyzeLenaAttachment, latestLoadScan, LenaAttachment, LenaCanvasMode } from './lenaLoadCanvas';

export const LENA_AI_GENERAL_SUBJECT = `${AI_DISPATCH_SUBJECT_PREFIX}General`;

export type LenaQuickAction = 'add' | 'tracking' | 'booking' | 'hs' | 'free' | 'upload_yes' | 'upload_no' | 'start_add_yes' | 'start_add_no' | 'continue_add_yes' | 'continue_add_no';
export const lenaQuickActionMarker = (action: LenaQuickAction) => `[[LENA_ACTION:${action}]]`;
const LENA_QUICK_ACTION_PATTERN = /^\[\[LENA_ACTION:(add|tracking|booking|hs|free|upload_yes|upload_no|start_add_yes|start_add_no|continue_add_yes|continue_add_no)\]\]$/;
export const lenaQuickActionFromMessage = (text: string): LenaQuickAction | undefined =>
  text.match(LENA_QUICK_ACTION_PATTERN)?.[1] as LenaQuickAction | undefined;
export const lenaConversationSubjectTitle = (subject: unknown): string => {
  const value = String(subject || '').trim();
  const title = value.startsWith(AI_DISPATCH_SUBJECT_PREFIX)
    ? value.slice(AI_DISPATCH_SUBJECT_PREFIX.length).trim()
    : value;
  return title && title.toLowerCase() !== 'general' && !lenaQuickActionFromMessage(title) ? title : '';
};

type UseLenaAiChatOptions = {
  userId?: number;
  companyIds?: number[];
  loadId?: string;
  loadLabel?: string;
  welcomeText: string;
  welcomeRole: string;
  sendFailedTitle: string;
  replyFailedTitle: string;
  newConversationLabel: string;
  initialCanvasMode?: LenaCanvasMode | null;
  quickActionLabels: Record<LenaQuickAction, string>;
};

type OptimisticLenaMessage = {
  id: string;
  rawText: string;
  displayText: string;
  status: 'sending' | 'failed';
  time: string;
  conversationId?: number;
};

// Shared conversation logic behind the reusable LenaAI chat (frontend/src/components/lena/LenaAI.tsx).
// Mirrors the find-or-create/send/reply flow already proven in LoadDetailsModal.tsx's AI Dispatch
// tab, generalized to also support a load-less "general" conversation (load_id: null).
export const useLenaAiChat = ({ userId, companyIds = [], loadId, loadLabel, welcomeText, welcomeRole, sendFailedTitle, replyFailedTitle, newConversationLabel, initialCanvasMode = null, quickActionLabels }: UseLenaAiChatOptions) => {
  const result = useApiList(
    api.conversations.list,
    loadId ? { load_id: Number(loadId), per_page: 50 } : { per_page: 100 }
  );

  // "New chat" doesn't delete anything — it just tells the hook to ignore whatever conversation
  // it would otherwise find until the next message creates a fresh one, so the old thread stays
  // intact (visible in Messages) while the active session starts blank.
  const [startingNewChat, setStartingNewChat] = useState(false);
  const [newChatVersion, setNewChatVersion] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [canvasOverride, setCanvasOverride] = useState<boolean | null>(initialCanvasMode ? true : null);
  const [canvasMode, setCanvasMode] = useState<LenaCanvasMode>(initialCanvasMode || 'new_load');
  const [processingAttachment, setProcessingAttachment] = useState(false);

  useEffect(() => {
    if (!initialCanvasMode) return;
    setCanvasMode(initialCanvasMode);
    setCanvasOverride(true);
  }, [initialCanvasMode]);

  const availableRows = useMemo(() => {
    const items = result.items.filter((item) => item.channel === 'inapp');
    if (loadId) return items;
    return items
      .filter((item) => !item.load_id && String(item.subject || '').startsWith(AI_DISPATCH_SUBJECT_PREFIX))
      .sort((a, b) => Number(b.id) - Number(a.id));
  }, [result.items, loadId]);

  const row = useMemo(() => {
    if (startingNewChat) return undefined;
    return (selectedConversationId
      ? availableRows.find((item) => String(item.id) === selectedConversationId)
      : availableRows[0]) as Record<string, unknown> | undefined;
  }, [availableRows, selectedConversationId, startingNewChat]);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticLenaMessage[]>([]);

  const conversation = useMemo<Conversation>(() => {
    const messages: Conversation['messages'] = row
      ? (Array.isArray(row.messages) ? row.messages as Array<Record<string, unknown>> : []).map((message) => ({
          id: String(message.id),
          sender: Number(message.sender_user_id) === userId ? 'me' : 'other',
          text: quickActionLabels[lenaQuickActionFromMessage(String(message.body || '')) as LenaQuickAction] || String(message.body || ''),
          time: String(message.sent_at || message.created_at || '').slice(11, 16),
          attachments: Array.isArray(message.attachments) ? message.attachments as LenaAttachment[] : undefined,
        }))
      : [{ id: `welcome-${newChatVersion}`, sender: 'other', text: welcomeText, time: '' }];

    optimisticMessages.forEach((message) => messages.push({
      id: message.id,
      sender: 'me',
      text: message.displayText,
      time: message.time,
      deliveryStatus: message.status === 'failed' ? 'failed' : undefined,
      onRetry: message.status === 'failed'
        ? () => void sendMessage(message.rawText, message.displayText, message.id, message.conversationId)
        : undefined,
    }));

    return {
      id: row ? String(row.id) : `new-${newChatVersion}`,
      name: 'LenaAI',
      role: welcomeRole,
      channel: 'inapp',
      online: true,
      unread: 0,
      lastTime: 'now',
      messages,
      isAiDispatch: true,
      canvas: !loadId && (canvasOverride ?? Boolean(row?.canvas)),
    };
  }, [row, userId, optimisticMessages, welcomeText, welcomeRole, newChatVersion, canvasOverride]);

  const canvasEnabled = !loadId && (canvasOverride ?? Boolean(row?.canvas));
  const canvasAttachments = useMemo(
    () => conversation.messages.flatMap((message) => message.attachments || []),
    [conversation.messages]
  );
  const latestGuidedAction = useMemo(() => {
    const messages = row && Array.isArray(row.messages) ? row.messages as Array<Record<string, unknown>> : [];
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (Number(messages[index].sender_user_id) !== userId) continue;
      const action = lenaQuickActionFromMessage(String(messages[index].body || ''));
      if (action) return action;
    }
    return undefined;
  }, [row, userId]);

  const ensureConversation = async (canvas: boolean) => {
    if (row) {
      if (Boolean(row.canvas) !== canvas) {
        await api.conversations.update(Number(row.id), { canvas });
      }
      return Number(row.id);
    }

    const created = await api.conversations.create({
      load_id: loadId ? Number(loadId) : undefined,
      company_id: companyIds[0],
      created_by_user_id: userId,
      channel: 'inapp',
      subject: loadId ? `${AI_DISPATCH_SUBJECT_PREFIX}${loadLabel || loadId}` : LENA_AI_GENERAL_SUBJECT,
      canvas,
      last_message_at: new Date().toISOString(),
      participant_ids: [userId],
    });
    return Number(created.data.id);
  };

  const startNewChat = () => {
    setDraft('');
    setOptimisticMessages([]);
    setStartingNewChat(true);
    setCanvasOverride(false);
    setCanvasMode('new_load');
    setSelectedConversationId(null);
    setNewChatVersion((version) => version + 1);
  };

  const sidebarConversations = useMemo<Conversation[]>(() => availableRows.map((item) => {
    const messages = Array.isArray(item.messages) ? item.messages as Array<Record<string, unknown>> : [];
    const lastMessage = messages.at(-1);
    const firstMessage = messages.find((message) => String(message.body || '').trim());
    const firstBody = String(firstMessage?.body || '').trim();
    const firstAction = lenaQuickActionFromMessage(firstBody);
    const title = lenaConversationSubjectTitle(item.subject)
      || (firstAction ? quickActionLabels[firstAction] : '')
      || newConversationLabel;
    return {
      id: String(item.id),
      name: title,
      role: welcomeRole,
      channel: 'inapp',
      online: true,
      unread: 0,
      lastTime: String(lastMessage?.sent_at || lastMessage?.created_at || item.last_message_at || '').slice(11, 16),
      messages: [],
      isAiDispatch: true,
      canvas: Boolean(item.canvas),
      status: Boolean(item.canvas) ? 'load-detected' : 'draft',
    };
  }), [availableRows, welcomeRole, quickActionLabels, newConversationLabel]);

  const selectConversation = (id: string) => {
    setOptimisticMessages([]);
    setStartingNewChat(false);
    setSelectedConversationId(id);
    setCanvasOverride(null);
  };

  const setCanvasEnabled = async (enabled: boolean, mode: LenaCanvasMode = canvasMode) => {
    if (loadId && enabled) return;
    setCanvasMode(mode);
    setCanvasOverride(enabled);
    if (row) {
      try {
        await api.conversations.update(Number(row.id), { canvas: enabled });
        await result.refresh();
        setCanvasOverride(null);
      } catch (error) {
        void showError(sendFailedTitle, error instanceof Error ? error.message : undefined);
      }
    }
  };

  async function sendMessage(rawText: string, displayText = rawText, retryId?: string, retryConversationId?: number) {
    const text = rawText.trim();
    if (!text || !userId || sending) return;

    const optimisticId = retryId || `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    setDraft('');
    setOptimisticMessages((messages) => retryId
      ? messages.map((message) => message.id === retryId ? { ...message, status: 'sending', time: optimisticTime } : message)
      : [...messages, { id: optimisticId, rawText: text, displayText, status: 'sending', time: optimisticTime }]);
    setSending(true);
    let conversationId: number;
    try {
      const guidedAction = lenaQuickActionFromMessage(text);
      const entersCanvas = guidedAction === 'add' || guidedAction === 'start_add_yes';
      const exitsCanvas = guidedAction === 'continue_add_no';
      const desiredCanvas = !loadId && (entersCanvas || (!exitsCanvas && canvasEnabled));
      if (!loadId && (entersCanvas || exitsCanvas)) setCanvasOverride(entersCanvas);
      conversationId = retryConversationId || await ensureConversation(desiredCanvas);
      setOptimisticMessages((messages) => messages.map((message) => message.id === optimisticId ? { ...message, conversationId } : message));
      let attachments: LenaAttachment[] | undefined;
      const builderInputActive = !latestGuidedAction || !['tracking', 'booking', 'hs', 'free'].includes(latestGuidedAction);
      if (desiredCanvas && builderInputActive && !guidedAction && text.length >= 1) {
        try {
          const scan = await api.loads.scanText(text, latestLoadScan(canvasAttachments));
          attachments = [{ name: 'LenaAI conversation', type: 'text/plain', size: new Blob([text]).size, loadScan: scan.data }];
        } catch {
          // The normal conversation must still be sent if structured extraction is unavailable.
        }
      }

      await api.messages.create({
        conversation_id: conversationId,
        sender_user_id: userId,
        body: text,
        attachments,
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      setOptimisticMessages((messages) => messages.map((message) => message.id === optimisticId ? { ...message, status: 'failed' } : message));
      setSending(false);
      return;
    }

    setStartingNewChat(false);
    try {
      await result.refresh();
    } catch {
      // The message is already stored; a transient refresh failure must not mark it as unsent.
    } finally {
      setOptimisticMessages((messages) => messages.filter((message) => message.id !== optimisticId));
    }

    try {
      await api.dispatchChat.reply(conversationId);
      await result.refresh();
      setCanvasOverride(null);
    } catch (error) {
      void showError(replyFailedTitle, error instanceof Error ? error.message : undefined);
    } finally {
      setSending(false);
    }
  }

  const send = async () => sendMessage(draft);
  const sendQuickAction = async (action: LenaQuickAction) => sendMessage(lenaQuickActionMarker(action), quickActionLabels[action]);
  const sendSuggestedReply = async (value: string, displayText = value) => sendMessage(value, displayText);

  const attachFile = async (file: File) => {
    if (!userId || sending || processingAttachment) return;
    setProcessingAttachment(true);
    const attachmentOpensCanvas = !loadId && canvasEnabled;
    try {
      const attachment = await analyzeLenaAttachment(file, canvasMode, latestLoadScan(canvasAttachments));
      const conversationId = await ensureConversation(attachmentOpensCanvas);
      const body = !attachmentOpensCanvas
        ? `Attached ${file.name}.`
        : canvasMode === 'bulk'
        ? `Attached ${file.name} for a bulk load import.`
        : `Attached ${file.name} to prepare a new load posting.`;
      await api.messages.create({
        conversation_id: conversationId,
        sender_user_id: userId,
        body,
        attachments: [attachment],
        sent_at: new Date().toISOString(),
      });
      setStartingNewChat(false);
      await result.refresh();
      await api.dispatchChat.reply(conversationId);
      await result.refresh();
      setCanvasOverride(null);
    } catch (error) {
      void showError(sendFailedTitle, error instanceof Error ? error.message : undefined);
    } finally {
      setProcessingAttachment(false);
    }
  };

  return { conversation, draft, setDraft, send, sendQuickAction, sendSuggestedReply, sending, startNewChat, selectConversation, sidebarConversations, hasActiveConversation: Boolean(row), canvasEnabled, canvasMode, setCanvasEnabled, canvasAttachments, attachFile, processingAttachment };
};
