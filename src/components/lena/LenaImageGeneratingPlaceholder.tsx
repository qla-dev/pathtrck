import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ImagePlus } from 'lucide-react';
import { api } from '../../services/api';
import { Language } from '../../types';

/**
 * An image LenaAI drew, shown as the picture itself rather than a file chip. Clicking opens it full
 * size in a new tab. Until the bytes arrive it keeps the placeholder's shape, so the bubble does not
 * jump when the image lands.
 */
export const LenaGeneratedImage = ({ path, name }: { path: string; name: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;
    api.messageAttachments.blob(path, name)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, name]);

  return (
    <button
      type="button"
      onClick={() => void api.messageAttachments.open(path, name, true).catch(() => undefined)}
      className="group relative mr-auto mt-2 block w-72 max-w-full cursor-zoom-in overflow-hidden rounded-2xl border border-violet-200 bg-violet-50 shadow-lg shadow-violet-500/10 dark:border-violet-500/30 dark:bg-violet-950/40"
      aria-label={name}
    >
      {url ? (
        <motion.img initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} src={url} alt={name} className="block h-auto w-full transition-transform duration-300 group-hover:scale-[1.02]" />
      ) : (
        <span className={`flex aspect-square w-full items-center justify-center text-violet-500 ${failed ? '' : 'animate-pulse'}`}>
          <ImagePlus className="h-7 w-7" />
        </span>
      )}
    </button>
  );
};

export const lenaImageGeneratingLabel = (lang: Language | string | undefined) => ({
  bs: 'LenaAI crta vašu sliku',
  hr: 'LenaAI crta vašu sliku',
  sr: 'LenaAI црта вашу слику',
  de: 'LenaAI zeichnet Ihr Bild',
  en: 'LenaAI is drawing your image',
}[String(lang)] ?? 'LenaAI is drawing your image');

const GRID = Array.from({ length: 36 }, (_, index) => index);

/**
 * Stands in for the picture while an approved training image is being generated: colour drifting
 * across a canvas, a sweep of light and a grid of tiles filling in, so the wait reads as the image
 * taking shape rather than a spinner. Motion stops for people who ask for reduced motion.
 */
export const LenaImageGeneratingPlaceholder = ({ label }: { label: string }) => {
  const reduceMotion = useReducedMotion();
  const loop = (duration: number, delay = 0) => reduceMotion ? undefined : { duration, delay, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      aria-label={label}
      className="mr-auto mt-6 w-72 max-w-full"
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-sky-100 via-violet-100 to-fuchsia-100 shadow-lg shadow-violet-500/10 dark:border-violet-500/30 dark:from-sky-950 dark:via-violet-950 dark:to-fuchsia-950">
        <motion.div
          className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-sky-400/50 blur-2xl"
          animate={reduceMotion ? undefined : { x: [0, 130, 50, 0], y: [0, 70, 150, 0] }}
          transition={loop(6)}
        />
        <motion.div
          className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-fuchsia-400/50 blur-2xl"
          animate={reduceMotion ? undefined : { x: [0, -120, -40, 0], y: [0, -90, -160, 0] }}
          transition={loop(7)}
        />
        <motion.div
          className="absolute left-1/3 top-1/3 h-32 w-32 rounded-full bg-violet-500/40 blur-2xl"
          animate={reduceMotion ? undefined : { scale: [1, 1.5, 0.9, 1], rotate: [0, 120, 240, 360] }}
          transition={loop(5)}
        />
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 gap-1 p-3">
          {GRID.map((index) => (
            <motion.span
              key={index}
              className="rounded-md bg-white/40 dark:bg-white/10"
              initial={{ opacity: 0.2 }}
              animate={reduceMotion ? undefined : { opacity: [0.1, 0.75, 0.1] }}
              transition={loop(2.4, ((index % 6) + Math.floor(index / 6)) * 0.12)}
            />
          ))}
        </div>
        <motion.div
          className="absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/20"
          initial={{ x: '-160%' }}
          animate={reduceMotion ? undefined : { x: ['-160%', '260%'] }}
          transition={reduceMotion ? undefined : { duration: 1.8, repeat: Infinity, repeatDelay: 0.5, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="rounded-2xl bg-white/80 p-3 text-violet-600 shadow-xl dark:bg-slate-900/80 dark:text-violet-300"
            animate={reduceMotion ? undefined : { rotate: [0, -8, 8, 0], scale: [1, 1.12, 1] }}
            transition={loop(2.2)}
          >
            <ImagePlus className="h-7 w-7" />
          </motion.span>
        </div>
      </div>
      <p className="lena-shimmer mt-2 text-sm font-bold text-slate-700 dark:text-slate-100">{label}</p>
    </motion.div>
  );
};
