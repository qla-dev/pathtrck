// Keeps a UI action visually "in progress" for at least `ms`, even when the underlying work
// finishes faster - used so LenaAI's "thinking" indicator never flashes instantly, regardless of
// whether a reply came from a real (slower) OpenRouter call or the near-instant deterministic
// guided-answer path (see LenaGuidedAnswerController).
export const withMinDelay = async <T>(promise: Promise<T>, ms = 2000): Promise<T> => {
  const [result] = await Promise.all([promise, new Promise<void>((resolve) => { window.setTimeout(resolve, ms); })]);
  return result;
};
