import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { RACK_BAYS, RACK_SPAN, type Equipment } from './model';
import { DOOR, HALL_DEPTH, HALL_X, ROOM, ROOMS } from './rooms';
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
/**
 * Arms out in front while carrying. The model has no carry animation, so this is a pose laid over
 * whichever clip is playing - see step(), where it is applied after the mixer has had its say.
 */
const CARRY_POSE: [string, number][] = [['UpperArm.L', -1.15], ['UpperArm.R', -1.15], ['LowerArm.L', -.55], ['LowerArm.R', -.55]];

/** Roles are decorative, taken from the system's own labels; anyone not signed in is just a Worker. */
const ROLES = ['Dispatcher', 'Manager', 'Customs Agent', 'Finance', 'Driver'];
const WORKER_ROLE = 'Worker';

const FONT = 'bold 44px sans-serif';
const TAG_TONE = '#132638';
/** Bubbles take the app's primary, read from the theme so a rebrand carries through here too. */
let bubbleTone = '';
export const BUBBLE_TONE = () => {
  if (!bubbleTone) bubbleTone = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#00AEEF';
  return bubbleTone;
};

export type Footprint = { x0: number; x1: number; z0: number; z1: number };

/**
 * Cargo waiting on the floor, handed over by the scene each frame - it lays those out itself, so it
 * is the only thing that knows where they ended up.
 *
 * Module-level rather than threaded through every helper: update() sets it and then steps every
 * worker synchronously, so two scenes sharing this module can never read each other's.
 */
let parked: Footprint[] = [];
/** Where a worker stands outside an office window for a consultation, handed over by the office layer. */
export type ConsultSpot = { id: string; x: number; z: number };
/** The offices currently standing, set the same way as `parked`; empty while that layer is off. */
let consults: ConsultSpot[] = [];
/** How often a worker looking for something to do drops in at an office instead, if one is free. */
const CONSULT_CHANCE = .15;
/** How often one of the rest leaves the warehouse instead: stepping out, a round of the hall, a visit to another room. */
const OUTINGS = { leave: .06, roam: .05, visit: .07 };
type Plate = { sprite: T.Sprite; canvas: HTMLCanvasElement; texture: T.CanvasTexture };
/** Where to go, what to do there, and which way to turn once standing on the spot. */
type Goal = { point: T.Vector3; skill: SkillName; face: number };
type Worker = {
  root: T.Object3D; mixer: T.AnimationMixer; actions: Record<string, T.AnimationAction>; current: string;
  path: T.Vector3[]; goal: SkillName; face: number; pause: number; speed: number; lane: number; flip: boolean;
  role: string; tag: Plate; bubble: Plate; skill: SkillName | null; dots: number; dotTimer: number;
  crate: T.Mesh; holding: boolean; arms: { bone: T.Object3D; pitch: number }[];
  /** Only plain workers run packages, and they do nothing else; `from` is the side they collect from. */
  carrier: boolean; from: number;
  /** The office this worker has booked, from setting off until the consultation is over. */
  consult: string | null;
  /** The room a visit is to, for the bubble. */
  visit: string | null;
  /** Mid side step, making way: walking, but with the bubble up until the step is done. */
  steppingAside: boolean;
};

/** The scene's own label look: a dark rounded plate with white text, drawn over everything else. */
export const plate = (width: number): Plate => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = 76;
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.renderOrder = 10;
  sprite.scale.set(.32 * width / 76, .32, 1);
  return { sprite, canvas, texture };
};

/** Repaints a plate in place - the canvas is kept, so changing text costs no new texture. */
export const paint = (p: Plate, text: string, tone: string) => {
  const ctx = p.canvas.getContext('2d')!;
  ctx.clearRect(0, 0, p.canvas.width, p.canvas.height);
  ctx.fillStyle = tone; ctx.beginPath(); ctx.roundRect(0, 0, p.canvas.width, 76, 18); ctx.fill();
  ctx.font = FONT; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, p.canvas.width / 2, 40);
  p.texture.needsUpdate = true;
};

export const measure = (text: string) => {
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = FONT; return Math.ceil(ctx.measureText(text).width) + 48;
};

/** The x span a rack row covers, from its first bay to its last, with room for a body at each end. */
const rowSpan = (e: Equipment) => {
  const first = e.length / 2 - RACK_SPAN;
  return { x0: first - 1.4, x1: first + (RACK_BAYS - 1) * 3 + 1.4 };
};

/** Everything a worker has to walk around, in the same model-local metres the scene uses. */
const obstacles = (e: Equipment): Footprint[] => {
  const { x0, x1 } = rowSpan(e);
  const rows = ROWS.map(dz => ({ x0, x1, z0: e.width / 2 + dz - .8, z1: e.width / 2 + dz + .8 }));
  // Room edges: each room's hall side is closed but for its door, and the rooms are closed off from each
  // other along their whole depth. The outside of the site is the floor bounds.
  const edge = e.length / 2 + HALL_X, centre = e.width / 2, back = e.length / 2 - ROOM / 2;
  const wall: Footprint[] = ROOMS.flatMap(room => {
    const door = centre + room.z;
    return [{ x0: edge - .3, x1: edge + .3, z0: door - ROOM / 2, z1: door - DOOR / 2 }, { x0: edge - .3, x1: edge + .3, z0: door + DOOR / 2, z1: door + ROOM / 2 }];
  });
  for (const z of [centre - ROOM / 2, centre + ROOM / 2]) wall.push({ x0: back - .5, x1: edge + .3, z0: z - .3, z1: z + .3 });
  // The unit itself, a truck's cab reaching out past its nose, then whatever is stacked on the floor.
  return [...rows, ...wall, { x0: e.truck ? -2.6 : -.3, x1: e.length + .3, z0: -.3, z1: e.width + .3 }, ...parked];
};

type Area = 'hall' | (typeof ROOMS)[number]['key'];
/**
 * The site as the crew walks it: which area a point is in, the spot just inside each room's door and the
 * lane along the hall past the doors - clear of anyone standing at an office window.
 */
const site = (e: Equipment) => {
  const ground = groundOf(e), edge = e.length / 2 + HALL_X, centre = e.width / 2;
  const doorZ = (area: Area) => centre + (ROOMS.find(room => room.key === area)?.z ?? 0);
  return {
    ground, edge,
    /**
     * The hall lane, one-way by direction so nobody meets anyone head-on in it: walking towards +z keeps
     * nearer the rooms, towards -z a metre further out. Both pass every door, clear of office windows.
     */
    laneFor: (fromZ: number, toZ: number) => edge + (toZ >= fromZ ? 1 : 1.9),
    /** Near a door, where every walk between areas squeezes through the same gap. */
    atDoor: (p: T.Vector3) => Math.abs(p.x - edge) < 2.6 && ROOMS.some(room => Math.abs(p.z - centre - room.z) < 2.6),
    areaOf: (p: T.Vector3): Area => (p.x > edge ? 'hall' : ROOMS.reduce((best, room) => (Math.abs(p.z - centre - room.z) < Math.abs(p.z - centre - best.z) ? room : best)).key),
    /** The warehouse's is clear of the row ends; the other rooms are empty, so theirs is just inside. */
    inside: (area: Area) => new T.Vector3(area === 'warehouse' ? rowSpan(e).x1 + .45 : edge - 1.2, ground, doorZ(area)),
  };
};

/** The warehouse floor slab, inset so nobody walks off its edge. */
const floorBounds = (e: Equipment): Footprint => {
  // The whole site - all three rooms and the hall across them; the walls between are obstacles with doors in them.
  const halfZ = ROOM * ROOMS.length / 2 - .8;
  return { x0: e.length / 2 - ROOM / 2 + .8, x1: e.length / 2 + HALL_X + HALL_DEPTH - .5, z0: e.width / 2 - halfZ, z1: e.width / 2 + halfZ };
};

const within = (b: Footprint, x: number, z: number) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1;
const blocked = (list: Footprint[], x: number, z: number) => list.some(b => within(b, x, z));
/** Whether a straight walk from a to b stays clear of everything, checked every quarter metre. */
const clearLeg = (list: Footprint[], ax: number, az: number, bx: number, bz: number) => {
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / .25));
  for (let i = 1; i <= steps; i++) if (blocked(list, ax + (bx - ax) * i / steps, az + (bz - az) * i / steps)) return false;
  return true;
};
const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

/** Workers keep a body's width between them, so nobody walks through anybody. */
const SPACING = .9;
/** How far ahead a worker looks for someone coming the other way, to give way before they meet. */
const LOOKAHEAD = 2.4;
/** Talking distance: they meet at arm's length, so they step back before starting. */
const TALK_GAP = 1.8;
/** Routines that are only a moment's pause on the way somewhere; whoever is in one is not an obstacle. */
const PASSING: SkillName[] = ['avoid', 'aside'];
/**
 * Whoever stands in the way of a step, if anyone. Someone only pausing to make way is walked past: two
 * workers making way for each other would otherwise keep each other stood aside for good - the crowd
 * that used to build up at a door.
 */
const blocker = (all: Worker[], self: Worker, x: number, z: number) => all.find(other => {
  if (other === self || other.steppingAside || (other.skill && PASSING.includes(other.skill))) return false;
  const gap = Math.hypot(other.root.position.x - x, other.root.position.z - z);
  if (gap >= SPACING) return false;
  // Being too close already only blocks a step that closes the gap further - otherwise two workers
  // who ended up overlapping would each block every move the other made and both stand there forever.
  return gap < Math.hypot(other.root.position.x - self.root.position.x, other.root.position.z - self.root.position.z);
});

/** Which way a worker is walking, as a unit vector, or null while standing or busy. */
const headingOf = (w: Worker): [number, number] | null => {
  const goal = w.path[0];
  if (!goal || w.skill || w.pause > 0) return null;
  const dx = goal.x - w.root.position.x, dz = goal.z - w.root.position.z, d = Math.hypot(dx, dz);
  return d < 1e-4 ? null : [dx / d, dz / d];
};

/** Facing, in the same convention the walk uses: the way to turn to look at something across z. */
const facing = (towards: number, from: number) => Math.atan2(0, towards - from);

/** A bay to inspect: a random rack row, standing in the aisle on the unit's side of it. */
const baySpot = (e: Equipment, side?: number): Goal => {
  const rows = side ? ROWS.filter(dz => Math.sign(dz) === side) : ROWS;
  const span = RACK_SPAN, bays = RACK_BAYS, dz = rows[Math.floor(Math.random() * rows.length)];
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

const pickGoal = (e: Equipment, side?: number): Goal => (Math.random() < .25 ? unitSpot(e) : baySpot(e, side));

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
 * A walk anywhere on the site. Within one area it is that area's own route; between areas it always goes
 * by the doors - out of the room it starts in, along the hall lane, and in through the door of the room it
 * ends in - since nobody crosses a room's edge anywhere else.
 */
const routeTo = (e: Equipment, from: T.Vector3, to: T.Vector3, lane: number, flip = false): T.Vector3[] => {
  const s = site(e), a = s.areaOf(from), b = s.areaOf(to), y = s.ground;
  if (a === b) {
    if (a === 'warehouse') return aisleRoute(e, from, to, lane, flip);
    if (a === 'hall') { const x = s.laneFor(from.z, to.z); return [new T.Vector3(x, y, from.z), new T.Vector3(x, y, to.z), to.clone()]; }
    // Fleet and Docks are empty rooms: square across them.
    return [new T.Vector3(to.x, y, from.z), to.clone()];
  }
  const path: T.Vector3[] = [];
  // Which way along the hall this walk goes decides its lane, from its first step in the hall to its last.
  const hallX = s.laneFor(a === 'hall' ? from.z : s.inside(a).z, b === 'hall' ? to.z : s.inside(b).z);
  let at = from;
  if (a !== 'hall') {
    const inside = s.inside(a);
    path.push(...(a === 'warehouse' ? aisleRoute(e, from, inside, lane, flip, true) : [new T.Vector3(inside.x, y, from.z), inside]));
    at = new T.Vector3(hallX, y, inside.z);
    path.push(at);
  }
  if (b === 'hall') return [...path, ...routeTo(e, at, to, lane, flip)];
  const inside = s.inside(b);
  path.push(new T.Vector3(hallX, y, at.z), new T.Vector3(hallX, y, inside.z), inside);
  return [...path, ...routeTo(e, inside, to, lane, flip)];
};

/**
 * Inside the warehouse. Rows are parallel walls running along x, all sharing one x span, so the only way
 * from one aisle to the next is around their ends - which are clear of the unit as well. When something
 * stands between the two z values, the route goes out to the nearer end, along it, and back in; otherwise
 * straight. Each worker rounds the end on its own slightly different line, so ten of them do not file
 * through one point. `toDoor` always takes the end by the door: the other end's last leg would run
 * through the unit.
 */
const aisleRoute = (e: Equipment, from: T.Vector3, to: T.Vector3, lane: number, flip = false, toDoor = false): T.Vector3[] => {
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
  const preferred = (flip ? !nearer : nearer) ? left : right, other = preferred === left ? right : left;
  // Standing off the end of the unit, the far row end lies straight through it. That first leg is
  // blocked from its first step, and every retarget rebuilds the same one - so take the open end.
  const edge = toDoor ? right : clearLeg(list, from.x, from.z, preferred, from.z) || !clearLeg(list, from.x, from.z, other, from.z) ? preferred : other;
  return [new T.Vector3(edge, to.y, from.z), new T.Vector3(edge, to.y, to.z), to.clone()];
};

const fadeTo = (w: Worker, name: string, duration = .4) => {
  if (w.current === name) return;
  const next = w.actions[name]; if (!next) return;
  w.actions[w.current]?.fadeOut(duration);
  next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(duration).play();
  w.current = name;
};

/** What a worker's bubble says for a routine: a visit names its room, everything else its own label. */
const labelOf = (w: Worker, name: SkillName) => {
  const room = name === 'visit_room' ? ROOMS.find(r => r.key === w.visit) : undefined;
  return room ? `${room.title.charAt(0)}${room.title.slice(1).toLowerCase()} visit` : SKILLS[name].label;
};

const startSkill = (w: Worker, name: SkillName) => {
  const skill = SKILLS[name];
  w.skill = name;
  // A routine starting ends any side step, whose bubble it takes over.
  w.steppingAside = false;
  w.pause = skill.min + Math.random() * (skill.max - skill.min);
  w.dots = 0; w.dotTimer = 0;
  fadeTo(w, skill.clips[Math.floor(Math.random() * skill.clips.length)], .2);
  paint(w.bubble, labelOf(w, name), BUBBLE_TONE());
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

/** The bubble for the walk across, and for getting back to it after something interrupts the run. */
const showCarrying = (w: Worker) => {
  paint(w.bubble, SKILLS.carry.label, BUBBLE_TONE());
  w.bubble.sprite.visible = true;
};

/** Start a run: go and collect from whichever side it is this worker's turn to clear. */
const startErrand = (w: Worker, e: Equipment) => {
  const pickup = baySpot(e, w.from);
  w.goal = 'carry';
  w.face = pickup.face;
  w.path = routeTo(e, w.root.position, pickup.point, w.lane, w.flip);
};

/** The far end of a run: the rows on the other side, where the package gets put away. */
const headForDelivery = (w: Worker, e: Equipment) => {
  const drop = baySpot(e, -w.from);
  w.goal = 'carry';
  w.face = drop.face;
  w.path = routeTo(e, w.root.position, drop.point, w.lane, w.flip);
};

const takeCrate = (w: Worker, e: Equipment) => {
  w.holding = true;
  w.crate.visible = true;
  showCarrying(w);
  headForDelivery(w, e);
};

/**
 * Stepping out of something already stood in.
 *
 * Once a worker is inside a footprint every step out of it is blocked too, so it retargets, and the
 * new route is blocked from its first step as well - stuck for good. This is the way back out.
 */
const escape = (w: Worker, e: Equipment, list: Footprint[]) => {
  const p = w.root.position;
  const box = list.find(b => within(b, p.x, p.z));
  if (!box) return;
  const ways: [number, number][] = [[box.x0 - .4, p.z], [box.x1 + .4, p.z], [p.x, box.z0 - .4], [p.x, box.z1 + .4]];
  const out = ways.filter(([x, z]) => !blocked(list, x, z)).sort((a, b) => Math.hypot(a[0] - p.x, a[1] - p.z) - Math.hypot(b[0] - p.x, b[1] - p.z))[0];
  if (out) p.set(out[0], groundOf(e), out[1]);
};

const dropCrate = (w: Worker) => { w.holding = false; w.crate.visible = false; };

/**
 * Books a consultation at a free office and sets off for it. Nobody queues: an office someone else has
 * booked - on the way there or already at the window - is simply not offered, so each has one visitor
 * at most. The hall is only reached through a door, so the walk goes out of whichever room the worker is
 * in, along the hall and up to the window.
 */
const bookConsult = (w: Worker, e: Equipment, all: Worker[]) => {
  const free = consults.filter(c => !all.some(other => other !== w && other.consult === c.id));
  if (!free.length) return false;
  const spot = free[Math.floor(Math.random() * free.length)];
  w.consult = spot.id;
  w.goal = 'consult';
  // Facing +x, into the office.
  w.face = Math.PI / 2;
  w.path = routeTo(e, w.root.position, new T.Vector3(spot.x, groundOf(e), spot.z), w.lane, w.flip);
  return true;
};

/** Out of the warehouse into the hall, to stand a while somewhere clear of the lane and the office windows. */
const stepOut = (w: Worker, e: Equipment) => {
  const s = site(e), reach = ROOM * ROOMS.length / 2 - 2;
  const spot = new T.Vector3(s.edge + 2.9 + Math.random() * 1.3, s.ground, e.width / 2 + (Math.random() * 2 - 1) * reach);
  w.goal = 'leave_room';
  // Looking back at the rooms.
  w.face = -Math.PI / 2;
  w.path = routeTo(e, w.root.position, spot, w.lane, w.flip);
};

/** Into the hall and along it end to end: the nearer end first, then the whole length to the far one. */
const roamHall = (w: Worker, e: Equipment) => {
  const s = site(e), reach = ROOM * ROOMS.length / 2 - 1.5, p = w.root.position;
  const [near, far] = [e.width / 2 - reach, e.width / 2 + reach].sort((a, b) => Math.abs(a - p.z) - Math.abs(b - p.z));
  w.goal = 'roam_hall';
  // Facing the way the round went, as if about to turn back.
  w.face = far > near ? 0 : Math.PI;
  const x = s.laneFor(near, far);
  w.path = [...routeTo(e, p, new T.Vector3(x, s.ground, near), w.lane, w.flip), new T.Vector3(x, s.ground, far)];
};

/** Over to Fleet or Docks, by the doors, to a spot somewhere inside. */
const visitRoom = (w: Worker, e: Equipment) => {
  const others = ROOMS.filter(room => room.key !== 'warehouse'), room = others[Math.floor(Math.random() * others.length)];
  const inner = ROOM / 2 - 4;
  const spot = new T.Vector3(e.length / 2 + (Math.random() * 2 - 1) * inner, groundOf(e), e.width / 2 + room.z + (Math.random() * 2 - 1) * inner);
  w.visit = room.key;
  w.goal = 'visit_room';
  w.face = Math.random() * Math.PI * 2;
  w.path = routeTo(e, w.root.position, spot, w.lane, w.flip);
};

/** How far a side step takes a worker out of the way. */
const SIDE_STEP = 1.2;
/**
 * Making way for someone busy: a sharp quarter turn on the spot towards whichever side is open - away
 * from them, if both are - a step that way, then on to where the walk was going. With neither side
 * open, it stands off briefly and picks somewhere new instead.
 */
const makeWay = (w: Worker, e: Equipment, other: Worker, hx: number, hz: number) => {
  const p = w.root.position, list = obstacles(e), bounds = floorBounds(e), ground = groundOf(e);
  const away = Math.sign((other.root.position.x - p.x) * hz - (other.root.position.z - p.z) * hx) || 1;
  const step = [away, -away].map(side => new T.Vector3(p.x - hz * side * SIDE_STEP, ground, p.z + hx * side * SIDE_STEP))
    .find(point => within(bounds, point.x, point.z) && clearLeg(list, p.x, p.z, point.x, point.z));
  if (!step) { w.path = []; startSkill(w, 'aside'); return; }
  const destination = w.path[w.path.length - 1];
  w.root.rotation.y = Math.atan2(step.x - p.x, step.z - p.z);
  w.path = [step, ...(destination ? routeTo(e, step, destination, w.lane, w.flip) : [])];
  w.steppingAside = true;
  paint(w.bubble, labelOf(w, 'aside'), BUBBLE_TONE());
  w.bubble.sprite.visible = true;
  fadeTo(w, 'Walking', .1);
};

const retarget = (w: Worker, e: Equipment, all: Worker[]) => {
  // Whatever sends a worker looking for something new ends any booking or visit it held, done or abandoned.
  w.consult = null;
  w.visit = null;
  // A package is never abandoned: whatever sends a carrier looking for something new - walled in, a
  // stand-off, nowhere to step - it goes back to finishing the delivery instead.
  if (w.holding) { headForDelivery(w, e); return; }
  if (Math.random() < CONSULT_CHANCE && bookConsult(w, e, all)) return;
  // Runners only run: whatever sends one looking for something to do, it goes and fetches the next one.
  if (w.carrier) { startErrand(w, e); return; }
  // The rest now and then leave the warehouse for a while.
  const outing = Math.random();
  if (outing < OUTINGS.leave) { stepOut(w, e); return; }
  if (outing < OUTINGS.leave + OUTINGS.roam) { roamHall(w, e); return; }
  if (outing < OUTINGS.leave + OUTINGS.roam + OUTINGS.visit) { visitRoom(w, e); return; }
  const goal = freeGoal(e, all, w);
  w.goal = goal.skill;
  w.face = goal.face;
  w.path = routeTo(e, w.root.position, goal.point, w.lane, w.flip);
};

const step = (w: Worker, dt: number, e: Equipment, all: Worker[]) => {
  w.mixer.update(dt);
  // The walk swings the arms, so the carry pose is laid on after the mixer has written the clip.
  // Set it before that line and the animation simply overwrites it every frame.
  if (w.holding) for (const arm of w.arms) arm.bone.rotation.x = arm.pitch;
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
    if (w.dotTimer > .45) { w.dotTimer = 0; w.dots = (w.dots + 1) % 4; paint(w.bubble, labelOf(w, w.skill) + '.'.repeat(w.dots), BUBBLE_TONE()); }
  }

  if (w.pause > 0) {
    w.pause -= dt;
    if (w.pause <= 0) {
      const finished = w.skill;
      endSkill(w);
      // A run has a routine at each end: take the package, carry it over, set it down - then turn
      // round and clear the other side, so a runner is always on a job.
      if (finished === 'carry' && !w.holding) takeCrate(w, e);
      else if (finished === 'carry') {
        dropCrate(w); w.from = -w.from;
        // Hands free between runs is when a runner might drop in at an office.
        if (!(Math.random() < CONSULT_CHANCE && bookConsult(w, e, all))) startErrand(w, e);
      }
      else {
        // Interrupted mid-run - gave way, stood aside, stopped to talk - so put the carrying bubble
        // back up and pick the delivery up again rather than wandering off with the package.
        if (w.holding) showCarrying(w);
        if (w.holding && !w.path.length) headForDelivery(w, e);
        // A finished routine leaves no path, so that picks somewhere new; a wait resumes the route.
        else if (!w.path.length) retarget(w, e, all);
      }
      fadeTo(w, 'Walking');
    }
    return;
  }

  const goal = w.path[0];
  if (!goal) { retarget(w, e, all); return; }

  const dx = goal.x - pos.x, dz = goal.z - pos.z, dist = Math.hypot(dx, dz);
  if (dist < .3) {
    w.path.shift();
    if (w.steppingAside) { w.steppingAside = false; if (w.holding) showCarrying(w); else if (!w.skill) w.bubble.sprite.visible = false; }
    // Standing on the spot: turn to whatever is being looked at, then run the routine.
    if (!w.path.length) { w.root.rotation.y = w.face; startSkill(w, w.goal); }
    return;
  }

  const travel = Math.min(dist, w.speed * dt);
  const list = obstacles(e), bounds = floorBounds(e);
  // Standing inside something already: get out first, or every step from here is blocked.
  if (blocked(list, pos.x, pos.z)) { escape(w, e, list); retarget(w, e, all); return; }
  let x = pos.x + dx / dist * travel, z = pos.z + dz / dist * travel;
  // Walk into a rack or the unit and slide along it rather than through it; walled in, go elsewhere.
  if (blocked(list, x, z)) {
    if (!blocked(list, x, pos.z)) z = pos.z;
    else if (!blocked(list, pos.x, z)) x = pos.x;
    else { retarget(w, e, all); return; }
  }
  x = clamp(x, bounds.x0, bounds.x1);
  z = clamp(z, bounds.z0, bounds.z1);
  // Clamping to the slab can push a step back into something the check above had cleared.
  if (blocked(list, x, z)) { retarget(w, e, all); return; }

  // At a door everyone files through, walking past each other for the moment it takes: giving way or
  // stopping to talk in a gap that narrow only jams it.
  const doorway = site(e).atDoor(pos);
  // Somebody coming the other way, not yet in the way: break step and take a different line to the
  // same place, so the two of them pass instead of meeting. Only somebody actually walking towards us -
  // following someone the same way is no reason to dodge.
  const ahead = !doorway && all.find(other => {
    if (other === w || other.skill) return false;
    const ox = other.root.position.x - pos.x, oz = other.root.position.z - pos.z, range = Math.hypot(ox, oz);
    if (range > LOOKAHEAD || range < 1e-4) return false;
    const heading = headingOf(other);
    return (ox * dx + oz * dz) / (range * dist) > .7 && !!heading && heading[0] * dx / dist + heading[1] * dz / dist < -.3;
  });
  // Walks with a fixed shape - to a window, a hall round's two ends - are not rerouted.
  if (ahead && w.goal !== 'consult' && w.goal !== 'roam_hall') {
    // Round the other end of the row on a different line, rather than queueing behind them.
    w.flip = !w.flip;
    w.lane = (w.lane + .8) % 1.6;
    w.path = routeTo(e, pos, w.path[w.path.length - 1], w.lane, w.flip);
    startSkill(w, 'avoid');
    return;
  }

  // Someone in the way: two on the move stop and talk, otherwise stand clear of whoever is working.
  // Either way the path is dropped, so nobody ever resumes a route that is already blocked.
  const other = doorway ? undefined : blocker(all, w, x, z);
  if (other) {
    const heading = headingOf(other);
    // Right behind someone going the same way: just wait a step for them to move on.
    if (!other.skill && heading && heading[0] * dx / dist + heading[1] * dz / dist > .3) return;
    if (other.skill) makeWay(w, e, other, dx / dist, dz / dist);
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
          // Arm bones resolved once per clone; anything the rig does not have is skipped, not thrown.
          const arms = CARRY_POSE.flatMap(([name, pitch]) => { const bone = root.getObjectByName(name); return bone ? [{ bone, pitch }] : []; });
          group.add(root, tag.sprite, bubble.sprite, crate);
          const worker: Worker = {
            root, mixer, actions, current: 'Idle', path: [], goal: 'inspect', face: 0,
            // Staggered pauses, so ten of them never step in unison, and each rounds a row on its own line.
            // Lanes are spread rather than random: random ones cluster, which is what we are avoiding.
            // Lanes are spread rather than random: random ones cluster, which is what we are avoiding.
            // Half start rounding rows from each end, so the two ends share the traffic from the off.
            pause: Math.random() * 4, speed: .9 + Math.random() * .6, lane: (i / COUNT) * 1.6, flip: i % 2 === 0,
            role, tag, bubble, skill: null, dots: 0, dotTimer: 0, crate, holding: false, arms,
            // Only the unsigned ones run packages, and they start from alternate sides.
            carrier: role === WORKER_ROLE, from: i % 2 ? 1 : -1, consult: null, visit: null, steppingAside: false,
          };
          retarget(worker, e, workers);
          workers.push(worker);
        }
      }, undefined, () => {});
    },

    /** Ticks every worker. The crew sits beside the unit, so it takes the unit's offset by hand. */
    update(dt: number, e: Equipment, visible: boolean, waiting: Footprint[] = [], offices: ConsultSpot[] = []) {
      parked = waiting;
      consults = offices;
      if (!workers.length) return;
      group.position.set(-e.length / 2, 0, -e.width / 2);
      group.visible = visible;
      if (!visible) return;
      for (const worker of workers) step(worker, dt, e, workers);
    },

    /** The offices with someone standing at the window right now, for the office layer to show. */
    consulting(): string[] {
      return workers.flatMap(w => (w.skill === 'consult' && w.consult ? [w.consult] : []));
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
