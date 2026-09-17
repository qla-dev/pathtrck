/**
 * The ringing a caller hears between pressing call and Lena picking up.
 *
 * A real recording rather than a synthesised tone, because a generated sine reads as an error
 * beep on phone speakers while an actual ringtone reads as a call being placed - which is the one
 * thing this sound has to say. It is served from public/ and already trimmed to the ring itself,
 * so nothing here has to seek, fade in, or decide where the ring starts.
 */

/** Trimmed to a single ring, which is what the call waits for before Lena answers. */
const RINGBACK_SRC = '/sounds/ring.mp3';

/** Quiet enough to sit under a voice, loud enough to hear in a cab. */
const RINGBACK_VOLUME = 0.5;

/** Long enough not to click, short enough that hanging up still feels instant. */
const FADE_MS = 120;

/**
 * Starts ringing. Returns a stop function that fades out rather than cutting, because pausing an
 * element mid-waveform is an audible click on most hardware.
 *
 * Playback can be refused outright - a browser that has not seen a user gesture yet will reject
 * it - and that must never be the reason a call fails to connect, so every failure here is
 * swallowed and the call simply rings silently.
 */
export const startCallRingback = (): (() => void) => {
  let stopped = false;
  let audio: HTMLAudioElement | undefined;

  try {
    audio = new Audio(RINGBACK_SRC);
    audio.volume = RINGBACK_VOLUME;
    // One ring is the whole file; looping would keep ringing after she has already answered.
    audio.loop = false;
    void audio.play().catch(() => undefined);
  } catch {
    return () => undefined;
  }

  return () => {
    if (stopped || !audio) return;
    stopped = true;

    const element = audio;
    const step = element.volume / Math.max(1, Math.round(FADE_MS / 20));
    const fade = window.setInterval(() => {
      const next = element.volume - step;
      if (next > 0) {
        element.volume = next;
        return;
      }
      window.clearInterval(fade);
      try {
        element.pause();
        element.currentTime = 0;
      } catch {
        // Already torn down by a navigation; there is nothing left to silence.
      }
    }, 20);
  };
};
