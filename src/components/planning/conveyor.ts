import * as T from 'three';

import type { Equipment } from './model';
import { HALL_X, ROOM, ROOMS } from './rooms';

/** Mirrors the scene's own ground: a truck stands on its wheels, a container rests on its base. */
const groundOf = (e: Equipment) => (e.truck ? -.72 : -.24);

const WIDTH = ROOM * ROOMS.length;
/** One belt. Kept as a list, so more lanes are one entry each. */
const BELTS = [{ x: 0, dir: 1 }];
const BELT_WIDTH = 2.4, RAIL = .12;
export const BELT_TOP = .5, SPEED = 1.4;
/** The main belt's centre line in world x: its inner rail flush against the rooms' back edge. */
export const MAIN_BELT_X = -HALL_X - BELT_WIDTH / 2 - RAIL;
/** Spacing of the cross lines printed on the belt, and of the packages riding it. */
const LINE_STEP = .5, PACKAGE_STEP = 1.5;
export const PACKAGE_TONES = ['#bd9367', '#c4a079', '#ac8053', '#38bdf8', '#d8b48a'];

/** Black belt with pale cross lines; it scrolls, so the lines run with the packages. */
const beltTexture = () => {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#07090c'; ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#3a4452'; ctx.fillRect(0, 28, 64, 8);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace; texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(1, WIDTH / LINE_STEP);
  return texture;
};

/**
 * Conveyor: a belt running the whole length of the site right along the rooms' back edge, its lines moving
 * and an endless flow of packages riding it. Nobody walks there: it is outside the crew's floor and no room
 * has a door onto it.
 *
 * Owns a group under the scene in world coordinates, like the garage, so the unit's rebuilds never touch it.
 */
export function createConveyor(scene: T.Scene) {
  const group = new T.Group(); group.visible = false; scene.add(group);
  const textures: T.CanvasTexture[] = [];
  let packages: T.InstancedMesh | null = null;
  /**
   * Each package's belt, its size, colour and where it is along the belt. `away` is one handed off the
   * belt: its slot keeps moving, empty, and it rides again once the slot comes round to the start.
   */
  const riders: { belt: number; z: number; size: T.Vector3; spin: number; tone: string; away: boolean }[] = [];
  /** Where packages leave the belt, how often, and who takes them. */
  let exit: { z: number; every: number; take: (size: T.Vector3, tone: string, spin: number) => void } | null = null, sinceExit = 0;
  const matrix = new T.Matrix4(), rotation = new T.Quaternion(), up = new T.Vector3(0, 1, 0), position = new T.Vector3(), none = new T.Vector3();

  const box = (w: number, h: number, d: number, material: T.Material | T.Material[], x: number, y: number) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material); mesh.position.set(x, y, 0);
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  };

  const place = (i: number) => {
    const rider = riders[i];
    position.set(BELTS[rider.belt].x, BELT_TOP + rider.size.y / 2, rider.z);
    matrix.compose(position, rotation.setFromAxisAngle(up, rider.spin), rider.away ? none : rider.size);
    packages!.setMatrixAt(i, matrix);
  };

  return {
    load() {
      const black = new T.MeshStandardMaterial({ color: '#0b0e13', roughness: .85, metalness: .2 });
      const steel = new T.MeshStandardMaterial({ color: '#4b5563', roughness: .4, metalness: .7 });
      // The belt, raised between two steel rails.
      for (const belt of BELTS) {
        const texture = beltTexture(); textures.push(texture);
        const top = new T.MeshStandardMaterial({ map: texture, roughness: .9 });
        box(BELT_WIDTH, BELT_TOP, WIDTH, [black, black, top, black, black, black], belt.x, BELT_TOP / 2);
      }
      for (const belt of BELTS) for (const side of [-1, 1]) box(RAIL, .14, WIDTH, steel, belt.x + side * (BELT_WIDTH / 2 + RAIL / 2), BELT_TOP + .07);

      const count = Math.floor(WIDTH / PACKAGE_STEP) * BELTS.length;
      packages = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({ roughness: .75 }), count);
      packages.castShadow = true; packages.receiveShadow = true;
      // Its bounds would be worked out once, before anything moves; the flow spans the whole hall anyway.
      packages.frustumCulled = false;
      const colour = new T.Color();
      for (let i = 0; i < count; i++) {
        const belt = i % BELTS.length, slot = Math.floor(i / BELTS.length);
        const size = new T.Vector3(.45 + Math.random() * .5, .3 + Math.random() * .45, .45 + Math.random() * .5);
        // Evenly spaced, with a little jitter so the flow never looks stamped out.
        const tone = PACKAGE_TONES[Math.floor(Math.random() * PACKAGE_TONES.length)];
        riders.push({ belt, z: -WIDTH / 2 + slot * PACKAGE_STEP + Math.random() * .6, size, spin: (Math.random() - .5) * .5, tone, away: false });
        packages.setColorAt(i, colour.set(tone));
        place(i);
      }
      group.add(packages);
      group.visible = true;
    },

    /** Hands one package at a time off the belt as it passes `z`, no more often than `every` seconds. */
    exitAt(z: number, every: number, take: (size: T.Vector3, tone: string, spin: number) => void) {
      exit = { z, every, take }; sinceExit = every * .6;
    },

    update(e: Equipment, dt: number, still = false) {
      if (!packages) return;
      // Its inner rail flush against the rooms' back edge.
      group.position.set(MAIN_BELT_X, groundOf(e), 0);
      if (still) return;
      const travel = SPEED * dt;
      // The lines move with the packages: offset is in texture repeats, one per line step.
      textures.forEach((texture, i) => { texture.offset.y += BELTS[i].dir * travel / LINE_STEP; });
      sinceExit += dt;
      riders.forEach((rider, i) => {
        const was = rider.z, dir = BELTS[rider.belt].dir;
        rider.z += dir * travel;
        if (exit && !rider.away && sinceExit >= exit.every && (was - exit.z) * dir < 0 && (rider.z - exit.z) * dir >= 0) {
          rider.away = true; sinceExit = 0;
          exit.take(rider.size.clone(), rider.tone, rider.spin);
        }
        // Off one end, back on at the other: the flow never runs out - and a slot left empty fills again.
        if (rider.z > WIDTH / 2) { rider.z -= WIDTH; rider.away = false; }
        else if (rider.z < -WIDTH / 2) { rider.z += WIDTH; rider.away = false; }
        place(i);
      });
      packages.instanceMatrix.needsUpdate = true;
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
