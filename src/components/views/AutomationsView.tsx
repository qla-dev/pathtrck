import { Bot, CheckCircle2, Cpu, Gauge, Radar, Rocket, ShieldCheck, Sparkles, TimerReset, Zap } from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { PageHeader } from '../ui/PageHeader';
import { ChatInsightsPanel } from '../chat/ChatInsightsPanel';
import { AiRouteCalculatorCard } from '../ai_automattions/AiRouteCalculatorCard';

export const AutomationsView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  return (
  <div className="space-y-6">
    <PageHeader
      icon={Sparkles}
      title={u('legacy.automationsView.aiControlCenter', 'AI Control Center')}
      subtitle={u('legacy.automationsView.manageTriggersSecurityRulesAndSmartRouteAutomations', 'Manage triggers, security rules, and smart route automations from one place.')}
      badge={<span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {u('legacy.automationsView.allSystemsActive', 'All systems active')}
      </span>}
      stats={[
        { label: u('legacy.automationsView.activeTriggers', 'Active Triggers'), value: '24', icon: Radar, tone: 'bg-primary/10 text-primary' },
        { label: u('legacy.automationsView.automatedActions', 'Automated Actions'), value: '182', icon: Zap, tone: 'bg-amber-500/10 text-amber-500' },
        { label: u('legacy.automationsView.securityScore', 'Security Score'), value: '99.2%', icon: ShieldCheck, tone: 'bg-emerald-500/10 text-emerald-500' },
        { label: u('legacy.automationsView.averageRuntime', 'Average Runtime'), value: '320ms', icon: TimerReset, tone: 'bg-violet-500/10 text-violet-500' },
      ]}
    />

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
