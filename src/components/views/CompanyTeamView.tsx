import { useEffect, useMemo, useState } from 'react';
import { Banknote, BarChart3, CheckCircle2, Clock3, Crown, FileCheck2, Loader2, MailPlus, Radio, Search, Send, ShieldCheck, Truck, UserCheck, UserRoundCog, Users, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { ApiUser, api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { confirmAction, showSuccess } from '../../lib/swal';
import { IconSelect, type IconSelectOption } from '../ui/IconSelect';
import { ui } from '../../i18n';

type CompanyRole = 'Company Owner' | 'Manager' | 'Dispatcher' | 'Customs Officer' | 'Driver' | 'Finance';
type Member = { id: string; databaseId: number; name: string; email: string; role: CompanyRole; isOwner: boolean; status: 'Active' | 'Invited'; source: 'membership' | 'invitation' };

const ROLE_PERMISSIONS: Record<CompanyRole, string[]> = {
  'Company Owner': ['Own the company workspace', 'Manage all company data', 'Manage team roles', 'View finance'],
  Manager: ['Manage fleet sharing', 'Invite and remove users', 'Assign all roles', 'View all company data'],
  Dispatcher: ['Assign loads and vehicles', 'Message drivers', 'View live fleet', 'Update route status'],
  'Customs Officer': ['Assign loads and vehicles', 'Message drivers', 'View live fleet', 'Update route status'],
  Driver: ['View assigned loads', 'Update delivery status', 'Add route notes', 'Message dispatch'],
  Finance: ['View invoices and payouts', 'Export finance records', 'Approve payouts', 'No fleet editing'],
};

const ROLE_OPTIONS: IconSelectOption[] = [
  { value: 'Company Owner', label: 'Company Owner', icon: Crown },
  { value: 'Manager', label: 'Manager', icon: Users },
  { value: 'Dispatcher', label: 'Dispatcher', icon: Radio },
  { value: 'Customs Officer', label: 'Customs Officer', icon: FileCheck2 },
  { value: 'Finance', label: 'Finance', icon: Banknote },
  { value: 'Driver', label: 'Driver', icon: Truck },
];

const ROLE_VISUALS: Record<CompanyRole, { icon: LucideIcon; tone: string; shell: string }> = {
  'Company Owner': { icon: Crown, tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-300', shell: 'border-amber-200/80 bg-gradient-to-br from-amber-50 to-white dark:border-amber-900/50 dark:from-amber-950/30 dark:to-slate-900' },
  Manager: { icon: Users, tone: 'bg-violet-500/15 text-violet-600 dark:text-violet-300', shell: 'border-violet-200/80 bg-gradient-to-br from-violet-50 to-white dark:border-violet-900/50 dark:from-violet-950/30 dark:to-slate-900' },
  Dispatcher: { icon: Radio, tone: 'bg-sky-500/15 text-sky-600 dark:text-sky-300', shell: 'border-sky-200/80 bg-gradient-to-br from-sky-50 to-white dark:border-sky-900/50 dark:from-sky-950/30 dark:to-slate-900' },
  'Customs Officer': { icon: FileCheck2, tone: 'bg-teal-500/15 text-teal-600 dark:text-teal-300', shell: 'border-teal-200/80 bg-gradient-to-br from-teal-50 to-white dark:border-teal-900/50 dark:from-teal-950/30 dark:to-slate-900' },
  Finance: { icon: Banknote, tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300', shell: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-slate-900' },
  Driver: { icon: Truck, tone: 'bg-orange-500/15 text-orange-600 dark:text-orange-300', shell: 'border-orange-200/80 bg-gradient-to-br from-orange-50 to-white dark:border-orange-900/50 dark:from-orange-950/30 dark:to-slate-900' },
};

export const CompanyTeamView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const carrierLabel = u('common.carrier', 'Carrier');
  const displayRole = (role: CompanyRole) => role === 'Driver' ? carrierLabel : role;
  const roleOptions = useMemo(() => ROLE_OPTIONS.map((option) => option.value === 'Driver' ? { ...option, label: carrierLabel } : option), [carrierLabel]);
  const assignableRoleOptions = useMemo(() => roleOptions.filter((option) => option.value !== 'Company Owner'), [roleOptions]);
  const memberships = useApiList(api.companyMemberships.list, { per_page: 100 });
  const invitations = useApiList(api.companyInvitations.list, { per_page: 100 });
  const roles = useApiList(api.teamRoleOptions.list, { per_page: 100 });
  const [user, setUser] = useState<ApiUser | null>(null);
  useEffect(() => { void api.auth.me().then(setUser); }, []);
  const companyId = Number((user?.companies?.[0] as Record<string, unknown> | undefined)?.id || 0);
  const roleLabel = (value: unknown, isOwner = false): CompanyRole => { const role = String(value || '').toLowerCase(); return isOwner ? 'Company Owner' : role === 'manager' || role === 'company' ? 'Manager' : role === 'dispatcher' ? 'Dispatcher' : role === 'customs_officer' ? 'Customs Officer' : role === 'finance' ? 'Finance' : 'Driver'; };
  const members = useMemo<Member[]>(() => [
    ...memberships.items.filter((row) => !companyId || Number(row.company_id) === companyId).map((row) => { const member = (row.user || {}) as Record<string, unknown>; const memberRole = (member.role || {}) as Record<string, unknown>; const company = (row.company || {}) as Record<string, unknown>; const isOwner = Number(company.owner_user_id) === Number(member.id); return { id: `m-${row.id}`, databaseId: Number(row.id), name: String(member.name || '—'), email: String(member.email || ''), role: roleLabel(memberRole.name, isOwner), isOwner, status: 'Active' as const, source: 'membership' as const }; }),
    ...invitations.items.filter((row) => (!companyId || Number(row.company_id) === companyId) && String(row.status).toLowerCase() === 'pending').map((row) => ({ id: `i-${row.id}`, databaseId: Number(row.id), name: String(row.email || '').split('@')[0], email: String(row.email || ''), role: roleLabel(((row.role || {}) as Record<string, unknown>).name), isOwner: false, status: 'Invited' as const, source: 'invitation' as const })),
  ].sort((left, right) => Number(right.isOwner) - Number(left.isOwner)), [memberships.items, invitations.items, companyId]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CompanyRole>('Driver');
  const [teamSection, setTeamSection] = useState<'members' | 'statistics' | 'roles' | 'invite'>('members');
  const [message, setMessage] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<Record<string, unknown>[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const roleData = useMemo(() => (Object.keys(ROLE_PERMISSIONS) as CompanyRole[]).map((name) => ({ name: displayRole(name), value: members.filter((member) => member.role === name).length })), [members, carrierLabel]);
  const statusData = [
    { name: 'Active', value: members.filter((member) => member.status === 'Active').length },
    { name: 'Invited', value: members.filter((member) => member.status === 'Invited').length },
  ];
  const chartTooltip = { borderRadius: '12px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '12px' };

  useEffect(() => {
    if (teamSection !== 'invite') return undefined;
    const query = userSearch.trim();
    if (query.length < 2) {
      setAvailableUsers([]);
      setSearchingUsers(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setSearchingUsers(true);
      void api.companyInvitations.availableUsers({ search: query, limit: 10 })
        .then((response) => setAvailableUsers(Array.isArray(response.data) ? response.data : []))
        .finally(() => setSearchingUsers(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [teamSection, userSearch]);

  const invite = async () => {
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) { setMessage('Enter a valid email address.'); return; }
    if (!companyId || !user) { setMessage('No company is connected to this account.'); return; }
    if (members.some((member) => member.email.toLowerCase() === trimmed.toLowerCase())) { setMessage('This person is already part of the company.'); return; }
    const globalRoleName = role === 'Customs Officer' ? 'customs_officer' : role.toLowerCase();
    const selectedRole = roles.items.find((item) => item.name === globalRoleName);
    if (!selectedRole) { setMessage('Selected role is unavailable.'); return; }
    const confirmed = await confirmAction({ title: 'Invite this team member?', text: `${trimmed} will be invited as ${displayRole(role)}.`, confirmText: 'Send invite' });
    if (!confirmed) return;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    await api.companyInvitations.create({ company_id: companyId, role_id: Number(selectedRole.id), invited_by_user_id: user.id, email: trimmed, token, status: 'pending', expires_at: new Date(Date.now() + 7 * 86400000).toISOString() });
    await invitations.refresh();
    setEmail('');
    setUserSearch('');
    setAvailableUsers([]);
    setMessage('Invitation saved successfully.');
    void showSuccess('Invitation created', `${trimmed} was invited as ${displayRole(role)}.`);
  };

  const updateMemberRole = async (member: Member, nextRole: string) => {
    if (member.source !== 'membership' || member.isOwner) return;
    const selectedName = nextRole === 'Customs Officer' ? 'customs_officer' : nextRole.toLowerCase();
    const selectedRole = roles.items.find((item) => item.name === selectedName);
    if (!selectedRole) return;
    await api.companyMemberships.update(member.databaseId, { role_id: Number(selectedRole.id) });
    await memberships.refresh();
  };

  return (
    <div className="space-y-3">
      <PageHeader
        icon={Users}
        tone="violet"
        title="Team & Permissions"
        subtitle="Invite people by email, assign a company role, and understand exactly what each role can access."
        actions={(
          <div className="inline-flex items-center rounded-full border border-sky-200/80 bg-sky-50/70 p-1 dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setTeamSection('members')}
              className={cn(
                'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95',
                teamSection === 'members' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500 hover:text-primary dark:text-slate-300',
              )}
            >
              <Users className="h-4 w-4" />
              {u('team.tabs.members', 'Members')}
            </button>
            <button
              type="button"
              onClick={() => setTeamSection('statistics')}
              className={cn(
                'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95',
                teamSection === 'statistics' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500 hover:text-primary dark:text-slate-300',
              )}
            >
              <BarChart3 className="h-4 w-4" />
              {u('team.tabs.statistics', 'Statistics')}
            </button>
            <button
              type="button"
              onClick={() => setTeamSection('roles')}
              className={cn(
                'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95',
                teamSection === 'roles' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500 hover:text-primary dark:text-slate-300',
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              {u('team.tabs.roles', 'Roles')}
            </button>
            <button
              type="button"
              onClick={() => setTeamSection('invite')}
              className={cn(
                'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95',
                teamSection === 'invite' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500 hover:text-primary dark:text-slate-300',
              )}
            >
              <MailPlus className="h-4 w-4" />
              {u('team.tabs.invite', 'Invite')}
            </button>
          </div>
        )}
        stats={[
          { label: 'People & invitations', value: members.length, icon: Users, tone: 'bg-violet-500/10 text-violet-500' },
          { label: 'Active members', value: statusData[0].value, icon: UserCheck, tone: 'bg-emerald-500/10 text-emerald-500' },
          { label: 'Pending invitations', value: statusData[1].value, icon: Clock3, tone: 'bg-amber-500/10 text-amber-500' },
          { label: 'Managers', value: members.filter((member) => member.role === 'Manager').length, icon: Crown, tone: 'bg-primary/10 text-primary' },
        ]}
      />

      <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={teamSection}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-3"
      >
      {teamSection === 'invite' && <Card>
        <div className="flex items-center gap-2"><MailPlus className="h-5 w-5 text-primary" /><p className="text-lg font-black text-slate-900 dark:text-white">Invite a team member</p></div>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div>
            <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setMessage(''); }} onKeyDown={(event) => { if (event.key === 'Enter') invite(); }} placeholder="teammate@company.com" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <div className="my-4 flex items-center gap-3"><div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{u('team.invite.orFindUser', 'Or find an existing user')}</span><div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /></div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder={u('team.invite.searchPlaceholder', 'Search name, email or username...')} className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              {searchingUsers && <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-primary" />}
            </div>
          </div>
          <div className="flex flex-col justify-center gap-3 border-slate-100 dark:border-slate-800 lg:border-l lg:pl-5">
            <IconSelect value={role} onChange={(value) => setRole(value as CompanyRole)} options={assignableRoleOptions} placeholder="Role" ariaLabel="Role for invited team member" icon={UserRoundCog} className="w-full [&_button]:h-11 [&_button]:rounded-xl [&_button]:text-sm" />
            <Button onClick={invite} className="h-11 w-full gap-2"><Send className="h-4 w-4" /> Send invite</Button>
          </div>
        </div>
        {message && <p className="mt-3 text-xs font-bold text-primary">{message}</p>}
        {userSearch.trim().length >= 2 && !searchingUsers && availableUsers.length === 0 && <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500 dark:border-slate-700">{u('team.invite.noUsers', 'No unassigned users found.')}</p>}
        {availableUsers.length > 0 && <div className="mt-3 grid gap-2 md:grid-cols-2">
          {availableUsers.map((candidate) => {
            const candidateRole = (candidate.role || {}) as Record<string, unknown>;
            const candidateRoleLabel = String(candidateRole.label || candidateRole.name || 'User');
            return (
              <button key={String(candidate.id)} type="button" onClick={() => { setEmail(String(candidate.email || '')); setUserSearch(''); setAvailableUsers([]); setMessage(''); }} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-primary/40">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserCheck className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900 dark:text-white">{String(candidate.name || candidate.username || 'User')}</p><p className="truncate text-xs text-slate-500">{String(candidate.email || '')}</p></div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{candidateRoleLabel}</span>
              </button>
            );
          })}
        </div>}
      </Card>}

      {teamSection === 'statistics' && <section className="grid gap-3 xl:grid-cols-12">
        <Card className="shadow-none xl:col-span-7" contentClassName="p-4">
          <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-500" /><div><p className="text-sm font-black dark:text-white">Role distribution</p><p className="text-[11px] text-slate-500">Active members and invitations across company responsibilities</p></div></div>
          <div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={roleData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip cursor={false} contentStyle={chartTooltip} /><Bar dataKey="value" name="People" fill="#8b5cf6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card className="shadow-none xl:col-span-5" contentClassName="p-4">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /><div><p className="text-sm font-black dark:text-white">Team access state</p><p className="text-[11px] text-slate-500">Accepted access compared with outstanding invitations</p></div></div>
          <div className="mt-2 h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3}><Cell fill="#10b981" /><Cell fill="#f59e0b" /></Pie><Tooltip contentStyle={chartTooltip} itemStyle={{ color: '#e2e8f0' }} labelStyle={{ color: '#e2e8f0' }} /><Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} /></PieChart></ResponsiveContainer></div>
        </Card>
      </section>}

      {teamSection === 'members' && <div className="grid gap-3">
        <Card>
          <div className="flex items-center justify-between"><div><p className="text-lg font-black dark:text-white">Company members</p><p className="text-sm text-slate-500">{members.length} people and pending invitations</p></div><span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">{members.filter((item) => item.status === 'Active').length} active</span></div>
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((member) => {
              const visual = ROLE_VISUALS[member.role];
              const MemberRoleIcon = visual.icon;
              return <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3"><div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', visual.tone)}><MemberRoleIcon className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900 dark:text-white">{member.name}</p><p className="truncate text-xs text-slate-500">{member.email}</p></div></div>
                <div className="flex items-center gap-2">
                  <IconSelect disabled={member.isOwner} value={member.role} onChange={(value) => void updateMemberRole(member, value)} options={member.isOwner ? roleOptions : assignableRoleOptions} placeholder="Role" ariaLabel={`Role for ${member.name}`} icon={UserRoundCog} className="w-44 [&_button]:h-8 [&_button:disabled]:cursor-not-allowed" />
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', member.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600')}>{member.status}</span>
                </div>
              </div>;
            })}
          </div>
        </Card>
      </div>}

      {teamSection === 'roles' && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(Object.entries(ROLE_PERMISSIONS) as [CompanyRole, string[]][]).map(([roleName, permissions]) => {
          const visual = ROLE_VISUALS[roleName];
          const RoleIcon = visual.icon;
          return <Card key={roleName} className={cn('shadow-none', visual.shell)} contentClassName="p-5">
            <div className="flex items-center gap-3"><div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', visual.tone)}><RoleIcon className="h-5 w-5" /></div><div><p className="font-black text-slate-900 dark:text-white">{displayRole(roleName)}</p><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{permissions.length} permissions</p></div></div>
            <div className="mt-4 grid gap-2">{permissions.map((permission) => <p key={permission} className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-950/50 dark:text-slate-300"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />{permission}</p>)}</div>
          </Card>;
        })}
      </div>}
      </motion.div>
      </AnimatePresence>
    </div>
  );
};
