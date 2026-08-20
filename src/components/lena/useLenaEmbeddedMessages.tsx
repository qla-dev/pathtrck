import { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '../../services/api';
import { Language } from '../../types';
import { ChatMessage } from '../chat/types';
import { LenaBookingCard, LenaLoadDetailsCard, LenaLoadMapCard, LenaLoadStatusCard, LenaLocationCard } from './LenaEmbeddedCards';

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

type UseLenaEmbeddedMessagesOptions = {
  messages: ChatMessage[];
  lang: Language;
  fallbackLoadId?: string;
  onOpenLoad?: (loadId: string) => void;
  onBookLoad?: () => void | Promise<void>;
};

export const useLenaEmbeddedMessages = ({
  messages,
  lang,
  fallbackLoadId,
  onOpenLoad,
  onBookLoad,
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
    const handleBook = markerLoadId && onOpenLoad
      ? () => onOpenLoad(markerLoadId)
      : onBookLoad ?? (offeredLoadId && onOpenLoad ? () => onOpenLoad(offeredLoadId) : undefined);

    if (!embeddedLoad && !locationLoad && !mapLoad && !statusLoad && (!hasBooking || !handleBook)) return null;

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
      </div>
    );
  }, [bookingOffers, embeddedLoads, fallbackLoadId, lang, loadDetailCards, loadLocationCards, loadMapCards, loadStatusCards, onBookLoad, onOpenLoad]);

  const extraContentVersion = `${embeddedLoadIds.join(',')}:${Object.keys(embeddedLoads).sort().join(',')}`;

  return { displayMessages, renderMessageExtra, extraContentVersion };
};
