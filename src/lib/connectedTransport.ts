import type { Package } from '../types';

export const connectedCraft = (pkg: Package): { mode: 'air' | 'sea'; identifier: string } | null => {
  const modes = pkg.transportType === 'sea' ? ['sea', 'air'] as const : ['air', 'sea'] as const;
  for (const mode of modes) {
    const key = mode === 'air' ? 'flight_details' : 'vessel_and_voyage';
    const item = pkg.operationalChecklist?.find((row) => row.key === key);
    try {
      const saved = JSON.parse(String(item?.action_value || ''));
      const identifier = String(mode === 'air' ? saved?.hex : saved?.mmsi).toLowerCase();
      if (saved?.matched === true && (mode === 'air' ? /^[a-f0-9]{6}$/ : /^\d{9}$/).test(identifier)) {
        return { mode, identifier };
      }
    } catch { /* A text entry alone does not identify a connected craft. */ }
  }
  return null;
};
