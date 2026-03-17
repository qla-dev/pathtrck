import { Bot, CheckCircle2, MessageSquare, ShieldCheck } from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';

export const ChatInsightsPanel = ({ lang, className }: { lang: Language; className?: string }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  return (
  <div className={cn("lg:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col gap-4 h-full min-h-0", className)}>
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Bot className="w-4 h-4 text-primary" />
        <p className="text-xs font-bold uppercase tracking-wider text-primary">AI</p>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        {u('chat.suggestionEtaUpdates', 'Suggestion: Send automatic ETA updates to all clients on this route.')}
      </p>
    </div>

    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          {u('common.security', 'Security')}
        </p>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        {u('chat.encryptionEnabled', 'End-to-end encryption enabled.')}
      </p>
    </div>

    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
          {u('chat.channelStatus', 'Channel Status')}
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

    <Button className="w-full mt-auto">
      <MessageSquare className="w-4 h-4 mr-2" />
      {u('chat.newMessage', 'New Message')}
    </Button>
  </div>
  );
};
