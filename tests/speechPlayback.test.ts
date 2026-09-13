import assert from 'node:assert/strict';
import test from 'node:test';
import { playSpeech, preferredVoice, speechTextForVoice } from '../src/lib/speechPlayback';

const voice = (name: string, lang: string) => ({ name, lang } as SpeechSynthesisVoice);
const zira = voice('Microsoft Zira - English (United States)', 'en-US');
const vesna = voice('Microsoft Vesna Online (Natural)', 'bs-BA');

test('Balkan languages share a female voice and English-only devices no longer fall silent', () => {
  for (const locale of ['bs-BA', 'hr-HR', 'sr-RS']) {
    assert.equal(preferredVoice([zira, vesna], locale), vesna);
    assert.equal(preferredVoice([zira], locale), zira);
  }
  assert.equal(preferredVoice([zira, vesna], 'en-US'), zira);
  const lada = voice('Microsoft Lada', 'hr_HR');
  assert.equal(preferredVoice([zira, lada], 'bs-BA'), lada);
});

test('female requirement excludes male/unknown names and quality does not override language', () => {
  assert.equal(preferredVoice([voice('Microsoft David', 'en-US'), voice('Unknown', 'bs-BA')], 'bs'), undefined);
  const hedda = voice('Microsoft Hedda', 'de-DE');
  assert.equal(preferredVoice([voice('Microsoft Aria Online (Natural)', 'en-US'), hedda], 'de-DE'), hedda);
});

test('shared voices receive Latin Serbian while native Serbian keeps Cyrillic', () => {
  assert.equal(speechTextForVoice('Љубљана, Ђорђе, терет.', 'sr-RS', 'hr-HR'), 'Ljubljana, Đorđe, teret.');
  assert.equal(speechTextForVoice('Терет', 'sr-RS', 'sr-RS'), 'Терет');
});

test('playback waits through empty voice events, then speaks once', () => {
  let available: SpeechSynthesisVoice[] = [];
  const events = new EventTarget();
  const spoken: SpeechSynthesisUtterance[] = [];
  const synth = {
    getVoices: () => available,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    cancel() {}, resume() {},
    speak: (utterance: SpeechSynthesisUtterance) => spoken.push(utterance),
  } as unknown as SpeechSynthesis;
  const stop = playSpeech(synth, 'Test', 'bs-BA', () => assert.fail('Unexpected error'), (text) => ({ text } as SpeechSynthesisUtterance));
  events.dispatchEvent(new Event('voiceschanged'));
  assert.equal(spoken.length, 0);
  available = [zira];
  events.dispatchEvent(new Event('voiceschanged'));
  events.dispatchEvent(new Event('voiceschanged'));
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].voice, zira);
  stop();
});

test('canceling pending playback prevents a late voice event from speaking', () => {
  const events = new EventTarget();
  let available: SpeechSynthesisVoice[] = [];
  const synth = {
    getVoices: () => available,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    speak: () => assert.fail('Canceled playback'),
  } as unknown as SpeechSynthesis;
  const stop = playSpeech(synth, 'Test', 'bs', () => assert.fail('Canceled error'));
  stop();
  available = [zira];
  events.dispatchEvent(new Event('voiceschanged'));
});
