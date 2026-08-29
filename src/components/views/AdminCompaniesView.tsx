import { useMemo, useState } from "react";
import { BadgeCheck, Ban, Building2, Clock3, Crown, Eye, Loader2, Mail, Star } from "lucide-react";
import { ApiError, api } from "../../services/api";
import { Language, Role, type UserSubscription } from "../../types";
import { ui } from "../../i18n";
import { AdminField, AdminFormModal, adminFieldClass } from "./AdminFormModal";
import { useApiList } from "../../hooks/useApiList";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import { Card } from "../ui/Card";
import { confirmAction, showError, showSuccess } from "../../lib/swal";
import { ProfileModal } from "./ProfileModal";
import { ServerDataTable, type ServerDataTableColumn } from "../ui/ServerDataTable";
import { IconSelect } from "../ui/IconSelect";
import { AdminSubscriptionButton, AdminSubscriptionModal, LenaTokenCount, type AdminSubscriptionTarget } from "./AdminSubscriptionModal";

type CompanyStatus = "pending" | "verified" | "suspended";

const initial = {
  company_name: "",
  company_email: "",
  company_phone: "",
  country_code: "BA",
  city: "",
  address: "",
  tax_number: "",
  registration_number: "",
  plan: "starter",
  status: "pending",
  owner_name: "",
  owner_email: "",
  owner_username: "",
  owner_password: "",
  owner_phone: "",
};

export const AdminCompaniesView = ({
  lang,
  role,
  onOpenEmailStudio,
}: {
  lang: Language;
  role: Role;
  onOpenEmailStudio?: () => void;
}) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const canManageSubscriptions = role === "superadmin" || role === "master";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(
    null,
  );
  const [subscriptionTarget, setSubscriptionTarget] = useState<AdminSubscriptionTarget | null>(null);
  const companies = useApiList(api.companies.list, {
    per_page: 100,
    warehouse_first: false,
  });
  const updateStatus = async (row: Record<string, unknown>, status: CompanyStatus) => {
    if (String(row.status || "pending") === status) return;
    const confirmed = await confirmAction({ title: `Change status to ${status}?`, text: `${String(row.name || "This company")} will be updated immediately.`, confirmText: "Change status" });
    if (!confirmed) return;
    const id = String(row.id);
    setStatusSavingId(id);
    try {
      await api.companies.update(id, { status, verified_at: status === "verified" ? new Date().toISOString() : null });
      await companies.refresh();
      setTableRefreshKey((current) => current + 1);
      void showSuccess("Company status updated", `${String(row.name || "Company")} is now ${status}.`);
    } catch (caught) {
      void showError("Company status could not be updated", caught instanceof Error ? caught.message : undefined);
    } finally {
      setStatusSavingId(null);
    }
  };
  const columns = useMemo<ServerDataTableColumn<Record<string, unknown>>[]>(() => [
    { key: "company", header: "Company", render: (row) => <><p className="font-bold dark:text-white">{String(row.name || "—")}</p><p className="text-xs text-slate-500">{String(row.country_code || "—")} · {String(row.email || "—")}</p></> },
    { key: "owner", header: "Owner", render: (row) => String(((row.owner || {}) as Record<string, unknown>).name || "—") },
    { key: "plan", header: "Plan", render: (row) => <span className="font-bold text-violet-500">{String(row.plan || "—")}</span> },
    { key: "fleet", header: "Fleet", render: (row) => Array.isArray(row.vehicles) ? row.vehicles.length : 0 },
    { key: "members", header: "Members", render: (row) => Array.isArray(row.users) ? row.users.length : 0 },
    { key: "rating", header: "Rating", render: (row) => <span className="inline-flex items-center gap-1 font-bold"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{Number(row.rating || row.average_rating || 0).toFixed(1)}</span>, exportValue: (row) => Number(row.rating || row.average_rating || 0).toFixed(1) },
    ...(canManageSubscriptions ? [{ key: "lena_ai", header: "LenaAI", render: (row) => { const owner = (row.owner || {}) as Record<string, unknown>; return <LenaTokenCount subscription={(owner.subscription || null) as UserSubscription | null} />; }, exportValue: (row) => { const owner = (row.owner || {}) as Record<string, unknown>; const subscription = (owner.subscription || null) as UserSubscription | null; return Number(subscription?.remaining_tokens || 0); } } satisfies ServerDataTableColumn<Record<string, unknown>>] : []),
    { key: "status", header: "Status", render: (row) => { const status = String(row.status || "pending") as CompanyStatus; const saving = statusSavingId === String(row.id); return <div className="relative w-40">{saving && <Loader2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-primary" />}<IconSelect value={status} disabled={saving} onChange={(next) => void updateStatus(row, next as CompanyStatus)} placeholder="Status" ariaLabel={`Change status for ${String(row.name || "company")}`} icon={Clock3} className={saving ? "[&_button]:pl-9" : undefined} options={[{ value: "pending", label: "Pending", icon: Clock3 }, { value: "verified", label: "Verified", icon: BadgeCheck }, { value: "suspended", label: "Suspended", icon: Ban }]} /></div>; } },
    { key: "actions", header: "", className: "text-right", exportable: false, render: (row) => { const owner = (row.owner || {}) as Record<string, unknown>; const userId = Number(row.owner_user_id || owner.id || 0); return <div className="flex items-center justify-end gap-2">{canManageSubscriptions && <AdminSubscriptionButton disabled={!userId} label={u('adminSubscription.shortAction', 'Sub')} ariaLabel={userId ? `${u('adminSubscription.open', 'Edit subscription')}: ${String(row.name || '')}` : u('adminSubscription.noAccount', 'No user account available')} onClick={() => userId && setSubscriptionTarget({ userId, name: String(row.name || owner.name || ''), subscription: (owner.subscription || null) as UserSubscription | null })} />}<button type="button" aria-label="Open company profile" onClick={() => setSelected(row)} className="cursor-pointer rounded-lg bg-slate-100 p-2 transition hover:text-primary dark:bg-slate-800"><Eye className="h-4 w-4" /></button></div>; } },
  ], [canManageSubscriptions, statusSavingId, lang]);
  const field = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    const confirmed = await confirmAction({
      title: "Create this company?",
      text: `The company and owner login for ${form.company_name || form.owner_email} will be created together.`,
      confirmText: "Create company",
    });
    if (!confirmed) return;
    setSubmitting(true);
    setError("");
    try {
      await api.companies.onboard(form);
      await companies.refresh();
      setTableRefreshKey((current) => current + 1);
      setOpen(false);
      setForm(initial);
      void showSuccess(
        "Company created",
        "The company and owner account are ready.",
      );
    } catch (caught) {
      const validation =
        caught instanceof ApiError
          ? Object.values(caught.errors).flat()[0]
          : null;
      setError(
        validation ||
          (caught instanceof Error
            ? caught.message
            : "Company could not be created."),
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <div className="space-y-3">
        <PageHeader
          icon={Building2}
          tone="violet"
          title="Logistics Companies"
          subtitle="Inspect every logistics company, owner, subscription, fleet and verification state."
          actions={
            <>
              <Button variant="outline" onClick={onOpenEmailStudio}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
              <Button onClick={() => setOpen(true)}>Add company</Button>
            </>
          }
          stats={[
            {
              label: "Total companies",
              value: companies.total,
              icon: Building2,
              tone: "bg-violet-500/10 text-violet-500",
            },
            {
              label: "Pending verification",
              value: companies.items.filter((row) => row.status === "pending")
                .length,
              icon: Clock3,
              tone: "bg-amber-500/10 text-amber-500",
            },
            {
              label: "Enterprise accounts",
              value: companies.items.filter((row) => row.plan === "enterprise")
                .length,
              icon: Crown,
              tone: "bg-violet-500/10 text-violet-500",
            },
          ]}
        />
        <Card className="shadow-none" contentClassName="p-0"><ServerDataTable edgeToEdge title="Logistics companies" request={api.companies.list} params={{ warehouse_first: false }} columns={columns} refreshKey={tableRefreshKey} initialPageSize={50} emptyMessage="No companies found." /></Card>
      </div>
      <ProfileModal open={selected !== null} kind="company" record={selected} role={role} lang={lang} onClose={() => setSelected(null)} />
      <AdminSubscriptionModal open={subscriptionTarget !== null} target={subscriptionTarget} lang={lang} onClose={() => setSubscriptionTarget(null)} onSaved={() => { void companies.refresh(); setTableRefreshKey((current) => current + 1); void showSuccess(u('adminSubscription.updated', 'Subscription updated'), u('adminSubscription.updatedText', 'The package, expiration and LenaAI tokens were saved.')); }} />
      <AdminFormModal
        open={open}
        title="Add logistics company"
        description="Create the company, owner login and active admin membership together."
        submitting={submitting}
        error={error}
        onClose={() => {
          setOpen(false);
          setError("");
        }}
        onSubmit={() => void save()}
      >
        <div className="sm:col-span-2">
          <p className="font-black text-slate-900 dark:text-white">
            Company information
          </p>
        </div>
        <AdminField label="Company name">
          <input
            required
            value={form.company_name}
            onChange={(event) => field("company_name", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Company email">
          <input
            type="email"
            value={form.company_email}
            onChange={(event) => field("company_email", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Company phone">
          <input
            value={form.company_phone}
            onChange={(event) => field("company_phone", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Country code">
          <input
            required
            maxLength={2}
            value={form.country_code}
            onChange={(event) =>
              field("country_code", event.target.value.toUpperCase())
            }
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="City">
          <input
            value={form.city}
            onChange={(event) => field("city", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Address">
          <input
            value={form.address}
            onChange={(event) => field("address", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Tax number">
          <input
            value={form.tax_number}
            onChange={(event) => field("tax_number", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Registration number">
          <input
            value={form.registration_number}
            onChange={(event) =>
              field("registration_number", event.target.value)
            }
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Plan">
          <select
            value={form.plan}
            onChange={(event) => field("plan", event.target.value)}
            className={adminFieldClass}
          >
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </AdminField>
        <AdminField label="Status">
          <select
            value={form.status}
            onChange={(event) => field("status", event.target.value)}
            className={adminFieldClass}
          >
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="suspended">Suspended</option>
          </select>
        </AdminField>
        <div className="mt-2 border-t border-slate-200 pt-4 sm:col-span-2 dark:border-slate-800">
          <p className="font-black text-slate-900 dark:text-white">
            Company owner login
          </p>
        </div>
        <AdminField label="Owner name">
          <input
            required
            value={form.owner_name}
            onChange={(event) => field("owner_name", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Owner email">
          <input
            required
            type="email"
            value={form.owner_email}
            onChange={(event) => field("owner_email", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Owner username">
          <input
            required
            value={form.owner_username}
            onChange={(event) => field("owner_username", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Temporary password">
          <input
            required
            minLength={8}
            type="password"
            value={form.owner_password}
            onChange={(event) => field("owner_password", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Owner phone">
          <input
            value={form.owner_phone}
            onChange={(event) => field("owner_phone", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
      </AdminFormModal>
    </>
  );
};
