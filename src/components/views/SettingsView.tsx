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
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cn } from '../../lib/cn';

const tr = (lang: Language, en: string, bs: string, de: string) => {
  if (lang === 'bs') return bs;
  if (lang === 'de') return de;
  return en;
};

const Toggle = ({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'relative w-12 h-7 rounded-full transition-colors',
      active ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
    )}
  >
    <span
      className={cn(
        'absolute top-1 w-5 h-5 rounded-full bg-white transition-transform',
        active ? 'translate-x-6' : 'translate-x-1'
      )}
    />
  </button>
);

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
  const title = tr(lang, 'Settings Control Center', 'Kontrolni centar postavki', 'Einstellungszentrale');
  const subtitle = isDriver
    ? tr(
        lang,
        'Manage driver profile, compliance, app behavior, and security from one place.',
        'Upravljajte profilom vozaca, uskladjenosti, ponasanjem aplikacije i sigurnosti na jednom mjestu.',
        'Verwalten Sie Fahrerprofil, Compliance, App-Verhalten und Sicherheit an einem Ort.'
      )
    : tr(
        lang,
        'Manage customer profile, billing defaults, communication, and account security.',
        'Upravljajte profilom korisnika, naplatom, komunikacijom i sigurnoscu naloga.',
        'Verwalten Sie Kundenprofil, Abrechnung, Kommunikation und Kontosicherheit.'
      );

  return (
    <div className="w-full space-y-6">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-primary text-xs font-black uppercase tracking-[0.2em]">
              <SlidersHorizontal className="w-4 h-4" />
              {tr(lang, 'System Preferences', 'Sistemske preference', 'Systemeinstellungen')}
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
                ? tr(lang, 'Driver License: Verified', 'Vozacka licenca: Verifikovana', 'Fahrerlizenz: Verifiziert')
                : tr(lang, 'Customer License: Active', 'Licenca kupca: Aktivna', 'Kundenlizenz: Aktiv')}
            </span>
            <Button size="sm">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {tr(lang, 'Save Changes', 'Sacuvaj izmjene', 'Aenderungen speichern')}
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
              <p className="font-bold dark:text-white">{tr(lang, 'Profile Basics', 'Osnovni profil', 'Profil-Basics')}</p>
              <p className="text-xs text-slate-500">{tr(lang, 'Identity and contact details', 'Identitet i kontakt detalji', 'Identitaet und Kontaktdaten')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">{tr(lang, 'Full Name', 'Puno ime', 'Vollstaendiger Name')}</span>
              <input className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white" defaultValue="John Doe" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">{tr(lang, 'Email', 'Email', 'E-Mail')}</span>
              <input className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white" defaultValue="john.doe@CARGO.AI" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">{tr(lang, 'Phone', 'Telefon', 'Telefon')}</span>
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
              <p className="font-bold dark:text-white">{isDriver ? tr(lang, 'Driver Compliance', 'Uskladjenost vozaca', 'Fahrer-Compliance') : tr(lang, 'Billing & Company', 'Naplata i kompanija', 'Abrechnung & Firma')}</p>
              <p className="text-xs text-slate-500">
                {isDriver
                  ? tr(lang, 'License and regulation data', 'Podaci licence i regulativa', 'Lizenz- und Regulierungsdaten')
                  : tr(lang, 'Invoicing and legal profile', 'Profil fakturisanja i pravni podaci', 'Rechnungs- und Rechtsprofil')}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {isDriver ? (
              <>
                <InfoRow label={tr(lang, 'License Number', 'Broj vozacke', 'Fuehrerscheinnummer')} value="BA-DRV-29914" />
                <InfoRow label={tr(lang, 'License Expiry', 'Istek licence', 'Lizenzablauf')} value="12.10.2028" />
                <InfoRow label={tr(lang, 'Vehicle Class', 'Klasa vozila', 'Fahrzeugklasse')} value="C+E" />
                <InfoRow label={tr(lang, 'ADR Certificate', 'ADR certifikat', 'ADR-Zertifikat')} value={tr(lang, 'Valid', 'Validan', 'Gueltig')} />
              </>
            ) : (
              <>
                <InfoRow label={tr(lang, 'Company', 'Kompanija', 'Firma')} value="CARGO.AI Logistics" />
                <InfoRow label={tr(lang, 'VAT ID', 'PDV ID', 'USt-ID')} value="BA4492281000" />
                <InfoRow label={tr(lang, 'Default Currency', 'Podrazumijevana valuta', 'Standardwaehrung')} value="EUR (€)" />
                <InfoRow label={tr(lang, 'Payment Term', 'Rok placanja', 'Zahlungsziel')} value={tr(lang, '15 days', '15 dana', '15 Tage')} />
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
              <p className="font-bold dark:text-white">{tr(lang, 'Notification Matrix', 'Matrica obavjestenja', 'Benachrichtigungsmatrix')}</p>
              <p className="text-xs text-slate-500">{tr(lang, 'Pick what reaches you first', 'Odaberite sta stize prvo', 'Waehlen Sie, was Sie zuerst erreicht')}</p>
            </div>
          </div>
          <div className="space-y-4">
            <ToggleRow
              label={tr(lang, 'Email Alerts', 'Email obavjestenja', 'E-Mail-Benachrichtigungen')}
              desc={tr(lang, 'Status updates and escalations', 'Status update-i i eskalacije', 'Status-Updates und Eskalationen')}
              active={emailAlerts}
              onToggle={() => setEmailAlerts((v) => !v)}
            />
            <ToggleRow
              label={tr(lang, 'Push Alerts', 'Push obavjestenja', 'Push-Benachrichtigungen')}
              desc={tr(lang, 'Mobile and desktop instant alerts', 'Mobilna i desktop instant obavjestenja', 'Mobile und Desktop-Sofortwarnungen')}
              active={pushAlerts}
              onToggle={() => setPushAlerts((v) => !v)}
            />
            <ToggleRow
              label={tr(lang, 'SMS Alerts', 'SMS obavjestenja', 'SMS-Benachrichtigungen')}
              desc={tr(lang, 'Critical route exceptions only', 'Samo kriticni izuzeci ruta', 'Nur kritische Routenausnahmen')}
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
              <p className="font-bold dark:text-white">{tr(lang, 'Security & Access', 'Sigurnost i pristup', 'Sicherheit & Zugriff')}</p>
              <p className="text-xs text-slate-500">{tr(lang, 'Hardening and session control', 'Zastita i kontrola sesija', 'Haertung und Sitzungskontrolle')}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-xs text-slate-500">{tr(lang, 'Last password update', 'Zadnja promjena lozinke', 'Letzte Passwortaenderung')}</p>
              <p className="font-bold dark:text-white mt-1">22.02.2026</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-xs text-slate-500">{tr(lang, 'Active sessions', 'Aktivne sesije', 'Aktive Sitzungen')}</p>
              <p className="font-bold dark:text-white mt-1">4</p>
            </div>
          </div>

          <div className="space-y-4">
            <ToggleRow
              label={tr(lang, 'Two-Factor Authentication', 'Dvofaktorska autentikacija', 'Zwei-Faktor-Authentifizierung')}
              desc={tr(lang, 'Require OTP on sign in', 'Trazi OTP pri prijavi', 'OTP bei Anmeldung erforderlich')}
              active={twoFactor}
              onToggle={() => setTwoFactor((v) => !v)}
            />
            <ToggleRow
              label={tr(lang, 'Session Lock', 'Zakljucavanje sesije', 'Sitzungssperre')}
              desc={tr(lang, 'Auto-lock after inactivity', 'Auto-zakljucavanje nakon neaktivnosti', 'Automatische Sperre bei Inaktivitaet')}
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
              <p className="font-bold dark:text-white">{tr(lang, 'Appearance & Region', 'Izgled i regija', 'Darstellung & Region')}</p>
              <p className="text-xs text-slate-500">{tr(lang, 'UI defaults', 'UI podrazumijevano', 'UI-Standards')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <InfoRow label={tr(lang, 'Theme', 'Tema', 'Design')} value={tr(lang, 'Dark (Default)', 'Tamna (Podrazumijevano)', 'Dunkel (Standard)')} />
            <InfoRow label={tr(lang, 'Language', 'Jezik', 'Sprache')} value={lang === 'bs' ? 'Bosanski' : lang === 'de' ? 'Deutsch' : 'English'} />
            <InfoRow label={tr(lang, 'Timezone', 'Vremenska zona', 'Zeitzone')} value="Europe/Sarajevo" />
            <InfoRow label={tr(lang, 'Date format', 'Format datuma', 'Datumsformat')} value="dd.mm.yyyy" />
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold dark:text-white">{tr(lang, 'Integrations', 'Integracije', 'Integrationen')}</p>
              <p className="text-xs text-slate-500">{tr(lang, 'Connected channels', 'Povezani kanali', 'Verbundene Kanaele')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <IntegrationRow icon={Smartphone} name="WhatsApp" state={tr(lang, 'Connected', 'Povezano', 'Verbunden')} />
            <IntegrationRow icon={Globe} name="Telegram" state={tr(lang, 'Connected', 'Povezano', 'Verbunden')} />
            <IntegrationRow icon={KeyRound} name="API Webhooks" state={tr(lang, 'Active', 'Aktivno', 'Aktiv')} />
            <IntegrationRow icon={Wrench} name="Fleet Telematics" state={tr(lang, 'Synced', 'Sinhronizovano', 'Synchronisiert')} />
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
              <p className="font-bold dark:text-white">{isDriver ? tr(lang, 'Driver Defaults', 'Vozacke podrazumijevane postavke', 'Fahrer-Standardeinstellungen') : tr(lang, 'Customer Defaults', 'Korisnicke podrazumijevane postavke', 'Kunden-Standardeinstellungen')}</p>
              <p className="text-xs text-slate-500">{tr(lang, 'Behavior and automation defaults', 'Podrazumijevano ponasanje i automatizacija', 'Standardverhalten und Automatisierung')}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {(isDriver
              ? [
                  tr(lang, 'Auto accept routes under 120km', 'Auto prihvati rute ispod 120km', 'Routen unter 120km automatisch annehmen'),
                  tr(lang, 'Prefer fuel-efficient route strategy', 'Preferiraj strategiju ustede goriva', 'Kraftstoffeffiziente Route bevorzugen'),
                  tr(lang, 'Enable AI dispatch message helper', 'Omoguci AI dispatch pomocnika poruka', 'KI-Dispatch-Nachrichtenhelfer aktivieren'),
                  tr(lang, 'Share live ETA every 15 min', 'Dijeli live ETA svakih 15 min', 'Live-ETA alle 15 Min teilen'),
                ]
              : [
                  tr(lang, 'Auto-post recurring routes weekly', 'Auto-objava ponovljenih ruta sedmicno', 'Wiederkehrende Routen woechentlich automatisch posten'),
                  tr(lang, 'Use preferred carrier list first', 'Prvo koristi listu preferiranih prevoznika', 'Bevorzugte Fahrerliste zuerst nutzen'),
                  tr(lang, 'Enable instant quote suggestions', 'Omoguci instant prijedloge ponuda', 'Sofortige Angebotsvorschlaege aktivieren'),
                  tr(lang, 'Auto-share loading instructions', 'Auto dijeljenje instrukcija utovara', 'Ladeanweisungen automatisch teilen'),
                ]
            ).map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-3">
                <p className="text-sm dark:text-slate-200">{item}</p>
                <Toggle active={autoSync} onClick={() => setAutoSync((v) => !v)} />
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
              <p className="font-bold dark:text-white">{tr(lang, 'Danger Zone', 'Opasna zona', 'Gefahrenzone')}</p>
              <p className="text-xs text-slate-500">{tr(lang, 'High impact account actions', 'Akcije s visokim uticajem', 'Kontoaktionen mit hoher Wirkung')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <Button variant="outline" className="w-full">
              {tr(lang, 'Export all data', 'Izvezi sve podatke', 'Alle Daten exportieren')}
            </Button>
            <Button variant="outline" className="w-full text-red-500 border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/10" onClick={onLogout}>
              {tr(lang, 'Logout from all devices', 'Odjava sa svih uredjaja', 'Auf allen Geraeten abmelden')}
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
    <Toggle active={active} onClick={onToggle} />
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
