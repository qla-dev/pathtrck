export type BidState = {
  myOffer: Record<string, unknown> | null;
  highestBidAmount: number | null;
  displayAmount: number | null;
};

export const getBidState = (
  offers: Array<Record<string, unknown>> | undefined,
  userId: number | undefined,
  fallbackAmount: number | undefined | null
): BidState => {
  const list = offers || [];
  const myOffer = list.find((offer) =>
    userId != null && (Number(offer.driver_user_id) === userId || Number(offer.created_by_user_id) === userId)) || null;
  const activeOffers = list.filter((offer) => String(offer.status || '').toLowerCase() !== 'rejected');
  const highestBidAmount = activeOffers.length
    ? Math.max(...activeOffers.map((offer) => Number(offer.amount) || 0))
    : null;
  const displayAmount = highestBidAmount != null
    ? highestBidAmount
    : (fallbackAmount && fallbackAmount > 0 ? fallbackAmount : null);

  return { myOffer, highestBidAmount, displayAmount };
};

export const getOfferLabel = (
  u: (key: string, fallback: string) => string,
  bidState: BidState,
  currency: string
) => {
  const base = bidState.myOffer
    ? u('legacy.loadDetails.changeOffer', 'Change offer')
    : u('legacy.loadDetails.negotiateTerms', 'Make offer');

  return bidState.displayAmount != null ? `${base} · ${currency} ${bidState.displayAmount.toLocaleString()}` : base;
};
