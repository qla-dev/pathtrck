import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

/**
 * A live voice call with Lena, over WebRTC, straight to OpenAI's realtime model.
 *
 * The division of labour matters here. The realtime model is only the voice: it listens, speaks,
 * and handles the turn-taking that lets a caller interrupt mid-sentence. It knows nothing about
 * freight. Every question that needs real knowledge or real work is delegated back to the Lena
 * that already exists, through the single `ask_lena` tool the server defines - which this hook
 * executes by calling the very same endpoints the text chat uses.
 *
 * That is why a call covers all of Lena's skills rather than a chosen few: posting a load, the
 * questionnaire, tracking, booking, HS codes and the legal jurisdictions are not reimplemented for
 * voice and cannot drift from the text chat, because they *are* the text chat. The price is that a
 * delegated turn still costs a full dispatch-chat round trip; the model is instructed to say it is
 * checking before it calls the tool, so the caller is not left in silence.
 *
 * Our OpenAI key never reaches the browser. The server mints a short-lived client secret, and this
 * hook spends it immediately on the SDP exchange.
 */

export type LenaCallStatus = 'idle' | 'connecting' | 'live' | 'ending';

export type LenaCallTurn = {
  id: string;
  /** 'caller' is the person holding the phone; 'lena' is the voice answering. */
  speaker: 'caller' | 'lena';
  text: string;
};

type UseLenaRealtimeCallOptions = {
  /** Interface language: decides which language Lena speaks and how she is transcribed. */
  lang: string;
  /** Scopes the call to an existing thread when there is one. */
  conversationId?: number;
  /**
   * Runs one delegated question through the real Lena and resolves with her reply. Supplied by
   * whoever owns the chat, so a call and the visible thread stay the same conversation.
   */
  askLena: (question: string, action?: string) => Promise<string>;
  onError: (error: unknown) => void;
};

/** Events we act on. Everything else the model sends is ignored rather than guessed at. */
type RealtimeEvent = {
  type: string;
  transcript?: string;
  name?: string;
  call_id?: string;
  arguments?: string;
  error?: { message?: string };
};

const randomId = () => Math.random().toString(36).slice(2);

export const useLenaRealtimeCall = ({ lang, conversationId, askLena, onError }: UseLenaRealtimeCallOptions) => {
  const [status, setStatus] = useState<LenaCallStatus>('idle');
  const [turns, setTurns] = useState<LenaCallTurn[]>([]);
  /** True from the moment a tool call starts until its answer is handed back. */
  const [consultingLena, setConsultingLena] = useState(false);
  /** True while Lena is speaking, for the on-screen indicator. */
  const [lenaSpeaking, setLenaSpeaking] = useState(false);
  /** Mic muted by the caller. The track stays in the connection; only its audio stops flowing. */
  const [muted, setMuted] = useState(false);
  /** 0..1 microphone level, for the equaliser around the mic button. */
  const [inputLevel, setInputLevel] = useState(0);
  const levelContextRef = useRef<AudioContext | null>(null);
  const levelFrameRef = useRef<number | undefined>(undefined);

  const connectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Guards against a hang-up landing while an await is still in flight during connect.
  const endedRef = useRef(false);

  const stop = useCallback(() => {
    endedRef.current = true;
    channelRef.current?.close();
    channelRef.current = null;
    connectionRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    connectionRef.current?.close();
    connectionRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    if (levelFrameRef.current !== undefined) cancelAnimationFrame(levelFrameRef.current);
    levelFrameRef.current = undefined;
    // Safari throws when a context is closed twice; a failed close must not break hanging up.
    void levelContextRef.current?.close().catch(() => undefined);
    levelContextRef.current = null;
    setInputLevel(0);
    setMuted(false);
    setConsultingLena(false);
    setLenaSpeaking(false);
    setStatus('idle');
  }, []);

  // A call must not outlive the component - an open microphone and a paid session both keep
  // running otherwise.
  useEffect(() => stop, [stop]);

  const send = (channel: RTCDataChannel, payload: unknown) => {
    if (channel.readyState === 'open') channel.send(JSON.stringify(payload));
  };

  const handleToolCall = useCallback(async (channel: RTCDataChannel, event: RealtimeEvent) => {
    if (event.name !== 'ask_lena' || !event.call_id) return;

    let output: string;
    setConsultingLena(true);
    try {
      const parsed = JSON.parse(event.arguments || '{}') as { question?: string; action?: string };
      const question = String(parsed.question || '').trim();
      const action = String(parsed.action || '').trim() || undefined;
      // The model is told to always fill this in; an empty one means it called the tool by mistake,
      // and saying so is better than sending Lena an empty message that starts a pointless turn.
      // An action is a button press and carries no question of its own, so either one is enough.
      output = question || action
        ? await askLena(question, action)
        : 'No question was provided. Ask the caller what they need.';
    } catch (error) {
      onError(error);
      // The result must still go back, or the model waits for a tool answer that never arrives and
      // the call goes silent. Telling it what happened lets it apologise and offer to retry.
      output = 'Lena could not be reached just now. Tell the caller, and offer to try again.';
    } finally {
      setConsultingLena(false);
    }

    send(channel, {
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: event.call_id, output },
    });
    // The model does not speak the tool result on its own; this asks it to.
    send(channel, { type: 'response.create' });
  }, [askLena, onError]);

  const handleEvent = useCallback((channel: RTCDataChannel, raw: string) => {
    let event: RealtimeEvent;
    try { event = JSON.parse(raw) as RealtimeEvent; } catch { return; }

    switch (event.type) {
      // What the caller said, once the model has finished transcribing their turn.
      case 'conversation.item.input_audio_transcription.completed': {
        const text = (event.transcript || '').trim();
        if (text) setTurns((current) => [...current, { id: randomId(), speaker: 'caller', text }]);
        break;
      }
      // What Lena said, transcribed from the audio she just produced.
      case 'response.output_audio_transcript.done': {
        const text = (event.transcript || '').trim();
        if (text) setTurns((current) => [...current, { id: randomId(), speaker: 'lena', text }]);
        break;
      }
      case 'output_audio_buffer.started':
        setLenaSpeaking(true);
        break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        setLenaSpeaking(false);
        break;
      case 'response.function_call_arguments.done':
        void handleToolCall(channel, event);
        break;
      case 'error':
        onError(new Error(event.error?.message || 'The call reported an error.'));
        break;
      default:
        break;
    }
  }, [handleToolCall, onError]);

  const start = useCallback(async () => {
    if (status !== 'idle') return;
    endedRef.current = false;
    setTurns([]);
    setStatus('connecting');

    try {
      const session = await api.lenaRealtime.session(lang, conversationId);
      if (endedRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      // Hanging up during the permission prompt must not leave the microphone open.
      if (endedRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;

      // Metering runs on its own branch of the same stream, so nothing here can disturb what is
      // actually sent to OpenAI. Muting stops the level too, because the track stops producing.
      try {
        const levelContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        levelContextRef.current = levelContext;
        const analyser = levelContext.createAnalyser();
        analyser.fftSize = 1024;
        levelContext.createMediaStreamSource(stream).connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        const tick = () => {
          if (endedRef.current) return;
          analyser.getFloatTimeDomainData(samples);
          let sum = 0;
          for (let index = 0; index < samples.length; index += 1) sum += samples[index] * samples[index];
          setInputLevel(Math.min(1, Math.sqrt(sum / samples.length) * 8));
          levelFrameRef.current = requestAnimationFrame(tick);
        };
        levelFrameRef.current = requestAnimationFrame(tick);
      } catch {
        // A browser without Web Audio still gets a working call, just a static mic button.
      }

      const connection = new RTCPeerConnection();
      connectionRef.current = connection;

      // Lena's voice arrives as a media track, not over the data channel.
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;
      connection.ontrack = (event) => { audio.srcObject = event.streams[0]; };

      stream.getAudioTracks().forEach((track) => connection.addTrack(track, stream));

      const channel = connection.createDataChannel('oai-events');
      channelRef.current = channel;
      channel.onmessage = (event) => handleEvent(channel, String(event.data));

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);

      const answer = await fetch(session.calls_url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.client_secret}`, 'Content-Type': 'application/sdp' },
        body: offer.sdp || '',
      });
      if (!answer.ok) throw new Error(`The call could not be connected (${answer.status}).`);
      if (endedRef.current) return;

      await connection.setRemoteDescription({ type: 'answer', sdp: await answer.text() });
      if (endedRef.current) return;
      setStatus('live');
    } catch (error) {
      stop();
      onError(error);
    }
  }, [conversationId, handleEvent, lang, onError, status, stop]);


  /** Flipping `enabled` keeps the sender in place, so unmuting resumes without renegotiating. */
  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
      return next;
    });
  }, []);
  return { status, turns, consultingLena, lenaSpeaking, muted, inputLevel, toggleMute, start, stop };
};
