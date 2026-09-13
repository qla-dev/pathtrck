import assert from 'node:assert/strict';
import test from 'node:test';
import { playServerSpeech, speechChunks } from '../src/lib/serverSpeechPlayback';

test('long replies preserve all text, split within API limit, and omit markers', () => {
  const text = 'A sentence. '.repeat(600).trim();
  const chunks = speechChunks(`${text} [[LENA_OPTIONS:add]]`);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => chunk.length <= 1800));
  assert.equal(chunks.join(' ').replace(/\s+/g, ' '), text);
});

test('canceling a server request prevents late playback', async () => {
  let resolve!: (blob: Blob) => void;
  let signal!: AbortSignal;
  const audio = { pause() {}, removeAttribute() {}, load() {}, play() { assert.fail('Canceled playback'); } } as unknown as HTMLAudioElement;
  const cancel = playServerSpeech('Hello', 'en', (_, __, requestSignal) => {
    signal = requestSignal;
    return new Promise(r => { resolve = r; });
  }, () => assert.fail('Canceled error'), audio);
  cancel();
  assert.equal(signal.aborted, true);
  resolve(new Blob(['audio'], { type: 'audio/wav' }));
  await new Promise(r => setTimeout(r, 0));
});

test('provider failure is reported without a browser voice fallback', async () => {
  let errors = 0;
  const audio = { pause() {}, removeAttribute() {}, load() {} } as unknown as HTMLAudioElement;
  playServerSpeech('Hello', 'en', async () => { throw Error('502'); }, () => errors++, audio);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(errors, 1);
});

test('thinking remains active through generation and buffering until playback starts', async () => {
  const waiting: boolean[] = [];
  let deliver!: (blob: Blob) => void;
  let start!: () => void;
  const audio = {
    pause() {}, removeAttribute() {}, load() {},
    play: () => new Promise<void>(resolve => { start = resolve; }),
  } as unknown as HTMLAudioElement;
  const cancel = playServerSpeech('Hello', 'en', () => new Promise(resolve => { deliver = resolve; }),
    () => assert.fail('Unexpected error'), audio, value => waiting.push(value));
  assert.deepEqual(waiting, [true]);
  deliver(new Blob(['audio'], { type: 'audio/wav' }));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(waiting, [true]);
  start();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(waiting, [true, false]);
  cancel();
});

test('thinking clears on provider failure or canceled generation', async () => {
  const waiting: boolean[] = [];
  const audio = { pause() {}, removeAttribute() {}, load() {} } as unknown as HTMLAudioElement;
  playServerSpeech('Hello', 'en', async () => { throw Error('502'); }, () => {}, audio, value => waiting.push(value));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(waiting, [true, false]);
  const cancel = playServerSpeech('Hello', 'en', () => new Promise(() => {}), () => {}, audio, value => waiting.push(value));
  cancel();
  assert.deepEqual(waiting, [true, false, true, false]);
});
