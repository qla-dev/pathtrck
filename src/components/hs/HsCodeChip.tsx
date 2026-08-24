import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { HsCodeMatch } from '../../services/api';
import { hsSectionIcon } from '../modals/scanFieldRows';

type HsCodeChipProps = {
  item: HsCodeMatch;
  onRemove?: () => void;
  removeTitle?: string;
};

type TooltipPosition = {
  left: number;
  top: number;
  placement: 'above' | 'below';
};

export const HsCodeChip = ({ item, onRemove, removeTitle = 'Remove HS code' }: HsCodeChipProps) => {
  const chipRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const SectionIcon = hsSectionIcon(item.chapterCode);
  const category = item.headingName || item.chapterName;
  const parentCategory = item.chapterName && item.chapterName !== category ? item.chapterName : '';
  const hasTooltip = Boolean(item.description || category);

  const showTooltip = () => {
    if (!hasTooltip || !chipRef.current) return;
    const rect = chipRef.current.getBoundingClientRect();
    const halfWidth = 144;
    const viewportPadding = 12;
    const placement = rect.top >= 150 ? 'above' : 'below';

    setTooltipPosition({
      left: Math.min(window.innerWidth - halfWidth - viewportPadding, Math.max(halfWidth + viewportPadding, rect.left + rect.width / 2)),
      top: placement === 'above' ? rect.top - 8 : rect.bottom + 8,
      placement,
    });
  };

  return (
    <>
      <span
        ref={chipRef}
        aria-describedby={hasTooltip ? tooltipId : undefined}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltipPosition(null)}
        onFocus={showTooltip}
        onBlur={() => setTooltipPosition(null)}
        tabIndex={hasTooltip ? 0 : undefined}
        className="inline-flex max-w-[240px] shrink-0 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <SectionIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {item.code}
          {category && <span className="font-normal opacity-75"> · {category}</span>}
        </span>
        {onRemove && (
          <button type="button" onClick={onRemove} title={removeTitle} className="shrink-0 cursor-pointer">
            <X className="h-3 w-3" />
          </button>
        )}
      </span>

      {tooltipPosition && createPortal(
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none fixed z-[500] w-72 rounded-xl bg-slate-950 px-3 py-2.5 text-left text-white shadow-xl dark:border dark:border-slate-700 dark:bg-slate-800"
          style={{
            left: tooltipPosition.left,
            top: tooltipPosition.top,
            transform: tooltipPosition.placement === 'above' ? 'translate(-50%, -100%)' : 'translateX(-50%)',
          }}
        >
          {tooltipPosition.placement === 'above' ? (
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-950 dark:border-t-slate-800" />
          ) : (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-950 dark:border-b-slate-800" />
          )}
          <span className="block text-[10px] font-black uppercase tracking-wider text-sky-300">HS {item.code}</span>
          {item.description && <span className="mt-1 block text-xs font-semibold leading-5">{item.description}</span>}
          {category && category !== item.description && <span className="mt-1 block text-[11px] font-medium leading-4 text-slate-300">{category}</span>}
          {parentCategory && <span className="mt-0.5 block text-[10px] leading-4 text-slate-400">{parentCategory}</span>}
        </span>,
        document.body
      )}
    </>
  );
};
