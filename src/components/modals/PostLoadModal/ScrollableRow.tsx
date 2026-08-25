import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/cn';

// Wraps a horizontally-scrolling pill/card row (Shipment type, Characteristics & certificates,
// ...) with left/right nav buttons that appear only when there's more content to reveal in that
// direction, so every such row in the app navigates the same way instead of relying purely on
// drag/wheel scrolling. Buttons are absolutely positioned and pushed out past the row's own edge
// (into the surrounding card's padding, toward its border) so they never sit on top of a pill.
export const ScrollableRow = ({ children, className }: { children: ReactNode; className?: string }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateEdges = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateEdges();
    const el = scrollRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', updateEdges, { passive: true });
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      observer.disconnect();
    };
  }, [children]);

  // Steps by exactly one item's edge-to-edge position rather than a fraction of the container
  // width, so uneven pill widths (e.g. "AWB Required" vs "Track & Trace Required") each still take
  // exactly one press to reach.
  const scrollByStep = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>(':scope > * > *'));
    if (items.length === 0) {
      el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
      return;
    }
    const elLeft = el.getBoundingClientRect().left;
    const positions = items.map((item) => item.getBoundingClientRect().left - elLeft + el.scrollLeft);
    const current = el.scrollLeft;
    let target = current;
    if (direction === 1) {
      const next = positions.find((pos) => pos > current + 4);
      target = next !== undefined ? next : el.scrollWidth;
    } else {
      const previous = [...positions].reverse().find((pos) => pos < current - 4);
      target = previous !== undefined ? previous : 0;
    }
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByStep(-1)}
          aria-label="Scroll left"
          className="absolute -left-[1.05rem] top-1/2 z-10 flex h-7 w-7 -translate-y-[calc(50%+4px)] cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <div
        ref={scrollRef}
        className={cn('overflow-x-auto [scroll-padding-inline:0.25rem] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory', className)}
      >
        {children}
      </div>
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByStep(1)}
          aria-label="Scroll right"
          className="absolute -right-[1.05rem] top-1/2 z-10 flex h-7 w-7 -translate-y-[calc(50%+4px)] cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
