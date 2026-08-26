import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Warehouse } from 'lucide-react';

import { useOutsideClick } from '../../../hooks/useOutsideClick';
import { cn } from '../../../lib/cn';
import { api } from '../../../services/api';
import { Input } from './FormFields';

export type WarehouseOption = {
  id: number;
  name: string;
  address: string;
  city: string;
  countryCode: string;
  latitude: string;
  longitude: string;
};

const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const toWarehouseOption = (record: Record<string, unknown>): WarehouseOption => ({
  id: Number(record.id),
  name: String(record.name || ''),
  address: String(record.address || ''),
  city: String(record.city || ''),
  countryCode: String(record.country_code || ''),
  latitude: String(record.latitude ?? ''),
  longitude: String(record.longitude ?? ''),
});

export const WarehouseAutocompleteField = ({
  value,
  onChange,
  onSelectWarehouse,
  placeholder,
  loadingLabel,
  emptyLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelectWarehouse: (warehouse: WarehouseOption) => void;
  placeholder: string;
  loadingLabel: string;
  emptyLabel: string;
}) => {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  useOutsideClick(containerRef, () => setIsOpen(false), isOpen);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const firstPage = await api.warehouses.list({ limit: 500, page: 1 });
        const rows = [...firstPage.data];
        const lastPage = Number(firstPage.meta?.last_page || 1);

        for (let page = 2; page <= lastPage; page += 1) {
          const response = await api.warehouses.list({ limit: 500, page });
          rows.push(...response.data);
        }

        if (!cancelled) setWarehouses(rows.map(toWarehouseOption).filter((item) => item.id && item.name));
      } catch {
        if (!cancelled) setWarehouses([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const results = useMemo(() => {
    const words = normalize(value).split(' ').filter(Boolean);
    if (words.length === 0) return warehouses;
    return warehouses.filter((warehouse) => {
      const haystack = normalize(`${warehouse.name} ${warehouse.address} ${warehouse.city} ${warehouse.countryCode}`);
      return words.every((word) => haystack.includes(word));
    });
  }, [value, warehouses]);

  useEffect(() => setHighlightedIndex(0), [value]);

  const selectWarehouse = (warehouse: WarehouseOption) => {
    onSelectWarehouse(warehouse);
    setIsOpen(false);
  };

  const showDropdown = isOpen;

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (!isOpen || isLoading || results.length === 0) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((current) => (current + 1) % results.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((current) => (current - 1 + results.length) % results.length);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            const warehouse = results[highlightedIndex];
            if (warehouse) selectWarehouse(warehouse);
          } else if (event.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        placeholder={placeholder}
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> {loadingLabel}
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500">{emptyLabel}</div>
          ) : results.map((warehouse, index) => (
            <button
              key={warehouse.id}
              type="button"
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => selectWarehouse(warehouse)}
              className={cn(
                'flex w-full cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-left dark:text-slate-200',
                index === highlightedIndex ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Warehouse className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{warehouse.name}</span>
                <span className="block truncate text-xs text-slate-500">
                  {[warehouse.address, warehouse.city, warehouse.countryCode].filter(Boolean).join(', ')}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
