import type { Skill } from './types';

/**
 * Stepping out of the warehouse for a moment. The worker leaves through the door, stops somewhere in the
 * hall, looks back at the rooms for a few seconds and then goes back to work - through the door again.
 */
export const leaveRoom: Skill = {
  name: 'leave_room',
  label: 'Stepping out',
  clips: ['Wave', 'Yes'],
  min: 8,
  max: 15,
};
