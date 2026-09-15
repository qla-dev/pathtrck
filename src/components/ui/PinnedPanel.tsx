import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronUp, X, type LucideIcon } from 'lucide-react';

import { cn } from '../../lib/cn';

type PinnedPanelProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  /** Without it the panel has no close button and stays pinned; it can only collapse. */
  onClose?: () => void;
  closeLabel?: string;
  collapseLabel: string;
  expandLabel: string;
  /** Extra header controls, e.g. switching to a sibling panel while this one covers the page header. */
  actions?: ReactNode;
  /** Pinned under the header, outside the scrolling body - tabs, filters. */
  toolbar?: ReactNode;
  /** Pinned to the bottom, outside the scrolling body - primary actions. */
  footer?: ReactNode;
  /** Start as the collapsed bar instead of full height. */
  defaultCollapsed?: boolean;
  /** Title shown on the collapsed bar, e.g. a call to action; the full title returns once expanded. */
  collapsedTitle?: string;
  /** Changing this number collapses the panel, e.g. to reveal an animation on the page behind it. */
  collapseSignal?: number;
  /** Shown on the first expand while the panel grows; the real contents mount once it has finished. */
  placeholder?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};

const shellButton = 'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';

/**
 * The pinned right-hand sidebar shell from LenaAI's pinned mode (same width, height, collapse and
 * close controls), for page tools that stay open beside the page instead of covering it.
 */
export const PinnedPanel = ({ open, title, subtitle, icon: Icon, onClose, closeLabel, collapseLabel, expandLabel, actions, toolbar, footer, defaultCollapsed = false, collapsedTitle, collapseSignal, placeholder, className, contentClassName, children }: PinnedPanelProps) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  useEffect(() => { if (collapseSignal) setCollapsed(true); }, [collapseSignal]);
  useEffect(() => { if (open) setCollapsed(defaultCollapsed); }, [open, defaultCollapsed]);
  // Contents are lazy: nothing mounts while collapsed, and with a placeholder the first expand waits for the height transition.
  const [ready, setReady] = useState(!placeholder && !defaultCollapsed);
  useEffect(() => {
    if (!open) { setReady(!placeholder && !defaultCollapsed); return; }
    if (collapsed || ready) return;
    if (!placeholder) { setReady(true); return; }
    const timer = setTimeout(() => setReady(true), 320);
    return () => clearTimeout(timer);
  }, [open, collapsed, ready, placeholder, defaultCollapsed]);
  const showContent = !collapsed && ready;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.aside
          aria-label={title}
          onKeyDown={(event) => { if (event.key === 'Escape' && onClose) { event.stopPropagation(); onClose(); } }}
          className={cn(
            'fixed bottom-0 right-0 z-[300] flex w-full flex-col overflow-hidden border-l border-slate-200 bg-white text-slate-800 shadow-2xl transition-[height] duration-300 ease-out dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 lg:w-[440px] xl:w-[480px]',
            collapsed ? 'h-14 border-t' : 'h-[100dvh]',
            className,
          )}
          initial={{ opacity: 0, x: 440 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 440 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {/* While collapsed the whole bar expands on click; its buttons keep their own actions. */}
          <header onClick={() => { if (collapsed) setCollapsed(false); }} className={cn('flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 px-3 dark:border-slate-800', collapsed && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900')}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Icon className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-black text-slate-900 dark:text-white">{collapsed && collapsedTitle ? collapsedTitle : title}</h2>
              {subtitle && <p className="truncate text-[11px] text-slate-500">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>{actions}</div>}
            <button type="button" className={shellButton} onClick={() => setCollapsed((current) => !current)} aria-label={collapsed ? expandLabel : collapseLabel} title={collapsed ? expandLabel : collapseLabel}>
              {collapsed ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {onClose && (
              <button type="button" className={shellButton} onClick={onClose} aria-label={closeLabel} title={closeLabel}>
                <X className="h-5 w-5" />
              </button>
            )}
          </header>
          {!collapsed && !ready && placeholder}
          {showContent && toolbar && <div className="shrink-0 border-b border-slate-200 p-3 dark:border-slate-800">{toolbar}</div>}
          {showContent && <div className={cn('min-h-0 flex-1 space-y-3 overflow-y-auto p-3', contentClassName)}>{children}</div>}
          {showContent && footer && <footer className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">{footer}</footer>}
        </motion.aside>
      )}
    </AnimatePresence>,
    document.body,
  );
};
