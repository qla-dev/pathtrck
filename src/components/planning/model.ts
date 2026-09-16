export type Equipment = { code: string; length: number; width: number; height: number; payload: number; doorWidth: number; doorHeight: number; openTop: boolean; truck: boolean; registration?: string };
export type Cargo = { id: string; name: string; customer: string; length: number; width: number; height: number; weight: number; color: string; shape: 'box' | 'pallet' | 'pipe' | 'drum'; stackable: boolean; pickup: string; delivery: string; documents: string; x: number; y: number; z: number; placed: boolean; loadId?: string; reference?: string; rackKey?: string };
/** A real unit on a rack row: a warehouse stock row or a current tracking load, normalised from the rack APIs. */
export type RackItem = { key: string; side: 'warehouse' | 'tracking'; title: string; group: string; groupLabel: string; pallets: number; weight: number; volume: number; customer: string; status: string; storageType: string; storedSince: string; route: string; reference: string; loadId?: string; length?: number; width?: number; height?: number };
export type RackPage = { items: RackItem[]; page: number; lastPage: number; total: number };
/** Rack geometry shared by scene and view: bays 3 m apart along a row, three levels of three slots; the last bay stays free for "load more". */
// The warehouse is a fixed room (see rooms.ts): its racks never follow the unit's size. Bays stand 3 m apart,
// RACK_SPAN either side of the unit's centre.
export const RACK_SPAN = 15;
export const RACK_BAYS = Math.floor((2 * RACK_SPAN) / 3 + 1e-6) + 1;
export const RACK_SLOTS_PER_PAGE = (RACK_BAYS - 1) * 9;
export type Plan = { version: 1; name: string; equipment: Equipment; cargo: Cargo[] };
// Planning defaults, editable to match the actual unit. Dimensions are internal metres.
export const EQUIPMENT: Equipment[] = [
  { code: '40HC', length: 12.032, width: 2.352, height: 2.698, payload: 26500, doorWidth: 2.34, doorHeight: 2.597, openTop: false, truck: false },
  { code: '40DV', length: 12.032, width: 2.352, height: 2.393, payload: 26700, doorWidth: 2.34, doorHeight: 2.28, openTop: false, truck: false },
  { code: '20DV', length: 5.898, width: 2.352, height: 2.393, payload: 28200, doorWidth: 2.34, doorHeight: 2.28, openTop: false, truck: false },
  { code: '40OT', length: 12.029, width: 2.35, height: 2.38, payload: 26500, doorWidth: 2.34, doorHeight: 2.28, openTop: true, truck: false },
  { code: 'LTL', length: 7.2, width: 2.45, height: 2.4, payload: 6000, doorWidth: 2.4, doorHeight: 2.35, openTop: false, truck: true },
];
export const COLORS = ['#38bdf8', '#fbbf24', '#4ade80', '#fb7185', '#a78bfa', '#2dd4bf'];
const EPS = 0.0001;
export const volume = (c: Pick<Cargo, 'length' | 'width' | 'height'>) => c.length * c.width * c.height;
export function validCargo(c: Cargo) {
  return [c.length, c.width, c.height, c.weight].every(v => Number.isFinite(v) && v > 0) && c.length <= 30 && c.width <= 10 && c.height <= 10;
}
export function validEquipment(e: Equipment) {
  return [e.length, e.width, e.height, e.payload, e.doorWidth, e.doorHeight].every(v => Number.isFinite(v) && v > 0) && e.length <= 30 && e.width <= 10 && e.height <= 10 && e.doorWidth <= e.width && e.doorHeight <= e.height;
}
export function fits(c: Cargo, cargo: Cargo[], e: Equipment): boolean {
  if (!validCargo(c) || ![c.x, c.y, c.z].every(Number.isFinite) || c.x < -EPS || c.y < -EPS || c.z < -EPS || c.x + c.length > e.length + EPS || c.z + c.width > e.width + EPS || (!e.openTop && c.y + c.height > e.height + EPS)) return false;
  if (!e.openTop && (c.width > e.doorWidth + EPS || c.height > e.doorHeight + EPS)) return false;
  const others = cargo.filter(o => o.placed && o.id !== c.id);
  if (others.reduce((n, o) => n + o.weight, c.weight) > e.payload + EPS) return false;
  if (others.some(o => c.x < o.x + o.length - EPS && c.x + c.length > o.x + EPS && c.y < o.y + o.height - EPS && c.y + c.height > o.y + EPS && c.z < o.z + o.width - EPS && c.z + c.width > o.z + EPS)) return false;
  // Conservative full-footprint support on one stackable rectangular unit.
  if (c.y > EPS && !others.some(o => o.stackable && (o.shape === 'box' || o.shape === 'pallet') && Math.abs(o.y + o.height - c.y) < EPS && c.x >= o.x - EPS && c.z >= o.z - EPS && c.x + c.length <= o.x + o.length + EPS && c.z + c.width <= o.z + o.width + EPS)) return false;
  return true;
}
export function autoPlan(cargo: Cargo[], e: Equipment): Cargo[] {
  const result: Cargo[] = [];
  for (const original of cargo) {
    let chosen: Cargo | undefined;
    const xs = [...new Set([0, ...result.filter(c => c.placed).map(c => c.x + c.length)])].sort((a,b) => a-b);
    const zs = [...new Set([0, ...result.filter(c => c.placed).map(c => c.z + c.width)])].sort((a,b) => a-b);
    const ys = [...new Set([0, ...result.filter(c => c.placed && c.stackable).map(c => c.y + c.height)])].sort((a,b) => a-b);
    search: for (const y of ys) for (const x of xs) for (const z of zs) for (const rotated of [false, true]) {
      const c = { ...original, x, y, z, placed: true, length: rotated ? original.width : original.length, width: rotated ? original.length : original.width };
      if (fits(c, result, e)) { chosen = c; break search; }
    }
    result.push(chosen ?? { ...original, placed: false });
  }
  return result;
}
export function revalidate(cargo: Cargo[], e: Equipment): Cargo[] {
  const result: Cargo[] = [];
  for (const c of [...cargo].sort((a,b) => a.y-b.y)) result.push({ ...c, placed: c.placed && fits(c, result, e) });
  return cargo.map(c => result.find(r => r.id === c.id)!);
}
export function readPlan(value: unknown): Plan | null {
  const p = value as Plan;
  if (!p || p.version !== 1 || typeof p.name !== 'string' || !p.equipment || !validEquipment(p.equipment) || !Array.isArray(p.cargo) || p.cargo.length > 300) return null;
  if (new Set(p.cargo.map(c => c.id)).size !== p.cargo.length || p.cargo.some(c => !validCargo(c) || typeof c.id !== 'string' || typeof c.name !== 'string' || !/^#[0-9a-f]{6}$/i.test(c.color) || !['box','pallet','pipe','drum'].includes(c.shape) || ![c.x,c.y,c.z].every(Number.isFinite))) return null;
  return { ...p, cargo: revalidate(p.cargo, p.equipment) };
}
