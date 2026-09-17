import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
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
  'open' | 'onClose' | 'registerNotify'
>;

type LenaCallContextValue = {
  /** True from the moment a call is placed until it is hung up. */
  active: boolean;
  activeConversationId?: number;
  startCall: (request: LenaCallRequest) => void;
  /** Tells a live call what the caller just did on screen, so she can react to it aloud. */
  notifyUserAction: (kind: 'click' | 'text', label: string) => void;
  endCall: () => void;
};

const LenaCallContext = createContext<LenaCallContextValue | null>(null);

export const LenaCallProvider = ({ children }: { children: ReactNode }) => {
  const [request, setRequest] = useState<LenaCallRequest | null>(null);
  // Filled by the overlay while a call is up, so views can reach the live session without the
  // provider having to own the connection itself.
  const notifyRef = useRef<((kind: 'click' | 'text', label: string) => void) | null>(null);

  const startCall = useCallback((next: LenaCallRequest) => setRequest(next), []);
  const endCall = useCallback(() => { notifyRef.current = null; setRequest(null); }, []);

  const notifyUserAction = useCallback((kind: 'click' | 'text', label: string) => {
    notifyRef.current?.(kind, label);
  }, []);

  const value = useMemo<LenaCallContextValue>(() => ({
    active: request !== null,
    activeConversationId: request?.conversationId,
    startCall,
    notifyUserAction,
    endCall,
  }), [endCall, notifyUserAction, request, startCall]);

  return (
    <LenaCallContext.Provider value={value}>
      {children}
      {request && (
        <LenaCallOverlay
          {...request}
          open
          registerNotify={(notify) => { notifyRef.current = notify; }}
          onClose={endCall}
        />
      )}
    </LenaCallContext.Provider>
  );
};

/** Null outside the provider, so a view can degrade rather than crash if it is mounted alone. */
export const useLenaCall = (): LenaCallContextValue | null => useContext(LenaCallContext);
