import assert from 'node:assert/strict';
import test from 'node:test';
import { lenaConversationMessages } from '../src/lib/lenaConversationMessages';

test('a refreshed list displays the saved Lena reply after the user message', () => {
  const question = { id: 10, sender_user_id: 7, body: 'Current status?' };
  const reply = { id: 11, sender_user_id: 99, body: 'In delivery.' };
  const before = { recent_messages: [question] };
  const after = { recent_messages: [reply, question] };
  assert.deepEqual(lenaConversationMessages(before), [question]);
  assert.deepEqual(lenaConversationMessages(after), [question, reply]);
  assert.deepEqual(after.recent_messages, [reply, question]);
});

test('complete conversation messages retain their order and take precedence over previews', () => {
  const messages = [{ id: 1 }, { id: 2 }, { id: 3 }];
  assert.deepEqual(lenaConversationMessages({ messages, recent_messages: [{ id: 3 }] }), messages);
  assert.deepEqual(lenaConversationMessages({ messages: [] }), []);
  assert.deepEqual(lenaConversationMessages({}), []);
});
