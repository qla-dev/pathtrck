/**
 * Microphone capture for Lena's voice mode, with the turn-taking the chat panel needs: it listens,
 * notices when the speaker has actually started talking, and ends the turn after a stretch of
 * silence - the same shape the browser's SpeechRecognition gave us, but producing audio instead of
 * a transcript, so the recording can be sent to Whisper on the server.
 *
 * Why not keep the browser engine as the primary: it exists only in Chromium and Safari, its
 * accuracy on accented Bosnian, Croatian, Serbian and German is poor, and it has no idea what a
 * CMR or an HS code is. Whisper on Groq handles all of that. The browser engine stays as the
 * fallback in ChatConversationPanel for when the server route fails.
 */

/** In order of preference. The first the browser can actually record is used. */
const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

export type VoiceRecordingHandlers = {
  /** The speaker has begun talking - the panel uses this to drop any "say something" hint. */
  onSpeechStart?: () => void;
  /** Fires once, with the finished recording, when silence ends the turn. */
  onResult: (audio: Blob) => void;
  /** Nothing was said before the patience ran out, or the turn was cut short with no audio. */
  onEmpty?: () => void;
  onError: (error: unknown) => void;
  /** 0..1, for a level meter. Called on animation frames while listening. */
  onLevel?: (level: number) => void;
};

export type VoiceRecordingOptions = {
  /** Silence after speech that ends the turn. Matches the browser engine's old 3s. */
  silenceMs?: number;
  /** Give up if the speaker never starts. */
  noSpeechTimeoutMs?: number;
  /** Hard cap, so a stuck open mic cannot upload an unbounded recording. */
  maxDurationMs?: number;
  /**
   * RMS below this counts as silence. Cab noise sits well under it with the browser's own noise
   * suppression on; speech sits well above.
   */
  silenceThreshold?: number;
};

export const voiceRecordingSupported = (): boolean =>
  typeof window !== 'undefined'
  && typeof window.MediaRecorder !== 'undefined'
  && Boolean(navigator.mediaDevices?.getUserMedia);

const pickMimeType = (): string | undefined =>
  PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));

/**
 * Starts listening. Returns a cancel function: calling it stops the microphone and guarantees that
 * none of the handlers fire afterwards, so a component can call it freely during cleanup.
 */
export const startVoiceRecording = (
  handlers: VoiceRecordingHandlers,
  options: VoiceRecordingOptions = {},
): (() => void) => {
  const {
    silenceMs = 3000,
    noSpeechTimeoutMs = 12000,
    maxDurationMs = 60000,
    silenceThreshold = 0.015,
  } = options;

  let cancelled = false;
  let finished = false;
  let stream: MediaStream | undefined;
  let recorder: MediaRecorder | undefined;
  let audioContext: AudioContext | undefined;
  let frame: number | undefined;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  let noSpeechTimer: ReturnType<typeof setTimeout> | undefined;
  let maxTimer: ReturnType<typeof setTimeout> | undefined;

  const release = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    clearTimeout(silenceTimer);
    clearTimeout(noSpeechTimer);
    clearTimeout(maxTimer);
    frame = undefined;
    // Closing the context is best-effort: Safari throws if it is already closed.
    void audioContext?.close().catch(() => {});
    audioContext = undefined;
    stream?.getTracks().forEach((track) => track.stop());
    stream = undefined;
  };

  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    // Detach before stopping, so the recorder's own stop event cannot deliver a late result.
    if (recorder) recorder.onstop = null;
    if (recorder?.state === 'recording') {
      try { recorder.stop(); } catch { /* already stopping */ }
    }
    recorder = undefined;
    release();
  };

  void (async () => {
    try {
      if (!voiceRecordingSupported()) throw new Error('This browser cannot record audio.');

      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      // The user may have cancelled during the permission prompt, which can sit open for a while.
      if (cancelled) { release(); return; }

      // Declared before the recorder because onstop closes over it: a turn of pure silence still
      // produces container bytes, so this flag - not the blob size - is what proves speech.
      let heardSpeech = false;

      const mimeType = pickMimeType();
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        if (cancelled || finished) return;
        finished = true;
        const audio = new Blob(chunks, { type: recorder?.mimeType || mimeType || 'audio/webm' });
        release();
        if (!heardSpeech || audio.size < 1024) handlers.onEmpty?.();
        else handlers.onResult(audio);
      };

      // Volume metering runs on a parallel branch of the same stream; it never touches the
      // recorder, so nothing here can corrupt the recording itself.
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);

      const endTurn = () => {
        if (cancelled || finished) return;
        if (recorder?.state === 'recording') recorder.stop();
        else { finished = true; release(); handlers.onEmpty?.(); }
      };

      const tick = () => {
        if (cancelled || finished) return;
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
        const rms = Math.sqrt(sum / samples.length);
        handlers.onLevel?.(Math.min(1, rms * 8));

        if (rms >= silenceThreshold) {
          if (!heardSpeech) {
            heardSpeech = true;
            clearTimeout(noSpeechTimer);
            handlers.onSpeechStart?.();
          }
          // Any speech resets the countdown; the turn ends only after an unbroken quiet stretch.
          clearTimeout(silenceTimer);
          silenceTimer = undefined;
        } else if (heardSpeech && silenceTimer === undefined) {
          silenceTimer = setTimeout(endTurn, silenceMs);
        }
        frame = requestAnimationFrame(tick);
      };

      recorder.start(250);
      noSpeechTimer = setTimeout(() => { if (!heardSpeech) endTurn(); }, noSpeechTimeoutMs);
      maxTimer = setTimeout(endTurn, maxDurationMs);
      frame = requestAnimationFrame(tick);
    } catch (error) {
      if (cancelled) return;
      finished = true;
      release();
      handlers.onError(error);
    }
  })();

  return cancel;
};

/** A message fit to show a user, for the handful of getUserMedia failures worth distinguishing. */
export const voiceRecordingErrorText = (error: unknown, fallback: string): string => {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Microphone access was blocked. Allow the microphone for this site, then try again.';
    if (error.name === 'NotFoundError') return 'No microphone was found.';
    if (error.name === 'NotReadableError') return 'The microphone is being used by another application.';
  }
  return error instanceof Error && error.message ? error.message : fallback;
};
