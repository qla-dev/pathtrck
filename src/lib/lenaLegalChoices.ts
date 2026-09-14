import type { ChatMessage } from '../components/chat/types';

export function legalChoiceMessageIds(messages: ChatMessage[], greetings: string[]): Set<string> {
  const normalize = (text: string) => text.replace(/\[\[[\s\S]*?\]\]/g, '').replace(/\s+/g, ' ').trim();
  const welcomeTexts = new Set(greetings.filter(Boolean).map(normalize));
  const lastUserIndex = messages.map((message) => message.sender).lastIndexOf('me');
  return new Set(messages.flatMap((message, index) =>
    index > lastUserIndex && message.sender === 'other' && welcomeTexts.has(normalize(message.text))
      ? [message.id] : []));
}
