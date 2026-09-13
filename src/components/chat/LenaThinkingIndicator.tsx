import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BrainCircuit } from 'lucide-react';
import { lenaThinkingPhaseAt, type LenaThinkingTimeline } from '../../lib/lenaThinkingTimeline';

const shimmer = 'animate-text-shimmer bg-[length:200%_100%] bg-[linear-gradient(90deg,#94a3b8_20%,#334155_50%,#94a3b8_80%)] bg-clip-text text-transparent dark:bg-[linear-gradient(90deg,#64748b_20%,#f8fafc_50%,#64748b_80%)]';

type LenaThinkingIndicatorProps = {
  phrases: string[];
  /** Present while a reply is on its way: drives the phrase loop and names the skills the reply uses. */
  timeline?: LenaThinkingTimeline | null;
  /** Shown before a skill's name, e.g. "koristi skill". */
  skillLabel?: string;
};

const SkillText = ({ label, name }: { label: string; name: string }) => (
  <span className="inline-flex items-center gap-1 whitespace-nowrap">
    <span className={shimmer}>{label}</span>
    <BrainCircuit aria-hidden="true" className="h-4 w-4 shrink-0" />
    <span className={shimmer}>{name}</span>
  </span>
);

export const LenaThinkingIndicator = ({ phrases, timeline, skillLabel = 'is using skill' }: LenaThinkingIndicatorProps) => {
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const reducedMotion = useReducedMotion();
  const phase = timeline ? lenaThinkingPhaseAt(timeline, phrases.length, now) : null;
  const phaseEndsAt = phase?.endsAt;

  // Without a timeline the phrases simply rotate every 7 seconds.
  useEffect(() => {
    if (timeline || phrases.length < 2) return;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % phrases.length), 7000);
    return () => window.clearInterval(timer);
  }, [timeline, phrases.length]);

  // With one, recompute when it changes and again when the current phrase or skill ends.
  useEffect(() => { setNow(Date.now()); }, [timeline]);
  useEffect(() => {
    if (phaseEndsAt === undefined) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, phaseEndsAt - Date.now()) + 16);
    return () => window.clearTimeout(timer);
  }, [phaseEndsAt]);

  const phraseAt = (position: number) => phrases[position % Math.max(1, phrases.length)] || '';
  const current = phase?.kind === 'skill'
    ? { key: phase.key, label: `${skillLabel} ${phase.skill.name}`, content: <SkillText label={skillLabel} name={phase.skill.name} /> }
    : { key: phase?.key ?? String(index), label: phraseAt(phase?.kind === 'phrase' ? phase.index : index), content: <span className={shimmer}>{phraseAt(phase?.kind === 'phrase' ? phase.index : index)}</span> };

  return (
    <span className="inline-flex max-w-full items-baseline gap-1 text-slate-500 dark:text-slate-400" role="status" aria-label={`LenaAI ${current.label}`}>
      <span aria-hidden="true" className="shrink-0">LenaAI</span>
      <span aria-hidden="true" className="relative inline-grid overflow-hidden align-bottom">
        {/* Reserve the longest phrase's or skill's width so the fixed name never shifts. */}
        {phrases.map(text => <span key={text} className="invisible col-start-1 row-start-1 whitespace-nowrap">{text}</span>)}
        {(timeline?.skills ?? []).map(skill => <span key={skill.id} className="invisible col-start-1 row-start-1"><SkillText label={skillLabel} name={skill.name} /></span>)}
        <AnimatePresence initial={false}>
          <motion.span
            key={current.key}
            className="absolute inset-0 whitespace-nowrap"
            initial={{ y: reducedMotion ? 0 : '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reducedMotion ? 0 : '-100%', opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.4, ease: 'easeInOut' }}
          >
            {current.content}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
};
