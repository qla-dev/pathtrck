import { useEffect, useMemo, useState } from "react";
import {
  CircleCheckBig,
  Ban,
  Clock3,
  Eye,
  MapPin,
  Loader2,
  Star,
  Truck,
  UserRoundSearch,
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
import { confirmAction, showError, showSuccess } from "../../lib/swal";
import { ProfileModal } from "./ProfileModal";
import { ServerDataTable, type ServerDataTableColumn } from "../ui/ServerDataTable";
import { IconSelect } from "../ui/IconSelect";
import { AdminSubscriptionButton, AdminSubscriptionModal, LenaTokenCount, type AdminSubscriptionTarget } from "./AdminSubscriptionModal";

type DriverStatus = "available" | "on_load" | "off_duty" | "unavailable";

const initial = {
  name: "",
  email: "",
  username: "",
  password: "",
  phone: "",
  country_code: "BA",
  language: "bs",
  primary_company_id: "",
  license_number: "",
  license_country_code: "BA",
  license_expires_at: "",
  availability_status: "available",
};

export const AdminDriversView = ({ lang, role }: { lang: Language; role: Role }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const canManageSubscriptions = role === "superadmin" || role === "master";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [companies, setCompanies] = useState<Record<string, unknown>[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [subscriptionTarget, setSubscriptionTarget] = useState<AdminSubscriptionTarget | null>(null);
  const drivers = useApiList(api.drivers.list, { per_page: 100 });
  const field = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (open && companies.length === 0)
      void api.companies
        .list({ per_page: 100 })
        .then((response) => setCompanies(response.data))
        .catch(() => setCompanies([]));
  }, [open, companies.length]);

  const updateStatus = async (row: Record<string, unknown>, status: DriverStatus) => {
    if (String(row.availability_status || "available") === status) return;
    const confirmed = await confirmAction({ title: `Change status to ${status.replace("_", " ")}?`, text: `${String(row.name || "This driver")}'s availability will be updated immediately.`, confirmText: "Change status" });
    if (!confirmed) return;
    const id = String(row.id);
    setStatusSavingId(id);
    try {
      await api.drivers.update(id, { availability_status: status });
      await drivers.refresh();
      setTableRefreshKey((current) => current + 1);
      void showSuccess("Driver status updated", `${String(row.name || "Driver")} is now ${status.replace("_", " ")}.`);
    } catch (caught) {
      void showError("Driver status could not be updated", caught instanceof Error ? caught.message : undefined);
    } finally {
      setStatusSavingId(null);
    }
  };

  const columns = useMemo<ServerDataTableColumn<Record<string, unknown>>[]>(() => [
    { key: "driver", header: "Driver", render: (row) => { const user = (row.user || {}) as Record<string, unknown>; return <><p className="font-bold dark:text-white">{String(row.name || user.name || "—")}</p><p className="text-xs text-slate-500">{String(row.email || user.email || "")}</p></>; } },
    { key: "company", header: "Company", render: (row) => String(((row.primary_company || {}) as Record<string, unknown>).name || "Independent") },
    { key: "license", header: "License", render: (row) => `${String(row.license_number || "—")} · ${String(row.license_country_code || "")}` },
    { key: "location", header: "Location", render: (row) => { const user = (row.user || {}) as Record<string, unknown>; const vehicles = Array.isArray(user.assigned_vehicles) ? user.assigned_vehicles as Array<Record<string, unknown>> : []; const location = (vehicles[0]?.locations as Array<Record<string, unknown>> | undefined)?.[0]?.location_name; return <span className="flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" />{String(location || "—")}</span>; } },
    { key: "rating", header: "Rating", render: (row) => <span className="flex items-center gap-1 font-bold"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{String(row.rating || 0)}</span> },
    ...(canManageSubscriptions ? [{ key: "lena_ai", header: "LenaAI", render: (row) => { const user = (row.user || {}) as Record<string, unknown>; return <LenaTokenCount subscription={(user.subscription || null) as UserSubscription | null} />; }, exportValue: (row) => { const user = (row.user || {}) as Record<string, unknown>; return Number(((user.subscription || null) as UserSubscription | null)?.remaining_tokens || 0); } } satisfies ServerDataTableColumn<Record<string, unknown>>] : []),
    { key: "trips", header: "Trips", render: (row) => <span className="flex items-center gap-1"><Truck className="h-4 w-4 text-primary" />{String(row.completed_trips || 0)}</span> },
    { key: "state", header: "State", render: (row) => { const status = String(row.availability_status || "available") as DriverStatus; const saving = statusSavingId === String(row.id); return <div className="relative w-40">{saving && <Loader2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-primary" />}<IconSelect value={status} disabled={saving} onChange={(next) => void updateStatus(row, next as DriverStatus)} placeholder="State" ariaLabel={`Change availability for ${String(row.name || "driver")}`} icon={CircleCheckBig} className={saving ? "[&_button]:pl-9" : undefined} options={[{ value: "available", label: "Available", icon: CircleCheckBig }, { value: "on_load", label: "On load", icon: Truck }, { value: "off_duty", label: "Off duty", icon: Clock3 }, { value: "unavailable", label: "Unavailable", icon: Ban }]} /></div>; } },
    { key: "actions", header: u('Action', 'Action'), className: "text-right", exportable: false, render: (row) => { const user = (row.user || {}) as Record<string, unknown>; const userId = Number(row.user_id || user.id || 0); return <div className="flex items-center justify-end gap-2">{canManageSubscriptions && <AdminSubscriptionButton disabled={!userId} ariaLabel={userId ? `${u('adminSubscription.open', 'Edit subscription')}: ${String(row.name || user.name || '')}` : u('adminSubscription.noAccount', 'No user account available')} onClick={() => userId && setSubscriptionTarget({ userId, name: String(row.name || user.name || ''), subscription: (user.subscription || null) as UserSubscription | null })} />}<button type="button" aria-label="Open driver profile" onClick={() => setSelected(row)} className="cursor-pointer rounded-lg bg-slate-100 p-2 transition hover:text-primary dark:bg-slate-800"><Eye className="h-4 w-4" /></button></div>; } },
  ], [canManageSubscriptions, statusSavingId, lang]);

  const save = async () => {
    const confirmed = await confirmAction({
      title: "Create this driver?",
      text: form.password
        ? `A login will be created for ${form.name || form.email}.`
        : "The driver will be saved without login access.",
      confirmText: "Create driver",
    });
    if (!confirmed) return;
    setSubmitting(true);
    setError("");
    try {
      await api.drivers.create(form);
      setOpen(false);
      setForm(initial);
      await drivers.refresh();
      setTableRefreshKey((current) => current + 1);
      void showSuccess(
        "Driver created",
        form.password
          ? "The driver account is ready."
          : "The driver was saved without login access.",
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
            : "Driver could not be created."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-3">
        <PageHeader
          icon={UserRoundSearch}
          title="Drivers"
          subtitle="Track drivers, companies, licenses, availability and completed trips."
          actions={<Button onClick={() => setOpen(true)}>Add driver</Button>}
          stats={[
            {
              label: "Verified drivers",
              value: drivers.total,
              icon: UsersRound,
              tone: "bg-sky-500/10 text-sky-500",
            },
            {
              label: "Available",
              value: drivers.items.filter(
                (row) => row.availability_status === "available",
              ).length,
              icon: CircleCheckBig,
              tone: "bg-emerald-500/10 text-emerald-500",
            },
            {
              label: "On load",
              value: drivers.items.filter(
                (row) => row.availability_status === "on_load",
              ).length,
              icon: Truck,
              tone: "bg-sky-500/10 text-sky-500",
            },
          ]}
        />
        <Card className="shadow-none" contentClassName="p-0"><ServerDataTable edgeToEdge title="Drivers" request={api.drivers.list} columns={columns} refreshKey={tableRefreshKey} initialPageSize={50} emptyMessage="No drivers found." /></Card>
      </div>
      <ProfileModal open={selected !== null} kind="driver" record={selected} role={role} lang={lang} onClose={() => setSelected(null)} />
      <AdminSubscriptionModal open={subscriptionTarget !== null} target={subscriptionTarget} lang={lang} onClose={() => setSubscriptionTarget(null)} onSaved={() => { void drivers.refresh(); setTableRefreshKey((current) => current + 1); void showSuccess(u('adminSubscription.updated', 'Subscription updated'), u('adminSubscription.updatedText', 'The package, expiration and LenaAI tokens were saved.')); }} />
      <AdminFormModal
        open={open}
        title="Add driver"
        description="Create a standalone driver. Add login details only when account access is needed."
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
            Driver details
          </p>
        </div>
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
        <AdminField label="Account country">
          <input
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
        <AdminField label="Company (optional)">
          <select
            value={form.primary_company_id}
            onChange={(event) =>
              field("primary_company_id", event.target.value)
            }
            className={adminFieldClass}
          >
            <option value="">Independent driver</option>
            {companies.map((company) => (
              <option key={String(company.id)} value={String(company.id)}>
                {String(company.name)}
              </option>
            ))}
          </select>
        </AdminField>
        <div className="mt-2 border-t border-slate-200 pt-4 sm:col-span-2 dark:border-slate-800">
          <p className="font-black text-slate-900 dark:text-white">
            License &amp; availability
          </p>
        </div>
        <AdminField label="License number">
          <input
            required
            value={form.license_number}
            onChange={(event) => field("license_number", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="License country">
          <input
            required
            maxLength={2}
            value={form.license_country_code}
            onChange={(event) =>
              field("license_country_code", event.target.value.toUpperCase())
            }
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="License expires">
          <input
            required
            type="date"
            value={form.license_expires_at}
            onChange={(event) =>
              field("license_expires_at", event.target.value)
            }
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Availability">
          <select
            value={form.availability_status}
            onChange={(event) =>
              field("availability_status", event.target.value)
            }
            className={adminFieldClass}
          >
            <option value="available">Available</option>
            <option value="on_load">On load</option>
            <option value="off_duty">Off duty</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </AdminField>
      </AdminFormModal>
    </>
  );
};
