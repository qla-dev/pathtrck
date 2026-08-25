import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '../../../lib/cn';

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={cn(
      'w-full h-[54px] cursor-text px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm',
      props.type === 'date' &&
        'pr-3 text-[13px] leading-[54px] [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-datetime-edit]:text-[12px] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100',
      props.className
    )}
  />
);

export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={cn(
      'w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary resize-none text-sm',
      props.className
    )}
  />
);

export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={cn(
      'w-full h-[54px] cursor-pointer px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm appearance-none',
      props.className
    )}
  />
);

