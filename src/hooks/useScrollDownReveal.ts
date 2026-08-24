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
 * (no replay), and leaving the viewport resets it so the next downward pass
 * animates again.
 */
export const useScrollDownReveal = (hidden: string | object, visible: string | object, amount = 0.3) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const controls = useAnimation();
  const direction = useGlobalScrollDirection();
  const inView = useInView(ref, { amount, once: false });

  useEffect(() => {
    if (inView) {
      if (direction.current === 'up') controls.set(visible as never);
      else controls.start(visible as never);
    } else {
      controls.set(hidden as never);
    }
  }, [inView]);

  return { ref, controls };
};
