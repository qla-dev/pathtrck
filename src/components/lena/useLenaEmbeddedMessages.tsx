import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileSearch, FileUp, MapPinned, ReceiptText } from 'lucide-react';

import { api } from '../../services/api';
import { Language } from '../../types';
import { ChatMessage } from '../chat/types';
import { LenaBookingCard, LenaLoadDetailsCard, LenaLoadMapCard, LenaLoadStatusCard, LenaLocationCard } from './LenaEmbeddedCards';
import { LenaQuickAction } from '../../lib/useLenaAiChat';

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
const LOAD_READY_MARKER = /\[\[LOAD_READY_TO_POST\]\]/;
const LOAD_READY_MARKER_GLOBAL = /\[\[LOAD_READY_TO_POST\]\]/g;

type UseLenaEmbeddedMessagesOptions = {
  messages: ChatMessage[];
  lang: Language;
  fallbackLoadId?: string;
  onOpenLoad?: (loadId: string) => void;
  onBookLoad?: (loadId?: string) => void | Promise<void>;
  quickActionLabels?: Record<LenaQuickAction, string>;
  onQuickAction?: (action: LenaQuickAction) => void;
  onLoadReady?: () => void;
};

export const useLenaEmbeddedMessages = ({
  messages,
  lang,
  fallbackLoadId,
  onOpenLoad,
  onBookLoad,
  quickActionLabels,
  onQuickAction,
  onLoadReady,
}: UseLenaEmbeddedMessagesOptions) => {
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
  const [embeddedLoads, setEmbeddedLoads] = useState<Record<string, Record<string, unknown>>>({});

  useEffect(() => {
    const missingIds = embeddedLoadIds.filter((id) => !embeddedLoads[id]);
    if (missingIds.length === 0) return undefined;

    let cancelled = false;
    void Promise.all(missingIds.map(async (id) => [id, (await api.loads.get(id)).data] as const))
      .then((records) => {
        if (!cancelled) setEmbeddedLoads((current) => ({ ...current, ...Object.fromEntries(records) }));
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [embeddedLoadIds, embeddedLoads]);

  const displayMessages = useMemo(() => messages.map((message) => ({
    ...message,
    text: message.text
      .replace(BOOKING_MARKER_GLOBAL_PATTERN, '')
      .replace(LOAD_DETAILS_MARKER_GLOBAL_PATTERN, '')
      .replace(LOAD_LOCATION_MARKER_GLOBAL_PATTERN, '')
      .replace(LOAD_MAP_MARKER_GLOBAL_PATTERN, '')
      .replace(LOAD_STATUS_MARKER_GLOBAL_PATTERN, '')
      .replace(LENA_OPTIONS_GLOBAL_PATTERN, '')
      .replace(LOAD_READY_MARKER_GLOBAL, '')
      .trim(),
  })), [messages]);

  const renderMessageExtra = useCallback((message: ChatMessage) => {
    const detailsLoadId = loadDetailCards.get(message.id);
    const embeddedLoad = detailsLoadId ? embeddedLoads[detailsLoadId] : undefined;
    const locationLoadId = loadLocationCards.get(message.id);
    const locationLoad = locationLoadId ? embeddedLoads[locationLoadId] : undefined;
    const mapLoadId = loadMapCards.get(message.id);
    const mapLoad = mapLoadId ? embeddedLoads[mapLoadId] : undefined;
    const statusLoadId = loadStatusCards.get(message.id);
    const statusLoad = statusLoadId ? embeddedLoads[statusLoadId] : undefined;
    const hasBooking = bookingOffers.has(message.id);
    const markerLoadId = bookingOffers.get(message.id);
    const offeredLoadId = markerLoadId ?? fallbackLoadId;
    const bookingLoad = offeredLoadId ? embeddedLoads[offeredLoadId] : undefined;
    const handleBook = onBookLoad
      ? () => onBookLoad(offeredLoadId)
      : (offeredLoadId && onOpenLoad ? () => onOpenLoad(offeredLoadId) : undefined);

    const quickActions = (message.text.match(LENA_OPTIONS_PATTERN)?.[1].split(',') || []) as LenaQuickAction[];
    const loadReady = LOAD_READY_MARKER.test(message.text);
    if (!embeddedLoad && !locationLoad && !mapLoad && !statusLoad && (!hasBooking || !handleBook) && quickActions.length === 0 && !loadReady) return null;

    return (
      <div className="mt-2 flex w-full max-w-xl flex-col gap-2">
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
          <div className="flex flex-wrap gap-2 pt-1">
            {quickActions.map((action) => {
              const Icon = action === 'add' ? FileUp : action === 'tracking' ? MapPinned : action === 'booking' ? ReceiptText : FileSearch;
              return <button key={action} type="button" onClick={() => onQuickAction(action)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-primary/20 bg-white px-3 py-1.5 text-xs font-bold text-primary shadow-sm transition-colors hover:border-primary hover:bg-primary hover:text-white dark:bg-slate-900">
                <Icon className="h-3.5 w-3.5" />{quickActionLabels[action]}
              </button>;
            })}
          </div>
        )}
        {loadReady && (
          <button type="button" onClick={onLoadReady} className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left transition-colors hover:border-emerald-400 dark:border-emerald-900/70 dark:bg-emerald-950/30">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span><span className="block text-xs font-black text-emerald-800 dark:text-emerald-300">{lang === 'bs' ? 'Teret je spreman za objavu' : lang === 'de' ? 'Ladung ist zur Veröffentlichung bereit' : 'Load is ready to post'}</span><span className="block text-[11px] text-emerald-700 dark:text-emerald-400">{lang === 'bs' ? 'Otvori pregled i objavi teret.' : lang === 'de' ? 'Öffnen Sie die Prüfung und veröffentlichen Sie die Ladung.' : 'Open the review and post the load.'}</span></span></span>
          </button>
        )}
      </div>
    );
  }, [bookingOffers, embeddedLoads, fallbackLoadId, lang, loadDetailCards, loadLocationCards, loadMapCards, loadStatusCards, onBookLoad, onOpenLoad]);

  const extraContentVersion = `${embeddedLoadIds.join(',')}:${Object.keys(embeddedLoads).sort().join(',')}`;

  return { displayMessages, renderMessageExtra, extraContentVersion };
};
