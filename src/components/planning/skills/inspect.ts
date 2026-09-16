import type { Skill } from './types';

/**
 * Looking over a rack bay: the long one. The worker walks to the aisle in front of a row, turns to
 * the shelves and works through them for up to a minute before moving on to another bay.
 */
export const inspect: Skill = {
  name: 'inspect',
  label: 'Inspection',
  clips: ['Yes', 'No', 'ThumbsUp', 'Wave'],
  min: 20,
  max: 60,
};
