import type { Skill } from './types';

/**
 * Dropping in at one of the offices at the end of the aisle for a consultation. The worker walks round
 * the far end of the racks, stands at the office window facing in, and talks it through for half a
 * minute. One visitor per office at a time and nobody queues: an office already booked is not offered.
 */
export const consult: Skill = {
  name: 'consult',
  label: 'Consultation',
  clips: ['Yes', 'ThumbsUp', 'Wave'],
  min: 30,
  max: 30,
};
