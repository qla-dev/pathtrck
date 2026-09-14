import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Boxes, Package, RotateCcw, Ruler, Weight } from 'lucide-react';

import { cn } from '../../../lib/cn';
import { Input } from './FormFields';
import { FieldLabel } from './FieldLabel';
import { IconSelect, type IconSelectOption } from '../../ui/IconSelect';
import { calculateVolume } from './volume';
import { toApiLengthM, toApiWeightKg } from './payload';
import type { PackagingEntry } from './types';

// How one packaging line is described: how many of what, how big each is and how much it weighs.
// The load's own cargo step fills the first line in place; every further line is the same section
// again inside the packaging dialog, so both read and validate identically.

const conciseNumber = (value: number) => String(Number(value.toFixed(6)));

/**
 * Applies one edit to a packaging line, re-deriving the volume whenever the change is one the
 * volume is calculated from - the same rule the cargo step has always used for the load's own line.
 */
export const applyPackagingPatch = <T extends PackagingEntry>(entry: T, patch: Partial<PackagingEntry>): T => {
  const next = { ...entry, ...patch };
  const touched = Object.keys(patch);
  if (touched.some((key) => ['lengthM', 'widthM', 'heightM', 'dimensionScope'].includes(key))
    || (touched.includes('pallets') && next.dimensionScope === 'overall')) {
    next.volumeM3 = calculateVolume(next) ?? '';
  }
  return next;
};

/** Re-states the dimensions in the newly picked unit, so switching m → cm keeps the same box. */
export const withDimensionUnit = (entry: PackagingEntry, nextUnit: PackagingEntry['lengthUnit']): Partial<PackagingEntry> => {
  const multiplier = ({ m: 1, cm: 100, mm: 1000 } as const)[nextUnit];
  const convert = (value: string, unit: PackagingEntry['lengthUnit']) =>
    value ? conciseNumber(toApiLengthM(value, unit) * multiplier) : '';
  return {
    lengthM: convert(entry.lengthM, entry.lengthUnit),
    widthM: convert(entry.widthM, entry.widthUnit),
    heightM: convert(entry.heightM, entry.heightUnit),
    lengthUnit: nextUnit,
    widthUnit: nextUnit,
    heightUnit: nextUnit,
  };
};

export const withWeightUnit = (entry: PackagingEntry, nextUnit: PackagingEntry['weightUnit']): Partial<PackagingEntry> => ({
  weightKg: entry.weightKg
    ? conciseNumber(toApiWeightKg(entry.weightKg, entry.weightUnit) / (nextUnit === 't' ? 1000 : 1))
    : '',
  weightUnit: nextUnit,
});

type PackagingFieldsProps = {
  value: PackagingEntry;
  onChange: (patch: Partial<PackagingEntry>) => void;
  u: (key: string, fallback: string) => string;
  /** The picker values this draft's transport type offers, from the catalog. */
  fieldOptions: (field: string, icon: LucideIcon) => IconSelectOption[];
  fieldExample: (field: string) => string;
  /** The cargo step labels its own fields with the AI-refill marker; added lines use plain ones. */
  renderLabel?: (field: keyof PackagingEntry) => ReactNode;
  fieldTitle: (field: string) => string;
  /** Red outlines a rejected submit leaves behind - only the load's own first line has them. */
  invalidClass?: (field: keyof PackagingEntry) => string;
  /** Sits on the packaging method's own label row, where the cargo step opens the dialog. */
  packagingTrailing?: ReactNode;
};

export const PackagingFields = ({
  value, onChange, u, fieldOptions, fieldExample, renderLabel, fieldTitle, invalidClass, packagingTrailing,
}: PackagingFieldsProps) => {
  const label = (field: keyof PackagingEntry) => renderLabel?.(field) ?? <FieldLabel>{fieldTitle(field)}</FieldLabel>;
  const invalid = (field: keyof PackagingEntry) => invalidClass?.(field) ?? '';
  const packagingOptions = fieldOptions('quantityMeasure', Package);
  const calculated = calculateVolume(value);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={cn('space-y-1', invalid('pallets'))}>
          {label('pallets')}
          <Input
            type="number"
            step="1"
            min="0"
            value={value.pallets}
            onChange={(event) => onChange({ pallets: event.target.value })}
            placeholder={fieldExample('pallets')}
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <FieldLabel>{u('postLoadModal.packagingMethod', '')}</FieldLabel>
            {packagingTrailing}
          </div>
          <IconSelect
            value={value.quantityMeasure}
            onChange={(next) => onChange({ quantityMeasure: next })}
            placeholder={u('postLoadModal.selectPackagingMethod', '')}
            ariaLabel={u('postLoadModal.packagingMethod', '')}
            icon={Package}
            searchable
            searchPlaceholder={u('postLoadModal.searchPackagingMethod', '')}
            noResults={u('postLoadModal.noPackagingMethods', '')}
            options={[
              // A value saved before the catalog offered it stays selectable rather than vanishing.
              ...(value.quantityMeasure && !packagingOptions.some((option) => option.value === value.quantityMeasure)
                ? [{ value: value.quantityMeasure, label: value.quantityMeasure, icon: Package }]
                : []),
              ...packagingOptions,
            ]}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_5rem_minmax(0,1.4fr)] sm:items-end">
        <div className={cn('space-y-1', invalid('lengthM'))}>
          {label('lengthM')}
          <Input type="number" step="0.1" min="0.1" value={value.lengthM} onChange={(event) => onChange({ lengthM: event.target.value })} placeholder={fieldExample('lengthM')} />
        </div>
        <div className={cn('space-y-1', invalid('widthM'))}>
          {label('widthM')}
          <Input type="number" step="0.1" min="0.1" value={value.widthM} onChange={(event) => onChange({ widthM: event.target.value })} placeholder={fieldExample('widthM')} />
        </div>
        <div className={cn('space-y-1', invalid('heightM'))}>
          {label('heightM')}
          <Input type="number" step="0.05" min="0" value={value.heightM} onChange={(event) => onChange({ heightM: event.target.value })} placeholder={fieldExample('heightM')} />
        </div>
        <div className="space-y-1">
          <FieldLabel>{u('postLoadModal.dimensionUnit', '')}</FieldLabel>
          <IconSelect
            value={value.lengthUnit}
            onChange={(next) => onChange(withDimensionUnit(value, next as PackagingEntry['lengthUnit']))}
            placeholder="m"
            ariaLabel={u('postLoadModal.dimensionUnit', '')}
            icon={Ruler}
            options={fieldOptions('lengthUnit', Ruler)}
          />
        </div>
        <div className="space-y-1">
          {label('dimensionScope')}
          <IconSelect
            value={value.dimensionScope}
            onChange={(next) => onChange({ dimensionScope: next as PackagingEntry['dimensionScope'] })}
            placeholder=""
            ariaLabel={fieldTitle('dimensionScope')}
            icon={Boxes}
            options={fieldOptions('dimensionScope', Boxes)}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={cn('space-y-1', invalid('weightKg'))}>
          {label('weightKg')}
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.1"
              min="0.1"
              value={value.weightKg}
              onChange={(event) => onChange({ weightKg: event.target.value })}
              placeholder={value.weightUnit === 't' ? '24.0' : fieldExample('weightKg')}
            />
            <IconSelect
              value={value.weightUnit}
              onChange={(next) => onChange(withWeightUnit(value, next as PackagingEntry['weightUnit']))}
              placeholder="t"
              ariaLabel={u('postLoadModal.weightUnit', '')}
              icon={Weight}
              className="w-24 shrink-0"
              options={fieldOptions('weightUnit', Weight)}
            />
          </div>
        </div>
        <div className={cn('space-y-1', invalid('volumeM3'))}>
          <div className="flex items-center justify-between gap-2">
            {label('volumeM3')}
            <button
              type="button"
              disabled={calculated === null}
              onClick={() => onChange({ volumeM3: calculated ?? value.volumeM3 })}
              className="mr-1 inline-flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              {u('postLoadModal.recalculateVolume', '')}
            </button>
          </div>
          <Input type="number" step="any" min="0" value={value.volumeM3} onChange={(event) => onChange({ volumeM3: event.target.value })} placeholder={fieldExample('volumeM3')} />
        </div>
      </div>
    </>
  );
};
