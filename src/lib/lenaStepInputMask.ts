import { Language } from '../types';

// Live-formats the chat draft field while a specific LenaAI questionnaire step is pending, and
// supplies the inline unit hint ChatConversationPanel renders on the right edge of the input.
// Kept as its own file since it is shared by every surface that embeds the LenaAI chat
// (LenaAI.tsx, MessagesView.tsx), both keyed off the same [[LENA_STEP:key]] marker already used
// for the questionnaire pills (see useLenaEmbeddedMessages.tsx).

const digitsOnly = (value: string): string => value.replace(/[^0-9]/g, '');

const decimalValue = (value: string): string => {
  let cleaned = value.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  return cleaned;
};

// "200" + a 4th character -> auto-inserts "x" after every plain 3-digit segment (length, then
// width), so typing "2001501 8" naturally becomes "200x150x18" - a manually typed "x" at any
// point already closes that segment itself, so it is never double-inserted. Each segment is also
// capped at 3 characters (whichever of digits/decimal point it holds), so there's no way to keep
// typing past the third digit into an ever-growing string like "520x000x0000000000000".
export const formatDimensionsInput = (value: string): string => {
  const cleaned = value.replace(/[^0-9x.]/gi, '').toLowerCase();
  const segments = cleaned.split('x').slice(0, 3).map((segment) => segment.slice(0, 3));
  const formatted = segments.map((segment, index) => {
    const isLastSegment = index === segments.length - 1;
    const canAutoClose = index < 2 && isLastSegment && /^\d{3}$/.test(segment);
    return canAutoClose ? `${segment}x` : segment;
  });
  return formatted.join('x');
};

// These free-text steps are regex-constrained by the masks below, so a typed answer is already an
// unambiguous value by the time it's submitted - sendMessage()'s callers route them through the
// deterministic guided-answer endpoint (see LenaGuidedAnswerController) instead of the AI path.
export const MASKABLE_GUIDED_STEPS = ['weight', 'pallets', 'dimensions', 'budget', 'declaredValue'];

type StepInputMaskConfig = { unit: (lang: Language) => string; format: (value: string) => string };

const STEP_INPUT_MASKS: Record<string, StepInputMaskConfig> = {
  weight: { unit: () => 'kg', format: digitsOnly },
  pallets: { unit: (lang) => (lang === 'bs' ? 'kom' : lang === 'de' ? 'Stk' : 'pcs'), format: digitsOnly },
  dimensions: { unit: () => 'm', format: formatDimensionsInput },
  budget: { unit: () => '', format: decimalValue },
  declaredValue: { unit: () => '', format: decimalValue },
};

export const lenaStepInputMask = (step: string | null | undefined, lang: Language): { unit?: string; format: (value: string) => string } | null => {
  if (!step) return null;
  const config = STEP_INPUT_MASKS[step];
  if (!config) return null;
  const unit = config.unit(lang);
  return { unit: unit || undefined, format: config.format };
};
