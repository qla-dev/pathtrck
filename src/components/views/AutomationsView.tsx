import { Bot, CheckCircle2, Cpu, Gauge, Radar, Rocket, ShieldCheck, Sparkles, TimerReset, Zap } from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { ChatInsightsPanel } from '../chat/ChatInsightsPanel';
import { AiRouteCalculatorCard } from '../ai_automattions/AiRouteCalculatorCard';

export const AutomationsView = ({ lang }: { lang: Language }) => (
  <div className="space-y-6">
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-primary text-xs font-black uppercase tracking-[0.2em]">
            <Sparkles className="w-4 h-4" />
            {ui(lang, 'common.automations', 'AI Automations')}
          </div>
          <h1 className="text-3xl font-black mt-2 dark:text-white">
            {lang === 'bs' ? 'AI Control Center' : lang === 'de' ? 'KI Control Center' : 'AI Control Center'}
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            {lang === 'bs'
              ? 'Upravljaj triggerima, sigurnosnim pravilima i smart rutama iz jednog mjesta.'
              : lang === 'de'
                ? 'Verwalten Sie Trigger, Sicherheitsregeln und smarte Routen an einem Ort.'
                : 'Manage triggers, security rules, and smart route automations from one place.'}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
          <CheckCircle2 className="w-4 h-4" />
          {lang === 'bs' ? 'Sve aktivno' : lang === 'de' ? 'Alles aktiv' : 'All systems active'}
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        {[
          {
            icon: Radar,
            label: lang === 'bs' ? 'Aktivni triggeri' : lang === 'de' ? 'Aktive Trigger' : 'Active Triggers',
            value: '24',
            note: lang === 'bs' ? '+4 danas' : lang === 'de' ? '+4 heute' : '+4 today',
            tone: 'text-primary',
          },
          {
            icon: Zap,
            label: lang === 'bs' ? 'Automatske akcije' : lang === 'de' ? 'Automatische Aktionen' : 'Automated Actions',
            value: '182',
            note: lang === 'bs' ? 'u 24h' : lang === 'de' ? 'in 24h' : 'in 24h',
            tone: 'text-amber-500',
          },
          {
            icon: ShieldCheck,
            label: lang === 'bs' ? 'Sigurnosni score' : lang === 'de' ? 'Sicherheits-Score' : 'Security Score',
            value: '99.2%',
            note: lang === 'bs' ? 'bez incidenata' : lang === 'de' ? 'keine Vorfaelle' : 'no incidents',
            tone: 'text-emerald-500',
          },
          {
            icon: TimerReset,
            label: lang === 'bs' ? 'Prosjecno vrijeme' : lang === 'de' ? 'Durchschnittszeit' : 'Average Runtime',
            value: '320ms',
            note: lang === 'bs' ? 'po automatizaciji' : lang === 'de' ? 'pro Automatisierung' : 'per automation',
            tone: 'text-violet-500',
          },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            <div className={`w-9 h-9 rounded-xl bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center ${item.tone}`}>
              <item.icon className="w-4 h-4" />
            </div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mt-3">{item.label}</p>
            <p className="text-2xl font-black dark:text-white">{item.value}</p>
            <p className="text-xs text-slate-500">{item.note}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="grid xl:grid-cols-12 gap-6">
      <div className="xl:col-span-8">
        <AiRouteCalculatorCard lang={lang} className="h-full" />
      </div>
      <div className="xl:col-span-4">
        <ChatInsightsPanel lang={lang} className="h-full lg:col-span-12" />
      </div>
    </div>

    <div className="grid lg:grid-cols-3 gap-6">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-[0.2em] mb-4">
          <Cpu className="w-4 h-4" />
          {lang === 'bs' ? 'Workflow Queue' : lang === 'de' ? 'Workflow Queue' : 'Workflow Queue'}
        </div>
        <div className="space-y-3">
          {[
            lang === 'bs' ? 'ETA update za HAM-SJJ-214' : lang === 'de' ? 'ETA-Update fuer HAM-SJJ-214' : 'ETA update for HAM-SJJ-214',
            lang === 'bs' ? 'Auto-assign fallback driver' : lang === 'de' ? 'Fallback-Fahrer automatisch zuweisen' : 'Auto-assign fallback driver',
            lang === 'bs' ? 'Fraud check za novu rutu' : lang === 'de' ? 'Fraud-Check fuer neue Route' : 'Fraud check for new route',
          ].map((line, idx) => (
            <div key={line} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between">
              <p className="text-sm dark:text-slate-200">{line}</p>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary">P{idx + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-[0.2em] mb-4">
          <Gauge className="w-4 h-4" />
          {lang === 'bs' ? 'Trigger Rules' : lang === 'de' ? 'Trigger Rules' : 'Trigger Rules'}
        </div>
        <div className="space-y-3">
          {[
            { name: lang === 'bs' ? 'Kasnjenje > 20 min' : lang === 'de' ? 'Verspaetung > 20 Min' : 'Delay > 20 min', pct: '92%' },
            { name: lang === 'bs' ? 'Promjena goriva > 8%' : lang === 'de' ? 'Kraftstoffabweichung > 8%' : 'Fuel variance > 8%', pct: '78%' },
            { name: lang === 'bs' ? 'Novi stop request' : lang === 'de' ? 'Neuer Stop-Request' : 'New stop request', pct: '84%' },
          ].map((rule) => (
            <div key={rule.name} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold dark:text-slate-200">{rule.name}</span>
                <span className="text-primary font-bold">{rule.pct}</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: rule.pct }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
        <div className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-[0.2em] mb-4">
          <Rocket className="w-4 h-4" />
          {lang === 'bs' ? 'Execution Log' : lang === 'de' ? 'Execution Log' : 'Execution Log'}
        </div>
        <div className="space-y-4">
          {[
            { time: '09:18', label: lang === 'bs' ? 'AI predlozio novu ETA poruku' : lang === 'de' ? 'KI schlug neue ETA-Nachricht vor' : 'AI suggested a new ETA message' },
            { time: '09:22', label: lang === 'bs' ? 'Kanal Telegram sinhronizovan' : lang === 'de' ? 'Telegram-Kanal synchronisiert' : 'Telegram channel synchronized' },
            { time: '09:29', label: lang === 'bs' ? 'Sigurnosni check prosao' : lang === 'de' ? 'Sicherheitscheck bestanden' : 'Security check passed' },
            { time: '09:34', label: lang === 'bs' ? 'Route score recalculated' : lang === 'de' ? 'Route-Score neu berechnet' : 'Route score recalculated' },
          ].map((entry, idx) => (
            <div key={`${entry.time}-${idx}`} className="flex gap-3">
              <div className="mt-1 w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
              <div>
                <p className="text-[11px] text-slate-500">{entry.time}</p>
                <p className="text-sm dark:text-slate-200">{entry.label}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto pt-4 text-xs text-slate-500 flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          {lang === 'bs' ? 'Auto-refresh svake 2 sekunde' : lang === 'de' ? 'Auto-Refresh alle 2 Sekunden' : 'Auto-refresh every 2 seconds'}
        </div>
      </div>
    </div>
  </div>
);
