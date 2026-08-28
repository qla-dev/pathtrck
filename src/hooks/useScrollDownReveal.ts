import { useEffect, useRef } from 'react';
import { useAnimation, useInView } from 'motion/react';

type Direction = 'up' | 'down';

let listenerCount = 0;
let lastY = 0;
const directionRef = { current: 'down' as Direction };

const handleScroll = () => {
  const y = window.scrollY;
  if (y > lastY + 2) directionRef.current = 'down';
  else if (y < lastY - 2) directionRef.current = 'up';
  lastY = y;
};

const useGlobalScrollDirection = () => {
  useEffect(() => {
    if (listenerCount === 0) {
      lastY = window.scrollY;
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
    listenerCount += 1;
    return () => {
      listenerCount -= 1;
      if (listenerCount === 0) window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  return directionRef;
};

/**
 * Plays the enter animation only when the element scrolls into view while
 * scrolling down. Scrolling back up snaps it straight to the visible state
 * (no replay). It resets only after an upward scroll moves the element fully
 * below the viewport, so the next downward pass can animate again without
 * hiding content that is still visible.
 */
export const useScrollDownReveal = (hidden: string | object, visible: string | object, amount = 0.3) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const hasRevealed = useRef(false);
  const controls = useAnimation();
  const direction = useGlobalScrollDirection();
  const reachedRevealThreshold = useInView(ref, { amount, once: false });
  const isInViewport = useInView(ref, { amount: 'some', once: false });

  useEffect(() => {
    if (reachedRevealThreshold) {
      hasRevealed.current = true;
      if (direction.current === 'up') controls.set(visible as never);
      else controls.start(visible as never);

      return;
    }

    // Keep revealed content visible while it is leaving through the top or is
    // still partially on screen. Reset only once an upward scroll has moved
    // the whole element below the viewport, ready for the next downward pass.
    if (hasRevealed.current && !isInViewport && direction.current === 'up') {
      hasRevealed.current = false;
      controls.set(hidden as never);
    }
  }, [reachedRevealThreshold, isInViewport]);

  return { ref, controls };
};
