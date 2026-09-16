import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { BUBBLE_TONE, measure, paint, plate, type ConsultSpot, type Footprint } from './ambientCrew';
import { type Equipment } from './model';
import { HALL_DEPTH, HALL_X, KERB } from './rooms';
import { SKILLS } from './skills';

const MODEL_URL = '/models/RobotExpressive.glb';
/** Mirrors the scene's own ground: a truck stands on its wheels, a container rests on its base. */
const groundOf = (e: Equipment) => (e.truck ? -.72 : -.24);
const FONT_FAMILY = '"FacebookSansBold", "Space Grotesk", sans-serif';

/** A 20ft container office: body height and depth, standing on a steel skid. */
const HEIGHT = 2.6, DEPTH = 2.44, SKID = .12;
const NAVY = '#0b1a33', STEEL = '#2c3644', SHELL = '#eef2f6';
const FEED = ['Stacking 40HC · 26 pallets', 'Route Sarajevo → Split', 'Customs docs ready', 'ETA updated · 14:20', 'Quote sent · €1,240', 'Fleet check · 4 trucks', 'Rebalancing axle load', 'Slot booked · Dock 3'];

/**
 * Offsets across the aisle, from the unit's centre line; the middle one is Lena's own and a little wider.
 * Each is manned: `role` is the tag over whoever sits inside, `status` what their bubble cycles through -
 * kept short on Lena's so it clears the hologram.
 */
type Spec = { width: number; title: string; subtitle: string; offset: number; role: string; status: string[]; lena?: boolean };
const OFFICES: Spec[] = [
  { width: 5.2, title: 'Dispatch', subtitle: 'POWERED BY LenaAI', offset: -6.9, role: 'Dispatcher', status: ['Assigning drivers', 'Booking docks', 'Calling carriers', 'Tracking trucks'] },
  { width: 6, title: 'LenaAI', subtitle: 'SMART FREIGHT OFFICE', offset: 0, role: 'LenaAI', status: ['Planning loads', 'Routing trucks', 'Quoting freight', 'Answering clients'], lena: true },
  { width: 5.2, title: 'Customs', subtitle: 'POWERED BY LenaAI', offset: 6.9, role: 'Customs Officer', status: ['Checking documents', 'Stamping T1', 'Clearing customs', 'Inspecting cargo'] },
];

/** An opening in the front wall, in metres from the wall's left edge and from the body's floor. */
type Hole = { x0: number; x1: number; y0: number; y1: number };
const doorOf = (): Hole => ({ x0: .55, x1: 1.45, y0: 0, y1: 2.1 });
const windowOf = (s: Spec): Hole => (s.lena ? { x0: 2.35, x1: s.width - .45, y0: .95, y1: 2.2 } : { x0: 2.5, x1: s.width - .8, y0: 1.15, y1: 2.1 });

/**
 * Where the row of offices stands, in the unit's model coordinates: backed right up to the hall's far
 * kerb (the skid overhangs the body by 5 cm), doors facing back up the aisle across the open hall.
 */
const frontOf = (e: Equipment) => e.length / 2 + HALL_X + HALL_DEPTH - KERB - .05 - DEPTH;

type Tick = (time: number, dt: number) => void;

const sparkle = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
  ctx.beginPath(); ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy); ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy); ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.fill();
};

const canvasTexture = (width: number, height: number) => {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 4;
  return { canvas, ctx: canvas.getContext('2d')!, texture };
};

/**
 * The front wall as one painted panel, livery and all, like a wrapped site office: white steel,
 * a hatched grey panel cut on the diagonal with the brand stripe along its edge, a name strip by
 * the door. Door and window are cut out of it (transparent), so the glass behind shows through.
 */
const paintFront = (ctx: CanvasRenderingContext2D, s: Spec, primary: string) => {
  const ppm = 180, cw = ctx.canvas.width, ch = ctx.canvas.height;
  const X = (m: number) => m * ppm, Y = (m: number) => (HEIGHT - m) * ppm;
  const door = doorOf(), win = windowOf(s);
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = '#f3f6f9'; ctx.fillRect(0, 0, cw, ch);
  // Corrugation, just enough to read as steel.
  ctx.strokeStyle = 'rgba(15,23,42,.07)'; ctx.lineWidth = 3;
  for (let m = .15; m < s.width; m += .3) { ctx.beginPath(); ctx.moveTo(X(m), 0); ctx.lineTo(X(m), ch); ctx.stroke(); }

  const top = X(s.width * .46), bottom = X(s.width * .34);
  const slant = (from: number, to: number) => { ctx.beginPath(); ctx.moveTo(top + from, 0); ctx.lineTo(top + to, 0); ctx.lineTo(bottom + to, ch); ctx.lineTo(bottom + from, ch); ctx.closePath(); };
  ctx.save();
  ctx.beginPath(); ctx.moveTo(top, 0); ctx.lineTo(cw, 0); ctx.lineTo(cw, ch); ctx.lineTo(bottom, ch); ctx.closePath();
  ctx.fillStyle = '#5f6f82'; ctx.fill(); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 5;
  for (let i = -ch; i < cw; i += 28) { ctx.beginPath(); ctx.moveTo(i, ch); ctx.lineTo(i + ch * .7, 0); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = primary; slant(-44, -14); ctx.fill();
  ctx.fillStyle = NAVY; slant(-64, -52); ctx.fill();
  // Brand stripe running along the foot of the wall.
  ctx.fillStyle = primary; ctx.fillRect(0, ch - 16, bottom - 64, 16);

  // Name strip beside the door, lettering running up it.
  const px0 = X(door.x1 + .1), px1 = X(door.x1 + .55), py0 = Y(2.1), py1 = Y(.35);
  ctx.fillStyle = s.lena ? primary : NAVY; ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
  ctx.fillStyle = '#ffffff'; sparkle(ctx, (px0 + px1) / 2, py0 + 44, 22);
  ctx.save(); ctx.translate((px0 + px1) / 2, (py0 + py1) / 2 + 24); ctx.rotate(-Math.PI / 2);
  ctx.font = `bold 50px ${FONT_FAMILY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s.lena ? 'LenaAI' : s.title.toUpperCase(), 0, 2);
  ctx.restore();

  ctx.strokeStyle = STEEL; ctx.lineWidth = 16;
  ctx.strokeRect(X(door.x0), Y(door.y1), X(door.x1 - door.x0), X(door.y1 - door.y0) + 20);
  ctx.strokeStyle = '#3b4656'; ctx.lineWidth = 26;
  ctx.strokeRect(X(win.x0), Y(win.y1), X(win.x1 - win.x0), X(win.y1 - win.y0));
  for (const h of [door, win]) ctx.clearRect(X(h.x0), Y(h.y1), X(h.x1 - h.x0), X(h.y1 - h.y0) + (h.y0 === 0 ? 30 : 0));
};

/** The roof sign: navy lightbox, name and sparkle on top, a brand strip underneath. */
const paintSign = (ctx: CanvasRenderingContext2D, s: Spec, primary: string) => {
  const cw = ctx.canvas.width, ch = ctx.canvas.height, band = ch * .66;
  const bg = ctx.createLinearGradient(0, 0, 0, band);
  bg.addColorStop(0, '#16325c'); bg.addColorStop(1, NAVY);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `bold ${Math.round(band * .62)}px ${FONT_FAMILY}`;
  const parts: [string, string][] = s.lena ? [['Lena', '#ffffff'], ['AI', primary]] : [[s.title, '#ffffff']];
  const star = band * .22, gap = band * .16;
  const textWidth = parts.reduce((sum, [text]) => sum + ctx.measureText(text).width, 0);
  let x = (cw - (star * 2 + gap + textWidth)) / 2;
  ctx.fillStyle = primary; sparkle(ctx, x + star, band / 2, star);
  x += star * 2 + gap;
  for (const [text, color] of parts) { ctx.fillStyle = color; ctx.fillText(text, x, band / 2 + 4); x += ctx.measureText(text).width; }
  ctx.fillStyle = primary; ctx.fillRect(0, band, cw, ch - band);
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round((ch - band) * .5)}px ${FONT_FAMILY}`;
  ctx.fillText(s.subtitle, cw / 2, band + (ch - band) / 2 + 2);
  ctx.strokeStyle = primary; ctx.lineWidth = 10; ctx.strokeRect(5, 5, cw - 10, ch - 10);
};

/**
 * Lena's wall screen: a live feed typing itself out, bars settling on new numbers, a utilisation
 * meter. Redrawn a few times a second, never per frame.
 */
const createScreen = (primary: string) => {
  const { canvas, ctx, texture } = canvasTexture(640, 320);
  const bars = Array.from({ length: 7 }, () => ({ value: Math.random(), target: Math.random() }));
  const done: string[] = [];
  let line = 0, typed = 0, meter = .6, meterTarget = .87, clock = 0, acc = 0;
  const draw = () => {
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#06101e'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(56,189,248,.06)'; ctx.lineWidth = 1;
    for (let gx = 0; gx < w; gx += 32) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
    for (let gy = 0; gy < h; gy += 32) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
    ctx.fillStyle = primary; sparkle(ctx, 34, 36, 14);
    ctx.font = `bold 28px ${FONT_FAMILY}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff'; ctx.fillText('LenaAI', 58, 38);
    ctx.fillStyle = '#64748b'; ctx.font = '16px monospace'; ctx.fillText('live planning', 170, 40);
    if (Math.floor(clock * 2) % 2 === 0) { ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(w - 82, 38, 6, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#22c55e'; ctx.font = 'bold 16px monospace'; ctx.fillText('LIVE', w - 68, 39);

    ctx.font = '17px monospace';
    const current = FEED[line % FEED.length].slice(0, typed);
    done.slice(-5).forEach((text, i) => { ctx.fillStyle = 'rgba(159,179,200,.8)'; ctx.fillText(`✓ ${text}`, 24, 88 + i * 34); });
    const y = 88 + Math.min(done.length, 5) * 34;
    ctx.fillStyle = '#e2e8f0'; ctx.fillText(`> ${current}`, 24, y);
    if (Math.floor(clock * 3) % 2 === 0) { ctx.fillStyle = primary; ctx.fillRect(24 + ctx.measureText(`> ${current}`).width + 2, y - 10, 10, 20); }

    const cx = 400, cy = 258, bw = 26;
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(cx - 12, 70, w - cx - 12, 200);
    bars.forEach((bar, i) => {
      const bh = 16 + bar.value * 160, grad = ctx.createLinearGradient(0, cy - bh, 0, cy);
      grad.addColorStop(0, primary); grad.addColorStop(1, 'rgba(14,116,144,.35)');
      ctx.fillStyle = grad; ctx.fillRect(cx + i * (bw + 8), cy - bh, bw, bh);
    });

    ctx.fillStyle = '#94a3b8'; ctx.font = '15px monospace'; ctx.fillText(`Load utilisation ${Math.round(meter * 100)}%`, 24, 290);
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(24, 302, 330, 8);
    ctx.fillStyle = primary; ctx.fillRect(24, 302, 330 * meter, 8);
    texture.needsUpdate = true;
  };
  draw();
  const tick: Tick = (_time, dt) => {
    clock += dt; acc += dt;
    if (acc < .09) return;
    const step = acc; acc = 0;
    typed += 1;
    if (typed > FEED[line % FEED.length].length + 6) { done.push(FEED[line % FEED.length]); if (done.length > 12) done.shift(); line++; typed = 0; }
    for (const bar of bars) { bar.value += (bar.target - bar.value) * Math.min(1, step * 2.5); if (Math.abs(bar.target - bar.value) < .02) bar.target = Math.random(); }
    meter += (meterTarget - meter) * Math.min(1, step * 1.5);
    if (Math.abs(meterTarget - meter) < .005) meterTarget = .72 + Math.random() * .24;
    draw();
  };
  return { texture, tick };
};

/**
 * LenaAI office row: three container site offices at the far end of the aisle - Dispatch, Lena's own
 * in the middle and Customs - with Lena sat at her desk behind the glass, working a live wall screen.
 *
 * Like the crew it owns a group under the scene rather than under the unit, which the scene rebuilds
 * on every change, so it carries the unit's offset itself - see update().
 */
export function createLenaOffice(scene: T.Scene) {
  const layer = new T.Group(); layer.visible = false; scene.add(layer);
  const roots: T.Group[] = [], ticks: Tick[] = [];
  const signs: { ctx: CanvasRenderingContext2D; texture: T.CanvasTexture; spec: Spec }[] = [];
  let show = 0, time = 0, disposed = false, built = false;
  type Seated = { mixer: T.AnimationMixer; sit: T.AnimationAction; head?: T.Object3D; swivel: T.Group; bubble: ReturnType<typeof plate>; spec: Spec; status: number; statusTimer: number; dots: number; dotTimer: number; phase: number };
  const seated: Seated[] = [];
  /**
   * Lena's office is pickable, and hovering it lifts it the way a rack unit lifts: a white emissive wash
   * over its own surfaces. Those that already glow - sign, lamps, strip - are left alone, and so is the
   * robot, whose materials its clones in the other offices share.
   */
  let lenaRoot: T.Group | null = null, lit = false;
  const washable: T.MeshStandardMaterial[] = [];
  /**
   * Each office's swivel chair, where on it the occupant sits and which way they face at work. The chair
   * stands in the office's own frame; `at` and `turn` are in the chair's, which turns for a visitor.
   */
  const seats: { swivel: T.Group; at: T.Vector3; turn: number }[] = [];

  const std = (color: string, extra: T.MeshStandardMaterialParameters = {}) => new T.MeshStandardMaterial({ color, roughness: .6, metalness: .1, ...extra });
  const glow = (color: string, opacity = 1) => new T.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, toneMapped: false, depthWrite: opacity >= 1, blending: opacity < 1 ? T.AdditiveBlending : T.NormalBlending, side: T.DoubleSide });
  const mesh = (parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material | T.Material[], x: number, y: number, z: number, shadow = true) => {
    const m = new T.Mesh(geometry, material); m.position.set(x, y, z);
    m.castShadow = shadow; m.receiveShadow = shadow; parent.add(m); return m;
  };
  const box = (parent: T.Object3D, w: number, h: number, d: number, material: T.Material | T.Material[], x: number, y: number, z: number, shadow = true) => mesh(parent, new T.BoxGeometry(w, h, d), material, x, y, z, shadow);

  const build = (s: Spec, index: number, primary: string) => {
    // Built facing +z with x along its width; update() turns it so the doors face back up the aisle.
    const root = new T.Group(), W = s.width, top = SKID + HEIGHT, front = DEPTH / 2;
    const door = doorOf(), win = windowOf(s), lx = (m: number) => m - W / 2;
    const steel = std(STEEL, { metalness: .5, roughness: .45 }), shell = std(SHELL, { roughness: .5 });

    box(root, W + .1, SKID, DEPTH + .1, steel, 0, SKID / 2, 0);
    box(root, W - .1, .04, DEPTH - .1, std(s.lena ? '#b98d5f' : '#8f9aa6'), 0, SKID + .02, 0);
    box(root, W, HEIGHT, .05, shell, 0, SKID + HEIGHT / 2, -front + .025);
    for (const side of [-1, 1]) box(root, .05, HEIGHT, DEPTH, shell, side * (W / 2 - .025), SKID + HEIGHT / 2, 0);
    box(root, W + .12, .08, DEPTH + .12, std('#dfe5ec'), 0, top + .04, 0);
    for (const y of [SKID + .08, top - .08]) box(root, W + .1, .16, .12, steel, 0, y, front);
    for (const x of [-1, 1]) for (const z of [-1, 1]) box(root, .14, HEIGHT, .14, steel, x * W / 2, SKID + HEIGHT / 2, z * front);

    const wall = canvasTexture(Math.round(W * 180), Math.round(HEIGHT * 180));
    paintFront(wall.ctx, s, primary);
    mesh(root, new T.PlaneGeometry(W, HEIGHT), std('#ffffff', { map: wall.texture, alphaTest: .5, side: T.DoubleSide, roughness: .5 }), 0, SKID + HEIGHT / 2, front);

    // Tinted glass door with a bar handle, a grated step and a lamp over it.
    const doorX = lx((door.x0 + door.x1) / 2);
    box(root, door.x1 - door.x0 - .04, door.y1 - .02, .03, std('#16283c', { transparent: true, opacity: .92, roughness: .08, metalness: .3 }), doorX, SKID + door.y1 / 2, front - .02, false);
    box(root, .03, .55, .05, std('#cbd5e1', { metalness: .9, roughness: .2 }), lx(door.x1) - .14, SKID + 1.05, front + .02);
    box(root, 1.3, .1, .55, std('#6b7684', { metalness: .6, roughness: .5 }), doorX, .05, front + .3);
    box(root, .32, .05, .12, std('#fff3c4', { emissive: '#ffe9a3', emissiveIntensity: 2 }), doorX, SKID + door.y1 + .16, front + .08, false);

    // Clear window, so whoever is inside is plainly in view.
    const winX = lx((win.x0 + win.x1) / 2), winY = SKID + (win.y0 + win.y1) / 2;
    box(root, win.x1 - win.x0, win.y1 - win.y0, .02, std('#bfe6ff', { transparent: true, opacity: .14, roughness: 0, metalness: .1, depthWrite: false }), winX, winY, front - .03, false);
    if (!s.lena) box(root, .05, win.y1 - win.y0, .05, steel, winX, winY, front - .03);
    box(root, 1.2, .02, .4, std('#ffffff', { emissive: '#f1f5ff', emissiveIntensity: 1.4 }), winX, top - .03, 0, false);

    // Roof lightbox on two short legs, overhanging the front edge.
    const signW = s.lena ? 3 : 2.3, signH = s.lena ? .82 : .62, signX = -W / 2 + signW / 2 + .15, signY = top + .08 + .14 + signH / 2;
    const face = canvasTexture(1024, Math.round(1024 * signH / signW));
    paintSign(face.ctx, s, primary);
    signs.push({ ctx: face.ctx, texture: face.texture, spec: s });
    const navy = std(NAVY, { metalness: .3 });
    const signFace = std('#ffffff', { map: face.texture, emissive: '#ffffff', emissiveMap: face.texture, emissiveIntensity: .85 });
    box(root, signW, signH, .18, [navy, navy, navy, navy, signFace, navy], signX, signY, front - .06);
    for (const dx of [-signW / 3, signW / 3]) box(root, .07, .16, .07, steel, signX + dx, top + .16, front - .1);
    ticks.push(time => { signFace.emissiveIntensity = .8 + .15 * Math.sin(time * 2 + index); });

    // An LED strip under the roof line with a pulse chasing along it, each office out of step.
    const strip = canvasTexture(256, 4);
    strip.ctx.fillStyle = '#000000'; strip.ctx.fillRect(0, 0, 256, 4);
    strip.ctx.globalAlpha = .35; strip.ctx.fillStyle = primary; strip.ctx.fillRect(0, 0, 256, 4); strip.ctx.globalAlpha = 1;
    const pulse = strip.ctx.createLinearGradient(0, 0, 90, 0);
    pulse.addColorStop(0, 'rgba(255,255,255,0)'); pulse.addColorStop(.5, '#ffffff'); pulse.addColorStop(1, 'rgba(255,255,255,0)');
    strip.ctx.fillStyle = pulse; strip.ctx.fillRect(0, 0, 90, 4);
    strip.texture.wrapS = T.RepeatWrapping; strip.texture.repeat.x = Math.round(W / 2);
    const stripMat = new T.MeshBasicMaterial({ map: strip.texture, toneMapped: false });
    box(root, W - .2, .035, .035, stripMat, 0, top - .2, front + .075, false);
    ticks.push((_t, dt) => { strip.texture.offset.x -= dt * .35; });

    // Every office is manned: a desk, a chair and someone sat in it. Dispatch and Customs work with
    // their backs to the window, at a desk against the back wall; Lena's desk is under the window, so
    // she looks out over the warehouse instead. `toward` is the side of the office the desk stands on.
    const toward = s.lena ? 1 : -1, deskZ = toward * (front - .45), deskTop = SKID + .74;
    box(root, s.lena ? 2 : 1.4, .05, .62, std('#e7ebf0', { roughness: .4 }), winX, deskTop, deskZ);
    for (const side of [-1, 1]) box(root, .05, .72, .55, std('#9aa5b1'), winX + side * (s.lena ? .95 : .65), SKID + .37, deskZ);
    box(root, .6, .36, .03, std('#111827', { metalness: .4 }), winX, deskTop + .3, deskZ + toward * .1);
    box(root, .05, .2, .05, std('#374151'), winX, deskTop + .12, deskZ + toward * .12);
    box(root, .46, .02, .15, std('#cbd5e1'), winX, deskTop + .035, deskZ - toward * .14);
    mesh(root, new T.CylinderGeometry(.04, .035, .1, 16), std('#ffffff'), winX + .55, deskTop + .075, deskZ - toward * .08);
    // A swivel chair: seat, back and whoever sits in it turn together on the fixed stem and base.
    const chairZ = toward * (front - 1.08), swivel = new T.Group();
    swivel.position.set(winX, 0, chairZ); root.add(swivel);
    box(swivel, .48, .07, .46, std('#1f2937'), 0, SKID + .46, 0);
    box(swivel, .46, .42, .06, std('#1f2937'), 0, SKID + .72, -toward * .26);
    mesh(root, new T.CylinderGeometry(.03, .03, .36, 10), std('#6b7280', { metalness: .8 }), winX, SKID + .24, chairZ);
    mesh(root, new T.CylinderGeometry(.26, .26, .04, 5), std('#374151'), winX, SKID + .06, chairZ);
    // The model faces +z unturned, so Lena needs no turn and the other two a half turn.
    seats[index] = { swivel, at: new T.Vector3(0, SKID + .38, toward * .04), turn: s.lena ? 0 : Math.PI };

    if (s.lena) {
      const screen = createScreen(primary);
      ticks.push(screen.tick);
      // Hung high, so it still reads over her head from the window.
      box(root, 2.3, 1.1, .04, std('#0f172a', { metalness: .5 }), winX, SKID + 1.98, -front + .07);
      mesh(root, new T.PlaneGeometry(2.2, 1), new T.MeshBasicMaterial({ map: screen.texture, toneMapped: false }), winX, SKID + 1.98, -front + .095, false);
      // Her monitor mirrors the wall, turned round to face her.
      const monitor = mesh(root, new T.PlaneGeometry(.56, .32), new T.MeshBasicMaterial({ map: screen.texture, toneMapped: false }), winX, deskTop + .3, deskZ + .08, false);
      monitor.rotation.y = Math.PI;
      const light = new T.PointLight('#d7f0ff', 6, 5, 1.6); light.position.set(winX, top - .35, 0); root.add(light);

      // Plant by the door.
      mesh(root, new T.CylinderGeometry(.17, .13, .36, 16), std('#e6e9ee'), W / 2 - .38, .18, front + .38);
      const leaf = std('#3f9a5c', { flatShading: true, roughness: .8 });
      mesh(root, new T.IcosahedronGeometry(.3, 0), leaf, W / 2 - .38, .6, front + .38);
      mesh(root, new T.IcosahedronGeometry(.2, 0), leaf, W / 2 - .3, .88, front + .34);

      // Hologram over the roof: a wireframe core in two turning rings, fed by a beam from a projector.
      const holo = new T.Group(), holoX = W / 2 - .45, holoY = top + 1.95;
      holo.position.set(holoX, holoY, 0); root.add(holo);
      mesh(root, new T.CylinderGeometry(.28, .34, .12, 24), std('#1e293b', { metalness: .6 }), holoX, top + .14, 0);
      const lens = mesh(root, new T.CylinderGeometry(.18, .18, .02, 24), glow(primary), holoX, top + .21, 0, false);
      const beamMat = glow(primary, .14);
      const beam = mesh(root, new T.CylinderGeometry(.06, .5, holoY - top - .22, 24, 1, true), beamMat, holoX, (holoY + top + .22) / 2, 0, false);
      beam.renderOrder = 2;
      const core = mesh(holo, new T.IcosahedronGeometry(.15, 1), glow('#e0f7ff'), 0, 0, 0, false);
      const shellMat = glow(primary, .75); shellMat.wireframe = true;
      const cage = mesh(holo, new T.IcosahedronGeometry(.42, 1), shellMat, 0, 0, 0, false);
      const ring = mesh(holo, new T.TorusGeometry(.62, .012, 8, 72), glow(primary, .8), 0, 0, 0, false);
      const ring2 = mesh(holo, new T.TorusGeometry(.78, .008, 8, 72), glow(primary, .45), 0, 0, 0, false);
      ring.rotation.x = Math.PI / 2.4; ring2.rotation.x = Math.PI / 1.8;
      ticks.push((time, dt) => {
        cage.rotation.y += dt * .6; cage.rotation.x += dt * .25;
        ring.rotation.z += dt * .9; ring2.rotation.y -= dt * .5;
        holo.position.y = holoY + Math.sin(time * 1.6) * .07;
        core.scale.setScalar(1 + .15 * Math.sin(time * 3));
        beamMat.opacity = .1 + .05 * Math.sin(time * 3);
        lens.scale.setScalar(1 + .06 * Math.sin(time * 3));
      });

      // Satellite dish behind the sign, slowly sweeping.
      const dish = new T.Group(); dish.position.set(-W / 2 + .8, top + .08, -front + .6); root.add(dish);
      mesh(dish, new T.CylinderGeometry(.03, .04, .4, 10), steel, 0, .2, 0);
      const bowl = mesh(dish, new T.SphereGeometry(.38, 24, 10, 0, Math.PI * 2, 0, .95), std('#e5e9ef', { side: T.DoubleSide, metalness: .3 }), 0, .42, 0);
      bowl.rotation.x = Math.PI * .72;
      ticks.push(time => { dish.rotation.y = Math.sin(time * .3) * .9; });
    } else {
      // Rooftop mast with a blinking aircraft light, and an AC unit on the outer end wall.
      const mastX = W / 2 - .35, mastZ = -front + .35;
      mesh(root, new T.CylinderGeometry(.02, .025, .9, 8), steel, mastX, top + .08 + .45, mastZ);
      const beacon = mesh(root, new T.SphereGeometry(.05, 12, 8), glow('#ff3b3b'), mastX, top + .08 + .93, mastZ, false);
      ticks.push(time => { beacon.visible = (time + index * .7) % 1.4 < .2; });

      const out = Math.sign(s.offset);
      box(root, .34, .52, .74, std('#cfd6de', { metalness: .4 }), out * (W / 2 + .17), SKID + 1.7, -.3);
      const grille = mesh(root, new T.CylinderGeometry(.21, .21, .02, 24), std('#334155'), out * (W / 2 + .345), SKID + 1.7, -.3);
      grille.rotation.z = Math.PI / 2;
      const fan = new T.Group(); fan.position.set(out * (W / 2 + .36), SKID + 1.7, -.3); root.add(fan);
      for (let k = 0; k < 3; k++) { const blade = box(fan, .01, .36, .07, std('#94a3b8'), 0, 0, 0, false); blade.rotation.x = k * Math.PI / 3; }
      ticks.push((_t, dt) => { fan.rotation.x += dt * 9; });

      const glowMat = new T.MeshBasicMaterial({ color: primary, toneMapped: false });
      box(root, .52, .28, .01, glowMat, winX, deskTop + .3, deskZ - .08, false);
    }

    if (s.lena) {
      // Collected now, before anyone sits in the chair.
      root.traverse(obj => {
        const material = (obj as T.Mesh).material as T.MeshStandardMaterial | undefined;
        if (material?.isMeshStandardMaterial && !material.emissiveMap && material.emissive.getHex() === 0 && !washable.includes(material)) washable.push(material);
      });
      lenaRoot = root;
    }
    layer.add(root); roots.push(root);
  };

  const place = (e: Equipment) => {
    const front = frontOf(e), ground = groundOf(e);
    layer.position.set(-e.length / 2, Math.pow(1 - show, 3) * 9, -e.width / 2);
    roots.forEach((root, i) => { root.position.set(front + DEPTH / 2, ground, e.width / 2 + OFFICES[i].offset); root.rotation.y = -Math.PI / 2; });
  };

  return {
    load(e: Equipment) {
      if (built) return;
      built = true;
      const primary = BUBBLE_TONE();
      OFFICES.forEach((s, i) => build(s, i, primary));

      // The sign font may still be loading; letter the signs again once it lands.
      void document.fonts?.ready.then(() => { if (disposed) return; for (const sign of signs) { paintSign(sign.ctx, sign.spec, primary); sign.texture.needsUpdate = true; } });
      place(e);

      new GLTFLoader().load(MODEL_URL, gltf => {
        if (disposed) return;
        const clip = gltf.animations.find(a => a.name === 'Sitting');
        if (!clip) return;
        const height = new T.Box3().setFromObject(gltf.scene).getSize(new T.Vector3()).y || 1;
        // One bubble size for all three, so the longest status fits wherever it comes up.
        const widest = [SKILLS.receive.label, ...OFFICES.flatMap(s => s.status)].reduce((a, b) => (b.length > a.length ? b : a));
        OFFICES.forEach((spec, i) => {
          const root = SkeletonUtils.clone(gltf.scene), { swivel, at, turn } = seats[i];
          root.scale.setScalar(1.75 / height);
          root.traverse(obj => { if ((obj as T.Mesh).isMesh) obj.castShadow = true; });
          const mixer = new T.AnimationMixer(root);
          const sit = mixer.clipAction(clip); sit.clampWhenFinished = true; sit.loop = T.LoopOnce; sit.play();
          // The head drifts side to side, laid over the sitting pose after the mixer runs.
          let head: T.Object3D | undefined;
          root.traverse(obj => { if (!head && (obj as T.Bone).isBone && obj.name === 'Head') head = obj; });
          root.position.copy(at); root.rotation.y = turn;
          const tag = plate(measure(spec.role)); paint(tag, spec.role, '#132638');
          const bubble = plate(measure(`${widest}...`)); paint(bubble, spec.status[0], BUBBLE_TONE());
          // Labels hang over the chair from the office itself, so they stay put while the chair turns.
          tag.sprite.position.set(swivel.position.x, SKID + HEIGHT + .55, swivel.position.z);
          bubble.sprite.position.set(swivel.position.x, SKID + HEIGHT + 1.17, swivel.position.z);
          swivel.add(root); roots[i].add(tag.sprite, bubble.sprite);
          // Out of step with each other, so the three never turn their heads or change bubbles together.
          seated.push({ mixer, sit, head, swivel, bubble, spec, status: 0, statusTimer: i * 1.7, dots: 0, dotTimer: 0, phase: i * 2.1 });
        });
      }, undefined, () => {});
    },

    /** Whether a ray (already set from the pointer) lands on Lena's office - only once it is standing. */
    pick(raycaster: T.Raycaster): boolean {
      if (!lenaRoot || !layer.visible || show < .9) return false;
      return raycaster.intersectObject(lenaRoot, true).some(hit => (hit.object as T.Mesh).isMesh);
    },

    hover(on: boolean) {
      if (on === lit) return;
      lit = on;
      for (const material of washable) { material.emissive.setHex(on ? 0xffffff : 0); material.emissiveIntensity = on ? .35 : 1; }
    },

    /** Eases the row in and out like the racks, then ticks the signs, screen, hologram and the three at their desks. */
    update(dt: number, e: Equipment, visible: boolean, still = false, visitors: string[] = []) {
      if (!built) return;
      const was = show;
      show = still ? (visible ? 1 : 0) : T.MathUtils.lerp(show, visible ? 1 : 0, (1 - Math.pow(.002, dt)) * .6);
      layer.visible = show > .01;
      place(e);
      if (!layer.visible) return;
      // Coming back into view, they sit down again rather than being found already seated.
      if (was <= .01) for (const w of seated) w.sit.reset().play();
      if (still) return;
      time += dt;
      for (const tick of ticks) tick(time, dt);
      for (const w of seated) {
        w.mixer.update(dt);
        // Receiving a visitor: swing round to the window, and back to the desk once they have gone.
        const visited = visitors.includes(w.spec.title);
        w.swivel.rotation.y = T.MathUtils.lerp(w.swivel.rotation.y, visited && !w.spec.lena ? Math.PI : 0, 1 - Math.pow(.01, dt));
        if (w.head) w.head.rotation.y = Math.sin(time * .45 + w.phase) * .22;
        w.dotTimer += dt; w.statusTimer += dt;
        if (w.statusTimer > 5) { w.statusTimer = 0; w.status = (w.status + 1) % w.spec.status.length; }
        if (w.dotTimer > .45) { w.dotTimer = 0; w.dots = (w.dots + 1) % 4; paint(w.bubble, (visited ? SKILLS.receive.label : w.spec.status[w.status]) + '.'.repeat(w.dots), BUBBLE_TONE()); }
      }
    },

    /**
     * A spot outside each office window, where a crew member stands to consult whoever sits inside.
     * Only while the row is actually standing, like the footprints.
     */
    consultSpots(e: Equipment): ConsultSpot[] {
      if (!built || show < .5) return [];
      const front = frontOf(e);
      // The office's own x runs along the aisle's z once it is turned, so the seat lines the spot up.
      return OFFICES.map((s, i) => ({ id: s.title, x: front - .6, z: e.width / 2 + s.offset + seats[i].swivel.position.x }));
    },

    /** The offices' ground plan, for the crew to walk around - only while the row is actually standing. */
    footprints(e: Equipment): Footprint[] {
      if (!built || show < .5) return [];
      const front = frontOf(e);
      return OFFICES.map(s => ({ x0: front - .3, x1: front + DEPTH + .1, z0: e.width / 2 + s.offset - s.width / 2 - .45, z1: e.width / 2 + s.offset + s.width / 2 + .45 }));
    },

    dispose() {
      disposed = true;
      for (const w of seated) w.mixer.stopAllAction();
      layer.traverse(obj => {
        const m = obj as T.Mesh;
        m.geometry?.dispose();
        if (m.material) for (const material of Array.isArray(m.material) ? m.material : [m.material]) {
          const std = material as T.MeshStandardMaterial;
          std.map?.dispose(); std.emissiveMap?.dispose(); material.dispose();
        }
      });
      scene.remove(layer);
      roots.length = 0; ticks.length = 0; seated.length = 0;
    },
  };
}
