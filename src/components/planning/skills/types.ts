/**
 * A worker's routine.
 *
 * These are scripted, deliberately not intelligent: a name for the bubble, the gestures it may play
 * and how long it runs. Nothing here calls a model or the network, and nothing should - the crew is
 * set dressing that has to stay free and predictable.
 */
export type SkillName = 'inspect' | 'unit' | 'carry' | 'interact_eachother' | 'avoid' | 'aside';

export type Skill = {
  name: SkillName;
  /** Shown in the worker's bubble while the routine runs; the loading dots are appended to it. */
  label: string;
  /** Gestures the routine may play, one picked at random each time it starts. */
  clips: string[];
  /** How long it runs, in seconds, picked somewhere between the two. */
  min: number;
  max: number;
};
