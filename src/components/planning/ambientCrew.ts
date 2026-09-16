import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { rackBays, rackSpan, type Equipment } from './model';
import { SKILLS, WIDEST_LABEL, type SkillName } from './skills';

const MODEL_URL = '/models/RobotExpressive.glb';
const COUNT = 10;
/** Clips that play once and hold their last pose, as in the three.js skinning-and-morphing example. */
const EMOTES = ['Jump', 'Yes', 'No', 'Wave', 'Punch', 'ThumbsUp'];
/** Mirrors the scene's own ground: a truck stands on its wheels, a container rests on its base. */
const groundOf = (e: Equipment) => (e.truck ? -.72 : -.24);
/** Rack rows, as offsets from the unit's centre line. */
const ROWS = [-15, -11.5, 11.5, 15];
/** How far off a row a worker stands to look at it. */
const STANDOFF = 1.6;

/** Roles are decorative, taken from the system's own labels; anyone not signed in is just a Worker. */
const ROLES = ['Dispatcher', 'Manager', 'Customs Agent', 'Finance', 'Driver'];
const WORKER_ROLE = 'Worker';

const FONT = 'bold 44px sans-serif';
const TAG_TONE = '#132638';
/** Bubbles take the app's primary, read from the theme so a rebrand carries through here too. */
let bubbleTone = '';
const BUBBLE_TONE = () => {
  if (!bubbleTone) bubbleTone = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#00AEEF';
  return bubbleTone;
};

type Footprint = { x0: number; x1: number; z0: number; z1: number };
type Plate = { sprite: T.Sprite; canvas: HTMLCanvasElement; texture: T.CanvasTexture };
/** Where to go, what to do there, and which way to turn once standing on the spot. */
type Goal = { point: T.Vector3; skill: SkillName; face: number };
type Worker = {
  root: T.Object3D; mixer: T.AnimationMixer; actions: Record<string, T.AnimationAction>; current: string;
  path: T.Vector3[]; goal: SkillName; face: number; pause: number; speed: number; lane: number; flip: boolean;
  role: string; tag: Plate; bubble: Plate; skill: SkillName | null; dots: number; dotTimer: number;
  crate: T.Mesh; holding: boolean;
};

/** The scene's own label look: a dark rounded plate with white text, drawn over everything else. */
const plate = (width: number): Plate => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = 76;
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.renderOrder = 10;
  sprite.scale.set(.32 * width / 76, .32, 1);
  return { sprite, canvas, texture };
};

/** Repaints a plate in place - the canvas is kept, so changing text costs no new texture. */
const paint = (p: Plate, text: string, tone: string) => {
  const ctx = p.canvas.getContext('2d')!;
  ctx.clearRect(0, 0, p.canvas.width, p.canvas.height);
  ctx.fillStyle = tone; ctx.beginPath(); ctx.roundRect(0, 0, p.canvas.width, 76, 18); ctx.fill();
  ctx.font = FONT; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, p.canvas.width / 2, 40);
  p.texture.needsUpdate = true;
};

const measure = (text: string) => {
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = FONT; return Math.ceil(ctx.measureText(text).width) + 48;
};

/** The x span a rack row covers, from its first bay to its last, with room for a body at each end. */
const rowSpan = (e: Equipment) => {
  const span = rackSpan(e.length), first = e.length / 2 - span;
  return { x0: first - 1.4, x1: first + (rackBays(e.length) - 1) * 3 + 1.4 };
};

/** Everything a worker has to walk around, in the same model-local metres the scene uses. */
const obstacles = (e: Equipment): Footprint[] => {
  const { x0, x1 } = rowSpan(e);
  const rows = ROWS.map(dz => ({ x0, x1, z0: e.width / 2 + dz - .8, z1: e.width / 2 + dz + .8 }));
  // The unit itself, a truck's cab reaching out past its nose.
  return [...rows, { x0: e.truck ? -2.6 : -.3, x1: e.length + .3, z0: -.3, z1: e.width + .3 }];
};

/** The warehouse floor slab, inset so nobody walks off its edge. */
const floorBounds = (e: Equipment): Footprint => {
  const halfX = Math.max(36, e.length + 24) / 2 - .8;
  return { x0: e.length / 2 - halfX, x1: e.length / 2 + halfX, z0: e.width / 2 - 17.2, z1: e.width / 2 + 17.2 };
};

const within = (b: Footprint, x: number, z: number) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1;
const blocked = (list: Footprint[], x: number, z: number) => list.some(b => within(b, x, z));
const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

/** Workers keep a body's width between them, so nobody walks through anybody. */
const SPACING = .9;
/** How far ahead a worker looks for someone coming the other way, to give way before they meet. */
const LOOKAHEAD = 2.4;
/** Talking distance: they meet at arm's length, so they step back before starting. */
const TALK_GAP = 1.8;
/** Whoever stands in the way of a step, if anyone. */
const blocker = (all: Worker[], self: Worker, x: number, z: number) => all.find(other => {
  if (other === self) return false;
  const gap = Math.hypot(other.root.position.x - x, other.root.position.z - z);
  if (gap >= SPACING) return false;
  // Being too close already only blocks a step that closes the gap further - otherwise two workers
  // who ended up overlapping would each block every move the other made and both stand there forever.
  return gap < Math.hypot(other.root.position.x - self.root.position.x, other.root.position.z - self.root.position.z);
});

/** Facing, in the same convention the walk uses: the way to turn to look at something across z. */
const facing = (towards: number, from: number) => Math.atan2(0, towards - from);

/** A bay to inspect: a random rack row, standing in the aisle on the unit's side of it. */
const baySpot = (e: Equipment, side?: number): Goal => {
  const rows = side ? ROWS.filter(dz => Math.sign(dz) === side) : ROWS;
  const span = rackSpan(e.length), bays = rackBays(e.length), dz = rows[Math.floor(Math.random() * rows.length)];
  const rackZ = e.width / 2 + dz, standZ = rackZ + (dz < 0 ? STANDOFF : -STANDOFF);
  return {
    point: new T.Vector3(e.length / 2 - span + Math.floor(Math.random() * Math.max(1, bays - 1)) * 3, groundOf(e), standZ),
    skill: 'inspect',
    face: facing(rackZ, standZ),
  };
};

/** A spot alongside the unit in the middle, clear of its footprint, to look the container over. */
const unitSpot = (e: Equipment): Goal => {
  // Right up against the unit - close enough to be reading it, still clear of its footprint.
  const standZ = Math.random() < .5 ? -1.2 : e.width + 1.2;
  return {
    point: new T.Vector3(Math.random() * e.length, groundOf(e), standZ),
    skill: 'unit',
    face: facing(e.width / 2, standZ),
  };
};

/**
 * Where a worker starts. Spread over the lane between a side's two rows, the open floor between the
 * unit and the inner row, and the bays themselves - rather than ten of them lined up at the shelves -
 * and never dropped on top of somebody already standing there.
 */
const spawnSpot = (e: Equipment, side: number, all: Worker[]): T.Vector3 => {
  const { x0, x1 } = rowSpan(e), ground = groundOf(e);
  const place = () => {
    const x = x0 + Math.random() * (x1 - x0), roll = Math.random();
    // Between this side's two rows, which sit 3.5 apart with 1.9 of walkable lane between them.
    if (roll < .4) return new T.Vector3(x, ground, e.width / 2 + side * (13.25 + (Math.random() - .5) * 1.2));
    // The open run between the unit and the inner row.
    if (roll < .7) return new T.Vector3(x, ground, e.width / 2 + side * (3 + Math.random() * 7));
    return baySpot(e, side).point;
  };
  let point = place();
  for (let tries = 0; tries < 8; tries++) {
    if (!all.some(other => Math.hypot(other.root.position.x - point.x, other.root.position.z - point.z) < SPACING * 1.6)) return point;
    point = place();
  }
  return point;
};

const pickGoal = (e: Equipment, side?: number): Goal => {
  const roll = Math.random();
  // An errand starts where the package is: the tracking rows, whichever side the worker is on.
  if (roll < .2) return { ...baySpot(e, -1), skill: 'carry' };
  if (roll < .4) return unitSpot(e);
  return baySpot(e, side);
};

/**
 * Somewhere nobody else is already headed. Two workers sent to the same bay walk the same line and
 * meet at the end of it, so the cheapest way to keep them apart is to never pair them up.
 */
const freeGoal = (e: Equipment, all: Worker[], self: Worker): Goal => {
  // Mostly work the side already standing on. Every crossing funnels past a row end, and those ends
  // are the one place the crew has no room to spread out, so the fewer crossings the better.
  const side = self.root.position.z < e.width / 2 ? -1 : 1;
  const pick = () => pickGoal(e, Math.random() < .7 ? side : undefined);
  let goal = pick();
  for (let tries = 0; tries < 6; tries++) {
    const clash = all.some(other => other !== self && other.path.length && other.path[other.path.length - 1].distanceTo(goal.point) < 2.5);
    if (!clash) return goal;
    goal = pick();
  }
  return goal;
};

/**
 * Rows are parallel walls running along x, all sharing one x span, so the only way from one aisle to
 * the next is around their ends - which are clear of the unit as well. When something stands between
 * the two z values, the route goes out to the nearer end, along it, and back in; otherwise straight.
 * Each worker rounds the end on its own slightly different line, so ten of them do not file through
 * one point.
 */
const routeTo = (e: Equipment, from: T.Vector3, to: T.Vector3, lane: number, flip = false): T.Vector3[] => {
  const list = obstacles(e);
  const low = Math.min(from.z, to.z), high = Math.max(from.z, to.z);
  const wall = list.find(b => b.z1 > low && b.z0 < high);
  // Every leg runs along one axis: the crew walks the aisles square, never cutting across them.
  if (!wall) {
    const corner = new T.Vector3(to.x, to.y, from.z);
    return [blocked(list, corner.x, corner.z) ? new T.Vector3(from.x, to.y, to.z) : corner, to.clone()];
  }
  const { x0, x1 } = rowSpan(e);
  // Turn in tight, immediately past the shelves. There is well under a metre between a row's end and
  // the rim of the slab, so a wider swing hits the floor bounds and clamps every worker onto one
  // line against the edge - which is exactly how the crew ends up stacked out there.
  const left = x0 - .35 - lane * .25, right = x1 + .35 + lane * .25;
  const nearer = Math.abs(from.x - left) < Math.abs(from.x - right);
  const edge = (flip ? !nearer : nearer) ? left : right;
  return [new T.Vector3(edge, to.y, from.z), new T.Vector3(edge, to.y, to.z), to.clone()];
};

const fadeTo = (w: Worker, name: string, duration = .4) => {
  if (w.current === name) return;
  const next = w.actions[name]; if (!next) return;
  w.actions[w.current]?.fadeOut(duration);
  next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(duration).play();
  w.current = name;
};

const startSkill = (w: Worker, name: SkillName) => {
  const skill = SKILLS[name];
  w.skill = name;
  w.pause = skill.min + Math.random() * (skill.max - skill.min);
  w.dots = 0; w.dotTimer = 0;
  fadeTo(w, skill.clips[Math.floor(Math.random() * skill.clips.length)], .2);
  paint(w.bubble, skill.label, BUBBLE_TONE());
  w.bubble.sprite.visible = true;
};

const endSkill = (w: Worker) => { w.skill = null; w.bubble.sprite.visible = false; };

/**
 * Two workers meet: both turn to face each other and talk for the same stretch.
 *
 * Dropping both paths is the point, not tidiness - resuming the route afterwards walks them straight
 * back into each other and they talk again, and again, and neither ever arrives anywhere.
 */
const interact = (w: Worker, other: Worker, e: Equipment) => {
  const a = w.root.position, b = other.root.position;
  // They meet nose to nose, so both step back to a talking distance first - but not into a rack or
  // off the slab, so whoever has nowhere to go simply stays put.
  const dx = b.x - a.x, dz = b.z - a.z, gap = Math.hypot(dx, dz) || 1, push = (TALK_GAP - gap) / 2;
  if (push > 0) {
    const list = obstacles(e), bounds = floorBounds(e);
    for (const [p, sign] of [[a, 1], [b, -1]] as [T.Vector3, number][]) {
      const nx = clamp(p.x - sign * dx / gap * push, bounds.x0, bounds.x1);
      const nz = clamp(p.z - sign * dz / gap * push, bounds.z0, bounds.z1);
      if (!blocked(list, nx, nz)) p.set(nx, p.y, nz);
    }
  }
  // Turned after the step back, so they end up squarely facing each other.
  w.root.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
  other.root.rotation.y = Math.atan2(a.x - b.x, a.z - b.z);
  startSkill(w, 'interact_eachother');
  startSkill(other, 'interact_eachother');
  other.pause = w.pause;
  w.path = []; other.path = [];
};

/** The far end of an errand: the warehouse rows, where whatever was collected gets put away. */
const headForDelivery = (w: Worker, e: Equipment) => {
  const drop = baySpot(e, 1);
  w.goal = 'carry';
  w.face = drop.face;
  w.path = routeTo(e, w.root.position, drop.point, w.lane, w.flip);
};

const takeCrate = (w: Worker, e: Equipment) => {
  w.holding = true;
  w.crate.visible = true;
  // The bubble stays up for the walk across, so the errand reads as one job rather than two.
  paint(w.bubble, SKILLS.carry.label, BUBBLE_TONE());
  w.bubble.sprite.visible = true;
  headForDelivery(w, e);
};

const dropCrate = (w: Worker) => { w.holding = false; w.crate.visible = false; };

const retarget = (w: Worker, e: Equipment, all: Worker[]) => {
  // A package is never abandoned: whatever sends a carrier looking for something new - walled in, a
  // stand-off, nowhere to step - it goes back to finishing the delivery instead.
  if (w.holding) { headForDelivery(w, e); return; }
  const goal = freeGoal(e, all, w);
  w.goal = goal.skill;
  w.face = goal.face;
  w.path = routeTo(e, w.root.position, goal.point, w.lane, w.flip);
};

const step = (w: Worker, dt: number, e: Equipment, all: Worker[]) => {
  w.mixer.update(dt);
  const pos = w.root.position, head = groundOf(e) + 2.15;
  // Labels ride above the worker rather than parenting to it, so the model's scale never touches them.
  w.tag.sprite.position.set(pos.x, head, pos.z);
  w.bubble.sprite.position.set(pos.x, head + .62, pos.z);
  // Carried out in front, turning with whoever is holding it.
  if (w.holding) {
    w.crate.position.set(pos.x + Math.sin(w.root.rotation.y) * .45, groundOf(e) + .95, pos.z + Math.cos(w.root.rotation.y) * .45);
    w.crate.rotation.y = w.root.rotation.y;
  }

  if (w.skill) {
    // Loading dots, the same idea as Lena's thinking line.
    w.dotTimer += dt;
    if (w.dotTimer > .45) { w.dotTimer = 0; w.dots = (w.dots + 1) % 4; paint(w.bubble, SKILLS[w.skill].label + '.'.repeat(w.dots), BUBBLE_TONE()); }
  }

  if (w.pause > 0) {
    w.pause -= dt;
    if (w.pause <= 0) {
      const finished = w.skill;
      endSkill(w);
      // An errand runs its routine at both ends: take the package, then carry it over and set it down.
      if (finished === 'carry' && !w.holding) takeCrate(w, e);
      else if (finished === 'carry') { dropCrate(w); retarget(w, e, all); }
      // Interrupted while carrying - stood aside, or stopped to talk - so pick the delivery back up
      // rather than wandering off with the package still in hand.
      else if (w.holding && !w.path.length) headForDelivery(w, e);
      // A finished routine leaves no path, so that picks somewhere new; a wait resumes the route.
      else if (!w.path.length) retarget(w, e, all);
      fadeTo(w, 'Walking');
    }
    return;
  }

  const goal = w.path[0];
  if (!goal) { retarget(w, e, all); return; }

  const dx = goal.x - pos.x, dz = goal.z - pos.z, dist = Math.hypot(dx, dz);
  if (dist < .3) {
    w.path.shift();
    // Standing on the spot: turn to whatever is being looked at, then run the routine.
    if (!w.path.length) { w.root.rotation.y = w.face; startSkill(w, w.goal); }
    return;
  }

  const travel = Math.min(dist, w.speed * dt);
  const list = obstacles(e), bounds = floorBounds(e);
  let x = pos.x + dx / dist * travel, z = pos.z + dz / dist * travel;
  // Walk into a rack or the unit and slide along it rather than through it; walled in, go elsewhere.
  if (blocked(list, x, z)) {
    if (!blocked(list, x, pos.z)) z = pos.z;
    else if (!blocked(list, pos.x, z)) x = pos.x;
    else { retarget(w, e, all); return; }
  }
  x = clamp(x, bounds.x0, bounds.x1);
  z = clamp(z, bounds.z0, bounds.z1);

  // Somebody coming the other way, not yet in the way: break step and take a different line to the
  // same place, so the two of them pass instead of meeting.
  const ahead = all.find(other => {
    if (other === w || other.skill) return false;
    const ox = other.root.position.x - pos.x, oz = other.root.position.z - pos.z, range = Math.hypot(ox, oz);
    if (range > LOOKAHEAD || range < 1e-4) return false;
    return (ox * dx + oz * dz) / (range * dist) > .7;
  });
  if (ahead) {
    // Round the other end of the row on a different line, rather than queueing behind them.
    w.flip = !w.flip;
    w.lane = (w.lane + .8) % 1.6;
    w.path = routeTo(e, pos, w.path[w.path.length - 1], w.lane, w.flip);
    startSkill(w, 'avoid');
    return;
  }

  // Someone in the way: two on the move stop and talk, otherwise stand clear of whoever is working.
  // Either way the path is dropped, so nobody ever resumes a route that is already blocked.
  const other = blocker(all, w, x, z);
  if (other) {
    if (other.skill) { w.path = []; startSkill(w, 'aside'); }
    else interact(w, other, e);
    return;
  }

  const moved = Math.hypot(x - pos.x, z - pos.z);
  if (moved < 1e-4) { retarget(w, e, all); return; }
  w.root.rotation.y = Math.atan2(x - pos.x, z - pos.z);
  pos.set(x, groundOf(e), z);
  fadeTo(w, 'Walking');
};

/**
 * Ambient warehouse crew: ten workers walking the rack aisles, each stopping to run one of the
 * routines in ./skills - inspecting a bay, checking the unit, a handover when two meet. One model is
 * loaded and cloned, so geometry and clips are shared and only the mixers are per worker.
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
          const role = i < ROLES.length ? ROLES[i] : WORKER_ROLE;
          const tag = plate(measure(role)), bubble = plate(measure(`${WIDEST_LABEL}...`));
          paint(tag, role, TAG_TONE);
          bubble.sprite.visible = false;
          // Half start behind the unit and half in front, so the crew is never all on one side.
          root.position.copy(spawnSpot(e, i % 2 ? 1 : -1, workers));
          actions.Idle?.play();
          // One crate each, hidden until an errand needs it, so none is ever built or thrown away mid-run.
          const crate = new T.Mesh(new T.BoxGeometry(.5, .4, .5), new T.MeshStandardMaterial({ color: '#bd9367', roughness: .8 }));
          crate.castShadow = true; crate.visible = false;
          group.add(root, tag.sprite, bubble.sprite, crate);
          const worker: Worker = {
            root, mixer, actions, current: 'Idle', path: [], goal: 'inspect', face: 0,
            // Staggered pauses, so ten of them never step in unison, and each rounds a row on its own line.
            // Lanes are spread rather than random: random ones cluster, which is what we are avoiding.
            // Lanes are spread rather than random: random ones cluster, which is what we are avoiding.
            // Half start rounding rows from each end, so the two ends share the traffic from the off.
            pause: Math.random() * 4, speed: .9 + Math.random() * .6, lane: (i / COUNT) * 1.6, flip: i % 2 === 0,
            role, tag, bubble, skill: null, dots: 0, dotTimer: 0, crate, holding: false,
          };
          retarget(worker, e, workers);
          workers.push(worker);
        }
      }, undefined, () => {});
    },

    /** Ticks every worker. The crew sits beside the unit, so it takes the unit's offset by hand. */
    update(dt: number, e: Equipment, visible: boolean) {
      if (!workers.length) return;
      group.position.set(-e.length / 2, 0, -e.width / 2);
      group.visible = visible;
      if (!visible) return;
      for (const worker of workers) step(worker, dt, e, workers);
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
