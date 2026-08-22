import { useEffect } from 'react';
import type { RefObject } from 'react';

export const useOutsideClick = (
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  active: boolean
) => {
  useEffect(() => {
    if (!active) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutside();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [ref, onOutside, active]);
};
