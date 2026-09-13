import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatConversationPanel } from '../src/components/chat/ChatConversationPanel';
import type { ChatMessage } from '../src/components/chat/types';

function Harness() {
  const [draft, setDraft] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'welcome-test', sender: 'other', text: 'Pozdrav. Kako mogu pomoći?', time: '12:00' }]);
  return <ChatConversationPanel
    activeConversation={{ id: 'test', name: 'Test', role: 'Lena', channel: 'inapp', online: true, unread: 0, lastTime: '', messages }}
    draft={draft} onDraftChange={setDraft} messagePlaceholder="Message"
    onSend={(text) => { setDraft(''); setMessages((old) => [...old, { id: String(old.length), sender: 'other', text: `Odgovor: ${text}`, time: '12:01' }]); }}
    voiceMode={voiceMode} onVoiceModeChange={setVoiceMode}
    voiceLanguage={new URLSearchParams(location.search).get('lang') || 'bs-BA'}
  />;
}
createRoot(document.getElementById('root')!).render(<Harness />);
