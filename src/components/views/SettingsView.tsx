import { useState, type ComponentType } from 'react';
import {
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Globe,
  KeyRound,
  Moon,
  ShieldCheck,
  Smartphone,
  SlidersHorizontal,
  Truck,
  User,
  Wrench,
} from 'lucide-react';
import { Language, Role } from '../../types';
import { ui } from '../../i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Toggle } from '../ui/Toggle';
import { cn } from '../../lib/cn';

const languageName = (lang: Language) => {
  switch (lang) {
    case 'bs': return 'Bosanski';
    case 'de': return 'Deutsch';
    case 'pl': return 'Polski';
    case 'ro': return 'Romana';
    case 'nl': return 'Nederlands';
    case 'fr': return 'Francais';
    case 'it': return 'Italiano';
    case 'zh': return '中文';
    case 'es': return 'Espanol';
    case 'sr': return 'Srpski';
    case 'sv': return 'Svenska';
    case 'ar': return 'العربية';
    case 'pt': return 'Portugues';
    default: return 'English';
  }
};

export const SettingsView = ({
  role,
  lang,
  onLogout,
}: {
  role: Role;
  lang: Language;
  onLogout: () => void;
}) => {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [sessionLock, setSessionLock] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  const isDriver = role === 'driver';
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const title = u('legacy.settings.title', 'Settings Control Center');
  const subtitle = isDriver
    ? u(
        'legacy.settings.subtitle.driver',
        'Manage driver profile, compliance, app behavior, and security from one place.',
      )
    : u(
        'legacy.settings.subtitle.customer',
        'Manage customer profile, billing defaults, communication, and account security.',
      );

  return (
    <div className="w-full space-y-6">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-primary text-xs font-black uppercase tracking-[0.2em]">
              <SlidersHorizontal className="w-4 h-4" />
              {u('legacy.settings.systemPreferences', 'System Preferences')}
            </div>
            <h1 className="text-3xl font-black mt-2 dark:text-white">{title}</h1>
            <p className="text-sm text-slate-500 mt-2 max-w-3xl">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold',
              isDriver
                ? 'bg-primary/10 text-primary'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            )}>
              {isDriver ? <Truck className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
              {isDriver
                ? u('legacy.settings.driverLicenseVerified', 'Driver License: Verified')
                : u('legacy.settings.customerLicenseActive', 'Customer License: Active')}
            </span>
            <Button size="sm">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {u('legacy.settings.saveChanges', 'Save Changes')}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold dark:text-white">{u('legacy.settings.profileBasics', 'Profile Basics')}</p>
              <p className="text-xs text-slate-500">{u('legacy.settings.identityAndContactDetails', 'Identity and contact details')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">{u('legacy.settings.fullName', 'Full Name')}</span>
              <input className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white" defaultValue="John Doe" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">{u('legacy.settings.email', 'Email')}</span>
              <input className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white" defaultValue="john.doe@smartfreight.ai" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">{u('legacy.settings.phone', 'Phone')}</span>
              <input className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white" defaultValue="+387 61 123 456" />
            </label>
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <div className="flex items-center gap-3 mb-5">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', isDriver ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-500')}>
              {isDriver ? <Truck className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-bold dark:text-white">{isDriver ? u('legacy.settings.driverCompliance', 'Driver Compliance') : u('legacy.settings.billingAndCompany', 'Billing & Company')}</p>
              <p className="text-xs text-slate-500">
                {isDriver
                  ? u('legacy.settings.licenseAndRegulationData', 'License and regulation data')
                  : u('legacy.settings.invoicingAndLegalProfile', 'Invoicing and legal profile')}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {isDriver ? (
              <>
                <InfoRow label={u('legacy.settings.licenseNumber', 'License Number')} value="BA-DRV-29914" />
                <InfoRow label={u('legacy.settings.licenseExpiry', 'License Expiry')} value="12.10.2028" />
                <InfoRow label={u('legacy.settings.vehicleClass', 'Vehicle Class')} value="C+E" />
                <InfoRow label={u('legacy.settings.adrCertificate', 'ADR Certificate')} value={u('legacy.settings.valid', 'Valid')} />
              </>
            ) : (
              <>
                <InfoRow label={u('legacy.settings.company', 'Company')} value="Smartfreight.ai Logistics" />
                <InfoRow label={u('legacy.settings.vatId', 'VAT ID')} value="BA4492281000" />
                <InfoRow label={u('legacy.settings.defaultCurrency', 'Default Currency')} value="EUR (€)" />
                <InfoRow label={u('legacy.settings.paymentTerm', 'Payment Term')} value={u('legacy.settings.paymentTerm15Days', '15 days')} />
              </>
            )}
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold dark:text-white">{u('legacy.settings.notificationMatrix', 'Notification Matrix')}</p>
              <p className="text-xs text-slate-500">{u('legacy.settings.pickWhatReachesYouFirst', 'Pick what reaches you first')}</p>
            </div>
          </div>
          <div className="space-y-4">
            <ToggleRow
              label={u('legacy.settings.emailAlerts', 'Email Alerts')}
              desc={u('legacy.settings.statusUpdatesAndEscalations', 'Status updates and escalations')}
              active={emailAlerts}
              onToggle={() => setEmailAlerts((v) => !v)}
            />
            <ToggleRow
              label={u('legacy.settings.pushAlerts', 'Push Alerts')}
              desc={u('legacy.settings.mobileAndDesktopInstantAlerts', 'Mobile and desktop instant alerts')}
              active={pushAlerts}
              onToggle={() => setPushAlerts((v) => !v)}
            />
            <ToggleRow
              label={u('legacy.settings.smsAlerts', 'SMS Alerts')}
              desc={u('legacy.settings.criticalRouteExceptionsOnly', 'Critical route exceptions only')}
              active={smsAlerts}
              onToggle={() => setSmsAlerts((v) => !v)}
            />
          </div>
        </Card>
      </div>

      <div className="grid xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold dark:text-white">{u('legacy.settings.securityAndAccess', 'Security & Access')}</p>
              <p className="text-xs text-slate-500">{u('legacy.settings.hardeningAndSessionControl', 'Hardening and session control')}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-xs text-slate-500">{u('legacy.settings.lastPasswordUpdate', 'Last password update')}</p>
              <p className="font-bold dark:text-white mt-1">22.02.2026</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-xs text-slate-500">{u('legacy.settings.activeSessions', 'Active sessions')}</p>
              <p className="font-bold dark:text-white mt-1">4</p>
            </div>
          </div>

          <div className="space-y-4">
            <ToggleRow
              label={u('legacy.settings.twoFactorAuthentication', 'Two-Factor Authentication')}
              desc={u('legacy.settings.requireOtpOnSignIn', 'Require OTP on sign in')}
              active={twoFactor}
              onToggle={() => setTwoFactor((v) => !v)}
            />
            <ToggleRow
              label={u('legacy.settings.sessionLock', 'Session Lock')}
              desc={u('legacy.settings.autoLockAfterInactivity', 'Auto-lock after inactivity')}
              active={sessionLock}
              onToggle={() => setSessionLock((v) => !v)}
            />
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold dark:text-white">{u('legacy.settings.appearanceAndRegion', 'Appearance & Region')}</p>
              <p className="text-xs text-slate-500">{u('legacy.settings.uiDefaults', 'UI defaults')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <InfoRow label={u('legacy.settings.theme', 'Theme')} value={u('legacy.settings.darkDefault', 'Dark (Default)')} />
            <InfoRow label={u('legacy.settings.language', 'Language')} value={languageName(lang)} />
            <InfoRow label={u('legacy.settings.timezone', 'Timezone')} value="Europe/Sarajevo" />
            <InfoRow label={u('legacy.settings.dateFormat', 'Date format')} value="dd.mm.yyyy" />
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold dark:text-white">{u('legacy.settings.integrations', 'Integrations')}</p>
              <p className="text-xs text-slate-500">{u('legacy.settings.connectedChannels', 'Connected channels')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <IntegrationRow icon={Smartphone} name="WhatsApp" state={u('legacy.settings.connected', 'Connected')} />
            <IntegrationRow icon={Globe} name="Telegram" state={u('legacy.settings.connected', 'Connected')} />
            <IntegrationRow icon={KeyRound} name="API Webhooks" state={u('legacy.settings.active', 'Active')} />
            <IntegrationRow icon={Wrench} name="Fleet Telematics" state={u('legacy.settings.synced', 'Synced')} />
          </div>
        </Card>
      </div>

      <div className="grid xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              {isDriver ? <Truck className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-bold dark:text-white">{isDriver ? u('legacy.settings.driverDefaults', 'Driver Defaults') : u('legacy.settings.customerDefaults', 'Customer Defaults')}</p>
              <p className="text-xs text-slate-500">{u('legacy.settings.behaviorAndAutomationDefaults', 'Behavior and automation defaults')}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {(isDriver
              ? [
                  u('legacy.settings.driverAutoAcceptRoutesUnder120km', 'Auto accept routes under 120km'),
                  u('legacy.settings.driverPreferFuelEfficientRouteStrategy', 'Prefer fuel-efficient route strategy'),
                  u('legacy.settings.driverEnableAiDispatchMessageHelper', 'Enable AI dispatch message helper'),
                  u('legacy.settings.driverShareLiveEtaEvery15Min', 'Share live ETA every 15 min'),
                ]
              : [
                  u('legacy.settings.customerAutoPostRecurringRoutesWeekly', 'Auto-post recurring routes weekly'),
                  u('legacy.settings.customerUsePreferredCarrierListFirst', 'Use preferred carrier list first'),
                  u('legacy.settings.customerEnableInstantQuoteSuggestions', 'Enable instant quote suggestions'),
                  u('legacy.settings.customerAutoShareLoadingInstructions', 'Auto-share loading instructions'),
                ]
            ).map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-3">
                <p className="text-sm dark:text-slate-200">{item}</p>
                <Toggle checked={autoSync} onClick={() => setAutoSync((v) => !v)} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold dark:text-white">{u('legacy.settings.dangerZone', 'Danger Zone')}</p>
              <p className="text-xs text-slate-500">{u('legacy.settings.highImpactAccountActions', 'High impact account actions')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <Button variant="outline" className="w-full">
              {u('legacy.settings.exportAllData', 'Export all data')}
            </Button>
            <Button variant="outline" className="w-full text-red-500 border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/10" onClick={onLogout}>
              {u('legacy.settings.logoutFromAllDevices', 'Logout from all devices')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const ToggleRow = ({
  label,
  desc,
  active,
  onToggle,
}: {
  label: string;
  desc: string;
  active: boolean;
  onToggle: () => void;
}) => (
  <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
    <div>
      <p className="text-sm font-semibold dark:text-white">{label}</p>
      <p className="text-xs text-slate-500 mt-1">{desc}</p>
    </div>
    <Toggle checked={active} onClick={onToggle} />
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5">
    <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
    <p className="text-sm font-semibold dark:text-white mt-1">{value}</p>
  </div>
);

const IntegrationRow = ({
  icon: Icon,
  name,
  state,
}: {
  icon: ComponentType<{ className?: string }>;
  name: string;
  state: string;
}) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary">
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-sm font-semibold dark:text-white">{name}</p>
    </div>
    <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{state}</span>
  </div>
);
