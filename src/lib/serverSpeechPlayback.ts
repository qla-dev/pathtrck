export function speechFailureDetails(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown audio error.';
  const status = 'status' in error && typeof error.status === 'number' ? `HTTP ${error.status}: ` : '';
  return `${status}${error.name === 'NotAllowedError' ? 'The browser blocked audio playback. Allow sound for this site, then press play.' : error.message}`;
}

export function speechChunks(text: string, limit = 1800): string[] {
  let remaining = text.replace(/\[\[[\s\S]*?\]\]/g, ' ').trim();
  const chunks: string[] = [];
  while (remaining.length > limit) {
    const section = remaining.slice(0, limit);
    const sentence = Math.max(section.lastIndexOf('. '), section.lastIndexOf('? '), section.lastIndexOf('! '));
    let cut = sentence > limit / 2 ? sentence + 1 : section.lastIndexOf(' ');
    if (cut < 1) cut = limit;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export function playServerSpeech(
  text: string,
  language: string,
  fetchAudio: (text: string, language: string, signal: AbortSignal) => Promise<Blob>,
  onError: (error: unknown) => void,
  audio: HTMLAudioElement = new Audio(),
  onWaiting: (waiting: boolean) => void = () => {},
): () => void {
  const controller = new AbortController();
  let url: string | undefined;
  let finish: (() => void) | undefined;
  const release = () => {
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    if (url) URL.revokeObjectURL(url);
    url = undefined;
  };
  void (async () => {
    try {
      for (const chunk of speechChunks(text)) {
        onWaiting(true);
        const blob = await fetchAudio(chunk, language, controller.signal);
        if (controller.signal.aborted) return;
        if (!blob.type.startsWith('audio/') || !blob.size) throw new Error('Invalid speech audio');
        url = URL.createObjectURL(blob);
        audio.src = url;
        await new Promise<void>((resolve, reject) => {
          finish = resolve;
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error(`Audio decoding failed (media error ${audio.error?.code ?? 'unknown'}).`));
          audio.play().then(() => {
            if (!controller.signal.aborted) onWaiting(false);
          }).catch(reject);
        });
        release();
        if (controller.signal.aborted) return;
      }
    } catch (error) {
      if (!controller.signal.aborted) onError(error);
    } finally { release(); if (!controller.signal.aborted) onWaiting(false); }
  })();
  return () => { controller.abort(); finish?.(); release(); onWaiting(false); };
}
