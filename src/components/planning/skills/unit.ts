import type { Skill } from './types';

/**
 * Checking the unit in the middle of the floor. The worker stands alongside the container, clear of
 * its footprint, and faces it. Roughly one trip in four goes here rather than to a rack.
 */
export const unit: Skill = {
  name: 'unit',
  label: 'Checking unit',
  clips: ['ThumbsUp', 'Yes'],
  min: 10,
  max: 25,
};
