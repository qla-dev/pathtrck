import { useMemo, useState } from 'react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { ChatConversationPanel } from '../chat/ChatConversationPanel';
import { ChatSidebar } from '../chat/ChatSidebar';
import { Channel, Conversation } from '../chat/types';

export const MessagesView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const conversations = useMemo<Conversation[]>(
    () => [
      {
        id: 'c1',
        name: 'Lena / Route Ops',
        role: u('Dispatch Manager', 'Dispatch Manager'),
        channel: 'whatsapp',
        online: true,
        unread: 2,
        lastTime: '09:24',
        messages: [
          { id: 'm1', sender: 'other', text: u('Truck PT-19 reached Vienna checkpoint.', 'Truck PT-19 reached Vienna checkpoint.'), time: '09:10' },
          { id: 'm2', sender: 'me', text: u('Received. Updating ETA for customer now.', 'Received. Updating ETA for customer now.'), time: '09:12' },
          { id: 'm3', sender: 'other', text: u('Please share updated ETA once AI route sync completes.', 'Please share updated ETA once AI route sync completes.'), time: '09:24' },
        ],
      },
      {
        id: 'c2',
        name: 'Mark / Fleet Lead',
        role: u('Fleet Supervisor', 'Fleet Supervisor'),
        channel: 'telegram',
        online: true,
        unread: 0,
        lastTime: '08:41',
        messages: [
          { id: 'm1', sender: 'system', text: u('Maintenance alert: DE-992-AB due tomorrow.', 'Maintenance alert: DE-992-AB due tomorrow.'), time: '08:30' },
          { id: 'm2', sender: 'other', text: u('Booked service slot for 11:00.', 'Booked service slot for 11:00.'), time: '08:41' },
        ],
      },
      {
        id: 'c3',
        name: 'Acme Retail Client',
        role: u('Enterprise Customer', 'Enterprise Customer'),
        channel: 'inapp',
        online: false,
        unread: 1,
        lastTime: u('Yesterday', 'Yesterday'),
        messages: [
          { id: 'm1', sender: 'other', text: u('Can we prioritize LDN-HAM load tomorrow?', 'Can we prioritize LDN-HAM load tomorrow?'), time: u('Yesterday', 'Yesterday') },
          { id: 'm2', sender: 'me', text: u('Yes, rerouting options are in progress.', 'Yes, rerouting options are in progress.'), time: u('Yesterday', 'Yesterday') },
        ],
      },
    ],
    [lang]
  );
  const [channelFilter, setChannelFilter] = useState<'all' | Channel>('all');
  const [activeId, setActiveId] = useState('c1');
  const [draft, setDraft] = useState('');

  const channels = [
    { id: 'all' as const, label: u('All', 'All') },
    { id: 'whatsapp' as const, label: 'WhatsApp' },
    { id: 'telegram' as const, label: 'Telegram' },
    { id: 'inapp' as const, label: u('In App', 'In App') },
  ];

  const filteredConversations = useMemo(
    () => conversations.filter((c) => channelFilter === 'all' || c.channel === channelFilter),
    [channelFilter, conversations]
  );

  const activeConversation = useMemo(
    () => filteredConversations.find((c) => c.id === activeId) ?? filteredConversations[0] ?? conversations[0],
    [filteredConversations, activeId, conversations]
  );

  const sendMessage = () => {
    if (!draft.trim()) return;
    setDraft('');
  };

  const handleAiDispatchCompose = () => {
    const seed = u(
      'Draft an ETA update for dispatch and clients on this route.',
      'Draft an ETA update for dispatch and clients on this route.',
    );
    setDraft(seed);
  };

  return (
    <div className="h-full">
      <div className="h-full grid lg:grid-cols-12 gap-4">
        <ChatSidebar
          searchPlaceholder={u('Search messages...', 'Search messages...')}
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
          messagePlaceholder={u('Write a message...', 'Write a message...')}
          className="lg:col-span-8"
          showAiDispatchButton
          aiDispatchLabel={u('Write with AI Dispatch', 'Write with AI Dispatch')}
          onAiDispatchClick={handleAiDispatchCompose}
        />
      </div>
    </div>
  );
};
