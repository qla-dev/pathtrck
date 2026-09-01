import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { analyzeLenaAttachment, archiveLenaAttachment, latestLoadScan, LENA_LOAD_FILE_ACCEPT, LenaAttachment, loadDraftRecordToScan } from '../../lib/lenaLoadCanvas';
import { LENA_AI_GENERAL_SUBJECT, LenaQuickAction, lenaConversationSubjectTitle, lenaQuickActionFromMessage, lenaQuickActionMarker } from '../../lib/useLenaAiChat';
import { withMinDelay } from '../../lib/timing';
import { lenaStepInputMask, MASKABLE_GUIDED_STEPS } from '../../lib/lenaStepInputMask';
import { useLenaTokenBalance } from '../../lib/useLenaTokenBalance';

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
  // Bumped by the parent's sidebar "LenaAI" button when the user clicks it while already on this
  // view - there's nowhere else for that click to navigate to, so it starts a new chat instead.
  newChatSignal?: number;
  // Set by the parent right after some other flow (e.g. a first manual "Save as draft") creates a
  // conversation of its own - selects it instead of leaving the generic chat list showing.
  openConversationId?: string | null;
  onConversationOpened?: () => void;
  // Actions offered by the out-of-messages card once the plan's LenaAI allowance is spent.
  onUpgrade?: () => void;
  onTopUp?: () => void;
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

type MessageHistoryState = {
  messages: Conversation['messages'];
  page: number;
  lastPage: number;
  loadingOlder: boolean;
};

const EMPTY_LENA_CONVERSATION_ID = '__new_lena_conversation__';

// Exact openings of the auto-sent "your draft was created, continue the guided form?" message from
// ConversationController::sendDraftFollowUp (one per locale) - matched so it can be treated like the
// synthetic welcome message (no copy button) even though it's a real, server-created Message row.
const DRAFT_CREATED_MESSAGE_PREFIXES = [
  'Čestitamo, kreirali ste draft tereta!',
  'Ihr Ladungsentwurf wurde erstellt.',
  'Your load draft was created.',
  // Last-mile delivery draft's custom celebratory welcome message (PostLoadModal.tsx's
  // submitWithLastMile) - same "no copy button" treatment as the generic draft-created message.
  'Čestitamo, uspješno ste objavili teret',
  'Herzlichen Glückwunsch, Sie haben die Fracht erfolgreich veröffentlicht',
  'Congratulations, you successfully posted the load',
  // Storage request published with the follow-up road transport to the warehouse
  // (PostLoadModal.tsx's startWarehouseTransportDraft).
  'Čestitamo, uspješno ste objavili zahtjev za skladištenje',
  'Herzlichen Glückwunsch, Sie haben Ihre Lageranfrage erfolgreich veröffentlicht',
  'Congratulations, you successfully posted your storage request',
];
const isDraftCreatedMessageBody = (body: string): boolean =>
  DRAFT_CREATED_MESSAGE_PREFIXES.some((prefix) => body.startsWith(prefix));

// Client-side greetings that exist only in this view, never in the database - excluded from the
// rendered history so they can't be mistaken for a page of real messages. The server-created
// "your draft was created" message carries a welcome- prefixed id too, but it is a real message.
const isSyntheticWelcomeId = (id: string): boolean => id.startsWith('welcome-') && !id.startsWith('welcome-draft-');

export const MessagesView = ({ lang, onOpenLoad, onBookLoad, onApplyLoadPrefill, onBulkImported, refreshSignal, newChatSignal, openConversationId, onConversationOpened, onUpgrade, onTopUp }: MessagesViewProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const quickActionLabels = useMemo<Record<LenaQuickAction, string>>(() => ({
    add: u('Add a new load', 'Add a new load'),
    storage: u('Store goods', 'Store goods'),
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
  const generalWelcome = `${u('Lena welcome general', 'Hello, I am LenaAI, your AI dispatcher in Freightbook.ai.\n\nYou can write to me in any language. I will reply exclusively in the language you use. How can I help you today?')}\n\n[[LENA_OPTIONS:add,storage,tracking,booking,hs,free]]`;
  const result = useApiList(api.conversations.list, { per_page: 10 });
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
  // LenaAI runs on the plan's message allowance: with none left the AI is never called, here or in
  // the standalone overlay (see useLenaTokenBalance).
  const { outOfTokens, tokenResetAt, tokenPackageIcon, tokenPackageColor, blockedMessages, blockedMessagesFor, denyOutOfTokens } = useLenaTokenBalance({ userId: user?.id });
  const mapServerMessage = useCallback((message: Record<string, unknown>, isAiDispatch: boolean): Conversation['messages'][number] => {
    const body = String(message.body || '');
    const action = isAiDispatch ? lenaQuickActionFromMessage(body) : undefined;
    return {
      id: isDraftCreatedMessageBody(body) ? `welcome-draft-${message.id}` : String(message.id),
      sender: Number(message.sender_user_id) === user?.id ? 'me' : 'other',
      text: action ? quickActionLabels[action] : body,
      time: String(message.sent_at || message.created_at || '').slice(11, 16),
      attachments: Array.isArray(message.attachments) ? message.attachments as LenaAttachment[] : undefined,
    };
  }, [quickActionLabels, user?.id]);
  const conversations = useMemo<Conversation[]>(() => result.items.map((row) => {
    const participants = Array.isArray(row.participants) ? row.participants as Array<Record<string, unknown>> : [];
    const counterpart = participants.find((participant) => Number(participant.id) !== user?.id) || participants[0];
    const messages = Array.isArray(row.recent_messages)
      ? [...row.recent_messages as Array<Record<string, unknown>>].reverse()
      : Array.isArray(row.messages) ? row.messages as Array<Record<string, unknown>> : [];
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
      ? (row.load_id ? u('Load created', 'Load created') : Boolean(row.canvas) ? u('Load detected', 'Load detected') : u('Draft', 'Draft'))
      : load ? trPackageStatus(lang, mapLoadStatus(load.status)) : undefined;
    const loadPosted = load ? String(load.status || '').toLowerCase() === 'posted' : false;
    const mappedMessages = messages.map((message) => mapServerMessage(message, isAiDispatch));
    const savedDraftScan = loadDraftRecordToScan(row.freight_load_draft);
    if (savedDraftScan && mappedMessages.length > 0) {
      mappedMessages[0] = {
        ...mappedMessages[0],
        attachments: [
          { name: u('chat.conversationText', 'Conversation text'), type: 'application/json', size: 0, loadScan: savedDraftScan },
          ...(mappedMessages[0].attachments || []),
        ],
      };
    }
    const detectedScan = latestLoadScan([
      ...(savedDraftScan ? [{ name: 'draft', type: 'application/json', size: 0, loadScan: savedDraftScan }] : []),
      ...mappedMessages.flatMap((message) => message.attachments || []),
    ]);
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
      messageCount: Number(row.messages_count || mappedMessages.length),
      loadId: row.load_id ? String(row.load_id) : undefined,
      loadDraftId: row.load_draft_id ? String(row.load_draft_id) : undefined,
      isAiDispatch,
      canvas: Boolean(row.canvas),
      meta: meta || undefined,
      status,
      detectedFieldCount: isAiDispatch && Boolean(row.canvas) ? (detectedScan ? buildScanFieldRows(detectedScan).length : 0) : undefined,
      loadPosted,
    };
  }), [result.items, user, lang, generalWelcome, mapServerMessage]);
  const [channelFilter, setChannelFilter] = useState<'all' | 'ai' | 'direct'>('all');
  const [activeId, setActiveId] = useState(EMPTY_LENA_CONVERSATION_ID);
  const [draft, setDraft] = useState('');
  const [aiReplying, setAiReplying] = useState(false);
  const [messageSending, setMessageSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [processingAttachment, setProcessingAttachment] = useState(false);
  // Bumped once an attachment has been filed in the Documents archive, so the draft panel's count
  // refreshes then rather than only on the next page load.
  const [documentsVersion, setDocumentsVersion] = useState(0);
  const [creatingNewConversation, setCreatingNewConversation] = useState(false);
  const [pendingNewConversation, setPendingNewConversation] = useState<Conversation | null>(null);
  // Conversations whose client-only greeting has already been answered. The greeting is never
  // saved, so without this it would be re-synthesized (and re-animated) for the conversation that
  // the very first quick-action click creates, then vanish again as soon as the real messages land.
  const [dismissedWelcomeIds, setDismissedWelcomeIds] = useState<ReadonlySet<string>>(() => new Set());
  const dismissWelcome = useCallback((conversationId: string) => {
    setDismissedWelcomeIds((ids) => ids.has(conversationId) ? ids : new Set(ids).add(conversationId));
  }, []);

  useEffect(() => {
    if (pendingNewConversation && conversations.some((conversation) => conversation.id === pendingNewConversation.id)) {
      setPendingNewConversation(null);
    }
  }, [conversations, pendingNewConversation]);

  // Conversations the user just deleted. They leave the list on the click, before the request is
  // even sent; a failed delete puts them straight back (see handleDeleteConversation).
  const [deletedConversationIds, setDeletedConversationIds] = useState<ReadonlySet<string>>(() => new Set());
  const displayedConversations = useMemo(() => {
    const listed = pendingNewConversation && !conversations.some((conversation) => conversation.id === pendingNewConversation.id)
      ? [pendingNewConversation, ...conversations]
      : conversations;
    return deletedConversationIds.size ? listed.filter((conversation) => !deletedConversationIds.has(conversation.id)) : listed;
  }, [conversations, pendingNewConversation, deletedConversationIds]);
  const [messageHistory, setMessageHistory] = useState<Record<string, MessageHistoryState>>({});

  // Opening a conversation renders the latest 10 messages that already arrived with the
  // conversation list (ConversationController's recentMessages), so a click costs no request at
  // all. Only an upward scroll comes here, pulling the next 10 older messages one page at a time.
  const loadOlderMessages = useCallback(async (conversationId: string, page: number) => {
    if (!conversationId || conversationId === EMPTY_LENA_CONVERSATION_ID) return;
    const conversation = displayedConversations.find((item) => item.id === conversationId);
    const isAiDispatch = Boolean(conversation?.isAiDispatch);
    const previewMessages = conversation?.messages || [];
    const previewLastPage = Math.max(1, Math.ceil((conversation?.messageCount || previewMessages.length) / 10));
    setMessageHistory((current) => ({
      ...current,
      [conversationId]: {
        messages: current[conversationId]?.messages || previewMessages,
        page: current[conversationId]?.page || page - 1,
        lastPage: current[conversationId]?.lastPage || previewLastPage,
        loadingOlder: true,
      },
    }));
    try {
      const response = await api.messages.list({ conversation_id: conversationId, per_page: 10, page });
      const incoming = [...response.data]
        .reverse()
        .map((message) => mapServerMessage(message, isAiDispatch));
      setMessageHistory((current) => {
        const existing = current[conversationId]?.messages || previewMessages;
        const seen = new Set(existing.map((message) => message.id));
        const older = incoming.filter((message) => !seen.has(message.id));
        return {
          ...current,
          [conversationId]: {
            messages: [...older, ...existing],
            page,
            lastPage: Number(response.meta?.last_page || page),
            loadingOlder: false,
          },
        };
      });
    } catch {
      setMessageHistory((current) => ({
        ...current,
        [conversationId]: {
          messages: current[conversationId]?.messages || previewMessages,
          page: current[conversationId]?.page || page - 1,
          lastPage: current[conversationId]?.lastPage || previewLastPage,
          loadingOlder: false,
        },
      }));
    }
  }, [displayedConversations, mapServerMessage]);

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

  const activePreview = displayedConversations.find((conversation) => conversation.id === activeId);
  const activePreviewSignature = activePreview?.messages.map((message) => message.id).join(':') || '';
  useEffect(() => {
    if (!activePreview?.id) return;
    const previewLastPage = Math.max(1, Math.ceil((activePreview.messageCount || activePreview.messages.length) / 10));
    setMessageHistory((current) => {
      const history = current[activePreview.id];
      // Seeded straight from the conversation list's latest 10 messages, so opening a chat costs
      // no request. Rendering from here rather than from the preview also makes the thread
      // append-only: the list refetches itself after every send, which slides older messages out
      // of that 10-message window - they would otherwise vanish from a chat still on screen.
      if (!history) {
        return {
          ...current,
          [activePreview.id]: {
            messages: activePreview.messages.filter((message) => !isSyntheticWelcomeId(message.id)),
            page: 1,
            lastPage: previewLastPage,
            loadingOlder: false,
          },
        };
      }
      const seen = new Set(history.messages.map((message) => message.id));
      const appended = activePreview.messages.filter((message) => !seen.has(message.id) && !isSyntheticWelcomeId(message.id));
      // A message already on screen can still gain an attachment later - saving a load draft
      // re-synthesizes the conversation-text card onto the first message of the preview - so an
      // already-held message is swapped for its fresher preview copy instead of only appending.
      const preview = new Map(activePreview.messages.map((message) => [message.id, message]));
      let refreshed = false;
      const merged = history.messages.map((message) => {
        const fresh = preview.get(message.id);
        if (!fresh || (fresh.attachments?.length || 0) === (message.attachments?.length || 0)) return message;
        refreshed = true;
        return fresh;
      });
      if (appended.length === 0 && !refreshed) return current;
      return {
        ...current,
        [activePreview.id]: {
          ...history,
          messages: [...merged, ...appended],
          lastPage: Math.max(history.lastPage, previewLastPage),
        },
      };
    });
  }, [activePreview?.id, activePreview?.messageCount, activePreviewSignature]);

  const activeConversation = useMemo(() => {
    // isAiDispatch: true so the attach-file control isn't structurally hidden while there's no
    // conversation yet - typing or dropping a file here always starts a fresh LenaAI chat (see
    // sendMessage/attachFile below), so it's accurate to treat this placeholder as one already.
    // The welcome message is shown purely client-side (id stays '' so sendMessage/attachFile still
    // know to create the real conversation on first interaction) - nothing is written to the
    // database just from viewing this empty state, only from actually sending or attaching.
    const emptyConversation: Conversation = {
      id: '',
      name: u('New chat', 'New chat'),
      role: '',
      channel: 'inapp' as const,
      online: false,
      unread: 0,
      lastTime: '',
      messages: [{ id: 'welcome-empty', sender: 'other' as const, text: generalWelcome, time: '' }],
      loadDraftId: undefined,
      isAiDispatch: true,
    };
    const base = activeId === EMPTY_LENA_CONVERSATION_ID
      ? emptyConversation
      : filteredConversations.find((c) => c.id === activeId) ?? displayedConversations.find((c) => c.id === activeId) ?? emptyConversation;
    const history = messageHistory[base.id];
    const keepSyntheticWelcome = history?.messages.length === 0 && base.messages.some((message) => message.id.startsWith('welcome-'));
    const hydratedBase = history && !keepSyntheticWelcome ? { ...base, messages: history.messages } : base;
    // Picking a quick-action mode retires the greeting for good - see dismissWelcome above.
    const greetedBase = dismissedWelcomeIds.has(hydratedBase.id)
      ? { ...hydratedBase, messages: hydratedBase.messages.filter((message) => !isSyntheticWelcomeId(message.id)) }
      : hydratedBase;
    const pending = optimisticMessages
      .filter((message) => message.conversationId === greetedBase.id)
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
    const blocked = blockedMessagesFor(greetedBase.id || EMPTY_LENA_CONVERSATION_ID);
    return pending.length || blocked.length ? { ...greetedBase, messages: [...greetedBase.messages, ...pending, ...blocked] } : greetedBase;
  }, [filteredConversations, activeId, displayedConversations, messageHistory, optimisticMessages, blockedMessages, dismissedWelcomeIds, generalWelcome, u]);

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

  const { displayMessages, renderMessageExtra, extraContentVersion, pendingStep, pendingStepHasOptions } = useLenaEmbeddedMessages({
    messages: activeConversation.messages,
    lang,
    fallbackLoadId: activeConversation.loadId,
    onOpenLoad,
    onBookLoad,
    quickActionLabels,
    onQuickAction: (action) => void sendQuickMessage(lenaQuickActionMarker(action), quickActionLabels[action]),
    onSuggestedReply: (value, displayText) => void sendQuickMessage(value, displayText),
    onStepAnswer: (step, value, displayText) => void sendGuidedAnswerValue(step, value, displayText),
    onSuggestedDraftChange: setDraft,
    onLoadReady: () => setCanvasPanelOpen(true),
    outOfTokensResetAt: tokenResetAt,
    outOfTokensPackageIcon: tokenPackageIcon,
    outOfTokensPackageColor: tokenPackageColor,
    onUpgrade,
    onTopUp,
  });

  const displayConversation = useMemo(() => ({
    ...activeConversation,
    messages: displayMessages,
  }), [activeConversation, displayMessages]);

  // Answers the turn locally with the out-of-messages card instead of creating a conversation,
  // storing anything, or calling the AI. Returns true when it took over the send.
  const denyIfOutOfTokens = (displayText: string) => {
    if (!outOfTokens) return false;
    setDraft('');
    denyOutOfTokens(displayText, activeConversation.id || EMPTY_LENA_CONVERSATION_ID);
    return true;
  };

  async function sendMessageValue(rawText: string, displayText = rawText, retryId?: string, targetConversationId?: string) {
    const text = rawText.trim();
    const conversationId = targetConversationId || activeConversation.id;
    if (!text || !conversationId || !user || messageSending || aiReplying) return;

    const optimisticId = retryId || `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const isAiDispatch = Boolean(activeConversation.isAiDispatch);
    if (isAiDispatch && denyIfOutOfTokens(displayText)) return;
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
        await withMinDelay(api.dispatchChat.reply(Number(conversationId), lang));
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
    if (denyIfOutOfTokens(displayText)) return;
    setDraft('');

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

  // Shared by every entry point that can fire with no conversation open yet (the text input, a
  // quick-action/suggested-reply button on the virtual welcome message, a dropped file) - creates
  // the real conversation on first use, or reuses the already-active one.
  const ensureConversationId = async (): Promise<string | null> => {
    if (!activeConversation.id) return createNewConversation(false);
    dismissWelcome(activeConversation.id);
    return activeConversation.id;
  };

  // Quick-action and suggested-reply buttons (including the ones on the client-only welcome
  // message shown before any real conversation exists - see activeConversation above) go through
  // this instead of calling sendMessageValue directly, so clicking one with no conversation open
  // starts it first instead of silently doing nothing.
  const sendQuickMessage = async (rawText: string, displayText = rawText) => {
    if (denyIfOutOfTokens(displayText)) return;
    const conversationId = await ensureConversationId();
    if (!conversationId) return;
    return sendMessageValue(rawText, displayText, undefined, conversationId);
  };

  const sendMessage = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (activeConversation.isAiDispatch && denyIfOutOfTokens(trimmed)) return;
    const conversationId = await ensureConversationId();
    if (!conversationId) return;
    if (activeConversation.canvas && pendingStep && MASKABLE_GUIDED_STEPS.includes(pendingStep)) {
      return sendGuidedAnswerValue(pendingStep, trimmed, trimmed, undefined, conversationId);
    }
    return sendMessageValue(draft, draft, undefined, conversationId);
  };

  async function attachFileValue(file: File, retryId?: string, targetConversationId?: string) {
    const conversationId = targetConversationId || activeConversation.id;
    const isAiDispatch = targetConversationId ? true : Boolean(activeConversation.isAiDispatch);
    if (!user || !conversationId || !isAiDispatch || messageSending || aiReplying || (processingAttachment && !retryId)) return;
    if (denyIfOutOfTokens(file.name)) return;

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
    let attachmentScan: LenaAttachment | null = null;
    try {
      attachmentScan = await analyzeLenaAttachment(file, 'new_load', Number(conversationId), latestLoadScan(canvasAttachments));
      const attachment = attachmentScan;
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
      await api.dispatchChat.reply(Number(conversationId), lang);
      await result.refresh();
      if (attachmentScan) {
        // That reply is what creates the draft on a first attachment, so the draft id is read back
        // from the server here rather than from the conversation row this closure captured.
        const conversationRow = await api.conversations.get(Number(conversationId)).catch(() => null);
        const draftForFile = conversationRow?.data?.load_draft_id;
        await archiveLenaAttachment(file, draftForFile ? String(draftForFile) : null, attachmentScan.loadScan);
        setDocumentsVersion((version) => version + 1);
      }
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

  // Shared by the explicit "New chat" action and by sendMessage/attachFile silently starting one
  // the moment the user types or drops a file with no conversation open - no confirmation here
  // since there's nothing to lose (no existing chat is being interrupted).
  const createNewConversation = async (seedWelcome = true): Promise<string | null> => {
    if (!user) return null;
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
      if (!seedWelcome) dismissWelcome(conversationId);
      setPendingNewConversation({
        id: conversationId,
        name: u('New LenaAI conversation', 'New LenaAI conversation'),
        role: u('LenaAI', 'LenaAI'),
        channel: 'inapp',
        online: false,
        unread: 0,
        lastTime: '',
        messages: seedWelcome ? [{ id: `welcome-${conversationId}`, sender: 'other', text: generalWelcome, time: '' }] : [],
        isAiDispatch: true,
        canvas: false,
        status: u('Draft', 'Draft'),
      });
      setOptimisticMessages([]);
      setChannelFilter('ai');
      setActiveId(conversationId);
      setCanvasPanelOpen(false);
      await result.refresh();
      return conversationId;
    } catch (error) {
      void showError(
        u('chat.sendFailed', 'Message could not be sent'),
        error instanceof Error ? error.message : undefined
      );
      return null;
    } finally {
      setCreatingNewConversation(false);
    }
  };

  const attachFile = async (file: File) => {
    const conversationId = await ensureConversationId();
    if (!conversationId) return;
    return attachFileValue(file, undefined, conversationId);
  };

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

    setDraft('');
    await createNewConversation();
  };

  const previousNewChatSignal = useRef(newChatSignal);
  useEffect(() => {
    if (previousNewChatSignal.current === newChatSignal) return;
    previousNewChatSignal.current = newChatSignal;
    setDraft('');
    setOptimisticMessages([]);
    setPendingNewConversation(null);
    setCanvasPanelOpen(false);
    setChannelFilter('ai');
    setActiveId(EMPTY_LENA_CONVERSATION_ID);
  }, [newChatSignal]);

  useEffect(() => {
    if (!openConversationId) return;
    setChannelFilter('ai');
    setActiveId(openConversationId);
    setPendingNewConversation(null);
    onConversationOpened?.();
  }, [openConversationId]);

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

    // The row disappears right away and the view moves off it; only a failed request brings it
    // back, so a slow delete never leaves a conversation sitting there looking undeleted.
    const wasPending = pendingNewConversation?.id === conversationId;
    const wasActive = activeId === conversationId;
    setDeletedConversationIds((ids) => new Set(ids).add(conversationId));
    if (wasPending) setPendingNewConversation(null);
    if (wasActive) setActiveId(EMPTY_LENA_CONVERSATION_ID);

    try {
      await api.conversations.remove(conversationId);
    } catch (error) {
      setDeletedConversationIds((ids) => {
        const rolledBack = new Set(ids);
        rolledBack.delete(conversationId);
        return rolledBack;
      });
      if (wasActive) setActiveId(conversationId);
      void showError(
        u('This conversation could not be deleted', 'This conversation could not be deleted'),
        error instanceof Error ? error.message : undefined
      );
      return;
    }

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
  const activeMessageHistory = activeConversation.id
    ? messageHistory[activeConversation.id] || {
        messages: activeConversation.messages,
        page: 1,
        lastPage: Math.max(1, Math.ceil((activeConversation.messageCount || activeConversation.messages.length) / 10)),
        loadingOlder: false,
      }
    : undefined;

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
          loading={result.loading && result.items.length === 0}
          loadingMore={result.loadingMore}
          hasMore={result.hasMore}
          onLoadMore={() => void result.loadMore()}
          activeConversationId={activeConversation.id}
          onSelectConversation={(conversationId) => setActiveId(conversationId)}
          emptyStateTitle={u('No conversations yet', 'No conversations yet')}
          emptyStateDescription={u(
            'Just type a message or drop a file on the right to start chatting with LenaAI',
            'Just type a message or drop a file on the right to start chatting with LenaAI'
          )}
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
            inputLocked={pendingStepHasOptions}
            inputLockedPlaceholder={u('chat.chooseOptionAbove', 'Choose an option above')}
            loadingOlderMessages={Boolean(activeMessageHistory?.loadingOlder)}
            hasOlderMessages={Boolean(activeMessageHistory && activeMessageHistory.page < activeMessageHistory.lastPage)}
            onLoadOlderMessages={() => {
              if (!activeConversation.id || !activeMessageHistory || activeMessageHistory.loadingOlder || activeMessageHistory.page >= activeMessageHistory.lastPage) return;
              void loadOlderMessages(activeConversation.id, activeMessageHistory.page + 1);
            }}
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
                  documentsVersion={documentsVersion}
                  loadId={activeConversation.loadId}
                  onOpenLoad={onOpenLoad}
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
