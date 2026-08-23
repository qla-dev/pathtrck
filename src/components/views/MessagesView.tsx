import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, LayoutGrid, MessageCircle, Plus, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { confirmAction, showError } from '../../lib/swal';
import { ChatConversationPanel } from '../chat/ChatConversationPanel';
import { ChatSidebar } from '../chat/ChatSidebar';
import { Channel, Conversation } from '../chat/types';
import { AI_DISPATCH_SUBJECT_PREFIX, ApiUser, api, BulkLoadRow } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { mapLoadStatus } from '../../lib/loadDetails';
import { trPackageStatus } from '../../i18n';
import { useLenaEmbeddedMessages } from '../lena/useLenaEmbeddedMessages';
import { LenaLoadCanvas } from '../lena/LenaLoadCanvas';
import { buildScanFieldRows, ScanFieldPatch } from '../modals/scanFieldRows';
import { analyzeLenaAttachment, latestLoadScan, LENA_LOAD_FILE_ACCEPT, LenaAttachment } from '../../lib/lenaLoadCanvas';
import { LENA_AI_GENERAL_SUBJECT, LenaQuickAction, lenaConversationSubjectTitle, lenaQuickActionFromMessage, lenaQuickActionMarker } from '../../lib/useLenaAiChat';
import { withMinDelay } from '../../lib/timing';
import { lenaStepInputMask } from '../../lib/lenaStepInputMask';

type MessagesViewProps = {
  lang: Language;
  onOpenLoad?: (loadId: string) => void;
  onBookLoad?: (loadId?: string) => void | Promise<void>;
  onApplyLoadPrefill?: (patch: ScanFieldPatch, conversationId: string, draftId?: string | null) => void;
  onBulkImported?: (rows: BulkLoadRow[]) => void;
  // Bumped by the parent whenever something outside this view (e.g. the standalone LenaAI
  // overlay) may have added messages elsewhere - this view stays mounted while other overlays
  // are open on top of it, so it has no other way to know its data went stale in the background.
  refreshSignal?: number;
};

type OptimisticMessage = {
  id: string;
  conversationId: string;
  rawText: string;
  displayText: string;
  status: 'sending' | 'failed' | 'uploading';
  time: string;
  attachments?: LenaAttachment[];
  // Kept so a failed attachment upload can retry with the exact same file, not just re-send text.
  file?: File;
  // Present only for a questionnaire pill answer, so a failed retry replays through
  // sendGuidedAnswerValue (the deterministic path) instead of sendMessageValue (the AI path).
  step?: string;
};

export const MessagesView = ({ lang, onOpenLoad, onBookLoad, onApplyLoadPrefill, onBulkImported, refreshSignal }: MessagesViewProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const quickActionLabels = useMemo<Record<LenaQuickAction, string>>(() => ({
    add: u('Add a new load', 'Add a new load'),
    tracking: u('Check load status', 'Check load status'),
    booking: u('Reserve a load', 'Reserve a load'),
    hs: u('Check HS code', 'Check HS code'),
    free: u('Ask about Freightbook.ai', 'Ask about Freightbook.ai'),
    upload_yes: u('Yes, I have a file', 'Yes, I have a file'),
    upload_no: u('No, enter it manually', 'No, enter it manually'),
    start_add_yes: u('Yes, start creating', 'Yes, start creating'),
    start_add_no: u('No, not now', 'No, not now'),
    continue_add_yes: u('Yes, continue', 'Yes, continue'),
    continue_add_no: u('No, leave load creation', 'No, leave load creation'),
  }), [lang]);
  const generalWelcome = `${u('Lena welcome general', 'Hello, I am LenaAI, your AI dispatcher in Freightbook.ai.\n\nYou can write to me in any language. I will reply exclusively in the language you use. How can I help you today?')}\n\n[[LENA_OPTIONS:add,tracking,booking,hs,free]]`;
  const result = useApiList(api.conversations.list, { per_page: 100 });
  const isInitialRefreshSignal = useRef(true);
  useEffect(() => {
    if (isInitialRefreshSignal.current) {
      isInitialRefreshSignal.current = false;
      return;
    }
    void result.refresh();
  }, [refreshSignal]);
  const [user, setUser] = useState<ApiUser | null>(null);
  useEffect(() => { void api.auth.me().then(setUser); }, []);
  const conversations = useMemo<Conversation[]>(() => result.items.map((row) => {
    const participants = Array.isArray(row.participants) ? row.participants as Array<Record<string, unknown>> : [];
    const counterpart = participants.find((participant) => Number(participant.id) !== user?.id) || participants[0];
    const messages = Array.isArray(row.messages) ? row.messages as Array<Record<string, unknown>> : [];
    const isAiDispatch = typeof row.subject === 'string' && row.subject.startsWith(AI_DISPATCH_SUBJECT_PREFIX);
    const visibleAiTitle = isAiDispatch ? lenaConversationSubjectTitle(row.subject) : '';
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
    const status = isAiDispatch
      ? (Boolean(row.canvas) ? u('Load detected', 'Load detected') : u('Draft', 'Draft'))
      : load ? trPackageStatus(lang, mapLoadStatus(load.status)) : undefined;
    const loadPosted = load ? String(load.status || '').toLowerCase() === 'posted' : false;
    const mappedMessages = messages.map((message) => {
      const body = String(message.body || '');
      const action = isAiDispatch ? lenaQuickActionFromMessage(body) : undefined;
      return { id: String(message.id), sender: Number(message.sender_user_id) === user?.id ? 'me' as const : 'other' as const, text: action ? quickActionLabels[action] : body, time: String(message.sent_at || message.created_at || '').slice(11, 16), attachments: Array.isArray(message.attachments) ? message.attachments as import('../../lib/lenaLoadCanvas').LenaAttachment[] : undefined };
    });
    return {
      id: String(row.id),
      name: isAiDispatch
        ? String(loadName || visibleAiTitle || (row.load_id ? `Load #${row.load_id}` : u('New LenaAI conversation', 'New LenaAI conversation')))
        : String(row.subject || counterpart?.name || `Conversation ${row.id}`),
      role: isAiDispatch ? u('LenaAI', 'LenaAI') : String(((counterpart?.role || {}) as Record<string, unknown>).label || ''),
      channel: (String(row.channel || 'inapp') as Channel),
      online: false, unread: 0, lastTime: String(row.last_message_at || '').slice(11, 16),
      messages: isAiDispatch && !row.load_id && mappedMessages.length === 0
        ? [{ id: `welcome-${row.id}`, sender: 'other' as const, text: generalWelcome, time: '' }]
        : mappedMessages,
      loadId: row.load_id ? String(row.load_id) : undefined,
      loadDraftId: row.load_draft_id ? String(row.load_draft_id) : undefined,
      isAiDispatch,
      canvas: Boolean(row.canvas),
      meta: meta || undefined,
      status,
      loadPosted,
    };
  }), [result.items, user, lang, quickActionLabels, generalWelcome]);
  const [channelFilter, setChannelFilter] = useState<'all' | 'ai' | 'direct'>('all');
  const [activeId, setActiveId] = useState('');
  const [draft, setDraft] = useState('');
  const [aiReplying, setAiReplying] = useState(false);
  const [messageSending, setMessageSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [processingAttachment, setProcessingAttachment] = useState(false);
  const [creatingNewConversation, setCreatingNewConversation] = useState(false);
  const [pendingNewConversation, setPendingNewConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    if (pendingNewConversation && conversations.some((conversation) => conversation.id === pendingNewConversation.id)) {
      setPendingNewConversation(null);
    }
  }, [conversations, pendingNewConversation]);

  const displayedConversations = useMemo(
    () => pendingNewConversation && !conversations.some((conversation) => conversation.id === pendingNewConversation.id)
      ? [pendingNewConversation, ...conversations]
      : conversations,
    [conversations, pendingNewConversation]
  );

  const channels = [
    { id: 'all' as const, label: u('All', 'All'), icon: LayoutGrid },
    { id: 'ai' as const, label: u('LenaAI', 'LenaAI'), icon: Bot },
    { id: 'direct' as const, label: u('Direct messages', 'Direct messages'), icon: MessageCircle },
  ];

  const filteredConversations = useMemo(
    () => displayedConversations.filter((c) => {
      if (channelFilter === 'ai') return c.isAiDispatch;
      if (channelFilter === 'direct') return !c.isAiDispatch;
      return true;
    }),
    [channelFilter, displayedConversations]
  );

  const activeConversation = useMemo(() => {
    const base = filteredConversations.find((c) => c.id === activeId) ?? filteredConversations[0] ?? displayedConversations[0] ?? { id: '', name: u('messages.empty', 'No conversation'), role: '', channel: 'inapp' as const, online: false, unread: 0, lastTime: '', messages: [], loadDraftId: undefined };
    const pending = optimisticMessages
      .filter((message) => message.conversationId === base.id)
      .map((message) => ({
        id: message.id,
        sender: 'me' as const,
        text: message.displayText,
        time: message.time,
        attachments: message.attachments,
        deliveryStatus: message.status === 'failed' ? 'failed' as const : message.status === 'uploading' ? 'uploading' as const : undefined,
        onRetry: message.status === 'failed'
          ? (message.file
              ? () => void attachFileValue(message.file!, message.id)
              : message.step
                ? () => void sendGuidedAnswerValue(message.step!, message.rawText, message.displayText, message.id, message.conversationId)
                : () => void sendMessageValue(message.rawText, message.displayText, message.id, message.conversationId))
          : undefined,
      }));
    return pending.length ? { ...base, messages: [...base.messages, ...pending] } : base;
  }, [filteredConversations, activeId, displayedConversations, optimisticMessages]);

  const [canvasPanelOpen, setCanvasPanelOpen] = useState(false);
  const previousCanvas = useRef({ conversationId: '', active: false });
  useEffect(() => {
    const active = Boolean(activeConversation.canvas);
    const previous = previousCanvas.current;
    if (previous.conversationId !== activeConversation.id || (!previous.active && active)) {
      setCanvasPanelOpen(active);
    } else if (!active) {
      setCanvasPanelOpen(false);
    }
    previousCanvas.current = { conversationId: activeConversation.id, active };
  }, [activeConversation.id, activeConversation.canvas]);
  const canEnterCanvas = Boolean(activeConversation.isAiDispatch) && (!activeConversation.loadId || !activeConversation.loadPosted);
  const canvasAttachments = useMemo(
    () => activeConversation.messages.flatMap((message) => message.attachments || []),
    [activeConversation.messages]
  );
  const collectedFieldCount = useMemo(() => {
    const scan = latestLoadScan(canvasAttachments);
    return scan ? buildScanFieldRows(scan).length : 0;
  }, [canvasAttachments]);

  const { displayMessages, renderMessageExtra, extraContentVersion, pendingStep } = useLenaEmbeddedMessages({
    messages: activeConversation.messages,
    lang,
    fallbackLoadId: activeConversation.loadId,
    onOpenLoad,
    onBookLoad,
    quickActionLabels,
    onQuickAction: (action) => void sendMessageValue(lenaQuickActionMarker(action), quickActionLabels[action]),
    onSuggestedReply: (value, displayText) => void sendMessageValue(value, displayText),
    onStepAnswer: (step, value, displayText) => void sendGuidedAnswerValue(step, value, displayText),
    onSuggestedDraftChange: setDraft,
    onLoadReady: () => setCanvasPanelOpen(true),
  });

  const displayConversation = useMemo(() => ({
    ...activeConversation,
    messages: displayMessages,
  }), [activeConversation, displayMessages]);

  async function sendMessageValue(rawText: string, displayText = rawText, retryId?: string, targetConversationId?: string) {
    const text = rawText.trim();
    const conversationId = targetConversationId || activeConversation.id;
    if (!text || !conversationId || !user || messageSending || aiReplying) return;

    const optimisticId = retryId || `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const isAiDispatch = Boolean(activeConversation.isAiDispatch);
    setDraft('');
    setOptimisticMessages((messages) => retryId
      ? messages.map((message) => message.id === retryId ? { ...message, status: 'sending', time: optimisticTime } : message)
      : [...messages, { id: optimisticId, conversationId, rawText: text, displayText, status: 'sending', time: optimisticTime }]);
    setMessageSending(true);
    if (isAiDispatch) setAiReplying(true);
    try {
      let attachments: LenaAttachment[] | undefined;
      if (activeConversation.canvas && isAiDispatch && !lenaQuickActionFromMessage(text)) {
        try {
          const scan = await api.loads.scanText(text, latestLoadScan(canvasAttachments), Number(conversationId), pendingStep);
          attachments = [{ name: 'LenaAI conversation', type: 'text/plain', size: new Blob([text]).size, loadScan: scan.data }];
        } catch {
          // The normal conversation must still be sent if structured extraction is unavailable.
        }
      }
      await api.messages.create({ conversation_id: Number(conversationId), sender_user_id: user.id, body: text, attachments, sent_at: new Date().toISOString() });
    } catch (error) {
      setOptimisticMessages((messages) => messages.map((message) => message.id === optimisticId ? { ...message, status: 'failed' } : message));
      setMessageSending(false);
      setAiReplying(false);
      return;
    }

    try {
      await result.refresh();
    } catch {
      // The create request succeeded, so a refresh problem must not turn this into an unsent message.
    } finally {
      setOptimisticMessages((messages) => messages.filter((message) => message.id !== optimisticId));
    }

    if (isAiDispatch) {
      try {
        await withMinDelay(api.dispatchChat.reply(Number(conversationId)));
        await result.refresh();
      } catch (error) {
        void showError(
          u('chat.replyFailed', 'LenaAI could not reply'),
          error instanceof Error ? error.message : undefined
        );
      }
    }
    setAiReplying(false);
    setMessageSending(false);
  }

  // Mirrors sendMessageValue but for a questionnaire pill answer: the value is already known and
  // valid, so this skips the load-scan + dispatch-chat AI round trip entirely (see
  // LenaGuidedAnswerController) instead of sending it as free text for the AI to normalize.
  async function sendGuidedAnswerValue(step: string, rawText: string, displayText = rawText, retryId?: string, targetConversationId?: string) {
    const conversationId = targetConversationId || activeConversation.id;
    if (!conversationId || !user || messageSending || aiReplying) return;
    const skip = rawText.startsWith('[[LENA_SKIP:');

    const optimisticId = retryId || `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    setOptimisticMessages((messages) => retryId
      ? messages.map((message) => message.id === retryId ? { ...message, status: 'sending', time: optimisticTime } : message)
      : [...messages, { id: optimisticId, conversationId, rawText, displayText, status: 'sending', time: optimisticTime, step }]);
    setMessageSending(true);
    setAiReplying(true);
    try {
      await withMinDelay(api.dispatchChat.answerStep(Number(conversationId), step, skip ? null : rawText, displayText, skip, lang || 'en'));
      await result.refresh();
    } catch (error) {
      setOptimisticMessages((messages) => messages.map((message) => message.id === optimisticId ? { ...message, status: 'failed' } : message));
      setMessageSending(false);
      setAiReplying(false);
      return;
    }
    setOptimisticMessages((messages) => messages.filter((message) => message.id !== optimisticId));
    setAiReplying(false);
    setMessageSending(false);
  }

  const sendMessage = () => sendMessageValue(draft);

  async function attachFileValue(file: File, retryId?: string) {
    const conversationId = activeConversation.id;
    const isAiDispatch = Boolean(activeConversation.isAiDispatch);
    if (!user || !conversationId || !isAiDispatch || messageSending || aiReplying || (processingAttachment && !retryId)) return;

    const optimisticId = retryId || `optimistic-attachment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const body = activeConversation.canvas
      ? `Attached ${file.name} to prepare a new load posting.`
      : `Attached ${file.name}.`;

    // The bubble shows immediately with just the file's local metadata, the same way a typed
    // message shows optimistically before it's saved; the card becomes clickable once the real
    // upload (see analyzeLenaAttachment) hands back a storage path.
    const previewAttachment: LenaAttachment = { name: file.name, type: file.type || 'application/octet-stream', size: file.size };

    setOptimisticMessages((messages) => retryId
      ? messages.map((message) => message.id === retryId ? { ...message, status: 'uploading', time: optimisticTime } : message)
      : [...messages, { id: optimisticId, conversationId, rawText: body, displayText: body, status: 'uploading', time: optimisticTime, attachments: [previewAttachment], file }]);

    setProcessingAttachment(true);
    setAiReplying(true);
    try {
      const attachment = await analyzeLenaAttachment(file, 'new_load', Number(conversationId), latestLoadScan(canvasAttachments));
      await api.messages.create({
        conversation_id: Number(conversationId),
        sender_user_id: user.id,
        body,
        attachments: [attachment],
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      setOptimisticMessages((messages) => messages.map((message) => message.id === optimisticId ? { ...message, status: 'failed' } : message));
      setProcessingAttachment(false);
      setAiReplying(false);
      return;
    }

    try {
      await result.refresh();
    } catch {
      // The attachment is already stored; a transient refresh failure must not mark it as unsent.
    } finally {
      setOptimisticMessages((messages) => messages.filter((message) => message.id !== optimisticId));
    }

    try {
      await api.dispatchChat.reply(Number(conversationId));
      await result.refresh();
    } catch (error) {
      void showError(
        u('chat.replyFailed', 'LenaAI could not reply'),
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setProcessingAttachment(false);
      setAiReplying(false);
    }
  }

  const attachFile = (file: File) => attachFileValue(file);

  const handleNewConversation = async () => {
    if (!user || creatingNewConversation) return;

    const confirmed = await confirmAction({
      title: u('Start a new chat?', 'Start a new chat?'),
      text: u(
        'This starts a fresh conversation with LenaAI. Your current chat is kept and still visible in Messages.',
        'This starts a fresh conversation with LenaAI. Your current chat is kept and still visible in Messages.'
      ),
      confirmText: u('New chat', 'New chat'),
    });
    if (!confirmed) return;

    setCreatingNewConversation(true);
    try {
      const companyId = Number(user.companies?.[0]?.id);
      const created = await api.conversations.create({
        company_id: Number.isFinite(companyId) ? companyId : undefined,
        created_by_user_id: user.id,
        channel: 'inapp',
        subject: LENA_AI_GENERAL_SUBJECT,
        canvas: false,
        last_message_at: new Date().toISOString(),
        participant_ids: [user.id],
      });
      const conversationId = String(created.data.id);
      setPendingNewConversation({
        id: conversationId,
        name: u('New LenaAI conversation', 'New LenaAI conversation'),
        role: u('LenaAI', 'LenaAI'),
        channel: 'inapp',
        online: false,
        unread: 0,
        lastTime: '',
        messages: [{ id: `welcome-${conversationId}`, sender: 'other', text: generalWelcome, time: '' }],
        isAiDispatch: true,
        canvas: false,
        status: u('Draft', 'Draft'),
      });
      setDraft('');
      setOptimisticMessages([]);
      setChannelFilter('ai');
      setActiveId(conversationId);
      setCanvasPanelOpen(false);
      await result.refresh();
    } catch (error) {
      void showError(
        u('chat.sendFailed', 'Message could not be sent'),
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setCreatingNewConversation(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    const confirmed = await confirmAction({
      title: u('Delete this conversation?', 'Delete this conversation?'),
      text: u(
        'This permanently deletes the conversation and all its messages. This cannot be undone.',
        'This permanently deletes the conversation and all its messages. This cannot be undone.'
      ),
      confirmText: u('Delete', 'Delete'),
      icon: 'warning',
    });
    if (!confirmed) return;

    try {
      await api.conversations.remove(conversationId);
    } catch (error) {
      void showError(
        u('This conversation could not be deleted', 'This conversation could not be deleted'),
        error instanceof Error ? error.message : undefined
      );
      return;
    }

    if (pendingNewConversation?.id === conversationId) setPendingNewConversation(null);
    if (activeId === conversationId) setActiveId('');
    await result.refresh();
  };

  const handlePrepareLoad = () => {
    if (activeConversation.canvas) {
      setCanvasPanelOpen((current) => !current);
      return;
    }
    void sendMessageValue(lenaQuickActionMarker('add'), quickActionLabels.add);
  };

  const showCanvas = canEnterCanvas && Boolean(activeConversation.canvas) && canvasPanelOpen;

  return (
    <div className="h-full">
      <div className="h-full flex flex-col gap-4 lg:flex-row">
        <ChatSidebar
          compact={showCanvas}
          searchPlaceholder={u('Search messages...', 'Search messages...')}
          compactSearchPlaceholder={u('Search', 'Search')}
          channels={channels}
          channelFilter={channelFilter}
          onChannelFilterChange={(id) => setChannelFilter(id as 'all' | 'ai' | 'direct')}
          conversations={filteredConversations}
          activeConversationId={activeConversation.id}
          onSelectConversation={setActiveId}
          emptyStateTitle={u('No conversations yet', 'No conversations yet')}
          emptyStateDescription={u(
            'To start a new conversation, start a chat with LenaAI',
            'To start a new conversation, start a chat with LenaAI'
          )}
          emptyStateActionLabel={u('New chat', 'New chat')}
          onEmptyStateAction={() => void handleNewConversation()}
          emptyStateActionDisabled={!user || creatingNewConversation}
          onDeleteConversation={(id) => void handleDeleteConversation(id)}
          deleteConversationLabel={u('Delete conversation', 'Delete conversation')}
          cancelLabel={u('Cancel', 'Cancel')}
        />

        <div className="flex min-h-0 flex-1 gap-4">
          <ChatConversationPanel
            activeConversation={displayConversation}
            draft={draft}
            onDraftChange={setDraft}
            onSend={sendMessage}
            onAttachFile={attachFile}
            attachmentAccept={LENA_LOAD_FILE_ACCEPT}
            attachmentBusy={processingAttachment}
            sendBusy={messageSending || aiReplying || processingAttachment}
            messagePlaceholder={u('Write a message...', 'Write a message...')}
            className="min-h-0 min-w-0 flex-1"
            otherTyping={aiReplying}
            thinkingLabel={u('Thinking', 'Thinking')}
            notSentMessageLabel={u('chat.notSent', 'Not sent')}
            retryMessageLabel={u('chat.retry', 'Retry')}
            copyMessageLabel={u('chat.copy', 'Copy message')}
            copiedMessageLabel={u('chat.copied', 'Copied')}
            uploadingMessageLabel={u('Uploading...', 'Uploading...')}
            attachmentOpenFailedLabel={u('The file could not be opened', 'The file could not be opened')}
            onTitleClick={activeConversation.loadId && onOpenLoad ? () => onOpenLoad(activeConversation.loadId!) : undefined}
            renderMessageExtra={renderMessageExtra}
            extraContentVersion={`${activeConversation.id}:${extraContentVersion}`}
            inputMask={lenaStepInputMask(pendingStep, lang)}
            headerActionsLeading={(
              <>
                <button
                  type="button"
                  onClick={() => void handleNewConversation()}
                  disabled={!user || creatingNewConversation}
                  className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-600 transition-all hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <Plus className="h-4 w-4" />
                  {u('New chat', 'New chat')}
                </button>
                {canEnterCanvas && (
                  <button
                    type="button"
                    onClick={handlePrepareLoad}
                    className={`relative flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold transition-all cursor-pointer ${showCanvas ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-slate-100 text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
                  >
                    <Sparkles className="h-4 w-4" />
                    {showCanvas ? u('Hide draft panel', 'Hide draft panel') : u('Draft panel', 'Draft panel')}
                    <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-primary px-1 text-[10px] font-black text-white dark:border-slate-900">
                      {collectedFieldCount}
                    </span>
                  </button>
                )}
              </>
            )}
          />
          <AnimatePresence initial={false}>
            {showCanvas && (
              <motion.div
                key="load-canvas"
                className="hidden h-full min-w-0 flex-1 md:block"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <LenaLoadCanvas
                  lang={lang}
                  mode="new_load"
                  attachments={canvasAttachments}
                  conversationId={activeConversation.id}
                  draftId={activeConversation.loadDraftId}
                  onApplyPrefill={onApplyLoadPrefill}
                  onBulkImported={onBulkImported}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
