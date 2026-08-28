import Flatpickr from 'react-flatpickr';
import { CalendarDays } from 'lucide-react';
import { Language } from '../../../types';
import { flatpickrI18n } from '../../../i18n';

export const DateInput = ({
  value,
  onChange,
  placeholder,
  lang,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  lang: Language;
}) => (
  <div className="w-full">
    <Flatpickr
      value={value}
      options={{
        dateFormat: 'd.m.Y',
        locale: flatpickrI18n(lang),
        allowInput: true,
      }}
      onChange={(_, dateStr) => onChange(dateStr)}
      render={(_, ref) => (
        <div className="relative">
          <input
            ref={ref}
            value={value}
            onChange={() => undefined}
            placeholder={placeholder}
            className="h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 pr-10 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
          <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        </div>
      )}
    />
  </div>
);

