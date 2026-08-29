import { useEffect, useMemo, useState } from "react";
import {
  CircleCheckBig,
  Eye,
  MapPin,
  Star,
  Truck,
  UserRoundSearch,
  UsersRound,
} from "lucide-react";
import { ApiError, api } from "../../services/api";
import { Language, Role } from "../../types";
import { AdminField, AdminFormModal, adminFieldClass } from "./AdminFormModal";
import { useApiList } from "../../hooks/useApiList";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import { Card } from "../ui/Card";
import { confirmAction, showSuccess } from "../../lib/swal";
import { ProfileModal } from "./ProfileModal";
import { ServerDataTable, type ServerDataTableColumn } from "../ui/ServerDataTable";

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
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [companies, setCompanies] = useState<Record<string, unknown>[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
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

  const columns = useMemo<ServerDataTableColumn<Record<string, unknown>>[]>(() => [
    { key: "driver", header: "Driver", render: (row) => { const user = (row.user || {}) as Record<string, unknown>; return <><p className="font-bold dark:text-white">{String(row.name || user.name || "—")}</p><p className="text-xs text-slate-500">{String(row.email || user.email || "")}</p></>; } },
    { key: "company", header: "Company", render: (row) => String(((row.primary_company || {}) as Record<string, unknown>).name || "Independent") },
    { key: "license", header: "License", render: (row) => `${String(row.license_number || "—")} · ${String(row.license_country_code || "")}` },
    { key: "location", header: "Location", render: (row) => { const user = (row.user || {}) as Record<string, unknown>; const vehicles = Array.isArray(user.assigned_vehicles) ? user.assigned_vehicles as Array<Record<string, unknown>> : []; const location = (vehicles[0]?.locations as Array<Record<string, unknown>> | undefined)?.[0]?.location_name; return <span className="flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" />{String(location || "—")}</span>; } },
    { key: "rating", header: "Rating", render: (row) => <span className="flex items-center gap-1 font-bold"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{String(row.rating || 0)}</span> },
    { key: "trips", header: "Trips", render: (row) => <span className="flex items-center gap-1"><Truck className="h-4 w-4 text-primary" />{String(row.completed_trips || 0)}</span> },
    { key: "state", header: "State", render: (row) => <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{String(row.availability_status || "—")}</span> },
    { key: "actions", header: "", className: "text-right", exportable: false, render: (row) => <button type="button" aria-label="Open driver profile" onClick={() => setSelected(row)} className="cursor-pointer rounded-lg bg-slate-100 p-2 transition hover:text-primary dark:bg-slate-800"><Eye className="h-4 w-4" /></button> },
  ], []);

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
      <div className="space-y-6">
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
        <Card className="shadow-none"><ServerDataTable title="Drivers" request={api.drivers.list} columns={columns} refreshKey={tableRefreshKey} initialPageSize={50} emptyMessage="No drivers found." /></Card>
      </div>
      <ProfileModal open={selected !== null} kind="driver" record={selected} role={role} lang={lang} onClose={() => setSelected(null)} />
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
