import * as T from 'three';

import { brandLogo } from './brandLogo';
import { EQUIPMENT, RACK_SPAN, type Equipment } from './model';
import type { GaragePart } from './garageFleet';

/**
 * The line the containers stand on, in the garage's own frame, as far in from the room's edges as the
 * warehouse's outer rack rows: 15 m off centre across the room (the inner side, clear of the lane to the
 * door) and along the room as far as the rack uprights reach.
 */
const LINE = { x0: -(RACK_SPAN + 1.3), x1: RACK_SPAN + 1.3, z: 15 };
/** Air between neighbours in a tier, and between tiers. */
const GAP = .3, TIER_GAP = .04;
/** Steel shells are a little bigger than their internal planning dimensions. */
const SHELL = .12;
const TONES: Record<string, string> = { '40HC': '#1d4ed8', '40DV': '#b91c1c', '40OT': '#15803d', '20DV': '#d97706' };

/** Corrugated steel in the container's colour, rails top and bottom - the ground both long sides share. */
const panel = (e: Equipment, tone: string) => {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = tone; ctx.fillRect(0, 0, 1024, 256);
  const ribs = Math.round(e.length / .28);
  for (let i = 0; i < ribs; i++) { ctx.fillStyle = i % 2 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.06)'; ctx.fillRect(i * 1024 / ribs, 0, 1024 / ribs / 2, 256); }
  ctx.fillStyle = 'rgba(15,23,42,.55)'; ctx.fillRect(0, 0, 1024, 14); ctx.fillRect(0, 242, 1024, 14);
  return { canvas, ctx };
};
const texture = (canvas: HTMLCanvasElement) => { const t = new T.CanvasTexture(canvas); t.colorSpace = T.SRGBColorSpace; return t; };

/** The data side: the type's code across the middle and its inside dimensions under it. */
const dataTexture = (e: Equipment, tone: string) => {
  const { canvas, ctx } = panel(e, tone);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 120px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(e.code, 512, 118);
  ctx.font = 'bold 30px sans-serif'; ctx.fillText(e.openTop ? 'OPEN TOP' : `${e.length} × ${e.width} × ${e.height} m`, 512, 202);
  return texture(canvas);
};

/**
 * The brand side: the all-white Freightbook logo, the one cartons carry. The side is far wider than it is
 * tall on a texture this shape, so the logo is drawn squeezed across it and stretches back true on the box.
 */
const logoTexture = (e: Equipment, tone: string, height: number) => {
  const { canvas, ctx } = panel(e, tone), logo = brandLogo('white');
  if (logo) {
    const stretch = (1024 / e.length) / (256 / height), w = Math.min(e.length * .62, 6.2) * 1024 / e.length, h = (w / stretch) * logo.height / logo.width;
    ctx.drawImage(logo, (1024 - w) / 2, (256 - h) / 2, w, h);
  }
  return texture(canvas);
};

/**
 * GarageContainers: one of every container type the planner offers, each type's code painted on its side.
 * They stand end to end along the line first, longest first, filling as much of the room's length as they
 * can; only what no longer fits goes up a tier, filled the same way on top of the one below.
 */
export function buildGarageContainers() {
  const group = new T.Group(), parts: GaragePart[] = [];
  const types = EQUIPMENT.filter(e => !e.truck).sort((a, b) => b.length - a.length || b.height - a.height);
  // First fit, longest first: each container goes on the lowest tier with room left along the line.
  const tiers: number[] = [];
  const place = (length: number) => {
    let tier = tiers.findIndex(used => used + length <= LINE.x1 - LINE.x0 + 1e-6);
    if (tier < 0) { tiers.push(0); tier = tiers.length - 1; }
    const x = LINE.x0 + tiers[tier] + length / 2;
    tiers[tier] += length + GAP;
    return { tier, x };
  };
  // Each container rests on whatever is under it in the tier below - they are not all the same height.
  const placed: { tier: number; x0: number; x1: number; top: number }[] = [];
  const baseOf = (tier: number, x0: number, x1: number) => Math.max(0, ...placed.filter(p => p.tier === tier - 1 && p.x0 < x1 && p.x1 > x0).map(p => p.top + TIER_GAP));
  for (const equipment of types) {
    const length = equipment.length + SHELL * 2, width = equipment.width + SHELL * 2, height = equipment.height + SHELL * 2;
    const tone = TONES[equipment.code] ?? '#475569';
    const plain = new T.MeshStandardMaterial({ color: tone, roughness: .55, metalness: .3, emissive: 0xffffff, emissiveIntensity: 0 });
    // Data on the side facing the lane, the white logo on the side facing the warehouse wall.
    const data = new T.MeshStandardMaterial({ map: dataTexture(equipment, tone), roughness: .55, metalness: .3, emissive: 0xffffff, emissiveIntensity: 0 });
    const brand = new T.MeshStandardMaterial({ map: logoTexture(equipment, tone, height), roughness: .55, metalness: .3, emissive: 0xffffff, emissiveIntensity: 0 });
    // An open top shows its tarp instead of a steel roof.
    const roof = equipment.openTop ? new T.MeshStandardMaterial({ color: '#1e293b', roughness: .9, emissive: 0xffffff, emissiveIntensity: 0 }) : plain;
    const mesh = new T.Mesh(new T.BoxGeometry(length, height, width), [plain, plain, roof, plain, brand, data]);
    const spot = place(length);
    const base = baseOf(spot.tier, spot.x - length / 2, spot.x + length / 2);
    placed.push({ tier: spot.tier, x0: spot.x - length / 2, x1: spot.x + length / 2, top: base + height });
    mesh.position.set(spot.x, base + height / 2, LINE.z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const key = `container:${equipment.code}`;
    mesh.userData.garageKey = key;
    group.add(mesh);
    parts.push({ object: mesh, item: { kind: 'container', key, equipment }, centre: mesh.position.clone(), materials: [...new Set([plain, data, brand, roof])] });
  }
  return { group, parts, footprint: { x0: LINE.x0 - .3, x1: LINE.x1 + .3, z0: LINE.z - 1.6, z1: LINE.z + 1.6 } };
}
