import React from 'react';
import { cn } from '../../lib/cn';

// The real Freightbook.ai mark - shared so every surface (app header, landing page, checkout)
// renders the exact same logo instead of each screen inventing its own placeholder brand chip.
export const FreightbookMark = ({ className }: { className?: string }) => {
  const uid = React.useId();
  const gradientId = `gemini-spark-gradient-${uid}`;
  const glowId = `gemini-spark-glow-${uid}`;
  return (
    <svg viewBox="0 0 24 24" className={cn('shrink-0', className)} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="3" y1="20" x2="21" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FACC15" />
          <stop offset="0.28" stopColor="#22C55E" />
          <stop offset="0.56" stopColor="#3B82F6" />
          <stop offset="0.82" stopColor="#EF4444" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
        <radialGradient id={glowId} cx="12" cy="11" r="8.5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M12 1.75C13.35 6.65 17.35 10.65 22.25 12C17.35 13.35 13.35 17.35 12 22.25C10.65 17.35 6.65 13.35 1.75 12C6.65 10.65 10.65 6.65 12 1.75Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M12 1.75C13.35 6.65 17.35 10.65 22.25 12C17.35 13.35 13.35 17.35 12 22.25C10.65 17.35 6.65 13.35 1.75 12C6.65 10.65 10.65 6.65 12 1.75Z"
        fill={`url(#${glowId})`}
      />
    </svg>
  );
};

export const BrandWordmark = ({ className }: { className?: string }) => (
  <span className={cn('inline-flex items-center gap-2 font-brand font-bold leading-none tracking-tight text-slate-900 dark:text-white', className)}>
    <FreightbookMark className="h-[1.4em] w-[1.4em] shrink-0" />
    <span className="leading-none translate-y-[0.09em]">Freightbook<span className="text-primary">.ai</span></span>
  </span>
);
