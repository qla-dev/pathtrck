import { useState, type ReactNode } from 'react';
import {
  Activity as ActivityIcon, ArrowRight, Building2, CalendarDays, CheckCircle2, CircleDollarSign,
  ClipboardCheck, Clock3, FileText, LayoutDashboard, MapPin, Package as PackageIcon,
  LoaderCircle, Pencil, Scale, Send, Truck, UserRound,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '../../lib/cn';
import type { Language, Package, Role } from '../../types';
import { ui, trPackageStatus } from '../../i18n';
import { checklistField, checklistLabel, checklistOwner, checklistSentence } from '../../lib/shipmentChecklist';
import { ShipmentChecklistTable } from './ShipmentChecklistTable';

type SubTab = 'overview' | 'operations' | 'documents' | 'activity';

type Props = {
  shipment: Package;
  workspace: Record<string, unknown> | null;
  lang: Language;
  role: Role;
  userId?: number;
  companyIds?: number[];
  /** Opens the load form; with a field key the form opens on that field alone, titled after the task. */
  onEdit: (focusKey?: string, actionTitle?: string) => void;
  /** Posts a reminder into the shipment conversation; returns whether it was sent. */
  onSendReminder?: (message: string) => Promise<boolean>;
  initialSubTab?: SubTab;
  operationsSlot?: ReactNode;
};

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const array = (value: unknown): Array<Record<string, unknown>> => Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
const titleCase = (value: unknown) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const displayDate = (value: unknown, lang: Language, withTime = false) => {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'bs' ? 'bs-BA' : lang === 'de' ? 'de-DE' : 'en-GB', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
};

const Detail = ({ icon: Icon, label, value, subvalue }: { icon: LucideIcon; label: string; value: string; subvalue?: string }) => (
  <div className="flex min-w-0 gap-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
    <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="truncate text-sm font-bold text-slate-900 dark:text-white">{value}</p>{subvalue && <p className="truncate text-[11px] text-slate-500">{subvalue}</p>}</div>
  </div>
);

const Contact = ({ label, party, icon: Icon }: { label: string; party: Record<string, unknown>; icon: LucideIcon }) => (
  <div>
    <p className="mb-2 text-xs font-black text-slate-800 dark:text-slate-100">{label}</p>
    <div className="flex gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0"><p className="truncate text-sm font-black text-slate-900 dark:text-white">{String(party.name || party.registration_number || '—')}</p><p className="truncate text-xs text-slate-500">{String(party.email || '')}</p><p className="truncate text-xs text-slate-500">{String(party.phone || '')}</p></div>
    </div>
  </div>
);

const Panel = ({ title, icon: Icon, children }: { title: string; icon?: LucideIcon; children: ReactNode }) => (
  <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:p-6">
    <h2 className="mb-5 flex items-center gap-2 font-black text-slate-900 dark:text-white">{Icon && <Icon className="h-5 w-5 text-primary" />}{title}</h2>
    {children}
  </section>
);

export const ShipmentDetailsOverview = ({ shipment, workspace, lang, role, userId, companyIds = [], onEdit, onSendReminder, initialSubTab = 'overview', operationsSlot }: Props) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab);
  const [sendingReminder, setSendingReminder] = useState(false);
  const details = new Map((shipment.details || []).map((detail) => [detail.key, detail.value]));
  const parties = record(workspace?.parties_snapshot);
  const customer = record(parties.customer);
  const provider = record(parties.provider);
  const providerContact = record(parties.provider_contact);
  const driver = record(parties.driver);
  const checklist = array(workspace?.operational_checklist);
  const freightLoad = record(workspace?.freight_load);
  const documents = array(freightLoad.documents);
  const customsDocuments = shipment.customsDocuments || [];
  const nextTask = checklist.find((item) => !['completed', 'approved', 'done'].includes(String(item.status || '').toLowerCase())) || checklist[0];
  const activity = Object.entries(shipment.statusChange || {}).reverse();
  const canEdit = role === 'user' || role === 'superadmin';
  const price = shipment.totalAmount || details.get('price_insurance') || '—';
  const dueDate = displayDate(details.get('etd_at') || shipment.addedDate, lang);

  // Only the side that owns the next task can carry it out; the other side can nudge them for it.
  const nextTaskOwner = nextTask ? checklistOwner(nextTask.key) : 'provider';
  const nextTaskOwnerLabel = nextTaskOwner === 'customer'
    ? u('shipmentDetails.customer', 'Customer')
    : u('shipmentDetails.provider', 'Provider');
  const viewerIsCustomer = Boolean(userId) && Number(workspace?.customer_user_id) === Number(userId);
  const viewerIsProvider = (Boolean(userId) && Number(workspace?.provider_user_id) === Number(userId))
    || (Boolean(workspace?.provider_company_id) && companyIds.includes(Number(workspace?.provider_company_id)));
  const viewerOwns = (key: unknown) => role === 'superadmin'
    || (checklistOwner(key) === 'customer' ? viewerIsCustomer : viewerIsProvider);
  const viewerOwnsNextTask = nextTask ? viewerOwns(nextTask.key) : false;
  const nextTaskSentence = nextTask ? checklistSentence(lang, nextTask.key, nextTaskOwnerLabel) : '';

  // A task that is completed by filling in a load field opens the form on that field, titled after
  // the task; the rest send the viewer to the checklist, which is as far as this screen can take them.
  const openTask = (key: unknown) => {
    const field = checklistField(key);
    if (field) onEdit(field, checklistLabel(lang, key));
    else setSubTab('operations');
  };

  const sendReminder = async () => {
    if (!onSendReminder || !nextTask || sendingReminder) return;
    setSendingReminder(true);
    try {
      await onSendReminder(`${u('shipmentDetails.reminderPrefix', 'Reminder')}: ${nextTaskSentence}.`);
    } finally {
      setSendingReminder(false);
    }
  };

  const subTabs: Array<{ key: SubTab; label: string; icon: LucideIcon; hidden?: boolean }> = [
    { key: 'overview', label: u('shipmentDetails.overview', 'Overview'), icon: LayoutDashboard },
    { key: 'operations', label: u('shipmentOperations.title', 'Operational checklist'), icon: ClipboardCheck, hidden: !operationsSlot },
    { key: 'documents', label: u('shipmentDetails.documents', 'Documents'), icon: FileText },
    { key: 'activity', label: u('shipmentDetails.recentActivity', 'Recent activity'), icon: ActivityIcon },
  ];

  const documentsList = (
    <div className="space-y-3">
      {documents.length || customsDocuments.length ? (
        <>
          {documents.map((document) => (
            <div key={`workspace-${String(document.id)}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-700">
              <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><FileText className="h-4 w-4 shrink-0 text-violet-500" /><span className="truncate">{String(document.name || document.original_name || document.type || 'Document')}</span></span>
              <span className="shrink-0 text-[10px] font-bold text-slate-400">{titleCase(document.status || 'uploaded')}</span>
            </div>
          ))}
          {customsDocuments.map((document) => (
            <div key={`customs-${document.code}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-700">
              <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><FileText className="h-4 w-4 shrink-0 text-sky-500" /><span className="truncate">{document.label}</span></span>
              <span className="shrink-0 text-[10px] font-bold text-slate-400">{document.code}</span>
            </div>
          ))}
        </>
      ) : <p className="text-sm text-slate-500">{u('shipmentDetails.noDocuments', 'No documents yet.')}</p>}
    </div>
  );

  const activityList = (
    <div className="space-y-4">
      {activity.length ? activity.map(([status, changedAt]) => (
        <div key={`${status}-${changedAt}`} className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <div><p className="text-sm font-bold text-slate-800 dark:text-slate-100">{trPackageStatus(lang, status)}</p><p className="text-[11px] text-slate-500">{displayDate(changedAt, lang, true)}</p></div>
        </div>
      )) : <p className="text-sm text-slate-500">{u('shipmentDetails.noActivity', 'No recent activity.')}</p>}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-4">
      <section className="rounded-3xl border border-slate-200 bg-white px-5 pt-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500">{u('shipmentDetails.shipments', 'Shipments')} <span className="mx-2 text-slate-300">/</span> <span className="font-mono text-primary">{shipment.trackingNumber}</span></p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="flex min-w-0 items-center gap-3 text-2xl font-black text-slate-950 dark:text-white md:text-3xl"><span className="truncate">{shipment.origin}</span><ArrowRight className="h-6 w-6 shrink-0 text-primary" /><span className="truncate">{shipment.destination}</span></h1>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600"><CheckCircle2 className="h-4 w-4" />{trPackageStatus(lang, shipment.status)}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-500">{[shipment.transportType, shipment.cargoType, shipment.carrier].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canEdit && <button type="button" onClick={() => onEdit()} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><Pencil className="h-4 w-4" />{u('shipmentDetails.editLoad', 'Edit load')}</button>}
            {operationsSlot && (
              <button type="button" onClick={() => openTask(nextTask?.key)} className="inline-flex h-11 cursor-pointer items-center gap-3 rounded-xl bg-primary px-5 text-sm font-black text-white shadow-lg shadow-primary/20">{u('shipmentDetails.nextAction', 'Next action')}<ArrowRight className="h-4 w-4" /></button>
            )}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto border-t border-slate-100 dark:border-slate-800 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max items-center gap-1">
            {subTabs.filter((tab) => !tab.hidden).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSubTab(tab.key)}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors',
                  subTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {subTab === 'overview' && (
        <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_300px_300px]">
          <main className="min-w-0 space-y-5">
            <Panel title={u('tracking.shipmentDetails', 'Shipment details')}>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <Detail icon={MapPin} label={u('shipmentDetails.pickup', 'Pickup')} value={shipment.origin || '—'} />
                <Detail icon={MapPin} label={u('shipmentDetails.delivery', 'Delivery')} value={shipment.destination || '—'} />
                <Detail icon={CalendarDays} label={u('shipmentDetails.pickupDate', 'Pickup date')} value={displayDate(details.get('etd_at') || shipment.addedDate, lang)} />
                <Detail icon={Clock3} label="ETA" value={displayDate(details.get('eta_at'), lang)} />
                <Detail icon={PackageIcon} label={u('shipmentDetails.cargo', 'Cargo')} value={details.get('quantity_measure') || shipment.cargoType || '—'} />
                <Detail icon={Scale} label={u('shipmentDetails.weight', 'Weight')} value={details.get('weight_kg') || '—'} />
                <Detail icon={Truck} label={u('shipmentDetails.equipment', 'Equipment')} value={details.get('container_types') || details.get('freight_mode') || '—'} />
                <Detail icon={CircleDollarSign} label={u('shipmentDetails.price', 'Price')} value={String(price)} subvalue={details.get('incoterms')} />
              </div>
            </Panel>

            <ShipmentChecklistTable
              checklist={checklist}
              lang={lang}
              dueDate={dueDate}
              renderAction={operationsSlot
                ? (item) => {
                  // A task the viewer owns and that maps to a load field is edited right here;
                  // anything else is only viewable from this screen.
                  const editable = viewerOwns(item.key) && Boolean(checklistField(item.key));
                  return (
                    <button
                      type="button"
                      onClick={() => openTask(item.key)}
                      className={cn(
                        'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold',
                        editable
                          ? 'bg-primary text-white hover:bg-primary/90'
                          : 'border border-primary/40 text-primary hover:bg-primary/5'
                      )}
                    >
                      {editable ? u('shipmentDetails.edit', 'Edit') : u('shipmentDetails.view', 'View')}
                    </button>
                  );
                }
                : undefined}
            />
          </main>

          <aside className="flex min-h-0 min-w-0 flex-col gap-4">
            {nextTask && (
              <section className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-sky-50 p-5 dark:border-violet-900/50 dark:from-violet-950/30 dark:to-sky-950/30">
                <p className="text-xs font-black text-violet-700 dark:text-violet-300">✦ {u('shipmentDetails.nextRequiredAction', 'Next required action')}</p>
                <p className="mt-3 font-black text-slate-900 dark:text-white">{nextTaskSentence}</p>
                {dueDate !== '—' && <p className="mt-1 text-sm text-slate-500">{u('shipmentDetails.dueDate', 'Due date')}: <span className="font-bold text-rose-500">{dueDate}</span></p>}
                {viewerOwnsNextTask ? (
                  operationsSlot && <button type="button" onClick={() => openTask(nextTask.key)} className="mt-4 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-white"><ArrowRight className="h-4 w-4" />{u('shipmentDetails.openAction', 'Open action')}</button>
                ) : (
                  onSendReminder && <button type="button" onClick={() => void sendReminder()} disabled={sendingReminder} className="mt-4 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-white disabled:opacity-60">{sendingReminder ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{u('shipmentDetails.sendReminder', 'Send reminder')}</button>
                )}
              </section>
            )}

            {/* Documents absorb the leftover height and scroll inside, so the box below keeps its
                natural height and the column ends level with the main column. */}
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
                <h2 className="font-black text-slate-900 dark:text-white">{u('shipmentDetails.documents', 'Documents')}</h2>
                <button type="button" onClick={() => setSubTab('documents')} className="cursor-pointer text-xs font-bold text-primary hover:underline">{u('shipmentDetails.view', 'View')}</button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgb(148_163_184/0.72)_transparent]">
                {documentsList}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-black text-slate-900 dark:text-white">{u('shipmentDetails.recentActivity', 'Recent activity')}</h2>
                <button type="button" onClick={() => setSubTab('activity')} className="cursor-pointer text-xs font-bold text-primary hover:underline">{u('shipmentDetails.view', 'View')}</button>
              </div>
              <div className="space-y-4">
                {activity.length ? activity.slice(0, 4).map(([status, changedAt]) => (
                  <div key={`${status}-${changedAt}`} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <div><p className="text-sm font-bold text-slate-800 dark:text-slate-100">{trPackageStatus(lang, status)}</p><p className="text-[11px] text-slate-500">{displayDate(changedAt, lang, true)}</p></div>
                  </div>
                )) : <p className="text-sm text-slate-500">{u('shipmentDetails.noActivity', 'No recent activity.')}</p>}
              </div>
            </section>
          </aside>

          {/* Contacts follow the page down: they are what you reach for while reading anything else. */}
          <aside className="flex min-h-0 min-w-0 flex-col xl:sticky xl:top-0 xl:max-h-[calc(100dvh-7rem)] xl:self-start">
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-5 shrink-0 font-black text-slate-900 dark:text-white">{u('shipmentDetails.partiesContacts', 'Parties & contacts')}</h2>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgb(148_163_184/0.72)_transparent]">
                <Contact label={u('shipmentDetails.customer', 'Customer')} party={customer} icon={Building2} />
                <Contact label={u('shipmentDetails.provider', 'Provider')} party={{ ...provider, email: providerContact.email || provider.email, phone: providerContact.phone || provider.phone }} icon={Building2} />
                <div className="border-t border-slate-100 pt-4 dark:border-slate-800"><Contact label={u('shipmentDetails.assignedDriver', 'Assigned driver')} party={driver} icon={UserRound} /></div>
              </div>
            </section>
          </aside>
        </div>
      )}

      {subTab === 'operations' && operationsSlot}

      {subTab === 'documents' && (
        <Panel title={u('shipmentDetails.documents', 'Documents')} icon={FileText}>{documentsList}</Panel>
      )}

      {subTab === 'activity' && (
        <Panel title={u('shipmentDetails.recentActivity', 'Recent activity')} icon={ActivityIcon}>{activityList}</Panel>
      )}
    </div>
  );
};
