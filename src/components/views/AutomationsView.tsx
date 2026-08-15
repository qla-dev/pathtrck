import { Bot, CheckCircle2, Cpu, Gauge, Radar, Rocket, ShieldCheck, Sparkles, TimerReset, Zap } from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { ChatInsightsPanel } from '../chat/ChatInsightsPanel';
import { AiRouteCalculatorCard } from '../ai_automattions/AiRouteCalculatorCard';

export const AutomationsView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  return (
  <div className="space-y-6">
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-primary text-xs font-black uppercase tracking-[0.2em]">
            <Sparkles className="w-4 h-4" />
            {u('legacy.automationsView.aiAutomations', 'AI Automations')}
          </div>
          <h1 className="text-3xl font-black mt-2 dark:text-white">
            {u('legacy.automationsView.aiControlCenter', 'AI Control Center')}
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            {u(
              'legacy.automationsView.manageTriggersSecurityRulesAndSmartRouteAutomations',
              'Manage triggers, security rules, and smart route automations from one place.'
            )}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
          <CheckCircle2 className="w-4 h-4" />
          {u('legacy.automationsView.allSystemsActive', 'All systems active')}
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        {[
          {
            icon: Radar,
            label: u('legacy.automationsView.activeTriggers', 'Active Triggers'),
            value: '24',
            note: u('legacy.automationsView.plus4Today', '+4 today'),
            tone: 'text-primary',
          },
          {
            icon: Zap,
            label: u('legacy.automationsView.automatedActions', 'Automated Actions'),
            value: '182',
            note: u('legacy.automationsView.in24h', 'in 24h'),
            tone: 'text-amber-500',
          },
          {
            icon: ShieldCheck,
            label: u('legacy.automationsView.securityScore', 'Security Score'),
            value: '99.2%',
            note: u('legacy.automationsView.noIncidents', 'no incidents'),
            tone: 'text-emerald-500',
          },
          {
            icon: TimerReset,
            label: u('legacy.automationsView.averageRuntime', 'Average Runtime'),
            value: '320ms',
            note: u('legacy.automationsView.perAutomation', 'per automation'),
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
          {u('legacy.automationsView.workflowQueue', 'Workflow Queue')}
        </div>
        <div className="space-y-3">
          {[
            u('legacy.automationsView.workflowEtaUpdate', 'ETA update for HAM-SJJ-214'),
            u('legacy.automationsView.workflowAutoAssignFallback', 'Auto-assign fallback driver'),
            u('legacy.automationsView.workflowFraudCheck', 'Fraud check for new route'),
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
          {u('legacy.automationsView.triggerRules', 'Trigger Rules')}
        </div>
        <div className="space-y-3">
          {[
            { name: u('legacy.automationsView.triggerDelay', 'Delay > 20 min'), pct: '92%' },
            { name: u('legacy.automationsView.triggerFuelVariance', 'Fuel variance > 8%'), pct: '78%' },
            { name: u('legacy.automationsView.triggerNewStopRequest', 'New stop request'), pct: '84%' },
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
          {u('legacy.automationsView.executionLog', 'Execution Log')}
        </div>
        <div className="space-y-4">
          {[
            { time: '09:18', label: u('legacy.automationsView.logAiEtaMessage', 'AI suggested a new ETA message') },
            { time: '09:22', label: u('legacy.automationsView.logTelegramSync', 'Telegram channel synchronized') },
            { time: '09:29', label: u('legacy.automationsView.logSecurityCheck', 'Security check passed') },
            { time: '09:34', label: u('legacy.automationsView.logRouteScore', 'Route score recalculated') },
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
          {u('legacy.automationsView.autoRefreshEvery2Seconds', 'Auto-refresh every 2 seconds')}
        </div>
      </div>
    </div>
  </div>
  );
};
