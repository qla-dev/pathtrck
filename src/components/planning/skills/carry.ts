import type { Skill } from './types';

/**
 * A run across the floor: collect a package from the tracking rows and carry it over to the
 * warehouse ones.
 *
 * The only routine with two ends. It runs once where the package is picked up and again where it is
 * put down, and in between the worker walks the whole width of the floor holding it - so this is
 * also the one routine that survives being interrupted, rather than being abandoned half done.
 */
export const carry: Skill = {
  name: 'carry',
  label: 'Carrying',
  clips: ['Yes', 'ThumbsUp'],
  min: 2,
  max: 4,
};
