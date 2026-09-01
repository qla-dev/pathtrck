import { useEffect, useRef, useState } from 'react';
import { GripVertical, MapPin, PackageCheck, Trash2 } from 'lucide-react';

import { cn } from '../../../lib/cn';
import { placeTypeIcon } from './placeTypeIcon';
import type { StopSide } from './routeStops';
import type { RouteStopDraft } from './types';

export type TimelineStop = { stop: RouteStopDraft; side: StopSide; index: number };

const stopKey = ({ side, index }: TimelineStop) => `${side}-${index}`;

/** How long the stop that was just dropped stays highlighted, so the eye can follow the move. */
const SETTLE_MS = 600;

const SIDE_TONE: Record<StopSide, { badge: string; text: string; header: string; line: string }> = {
  pickup: {
    badge: 'bg-emerald-500 shadow-emerald-500/25',
    text: 'text-emerald-600 dark:text-emerald-400',
    header: 'bg-emerald-500 shadow-emerald-500/25',
    line: 'border-emerald-300/80 dark:border-emerald-800',
  },
  delivery: {
    badge: 'bg-blue-500 shadow-blue-500/25',
    text: 'text-blue-600 dark:text-blue-400',
    header: 'bg-blue-500 shadow-blue-500/25',
    line: 'border-sky-300/80 dark:border-sky-800',
  },
};

/**
 * The picture that follows the cursor while a stop is being dragged: the stop on its own, as a card.
 *
 * The browser snapshots whatever element is handed to setDragImage, so it is the stop's own section
 * that is copied - not the timeline row around it, which stretches down to the next stop and would
 * trail an empty dashed tail under the cursor. The copy is given a card's background and shadow and
 * only has to survive the synchronous snapshot, which is why it is removed on the next tick.
 */
const buildDragPreview = (row: HTMLElement): HTMLElement | null => {
  const section = row.querySelector<HTMLElement>('[data-route-section]');
  if (!section) return null;
  const preview = section.cloneNode(true) as HTMLElement;
  preview.className = `${preview.className} border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900`;
  // Inline, so they beat the section's own padding classes rather than racing them in the
  // stylesheet: the card wants real padding and none of the negative margin that cancels it.
  preview.style.margin = '0';
  preview.style.padding = '0.5rem 0.75rem';
  preview.style.position = 'fixed';
  preview.style.top = '-1000px';
  preview.style.left = '-1000px';
  preview.style.width = `${section.getBoundingClientRect().width}px`;
  preview.style.pointerEvents = 'none';
  document.body.appendChild(preview);
  return preview;
};

/**
 * The route as a vertical timeline: the pickups under one heading, the deliveries under the next,
 * each stop a node on the line running between them, marked with the kind of place it is. For road
 * - the only mode that can hold more than one stop per side - it also carries the stops' controls.
 *
 * Reordering and removing live here rather than on the stop cards because the timeline is where the
 * order is actually read: dragging a stop up or down happens against the route you are looking at.
 * A stop dragged across the pickup/delivery boundary changes side with it - what makes an address a
 * pickup is only that the goods are loaded there, and that is exactly what moving it says.
 */
export const RouteStopTimeline = ({
  stops,
  editable,
  nameOf,
  countOf,
  onMoveStop,
  onRemove,
  u,
}: {
  stops: TimelineStop[];
  editable: boolean;
  nameOf: (side: StopSide, index: number) => string;
  countOf: (side: StopSide) => number;
  onMoveStop: (
    from: { side: StopSide; index: number },
    target: { side: StopSide; index: number },
    placeAfter: boolean,
  ) => void;
  onRemove: (side: StopSide, index: number) => void;
  u: (key: string, fallback: string) => string;
}) => {
  const [dragged, setDragged] = useState<TimelineStop | null>(null);
  const [dropTarget, setDropTarget] = useState<TimelineStop | null>(null);
  const [settled, setSettled] = useState<string | null>(null);
  // The rows themselves, so the drag can carry a picture of the whole stop instead of the browser's
  // default ghost - which, with the handle being what is draggable, is just the grip icon.
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  const endDrag = () => {
    setDragged(null);
    setDropTarget(null);
  };
  const positionOf = (entry: TimelineStop) => stops.findIndex((candidate) => stopKey(candidate) === stopKey(entry));
  const canDropOn = (target: TimelineStop) => dragged !== null && stopKey(dragged) !== stopKey(target);

  // Where the dragged stop would land, and on which side. Dragging downward drops it after the row
  // under the cursor and upward drops it before, whichever list that row belongs to - so crossing
  // the boundary is what turns a pickup into a delivery.
  const dropPlan = (() => {
    if (!dragged || !dropTarget || !canDropOn(dropTarget)) return null;
    const target = positionOf(dropTarget);
    const source = positionOf(dragged);
    if (target < 0 || source < 0) return null;
    const goingDown = source < target;
    // Carrying the only stop of its side away would leave the route without a pickup or without a
    // delivery, so the two exchange places - the swap that turns an origin into a destination.
    const swap = dragged.side !== dropTarget.side && countOf(dragged.side) < 2;
    return {
      swap,
      target: { side: dropTarget.side, index: dropTarget.index },
      placeAfter: goingDown,
      // The timeline position the stop would sit behind; -1 means it becomes the very first stop.
      // A swap lands on the target itself, so it is marked on that row instead of in a gap.
      after: swap ? null : goingDown ? target : target - 1,
    };
  })();

  const highlight = (key: string) => {
    setSettled(key);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => setSettled(null), SETTLE_MS);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {stops.map((entry, position) => {
        const { stop, side, index } = entry;
        const key = stopKey(entry);
        const tone = SIDE_TONE[side];
        const lastOfAll = position === stops.length - 1;
        // A heading opens each list, and the stop before it gets extra room so the dashed line has
        // somewhere to run: the gap belongs to the line, not to the heading.
        const opensGroup = index === 0;
        const nextOpensGroup = !lastOfAll && stops[position + 1].index === 0;
        const draggable = editable && stops.length > 1;
        const removable = editable && countOf(side) > 1;
        const isDragged = dragged !== null && stopKey(dragged) === key;
        const dropLineInGap = dropPlan?.after === position;
        const dropLineAbove = dropPlan?.after === -1 && position === 0;
        const swapping = Boolean(dropPlan?.swap)
          && (isDragged || key === `${dropPlan?.target.side}-${dropPlan?.target.index}`);
        // The address is what names the stop; the city only earns its own line when the address
        // does not already say it.
        const detail = stop.address || stop.city || stop.port || stop.airport || '—';
        // What kind of place this is - a warehouse, a port, an airport - rather than its number,
        // which the heading beside it already gives.
        const StopIcon = placeTypeIcon(stop.placeType, side === 'pickup' ? MapPin : PackageCheck);
        const city = stop.address && stop.city && !stop.address.includes(stop.city) ? stop.city : '';

        return (
          // Spare column height goes into one gap only: the one between the last pickup and the
          // deliveries heading. Stops within a list stay a fixed distance apart, so a route does
          // not re-space itself every time the column beside it grows.
          <div key={key} className={cn('flex min-w-0 flex-col', nextOpensGroup && 'flex-1')}>
            {opensGroup && (
              <div className="relative flex min-w-0 items-center gap-3 pb-3">
                <span className={cn('absolute bottom-0 left-[15px] top-8 border-l-2 border-dashed', tone.line)} />
                <span className={cn('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-lg', tone.header)}>
                  {side === 'pickup' ? <MapPin className="h-4 w-4" /> : <PackageCheck className="h-4 w-4" />}
                </span>
                <p className="truncate text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {side === 'pickup'
                    ? u('postLoadModal.pickupBlock', 'Pickup')
                    : u('postLoadModal.deliveryBlock', 'Delivery')}
                </p>
              </div>
            )}

            <div
              ref={(element) => {
                rowRefs.current[key] = element;
              }}
              className={cn(
                'relative flex min-w-0 items-start gap-3',
                lastOfAll ? 'pb-0' : nextOpensGroup ? 'flex-1 pb-6' : 'pb-3'
              )}
              onDragOver={(event) => {
                if (!canDropOn(entry)) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDropTarget(entry);
              }}
              onDragLeave={() => setDropTarget((current) => (current && stopKey(current) === key ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                if (dragged && dropPlan && canDropOn(entry)) {
                  onMoveStop({ side: dragged.side, index: dragged.index }, dropPlan.target, dropPlan.placeAfter);
                  highlight(`${dropPlan.target.side}-${dropPlan.target.index}`);
                }
                endDrag();
              }}
            >
              {!lastOfAll && <span className={cn('absolute bottom-0 left-[15px] top-7 border-l-2 border-dashed', tone.line)} />}
              {(dropLineInGap || dropLineAbove) && (
                <span
                  className={cn(
                    'pointer-events-none absolute inset-x-0 z-20 h-0.5 rounded-full bg-primary shadow-[0_0_0_3px] shadow-primary/20',
                    dropLineInGap ? 'top-7' : '-top-1'
                  )}
                />
              )}
              {/* The badge travels inside the section so the drag ghost carries it, while the
                  dashed line stays behind on the row it connects. */}
              <div
                data-route-section
                className={cn(
                  '-mx-2 -my-1 flex min-w-0 flex-1 items-start gap-3 rounded-xl px-2 py-1 transition-all duration-200',
                  isDragged && 'scale-[0.98] opacity-35',
                  swapping && 'bg-primary/5 ring-2 ring-primary/40',
                  settled === key && 'bg-primary/5 ring-2 ring-primary/30'
                )}
              >
                <span className={cn('relative z-10 ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white shadow-md', tone.badge)}>
                  <StopIcon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-slate-900 dark:text-white">{nameOf(side, index)}</p>
                  <p className={cn('truncate text-[10px] font-bold', tone.text)}>{detail}</p>
                  {city && <p className="truncate text-[9px] font-bold text-slate-400">{city}</p>}
                </div>
                {stop.timeFrom && (
                  <p className="shrink-0 pt-0.5 text-[11px] font-black text-slate-900 dark:text-white">{stop.timeFrom}</p>
                )}
                {draggable && (
                  <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
                    <span
                      draggable
                      onDragStart={(event) => {
                        const row = rowRefs.current[key];
                        const preview = row ? buildDragPreview(row) : null;
                        if (row && preview) {
                          // Snapshot happens synchronously here, before the stop is faded out, so
                          // the ghost is a clean copy of it as it looks at rest.
                          const rect = row.getBoundingClientRect();
                          event.dataTransfer.setDragImage(preview, event.clientX - rect.left, preview.offsetHeight / 2);
                          window.setTimeout(() => preview.remove(), 0);
                        }
                        event.dataTransfer.effectAllowed = 'move';
                        // Firefox only starts a drag once some data is attached to it.
                        event.dataTransfer.setData('text/plain', key);
                        setDragged(entry);
                      }}
                      onDragEnd={endDrag}
                      title={u('postLoadModal.dragStopHint', 'Drag to reorder')}
                      className="cursor-grab rounded p-0.5 text-slate-300 transition-colors hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
                    {removable && (
                      <button
                        type="button"
                        onClick={() => onRemove(side, index)}
                        title={u('postLoadModal.removeStop', 'Remove this stop')}
                        className="cursor-pointer rounded p-0.5 text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
