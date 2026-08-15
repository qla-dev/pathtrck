import { useEffect, useMemo, useState } from "react";
import { CircleCheckBig, MapPin, Search, Star, Truck, UserRoundSearch, UsersRound } from "lucide-react";
import { ApiError, api } from "../../services/api";
import { Language } from "../../types";
import { AdminField, AdminFormModal, adminFieldClass } from "./AdminFormModal";
import { useApiList } from "../../hooks/useApiList";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { confirmAction, showSuccess } from "../../lib/swal";

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

export const AdminDriversView = ({ lang: _lang }: { lang: Language }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [companies, setCompanies] = useState<Record<string, unknown>[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const drivers = useApiList(api.drivers.list, { per_page: 100 });
  const visible = useMemo(
    () =>
      drivers.items.filter((row) =>
        JSON.stringify(row).toLowerCase().includes(query.toLowerCase()),
      ),
    [drivers.items, query],
  );
  const field = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (open && companies.length === 0)
      void api.companies
        .list({ per_page: 100 })
        .then((response) => setCompanies(response.data))
        .catch(() => setCompanies([]));
  }, [open, companies.length]);

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
        <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
                <UserRoundSearch className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black dark:text-white">Drivers</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Track drivers, companies, licenses, availability and completed
                  trips.
                </p>
              </div>
            </div>
            <Button onClick={() => setOpen(true)}>Add driver</Button>
          </div>
        </section>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="shadow-none" contentClassName="flex items-center justify-between gap-3 px-5 py-3">
            <div><p className="text-xs uppercase text-slate-500">Verified drivers</p><p className="mt-1 text-2xl font-black dark:text-white">{drivers.total}</p></div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500"><UsersRound className="h-6 w-6" /></div>
          </Card>
          <Card className="shadow-none" contentClassName="flex items-center justify-between gap-3 px-5 py-3">
            <div><p className="text-xs uppercase text-slate-500">Available</p><p className="mt-1 text-2xl font-black text-emerald-500">
              {
                drivers.items.filter(
                  (row) => row.availability_status === "available",
                ).length
              }
            </p></div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500"><CircleCheckBig className="h-6 w-6" /></div>
          </Card>
          <Card className="shadow-none" contentClassName="flex items-center justify-between gap-3 px-5 py-3">
            <div><p className="text-xs uppercase text-slate-500">On load</p><p className="mt-1 text-2xl font-black text-sky-500">
              {
                drivers.items.filter(
                  (row) => row.availability_status === "on_load",
                ).length
              }
            </p></div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500"><Truck className="h-6 w-6" /></div>
          </Card>
        </div>
        <Card className="shadow-none">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search driver, company or license..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="p-3">Driver</th>
                  <th className="p-3">Company</th>
                  <th className="p-3">License</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Rating</th>
                  <th className="p-3">Trips</th>
                  <th className="p-3">State</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const user = (row.user || {}) as Record<string, unknown>;
                  const company = (row.primary_company || {}) as Record<
                    string,
                    unknown
                  >;
                  const vehicles = Array.isArray(
                    (user as Record<string, unknown>).assigned_vehicles,
                  )
                    ? ((user as Record<string, unknown>)
                        .assigned_vehicles as Array<Record<string, unknown>>)
                    : [];
                  return (
                    <tr
                      key={String(row.id)}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="p-3">
                        <p className="font-bold dark:text-white">
                          {String(row.name || user.name || "—")}
                        </p>
                        <p className="text-xs text-slate-500">
                          {String(row.email || user.email || "")}
                        </p>
                      </td>
                      <td className="p-3">
                        {String(company.name || "Independent")}
                      </td>
                      <td className="p-3">
                        {String(row.license_number || "—")} ·{" "}
                        {String(row.license_country_code || "")}
                      </td>
                      <td className="p-3">
                        <span className="flex items-center gap-1 text-sm text-slate-500">
                          <MapPin className="h-4 w-4" />
                          {String(
                            (
                              vehicles[0]?.locations as
                                Array<Record<string, unknown>> | undefined
                            )?.[0]?.location_name || "—",
                          )}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="flex items-center gap-1 font-bold">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          {String(row.rating || 0)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="flex items-center gap-1">
                          <Truck className="h-4 w-4 text-primary" />
                          {String(row.completed_trips || 0)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                          {String(row.availability_status || "—")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
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
