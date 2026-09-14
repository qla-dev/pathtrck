import assert from 'node:assert/strict';
import test from 'node:test';
import { legalChoiceMessageIds } from '../src/lib/lenaLegalChoices';
import type { ChatMessage } from '../src/components/chat/types';

const message = (id: string, sender: ChatMessage['sender'], text: string): ChatMessage => ({ id, sender, text, time: '' });

test('legal greeting offers choices across catalog languages and source markers', () => {
  const messages = [message('1', 'me', 'Legal'), message('2', 'other', 'Dobrodošli!\n[[LEGAL_SOURCES:law]]')];
  assert.deepEqual([...legalChoiceMessageIds(messages, ['Welcome!', 'Dobrodošli!'])], ['2']);
});

test('choices disappear after selecting a skill or asking a question and return on re-entry', () => {
  const messages = [message('1', 'other', 'Welcome!'), message('2', 'me', 'CBM'), message('3', 'other', 'Please supply dimensions')];
  assert.equal(legalChoiceMessageIds(messages, ['Welcome!']).size, 0);
  messages.push(message('4', 'me', 'Legal'), message('5', 'other', 'Welcome!'));
  assert.deepEqual([...legalChoiceMessageIds(messages, ['Welcome!'])], ['5']);
});

test('user text and substantive replies never become legal menus', () => {
  assert.equal(legalChoiceMessageIds([message('1', 'me', 'Welcome!'), message('2', 'other', 'Answer')], ['Welcome!']).size, 0);
});
