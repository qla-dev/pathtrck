import Flatpickr from 'react-flatpickr';
import { Clock3 } from 'lucide-react';
import { Language } from '../../../types';
import { flatpickrI18n } from '../../../i18n';

export const TimeInput = ({
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
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i',
        time_24hr: true,
        minuteIncrement: 5,
        locale: flatpickrI18n(lang),
        onReady: (_dates, _dateStr, instance) => instance.calendarContainer?.classList.add('smart-time-flatpickr'),
        onOpen: (_dates, _dateStr, instance) => instance.calendarContainer?.classList.add('smart-time-flatpickr'),
      }}
      onChange={(_, dateStr) => onChange(dateStr)}
      render={(_, ref) => (
        <div className="relative">
          <input
            ref={ref}
            value={value}
            onChange={() => undefined}
            placeholder={placeholder}
            className="h-[54px] w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
          <Clock3 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        </div>
      )}
    />
  </div>
);

