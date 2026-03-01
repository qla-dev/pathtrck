import { useMemo, useState } from 'react';
import {
  Search,
  MessageSquare,
  Send,
  Paperclip,
  Phone,
  Video,
  Circle,
  Mic,
  Image as ImageIcon,
  Bot,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';

type Channel = 'whatsapp' | 'telegram' | 'inapp';

type ChatMessage = {
  id: string;
  sender: 'me' | 'other' | 'system';
  text: string;
  time: string;
};

type Conversation = {
  id: string;
  name: string;
  role: string;
  channel: Channel;
  online: boolean;
  unread: number;
  lastTime: string;
  messages: ChatMessage[];
};

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

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-12 gap-4 min-h-[72vh]">
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-col">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder={lang === 'bs' ? 'Pretraga poruka...' : lang === 'de' ? 'Nachrichten suchen...' : 'Search messages...'}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-4 gap-1 mb-3">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setChannelFilter(ch.id)}
                className={cn(
                  'h-8 rounded-lg text-[11px] font-bold cursor-pointer transition-all',
                  channelFilter === ch.id
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                )}
              >
                {ch.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 overflow-y-auto pr-1">
            {filteredConversations.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveId(chat.id)}
                className={cn(
                  'w-full p-3 rounded-xl border text-left transition-all cursor-pointer',
                  activeConversation.id === chat.id
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold dark:text-white">{chat.name}</p>
                    <p className="text-[11px] text-slate-500">{chat.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">{chat.lastTime}</p>
                    {chat.unread > 0 && <span className="inline-flex mt-1 px-1.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">{chat.unread}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Circle className={cn('w-2.5 h-2.5', chat.online ? 'text-emerald-500 fill-current' : 'text-slate-300')} />
                  <span className="text-[11px] text-slate-500 uppercase">{chat.channel}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold dark:text-white">{activeConversation.name}</p>
              <p className="text-[11px] text-slate-500">{activeConversation.role}</p>
            </div>
            <div className="flex items-center gap-1">
              <button className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer"><Phone className="w-4 h-4" /></button>
              <button className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer"><Video className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-slate-50/70 dark:bg-slate-950/40">
            {activeConversation.messages.map((m) => (
              <div key={m.id} className={cn('max-w-[85%] rounded-2xl px-3 py-2', m.sender === 'me' ? 'ml-auto bg-primary text-white' : m.sender === 'system' ? 'mx-auto bg-amber-100 text-amber-800 text-xs' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800')}>
                <p className={cn('text-sm', m.sender === 'me' ? 'text-white' : 'dark:text-slate-200')}>{m.text}</p>
                <p className={cn('text-[10px] mt-1', m.sender === 'me' ? 'text-white/70' : 'text-slate-400')}>{m.time}</p>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer"><Paperclip className="w-4 h-4" /></button>
              <button className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer"><ImageIcon className="w-4 h-4" /></button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={lang === 'bs' ? 'Napisite poruku...' : lang === 'de' ? 'Nachricht schreiben...' : 'Write a message...'}
                className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white outline-none"
              />
              <button className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer"><Mic className="w-4 h-4" /></button>
              <button onClick={sendMessage} className="h-9 w-9 rounded-lg bg-primary text-white flex items-center justify-center cursor-pointer"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-primary">AI</p>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {lang === 'bs'
                ? 'Predlog: Posalji automatski ETA update svim klijentima na ovoj ruti.'
                : lang === 'de'
                  ? 'Vorschlag: Senden Sie automatische ETA-Updates an alle Kunden dieser Route.'
                  : 'Suggestion: Send automatic ETA updates to all clients on this route.'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                {lang === 'bs' ? 'Sigurnost' : lang === 'de' ? 'Sicherheit' : 'Security'}
              </p>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {lang === 'bs' ? 'End-to-end enkripcija aktivna.' : lang === 'de' ? 'Ende-zu-Ende Verschluesselung aktiv.' : 'End-to-end encryption enabled.'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                {lang === 'bs' ? 'Status kanala' : lang === 'de' ? 'Kanalstatus' : 'Channel Status'}
              </p>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              WhatsApp: OK
              <br />
              Telegram: OK
              <br />
              In-App: OK
            </p>
          </div>

          <Button className="w-full">
            <MessageSquare className="w-4 h-4 mr-2" />
            {lang === 'bs' ? 'Nova poruka' : lang === 'de' ? 'Neue Nachricht' : 'New Message'}
          </Button>
        </div>
      </div>
    </div>
  );
};
