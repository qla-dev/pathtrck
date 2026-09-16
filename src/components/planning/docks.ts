import * as T from 'three';

import { BELT_TOP, MAIN_BELT_X, SPEED } from './conveyor';
import type { Footprint } from './ambientCrew';
import type { Equipment } from './model';
import { ROOM, ROOMS } from './rooms';

/** Mirrors the scene's own ground: a truck stands on its wheels, a container rests on its base. */
const groundOf = (e: Equipment) => (e.truck ? -.72 : -.24);
export const DOCKS_Z = ROOMS.find(room => room.key === 'docks')!.z;

/*
 * Everything below is in the Docks room's own frame: its centre at the origin, x along the room as in the
 * world, z across it, -z being the edge it shares with the warehouse - where the dock wall stands.
 */
/** How often a package leaves the main belt for the docks, in seconds. */
export const DOCK_EVERY = 10;
const WALL = { height: 7, thickness: .5, band: 2.4 };
/** The wall's inner face, which the belts run up to and the doors sit in. */
export const WALL_FACE = -ROOM / 2 + WALL.thickness;
export const DOORS = [-8, 0, 8];
const DOOR_W = 3.2, DOOR_H = 3.6;
/** The docks belt: narrower than the main one. The packages branch off to their doors at SPLIT_Z. */
const BELT_W = 1.4, SPLIT_Z = -6;
const LINE_STEP = .5;

/**
 * The belts wall the doors off from the rest of the room, so the crew crosses them on step-over stiles:
 * one on the belt coming in, one each side of the split. Each is a bridge high enough for packages to
 * pass under, with steps up and down; `alongX` is the belt it spans. They are the only gaps in the belts'
 * footprints.
 */
const STILES = [{ x: -12, z: 0 }, { x: -4, z: SPLIT_Z }, { x: 4, z: SPLIT_Z }];
const STILE_TOP = 1.35, STILE_FLAT = BELT_W / 2 + .2, STILE_RAMP = 1.4, STILE_HALF = .55;
/** How high someone standing here is lifted by a stile - 0 anywhere off one. In the room's own frame. */
export const stileLift = (x: number, z: number) => {
  for (const stile of STILES) {
    if (Math.abs(x - stile.x) > STILE_HALF) continue;
    const across = Math.abs(z - stile.z);
    if (across <= STILE_FLAT) return STILE_TOP;
    if (across <= STILE_FLAT + STILE_RAMP) return STILE_TOP * (1 - (across - STILE_FLAT) / STILE_RAMP);
  }
  return 0;
};

/** Where a dock worker stands to inspect each door: beside it, clear of its belt, facing the wall. */
export const DOOR_SPOTS = DOORS.map(x => new T.Vector2(x + 2.2, WALL_FACE + 1.3));
/** The open floor every walk to a door starts from, in from the room's door. */
export const DOCK_ENTRY = new T.Vector2(12, 4);
/**
 * The walk from DOCK_ENTRY to a door's spot, over whichever stiles it takes: Dock 3's side is open floor,
 * Dock 2 is over the right-hand split stile, Dock 1 over the inbound stile and then the left-hand one.
 */
export const DOOR_ROUTES: T.Vector2[][] = [
  [DOCK_ENTRY, new T.Vector2(-12, 4), new T.Vector2(-12, -3), new T.Vector2(-4, -3), new T.Vector2(-4, -10), new T.Vector2(DOOR_SPOTS[0].x, -10), DOOR_SPOTS[0]],
  [DOCK_ENTRY, new T.Vector2(12, -3), new T.Vector2(4, -3), new T.Vector2(4, -10), new T.Vector2(DOOR_SPOTS[1].x, -10), DOOR_SPOTS[1]],
  [DOCK_ENTRY, new T.Vector2(12, DOOR_SPOTS[2].y), DOOR_SPOTS[2]],
];

/** A package's way from the main belt to its door: in along the middle, down, across, and up to the wall. */
const pathTo = (door: number) => [
  new T.Vector2(MAIN_BELT_X, 0), new T.Vector2(0, 0), new T.Vector2(0, SPLIT_Z),
  new T.Vector2(DOORS[door], SPLIT_Z), new T.Vector2(DOORS[door], WALL_FACE), new T.Vector2(DOORS[door], WALL_FACE - .8),
];
const lengthOf = (path: T.Vector2[]) => path.slice(1).reduce((sum, point, i) => sum + point.distanceTo(path[i]), 0);
const pointAt = (path: T.Vector2[], distance: number) => {
  let left = distance;
  for (let i = 1; i < path.length; i++) {
    const leg = path[i].distanceTo(path[i - 1]);
    if (left <= leg && leg > 0) return path[i - 1].clone().lerp(path[i], left / leg);
    left -= leg;
  }
  return path[path.length - 1].clone();
};

/** Black belt with pale cross lines, oriented for a belt along x or along z. */
const beltTexture = (alongX: boolean, length: number) => {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#07090c'; ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#3a4452';
  if (alongX) ctx.fillRect(28, 0, 8, 64); else ctx.fillRect(0, 28, 64, 8);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace; texture.wrapS = texture.wrapT = T.RepeatWrapping;
  if (alongX) texture.repeat.set(length / LINE_STEP, 1); else texture.repeat.set(1, length / LINE_STEP);
  return texture;
};

/** Blue ribbed cladding above a grey block band, as on a warehouse's dock side. */
const wallTexture = () => {
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 400;
  const ctx = canvas.getContext('2d')!, band = 400 * WALL.band / WALL.height;
  ctx.fillStyle = '#1e4f8f'; ctx.fillRect(0, 0, 2048, 400 - band);
  for (let x = 0; x < 2048; x += 14) { ctx.fillStyle = x % 28 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.18)'; ctx.fillRect(x, 0, 6, 400 - band); }
  ctx.fillStyle = '#8b9199'; ctx.fillRect(0, 400 - band, 2048, band);
  ctx.strokeStyle = 'rgba(40,44,52,.35)'; ctx.lineWidth = 2;
  for (let row = 0; row * 18 < band; row++) {
    const y = 400 - band + row * 18;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(2048, y); ctx.stroke();
    for (let x = row % 2 ? 0 : 20; x < 2048; x += 40) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 18); ctx.stroke(); }
  }
  ctx.fillStyle = '#374151'; ctx.fillRect(0, 400 - band - 6, 2048, 6);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  return texture;
};

/** A roll-up door's white panels with a pair of oval windows. */
const doorTexture = () => {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 288;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#eef1f4'; ctx.fillRect(0, 0, 256, 288);
  ctx.strokeStyle = 'rgba(71,85,105,.35)'; ctx.lineWidth = 3;
  for (let y = 36; y < 288; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
  ctx.fillStyle = '#1f2937';
  for (const x of [70, 186]) { ctx.beginPath(); ctx.ellipse(x, 90, 34, 13, 0, 0, Math.PI * 2); ctx.fill(); }
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  return texture;
};

const signTexture = (text: string) => {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 80;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#111827'; ctx.fillRect(0, 0, 256, 80);
  ctx.fillStyle = '#facc15'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 42);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  return texture;
};

type Door = { panel: T.Object3D; open: number; red: T.MeshStandardMaterial; green: T.MeshStandardMaterial };
type Parcel = { door: number; distance: number; path: T.Vector2[]; length: number; size: T.Vector3; spin: number };

/**
 * Docks: the room right of the warehouse. The belts are crossed on stiles - see STILES. A tall warehouse wall stands along its warehouse side with three
 * roll-up dock doors, DOCK 1-3. Every DOCK_EVERY seconds a package leaves the main conveyor where it passes
 * the room's middle, rides in on a belt to a split in the middle of the room and on to one of the doors in
 * turn. The door rolls up as the package comes to it - its light turning from red to green - and closes
 * again once the package is through.
 *
 * Owns a group under the scene in world coordinates, like the garage.
 */
export function createDocks(scene: T.Scene) {
  const group = new T.Group(); group.visible = false; scene.add(group);
  const doors: Door[] = [], belts: { texture: T.CanvasTexture; axis: 'x' | 'y'; dir: number }[] = [], parcels: Parcel[] = [];
  /** Each parcel's colour, slot for slot with `parcels`. */
  const parcelTones: string[] = [];
  let packages: T.InstancedMesh | null = null, nextDoor = 0;
  const POOL = 10;
  const matrix = new T.Matrix4(), rotation = new T.Quaternion(), up = new T.Vector3(0, 1, 0), position = new T.Vector3(), none = new T.Vector3();
  const colour = new T.Color();

  const add = (geometry: T.BufferGeometry, material: T.Material | T.Material[], x: number, y: number, z: number, parent: T.Object3D = group) => {
    const mesh = new T.Mesh(geometry, material); mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };

  /**
   * A straight run of belt between two points on one axis, rails along both sides. An end that is a
   * junction stops half a belt short of it, so no two runs ever overlap: the junction's own plate fills
   * the square where they meet.
   */
  const belt = (from: T.Vector2, to: T.Vector2, black: T.Material, steel: T.Material, joints: { from?: boolean; to?: boolean } = {}) => {
    const alongX = from.y === to.y, sign = alongX ? Math.sign(to.x - from.x) : Math.sign(to.y - from.y);
    const start = (alongX ? from.x : from.y) + (joints.from ? sign * BELT_W / 2 : 0);
    const end = (alongX ? to.x : to.y) - (joints.to ? sign * BELT_W / 2 : 0);
    const length = Math.abs(end - start), mid = (start + end) / 2;
    const cx = alongX ? mid : from.x, cz = alongX ? from.y : mid;
    const texture = beltTexture(alongX, length);
    const top = new T.MeshStandardMaterial({ map: texture, roughness: .9 });
    add(new T.BoxGeometry(alongX ? length : BELT_W, BELT_TOP, alongX ? BELT_W : length), [black, black, top, black, black, black], cx, BELT_TOP / 2, cz);
    // Top face: u runs with +x and v against +z, so scrolling shifts the lines against the offset on x and with it on z.
    belts.push({ texture, axis: alongX ? 'x' : 'y', dir: alongX ? -Math.sign(to.x - from.x) : Math.sign(to.y - from.y) });
    for (const side of [-1, 1]) {
      if (alongX) add(new T.BoxGeometry(length, .12, .08), steel, cx, BELT_TOP + .06, cz + side * (BELT_W / 2 + .04));
      else add(new T.BoxGeometry(.08, .12, length), steel, cx + side * (BELT_W / 2 + .04), BELT_TOP + .06, cz);
    }
  };

  /**
   * Where runs meet: a turntable. A steel plate the size of the belt's width, level with the belts, with a
   * ring of rollers on it and a low post at each corner where the rails end.
   */
  const junction = (at: T.Vector2, plate: T.Material, steel: T.Material) => {
    add(new T.BoxGeometry(BELT_W, BELT_TOP, BELT_W), plate, at.x, BELT_TOP / 2, at.y);
    const ring = add(new T.TorusGeometry(BELT_W * .34, .035, 8, 40), steel, at.x, BELT_TOP + .01, at.y);
    ring.rotation.x = Math.PI / 2;
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) add(new T.BoxGeometry(.12, .16, .12), steel, at.x + dx * (BELT_W / 2 + .04), BELT_TOP + .08, at.y + dz * (BELT_W / 2 + .04));
  };

  return {
    load() {
      const black = new T.MeshStandardMaterial({ color: '#0b0e13', roughness: .85, metalness: .2 });
      const steel = new T.MeshStandardMaterial({ color: '#4b5563', roughness: .4, metalness: .7 });
      const frame = new T.MeshStandardMaterial({ color: '#111318', roughness: .7 });
      const yellow = new T.MeshStandardMaterial({ color: '#facc15', roughness: .5 });

      // The wall, its cladding facing into the room.
      const cladding = new T.MeshStandardMaterial({ map: wallTexture(), roughness: .7 });
      add(new T.BoxGeometry(ROOM, WALL.height, WALL.thickness), [frame, frame, frame, frame, cladding, frame], 0, WALL.height / 2, -ROOM / 2 + WALL.thickness / 2);

      // Belts: in from the main conveyor at the room's back edge, down the middle, split three ways, on to the doors.
      const hub = new T.Vector2(0, 0), split = new T.Vector2(0, SPLIT_Z);
      const plate = new T.MeshStandardMaterial({ color: '#1f2530', roughness: .5, metalness: .6 });
      belt(new T.Vector2(-ROOM / 2, 0), hub, black, steel, { to: true });
      belt(hub, split, black, steel, { from: true, to: true });
      junction(hub, plate, steel);
      junction(split, plate, steel);
      for (const x of DOORS) {
        const turn = new T.Vector2(x, SPLIT_Z);
        if (x !== 0) { belt(split, turn, black, steel, { from: true, to: true }); junction(turn, plate, steel); }
        belt(turn, new T.Vector2(x, WALL_FACE), black, steel, { from: true });
      }

      const panelMap = doorTexture();
      DOORS.forEach((x, i) => {
        const face = WALL_FACE + .02;
        // Dark opening behind the door, then the frame: posts with yellow bumper strips and a header.
        add(new T.PlaneGeometry(DOOR_W, DOOR_H), new T.MeshBasicMaterial({ color: '#05070a' }), x, DOOR_H / 2, face);
        for (const side of [-1, 1]) {
          add(new T.BoxGeometry(.4, DOOR_H + .5, .35), frame, x + side * (DOOR_W / 2 + .2), (DOOR_H + .5) / 2, face + .17);
          add(new T.BoxGeometry(.12, DOOR_H - .3, .06), yellow, x + side * (DOOR_W / 2 + .2), DOOR_H / 2, face + .37);
        }
        add(new T.BoxGeometry(DOOR_W + .8, .5, .35), frame, x, DOOR_H + .25, face + .17);
        // The door rolls up into its header: its panel hangs from the top and shortens as it opens.
        const panelGeometry = new T.PlaneGeometry(DOOR_W, DOOR_H); panelGeometry.translate(0, -DOOR_H / 2, 0);
        const panel = add(panelGeometry, new T.MeshStandardMaterial({ map: panelMap, roughness: .5, side: T.DoubleSide }), x, DOOR_H, face + .04);
        // Red and green lamps beside the door.
        const red = new T.MeshStandardMaterial({ color: '#7f1d1d', emissive: '#ef4444', emissiveIntensity: 2 });
        const green = new T.MeshStandardMaterial({ color: '#14532d', emissive: '#22c55e', emissiveIntensity: 0 });
        const lampX = x + DOOR_W / 2 + .75;
        add(new T.BoxGeometry(.34, .7, .08), frame, lampX, 2.9, face + .04);
        add(new T.SphereGeometry(.11, 16, 10), red, lampX, 3.1, face + .12);
        add(new T.SphereGeometry(.11, 16, 10), green, lampX, 2.7, face + .12);
        const sign = add(new T.PlaneGeometry(1.8, .56), new T.MeshBasicMaterial({ map: signTexture(`DOCK ${i + 1}`) }), x, DOOR_H + .95, face + .02);
        sign.castShadow = false;
        doors.push({ panel, open: 0, red, green });
      });

      // Stiles: a yellow deck over the belt on four posts, a flight of steps up each side.
      for (const stile of STILES) {
        const deckLength = STILE_FLAT * 2, width = STILE_HALF * 2;
        add(new T.BoxGeometry(width, .08, deckLength), yellow, stile.x, STILE_TOP - .04, stile.z);
        // Posts stop under the deck: sharing its top face would flicker.
        for (const dx of [-1, 1]) for (const dz of [-1, 1]) add(new T.BoxGeometry(.08, STILE_TOP - .08, .08), steel, stile.x + dx * (width / 2 - .04), (STILE_TOP - .08) / 2, stile.z + dz * (deckLength / 2 - .04));
        for (const side of [-1, 1]) for (let step = 0; step < 4; step++) {
          const top = STILE_TOP * (4 - step) / 5, run = STILE_RAMP / 4;
          add(new T.BoxGeometry(width, top, run), steel, stile.x, top / 2, stile.z + side * (STILE_FLAT + run * (step + .5)));
        }
      }

      packages = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({ roughness: .75 }), POOL);
      packages.castShadow = true; packages.frustumCulled = false;
      for (let i = 0; i < POOL; i++) { packages.setMatrixAt(i, matrix.compose(position.set(0, -10, 0), rotation, none)); packages.setColorAt(i, colour.set('#bd9367')); }
      group.add(packages);
      group.visible = true;
    },

    /** Takes a package the main belt hands over and sends it to the next door in turn. */
    receive(size: T.Vector3, tone: string, spin: number) {
      if (!packages || parcels.length >= POOL) return;
      const door = nextDoor; nextDoor = (nextDoor + 1) % DOORS.length;
      const path = pathTo(door);
      parcels.push({ door, distance: 0, path, length: lengthOf(path), size, spin });
      // Colours follow slots, which shift as parcels leave, so update() applies them every frame.
      parcelTones.push(tone);
    },

    update(e: Equipment, dt: number, still = false) {
      if (!packages) return;
      group.position.set(0, groundOf(e), DOCKS_Z);
      if (still) return;
      const travel = SPEED * dt;
      for (const b of belts) b.texture.offset[b.axis] += b.dir * travel / LINE_STEP;

      for (const parcel of parcels) parcel.distance += travel;
      // Through the wall: gone.
      for (let i = parcels.length - 1; i >= 0; i--) if (parcels[i].distance >= parcels[i].length) { parcels.splice(i, 1); parcelTones.splice(i, 1); }

      for (let i = 0; i < POOL; i++) {
        const parcel = parcels[i];
        if (!parcel) { packages.setMatrixAt(i, matrix.compose(position.set(0, -10, 0), rotation, none)); continue; }
        const at = pointAt(parcel.path, parcel.distance);
        position.set(at.x, BELT_TOP + parcel.size.y / 2, at.y);
        packages.setMatrixAt(i, matrix.compose(position, rotation.setFromAxisAngle(up, parcel.spin), parcel.size));
        packages.setColorAt(i, colour.set(parcelTones[i]));
      }
      packages.instanceMatrix.needsUpdate = true;
      if (packages.instanceColor) packages.instanceColor.needsUpdate = true;

      // A door is up while a package is within a few metres of it, down again once it is through.
      const ease = 1 - Math.pow(.02, dt);
      doors.forEach((door, i) => {
        const coming = parcels.some(parcel => parcel.door === i && parcel.length - parcel.distance < 5);
        door.open = T.MathUtils.lerp(door.open, coming ? 1 : 0, ease);
        door.panel.scale.y = Math.max(.04, 1 - door.open);
        const go = door.open > .6;
        door.red.emissiveIntensity = go ? 0 : 2;
        door.green.emissiveIntensity = go ? 2 : 0;
      });
    },

    /** The belts and the wall, in the crew's model coordinates, so nobody walks across them. */
    footprints(e: Equipment): Footprint[] {
      if (!group.visible) return [];
      const cx = e.length / 2, cz = e.width / 2 + DOCKS_Z, pad = BELT_W / 2 + .3;
      // The runs along x, with a gap wherever a stile crosses them.
      const run = (x0: number, x1: number, z: number) => {
        const cuts = STILES.filter(stile => stile.z === z && stile.x > x0 && stile.x < x1).map(stile => stile.x).sort((a, b) => a - b);
        const edges = [x0, ...cuts.flatMap(x => [x - STILE_HALF, x + STILE_HALF]), x1];
        return edges.flatMap((edge, i) => (i % 2 ? [] : [{ x0: edge, x1: edges[i + 1], z0: z - pad, z1: z + pad }]));
      };
      const local: Footprint[] = [
        ...run(-ROOM / 2, pad, 0),
        { x0: -pad, x1: pad, z0: SPLIT_Z - pad, z1: -pad },
        ...run(Math.min(...DOORS) - pad, Math.max(...DOORS) + pad, SPLIT_Z),
        ...DOORS.map(x => ({ x0: x - pad, x1: x + pad, z0: -ROOM / 2, z1: SPLIT_Z - pad })),
      ];
      return local.map(b => ({ x0: cx + b.x0, x1: cx + b.x1, z0: cz + b.z0, z1: cz + b.z1 }));
    },

    dispose() {
      group.traverse(obj => {
        const mesh = obj as T.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { (material as T.MeshStandardMaterial).map?.dispose(); material.dispose(); }
      });
      scene.remove(group);
    },
  };
}
