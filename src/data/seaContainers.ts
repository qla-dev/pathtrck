// Container equipment registry for the Sea transport type's "Container types" picker. Standard
// dry containers are recommended first; the rest are grouped by special-equipment category the
// way ocean carriers (CMA CGM, Maersk) present their own equipment lists.
export type SeaContainerCategory = 'Standard' | 'Open Top' | 'Reefer' | 'Flat Rack' | 'Platform';

export type SeaContainerType = {
  code: string;
  label: string;
  category: SeaContainerCategory;
};

export const SEA_CONTAINER_TYPES: SeaContainerType[] = [
  // Standard - recommended first, ahead of the special-equipment categories below.
  { code: '20GP', label: "20' GP", category: 'Standard' },
  { code: '20STD', label: "20'", category: 'Standard' },
  { code: '40HC', label: "40' High Cube, dry", category: 'Standard' },
  { code: '40STD', label: "40'", category: 'Standard' },

  // Open Top - cargo loaded from above (machinery, heavy cargo, construction material,
  // oversized cargo). Selecting one of these is what surfaces the in-gauge / out-of-gauge
  // question via the OOG characteristic chip.
  { code: '20OT', label: "1x20' OT - Open Top", category: 'Open Top' },
  { code: '40OT', label: "1x40' OT - Open Top", category: 'Open Top' },
  { code: '40OTHC', label: "1x40' OTHC - Open Top High Cube", category: 'Open Top' },

  // Reefer - temperature-controlled. Selecting one of these is what surfaces the temperature
  // range fields via the REEFER characteristic chip.
  { code: '20RF', label: "20' Standard Reefer", category: 'Reefer' },
  { code: '40RH', label: "40' High Cube Reefer", category: 'Reefer' },
  { code: '45RH', label: "45' Reefer / Pallet Wide (45RH / 45PW)", category: 'Reefer' },

  // Flat Rack
  { code: '20FR', label: "20' Flat Rack", category: 'Flat Rack' },
  { code: '40FR', label: "40' Flat Rack", category: 'Flat Rack' },
  { code: '40FRHC', label: "40' Flat Rack High Cube", category: 'Flat Rack' },

  // Platform
  { code: '20PL', label: "20' Platform", category: 'Platform' },
  { code: '40PL', label: "40' Platform", category: 'Platform' },
];

export const containerLabel = (code: string): string => SEA_CONTAINER_TYPES.find((c) => c.code === code)?.label || code;
