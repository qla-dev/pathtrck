import { useMemo, useState } from "react";
import {
  CircleCheckBig,
  Eye,
  Globe2,
  Mail,
  Star,
  UserRound,
  UsersRound,
} from "lucide-react";
import { ApiError, api } from "../../services/api";
import { Language, Role, type UserSubscription } from "../../types";
import { ui } from "../../i18n";
import { AdminField, AdminFormModal, adminFieldClass } from "./AdminFormModal";
import { useApiList } from "../../hooks/useApiList";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import { Card } from "../ui/Card";
import { ServerDataTable, ServerDataTableColumn } from "../ui/ServerDataTable";
import { confirmAction, showSuccess } from "../../lib/swal";
import { ProfileModal } from "./ProfileModal";
import { AdminSubscriptionButton, AdminSubscriptionModal, LenaTokenCount, type AdminSubscriptionTarget } from "./AdminSubscriptionModal";

const initial = {
  name: "",
  email: "",
  username: "",
  password: "",
  phone: "",
  country_code: "BA",
  language: "bs",
};

export const AdminCustomersView = ({
  lang,
  role,
  onOpenEmailStudio,
}: {
  lang: Language;
  role: Role;
  onOpenEmailStudio?: () => void;
}) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const canManage = role === "superadmin" || role === "master";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(
    null,
  );
  const [subscriptionTarget, setSubscriptionTarget] = useState<AdminSubscriptionTarget | null>(null);
  const customers = useApiList(api.customers.list, { limit: 500, pageno: 1 });
  const columns = useMemo<ServerDataTableColumn<Record<string, unknown>>[]>(
    () => [
      {
        key: "number",
        header: "#",
        render: (_row, index) => index + 1,
        exportValue: (_row, index) => index + 1,
      },
      {
        key: "customer",
        header: "Customer",
        render: (row) => (
          <>
            <p className="font-bold dark:text-white">
              {String(row.name || row.company_name || "—")}
            </p>
            <p className="text-xs text-slate-500">
              {String(row.email || row.billing_email || "")}
            </p>
          </>
        ),
        exportValue: (row) =>
          `${String(row.name || row.company_name || "")} <${String(row.email || row.billing_email || "")}>`,
      },
      {
        key: "tax_number",
        header: "Tax number",
        render: (row) => String(row.tax_number || "—"),
        exportValue: (row) => String(row.tax_number || ""),
      },
      {
        key: "country",
        header: "Country",
        render: (row) => String(row.country_code || "—"),
        exportValue: (row) => String(row.country_code || ""),
      },
      ...(canManage ? [{
        key: "joined",
        header: "Joined",
        render: (row) => (
          <span className="text-sm text-slate-500">
            {String(row.created_at || "").slice(0, 10)}
          </span>
        ),
        exportValue: (row) => String(row.created_at || "").slice(0, 10),
      } satisfies ServerDataTableColumn<Record<string, unknown>>] : []),
      {
        key: "rating",
        header: "Rating",
        render: (row) => (
          <span className="inline-flex items-center gap-1 font-bold">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {Number(row.rating || row.average_rating || 0).toFixed(1)}
          </span>
        ),
        exportValue: (row) => Number(row.rating || row.average_rating || 0).toFixed(1),
      },
      ...(canManage ? [{
        key: "lena_ai",
        header: "LenaAI",
        render: (row) => {
          const user = (row.user || {}) as Record<string, unknown>;
          return <LenaTokenCount subscription={(user.subscription || null) as UserSubscription | null} />;
        },
        exportValue: (row) => {
          const user = (row.user || {}) as Record<string, unknown>;
          return Number(((user.subscription || null) as UserSubscription | null)?.remaining_tokens || 0);
        },
      } satisfies ServerDataTableColumn<Record<string, unknown>>] : []),
      ...(canManage ? [{
        key: "status",
        header: "Status",
        render: (row) => (
          <span
            className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-bold ${row.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}
          >
            {row.is_active ? "Active" : "Not authorized"}
          </span>
        ),
        exportValue: (row) => (row.is_active ? "Active" : "Not authorized"),
      } satisfies ServerDataTableColumn<Record<string, unknown>>] : []),
      {
        key: "actions",
        header: u('Action', 'Action'),
        className: "text-right",
        exportable: false,
        render: (row) => {
          const user = (row.user || {}) as Record<string, unknown>;
          const userId = Number(row.user_id || user.id || 0);
          return (
            <div className="flex items-center justify-end gap-2">
              {canManage && <AdminSubscriptionButton disabled={!userId} ariaLabel={userId ? `${u('adminSubscription.open', 'Edit subscription')}: ${String(row.name || row.company_name || '')}` : u('adminSubscription.noAccount', 'No user account available')} onClick={() => userId && setSubscriptionTarget({ userId, name: String(row.name || row.company_name || user.name || ''), subscription: (user.subscription || null) as UserSubscription | null })} />}
              <button type="button" onClick={() => setSelected(row)} aria-label="Open customer profile" className="cursor-pointer rounded-lg bg-slate-100 p-2 transition hover:text-primary dark:bg-slate-800"><Eye className="h-4 w-4" /></button>
            </div>
          );
        },
      },
    ],
    [canManage, lang],
  );
  const field = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    const confirmed = await confirmAction({
      title: "Create this customer?",
      text: form.password
        ? `A login will be created for ${form.name || form.email}.`
        : "The customer will be saved without login access.",
      confirmText: "Create customer",
    });
    if (!confirmed) return;
    setSubmitting(true);
    setError("");
    try {
      await api.customers.create(form);
      await customers.refresh();
      setTableRefreshKey((current) => current + 1);
      setOpen(false);
      setForm(initial);
      void showSuccess(
        "Customer created",
        form.password
          ? "The customer can now sign in."
          : "The customer was saved without login access.",
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
            : "Customer could not be created."),
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <div className="space-y-3">
        <PageHeader
          icon={UserRound}
          title="Customers"
          subtitle="Manage customer accounts, access, load activity and contact information."
          actions={canManage ? (
            <>
              <Button variant="outline" onClick={onOpenEmailStudio}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
              <Button onClick={() => setOpen(true)}>Add customer</Button>
            </>
          ) : undefined}
          stats={[
            {
              label: "Total customers",
              value: customers.total,
              icon: UsersRound,
              tone: "bg-sky-500/10 text-sky-500",
            },
            {
              label: "Authorized",
              value: customers.items.filter((row) => row.is_active).length,
              icon: CircleCheckBig,
              tone: "bg-emerald-500/10 text-emerald-500",
            },
            {
              label: "Countries",
              value: new Set(
                customers.items.map((row) => row.country_code).filter(Boolean),
              ).size,
              icon: Globe2,
              tone: "bg-violet-500/10 text-violet-500",
            },
          ]}
        />
        <Card className="shadow-none" contentClassName="p-0">
          <ServerDataTable
            edgeToEdge
            title="Customers"
            request={api.customers.list}
            columns={columns}
            refreshKey={tableRefreshKey}
            initialPageSize={50}
            emptyMessage="No customers found."
          />
        </Card>
      </div>
      <ProfileModal
        open={selected !== null}
        kind="customer"
        record={selected}
        role={role}
        lang={lang}
        onClose={() => setSelected(null)}
        onAuthorized={(customer) => {
          setSelected(customer);
          void customers.refresh();
          setTableRefreshKey((current) => current + 1);
        }}
      />
      <AdminSubscriptionModal
        open={subscriptionTarget !== null}
        target={subscriptionTarget}
        lang={lang}
        onClose={() => setSubscriptionTarget(null)}
        onSaved={() => {
          void customers.refresh();
          setTableRefreshKey((current) => current + 1);
          void showSuccess(u('adminSubscription.updated', 'Subscription updated'), u('adminSubscription.updatedText', 'The package, expiration and LenaAI tokens were saved.'));
        }}
      />
      <AdminFormModal
        open={open}
        title="Add customer"
        description="Create a standalone customer. Add login details only when account access is needed."
        submitting={submitting}
        error={error}
        onClose={() => {
          setOpen(false);
          setError("");
        }}
        onSubmit={() => void save()}
      >
        <AdminField label="Full name">
          <input
            required
            value={form.name}
            onChange={(event) => field("name", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Email (optional)">
          <input
            type="email"
            value={form.email}
            onChange={(event) => field("email", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Username (required for login)">
          <input
            value={form.username}
            onChange={(event) => field("username", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Password (enables login)">
          <input
            minLength={8}
            type="password"
            value={form.password}
            onChange={(event) => field("password", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Phone">
          <input
            value={form.phone}
            onChange={(event) => field("phone", event.target.value)}
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
        <AdminField label="Language">
          <input
            maxLength={5}
            value={form.language}
            onChange={(event) => field("language", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
      </AdminFormModal>
    </>
  );
};
