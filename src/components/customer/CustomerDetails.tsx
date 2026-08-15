import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  BadgeCheck,
  Building2,
  CircleUserRound,
  KeyRound,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  ShieldOff,
  UserCheck,
  X,
} from "lucide-react";
import { ApiError, api } from "../../services/api";
import { confirmAction, showSuccess } from "../../lib/swal";
import { Button } from "../ui/Button";

type CustomerDetailsProps = {
  open: boolean;
  customer: Record<string, unknown> | null;
  onClose: () => void;
  onAuthorized?: (customer: Record<string, unknown>) => void;
};

const display = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
};

const displayDate = (value: unknown): string => {
  if (!value) return "—";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleString();
};

const Detail = ({ label, value }: { label: string; value: unknown }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
      {label}
    </p>
    <p className="mt-1 break-words text-sm font-bold text-slate-800 dark:text-slate-100">
      {display(value)}
    </p>
  </div>
);

const Section = ({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2;
  title: string;
  children: ReactNode;
}) => (
  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/70">
    <div className="mb-4 flex items-center gap-2 text-primary">
      <Icon className="h-5 w-5" />
      <h3 className="text-xs font-black uppercase tracking-wider">{title}</h3>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
  </section>
);

export const CustomerDetails = ({
  open,
  customer,
  onClose,
  onAuthorized,
}: CustomerDetailsProps) => {
  const [authorizationEmail, setAuthorizationEmail] = useState("");
  const [authorizing, setAuthorizing] = useState(false);
  const [authorizationError, setAuthorizationError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !customer) return;
    const linkedUser = (customer.user || {}) as Record<string, unknown>;
    setAuthorizationEmail(
      String(customer.email || customer.billing_email || linkedUser.email || ""),
    );
    setAuthorizationError("");
  }, [open, customer]);

  if (!open || !customer) return null;

  const user = (customer.user || {}) as Record<string, unknown>;
  const name = customer.name || customer.company_name || "Customer";
  const email = customer.email || customer.billing_email || user.email;
  const isAuthorized = Boolean(
    customer.profile_authorized_at && customer.user_id,
  );

  const authorize = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetEmail = authorizationEmail.trim();
    const confirmed = await confirmAction({
      title: "Authorize this customer?",
      text: `A login account and temporary password will be created for ${targetEmail}.`,
      confirmText: "Authorize customer",
    });
    if (!confirmed) return;

    setAuthorizing(true);
    setAuthorizationError("");
    try {
      const response = await api.customers.authorize(
        Number(customer.id),
        targetEmail,
      );
      onAuthorized?.(response.data);
      void showSuccess(
        "Customer authorized",
        response.meta?.email_sent === false
          ? "The account is active, but the credentials email could not be sent. Check the SMTP configuration."
          : "The first login credentials were sent by email.",
      );
    } catch (caught) {
      const validation =
        caught instanceof ApiError
          ? Object.values(caught.errors).flat()[0]
          : null;
      setAuthorizationError(
        validation ||
          (caught instanceof Error
            ? caught.message
            : "Customer could not be authorized."),
      );
    } finally {
      setAuthorizing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[240] bg-white dark:bg-slate-950"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-details-title"
    >
      <div className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800 md:px-7">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-primary">
              Customer details
            </p>
            <h2
              id="customer-details-title"
              className="truncate text-xl font-black text-slate-900 dark:text-white md:text-2xl"
            >
              {display(name)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close customer details"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 md:p-7">
          <div className="w-full space-y-6">
            <section className="overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-cyan-100 p-6 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-cyan-950">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                    <CircleUserRound className="h-8 w-8" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-black text-slate-900 dark:text-white">
                      {display(name)}
                    </h1>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-300">
                      {display(email)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${customer.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}
                  >
                    {customer.is_active ? (
                      <BadgeCheck className="h-4 w-4" />
                    ) : (
                      <ShieldOff className="h-4 w-4" />
                    )}
                    {customer.is_active ? "Active" : "Not authorized"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${isAuthorized ? "bg-sky-500/10 text-sky-600" : "bg-slate-500/10 text-slate-500"}`}
                  >
                    <KeyRound className="h-4 w-4" />
                    {isAuthorized ? "Login authorized" : "No login access"}
                  </span>
                </div>
              </div>
            </section>

            <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-slate-500">Primary email</p>
                  <p className="break-all text-sm font-bold dark:text-white">
                    {display(email)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="text-sm font-bold dark:text-white">
                    {display(customer.phone || user.phone)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="text-sm font-bold dark:text-white">
                    {display(
                      [customer.city, customer.country_code]
                        .filter(Boolean)
                        .join(", "),
                    )}
                  </p>
                </div>
              </div>
            </section>

            {!customer.is_active && (
              <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-900/60 dark:bg-sky-950/30">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-xl">
                    <div className="flex items-center gap-2 text-primary">
                      <UserCheck className="h-5 w-5" />
                      <h3 className="text-sm font-black">Authorize customer access</h3>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      This creates an active login immediately and emails the customer a generated username and temporary password.
                    </p>
                  </div>
                  <form onSubmit={authorize} className="w-full max-w-xl">
                    <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300" htmlFor="customer-authorization-email">
                      Login email
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        id="customer-authorization-email"
                        type="email"
                        required
                        maxLength={255}
                        value={authorizationEmail}
                        onChange={(event) => setAuthorizationEmail(event.target.value)}
                        placeholder="customer@example.com"
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                      <Button type="submit" disabled={authorizing} className="whitespace-nowrap">
                        {authorizing ? (
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UserCheck className="mr-2 h-4 w-4" />
                        )}
                        {authorizing ? "Authorizing..." : "Authorize customer"}
                      </Button>
                    </div>
                    {authorizationError && (
                      <p className="mt-2 text-sm font-semibold text-rose-600">{authorizationError}</p>
                    )}
                  </form>
                </div>
              </section>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              <Section icon={Building2} title="Business identity">
                <Detail
                  label="Company name"
                  value={customer.company_name || name}
                />
                <Detail label="Tax number" value={customer.tax_number} />
                <Detail label="Customer type" value={customer.customer_type} />
                <Detail label="Status" value={customer.status} />
                <Detail
                  label="Country"
                  value={customer.country_code || user.country_code}
                />
                <Detail label="City" value={customer.city} />
              </Section>

              <Section icon={Mail} title="Contact and billing">
                <Detail label="Email" value={email} />
                <Detail label="Billing email" value={customer.billing_email} />
                <Detail label="Phone" value={customer.phone || user.phone} />
                <Detail
                  label="Billing address"
                  value={customer.billing_address}
                />
                <Detail
                  label="Country code"
                  value={customer.country_code || user.country_code}
                />
                <Detail
                  label="Language"
                  value={customer.language || user.language}
                />
              </Section>

              <Section icon={KeyRound} title="Account access">
                <Detail label="Linked user ID" value={customer.user_id} />
                <Detail
                  label="Username"
                  value={customer.username || user.username}
                />
                <Detail
                  label="Profile authorized"
                  value={displayDate(customer.profile_authorized_at)}
                />
                <Detail
                  label="Email verified"
                  value={displayDate(user.email_verified_at)}
                />
                <Detail
                  label="Last login"
                  value={displayDate(user.last_login_at)}
                />
                <Detail
                  label="Access state"
                  value={isAuthorized ? "Authorized" : "Not authorized"}
                />
              </Section>

              <Section icon={ReceiptText} title="Record information">
                <Detail label="Customer ID" value={customer.id} />
                <Detail label="Source" value={customer.source} />
                <Detail label="Source ID" value={customer.source_id} />
                <Detail
                  label="Created"
                  value={displayDate(customer.created_at)}
                />
                <Detail
                  label="Updated"
                  value={displayDate(customer.updated_at)}
                />
                <Detail
                  label="Source order"
                  value={customer.source_sort_order}
                />
              </Section>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
