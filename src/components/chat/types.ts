export type Channel = 'whatsapp' | 'telegram' | 'inapp';

export type ChatMessage = {
  id: string;
  sender: 'me' | 'other' | 'system';
  text: string;
  time: string;
};

export type Conversation = {
  id: string;
  name: string;
  role: string;
  channel: Channel;
  online: boolean;
  unread: number;
  lastTime: string;
  messages: ChatMessage[];
  loadId?: string;
  isAiDispatch?: boolean;
};

