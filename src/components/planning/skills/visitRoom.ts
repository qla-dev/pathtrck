import type { Skill } from './types';

/**
 * Looking in on one of the other rooms - Fleet or Docks. The worker leaves through the warehouse door,
 * walks the hall to that room's door, goes in to a spot inside and spends a while there before coming
 * back the same way. Each room has one door and nobody crosses a room's edge anywhere else.
 *
 * The bubble names the room ("Fleet visit"); this label is the generic form.
 */
export const visitRoom: Skill = {
  name: 'visit_room',
  label: 'Room visit',
  clips: ['Yes', 'No', 'ThumbsUp'],
  min: 15,
  max: 30,
};
