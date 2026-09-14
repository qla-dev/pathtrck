import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Package, Plus, Trash2 } from 'lucide-react';

import { SmallModal } from '../../ui/SmallModal';
import type { IconSelectOption } from '../../ui/IconSelect';
import { PackagingFields, applyPackagingPatch } from './PackagingFields';
import { EMPTY_PACKAGING, type PackagingEntry } from './types';

// Blank repeats are dropped on save, so an accidental "add another" never becomes a line.
const isFilled = (entry: PackagingEntry) => Boolean(
  entry.pallets || entry.quantityMeasure || entry.lengthM || entry.widthM || entry.heightM || entry.weightKg || entry.volumeM3,
);

// A load is often made up of several different packagings - 12 pallets and 3 crates, each with
// their own size and weight. The cargo step carries the first one; the rest are added here, one
// repeat of the very same section per line, and only written back to the draft on save.
export const MorePackagingModal = ({ entries, onSave, onClose, u, fieldOptions, fieldExample, fieldTitle }: {
  entries: PackagingEntry[];
  onSave: (entries: PackagingEntry[]) => void;
  onClose: () => void;
  u: (key: string, fallback: string) => string;
  fieldOptions: (field: string, icon: LucideIcon) => IconSelectOption[];
  fieldExample: (field: string) => string;
  fieldTitle: (field: string) => string;
}): ReactNode => {
  const [draftEntries, setDraftEntries] = useState<PackagingEntry[]>(() => entries.length ? entries : [EMPTY_PACKAGING]);

  const patchEntry = (index: number, patch: Partial<PackagingEntry>) =>
    setDraftEntries((current) => current.map((entry, position) => position === index ? applyPackagingPatch(entry, patch) : entry));

  return (
    <SmallModal labelledBy="more-packaging-title" onClose={onClose} className="max-w-3xl">
      <h3 id="more-packaging-title" className="text-base font-black">{u('postLoadModal.morePackagingTitle', 'More packaging')}</h3>
      <p className="mt-1 text-xs text-slate-500">{u('postLoadModal.morePackagingHint', 'Describe every other packaging this load is made up of.')}</p>

      <div className="mt-4 space-y-3">
        {draftEntries.map((entry, index) => (
          <div key={index} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                <Package className="h-4 w-4 text-primary" />
                {/* Numbered from 2: the cargo step itself is packaging 1. */}
                {u('postLoadModal.packagingLine', 'Packaging')} {index + 2}
              </span>
              <button
                type="button"
                onClick={() => setDraftEntries((current) => current.filter((_, position) => position !== index))}
                aria-label={u('common.remove', 'Remove')}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-rose-300 hover:text-rose-500 dark:border-slate-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <PackagingFields
              value={entry}
              onChange={(patch) => patchEntry(index, patch)}
              u={u}
              fieldOptions={fieldOptions}
              fieldExample={fieldExample}
              fieldTitle={fieldTitle}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setDraftEntries((current) => [...current, EMPTY_PACKAGING])}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 py-3 text-xs font-black uppercase tracking-wider text-primary transition-colors hover:bg-primary/5"
        >
          <Plus className="h-4 w-4" />
          {u('postLoadModal.addPackaging', 'Add another packaging')}
        </button>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700">{u('common.cancel', 'Cancel')}</button>
        <button
          type="button"
          onClick={() => { onSave(draftEntries.filter(isFilled)); onClose(); }}
          className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white"
        >
          {u('common.save', 'Save')}
        </button>
      </div>
    </SmallModal>
  );
};
