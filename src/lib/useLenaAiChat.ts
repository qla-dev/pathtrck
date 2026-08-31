import { useEffect, useMemo, useState } from 'react';
import { Conversation } from '../components/chat/types';
import { Language } from '../types';
import { AI_DISPATCH_SUBJECT_PREFIX, api } from '../services/api';
import { useApiList } from '../hooks/useApiList';
import { showError } from './swal';
import { analyzeLenaAttachment, latestLoadScan, LenaAttachment, LenaCanvasMode, loadDraftRecordToScan } from './lenaLoadCanvas';
import { MASKABLE_GUIDED_STEPS } from './lenaStepInputMask';
import { withMinDelay } from './timing';
import { ui } from '../i18n';
import { buildScanFieldRows } from '../components/modals/scanFieldRows';
import { useLenaTokenBalance } from './useLenaTokenBalance';

export const LENA_AI_GENERAL_SUBJECT = `${AI_DISPATCH_SUBJECT_PREFIX}General`;
const LENA_STEP_MARKER_PATTERN = /\[\[LENA_STEP:([a-zA-Z]+)\]\]/;

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
  lang?: Language;
  welcomeText: string;
  welcomeRole: string;
  sendFailedTitle: string;
  replyFailedTitle: string;
  newConversationLabel: string;
  initialCanvasMode?: LenaCanvasMode | null;
  quickActionLabels: Record<LenaQuickAction, string>;
  // False while the chat overlay is closed - the plan's remaining-message count is re-read every
  // time it opens, so a top-up made elsewhere in the app unblocks LenaAI without a page reload.
  active?: boolean;
};

type OptimisticLenaMessage = {
  id: string;
  rawText: string;
  displayText: string;
  status: 'sending' | 'failed' | 'uploading';
  time: string;
  conversationId?: number;
  attachments?: LenaAttachment[];
  // Kept so a failed attachment upload can retry with the exact same file, not just re-send text.
  file?: File;
  // Present only for a questionnaire pill answer, so a failed retry replays through
  // sendGuidedAnswer (the deterministic path) instead of sendMessage (the AI path).
  step?: string;
};

// Shared conversation logic behind the reusable LenaAI chat (frontend/src/components/lena/LenaAI.tsx).
// Mirrors the find-or-create/send/reply flow already proven in LoadDetailsModal.tsx's AI Dispatch
// tab, generalized to also support a load-less "general" conversation (load_id: null).
export const useLenaAiChat = ({ userId, companyIds = [], loadId, loadLabel, lang, welcomeText, welcomeRole, sendFailedTitle, replyFailedTitle, newConversationLabel, initialCanvasMode = null, quickActionLabels, active = true }: UseLenaAiChatOptions) => {
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
      .sort((a, b) => {
        const byLastMessage = Date.parse(String(b.last_message_at || '')) - Date.parse(String(a.last_message_at || ''));
        return Number.isNaN(byLastMessage) ? Number(b.id) - Number(a.id) : byLastMessage;
      });
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

  const { outOfTokens, tokenResetAt, tokenPackageIcon, tokenPackageColor, blockedMessages, denyOutOfTokens, clearBlockedMessages } = useLenaTokenBalance({ userId, active });

  const conversation = useMemo<Conversation>(() => {
    const rowMessages = row && Array.isArray(row.messages) ? row.messages as Array<Record<string, unknown>> : [];
    const messages: Conversation['messages'] = row
      ? rowMessages.map((message) => ({
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
      attachments: message.attachments,
      deliveryStatus: message.status === 'failed' ? 'failed' : message.status === 'uploading' ? 'uploading' : undefined,
      onRetry: message.status === 'failed'
        ? (message.file
            ? () => void attachFileValue(message.file!, message.id)
            : message.step
              ? () => void sendGuidedAnswer(message.step!, message.rawText, message.displayText, message.id)
              : () => void sendMessage(message.rawText, message.displayText, message.id, message.conversationId))
        : undefined,
    }));
    blockedMessages.forEach((message) => messages.push(message));
    const firstBody = String(rowMessages.find((message) => String(message.body || '').trim())?.body || '').trim();
    const firstAction = lenaQuickActionFromMessage(firstBody);
    const conversationName = row
      ? lenaConversationSubjectTitle(row.subject)
        || (firstAction ? quickActionLabels[firstAction] : '')
        || newConversationLabel
      : newConversationLabel;

    return {
      id: row ? String(row.id) : `new-${newChatVersion}`,
      name: conversationName,
      role: welcomeRole,
      channel: 'inapp',
      online: true,
      unread: 0,
      lastTime: 'now',
      messages,
      isAiDispatch: true,
      canvas: !loadId && (canvasOverride ?? Boolean(row?.canvas)),
    };
  }, [row, userId, optimisticMessages, blockedMessages, welcomeText, welcomeRole, newChatVersion, canvasOverride, newConversationLabel, quickActionLabels]);

  const canvasEnabled = !loadId && (canvasOverride ?? Boolean(row?.canvas));
  const canvasAttachments = useMemo(() => {
    const savedDraft = loadDraftRecordToScan(row?.freight_load_draft);
    return [
      ...(savedDraft ? [{ name: ui(lang ?? 'en', 'chat.conversationText', 'Conversation text'), type: 'application/json', size: 0, loadScan: savedDraft }] : []),
      ...conversation.messages.flatMap((message) => message.attachments || []),
    ];
  }, [conversation.messages, lang, row?.freight_load_draft]);
  // Which questionnaire field a free-text answer is currently expected to fill - passed into the
  // scan call so the AI extracts a bare value (e.g. "50") into that exact field instead of
  // guessing it into a different one (see OpenRouterLoadScanner::STEP_FIELD_HINTS).
  const pendingStep = useMemo(() => {
    const lastMessage = conversation.messages.at(-1);
    if (!lastMessage || lastMessage.sender !== 'other') return null;
    return lastMessage.text.match(LENA_STEP_MARKER_PATTERN)?.[1] ?? null;
  }, [conversation.messages]);
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
    clearBlockedMessages();
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
    const savedDraft = loadDraftRecordToScan(item.freight_load_draft);
    const detectedScan = latestLoadScan([
      ...(savedDraft ? [{ name: 'draft', type: 'application/json', size: 0, loadScan: savedDraft }] : []),
      ...messages.flatMap((message) => Array.isArray(message.attachments) ? message.attachments as LenaAttachment[] : []),
    ]);
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
      detectedFieldCount: Boolean(item.canvas) ? (detectedScan ? buildScanFieldRows(detectedScan).length : 0) : undefined,
    };
  }), [availableRows, welcomeRole, quickActionLabels, newConversationLabel]);

  const selectConversation = (id: string) => {
    setOptimisticMessages([]);
    clearBlockedMessages();
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
    if (outOfTokens) {
      setDraft('');
      return denyOutOfTokens(displayText === rawText ? text : displayText);
    }

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
          const scan = await api.loads.scanText(text, latestLoadScan(canvasAttachments), conversationId, pendingStep);
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

    // Flip to the new conversation only after the list already contains it - doing this before
    // result.refresh() resolves leaves a render where selectedConversationId points at a row that
    // availableRows doesn't have yet, so `row` briefly resolves to undefined and the welcome screen
    // flashes back before the real conversation takes over.
    try {
      await result.refresh();
    } catch {
      // The message is already stored; a transient refresh failure must not mark it as unsent.
    } finally {
      setSelectedConversationId(String(conversationId));
      setStartingNewChat(false);
      setOptimisticMessages((messages) => messages.filter((message) => message.id !== optimisticId));
    }

    try {
      await withMinDelay(api.dispatchChat.reply(conversationId, lang));
      await result.refresh();
      setCanvasOverride(null);
    } catch (error) {
      void showError(replyFailedTitle, error instanceof Error ? error.message : undefined);
    } finally {
      setSending(false);
    }
  }

  const send = async () => {
    const trimmed = draft.trim();
    if (canvasEnabled && pendingStep && MASKABLE_GUIDED_STEPS.includes(pendingStep) && trimmed) {
      return sendGuidedAnswer(pendingStep, trimmed, trimmed);
    }
    return sendMessage(draft);
  };
  const sendQuickAction = async (action: LenaQuickAction) => sendMessage(lenaQuickActionMarker(action), quickActionLabels[action]);
  const sendSuggestedReply = async (value: string, displayText = value) => sendMessage(value, displayText);

  // Questionnaire pill answers (including "later"/"none") are already known-valid values, so this
  // skips the dispatch-chat + load-scan AI round trip entirely and resolves the draft update and
  // confirmation text deterministically server-side (see LenaGuidedAnswerController). Only free-text
  // answers still go through sendMessage's AI pipeline.
  const sendGuidedAnswer = async (step: string, value: string, displayText: string, retryId?: string) => {
    if (!userId || sending) return;
    if (outOfTokens) {
      setDraft('');
      return denyOutOfTokens(displayText);
    }
    const skip = value.startsWith('[[LENA_SKIP:');
    setDraft('');

    const optimisticId = retryId || `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    setOptimisticMessages((messages) => retryId
      ? messages.map((message) => message.id === retryId ? { ...message, status: 'sending', time: optimisticTime } : message)
      : [...messages, { id: optimisticId, rawText: value, displayText, status: 'sending', time: optimisticTime, step }]);
    setSending(true);
    try {
      const conversationId = await ensureConversation(canvasEnabled);
      setOptimisticMessages((messages) => messages.map((message) => message.id === optimisticId ? { ...message, conversationId } : message));
      await withMinDelay(api.dispatchChat.answerStep(conversationId, step, skip ? null : value, displayText, skip, lang || 'en'));
      // See sendMessage's matching comment: flip to the new conversation only after the list
      // already contains it, so `row` doesn't briefly resolve to undefined and flash the welcome
      // screen back before the real conversation takes over.
      try {
        await result.refresh();
      } catch {
        // The answer is already stored server-side; a transient refresh failure isn't a send failure.
      } finally {
        setSelectedConversationId(String(conversationId));
        setStartingNewChat(false);
      }
      setCanvasOverride(null);
    } catch (error) {
      setOptimisticMessages((messages) => messages.map((message) => message.id === optimisticId ? { ...message, status: 'failed' } : message));
      setSending(false);
      return;
    }
    setOptimisticMessages((messages) => messages.filter((message) => message.id !== optimisticId));
    setSending(false);
  };

  const attachFileValue = async (file: File, retryId?: string) => {
    if (!userId || sending || (processingAttachment && !retryId)) return;
    if (outOfTokens) return denyOutOfTokens(file.name);

    const attachmentOpensCanvas = !loadId && canvasEnabled;
    const body = !attachmentOpensCanvas
      ? `Attached ${file.name}.`
      : canvasMode === 'bulk'
      ? `Attached ${file.name} for a bulk load import.`
      : `Attached ${file.name} to prepare a new load posting.`;

    const optimisticId = retryId || `optimistic-attachment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    // The bubble shows immediately with just the file's local metadata, the same way a typed
    // message shows optimistically before it's saved; the card becomes clickable once the real
    // upload (see analyzeLenaAttachment) hands back a storage path.
    const previewAttachment: LenaAttachment = { name: file.name, type: file.type || 'application/octet-stream', size: file.size };

    setOptimisticMessages((messages) => retryId
      ? messages.map((message) => message.id === retryId ? { ...message, status: 'uploading', time: optimisticTime } : message)
      : [...messages, { id: optimisticId, rawText: body, displayText: body, status: 'uploading', time: optimisticTime, attachments: [previewAttachment], file }]);

    setProcessingAttachment(true);
    let conversationId: number;
    try {
      // The upload needs a real conversation id up front (unlike the AI scan), so make sure one
      // exists before reading/analyzing the file.
      conversationId = await ensureConversation(attachmentOpensCanvas);
      setOptimisticMessages((messages) => messages.map((message) => message.id === optimisticId ? { ...message, conversationId } : message));
      const attachment = await analyzeLenaAttachment(file, canvasMode, conversationId, latestLoadScan(canvasAttachments));
      await api.messages.create({
        conversation_id: conversationId,
        sender_user_id: userId,
        body,
        attachments: [attachment],
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      setOptimisticMessages((messages) => messages.map((message) => message.id === optimisticId ? { ...message, status: 'failed' } : message));
      setProcessingAttachment(false);
      return;
    }

    // See sendMessage's matching comment: flip to the new conversation only after the list already
    // contains it, so `row` doesn't briefly resolve to undefined and flash the welcome screen back
    // before the real conversation takes over.
    try {
      await result.refresh();
    } catch {
      // The attachment is already stored; a transient refresh failure must not mark it as unsent.
    } finally {
      setSelectedConversationId(String(conversationId));
      setStartingNewChat(false);
      setOptimisticMessages((messages) => messages.filter((message) => message.id !== optimisticId));
    }

    try {
      await withMinDelay(api.dispatchChat.reply(conversationId, lang));
      await result.refresh();
      setCanvasOverride(null);
    } catch (error) {
      void showError(replyFailedTitle, error instanceof Error ? error.message : undefined);
    } finally {
      setProcessingAttachment(false);
    }
  };

  const attachFile = (file: File) => attachFileValue(file);

  const loadDraftId = row?.load_draft_id ? String(row.load_draft_id) : null;

  return { outOfTokens, tokenResetAt, tokenPackageIcon, tokenPackageColor, conversation, draft, setDraft, send, sendQuickAction, sendSuggestedReply, sendGuidedAnswer, sending, startNewChat, selectConversation, sidebarConversations, hasActiveConversation: Boolean(row), canvasEnabled, canvasMode, setCanvasEnabled, canvasAttachments, attachFile, processingAttachment, loadDraftId };
};
