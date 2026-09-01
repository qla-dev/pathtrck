import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../../lib/cn';

const PANEL_WIDTH = 300;
const PANEL_GAP = 6;
const VIEWPORT_MARGIN = 12;

/**
 * A ToggleCard for the handful of options that need extra data once they are picked (DG / IMO wants
 * a UN number and IMO class, OOG wants its dimensions). Those fields used to expand underneath the
 * whole card, pushing everything else down and leaving the reader to work out which option they
 * belonged to. Here they live in a popover anchored to the option itself - same shape as the
 * tracking filter panels - and what was entered reads back from the card's top-right corner.
 *
 * The popover renders through a portal because the step body clips horizontally
 * (`overflow-x-hidden`), which would cut an absolutely positioned panel off at the column edge.
 */
export const DetailToggleCard = ({
  active,
  title,
  description,
  icon: Icon,
  summary,
  emptyHint,
  clearLabel,
  onToggle,
  onClear,
  children,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: LucideIcon;
  /** What was filled in, shown small in the card's top-right corner. Empty renders `emptyHint`. */
  summary: string;
  emptyHint: string;
  /** Omitted when the panel only shows things (a document list), rather than fields to reset. */
  clearLabel?: string;
  onToggle: () => void;
  onClear?: () => void;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState({ left: 0, top: 0, width: PANEL_WIDTH });

  const place = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
    setPanel({
      left: Math.min(Math.max(VIEWPORT_MARGIN, rect.left), window.innerWidth - width - VIEWPORT_MARGIN),
      top: rect.bottom + PANEL_GAP,
      width,
    });
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!anchorRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    // The step body scrolls, so the panel has to follow its anchor rather than sit where it opened.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  // Deselecting an option should not leave its panel hanging over the grid.
  useEffect(() => {
    if (!active) setOpen(false);
  }, [active]);

  return (
    <div ref={anchorRef} className="relative">
      <button
        type="button"
        onClick={() => {
          // Picking the option asks for its details straight away; picking it again clears both.
          if (!active) setOpen(true);
          onToggle();
        }}
        className={cn(
          'flex w-full cursor-pointer flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all',
          active
            ? 'border-primary bg-primary/5 shadow-sm'
            : 'border-slate-200 bg-white hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950',
        )}
      >
        <Icon className={cn('mb-1.5 h-4 w-4', active ? 'text-primary' : 'text-slate-400')} />
        <p className="w-full truncate text-xs font-bold dark:text-white" title={title}>{title}</p>
        <p className="w-full truncate text-[11px] leading-tight text-slate-500" title={description}>{description}</p>
      </button>

      {active && (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          title={summary || emptyHint}
          className={cn(
            'absolute right-2 top-2 max-w-[58%] cursor-pointer truncate text-[10px] font-bold leading-tight underline',
            summary ? 'text-primary' : 'text-amber-600 dark:text-amber-400',
          )}
        >
          {summary || emptyHint}
        </button>
      )}

      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[240] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          style={{ left: panel.left, top: panel.top, width: panel.width }}
        >
          <div className="flex items-center justify-between gap-2 px-1.5 pb-2 pt-1">
            <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{title}</span>
            </span>
            {onClear && clearLabel && (
              <button
                type="button"
                onClick={onClear}
                className="shrink-0 cursor-pointer text-[10px] font-bold text-primary underline"
              >
                {clearLabel}
              </button>
            )}
          </div>
          <div className="px-1.5 pb-1.5">{children}</div>
        </div>,
        document.body,
      )}
    </div>
  );
};
