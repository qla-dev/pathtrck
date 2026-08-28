import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Layers3, X } from 'lucide-react';
import type { HsCodeMatch } from '../../services/api';
import { ui } from '../../i18n';
import type { Language } from '../../types';
import { hsSectionIcon } from '../modals/scanFieldRows';

type HsCodeChipProps = {
  item: HsCodeMatch;
  lang?: Language;
  onRemove?: () => void;
  removeTitle?: string;
};

type TooltipPosition = {
  left: number;
  top: number;
  placement: 'above' | 'below';
};

export const HsCodeChip = ({ item, lang, onRemove, removeTitle = 'Remove HS code' }: HsCodeChipProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const chipRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const SectionIcon = hsSectionIcon(item.chapterCode);
  const category = item.chapterName || item.headingName || item.section || '';
  const parentCategory = item.section && item.section !== category ? item.section : '';
  const hasTooltip = Boolean(item.description || category || parentCategory);

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

  const toggleTooltip = () => {
    if (tooltipPosition) {
      setTooltipPosition(null);
      return;
    }
    showTooltip();
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
        onClick={toggleTooltip}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleTooltip();
          }
        }}
        role={hasTooltip ? 'button' : undefined}
        tabIndex={hasTooltip ? 0 : undefined}
        className="inline-flex max-w-[240px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary outline-none transition-all hover:-translate-y-px hover:border-primary/45 hover:bg-primary/15 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <SectionIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {item.code}
          {category && <span className="font-normal opacity-75"> · {category}</span>}
        </span>
        {onRemove && (
          <button type="button" onClick={(event) => { event.stopPropagation(); onRemove(); }} title={removeTitle} className="shrink-0 cursor-pointer rounded-sm hover:bg-primary/15">
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
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-400/15 text-sky-300">
              <SectionIcon className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-[10px] font-black uppercase tracking-wider text-sky-300">HS {item.code}</span>
              <span className="mt-0.5 block text-[10px] font-medium text-slate-400">{u('hsChip.classification', 'Customs tariff classification')}</span>
            </span>
          </span>
          {item.description && <span className="mt-2 block text-xs font-bold leading-5 text-white">{item.description}</span>}
          {(category || parentCategory) && <span className="my-2.5 block h-px bg-white/10" />}
          {parentCategory && (
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-400/15 text-violet-300">
                <Layers3 className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">{u('hsChip.parent', 'Parent section')}</span>
                <span className="block text-[11px] font-semibold leading-4 text-slate-200">{parentCategory}</span>
              </span>
            </span>
          )}
          {category && (
            <span className="mt-2 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-400/15 text-sky-300">
                <SectionIcon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">{u('hsChip.category', 'Category')}</span>
                <span className="block text-[11px] font-semibold leading-4 text-slate-200">{category}</span>
              </span>
            </span>
          )}
        </span>,
        document.body
      )}
    </>
  );
};
