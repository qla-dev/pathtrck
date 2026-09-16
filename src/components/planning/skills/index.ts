import { aside } from './aside';
import { avoid } from './avoid';
import { carry } from './carry';
import { inspect } from './inspect';
import { interactEachother } from './interactEachother';
import type { Skill, SkillName } from './types';
import { unit } from './unit';

export type { Skill, SkillName };

/** Every routine a worker can run, keyed by name. Add a file, then add it here. */
export const SKILLS: Record<SkillName, Skill> = { inspect, unit, carry, interact_eachother: interactEachother, avoid, aside };

/** The widest bubble any routine needs, so the plate is sized once and only ever repainted. */
export const WIDEST_LABEL = Object.values(SKILLS).reduce((widest, skill) => (skill.label.length > widest.length ? skill.label : widest), '');
