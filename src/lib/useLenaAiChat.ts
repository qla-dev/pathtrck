import { useEffect, useMemo, useState } from 'react';
import { Conversation } from '../components/chat/types';
import { AI_DISPATCH_SUBJECT_PREFIX, api } from '../services/api';
import { useApiList } from '../hooks/useApiList';
import { showError } from './swal';
import { analyzeLenaAttachment, latestLoadScan, LenaAttachment, LenaCanvasMode } from './lenaLoadCanvas';

export const LENA_AI_GENERAL_SUBJECT = `${AI_DISPATCH_SUBJECT_PREFIX}General`;

export type LenaQuickAction = 'add' | 'tracking' | 'booking' | 'hs' | 'upload_yes' | 'upload_no';
export const lenaQuickActionMarker = (action: LenaQuickAction) => `[[LENA_ACTION:${action}]]`;
const LENA_QUICK_ACTION_PATTERN = /^\[\[LENA_ACTION:(add|tracking|booking|hs|upload_yes|upload_no)\]\]$/;

type UseLenaAiChatOptions = {
  userId?: number;
  companyIds?: number[];
  loadId?: string;
  loadLabel?: string;
  welcomeText: string;
  welcomeRole: string;
  sendFailedTitle: string;
  initialCanvasMode?: LenaCanvasMode | null;
  quickActionLabels: Record<LenaQuickAction, string>;
};

// Shared conversation logic behind the reusable LenaAI chat (frontend/src/components/lena/LenaAI.tsx).
// Mirrors the find-or-create/send/reply flow already proven in LoadDetailsModal.tsx's AI Dispatch
// tab, generalized to also support a load-less "general" conversation (load_id: null).
export const useLenaAiChat = ({ userId, companyIds = [], loadId, loadLabel, welcomeText, welcomeRole, sendFailedTitle, initialCanvasMode = null, quickActionLabels }: UseLenaAiChatOptions) => {
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
  const [optimisticText, setOptimisticText] = useState<string | null>(null);

  const conversation = useMemo<Conversation>(() => {
    const messages: Conversation['messages'] = row
      ? (Array.isArray(row.messages) ? row.messages as Array<Record<string, unknown>> : []).map((message) => ({
          id: String(message.id),
          sender: Number(message.sender_user_id) === userId ? 'me' : 'other',
          text: quickActionLabels[(String(message.body || '').match(LENA_QUICK_ACTION_PATTERN)?.[1] || '') as LenaQuickAction] || String(message.body || ''),
          time: String(message.sent_at || message.created_at || '').slice(11, 16),
          attachments: Array.isArray(message.attachments) ? message.attachments as LenaAttachment[] : undefined,
        }))
      : [{ id: `welcome-${newChatVersion}`, sender: 'other', text: welcomeText, time: '' }];

    if (optimisticText) messages.push({ id: 'optimistic', sender: 'me', text: optimisticText, time: '' });

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
  }, [row, userId, optimisticText, welcomeText, welcomeRole, newChatVersion, canvasOverride]);

  const canvasEnabled = !loadId && (canvasOverride ?? Boolean(row?.canvas));
  const canvasAttachments = useMemo(
    () => conversation.messages.flatMap((message) => message.attachments || []),
    [conversation.messages]
  );

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
    setOptimisticText(null);
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
    const title = String(firstMessage?.body || 'New LenaAI conversation').replace(/\s+/g, ' ').slice(0, 48);
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
  }), [availableRows, welcomeRole]);

  const selectConversation = (id: string) => {
    setStartingNewChat(false);
    setSelectedConversationId(id);
    setCanvasOverride(false);
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

  const sendMessage = async (rawText: string, displayText = rawText) => {
    const text = rawText.trim();
    if (!text || !userId || sending) return;

    setDraft('');
    setOptimisticText(displayText);
    setSending(true);
    try {
      const requestsCanvas = /\b(new\s+load|post\s+(?:a\s+)?load|publish\s+(?:a\s+)?load|create\s+(?:a\s+)?load|bulk\s+import|novi?\s+teret|objav\w*\s+teret|kreir\w*\s+teret|naprav\w*\s+teret|masovni\s+uvoz|neue\s+ladung|massenimport|(open|enable|show|otvori|ukljuci|prikazi|offne|aktiviere)\w*\s+(?:the\s+)?(canvas|platno|nacrt))\b/i.test(text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
      const desiredCanvas = !loadId && (canvasEnabled || requestsCanvas);
      if (requestsCanvas && !loadId) setCanvasOverride(true);
      const conversationId = await ensureConversation(desiredCanvas);
      let attachments: LenaAttachment[] | undefined;
      if (desiredCanvas && text.length >= 8) {
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
      await result.refresh();
      setOptimisticText(null);
      setStartingNewChat(false);

      await api.dispatchChat.reply(conversationId);
      await result.refresh();
      setCanvasOverride(null);
    } catch (error) {
      setOptimisticText(null);
      void showError(sendFailedTitle, error instanceof Error ? error.message : undefined);
    } finally {
      setSending(false);
    }
  };

  const send = async () => sendMessage(draft);
  const sendQuickAction = async (action: LenaQuickAction) => sendMessage(lenaQuickActionMarker(action), quickActionLabels[action]);

  const attachFile = async (file: File) => {
    if (!userId || sending || processingAttachment) return;
    setProcessingAttachment(true);
    const attachmentOpensCanvas = !loadId;
    if (attachmentOpensCanvas) setCanvasOverride(true);
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

  return { conversation, draft, setDraft, send, sendQuickAction, sending, startNewChat, selectConversation, sidebarConversations, hasActiveConversation: Boolean(row), canvasEnabled, canvasMode, setCanvasEnabled, canvasAttachments, attachFile, processingAttachment };
};
