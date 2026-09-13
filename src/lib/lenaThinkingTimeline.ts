// What LenaAI's thinking indicator shows at any moment, and how long a finished answer waits so that every skill
// the reply uses gets its time on screen. The phrase loop starts with "razmišlja"; as soon as the used skills are
// known, each is named once ("koristi skill ...") for 7 seconds while the answer is still coming, or at least 3
// seconds once it is ready, and then the 7-second phrase loop continues.

export type LenaUsedSkill = { id: string; name: string };

export type LenaThinkingTimeline = {
  startedAt: number;
  skills?: LenaUsedSkill[];
  /** When the skills became known. */
  skillsAt?: number;
  /** When the answer arrived. */
  readyAt?: number;
};

export type LenaThinkingPhase = { key: string; endsAt: number } & (
  | { kind: 'phrase'; index: number }
  | { kind: 'skill'; skill: LenaUsedSkill }
);

export const LENA_PHRASE_MS = 7000;
export const LENA_SKILL_MIN_MS = 3000;
// The first phrase stays at least this long before a skill takes its place.
const FIRST_PHRASE_MIN_MS = 1500;
// A long wait only repeats 7-second phrases; the bound keeps a stale timeline from walking for ever.
const MAX_PHASES = 100_000;

const walk = (timeline: LenaThinkingTimeline, phraseCount: number, stop: (phase: LenaThinkingPhase) => boolean): LenaThinkingPhase => {
  const skills = timeline.skills ?? [];
  let startsAt = timeline.startedAt;
  let phrase = 0;
  let skillsShown = skills.length === 0;
  for (let steps = 0; steps < MAX_PHASES; steps += 1) {
    const skillsAt = timeline.skillsAt;
    const skillsFollow = !skillsShown && skillsAt !== undefined && skillsAt < startsAt + LENA_PHRASE_MS;
    const phraseEndsAt = skillsFollow ? Math.max(startsAt + FIRST_PHRASE_MIN_MS, skillsAt) : startsAt + LENA_PHRASE_MS;
    const phrasePhase: LenaThinkingPhase = { kind: 'phrase', key: `phrase-${phrase}`, index: phrase % Math.max(1, phraseCount), endsAt: phraseEndsAt };
    if (stop(phrasePhase)) return phrasePhase;
    startsAt = phraseEndsAt;
    phrase += 1;
    if (!skillsFollow) continue;

    for (let position = 0; position < skills.length; position += 1) {
      const { readyAt } = timeline;
      const skillEndsAt = readyAt !== undefined && readyAt < startsAt + LENA_PHRASE_MS
        ? Math.max(startsAt + LENA_SKILL_MIN_MS, readyAt)
        : startsAt + LENA_PHRASE_MS;
      const skillPhase: LenaThinkingPhase = { kind: 'skill', key: `skill-${position}`, skill: skills[position], endsAt: skillEndsAt };
      if (stop(skillPhase)) return skillPhase;
      startsAt = skillEndsAt;
    }
    skillsShown = true;
  }
  return { kind: 'phrase', key: 'phrase-last', index: 0, endsAt: startsAt + LENA_PHRASE_MS };
};

/** The phrase or skill the indicator shows at `now`. */
export const lenaThinkingPhaseAt = (timeline: LenaThinkingTimeline, phraseCount: number, now: number): LenaThinkingPhase =>
  walk(timeline, phraseCount, (phase) => now < phase.endsAt);

/** When the last used skill has had its time on screen; a ready answer waits until then. */
export const lenaSkillsShownAt = (timeline: LenaThinkingTimeline): number => {
  const skills = timeline.skills ?? [];
  if (!skills.length || timeline.skillsAt === undefined) return timeline.startedAt;
  return walk(timeline, 1, (phase) => phase.kind === 'skill' && phase.key === `skill-${skills.length - 1}`).endsAt;
};

/**
 * Requests a reply while asking the server which skills it uses. The timeline is reported as it fills in, and the
 * reply resolves only once each used skill has been shown for its minimum time.
 */
export const replyShowingSkills = async <T>({ startedAt, skills, reply, onTimeline }: {
  startedAt: number;
  skills: () => Promise<LenaUsedSkill[]>;
  reply: () => Promise<T>;
  onTimeline: (timeline: LenaThinkingTimeline) => void;
}): Promise<T> => {
  let timeline: LenaThinkingTimeline = { startedAt };
  const skillsKnown = skills()
    .catch(() => [] as LenaUsedSkill[])
    .then((usedSkills) => {
      timeline = { ...timeline, skills: usedSkills, skillsAt: Date.now() };
      onTimeline(timeline);
    });
  const result = await reply();
  await skillsKnown;
  timeline = { ...timeline, readyAt: Date.now() };
  onTimeline(timeline);
  const wait = lenaSkillsShownAt(timeline) - Date.now();
  if (wait > 0) await new Promise<void>((resolve) => { window.setTimeout(resolve, wait); });
  return result;
};
