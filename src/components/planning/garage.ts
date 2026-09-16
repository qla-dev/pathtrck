import * as T from 'three';

import { BUBBLE_TONE, type Footprint, type ServiceSpot } from './ambientCrew';
import { buildGarageContainers } from './garageContainers';
import { buildGarageFleet, type FleetVehicle, type GarageItem } from './garageFleet';
import type { Equipment } from './model';
import { ROOMS } from './rooms';

export type { FleetVehicle, GarageItem } from './garageFleet';

/** Mirrors the scene's own ground: a truck stands on its wheels, a container rests on its base. */
const groundOf = (e: Equipment) => (e.truck ? -.72 : -.24);
const GARAGE_Z = ROOMS.find(room => room.key === 'garage')!.z;

/**
 * Garage: the room left of the warehouse, holding the company's own vehicles along its outer side
 * (GarageFleet) and every container type stacked along its inner side (GarageContainers), with the lane
 * to its door left clear between them.
 *
 * Everything in it is pickable the way a rack unit is: hovering lifts it with a white wash, and a click
 * reports the item and gives the camera a view of it from the lane. Like the crew it owns a group under
 * the scene, placed in world coordinates, since the unit's own model is rebuilt on every change.
 */
export function createGarage(scene: T.Scene) {
  const group = new T.Group(); group.visible = false; scene.add(group);
  let fleet: ReturnType<typeof buildGarageFleet> | null = null, containers: ReturnType<typeof buildGarageContainers> | null = null;
  let shown: FleetVehicle[] | undefined, hovered = '', picked = '';
  /** How far the container row has dropped in, 0 to 1: it arrives from above on opening, as the racks do. */
  let drop = 0;
  const parts = () => [...(fleet?.parts ?? []), ...(containers?.parts ?? [])];

  const paint = () => {
    for (const part of parts()) {
      const lit = part.item.key === hovered || part.item.key === picked;
      for (const material of part.materials) material.emissiveIntensity = lit ? .35 : 0;
    }
  };
  const disposeTree = (root: T.Object3D) => root.traverse(obj => {
    const mesh = obj as T.Mesh;
    mesh.geometry?.dispose();
    if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { (material as T.MeshStandardMaterial).map?.dispose(); material.dispose(); }
  });

  return {
    load() {
      containers = buildGarageContainers();
      group.add(containers.group);
      group.visible = true;
    },

    /** Builds everything again, e.g. once the brand logo has loaded: the sides and trucks paint it in. */
    refresh() {
      if (!containers) return;
      for (const built of [containers, fleet]) if (built) { group.remove(built.group); disposeTree(built.group); }
      containers = buildGarageContainers(); group.add(containers.group);
      fleet = shown ? buildGarageFleet(shown, BUBBLE_TONE()) : null;
      if (fleet) group.add(fleet.group);
      paint();
    },

    /** Parks the fleet again only when the list itself changes, not on every frame it is handed over. */
    setVehicles(vehicles: FleetVehicle[]) {
      if (!containers || vehicles === shown) return;
      shown = vehicles;
      if (fleet) { group.remove(fleet.group); disposeTree(fleet.group); }
      fleet = buildGarageFleet(vehicles, BUBBLE_TONE());
      group.add(fleet.group);
      paint();
    },

    /** `speed` is the scene's own easing step for this frame, so the drop keeps pace with the racks'. */
    update(e: Equipment, pickedKey = '', speed = 1) {
      group.position.set(0, groundOf(e), GARAGE_Z);
      if (containers) {
        drop = T.MathUtils.lerp(drop, 1, speed * .6);
        containers.group.position.y = Math.pow(1 - drop, 3) * 9;
        containers.group.visible = drop > .01;
      }
      if (pickedKey !== picked) { picked = pickedKey; paint(); }
    },

    /** What a ray (already set from the pointer) lands on first, if it is anything in the garage. */
    pick(raycaster: T.Raycaster): GarageItem | null {
      if (!group.visible) return null;
      let object: T.Object3D | null = raycaster.intersectObject(group, true).find(hit => (hit.object as T.Mesh).isMesh)?.object ?? null;
      while (object && !object.userData.garageKey) object = object.parent;
      return parts().find(part => part.object === object)?.item ?? null;
    },

    hover(key: string) {
      if (key === hovered) return;
      hovered = key; paint();
    },

    /**
     * A view of an item from the lane down the middle of the garage, as a picked rack unit is framed from
     * its aisle: vehicles from the lane side of their bay, containers level with their tier.
     */
    focus(key: string): { position: T.Vector3; target: T.Vector3 } | null {
      const part = parts().find(p => p.item.key === key);
      if (!part) return null;
      const target = group.localToWorld(part.centre.clone());
      const across = part.item.kind === 'vehicle' ? 1 : -1;
      const reach = part.item.kind === 'vehicle' ? 10 : 11;
      return { position: target.clone().add(new T.Vector3(-3, part.item.kind === 'vehicle' ? 4.5 : 2.2, across * reach)), target };
    },

    /**
     * Where a mechanic stands to work on each parked truck, in the crew's model coordinates: beside the
     * cab end on the side facing the lane, turned to the truck.
     */
    serviceSpots(e: Equipment): ServiceSpot[] {
      if (!group.visible) return [];
      const cx = e.length / 2, cz = e.width / 2 + GARAGE_Z;
      return (fleet?.parts ?? []).map(part => ({ id: part.item.key, x: cx + part.centre.x + 3, z: cz + part.centre.z + 1.95, face: Math.PI }));
    },

    /** The fleet bays and the stack, in the crew's model coordinates, so nobody walks through them. */
    footprints(e: Equipment): Footprint[] {
      if (!group.visible) return [];
      const cx = e.length / 2, cz = e.width / 2 + GARAGE_Z;
      const boxes: Footprint[] = (fleet?.parts ?? []).map(part => ({ x0: part.centre.x - 8, x1: part.centre.x + 8, z0: part.centre.z - 1.6, z1: part.centre.z + 1.6 }));
      if (containers) boxes.push(containers.footprint);
      return boxes.map(b => ({ x0: cx + b.x0, x1: cx + b.x1, z0: cz + b.z0, z1: cz + b.z1 }));
    },

    dispose() {
      disposeTree(group);
      scene.remove(group);
    },
  };
}
