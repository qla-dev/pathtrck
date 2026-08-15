import { useMemo, useState } from "react";
import { CircleCheckBig, Eye, Globe2, Mail, UserRound, UsersRound } from "lucide-react";
import { ApiError, api } from "../../services/api";
import { Language } from "../../types";
import { AdminField, AdminFormModal, adminFieldClass } from "./AdminFormModal";
import { useApiList } from "../../hooks/useApiList";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ServerDataTable, ServerDataTableColumn } from "../ui/ServerDataTable";
import { confirmAction, showSuccess } from "../../lib/swal";
import { CustomerDetails } from "../customer/CustomerDetails";

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
  lang: _lang,
  onOpenEmailStudio,
}: {
  lang: Language;
  onOpenEmailStudio?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(
    null,
  );
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
      {
        key: "joined",
        header: "Joined",
        render: (row) => (
          <span className="text-sm text-slate-500">
            {String(row.created_at || "").slice(0, 10)}
          </span>
        ),
        exportValue: (row) => String(row.created_at || "").slice(0, 10),
      },
      {
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
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        exportable: false,
        render: (row) => (
          <button
            onClick={() => setSelected(row)}
            className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800"
          >
            <Eye className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [],
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
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black dark:text-white">
                  Customers
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Manage customer accounts, access, load activity and contact
                  information.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onOpenEmailStudio}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
              <Button onClick={() => setOpen(true)}>Add customer</Button>
            </div>
          </div>
        </section>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="shadow-none" contentClassName="flex items-center justify-between gap-3 px-5 py-3">
            <div><p className="text-xs uppercase text-slate-500">Total customers</p><p className="mt-1 text-2xl font-black dark:text-white">{customers.total}</p></div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500"><UsersRound className="h-6 w-6" /></div>
          </Card>
          <Card className="shadow-none" contentClassName="flex items-center justify-between gap-3 px-5 py-3">
            <div><p className="text-xs uppercase text-slate-500">Authorized</p><p className="mt-1 text-2xl font-black text-emerald-500">{customers.items.filter((row) => row.is_active).length}</p></div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500"><CircleCheckBig className="h-6 w-6" /></div>
          </Card>
          <Card className="shadow-none" contentClassName="flex items-center justify-between gap-3 px-5 py-3">
            <div><p className="text-xs uppercase text-slate-500">Countries</p><p className="mt-1 text-2xl font-black text-violet-500">
              {
                new Set(
                  customers.items
                    .map((row) => row.country_code)
                    .filter(Boolean),
                ).size
              }
            </p></div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500"><Globe2 className="h-6 w-6" /></div>
          </Card>
        </div>
        <Card className="shadow-none">
          <ServerDataTable
            title="Customers"
            request={api.customers.list}
            columns={columns}
            refreshKey={tableRefreshKey}
            initialPageSize={50}
            emptyMessage="No customers found."
          />
        </Card>
      </div>
      <CustomerDetails
        open={selected !== null}
        customer={selected}
        onClose={() => setSelected(null)}
        onAuthorized={(customer) => {
          setSelected(customer);
          void customers.refresh();
          setTableRefreshKey((current) => current + 1);
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
