import { Clock3 } from 'lucide-react';
import { Input } from './FormFields';
import { formatTimeMask } from './timeMask';

export const TimeInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) => (
  <div className="relative">
    <Input
      value={value}
      onChange={(event) => onChange(formatTimeMask(event.target.value))}
      inputMode="numeric"
      placeholder={placeholder}
      className="pr-11"
    />
    <Clock3 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
  </div>
);
