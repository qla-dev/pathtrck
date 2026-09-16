import type { Skill } from './types';

/**
 * A mechanic working on one of the fleet's trucks in the Garage. The mechanic walks to the lane side of a
 * parked truck, turns to it and works on it for a good while - hammering away (Punch) between checks.
 * Only one mechanic takes a truck at a time.
 */
export const fixTruck: Skill = {
  name: 'fix_truck',
  label: 'Fixing truck',
  clips: ['Punch', 'Yes', 'ThumbsUp'],
  min: 20,
  max: 45,
};
