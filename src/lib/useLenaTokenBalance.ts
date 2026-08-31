import { useEffect, useState } from 'react';

import { ChatMessage } from '../components/chat/types';
import { api } from '../services/api';

// Stands in for an AI reply once the user's plan has no LenaAI messages left - rendered as the
// out-of-messages card (see LenaOutOfTokensCard.tsx) instead of message text.
export const LENA_OUT_OF_TOKENS_MARKER = '[[LENA_OUT_OF_TOKENS]]';

// Blocked turns are never stored server-side, so they live only in the view that produced them;
// the conversation id keeps them from leaking into a different thread the user switches to.
type BlockedMessage = ChatMessage & { conversationId?: string };

type UseLenaTokenBalanceOptions = {
  userId?: number;
  // False while the chat this guards is closed - the plan's remaining-message count is re-read
  // every time it opens, so a top-up made elsewhere unblocks LenaAI without a page reload.
  active?: boolean;
};

// The single gate in front of every LenaAI entry point (the standalone overlay and the Messages
// view). No plan means no allowance at all, exactly like a plan drained to zero - both block the
// AI. Only God Mode roles, which report `unlimited` and carry no subscription row, are never
// blocked.
export const useLenaTokenBalance = ({ userId, active = true }: UseLenaTokenBalanceOptions) => {
  const [balance, setBalance] = useState<{ unlimited: boolean; remaining: number; resetAt: string | null; packageIcon: string | null; packageColor: string | null } | null>(null);
  const [blockedMessages, setBlockedMessages] = useState<BlockedMessage[]>([]);

  useEffect(() => {
    if (!userId || !active) return undefined;
    let cancelled = false;
    setBlockedMessages([]);
    void api.subscriptions.mine()
      .then((response) => {
        if (cancelled) return;
        const data = (response.data || null) as Record<string, unknown> | null;
        const subscriptionPackage = (data?.subscription_package || null) as Record<string, unknown> | null;
        setBalance({
          unlimited: Boolean(response.meta?.unlimited),
          remaining: Number(data?.remaining_tokens ?? 0),
          resetAt: data?.expires_at ? String(data.expires_at) : null,
          packageIcon: subscriptionPackage?.icon ? String(subscriptionPackage.icon) : null,
          packageColor: subscriptionPackage?.color ? String(subscriptionPackage.color) : null,
        });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [active, userId]);

  const outOfTokens = Boolean(balance && !balance.unlimited && balance.remaining <= 0);

  // Out of messages: the user's turn still shows up in the thread, but nothing is stored and no AI
  // call is made - LenaAI "answers" with the out-of-messages card instead.
  const denyOutOfTokens = (displayText: string, conversationId?: string) => {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setBlockedMessages((messages) => [
      ...messages,
      ...(displayText.trim()
        ? [{ id: `blocked-me-${stamp}`, conversationId, sender: 'me' as const, text: displayText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) }]
        : []),
      { id: `blocked-lena-${stamp}`, conversationId, sender: 'other' as const, text: LENA_OUT_OF_TOKENS_MARKER, time: '' },
    ]);
  };

  const blockedMessagesFor = (conversationId?: string): ChatMessage[] =>
    blockedMessages.filter((message) => !message.conversationId || message.conversationId === conversationId);

  return {
    outOfTokens,
    tokenResetAt: balance?.resetAt ?? null,
    tokenPackageIcon: balance?.packageIcon ?? null,
    tokenPackageColor: balance?.packageColor ?? null,
    blockedMessages,
    blockedMessagesFor,
    denyOutOfTokens,
    clearBlockedMessages: () => setBlockedMessages([]),
  };
};
