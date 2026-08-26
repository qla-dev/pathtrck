import { X, Plane, Ship, Truck, ExternalLink, MapPin, Navigation } from 'lucide-react';

import { trPackageStatus, ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Language, Package as PackageData } from '../../types';
import { LoadStatusIcon } from '../load/LoadStatusPicker';

const TRANSPORT_ICONS = { air: Plane, sea: Ship, road: Truck } as const;

const statusChipColors = (status: PackageData['status']) => {
  switch (status) {
    case 'Opened': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300';
    case 'Sent': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300';
    case 'In delivery': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
    case 'Received': return 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300';
    case 'Finished': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
    case 'Pending': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300';
    case 'Cancelled': return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300';
  }
};

const Mini = ({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) => (
  <div className="min-w-0 rounded-md bg-slate-50 px-2 py-1 dark:bg-white/5">
    <p className="truncate text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{label}</p>
    <p className={cn('truncate text-[11px] font-bold', valueClassName || 'text-slate-800 dark:text-slate-100')}>{value}</p>
  </div>
);

type TrackingMapCardProps = {
  pkg: PackageData;
  lang: Language;
  onOpenDetails: () => void;
  onClose: () => void;
};

export const TrackingMapCard = ({ pkg, lang, onOpenDetails, onClose }: TrackingMapCardProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const TransportIcon = TRANSPORT_ICONS[(pkg.transportType || 'road') as keyof typeof TRANSPORT_ICONS] || Truck;
  const transportLabel = pkg.transportType === 'air'
    ? u('postLoadModal.transport.air', 'Air')
    : pkg.transportType === 'sea'
      ? u('postLoadModal.transport.sea', 'Sea')
      : u('postLoadModal.transport.road', 'Road');

  return (
    <div className="w-[252px] overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95">
      <div className="flex items-start justify-between gap-2 px-3 pt-2.5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-black leading-tight text-slate-900 dark:text-white">{pkg.recipient || pkg.trackingNumber || '—'}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[9px] font-bold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
            <TransportIcon className="h-2.5 w-2.5 shrink-0" />
            {transportLabel}{pkg.cargoType ? ` • ${pkg.cargoType}` : ''}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label={u('common.close', 'Close')} className="-mr-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5 px-3">
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', statusChipColors(pkg.status))}>
          <LoadStatusIcon status={pkg.status} className="h-2.5 w-2.5" />
          {trPackageStatus(lang, pkg.status)}
        </span>
        <span className="truncate text-[10px] font-bold text-slate-500 dark:text-slate-400">{pkg.trackingNumber || '—'}</span>
      </div>

      <div className="mt-2 flex items-center gap-1 px-3 text-[11px] font-bold text-slate-700 dark:text-slate-200">
        <MapPin className="h-3 w-3 shrink-0 text-sky-500 dark:text-sky-400" />
        <span className="min-w-0 flex-1 truncate">{pkg.origin || '—'}</span>
        <span className="shrink-0 text-slate-400 dark:text-slate-500">→</span>
        <Navigation className="h-3 w-3 shrink-0 text-rose-500 dark:text-rose-400" />
        <span className="min-w-0 flex-1 truncate">{pkg.destination || '—'}</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 px-3">
        <Mini label={u('Amount', 'Amount')} value={pkg.totalAmount || '—'} valueClassName="text-emerald-600 dark:text-emerald-300" />
        <Mini
          label={u('tracking.transit', 'Transit')}
          value={pkg.transitDays ? `${pkg.transitDays} ${u('tracking.days', 'days')}` : u('tracking.notScheduled', 'Not scheduled')}
          valueClassName="text-violet-600 dark:text-violet-300"
        />
      </div>

      <div className="px-3 pb-3 pt-2">
        <button
          type="button"
          onClick={onOpenDetails}
          className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary text-[11px] font-bold text-white hover:bg-primary-dark"
        >
          <ExternalLink className="h-3 w-3" />
          {u('tracking.viewDetails', 'View details')}
        </button>
      </div>
    </div>
  );
};
