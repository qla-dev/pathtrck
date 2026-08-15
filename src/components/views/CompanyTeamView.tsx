import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MailPlus, Send, ShieldCheck, UserRoundCog, Users } from 'lucide-react';

import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ApiUser, api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { confirmAction, showSuccess } from '../../lib/swal';

type CompanyRole = 'Company Admin' | 'Dispatcher' | 'Driver' | 'Finance';
type Member = { id: string; databaseId: number; name: string; email: string; role: CompanyRole; status: 'Active' | 'Invited'; source: 'membership' | 'invitation' };

const ROLE_PERMISSIONS: Record<CompanyRole, string[]> = {
  'Company Admin': ['Manage fleet sharing', 'Invite and remove users', 'Assign all roles', 'View all company data'],
  Dispatcher: ['Assign loads and vehicles', 'Message drivers', 'View live fleet', 'Update route status'],
  Driver: ['View assigned loads', 'Update delivery status', 'Add route notes', 'Message dispatch'],
  Finance: ['View invoices and payouts', 'Export finance records', 'Approve payouts', 'No fleet editing'],
};

export const CompanyTeamView = ({ lang: _lang }: { lang: Language }) => {
  const memberships = useApiList(api.companyMemberships.list, { per_page: 100 });
  const invitations = useApiList(api.companyInvitations.list, { per_page: 100 });
  const roles = useApiList(api.roles.list, { per_page: 100 });
  const [user, setUser] = useState<ApiUser | null>(null);
  useEffect(() => { void api.auth.me().then(setUser); }, []);
  const companyId = Number((user?.companies?.[0] as Record<string, unknown> | undefined)?.id || 0);
  const roleLabel = (value: unknown): CompanyRole => { const role = String(value || '').toLowerCase(); return role === 'admin' || role === 'company' ? 'Company Admin' : role === 'dispatcher' ? 'Dispatcher' : role === 'finance' ? 'Finance' : 'Driver'; };
  const members = useMemo<Member[]>(() => [
    ...memberships.items.filter((row) => !companyId || Number(row.company_id) === companyId).map((row) => { const member = (row.user || {}) as Record<string, unknown>; return { id: `m-${row.id}`, databaseId: Number(row.id), name: String(member.name || '—'), email: String(member.email || ''), role: roleLabel(row.company_role), status: 'Active' as const, source: 'membership' as const }; }),
    ...invitations.items.filter((row) => (!companyId || Number(row.company_id) === companyId) && String(row.status).toLowerCase() === 'pending').map((row) => ({ id: `i-${row.id}`, databaseId: Number(row.id), name: String(row.email || '').split('@')[0], email: String(row.email || ''), role: roleLabel(((row.role || {}) as Record<string, unknown>).name), status: 'Invited' as const, source: 'invitation' as const })),
  ], [memberships.items, invitations.items, companyId]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CompanyRole>('Driver');
  const [message, setMessage] = useState('');

  const invite = async () => {
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) { setMessage('Enter a valid email address.'); return; }
    if (!companyId || !user) { setMessage('No company is connected to this account.'); return; }
    if (members.some((member) => member.email.toLowerCase() === trimmed.toLowerCase())) { setMessage('This person is already part of the company.'); return; }
    const globalRoleName = role === 'Finance' ? 'finance' : role === 'Driver' ? 'driver' : 'company';
    const selectedRole = roles.items.find((item) => item.name === globalRoleName);
    if (!selectedRole) { setMessage('Selected role is unavailable.'); return; }
    const confirmed = await confirmAction({ title: 'Invite this team member?', text: `${trimmed} will be invited as ${role}.`, confirmText: 'Send invite' });
    if (!confirmed) return;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    await api.companyInvitations.create({ company_id: companyId, role_id: Number(selectedRole.id), invited_by_user_id: user.id, email: trimmed, token, status: 'pending', expires_at: new Date(Date.now() + 7 * 86400000).toISOString() });
    await invitations.refresh();
    setEmail('');
    setMessage('Invitation saved successfully.');
    void showSuccess('Invitation created', `${trimmed} was invited as ${role}.`);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500"><Users className="h-6 w-6" /></div>
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Company access</p><h1 className="text-2xl font-black text-slate-900 dark:text-white">Team & Permissions</h1></div>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-slate-500">Invite people by email, assign a company role, and understand exactly what each role can access.</p>
      </section>

      <Card>
        <div className="flex items-center gap-2"><MailPlus className="h-5 w-5 text-primary" /><p className="text-lg font-black text-slate-900 dark:text-white">Invite a team member</p></div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
          <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setMessage(''); }} onKeyDown={(event) => { if (event.key === 'Enter') invite(); }} placeholder="teammate@company.com" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <select value={role} onChange={(event) => setRole(event.target.value as CompanyRole)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            <option>Driver</option><option>Dispatcher</option><option>Finance</option><option>Company Admin</option>
          </select>
          <Button onClick={invite} className="h-11 gap-2"><Send className="h-4 w-4" /> Send invite</Button>
        </div>
        {message && <p className="mt-2 text-xs font-bold text-primary">{message}</p>}
      </Card>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <div className="flex items-center justify-between"><div><p className="text-lg font-black dark:text-white">Company members</p><p className="text-sm text-slate-500">{members.length} people and pending invitations</p></div><span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">{members.filter((item) => item.status === 'Active').length} active</span></div>
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800"><UserRoundCog className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900 dark:text-white">{member.name}</p><p className="truncate text-xs text-slate-500">{member.email}</p></div></div>
                <div className="flex items-center gap-2">
                  <select value={member.role} onChange={(event) => { if (member.source === 'membership') void api.companyMemberships.update(member.databaseId, { company_role: event.target.value === 'Company Admin' ? 'admin' : event.target.value.toLowerCase() }).then(() => memberships.refresh()); }} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option>Driver</option><option>Dispatcher</option><option>Finance</option><option>Company Admin</option></select>
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', member.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600')}>{member.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><p className="text-lg font-black dark:text-white">Role permission sets</p></div>
          <div className="mt-4 space-y-4">
            {(Object.entries(ROLE_PERMISSIONS) as [CompanyRole, string[]][]).map(([roleName, permissions]) => (
              <div key={roleName} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><p className="font-black text-slate-900 dark:text-white">{roleName}</p><div className="mt-2 grid gap-1.5">{permissions.map((permission) => <p key={permission} className="flex items-start gap-2 text-xs text-slate-500"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />{permission}</p>)}</div></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
