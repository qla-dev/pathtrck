import type { Skill } from './types';

/**
 * Standing clear. Runs the moment a worker comes up against someone who is busy with their own
 * routine - it stands off and takes a fresh destination rather than waiting for them to finish,
 * which could be a minute. Nobody stacks up behind an inspection.
 */
export const aside: Skill = {
  name: 'aside',
  label: 'Making way',
  clips: ['No'],
  min: 1,
  max: 2,
};
