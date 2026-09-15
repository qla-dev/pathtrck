import { lenaText, lenaLoadWelcome } from '../../lib/lenaCatalog';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, ChevronDown, ChevronUp, LayoutGrid, MessageCircle, Pin, Plus, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { confirmAction } from '../../lib/swal';
import { ChatConversationPanel } from '../chat/ChatConversationPanel';
import { ChatSidebar } from '../chat/ChatSidebar';
import type { Conversation } from '../chat/types';
import { useLenaAiChat } from '../../lib/useLenaAiChat';
import { useLenaEmbeddedMessages } from './useLenaEmbeddedMessages';
import { lenaStepInputMask } from '../../lib/lenaStepInputMask';
import { LenaLoadCanvas } from './LenaLoadCanvas';
import { LENA_LOAD_FILE_ACCEPT, LenaCanvasMode, latestLoadScan } from '../../lib/lenaLoadCanvas';
import { buildScanFieldRows, ScanFieldPatch } from '../modals/scanFieldRows';
import { api, BulkLoadRow, type PublicTrackingSummary } from '../../services/api';
import { voiceLocaleForLanguage } from '../../lib/voiceLocale';
import { lenaImageGeneratingLabel } from './LenaImageGeneratingPlaceholder';

type LenaAIProps = {
  open: boolean;
  sideBarMode?: boolean;
  /** A pinned sidebar is intentionally a single conversation, never the chat inbox. */
  pinnedMode?: boolean;
  onClose: () => void;
  lang: Language;
  userId?: number;
  companyIds?: number[];
  loadId?: string;
  loadLabel?: string;
  /** Superadmin or master: offers LenaAI's AI training mode. */
  canUseTraining?: boolean;
  initialConversationId?: string;
  onBookLoad?: (loadId?: string) => void | Promise<void>;
  onOpenLoad?: (loadId: string) => void;
  initialCanvasMode?: LenaCanvasMode | null;
  onApplyLoadPrefill?: (patch: ScanFieldPatch, conversationId: string, draftId?: string | null) => void;
  onBulkImported?: (rows: BulkLoadRow[]) => void;
  publicTrackingNumber?: string;
  // Actions offered by the out-of-messages card once the plan's LenaAI allowance is spent.
  onUpgrade?: () => void;
  onTopUp?: () => void;
  onPin?: (conversationId: string) => void;
  onConversationReady?: () => void;
  onStartGenericChat?: () => void;
};

// Reusable LenaAI chat overlay — with no loadId it's a general app assistant (opened from the
// sidebar); with a loadId it's the same per-load dispatch chat used elsewhere, plus an optional
// embedded booking action when the backend signals booking intent.
// Full-screen takeover with the same enter/exit animation as TrackingItemDetails.tsx.
export function LenaAI(props: LenaAIProps) {
  if (props.publicTrackingNumber) {
    return props.open
      ? <PublicTrackingLenaAI {...props} trackingNumber={props.publicTrackingNumber} />
      : null;
  }
  return <LenaAIConversation {...props} />;
}

function PublicTrackingLenaAI({ open, onClose, lang, trackingNumber }: LenaAIProps & { trackingNumber: string }) {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [result, setResult] = useState<PublicTrackingSummary | null>(null);
  const [thinking, setThinking] = useState(true);
  const [lookupVersion, setLookupVersion] = useState(0);

  useEffect(() => {
    if (!open || !trackingNumber) return undefined;
    let active = true;
    setResult(null);
    setThinking(true);

    const lookup = api.landing.tracking(trackingNumber).then((response) => response.data).catch(() => null);
    const minimumThinkingTime = new Promise<void>((resolve) => window.setTimeout(resolve, 3000));
    void Promise.all([lookup, minimumThinkingTime]).then(([trackingResult]) => {
      if (!active) return;
      setResult(trackingResult);
      setThinking(false);
    });

    return () => {
      active = false;
    };
  }, [lookupVersion, open, trackingNumber]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  const requestText = u('landing.tracking.request', '').replace('{number}', trackingNumber);
  const embeddedTracking = useMemo(() => {
    if (!result) return null;
    const nestedId = result.load?.id;
    const idCandidate = result.load_id ?? nestedId;
    const loadId = /^\d+$/.test(String(idCandidate ?? '')) ? String(idCandidate) : '0';
    const load = result.load ?? {
      id: loadId,
      title: result.title,
      status: result.status,
      transport_type: result.transport_type,
      booking_reference: result.tracking_number,
      stops: [
        ...(result.origin ? [{ type: 'pickup', position: 1, ...result.origin }] : []),
        ...(result.destination ? [{ type: 'delivery', position: 2, ...result.destination }] : []),
      ],
      shipment: {
        tracking_number: result.tracking_number,
        status: result.status,
        carrier: result.carrier,
        estimated_delivery_at: result.estimated_delivery_at,
        events: result.latest_event ? [result.latest_event] : [],
      },
    };
    return { loadId, load };
  }, [result]);
  const messages = useMemo<Conversation['messages']>(() => [
    { id: `public-track-user-${lookupVersion}`, sender: 'me', text: requestText, time: '' },
    ...(!thinking ? [{
      id: `public-track-answer-${lookupVersion}`,
      sender: 'other' as const,
      text: result
        ? `${u('landing.tracking.found', '')}\n[[LOAD_DETAILS:${embeddedTracking?.loadId ?? '0'}]]`
        : u('landing.tracking.notFound', ''),
      time: '',
    }] : []),
  ], [embeddedTracking, lookupVersion, requestText, result, thinking, lang]);

  const preloadedLoads = useMemo(
    () => embeddedTracking ? { [embeddedTracking.loadId]: embeddedTracking.load } : {},
    [embeddedTracking],
  );
  const { displayMessages, renderMessageExtra, renderMessageSources, extraContentVersion } = useLenaEmbeddedMessages({
    messages,
    lang,
    preloadedLoads,
  });
  const conversation = useMemo<Conversation>(() => ({
    id: `public-tracking-${trackingNumber}`,
    name: u('New LenaAI conversation', ''),
    role: 'LenaAI',
    channel: 'inapp',
    online: true,
    unread: 0,
    lastTime: '',
    messages: displayMessages,
    isAiDispatch: true,
  }), [displayMessages, trackingNumber, lang]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[300] bg-white dark:bg-slate-950" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
          <button type="button" onClick={onClose} aria-label={u('login.close', '')} className="absolute right-0 top-0 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-bl-xl border-b border-l border-slate-200 bg-slate-100 text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <X className="h-5 w-5" />
          </button>
          <motion.div className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-white p-4 dark:bg-slate-950 md:p-7" initial={{ opacity: 0, y: 24, scale: 0.992 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.996 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
            <ChatConversationPanel
              activeConversation={conversation}
              draft=""
              onDraftChange={() => undefined}
              onSend={() => undefined}
              messagePlaceholder={u('Write a message...', '')}
              className="min-h-[320px] min-w-0 flex-1"
              otherTyping={thinking}
              thinkingLabel={u('Thinking', '')}
                thinkingPhrases={[
                  u('lena.thinkingPhrase', 'is thinking'),
                  u('lena.analyzingPhrase', 'is analysing'),
                  u('lena.reviewingPhrase', 'is reviewing information'),
                  u('lena.patiencePhrase', 'asks for your patience'),
                ]}
              renderMessageExtra={renderMessageExtra}
              renderMessageBeforeTime={renderMessageSources}
              extraContentVersion={extraContentVersion}
              inputLocked
              inputLockedPlaceholder={u('landing.tracking.readOnly', '')}
              headerActions={(
                <button type="button" onClick={() => {
                  setResult(null);
                  setThinking(true);
                  setLookupVersion((current) => current + 1);
                }} className="flex h-10 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <Plus className="h-4 w-4" />
                  {u('New chat', '')}
                </button>
              )}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function LenaAIConversation({ open, onClose, lang, userId, companyIds, loadId, loadLabel, initialConversationId, onBookLoad, onOpenLoad, initialCanvasMode = null, sideBarMode = false, pinnedMode = false, onApplyLoadPrefill, onBulkImported, onUpgrade, onTopUp, onPin, onConversationReady, onStartGenericChat, canUseTraining = false }: LenaAIProps) {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const quickActionLabels = lenaText(lang).actions as Record<import('../../lib/useLenaAiChat').LenaQuickAction, string>;
  const generalWelcome = lenaText(lang).welcome.general;

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  const { tokenResetAt, tokenPackageIcon, tokenPackageColor, conversation, conversationEntryKey, conversationLoading, draft, setDraft, send, sendQuickAction, sendSuggestedReply, sendGuidedAnswer, sending, startNewChat, selectConversation, sidebarConversations, canvasEnabled, canvasMode, setCanvasEnabled, canvasAttachments, attachFile, processingAttachment, loadDraftId, documentsVersion, thinkingTimeline, generatingImage } = useLenaAiChat({
    userId,
    companyIds,
    loadId,
    loadLabel,
    initialConversationId,
    lang,
    welcomeRole: u('LenaAI', ''),
    welcomeText: loadId ? lenaLoadWelcome(lang, loadLabel) : generalWelcome,
    sendFailedTitle: u('Message could not be sent', ''),
    replyFailedTitle: u('chat.replyFailed', ''),
    newConversationLabel: u('New LenaAI conversation', ''),
    initialCanvasMode,
    quickActionLabels,
    active: open,
  });
  const [canvasPanelOpen, setCanvasPanelOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  useEffect(() => {
    if (open && !conversationLoading) onConversationReady?.();
  }, [conversationLoading, onConversationReady, open]);
  const previousCanvas = useRef({ conversationId: '', active: false });
  useEffect(() => {
    if (pinnedMode) {
      // Pinning must never surprise the user by replacing their chat with the draft canvas.
      setCanvasPanelOpen(false);
      previousCanvas.current = { conversationId: conversation.id, active: canvasEnabled };
      return;
    }
    const previous = previousCanvas.current;
    if (previous.conversationId !== conversation.id || (!previous.active && canvasEnabled)) {
      setCanvasPanelOpen(canvasEnabled);
    } else if (!canvasEnabled) {
      setCanvasPanelOpen(false);
    }
    previousCanvas.current = { conversationId: conversation.id, active: canvasEnabled };
  }, [conversation.id, canvasEnabled, pinnedMode]);
  const showCanvas = !loadId && canvasEnabled && canvasPanelOpen;
  // A synthetic welcome is not a conversation the user has actually started yet.
  const canPinConversation = conversation.messages.some((message) => !message.id.startsWith('welcome-'));
  const collectedFieldCount = useMemo(() => {
    if (!canvasEnabled) return 0;
    const scan = latestLoadScan(canvasAttachments);
    return scan ? buildScanFieldRows(scan).length : 0;
  }, [canvasAttachments, canvasEnabled]);

  const { displayMessages, renderMessageExtra, renderMessageSources, extraContentVersion, pendingStep, pendingStepHasOptions } = useLenaEmbeddedMessages({
    messages: conversation.messages,
    lang,
    fallbackLoadId: loadId,
    onOpenLoad,
    onBookLoad,
    quickActionLabels,
    canUseTraining,
    onQuickAction: (action) => { setVoiceMode(false); void sendQuickAction(action); },
    onSuggestedReply: (value, displayText) => { setVoiceMode(false); void sendSuggestedReply(value, displayText); },
    onStepAnswer: (step, value, displayText) => { setVoiceMode(false); void sendGuidedAnswer(step, value, displayText); },
    onSuggestedDraftChange: setDraft,
    outOfTokensResetAt: tokenResetAt,
    outOfTokensPackageIcon: tokenPackageIcon,
    outOfTokensPackageColor: tokenPackageColor,
    onUpgrade,
    onTopUp,
    onLoadReady: () => {
      void setCanvasEnabled(true);
      setCanvasPanelOpen(true);
    },
  });

  const displayConversation = useMemo(() => ({
    ...conversation,
    name: loadId ? (loadLabel || loadId) : conversation.name,
    role: loadId ? u('Ask me about the load', '') : conversation.role,
    messages: displayMessages,
  }), [conversation, displayMessages, loadId, loadLabel, lang]);
  const [channelFilter, setChannelFilter] = useState('all');
  const channels = [
    { id: 'all', label: u('All', ''), icon: LayoutGrid },
    { id: 'ai', label: u('LenaAI', ''), icon: Bot },
    { id: 'direct', label: u('Direct messages', ''), icon: MessageCircle },
  ];
  const visibleSidebarConversations = channelFilter === 'direct' ? [] : sidebarConversations;

  const handleNewChat = async () => {
    const confirmed = await confirmAction({
      title: u('Start a new chat?', ''),
      text: u(
        'This starts a fresh conversation with LenaAI. Your current chat is kept and still visible in Messages.',
        ''
      ),
      confirmText: u('New chat', ''),
    });
    if (!confirmed) return;
    if (loadId && onStartGenericChat) {
      onStartGenericChat();
      return;
    }
    startNewChat();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={sideBarMode ? `fixed bottom-0 right-0 z-[300] w-full overflow-hidden border-l border-slate-200 bg-white transition-[height] duration-300 ease-out dark:border-slate-800 dark:bg-slate-950 lg:w-[440px] xl:w-[480px] ${sidebarCollapsed ? 'h-14 border-t' : 'h-[100dvh]'}` : "fixed inset-0 z-[300] bg-white dark:bg-slate-950"}
          role="dialog"
          aria-label={loadId ? u('Ask me about the load', '') : 'LenaAI'}
          initial={{ opacity: 0, x: sideBarMode ? 440 : 0 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: sideBarMode ? 440 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={u('login.close', '')}
            className={`absolute right-3 z-50 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 ${sidebarCollapsed ? 'top-3' : 'top-1'}`}
          >
            <X className="h-5 w-5" />
          </button>
          {sideBarMode && <button
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? u('Expand sidebar', 'Expand sidebar') : u('Collapse sidebar', 'Collapse sidebar')}
            title={sidebarCollapsed ? u('Expand sidebar', 'Expand sidebar') : u('Collapse sidebar', 'Collapse sidebar')}
            className={`absolute right-14 z-50 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 ${sidebarCollapsed ? 'top-3' : 'top-1'}`}
          >
            {sidebarCollapsed ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>}
          {sideBarMode && <button
            type="button"
            onClick={() => {
              if (sidebarCollapsed) {
                setSidebarCollapsed(false);
              } else if (canvasEnabled) {
                setCanvasPanelOpen((current) => !current);
              } else {
                setVoiceMode(false);
                void sendQuickAction('add');
              }
            }}
            className={`absolute left-3 z-50 flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 ${sidebarCollapsed ? 'top-2' : 'top-0 border-t-0'}`}
            aria-label={sidebarCollapsed ? u('LenaAI', 'LenaAI') : showCanvas ? u('Hide draft panel', '') : u('Draft panel', '')}
          >
            <Sparkles className="h-4 w-4" />
            {sidebarCollapsed ? u('LenaAI', 'LenaAI') : showCanvas ? u('Hide draft panel', '') : u('Draft panel', '')}
          </button>}
          {!sidebarCollapsed && <motion.div
            className={`flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-white dark:bg-slate-950 ${sideBarMode ? 'px-3 pb-3 pt-12' : 'p-4 md:p-7'}`}
            initial={{ opacity: 0, y: 24, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.996 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex h-full min-h-0 w-full flex-col gap-4 lg:flex-row">
              {!loadId && !pinnedMode && (
                <ChatSidebar
                  compact={showCanvas}
                  searchPlaceholder={u('Search messages...', '')}
                  compactSearchPlaceholder={u('Search', '')}
                  channels={channels}
                  channelFilter={channelFilter}
                  onChannelFilterChange={setChannelFilter}
                  conversations={visibleSidebarConversations}
                  activeConversationId={conversation.id}
                  onSelectConversation={selectConversation}
                  statusText={(chat) => chat.status === 'load-detected' ? u('Load detected', '') : u('Draft', '')}
                />
              )}
              <div className="flex min-h-0 min-w-0 flex-1 gap-4">
              <ChatConversationPanel
                activeConversation={displayConversation}
                compactHeader={sideBarMode}
                draft={draft}
                onDraftChange={setDraft}
                onSend={(message, source) => { setVoiceMode(source === 'voice'); void send(message, source); }}
                messagePlaceholder={u('Write a message...', '')}
                className={`${sideBarMode && showCanvas ? 'hidden' : 'min-h-[320px] min-w-0 flex-1'}`}
                otherTyping={sending}
                thinkingTimeline={thinkingTimeline}
                imageGenerating={generatingImage}
                imageGeneratingLabel={lenaImageGeneratingLabel(lang)}
                thinkingSkillLabel={u('lena.usingSkillPhrase', 'is using skill')}
                thinkingLabel={u('Thinking', '')}
                thinkingPhrases={[
                  u('lena.thinkingPhrase', 'is thinking'),
                  u('lena.analyzingPhrase', 'is analysing'),
                  u('lena.reviewingPhrase', 'is reviewing information'),
                  u('lena.patiencePhrase', 'asks for your patience'),
                ]}
                renderMessageExtra={renderMessageExtra}
                renderMessageBeforeTime={renderMessageSources}
                entryAnimationKey={conversationEntryKey}
                extraContentVersion={extraContentVersion}
                inputMask={lenaStepInputMask(pendingStep, lang)}
                inputLocked={pendingStepHasOptions}
                inputLockedPlaceholder={u('chat.chooseOptionAbove', '')}
                voiceMode={voiceMode}
                voiceLanguage={voiceLocaleForLanguage(lang)}
                onVoiceModeChange={setVoiceMode}
                voiceModeLabel={u('Voice mode', 'Voice mode')}
                stopVoiceModeLabel={u('Stop voice mode', 'Stop voice mode')}
                voiceListeningLabel={u('Listening', 'Listening')}
                voiceUnsupportedLabel={u('Voice input is not supported in this browser.', 'Voice input is not supported in this browser.')}
                onAttachFile={(files) => { setVoiceMode(false); void attachFile(files); }}
                attachmentLimitLabel={u('Select up to 5 files at once.', 'Select up to 5 files at once.')}
                attachmentAccept={LENA_LOAD_FILE_ACCEPT}
                attachmentBusy={processingAttachment}
                sendBusy={sending || processingAttachment}
                attachmentDropLabel={u('Drop file for LenaAI', '')}
                notSentMessageLabel={u('chat.notSent', '')}
                retryMessageLabel={u('chat.retry', '')}
                copyMessageLabel={u('chat.copy', '')}
                copiedMessageLabel={u('chat.copied', '')}
                playMessageLabel={u('Play message', 'Play message')}
                uploadingMessageLabel={u('Uploading...', '')}
                attachmentOpenFailedLabel={u('The file could not be opened', '')}
                headerActions={(
                  <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleNewChat()}
                    aria-label={u('New chat', '')}
                    title={showCanvas || sideBarMode ? u('New chat', '') : undefined}
                    className={`flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 cursor-pointer ${showCanvas || sideBarMode ? 'w-10 justify-center px-0' : 'px-3'}`}
                  >
                    <Plus className="h-4 w-4" />
                    {!showCanvas && !sideBarMode && u('New chat', '')}
                  </button>
                  {onPin && canPinConversation && <button type="button" onClick={() => onPin(conversation.id)} aria-label={u('Pin conversation', 'Pin conversation')} title={showCanvas ? u('Pin conversation', 'Pin conversation') : undefined} className={`flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 cursor-pointer ${showCanvas ? 'w-10 justify-center px-0' : 'px-3'}`}>
                    <Pin className="h-4 w-4" />
                    {!showCanvas && u('Pin conversation', 'Pin conversation')}
                  </button>}
                  {(!loadId || pinnedMode) && !sideBarMode && <button
                    type="button"
                    onClick={() => {
                      if (canvasEnabled) setCanvasPanelOpen((current) => !current);
                      else { setVoiceMode(false); void sendQuickAction('add'); }
                    }}
                    aria-label={showCanvas ? u('Hide draft panel', '') : u('Draft panel', '')}
                    title={showCanvas ? u('Hide draft panel', '') : undefined}
                    className={`relative flex h-10 cursor-pointer items-center gap-2 rounded-full border text-xs font-bold transition-all ${showCanvas ? 'w-10 justify-center px-0 border-primary bg-primary text-white' : 'px-3 border-slate-200 bg-slate-100 text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
                  >
                    {showCanvas ? <X className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {!showCanvas && u('Draft panel', '')}
                    {collectedFieldCount > 0 && <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-primary px-1 text-[10px] font-black text-white dark:border-slate-950">{collectedFieldCount}</span>}
                  </button>}
                  </div>
                )}
              />
              <AnimatePresence initial={false}>
                {showCanvas && (
                  <motion.div key="load-canvas" className={sideBarMode ? 'absolute inset-3 top-12 z-20 min-h-0' : 'h-[42%] min-h-0 min-w-0 flex-1 lg:h-full'} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
                    <LenaLoadCanvas
                      lang={lang}
                      mode={canvasMode}
                      attachments={canvasAttachments}
                      conversationId={conversation.id}
                      draftId={loadDraftId}
                      documentsVersion={documentsVersion}
                      recommendationBusy={sending || processingAttachment}
                      onCopyContainer={(type, quantity, label) => { setVoiceMode(false); void sendGuidedAnswer('containers', `${type}:${quantity}`, label); }}
                      onApplyPrefill={onApplyLoadPrefill}
                      onBulkImported={onBulkImported}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </div>
          </motion.div>}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
