import type { Skill } from './types';

/**
 * Two workers meeting in an aisle. Both turn to face each other and talk for the same few seconds,
 * then both take a new destination.
 *
 * Going somewhere new afterwards is the point, not a detail: resuming the route they were on walks
 * them straight back into each other and they greet again, and again, and never get anywhere.
 */
export const interactEachother: Skill = {
  name: 'interact_eachother',
  label: 'Talking',
  clips: ['Wave', 'Yes', 'ThumbsUp'],
  min: 3,
  max: 6,
};
