import type { Skill } from './types';

/**
 * The office side of a consultation. While a crew member stands at the window, whoever sits inside
 * swivels round on their chair to face them, and turns back to their desk once the visitor leaves.
 * Lena already sits facing the window, so she only changes her bubble.
 *
 * Seated, so no gestures: any of the model's emotes would stand them up. It lasts exactly as long as
 * the visit it answers - see consult.
 */
export const receive: Skill = {
  name: 'receive',
  label: 'Consulting',
  clips: [],
  min: 30,
  max: 30,
};
