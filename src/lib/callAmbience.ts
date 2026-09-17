/**
 * The room behind Lena: a dispatch office, quietly, for as long as a call is up.
 *
 * A voice on a perfectly silent line does not sound like a person on a phone, it sounds like a
 * recording. A little room tone is what makes the other end feel like somewhere rather than
 * nowhere - so this is deliberately far below her voice. It is scene, not content.
 *
 * OpenAI's realtime API has no ambience of its own; developers asking for exactly this are told to
 * mix it themselves, so it is mixed here, on the client, entirely outside the call. It never
 * touches the peer connection, so it cannot reach her ears, confuse the transcription, or cost a
 * single token - it only ever reaches the speaker.
 */

const AMBIENCE_SRC = '/sounds/office-ambience.mp3';

/** Under a voice, not beside it. Loud enough to notice only when it stops. */
const AMBIENCE_VOLUME = 0.05;

/** Fades, because an office that snaps on and off is worse than no office at all. */
const FADE_IN_S = 1.5;
const FADE_OUT_S = 0.6;

export type CallAmbience = {
  /** Fetches and decodes the loop. Safe to call while the call is still connecting. */
  buffer: () => Promise<void>;
  /** Starts the loop, waiting for the buffer if it is not ready yet. */
  play: () => Promise<void>;
  /** Fades out and releases everything. Safe to call at any point, including before play. */
  stop: () => void;
};

export const createCallAmbience = (): CallAmbience => {
  let context: AudioContext | undefined;
  let decoded: AudioBuffer | undefined;
  let loading: Promise<void> | undefined;
  let source: AudioBufferSourceNode | undefined;
  let gain: GainNode | undefined;
  let stopped = false;

  const ensureContext = (): AudioContext | undefined => {
    if (context) return context;
    try {
      context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      // No Web Audio: the call is simply quiet, which is the old behaviour and perfectly usable.
      return undefined;
    }
    return context;
  };

  const buffer = (): Promise<void> => {
    if (loading) return loading;
    loading = (async () => {
      const audio = ensureContext();
      if (!audio) return;
      try {
        const response = await fetch(AMBIENCE_SRC);
        if (!response.ok) return;
        decoded = await audio.decodeAudioData(await response.arrayBuffer());
      } catch {
        // A missing or undecodable loop must never be the reason a call does not happen.
      }
    })();
    return loading;
  };

  const play = async (): Promise<void> => {
    await buffer();
    const audio = context;
    // stopped can flip while the fetch is in flight - a caller who hangs up during connect must
    // not be given an office that starts after the call has already ended.
    if (!audio || !decoded || stopped || source) return;

    try {
      gain = audio.createGain();
      gain.gain.setValueAtTime(0, audio.currentTime);
      gain.gain.linearRampToValueAtTime(AMBIENCE_VOLUME, audio.currentTime + FADE_IN_S);
      gain.connect(audio.destination);

      source = audio.createBufferSource();
      source.buffer = decoded;
      // The loop is room tone, so its seam is inaudible at this level; no crossfade needed.
      source.loop = true;
      source.connect(gain);
      source.start();
    } catch {
      source = undefined;
    }
  };

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    const audio = context;
    if (!audio || !gain || !source) {
      void context?.close().catch(() => undefined);
      context = undefined;
      return;
    }

    try {
      const endsAt = audio.currentTime + FADE_OUT_S;
      gain.gain.cancelScheduledValues(audio.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, audio.currentTime);
      gain.gain.linearRampToValueAtTime(0, endsAt);
      source.stop(endsAt + 0.05);
    } catch {
      // Already torn down; nothing left to fade.
    }

    // Closed after the fade has actually been heard, not the moment it is scheduled.
    window.setTimeout(() => { void context?.close().catch(() => undefined); context = undefined; }, (FADE_OUT_S + 0.2) * 1000);
  };

  return { buffer, play, stop };
};
