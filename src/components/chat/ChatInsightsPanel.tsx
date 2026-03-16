import { Bot, CheckCircle2, MessageSquare, ShieldCheck } from 'lucide-react';
import { Language } from '../../types';
import { translateTriplet } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';

export const ChatInsightsPanel = ({ lang, className }: { lang: Language; className?: string }) => {
  const tr = (en: string, bs: string, de: string) => translateTriplet(lang, en, bs, de);

  return (
  <div className={cn("lg:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col gap-4 h-full min-h-0", className)}>
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Bot className="w-4 h-4 text-primary" />
        <p className="text-xs font-bold uppercase tracking-wider text-primary">AI</p>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        {tr('Suggestion: Send automatic ETA updates to all clients on this route.', 'Predlog: Posalji automatski ETA update svim klijentima na ovoj ruti.', 'Vorschlag: Senden Sie automatische ETA-Updates an alle Kunden dieser Route.')}
      </p>
    </div>

    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          {tr('Security', 'Sigurnost', 'Sicherheit')}
        </p>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        {tr('End-to-end encryption enabled.', 'End-to-end enkripcija aktivna.', 'Ende-zu-Ende Verschluesselung aktiv.')}
      </p>
    </div>

    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
          {tr('Channel Status', 'Status kanala', 'Kanalstatus')}
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
      {tr('New Message', 'Nova poruka', 'Neue Nachricht')}
    </Button>
  </div>
  );
};
