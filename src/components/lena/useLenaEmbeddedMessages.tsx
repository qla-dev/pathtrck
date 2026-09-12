import { lenaText } from '../../lib/lenaCatalog';
import { latestLoadScan } from '../../lib/lenaLoadCanvas';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { BadgeCheck, Banknote, CheckCircle2, CircleDot, CircleOff, Clock3, FileSearch, FileText, FileUp, Forklift, Handshake, Landmark, MapPinned, MessageCircle, Package, Plane, Radar, ReceiptText, Route, Ruler, ScanEye, ShieldCheck, Ship, Thermometer, Truck, UserRound, Warehouse, Zap, type LucideIcon } from 'lucide-react';

import { api } from '../../services/api';
import { Language } from '../../types';
import { ChatMessage } from '../chat/types';
import { LenaBookingCard, LenaLoadDetailsCard, LenaLoadMapCard, LenaLoadStatusCard, LenaLocationCard, LenaLocationChoiceCard } from './LenaEmbeddedCards';
import { LenaOutOfTokensCard } from './LenaOutOfTokensCard';
import { LenaQuickAction } from '../../lib/useLenaAiChat';

const EMPTY_PRELOADED_LOADS: Record<string, Record<string, unknown>> = {};
const BOOKING_MARKER_PATTERN = /\[\[OFFER_BOOKING(?::(\d+))?\]\]/;
const BOOKING_MARKER_GLOBAL_PATTERN = /\[\[OFFER_BOOKING(?::\d+)?\]\]/g;
const LOAD_DETAILS_MARKER_PATTERN = /\[\[LOAD_DETAILS(?::(\d+))?\]\]/;
const LOAD_DETAILS_MARKER_GLOBAL_PATTERN = /\[\[LOAD_DETAILS(?::\d+)?\]\]/g;
const LOAD_LOCATION_MARKER_PATTERN = /\[\[LOAD_LOCATION(?::(\d+))?\]\]/;
const LOAD_LOCATION_MARKER_GLOBAL_PATTERN = /\[\[LOAD_LOCATION(?::\d+)?\]\]/g;
const LOAD_MAP_MARKER_PATTERN = /\[\[LOAD_MAP(?::(\d+))?\]\]/;
const LOAD_MAP_MARKER_GLOBAL_PATTERN = /\[\[LOAD_MAP(?::\d+)?\]\]/g;
const LOAD_STATUS_MARKER_PATTERN = /\[\[LOAD_STATUS(?::(\d+))?\]\]/;
const LOAD_STATUS_MARKER_GLOBAL_PATTERN = /\[\[LOAD_STATUS(?::\d+)?\]\]/g;
const LENA_OPTIONS_PATTERN = /\[\[LENA_OPTIONS:([a-z_,]+)\]\]/;
const LENA_OPTIONS_GLOBAL_PATTERN = /\[\[LENA_OPTIONS:[a-z_,]+\]\]/g;
const LOAD_READY_MARKER = /\[\[LOAD_READY_TO_POST:complete\]\]/;
const LOAD_READY_MARKER_GLOBAL = /\[\[LOAD_READY_TO_POST(?::complete)?\]\]/g;
const LENA_STEP_MARKER_PATTERN = /\[\[LENA_STEP:([a-zA-Z]+)\]\]/;
const LENA_STEP_MARKER_GLOBAL = /\[\[LENA_STEP:[a-zA-Z]+\]\]/g;
const LENA_SKIP_MARKER_GLOBAL = /\[\[LENA_SKIP:[a-zA-Z]+\]\]/g;

const LENA_OUT_OF_TOKENS_PATTERN = /\[\[LENA_OUT_OF_TOKENS\]\]/;
const LENA_OUT_OF_TOKENS_GLOBAL = /\[\[LENA_OUT_OF_TOKENS\]\]/g;

const removeVisibleMarkdownAsterisks = (text: string): string => text
  .replace(/\*\*([^*\n]+)\*\*/g, '$1')
  .replace(/(^|\n)\s*\*\s+/g, '$1• ')
  .replace(/\*([^*\n]+)\*/g, '$1');

type SuggestedReply = { label: string; value: string; icon: LucideIcon; skip?: boolean };
type SuggestedReplyGroup = { options: SuggestedReply[]; multiple?: boolean; exclusiveValue?: string };
type WarehouseChoice = { id: string; name: string };

const questionnaireOptionIcon = (step: string, value: string): LucideIcon => {
  const normalized = value.toLowerCase();
  if (/not |none|unknown|preference|nije |bez |nicht |keine |unbekannt/.test(normalized)) return CircleOff;
  if (step === 'bodyType' || step === 'vehicleType') return normalized.includes('reefer') ? Thermometer : Truck;
  if (step === 'loadingEquipment') return normalized.includes('forklift') ? Forklift : Package;
  if (step === 'characteristics') return ShieldCheck;
  if (step === 'specialRequirements') return Zap;
  if (step === 'transportMode') return normalized.includes('last-mile') ? Truck : Plane;
  if (step === 'deliveryProof') return FileText;
  if (step === 'priceTerms') return normalized.includes('fixed') || normalized.includes('fiks') || normalized.includes('fest') ? Banknote : Handshake;
  if (step === 'terms') return FileText;
  if (step === 'contact') return UserRound;
  if (step === 'dimensions') return Ruler;
  if (step === 'temperature') return Thermometer;
  if (step === 'declaredValue') return Banknote;
  if (step === 'requirements') {
    if (normalized.includes('toll')) return Route;
    if (normalized.includes('ferry')) return Ship;
    if (normalized.includes('cmr')) return FileText;
    if (normalized.includes('pallet')) return Package;
    if (normalized.includes('customs')) return Landmark;
    if (normalized.includes('certification')) return BadgeCheck;
    if (normalized.includes('inspection')) return ScanEye;
    if (normalized.includes('track')) return Radar;
    if (normalized.includes('priority')) return Zap;
    return ShieldCheck;
  }
  return CircleDot;
};

const questionnaireSuggestions = (step: string, lang: Language, warehouses: WarehouseChoice[] = [], transport = 'road'): SuggestedReplyGroup => {
  const definition = lenaText(lang).steps[step];
  if (!definition) return { options: [] };
  const choices = step === 'warehouse'
    ? [...warehouses.map((warehouse) => ({ label: warehouse.name, value: warehouse.id, skip: false })), ...definition.choices]
    : definition.choices_by_transport[transport] || definition.choices;
  return {
    multiple: definition.multiple,
    options: choices.map((choice) => ({ ...choice, icon: choice.skip ? Clock3 : questionnaireOptionIcon(step, choice.value) })),
  };
};

const QuestionnaireSuggestionPills = ({ group, lang, onSubmit, onSelectionChange }: { group: SuggestedReplyGroup; lang: Language; onSubmit: (value: string, displayText?: string) => void; onSelectionChange?: (value: string) => void }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const confirmLabel = lenaText(lang).ui['lena.shared.0'];
  const multipleHint = lenaText(lang).ui['lena.shared.1'];
  if (!group.multiple) {
    return <div className="flex flex-wrap gap-2">{group.options.map((suggestion) => {
      const Icon = suggestion.icon;
      return <button key={`${suggestion.value}:${suggestion.label}`} type="button" onClick={() => onSubmit(suggestion.value, suggestion.label)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-primary/20 bg-white px-3 py-1.5 text-xs font-bold text-primary shadow-sm transition-colors hover:border-primary hover:bg-primary hover:text-white dark:bg-slate-900"><Icon className="h-3.5 w-3.5" />{suggestion.label}</button>;
    })}</div>;
  }
  return <div><p className="mb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">{multipleHint}</p><div className="flex flex-wrap gap-2">{group.options.map((suggestion) => {
    const active = selected.includes(suggestion.value);
    const Icon = suggestion.icon;
    if (suggestion.skip) return <button key={`${suggestion.value}:${suggestion.label}`} type="button" onClick={() => onSubmit(suggestion.value, suggestion.label)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-primary/20 bg-white px-3 py-1.5 text-xs font-bold text-primary shadow-sm transition-colors hover:border-primary hover:bg-primary hover:text-white dark:bg-slate-900"><Icon className="h-3.5 w-3.5" />{suggestion.label}</button>;
    return <button key={`${suggestion.value}:${suggestion.label}`} type="button" onClick={() => {
      const next = active
        ? selected.filter((value) => value !== suggestion.value)
        : suggestion.value === group.exclusiveValue
          ? [suggestion.value]
          : [...selected.filter((value) => value !== group.exclusiveValue), suggestion.value];
      setSelected(next);
      onSelectionChange?.(next.join(', '));
    }} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm transition-colors ${active ? 'border-primary bg-primary text-white' : 'border-primary/20 bg-white text-primary hover:border-primary dark:bg-slate-900'}`}><Icon className="h-3.5 w-3.5" />{suggestion.label}</button>;
  })}<button type="button" disabled={selected.length === 0} onClick={() => onSubmit(selected.join(', '), selected.join(', '))} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" />{confirmLabel}</button></div></div>;
};

type UseLenaEmbeddedMessagesOptions = {
  messages: ChatMessage[];
  lang: Language;
  fallbackLoadId?: string;
  onOpenLoad?: (loadId: string) => void;
  onBookLoad?: (loadId?: string) => void | Promise<void>;
  quickActionLabels?: Record<LenaQuickAction, string>;
  onQuickAction?: (action: LenaQuickAction) => void;
  onSuggestedReply?: (value: string, displayText?: string) => void;
  onSuggestedDraftChange?: (value: string) => void;
  onLoadReady?: () => void;
  // Fired for a questionnaire pill click (including "later"/"none"), resolved deterministically -
  // never sent through onSuggestedReply/the AI path, since the value is already known and valid.
  onStepAnswer?: (step: string, value: string, displayText: string) => void;
  preloadedLoads?: Record<string, Record<string, unknown>>;
  // When the plan's LenaAI allowance is spent, the reply is replaced by the out-of-messages card:
  // these drive its renewal date and its two actions.
  outOfTokensResetAt?: string | null;
  // The active plan's own icon/colour (SubscriptionPackage.icon/color) - absent means no plan at
  // all, which the card marks with an exclamation instead.
  outOfTokensPackageIcon?: string | null;
  outOfTokensPackageColor?: string | null;
  onUpgrade?: () => void;
  onTopUp?: () => void;
};

export const useLenaEmbeddedMessages = ({
  messages,
  lang,
  fallbackLoadId,
  onOpenLoad,
  onBookLoad,
  quickActionLabels,
  onQuickAction,
  onSuggestedReply,
  onSuggestedDraftChange,
  onLoadReady,
  onStepAnswer,
  preloadedLoads = EMPTY_PRELOADED_LOADS,
  outOfTokensResetAt,
  outOfTokensPackageIcon,
  outOfTokensPackageColor,
  onUpgrade,
  onTopUp,
}: UseLenaEmbeddedMessagesOptions) => {
  const latestStep = messages.at(-1)?.text.match(LENA_STEP_MARKER_PATTERN)?.[1] ?? null;
  const [warehouseChoices, setWarehouseChoices] = useState<WarehouseChoice[]>([]);

  useEffect(() => {
    if (latestStep !== 'warehouse') return undefined;
    let cancelled = false;
    void api.warehouse.overview().then((response) => {
      if (cancelled) return;
      const rows = Array.isArray(response.data.warehouses) ? response.data.warehouses : [];
      setWarehouseChoices(rows.map((row) => ({ id: String(row.id), name: String(row.name || `#${row.id}`) })));
    }).catch(() => setWarehouseChoices([]));
    return () => { cancelled = true; };
  }, [latestStep]);

  const bookingOffers = useMemo(
    () => new Map(messages.flatMap((message) => {
      const match = message.text.match(BOOKING_MARKER_PATTERN);
      return match ? [[message.id, match[1] ?? null] as const] : [];
    })),
    [messages]
  );

  const loadDetailCards = useMemo(
    () => new Map(messages.flatMap((message) => {
      const match = message.text.match(LOAD_DETAILS_MARKER_PATTERN);
      const detailsLoadId = match?.[1] ?? fallbackLoadId;
      return match && detailsLoadId ? [[message.id, detailsLoadId] as const] : [];
    })),
    [fallbackLoadId, messages]
  );

  const loadLocationCards = useMemo(
    () => new Map(messages.flatMap((message) => {
      const match = message.text.match(LOAD_LOCATION_MARKER_PATTERN);
      const locationLoadId = match?.[1] ?? fallbackLoadId;
      return match && locationLoadId ? [[message.id, locationLoadId] as const] : [];
    })),
    [fallbackLoadId, messages]
  );

  const loadMapCards = useMemo(
    () => new Map(messages.flatMap((message) => {
      const match = message.text.match(LOAD_MAP_MARKER_PATTERN);
      const mapLoadId = match?.[1] ?? fallbackLoadId;
      return match && mapLoadId ? [[message.id, mapLoadId] as const] : [];
    })),
    [fallbackLoadId, messages]
  );

  const loadStatusCards = useMemo(
    () => new Map(messages.flatMap((message) => {
      const match = message.text.match(LOAD_STATUS_MARKER_PATTERN);
      const statusLoadId = match?.[1] ?? fallbackLoadId;
      return match && statusLoadId ? [[message.id, statusLoadId] as const] : [];
    })),
    [fallbackLoadId, messages]
  );

  // The visible message text has its hidden markers removed before ChatConversationPanel renders
  // it. Keep marker-derived UI metadata keyed by message id so pills and ready cards survive that
  // display-only cleanup.
  const quickActionsByMessage = useMemo(
    () => new Map(messages.flatMap((message, index) => {
      const actions = message.text.match(LENA_OPTIONS_PATTERN)?.[1].split(',') as LenaQuickAction[] | undefined;
      const hasUserAnswerAfter = messages.slice(index + 1).some((laterMessage) => laterMessage.sender === 'me');
      return actions?.length && !hasUserAnswerAfter ? [[message.id, actions] as const] : [];
    })),
    [messages]
  );
  const outOfTokensMessageIds = useMemo(
    () => new Set(messages.filter((message) => LENA_OUT_OF_TOKENS_PATTERN.test(message.text)).map((message) => message.id)),
    [messages]
  );
  const loadReadyMessageIds = useMemo(
    () => new Set(messages.filter((message) => LOAD_READY_MARKER.test(message.text)).map((message) => message.id)),
    [messages]
  );
  const questionnaireSuggestionsByMessage = useMemo(() => {
    const latestMessage = messages.at(-1);
    if (!latestMessage || latestMessage.sender !== 'other') return new Map<string, { step: string; group: SuggestedReplyGroup }>();
    const step = latestMessage.text.match(LENA_STEP_MARKER_PATTERN)?.[1];
    const transport = latestLoadScan(messages.flatMap((message) => message.attachments || []))?.transportType || 'road';
    const suggestions = step ? questionnaireSuggestions(step, lang, warehouseChoices, transport) : { options: [] };
    return suggestions.options.length && step
      ? new Map([[latestMessage.id, { step, group: suggestions }]])
      : new Map<string, { step: string; group: SuggestedReplyGroup }>();
  }, [lang, messages, warehouseChoices]);
  // The step LenaAI is currently waiting on, regardless of whether it has pills - drives the chat
  // input's live formatting/unit hint (see lenaStepInputMask.ts) for free-text steps like weight
  // or dimensions, not just the pill-driven ones above.
  const pendingStep = useMemo(() => {
    const latestMessage = messages.at(-1);
    if (!latestMessage || latestMessage.sender !== 'other') return null;
    return latestMessage.text.match(LENA_STEP_MARKER_PATTERN)?.[1] ?? null;
  }, [messages]);
  const locationChoiceByMessage = useMemo(() => {
    const latestMessage = messages.at(-1);
    if (!latestMessage || latestMessage.sender !== 'other') return new Map<string, 'pickup' | 'delivery'>();
    const step = latestMessage.text.match(LENA_STEP_MARKER_PATTERN)?.[1];
    return step === 'pickup' || step === 'delivery'
      ? new Map<string, 'pickup' | 'delivery'>([[latestMessage.id, step]])
      : new Map<string, 'pickup' | 'delivery'>();
  }, [messages]);

  const bookingLoadIds = useMemo(
    () => [...new Set([...bookingOffers.values()]
      .map((loadId) => loadId ?? fallbackLoadId)
      .filter((loadId): loadId is string => Boolean(loadId)))],
    [bookingOffers, fallbackLoadId]
  );

  const embeddedLoadIds = useMemo(
    () => [...new Set([...loadDetailCards.values(), ...loadLocationCards.values(), ...loadMapCards.values(), ...loadStatusCards.values(), ...bookingLoadIds])],
    [bookingLoadIds, loadDetailCards, loadLocationCards, loadMapCards, loadStatusCards]
  );
  const [embeddedLoads, setEmbeddedLoads] = useState<Record<string, Record<string, unknown>>>(preloadedLoads);

  useEffect(() => {
    if (Object.keys(preloadedLoads).length === 0) return;
    setEmbeddedLoads((current) => ({ ...current, ...preloadedLoads }));
  }, [preloadedLoads]);

  const resolvedEmbeddedLoads = useMemo(
    () => ({ ...embeddedLoads, ...preloadedLoads }),
    [embeddedLoads, preloadedLoads],
  );

  // Refetch cards after each assistant reply, even for a previously displayed load.
  const embeddedReplyVersion = JSON.stringify(messages.filter((message) => message.sender === 'other').map((message) => [message.id, message.text]));
  const embeddedIdsVersion = JSON.stringify(embeddedLoadIds);
  useEffect(() => {
    const missingIds = (JSON.parse(embeddedIdsVersion) as string[]).filter((id) => !preloadedLoads[id]);
    if (missingIds.length === 0) return undefined;

    let cancelled = false;
    void Promise.all(missingIds.map(async (id) => [id, (await api.loads.get(id)).data] as const))
      .then((records) => {
        if (!cancelled) setEmbeddedLoads((current) => ({ ...current, ...Object.fromEntries(records) }));
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [embeddedIdsVersion, embeddedReplyVersion, preloadedLoads]);

  const displayMessages = useMemo(() => messages.map((message) => {
    const markerFreeText = message.text
      .replace(BOOKING_MARKER_GLOBAL_PATTERN, '')
      .replace(LOAD_DETAILS_MARKER_GLOBAL_PATTERN, '')
      .replace(LOAD_LOCATION_MARKER_GLOBAL_PATTERN, '')
      .replace(LOAD_MAP_MARKER_GLOBAL_PATTERN, '')
      .replace(LOAD_STATUS_MARKER_GLOBAL_PATTERN, '')
      .replace(LENA_OPTIONS_GLOBAL_PATTERN, '')
      .replace(LOAD_READY_MARKER_GLOBAL, '')
      .replace(LENA_STEP_MARKER_GLOBAL, '')
      .replace(LENA_OUT_OF_TOKENS_GLOBAL, '')
      .replace(LENA_SKIP_MARKER_GLOBAL, lenaText(lang).ui['lena.shared.2'])
      .trim();
    return {
      ...message,
      text: message.sender === 'other' ? removeVisibleMarkdownAsterisks(markerFreeText) : markerFreeText,
    };
  }), [lang, messages]);

  const renderMessageExtra = useCallback((message: ChatMessage) => {
    const detailsLoadId = loadDetailCards.get(message.id);
    const embeddedLoad = detailsLoadId ? resolvedEmbeddedLoads[detailsLoadId] : undefined;
    const locationLoadId = loadLocationCards.get(message.id);
    const locationLoad = locationLoadId ? resolvedEmbeddedLoads[locationLoadId] : undefined;
    const mapLoadId = loadMapCards.get(message.id);
    const mapLoad = mapLoadId ? resolvedEmbeddedLoads[mapLoadId] : undefined;
    const statusLoadId = loadStatusCards.get(message.id);
    const statusLoad = statusLoadId ? resolvedEmbeddedLoads[statusLoadId] : undefined;
    const hasBooking = bookingOffers.has(message.id);
    const markerLoadId = bookingOffers.get(message.id);
    const offeredLoadId = markerLoadId ?? fallbackLoadId;
    const bookingLoad = offeredLoadId ? resolvedEmbeddedLoads[offeredLoadId] : undefined;
    const handleBook = onBookLoad
      ? () => onBookLoad(offeredLoadId)
      : (offeredLoadId && onOpenLoad ? () => onOpenLoad(offeredLoadId) : undefined);

    const quickActions = quickActionsByMessage.get(message.id) || [];
    const suggestedReplies = questionnaireSuggestionsByMessage.get(message.id);
    const locationChoice = locationChoiceByMessage.get(message.id);
    const loadReady = loadReadyMessageIds.has(message.id);
    const outOfTokens = outOfTokensMessageIds.has(message.id);
    if (!embeddedLoad && !locationLoad && !mapLoad && !statusLoad && (!hasBooking || !handleBook) && quickActions.length === 0 && !suggestedReplies && !locationChoice && !loadReady && !outOfTokens) return null;

    // Messages that show a timestamp get its (invisible-until-hover, but still laid out) line as
    // extra breathing room above this block for free; messages without one (e.g. the welcome
    // message, which never carries a time) need a bigger top margin here to land at the same
    // visual distance from the text instead of looking cramped.
    return (
      <div className={`flex w-full max-w-xl flex-col gap-2 ${message.time ? 'mt-2' : 'mt-[27px]'}`}>
        {outOfTokens && <LenaOutOfTokensCard lang={lang} resetAt={outOfTokensResetAt} packageIcon={outOfTokensPackageIcon} packageColor={outOfTokensPackageColor} onUpgrade={onUpgrade} onTopUp={onTopUp} />}
        {embeddedLoad && (
          <LenaLoadDetailsCard
            lang={lang}
            load={embeddedLoad}
            onOpen={detailsLoadId && onOpenLoad ? () => onOpenLoad(detailsLoadId) : undefined}
          />
        )}
        {locationLoad && <LenaLocationCard lang={lang} load={locationLoad} />}
        {mapLoad && <LenaLoadMapCard lang={lang} load={mapLoad} />}
        {statusLoad && <LenaLoadStatusCard lang={lang} load={statusLoad} />}
        {hasBooking && handleBook && <LenaBookingCard lang={lang} load={bookingLoad} onBook={handleBook} />}
        {quickActions.length > 0 && quickActionLabels && onQuickAction && (
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => {
              const Icon = action === 'add' ? FileUp : action === 'storage' ? Warehouse : action === 'tracking' ? MapPinned : action === 'booking' ? ReceiptText : action === 'free' ? MessageCircle : FileSearch;
              return <button key={action} type="button" onClick={() => onQuickAction(action)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-primary/20 bg-white px-3 py-1.5 text-xs font-bold text-primary shadow-sm transition-colors hover:border-primary hover:bg-primary hover:text-white dark:bg-slate-900">
                <Icon className="h-3.5 w-3.5" />{quickActionLabels[action]}
              </button>;
            })}
          </div>
        )}
        {locationChoice && onSuggestedReply && (
          <LenaLocationChoiceCard
            lang={lang}
            kind={locationChoice}
            onSelect={(location) => {
              const prefix = lenaText(lang).location[`${locationChoice}_address`];
              const coordinatesLabel = lenaText(lang).ui['lena.shared.3'];
              const value = `${prefix}: ${location.label}. ${coordinatesLabel}: ${location.latitude}, ${location.longitude}.`;
              onSuggestedReply(value, `${prefix}: ${location.label}`);
            }}
          />
        )}
        {suggestedReplies && onStepAnswer && <QuestionnaireSuggestionPills group={suggestedReplies.group} lang={lang} onSubmit={(value, displayText) => onStepAnswer(suggestedReplies.step, value, displayText ?? value)} onSelectionChange={onSuggestedDraftChange} />}
        {loadReady && (
          <button type="button" onClick={onLoadReady} className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left transition-colors hover:border-emerald-400 dark:border-emerald-900/70 dark:bg-emerald-950/30">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span><span className="block text-xs font-black text-emerald-800 dark:text-emerald-300">{lenaText(lang).ui['lena.shared.4']}</span><span className="block text-[11px] text-emerald-700 dark:text-emerald-400">{lenaText(lang).ui['lena.shared.5']}</span></span></span>
          </button>
        )}
      </div>
    );
  }, [bookingOffers, resolvedEmbeddedLoads, fallbackLoadId, lang, loadDetailCards, loadLocationCards, loadMapCards, loadReadyMessageIds, loadStatusCards, locationChoiceByMessage, onBookLoad, onLoadReady, onOpenLoad, onQuickAction, onStepAnswer, onSuggestedDraftChange, onSuggestedReply, onTopUp, onUpgrade, outOfTokensMessageIds, outOfTokensPackageColor, outOfTokensPackageIcon, outOfTokensResetAt, questionnaireSuggestionsByMessage, quickActionLabels, quickActionsByMessage]);

  const extraContentVersion = `${embeddedLoadIds.join(',')}:${Object.keys(resolvedEmbeddedLoads).sort().join(',')}:${[...quickActionsByMessage.keys()].join(',')}:${[...questionnaireSuggestionsByMessage.keys()].join(',')}:${[...locationChoiceByMessage.keys()].join(',')}:${[...loadReadyMessageIds].join(',')}:${[...outOfTokensMessageIds].join(',')}`;

  // Lock typing only when the current step has a real selectable answer. Free-text steps also
  // render a lone "choose later" escape pill, but that skip action must never make weight,
  // dimensions, budget, etc. look like option-only questions. Pickup/delivery remain locked while
  // their dedicated location picker is active.
  const pendingStepHasOptions = [...questionnaireSuggestionsByMessage.values()]
    .some(({ group }) => group.options.some((option) => !option.skip))
    || locationChoiceByMessage.size > 0;

  return { displayMessages, renderMessageExtra, extraContentVersion, pendingStep, pendingStepHasOptions };
};
