import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { rackBays, rackSpan, type Equipment } from './model';

const MODEL_URL = '/models/RobotExpressive.glb';
const COUNT = 10;
/** Clips that play once and hold their last pose, as in the three.js skinning-and-morphing example. */
const EMOTES = ['Jump', 'Yes', 'No', 'Wave', 'Punch', 'ThumbsUp'];
/** What a worker does while looking a bay over. */
const INSPECT = ['Yes', 'No', 'ThumbsUp', 'Wave'];
/** Mirrors the scene's own ground: a truck stands on its wheels, a container rests on its base. */
const groundOf = (e: Equipment) => (e.truck ? -.72 : -.24);

type Worker = { root: T.Object3D; mixer: T.AnimationMixer; actions: Record<string, T.AnimationAction>; current: string; target: T.Vector3; pause: number; speed: number };

/** A bay to walk to: a random rack row, standing in the aisle on the unit's side of it. */
const pickTarget = (e: Equipment) => {
  const span = rackSpan(e.length), bays = rackBays(e.length), dz = [-15, -11.5, 11.5, 15][Math.floor(Math.random() * 4)];
  return new T.Vector3(e.length / 2 - span + Math.floor(Math.random() * Math.max(1, bays - 1)) * 3, groundOf(e), e.width / 2 + dz + (dz < 0 ? 1.6 : -1.6));
};

const fadeTo = (w: Worker, name: string, duration = .4) => {
  if (w.current === name) return;
  const next = w.actions[name]; if (!next) return;
  w.actions[w.current]?.fadeOut(duration);
  next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(duration).play();
  w.current = name;
};

const step = (w: Worker, dt: number, e: Equipment) => {
  w.mixer.update(dt);
  if (w.pause > 0) { w.pause -= dt; if (w.pause <= 0) { w.target = pickTarget(e); fadeTo(w, 'Walking'); } return; }
  const dx = w.target.x - w.root.position.x, dz = w.target.z - w.root.position.z, dist = Math.hypot(dx, dz);
  // Arrived at the bay: stop and look it over, then move on to another one.
  if (dist < .3) { fadeTo(w, INSPECT[Math.floor(Math.random() * INSPECT.length)], .2); w.pause = 2 + Math.random() * 3; return; }
  const travel = Math.min(dist, w.speed * dt);
  w.root.position.set(w.root.position.x + dx / dist * travel, groundOf(e), w.root.position.z + dz / dist * travel);
  w.root.rotation.y = Math.atan2(dx, dz);
  fadeTo(w, 'Walking');
};

/**
 * Ambient warehouse crew: ten workers walking the rack aisles, each stopping at a bay to inspect it
 * before picking another. One model is loaded and cloned, so geometry and clips are shared and only
 * the mixers are per worker.
 *
 * The crew owns its own group under the scene rather than under the unit: the scene disposes and
 * rebuilds that on every cargo or selection change, which would throw away the shared skinned
 * geometry each time. That means it carries the unit's offset itself - see update().
 */
export function createAmbientCrew(scene: T.Scene) {
  const group = new T.Group(); group.visible = false; scene.add(group);
  const workers: Worker[] = [];
  let disposed = false;

  return {
    /** Loads the shared model and clones it once per worker. Until this resolves, update() is a no-op. */
    load(e: Equipment) {
      new GLTFLoader().load(MODEL_URL, gltf => {
        if (disposed) return;
        // Scaled from its own bounding box, so the crew is people-sized whatever units the model uses.
        const height = new T.Box3().setFromObject(gltf.scene).getSize(new T.Vector3()).y || 1;
        for (let i = 0; i < COUNT; i++) {
          const root = SkeletonUtils.clone(gltf.scene);
          root.scale.setScalar(1.75 / height);
          root.traverse(obj => { if ((obj as T.Mesh).isMesh) obj.castShadow = true; });
          const mixer = new T.AnimationMixer(root), actions: Record<string, T.AnimationAction> = {};
          for (const clip of gltf.animations) {
            const action = mixer.clipAction(clip);
            if (EMOTES.includes(clip.name)) { action.clampWhenFinished = true; action.loop = T.LoopOnce; }
            actions[clip.name] = action;
          }
          root.position.copy(pickTarget(e));
          actions.Idle?.play();
          group.add(root);
          // Staggered pauses, so ten of them never step in unison.
          workers.push({ root, mixer, actions, current: 'Idle', target: pickTarget(e), pause: Math.random() * 4, speed: .9 + Math.random() * .6 });
        }
      }, undefined, () => {});
    },

    /** Ticks every worker. The crew sits beside the unit, so it takes the unit's offset by hand. */
    update(dt: number, e: Equipment, visible: boolean) {
      if (!workers.length) return;
      group.position.set(-e.length / 2, 0, -e.width / 2);
      group.visible = visible;
      if (!visible) return;
      for (const worker of workers) step(worker, dt, e);
    },

    dispose() {
      disposed = true;
      for (const worker of workers) worker.mixer.stopAllAction();
      group.traverse(obj => {
        const mesh = obj as T.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { (material as T.MeshBasicMaterial).map?.dispose(); material.dispose(); }
      });
      scene.remove(group);
      workers.length = 0;
    },
  };
}
