import * as T from 'three';

/**
 * The site around the unit, in world metres with the unit's centre at the origin. It is fixed: a longer
 * or shorter unit never resizes a floor or moves a rack.
 *
 * Three square rooms stand side by side across z - Fleet, the warehouse the unit is planned in, Docks -
 * and one hall runs the full width of all three along their far (+x) end. The offices stand in the hall.
 */
export const ROOM = 36;
export const HALL_DEPTH = 8;
/** Where the hall begins: the rooms' far edge. */
export const HALL_X = ROOM / 2;
/** Left to right as seen from the default camera, which looks along +x: -z is on the left. */
export const ROOMS = [
  { key: 'fleet', title: 'FLEET', z: -ROOM },
  { key: 'warehouse', title: 'WAREHOUSE', z: 0 },
  { key: 'docks', title: 'DOCKS', z: ROOM },
] as const;
/**
 * Each room's one way in: a door this wide in the middle of its hall-side edge. Everything else round a
 * room is closed, and the crew respects that - see ambientCrew.
 */
export const DOOR = 2.4;
/** Kerbs mark the room edges: thick enough to read as a boundary, low enough to see across the site. */
export const KERB = .12;
const KERB_HEIGHT = .3;
/** The door frame's clear height. */
const DOOR_HEIGHT = 2.3;

const slabColor = (dark: boolean, hall: boolean) => (dark ? (hall ? '#243247' : '#1e293b') : (hall ? '#cfdae1' : '#d9e3e8'));
const kerbColor = (dark: boolean) => (dark ? '#334155' : '#b8c6cf');
const frameColor = (dark: boolean) => (dark ? '#4b6475' : '#607e90');

const slab = (parent: T.Object3D, length: number, width: number, color: string, x = 0, z = 0) => {
  const mesh = new T.Mesh(new T.BoxGeometry(length, .16, width), new T.MeshStandardMaterial({ color, roughness: .75, metalness: .15 }));
  mesh.position.set(x, -.08, z); mesh.receiveShadow = true; parent.add(mesh); return mesh;
};

const kerb = (parent: T.Object3D, length: number, width: number, x: number, z: number, dark: boolean) => {
  const mesh = new T.Mesh(new T.BoxGeometry(length, KERB_HEIGHT, width), new T.MeshStandardMaterial({ color: kerbColor(dark), roughness: .7 }));
  mesh.position.set(x, KERB_HEIGHT / 2, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
};

/** The 20 cm floor grid, faint, as on the warehouse floor. */
const grid = (parent: T.Object3D, size: number, dark: boolean, x = 0, z = 0) => {
  const helper = new T.GridHelper(size, Math.round(size / .2), dark ? 0x3b4a5e : 0xbdcdd7, dark ? 0x2a3648 : 0xd0dce3);
  const material = helper.material as T.LineBasicMaterial; material.transparent = true; material.opacity = .55;
  helper.position.set(x, .01, z); parent.add(helper); return helper;
};

/** The same 20 cm grid over a rectangle, for the hall, which a square GridHelper cannot cover. */
const rectGrid = (parent: T.Object3D, length: number, width: number, dark: boolean, x = 0) => {
  const points: number[] = [];
  for (let i = 0; i <= Math.round(length / .2); i++) { const px = -length / 2 + i * .2; points.push(px, 0, -width / 2, px, 0, width / 2); }
  for (let i = 0; i <= Math.round(width / .2); i++) { const pz = -width / 2 + i * .2; points.push(-length / 2, 0, pz, length / 2, 0, pz); }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(points, 3));
  const lines = new T.LineSegments(geometry, new T.LineBasicMaterial({ color: dark ? 0x2a3648 : 0xd0dce3, transparent: true, opacity: .55 }));
  lines.position.set(x, .01, 0); parent.add(lines); return lines;
};

/** A room's name painted large on its floor by the hall side, readable from the default camera. */
const floorTitle = (parent: T.Object3D, text: string, dark: boolean, x: number) => {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = dark ? 'rgba(148,163,184,.28)' : 'rgba(71,85,105,.22)';
  ctx.font = 'bold 190px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, 138, 980);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  const plane = new T.Mesh(new T.PlaneGeometry(16, 4), new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  // Flat on the floor, lettering running across z so it reads upright looking along +x.
  plane.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
  plane.position.set(x, .02, 0); parent.add(plane);
};

/** A steel door frame standing in a gap in the kerb: two posts and a lintel, centred on z. */
const doorFrame = (parent: T.Object3D, x: number, dark: boolean) => {
  const material = new T.MeshStandardMaterial({ color: frameColor(dark), roughness: .5, metalness: .4 });
  const part = (w: number, h: number, d: number, y: number, z: number) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh);
  };
  for (const sign of [-1, 1]) part(.16, DOOR_HEIGHT, .16, DOOR_HEIGHT / 2, sign * (DOOR / 2 + .08));
  part(.16, .16, DOOR + .32, DOOR_HEIGHT + .08, 0);
};

/**
 * One square room: slab, kerbs round its edge with a single door to the hall, and - unless the caller lays its
 * own, as the warehouse does for snapping - the floor grid. Built around its own centre at floor level.
 */
export function createRoom({ dark, title = '', withGrid = true }: { dark: boolean; title?: string; withGrid?: boolean }) {
  const room = new T.Group(), half = ROOM / 2;
  slab(room, ROOM, ROOM, slabColor(dark, false));
  if (withGrid) grid(room, ROOM, dark);
  // Kerbs sit just inside the edge, so neighbouring rooms each keep their own.
  const inset = half - KERB / 2;
  kerb(room, ROOM, KERB, 0, -inset, dark);
  kerb(room, ROOM, KERB, 0, inset, dark);
  kerb(room, KERB, ROOM, -inset, 0, dark);
  const side = (ROOM - DOOR) / 2;
  for (const sign of [-1, 1]) kerb(room, KERB, side, inset, sign * (DOOR / 2 + side / 2), dark);
  doorFrame(room, inset, dark);
  if (title) floorTitle(room, title, dark, half - 5);
  return room;
}

/**
 * The hall across the far end of all three rooms: its own slab and grid, kerbs on its three open sides and
 * a safety line where it meets the rooms. Built with its near edge at x = 0, centred across z.
 */
export function createHall({ dark }: { dark: boolean }) {
  const hall = new T.Group(), width = ROOM * ROOMS.length;
  slab(hall, HALL_DEPTH, width, slabColor(dark, true), HALL_DEPTH / 2);
  rectGrid(hall, HALL_DEPTH, width, dark, HALL_DEPTH / 2);
  kerb(hall, KERB, width, HALL_DEPTH - KERB / 2, 0, dark);
  for (const sign of [-1, 1]) kerb(hall, HALL_DEPTH, KERB, HALL_DEPTH / 2, sign * (width / 2 - KERB / 2), dark);
  const line = new T.Mesh(new T.BoxGeometry(.1, .012, width), new T.MeshBasicMaterial({ color: '#facc15' }));
  line.position.set(.3, .02, 0); hall.add(line);
  return hall;
}
