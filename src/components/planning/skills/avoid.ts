import type { Skill } from './types';

/**
 * Giving way early. Runs when another worker is coming the other way but has not blocked anyone yet:
 * the worker breaks step and re-routes on a different line to the same destination.
 *
 * This is the cheap half of keeping the crew apart. The dear half happens before anyone moves - each
 * worker rounds the rack rows on its own line, and no two head for the same spot - so most meetings
 * never happen at all and this only catches what is left.
 */
export const avoid: Skill = {
  name: 'avoid',
  label: 'Avoiding',
  clips: ['No'],
  min: .6,
  max: 1.4,
};
