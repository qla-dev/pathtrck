import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export const LenaThinkingIndicator = ({ phrases }: { phrases: string[] }) => {
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (phrases.length < 2) return;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % phrases.length), 7000);
    return () => window.clearInterval(timer);
  }, [phrases.length]);
  const phrase = phrases[index % phrases.length] || '';

  return (
    <span className="inline-flex max-w-full items-baseline gap-1 text-slate-500 dark:text-slate-400" role="status" aria-label={`LenaAI ${phrase}`}>
      <span aria-hidden="true" className="shrink-0">LenaAI</span>
      <span aria-hidden="true" className="relative inline-grid overflow-hidden align-bottom">
        {/* Reserve the longest phrase's width so the fixed name never shifts. */}
        {phrases.map(text => <span key={text} className="invisible col-start-1 row-start-1 whitespace-nowrap">{text}</span>)}
        <AnimatePresence initial={false}>
          <motion.span
            key={index}
            className="absolute inset-0 whitespace-nowrap"
            initial={{ y: reducedMotion ? 0 : '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reducedMotion ? 0 : '-100%', opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.4, ease: 'easeInOut' }}
          >
            {phrase}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
};
