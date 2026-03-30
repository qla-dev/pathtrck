import React from 'react';
import { cn } from '../../lib/cn';

type ToggleProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean;
};

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        className={cn(
          'inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950',
          checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700',
          className,
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    );
  },
);

Toggle.displayName = 'Toggle';
