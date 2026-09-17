/**
 * The ringing a caller hears between pressing call and Lena picking up.
 *
 * Synthesised rather than played from a file: it is two sine waves and a gate, so it costs no
 * asset, no request and no cache entry, and it cannot be the thing that is still downloading when
 * the call is already up.
 *
 * The tone is the European ringback - a single 425 Hz tone, one second on, one second off - rather
 * than the American dual-tone pair, because the drivers on the other end of these calls dial
 * Bosnian, Croatian, Serbian, German and Austrian numbers all day and this is the sound they know.
 */

/** 425 Hz, the ITU-T ringing tone used across Europe. */
const RINGBACK_HZ = 425;

/**
 * Starts ringing. Returns a stop function that fades out rather than cutting, because an abrupt
 * gain change on a live audio context is an audible click on most hardware.
 */
export const startCallRingback = (): (() => void) => {
  let context: AudioContext | undefined;
  let stopped = false;

  try {
    context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    // No Web Audio: the call still connects, it just does so silently.
    return () => undefined;
  }

  const gain = context.createGain();
  gain.gain.value = 0;
  gain.connect(context.destination);

  const oscillator = context.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.value = RINGBACK_HZ;
  oscillator.connect(gain);
  oscillator.start();

  // The ring pattern is written onto the gain ahead of time, so it keeps its rhythm even while the
  // main thread is busy with the connection handshake this is covering for.
  const now = context.currentTime;
  for (let ring = 0; ring < 6; ring += 1) {
    const at = now + ring * 2;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.08, at + 0.05);
    gain.gain.setValueAtTime(0.08, at + 0.95);
    gain.gain.linearRampToValueAtTime(0, at + 1);
  }

  return () => {
    if (stopped || !context) return;
    stopped = true;
    try {
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.08);
      oscillator.stop(context.currentTime + 0.1);
    } catch {
      // Already stopped by a context that closed under us; nothing left to silence.
    }
    // Closed a beat after the fade, so the ramp is actually heard.
    window.setTimeout(() => { void context?.close().catch(() => undefined); }, 200);
  };
};
