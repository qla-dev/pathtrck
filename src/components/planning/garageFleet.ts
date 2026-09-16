import * as T from 'three';

import { brandLogo } from './brandLogo';
import { vehicleEquipment, type Equipment } from './model';

/** One of the company's own vehicles, as the vehicles API returns it. */
export type FleetVehicle = Record<string, unknown>;
export type GarageItem =
  | { kind: 'vehicle'; key: string; vehicle: FleetVehicle; equipment: Equipment }
  | { kind: 'container'; key: string; equipment: Equipment };

/** A pickable thing in the garage: its meshes, what it is, and the point a camera frames. */
export type GaragePart = { object: T.Object3D; item: GarageItem; centre: T.Vector3; materials: T.MeshStandardMaterial[] };

/**
 * Parking bays along the garage's outer side, in the garage's own frame (x along the room, z across it,
 * -z the outer wall). Two bays along x, three rows across, the outer row as far in from the wall as the
 * warehouse's outer racks; vehicles stand nose to the hall, with a walkway between rows so a mechanic can
 * reach every truck from the side.
 */
const BAYS = [-15, -10.5, -6].flatMap(z => [-8.5, 8.5].map(x => ({ x, z })));
export const FLEET_SLOTS = BAYS.length;
/** The cab sits ahead of the load body; the body is capped so the whole truck fits its bay. */
const CAB = 2.2, MAX_BODY = 13;

const material = (color: string, extra: T.MeshStandardMaterialParameters = {}) =>
  new T.MeshStandardMaterial({ color, roughness: .6, metalness: .15, emissive: 0xffffff, emissiveIntensity: 0, ...extra });

/** The registration on a plate that floats above the truck, like the scene's other labels. */
const plateSprite = (text: string) => {
  const font = 'bold 44px sans-serif', canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!;
  ctx.font = font; canvas.width = Math.ceil(ctx.measureText(text).width) + 48; canvas.height = 76;
  ctx.fillStyle = '#132638'; ctx.beginPath(); ctx.roundRect(0, 0, canvas.width, 76, 18); ctx.fill();
  ctx.font = font; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, canvas.width / 2, 40);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.renderOrder = 10; sprite.scale.set(.4 * canvas.width / 76, .4, 1);
  return sprite;
};

/** A box truck built from its planning equipment: body, cab facing +x, chassis and wheels. */
const truck = (e: Equipment, registration: string, tone: string) => {
  const group = new T.Group(), materials: T.MeshStandardMaterial[] = [];
  const add = (w: number, h: number, d: number, m: T.MeshStandardMaterial, x: number, y: number, z = 0) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), m); mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    if (!materials.includes(m)) materials.push(m);
  };
  const body = Math.min(e.length, MAX_BODY), width = e.width, height = e.height, deck = .95;
  const total = body + CAB + .2, back = -total / 2;
  const shell = material('#eef2f6'), cab = material(tone), chassis = material('#1f2937', { metalness: .5 }), glass = material('#0f172a', { roughness: .1, metalness: .6 });
  add(total - .2, .3, width * .8, chassis, 0, .75);
  add(body, height, width, shell, back + body / 2, deck + height / 2);
  add(CAB, 2.5, width, cab, back + body + .2 + CAB / 2, deck + 1.25 - .15);
  add(.05, .9, width * .86, glass, back + body + .2 + CAB + .01, deck + 1.75);
  const wheel = new T.CylinderGeometry(.5, .5, .36, 18); wheel.rotateX(Math.PI / 2);
  const rubber = material('#111827', { roughness: .9 });
  materials.push(rubber);
  for (const x of [back + 1.2, back + body * .75, back + body + .2 + CAB / 2]) for (const side of [-1, 1]) {
    const mesh = new T.Mesh(wheel, rubber); mesh.position.set(x, .5, side * (width / 2 - .05)); mesh.castShadow = true; group.add(mesh);
  }
  // The normal logo on the body's lane side, as on the unit being planned: dark wordmark on the white body.
  const logo = brandLogo('dark');
  if (logo) {
    const map = new T.CanvasTexture(logo); map.colorSpace = T.SRGBColorSpace;
    const w = Math.min(body * .68, 6.2), h = w * logo.height / logo.width;
    const decal = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map, transparent: true, depthWrite: false }));
    decal.position.set(back + body / 2, deck + height * .55, width / 2 + .01); decal.renderOrder = 5;
    group.add(decal);
  }
  const plate = plateSprite(registration); plate.position.set(0, deck + height + .9, 0); group.add(plate);
  return { group, materials, height: deck + height };
};

/**
 * GarageFleet: the company's own road vehicles parked in the garage, one per bay, each sized from its
 * record the same way choosing it as the planning unit does. More vehicles than bays park the first ones.
 */
export function buildGarageFleet(vehicles: FleetVehicle[], tone: string) {
  const group = new T.Group(), parts: GaragePart[] = [];
  vehicles.slice(0, FLEET_SLOTS).forEach((vehicle, i) => {
    const equipment = vehicleEquipment(vehicle), bay = BAYS[i];
    const built = truck(equipment, String(vehicle.registration_number || '—'), tone);
    built.group.position.set(bay.x, 0, bay.z);
    const key = `vehicle:${String(vehicle.id)}`;
    built.group.userData.garageKey = key;
    group.add(built.group);
    parts.push({ object: built.group, item: { kind: 'vehicle', key, vehicle, equipment }, centre: new T.Vector3(bay.x, built.height / 2, bay.z), materials: built.materials });
  });
  return { group, parts };
}
