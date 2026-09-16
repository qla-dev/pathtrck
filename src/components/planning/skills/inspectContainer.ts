import type { Skill } from './types';

/**
 * Inspecting the container being planned in the warehouse. The worker goes to the unit's door end - from
 * the Garage that means out through its door, along the hall and in through the warehouse's - stands
 * facing the doors and looks it over before heading back.
 */
export const inspectContainer: Skill = {
  name: 'inspect_container',
  label: 'Inspecting container',
  clips: ['Yes', 'No', 'ThumbsUp'],
  min: 15,
  max: 30,
};
