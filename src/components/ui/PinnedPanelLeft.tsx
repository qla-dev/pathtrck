import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronUp, X, type LucideIcon } from 'lucide-react';

import { cn } from '../../lib/cn';

type PinnedPanelLeftProps = {
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
  /** Pinned under the shared header, above the main column - tabs, filters. */
  toolbar?: ReactNode;
  /** Pinned to the bottom of the main column. */
  footer?: ReactNode;
  /** Second column beside the main one, under the same header - details of whatever is selected. */
  extension?: ReactNode;
  /** Accessible name for the extension column. */
  extensionLabel?: string;
  /** Pinned to the bottom of the extension column - actions that belong to the selection. */
  extensionFooter?: ReactNode;
  /** Start as the collapsed bar instead of full height. */
  defaultCollapsed?: boolean;
  /** Title shown on the collapsed bar; the real title returns once expanded. */
  collapsedTitle?: string;
  /** Changing this number collapses the panel, e.g. to reveal the page behind it. */
  collapseSignal?: number;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};

const shellButton = 'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';

/** How long the shell takes to slide in; the extension waits this out so the two arrive in order. */
const SLIDE_MS = 220;

/**
 * Left-docked pinned panel with an optional second column.
 *
 * Both columns live inside one shell, so they share its background, its single shadow and one
 * header - two separately positioned panels each carrying their own `shadow-2xl` met in a grey
 * seam and could drift apart in width. Each column is a fifth of the viewport: the shell is 20vw
 * alone and 40vw once the extension is in, and it widens only after it has finished sliding in,
 * so the main column arrives first and the extension slides out from under it.
 */
export const PinnedPanelLeft = ({
  open, title, subtitle, icon: Icon, onClose, closeLabel, collapseLabel, expandLabel, actions, toolbar, footer,
  extension, extensionLabel, extensionFooter, defaultCollapsed = false, collapsedTitle, collapseSignal,
  className, contentClassName, children,
}: PinnedPanelLeftProps) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  useEffect(() => { if (collapseSignal) setCollapsed(true); }, [collapseSignal]);
  useEffect(() => { if (open) setCollapsed(defaultCollapsed); }, [open, defaultCollapsed]);

  // The extension is held back until the shell has slid in, then it gets its own slide.
  const [extended, setExtended] = useState(false);
  useEffect(() => {
    if (!open || !extension || collapsed) { setExtended(false); return; }
    const timer = setTimeout(() => setExtended(true), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [open, extension, collapsed]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.aside
          aria-label={title}
          onKeyDown={(event) => { if (event.key === 'Escape' && onClose) { event.stopPropagation(); onClose(); } }}
          className={cn(
            'fixed bottom-0 left-0 z-[300] flex w-full flex-col overflow-hidden border-r border-slate-200 bg-white text-slate-800 shadow-2xl transition-[height,width] duration-300 ease-out dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100',
            collapsed ? 'h-14 border-t' : 'h-[100dvh]',
            extended ? 'md:w-[40vw]' : 'md:w-[20vw]',
            className,
          )}
          initial={{ opacity: 0, x: -440 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -440 }}
          transition={{ duration: SLIDE_MS / 1000, ease: 'easeOut' }}
        >
          {/* One header for both columns. While collapsed the whole bar expands on click. */}
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

          {!collapsed && (
            <div className="flex min-h-0 flex-1">
              <div className={cn('flex min-h-0 w-full shrink-0 flex-col md:w-[20vw]', extended && 'border-r border-slate-200 dark:border-slate-800')}>
                {toolbar && <div className="shrink-0 border-b border-slate-200 p-3 dark:border-slate-800">{toolbar}</div>}
                <div className={cn('min-h-0 flex-1 space-y-3 overflow-y-auto p-3', contentClassName)}>{children}</div>
                {footer && <footer className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">{footer}</footer>}
              </div>

              <AnimatePresence>
                {extended && extension && (
                  <motion.section
                    aria-label={extensionLabel}
                    className="hidden min-h-0 w-[20vw] shrink-0 flex-col md:flex"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
                    <div className="min-h-0 flex-1 overflow-y-auto p-3">{extension}</div>
                    {extensionFooter && <footer className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">{extensionFooter}</footer>}
                  </motion.section>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>,
    document.body,
  );
};
