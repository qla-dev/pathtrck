import type { Skill } from './types';

/**
 * A round of the hall. The worker leaves through the door, walks to the nearer end of the hall, then
 * the whole length of it to the far end, and pauses there briefly before heading back in.
 */
export const roamHall: Skill = {
  name: 'roam_hall',
  label: 'Hall round',
  clips: ['ThumbsUp', 'Wave'],
  min: 3,
  max: 5,
};
