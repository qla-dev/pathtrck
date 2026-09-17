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
 *
 * Minimising is the reason this matters: it swaps the overlay's own rendering between full
 * screen and a corner bar, which is a render, not an unmount - the call does not notice.
 */

/** Everything a view knows about the call it wants, which the provider then holds for its life. */
export type LenaCallRequest = Omit<
  Parameters<typeof LenaCallOverlay>[0],
  'open' | 'onClose' | 'minimised' | 'onMinimise' | 'onRestore'
>;

type LenaCallContextValue = {
  /** True from the moment a call is placed until it is hung up, minimised or not. */
  active: boolean;
  activeConversationId?: number;
  startCall: (request: LenaCallRequest) => void;
  endCall: () => void;
};

const LenaCallContext = createContext<LenaCallContextValue | null>(null);

export const LenaCallProvider = ({ children }: { children: ReactNode }) => {
  const [request, setRequest] = useState<LenaCallRequest | null>(null);
  const [minimised, setMinimised] = useState(false);

  const startCall = useCallback((next: LenaCallRequest) => {
    setMinimised(false);
    setRequest(next);
  }, []);

  const endCall = useCallback(() => {
    setRequest(null);
    setMinimised(false);
  }, []);

  const value = useMemo<LenaCallContextValue>(() => ({
    active: request !== null,
    activeConversationId: request?.conversationId,
    startCall,
    endCall,
  }), [endCall, request, startCall]);

  return (
    <LenaCallContext.Provider value={value}>
      {children}
      {request && (
        <LenaCallOverlay
          {...request}
          open
          minimised={minimised}
          onMinimise={() => setMinimised(true)}
          onRestore={() => setMinimised(false)}
          onOpenDraftPanel={request.onOpenDraftPanel && (() => {
            // Opening the panel is only useful if the caller can see it, so this doubles as
            // "minimise": the call carries on in the corner over the draft it is filling in.
            request.onOpenDraftPanel?.();
            setMinimised(true);
          })}
          onClose={endCall}
        />
      )}
    </LenaCallContext.Provider>
  );
};

/** Null outside the provider, so a view can degrade rather than crash if it is mounted alone. */
export const useLenaCall = (): LenaCallContextValue | null => useContext(LenaCallContext);
