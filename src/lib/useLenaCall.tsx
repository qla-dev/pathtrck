import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { LenaCallOverlay } from '../components/lena/LenaCallOverlay';

/**
 * Keeps one live call alive for as long as it is up, wherever the caller navigates.
 *
 * A call is a WebRTC peer connection, a microphone track and a data channel, all held in refs
 * inside LenaCallOverlay's hook. A view that renders the overlay therefore owns the call, and
 * navigating away unmounts the view and hangs up mid-sentence. So the overlay is mounted once
 * here, above everything that can be navigated between, and views only ask for a call rather
 * than hosting one.
 */

/** Everything a view knows about the call it wants, which the provider then holds for its life. */
export type LenaCallRequest = Omit<
  Parameters<typeof LenaCallOverlay>[0],
  'open' | 'onClose'
>;

type LenaCallContextValue = {
  /** True from the moment a call is placed until it is hung up. */
  active: boolean;
  activeConversationId?: number;
  startCall: (request: LenaCallRequest) => void;
  endCall: () => void;
};

const LenaCallContext = createContext<LenaCallContextValue | null>(null);

export const LenaCallProvider = ({ children }: { children: ReactNode }) => {
  const [request, setRequest] = useState<LenaCallRequest | null>(null);

  const startCall = useCallback((next: LenaCallRequest) => setRequest(next), []);
  const endCall = useCallback(() => setRequest(null), []);

  const value = useMemo<LenaCallContextValue>(() => ({
    active: request !== null,
    activeConversationId: request?.conversationId,
    startCall,
    endCall,
  }), [endCall, request, startCall]);

  return (
    <LenaCallContext.Provider value={value}>
      {children}
      {request && <LenaCallOverlay {...request} open onClose={endCall} />}
    </LenaCallContext.Provider>
  );
};

/** Null outside the provider, so a view can degrade rather than crash if it is mounted alone. */
export const useLenaCall = (): LenaCallContextValue | null => useContext(LenaCallContext);
