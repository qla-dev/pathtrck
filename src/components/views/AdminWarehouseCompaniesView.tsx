import { useMemo, useState } from "react";
import {
  Boxes,
  Clock3,
  Eye,
  Loader2,
  Mail,
  Warehouse as WarehouseIcon,
} from "lucide-react";

import { ApiError, api } from "../../services/api";
import { Language, Role } from "../../types";
import { cn } from "../../lib/cn";
import { confirmAction, showError, showSuccess } from "../../lib/swal";
import { useApiList } from "../../hooks/useApiList";
import { AdminField, AdminFormModal, adminFieldClass } from "./AdminFormModal";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import { Card } from "../ui/Card";
import { ProfileModal } from "./ProfileModal";
import { ServerDataTable, type ServerDataTableColumn } from "../ui/ServerDataTable";

const initial = {
  company_name: "",
  company_email: "",
  company_phone: "",
  country_code: "BA",
  city: "",
  address: "",
  tax_number: "",
  registration_number: "",
  total_capacity_pallets: "",
  plan: "starter",
  status: "pending",
  owner_name: "",
  owner_email: "",
  owner_username: "",
  owner_password: "",
  owner_phone: "",
};
type WarehouseStatus = "pending" | "verified" | "suspended";

export const AdminWarehouseCompaniesView = ({
  lang,
  role,
  onOpenEmailStudio,
}: {
  lang: Language;
  role: Role;
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
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const warehouses = useApiList(api.warehouses.list, { per_page: 100 });
  const field = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const totalCapacity = warehouses.items.reduce(
    (sum, row) => sum + Number(row.total_capacity_pallets || 0),
    0,
  );

  const updateStatus = async (
    row: Record<string, unknown>,
    status: WarehouseStatus,
  ) => {
    if (String(row.status || "pending") === status) return;
    const confirmed = await confirmAction({
      title: `Change status to ${status}?`,
      text: `${String(row.name || "This warehouse")} will be ${status === "verified" ? "enabled in the warehouse network" : status === "suspended" ? "disabled from new bookings" : "returned to verification review"}.`,
      confirmText: "Change status",
    });
    if (!confirmed) return;
    const id = String(row.id);
    setStatusSavingId(id);
    try {
      await api.warehouses.update(id, {
        status,
        verified_at: status === "verified" ? new Date().toISOString() : null,
      });
      await warehouses.refresh();
      setTableRefreshKey((current) => current + 1);
      void showSuccess(
        "Warehouse status updated",
        `${String(row.name || "Warehouse")} is now ${status}.`,
      );
    } catch (caught) {
      void showError(
        "Warehouse status could not be updated",
        caught instanceof Error ? caught.message : undefined,
      );
    } finally {
      setStatusSavingId(null);
    }
  };

  const columns = useMemo<ServerDataTableColumn<Record<string, unknown>>[]>(() => [
    { key: "warehouse", header: "Warehouse", render: (row) => <><p className="font-bold dark:text-white">{String(row.name || "—")}</p><p className="text-xs text-slate-500">{String(row.city || "—")}, {String(row.country_code || "—")} · {String(row.email || "—")}</p></> },
    { key: "owner", header: "Owner", render: (row) => String(((row.owner || {}) as Record<string, unknown>).name || "—") },
    { key: "plan", header: "Plan", render: (row) => <span className="font-bold text-orange-500">{String(row.plan || "—")}</span> },
    { key: "capacity", header: "Capacity", render: (row) => `${Number(row.total_capacity_pallets || 0).toLocaleString()} pal.` },
    { key: "storage", header: "Storage types", render: (row) => Array.isArray(row.storage_types) ? (row.storage_types as unknown[]).join(", ") : "—" },
    { key: "status", header: "Status", render: (row) => { const status = String(row.status || "pending") as WarehouseStatus; const saving = statusSavingId === String(row.id); return <div className="relative inline-flex items-center">{saving && <Loader2 className="absolute left-2 h-3.5 w-3.5 animate-spin" />}<select value={status} disabled={saving} onChange={(event) => void updateStatus(row, event.target.value as WarehouseStatus)} className={cn("h-8 cursor-pointer appearance-none rounded-full border-0 py-1 pl-3 pr-7 text-xs font-bold outline-none ring-1 ring-inset disabled:cursor-wait disabled:opacity-70", saving && "pl-7", status === "verified" ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20" : status === "suspended" ? "bg-rose-500/10 text-rose-600 ring-rose-500/20" : "bg-amber-500/10 text-amber-600 ring-amber-500/20")}><option value="pending">pending</option><option value="verified">verified</option><option value="suspended">suspended</option></select></div>; } },
    { key: "actions", header: "", className: "text-right", exportable: false, render: (row) => <button type="button" aria-label="Open warehouse profile" onClick={() => setSelected(row)} className="cursor-pointer rounded-lg bg-slate-100 p-2 transition hover:text-primary dark:bg-slate-800"><Eye className="h-4 w-4" /></button> },
  ], [statusSavingId]);

  const save = async () => {
    const confirmed = await confirmAction({
      title: "Create this warehouse company?",
      text: `The warehouse and owner login for ${form.company_name || form.owner_email} will be created together.`,
      confirmText: "Create warehouse company",
    });
    if (!confirmed) return;
    setSubmitting(true);
    setError("");
    try {
      await api.warehouses.onboard({
        ...form,
        total_capacity_pallets:
          form.total_capacity_pallets === ""
            ? 0
            : Number(form.total_capacity_pallets),
      });
      await warehouses.refresh();
      setTableRefreshKey((current) => current + 1);
      setOpen(false);
      setForm(initial);
      void showSuccess(
        "Warehouse company created",
        "The warehouse and owner account are ready.",
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
            : "Warehouse company could not be created."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          icon={WarehouseIcon}
          tone="orange"
          title="Warehouse Companies"
          subtitle="Inspect every warehouse company, owner, subscription, capacity and verification state."
          actions={
            <>
              <Button variant="outline" onClick={onOpenEmailStudio}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
              <Button onClick={() => setOpen(true)}>
                Add warehouse company
              </Button>
            </>
          }
          stats={[
            {
              label: "Total warehouses",
              value: warehouses.total,
              icon: WarehouseIcon,
              tone: "bg-orange-500/10 text-orange-500",
            },
            {
              label: "Pending verification",
              value: warehouses.items.filter((row) => row.status === "pending")
                .length,
              icon: Clock3,
              tone: "bg-amber-500/10 text-amber-500",
            },
            {
              label: "Total capacity",
              value: `${totalCapacity.toLocaleString()} pal.`,
              icon: Boxes,
              tone: "bg-sky-500/10 text-sky-500",
            },
          ]}
        />

        <Card className="shadow-none"><ServerDataTable title="Warehouse companies" request={api.warehouses.list} columns={columns} refreshKey={tableRefreshKey} initialPageSize={50} emptyMessage="No warehouse companies found." /></Card>

      </div>

      <ProfileModal open={selected !== null} kind="warehouse" record={selected} role={role} lang={lang} onClose={() => setSelected(null)} />

      <AdminFormModal
        open={open}
        title="Add warehouse company"
        description="Create the warehouse facility and its owner login together."
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
            Warehouse information
          </p>
        </div>
        <AdminField label="Warehouse name">
          <input
            required
            value={form.company_name}
            onChange={(event) => field("company_name", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Warehouse email">
          <input
            type="email"
            value={form.company_email}
            onChange={(event) => field("company_email", event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label="Warehouse phone">
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
        <AdminField label="Total capacity (pallets)">
          <input
            type="number"
            min={0}
            value={form.total_capacity_pallets}
            onChange={(event) =>
              field("total_capacity_pallets", event.target.value)
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
            Warehouse owner login
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
