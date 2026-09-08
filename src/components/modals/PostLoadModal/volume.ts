import type { LoadDraft } from './types';

export const calculateVolume = (draft: LoadDraft): string | null => {
  const toMetres = (value: string, unit: LoadDraft['lengthUnit']) =>
    Number(value) / ({ m: 1, cm: 100, mm: 1000 } as const)[unit];
  const dimensions = [
    toMetres(draft.lengthM, draft.lengthUnit),
    toMetres(draft.widthM, draft.widthUnit),
    toMetres(draft.heightM, draft.heightUnit),
  ];
  const count = draft.dimensionScope === 'per_unit' ? 1 : Number(draft.pallets);
  if (dimensions.some((value) => !Number.isFinite(value) || value <= 0)
    || !Number.isInteger(count) || count <= 0) return null;
  const volume = dimensions.reduce((total, value) => total * value, count);
  return Number.isFinite(volume) ? String(Number(volume.toFixed(6))) : null;
};
