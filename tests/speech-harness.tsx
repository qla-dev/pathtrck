import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatConversationPanel } from '../src/components/chat/ChatConversationPanel';
import { LenaThinkingIndicator } from '../src/components/chat/LenaThinkingIndicator';
import type { ChatMessage } from '../src/components/chat/types';

function Harness() {
  const [draft, setDraft] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'welcome-test', sender: 'other', text: 'Pozdrav. Kako mogu pomoći?', time: '12:00' }]);
  return <><button onClick={() => { setVoiceMode(false); setMessages(old => [...old, { id: `guided-${old.length}`, sender: 'other', text: 'Guided reply stays silent', time: '12:02' }]); }}>Guided answer</button><ChatConversationPanel
    activeConversation={{ id: '94', name: 'Test', role: 'Lena', channel: 'inapp', online: true, unread: 0, lastTime: '', messages }}
    draft={draft} onDraftChange={setDraft} messagePlaceholder="Message"
    onSend={(text, source) => { setVoiceMode(source === 'voice'); setDraft(''); setMessages((old) => [...old, { id: String(old.length), sender: 'other', text: `Odgovor: ${text}`, time: '12:01' }]); }}
    voiceMode={voiceMode} onVoiceModeChange={setVoiceMode}
    voiceLanguage={new URLSearchParams(location.search).get('lang') || 'bs-BA'}
  /></>;
}
const indicatorTest = new URLSearchParams(location.search).get('indicator');
createRoot(document.getElementById('root')!).render(indicatorTest
  ? <LenaThinkingIndicator phrases={['razmišlja']} voiceMode={indicatorTest === 'voice'} voiceLanguage="bs" />
  : <Harness />);
