import { useMemo, useState } from 'react';
import { Language } from '../../types';
import { ChatConversationPanel } from '../chat/ChatConversationPanel';
import { ChatSidebar } from '../chat/ChatSidebar';
import { Channel, Conversation } from '../chat/types';

const CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    name: 'Lena / Route Ops',
    role: 'Dispatch Manager',
    channel: 'whatsapp',
    online: true,
    unread: 2,
    lastTime: '09:24',
    messages: [
      { id: 'm1', sender: 'other', text: 'Truck PT-19 reached Vienna checkpoint.', time: '09:10' },
      { id: 'm2', sender: 'me', text: 'Received. Updating ETA for customer now.', time: '09:12' },
      { id: 'm3', sender: 'other', text: 'Please share updated ETA once AI route sync completes.', time: '09:24' },
    ],
  },
  {
    id: 'c2',
    name: 'Mark / Fleet Lead',
    role: 'Fleet Supervisor',
    channel: 'telegram',
    online: true,
    unread: 0,
    lastTime: '08:41',
    messages: [
      { id: 'm1', sender: 'system', text: 'Maintenance alert: DE-992-AB due tomorrow.', time: '08:30' },
      { id: 'm2', sender: 'other', text: 'Booked service slot for 11:00.', time: '08:41' },
    ],
  },
  {
    id: 'c3',
    name: 'Acme Retail Client',
    role: 'Enterprise Customer',
    channel: 'inapp',
    online: false,
    unread: 1,
    lastTime: 'Yesterday',
    messages: [
      { id: 'm1', sender: 'other', text: 'Can we prioritize LDN-HAM load tomorrow?', time: 'Yesterday' },
      { id: 'm2', sender: 'me', text: 'Yes, rerouting options are in progress.', time: 'Yesterday' },
    ],
  },
];

export const MessagesView = ({ lang }: { lang: Language }) => {
  const [channelFilter, setChannelFilter] = useState<'all' | Channel>('all');
  const [activeId, setActiveId] = useState(CONVERSATIONS[0].id);
  const [draft, setDraft] = useState('');

  const channels = [
    { id: 'all' as const, label: lang === 'bs' ? 'Sve' : lang === 'de' ? 'Alle' : 'All' },
    { id: 'whatsapp' as const, label: 'WhatsApp' },
    { id: 'telegram' as const, label: 'Telegram' },
    { id: 'inapp' as const, label: lang === 'bs' ? 'In App' : lang === 'de' ? 'In App' : 'In App' },
  ];

  const filteredConversations = useMemo(
    () => CONVERSATIONS.filter((c) => channelFilter === 'all' || c.channel === channelFilter),
    [channelFilter]
  );

  const activeConversation = useMemo(
    () => filteredConversations.find((c) => c.id === activeId) ?? filteredConversations[0] ?? CONVERSATIONS[0],
    [filteredConversations, activeId]
  );

  const sendMessage = () => {
    if (!draft.trim()) return;
    setDraft('');
  };

  const handleAiDispatchCompose = () => {
    const seed =
      lang === 'bs'
        ? 'Pripremi ETA update za dispecera i klijente na ovoj ruti.'
        : lang === 'de'
          ? 'Bereite ein ETA-Update fuer Disposition und Kunden auf dieser Route vor.'
          : 'Draft an ETA update for dispatch and clients on this route.';
    setDraft(seed);
  };

  return (
    <div className="h-full">
      <div className="h-full grid lg:grid-cols-12 gap-4">
        <ChatSidebar
          searchPlaceholder={lang === 'bs' ? 'Pretraga poruka...' : lang === 'de' ? 'Nachrichten suchen...' : 'Search messages...'}
          channels={channels}
          channelFilter={channelFilter}
          onChannelFilterChange={setChannelFilter}
          conversations={filteredConversations}
          activeConversationId={activeConversation.id}
          onSelectConversation={setActiveId}
        />

        <ChatConversationPanel
          activeConversation={activeConversation}
          draft={draft}
          onDraftChange={setDraft}
          onSend={sendMessage}
          messagePlaceholder={lang === 'bs' ? 'Napisite poruku...' : lang === 'de' ? 'Nachricht schreiben...' : 'Write a message...'}
          className="lg:col-span-8"
          showAiDispatchButton
          aiDispatchLabel={lang === 'bs' ? 'Pisi uz AI dispecera' : lang === 'de' ? 'Mit KI-Dispo schreiben' : 'Write with AI Dispatch'}
          onAiDispatchClick={handleAiDispatchCompose}
        />
      </div>
    </div>
  );
};
