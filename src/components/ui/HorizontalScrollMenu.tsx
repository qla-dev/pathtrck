import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '../../lib/cn';

type HorizontalScrollMenuProps = {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
};

export const HorizontalScrollMenu = ({ children, ariaLabel, className }: HorizontalScrollMenuProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: true, right: false });

  const updateEdges = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    setEdges({
      left: element.scrollLeft <= 1,
      right: element.scrollLeft + element.clientWidth >= element.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [children, updateEdges]);

  const scrollBy = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: direction * 320, behavior: 'smooth' });
  };

  return (
    <div className={cn('group/scroll relative min-w-0', className)}>
      <div
        ref={scrollRef}
        role="region"
        aria-label={ariaLabel}
        onScroll={updateEdges}
        className="flex gap-2 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        aria-label="Scroll left"
        disabled={edges.left}
        onClick={() => scrollBy(-1)}
        className="absolute -left-9 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        disabled={edges.right}
        onClick={() => scrollBy(1)}
        className="absolute -right-9 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};
