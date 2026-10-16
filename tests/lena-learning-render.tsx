import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { installLenaCatalog, type LenaCatalogData } from '../src/lib/lenaCatalog';
import type { ChatMessage } from '../src/components/chat/types';
import type { LenaQuickAction } from '../src/lib/useLenaAiChat';

/** Run through Vite SSR so the same JSX/env transforms as the app are used. */
export async function run(catalog: LenaCatalogData) {
  installLenaCatalog(catalog);
  const { useLenaEmbeddedMessages } = await import('../src/components/lena/useLenaEmbeddedMessages');
  const { lenaLearningActive, lenaLearningAnswerLabel, lenaTrainingActive } = await import('../src/lib/useLenaAiChat');
  const question: ChatMessage = { id: '1', sender: 'other', text: 'Question\n[[LENA_LEARN_CARD:assessment:route]]', time: '' };
  function Harness({ messages }: { messages: ChatMessage[] }) {
    const view = useLenaEmbeddedMessages({ messages, lang: 'en', onSuggestedReply: () => {},
      quickActionLabels: catalog.locales.en.actions as Record<LenaQuickAction, string>, onQuickAction: () => {} });
    return <>{view.displayMessages.map((message) => <section key={message.id}>{message.text}{view.renderMessageExtra(message)}</section>)}</>;
  }
  const active = renderToStaticMarkup(<Harness messages={[question]} />);
  assert.ok(active.includes(catalog.locales.en.learning!.lessons.route.choices.b));
  assert.ok(active.includes('Help me'));
  assert.ok(!active.includes('LENA_LEARN_CARD'));
  assert.ok(!active.includes('disabled='));
  const completed = renderToStaticMarkup(<Harness messages={[question, { id: '2', sender: 'other', text: 'Completed', time: '' }]} />);
  assert.ok(completed.includes('disabled='), 'Old question must be disabled after completion');
  const waiting = renderToStaticMarkup(<Harness messages={[question, { id: '2', sender: 'me', text: 'Answer', time: '' }]} />);
  assert.ok(waiting.includes('disabled='), 'Question must be disabled while a reply is pending');
  assert.equal(lenaLearningAnswerLabel('[[LENA_LEARN:final:route:b]]', 'en'), catalog.locales.en.learning!.lessons.route.choices.b);
  assert.equal(lenaLearningActive(['[[LENA_ACTION:training]]', '[[LENA_ACTION:learn]]']), true);
  assert.equal(lenaTrainingActive(['[[LENA_ACTION:training]]', '[[LENA_ACTION:learn]]']), false);
  assert.equal(lenaLearningActive(['[[LENA_ACTION:learn]]', '[[LENA_ACTION:free]]']), false);
  const welcome = renderToStaticMarkup(<Harness messages={[{ id: 'welcome', sender: 'other', text: catalog.locales.en.welcome.general, time: '' }]} />);
  assert.ok(welcome.includes('Learn with Lena'), 'Existing welcome must offer learning to ordinary users');
  return 'Learning render checks passed (buttons, hidden markers, disabled history, labels and mode separation).';
}
