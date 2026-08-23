export type Channel = 'whatsapp' | 'telegram' | 'inapp';

export type ChatMessage = {
  id: string;
  sender: 'me' | 'other' | 'system';
  text: string;
  time: string;
  attachments?: import('../../lib/lenaLoadCanvas').LenaAttachment[];
  deliveryStatus?: 'failed' | 'uploading';
  onRetry?: () => void;
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
  loadDraftId?: string;
  isAiDispatch?: boolean;
  canvas?: boolean;
  meta?: string;
  status?: string;
  loadPosted?: boolean;
};

