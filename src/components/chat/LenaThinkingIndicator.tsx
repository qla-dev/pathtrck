import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BrainCircuit, Mic } from 'lucide-react';
import { lenaThinkingPhaseAt, type LenaThinkingTimeline } from '../../lib/lenaThinkingTimeline';

type LenaThinkingIndicatorProps = {
  phrases: string[];
  /** Present while a reply is on its way: drives the phrase loop and names the skills the reply uses. */
  timeline?: LenaThinkingTimeline | null;
  /** Shown before a skill's name, e.g. "koristi skill". */
  skillLabel?: string;
  voiceMode?: boolean;
  voiceLanguage?: string;
};

const SkillText = ({ label, name }: { label: string; name: string }) => (
  <span className="inline-flex items-center gap-1 whitespace-nowrap">
    {label}
    <BrainCircuit aria-hidden="true" className="h-4 w-4 shrink-0" />
    {name}
  </span>
);

export const LenaThinkingIndicator = ({ phrases, timeline, skillLabel = 'is using skill', voiceMode = false, voiceLanguage = 'en' }: LenaThinkingIndicatorProps) => {
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const reducedMotion = useReducedMotion();
  const phraseCount = phrases.length + (voiceMode ? 2 : 0);
  const listeningLabel = ({ en: 'is listening to your message', de: 'hört Ihre Nachricht an', bs: 'sluša vašu poruku', hr: 'sluša vašu poruku', sr: 'слуша вашу поруку' } as Record<string, string>)[voiceLanguage.split(/[-_]/)[0]] || 'is listening to your message';
  const listeningContent = <span className="inline-flex items-center gap-1 whitespace-nowrap"><Mic aria-hidden="true" className="h-4 w-4 shrink-0" />{listeningLabel}</span>;
  const recordingLabel = ({ en: 'is recording the reply', de: 'nimmt die Antwort auf', bs: 'snima odgovor', hr: 'snima odgovor', sr: 'снима одговор' } as Record<string, string>)[voiceLanguage.split(/[-_]/)[0]] || 'is recording the reply';
  const recordingContent = <span className="inline-flex items-center gap-1 whitespace-nowrap"><Mic aria-hidden="true" className="h-4 w-4 shrink-0" />{recordingLabel}</span>;
  const phase = timeline ? lenaThinkingPhaseAt(timeline, phraseCount, now) : null;
  const phaseEndsAt = phase?.endsAt;

  // Without a timeline the phrases simply rotate every 7 seconds.
  useEffect(() => {
    if (timeline || phraseCount < 2) return;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % phraseCount), 7000);
    return () => window.clearInterval(timer);
  }, [timeline, phraseCount]);

  // With one, recompute when it changes and again when the current phrase or skill ends.
  useEffect(() => { setNow(Date.now()); }, [timeline]);
  useEffect(() => {
    if (phaseEndsAt === undefined) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, phaseEndsAt - Date.now()) + 16);
    return () => window.clearTimeout(timer);
  }, [phaseEndsAt]);

  const phraseAt = (position: number) => phrases[position % Math.max(1, phrases.length)] || '';
  const phraseIndex = (phase?.kind === 'phrase' ? phase.index : index) % Math.max(1, phraseCount);
  const current = phase?.kind === 'skill'
    ? { key: phase.key, label: `${skillLabel} ${phase.skill.name}`, content: <SkillText label={skillLabel} name={phase.skill.name} /> }
    : voiceMode && phraseIndex === 0
      ? { key: phase?.key ?? String(index), label: listeningLabel, content: listeningContent }
    : voiceMode && phraseIndex === phrases.length + 1
      ? { key: phase?.key ?? String(index), label: recordingLabel, content: recordingContent }
      : { key: phase?.key ?? String(index), label: phraseAt(phraseIndex - (voiceMode ? 1 : 0)), content: phraseAt(phraseIndex - (voiceMode ? 1 : 0)) };

  return (
    <span className="lena-shimmer inline-flex max-w-full items-baseline gap-1 text-slate-700 dark:text-slate-50" role="status" aria-label={`LenaAI ${current.label}`}>
      <span aria-hidden="true" className="shrink-0">LenaAI</span>
      <span aria-hidden="true" className="relative inline-grid overflow-hidden align-bottom">
        {/* Reserve the longest phrase's or skill's width so the fixed name never shifts. */}
        {phrases.map(text => <span key={text} className="invisible col-start-1 row-start-1 whitespace-nowrap">{text}</span>)}
        {voiceMode && <span className="invisible col-start-1 row-start-1">{recordingContent}</span>}
        {voiceMode && <span className="invisible col-start-1 row-start-1">{listeningContent}</span>}
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
