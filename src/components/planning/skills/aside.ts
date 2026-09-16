import type { Skill } from './types';

/**
 * Making way. The moment a worker comes up against someone busy with their own routine, it turns a
 * sharp 90 degrees on the spot and walks a step clear to whichever side is open, then carries on to
 * where it was going - no standing about, and nobody stacks up behind an inspection. Only when
 * neither side is open does it stand off for a moment and take a fresh destination instead.
 *
 * The side step is a walk, not a pause, so min and max apply to that fallback alone.
 */
export const aside: Skill = {
  name: 'aside',
  label: 'Making way',
  clips: ['No'],
  min: 1,
  max: 2,
};
