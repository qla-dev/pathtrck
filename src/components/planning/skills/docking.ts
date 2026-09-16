import type { Skill } from './types';

/**
 * Docking: a dock worker inspecting one of the dock doors. The worker crosses the belts on their stiles,
 * stands beside the door facing the wall and checks it - door, seals, lights - for a good while. Only one
 * dock worker takes a door at a time.
 */
export const docking: Skill = {
  name: 'docking',
  label: 'Docking',
  clips: ['Yes', 'ThumbsUp', 'No'],
  min: 20,
  max: 40,
};
