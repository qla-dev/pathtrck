import React from 'react';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }
>(({ className, variant = 'primary', size = 'md', ...props }, ref) => {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-white hover:bg-primary-dark shadow-md cursor-pointer',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 cursor-pointer',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer',
    outline: 'bg-transparent border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer',
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});

Button.displayName = 'Button';

