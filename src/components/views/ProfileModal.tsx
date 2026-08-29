import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Building2, LoaderCircle, Truck, User, UserCheck, Warehouse, X } from "lucide-react";

import type { Language, Role } from "../../types";
import { ApiError, api } from "../../services/api";
import { confirmAction, showSuccess } from "../../lib/swal";
import { Button } from "../ui/Button";
import { ProfileView, type ProfileRecordKind } from "./ProfileView";
import { ReviewComposer, type ReviewSummary } from "../reviews/ReviewComposer";

type Props = {
  open: boolean;
  kind: ProfileRecordKind;
  record: Record<string, unknown> | null;
  role: Role;
  lang: Language;
  onClose: () => void;
  onAuthorized?: (customer: Record<string, unknown>) => void;
};

const profileRole = (kind: ProfileRecordKind): Role =>
  kind === "driver"
    ? "driver"
    : kind === "warehouse"
      ? "warehouse"
      : kind === "company"
        ? "company"
        : "user";

const profileTypeMeta = {
  customer: { label: "Customer", icon: User, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  company: { label: "Logistics company", icon: Building2, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  warehouse: { label: "Warehouse company", icon: Warehouse, tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  driver: { label: "Driver", icon: Truck, tone: "bg-primary/10 text-primary" },
};

export const ProfileModal = ({
  open,
  kind,
  record,
  role,
  lang,
  onClose,
  onAuthorized,
}: Props) => {
  const [authorizationEmail, setAuthorizationEmail] = useState("");
  const [authorizing, setAuthorizing] = useState(false);
  const [authorizationError, setAuthorizationError] = useState("");
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const profileMeta = profileTypeMeta[kind];
  const ProfileTypeIcon = profileMeta.icon;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !record || kind !== "customer") return;
    const linked = (record.user || {}) as Record<string, unknown>;
    setAuthorizationEmail(
      String(record.email || record.billing_email || linked.email || ""),
    );
    setAuthorizationError("");
  }, [kind, open, record]);

  useEffect(() => {
    if (open) setReviewSummary(null);
  }, [kind, open, record?.id]);

  useEffect(() => {
    if (!open || !record?.id) return undefined;
    let active = true;
    api.reviews.list(kind, Number(record.id))
      .then((response) => {
        if (!active) return;
        setReviewSummary({
          reviews: response.data,
          averageRating: Number(response.meta?.average_rating || 0),
          total: Number(response.meta?.total || response.data.length),
          hasReviewed: Boolean(response.meta?.has_reviewed),
          canReview: Boolean(response.meta?.can_review),
          myReview: response.meta?.my_review || null,
        });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [kind, open, record?.id]);

  const canAuthorize =
    kind === "customer" &&
    (role === "superadmin" || role === "master") &&
    record !== null &&
    !record.is_active;
  const authorize = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!record) return;
    const email = authorizationEmail.trim();
    const confirmed = await confirmAction({
      title: "Authorize this customer?",
      text: `A login account and temporary password will be created for ${email}.`,
      confirmText: "Authorize customer",
    });
    if (!confirmed) return;
    setAuthorizing(true);
    setAuthorizationError("");
    try {
      const response = await api.customers.authorize(Number(record.id), email);
      onAuthorized?.(response.data);
      void showSuccess(
        "Customer authorized",
        response.meta?.email_sent === false
          ? "The account is active, but the credentials email could not be sent."
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

  const authorizationAction = canAuthorize ? (
    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/60 dark:bg-sky-950/30">
      <form
        onSubmit={authorize}
        className="space-y-4"
      >
        <div>
          <div className="flex items-center gap-2 text-primary">
            <UserCheck className="h-5 w-5" />
            <h3 className="text-sm font-black">Authorize customer access</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Create an active login and email temporary credentials to this
            customer.
          </p>
        </div>
        <div className="w-full">
          <label
            htmlFor="customer-authorization-email"
            className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300"
          >
            Login email
          </label>
          <div className="flex flex-col gap-2">
            <input
              id="customer-authorization-email"
              type="email"
              required
              maxLength={255}
              value={authorizationEmail}
              onChange={(event) => setAuthorizationEmail(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <Button
              type="submit"
              disabled={authorizing}
              className="w-full cursor-pointer justify-center whitespace-nowrap"
            >
              {authorizing ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              {authorizing ? "Authorizing..." : "Authorize customer"}
            </Button>
          </div>
          {authorizationError && (
            <p className="mt-2 text-sm font-semibold text-rose-600">
              {authorizationError}
            </p>
          )}
        </div>
      </form>
    </section>
  ) : null;
  const reviewAction = record && role !== "superadmin" && role !== "master" ? (
    <ReviewComposer
      mode={kind}
      targetId={Number(record.id)}
      targetName={String(record.name || record.company_name || "Profile")}
      viewerRole={role}
      lang={lang}
      onSummaryChange={setReviewSummary}
    />
  ) : null;
  const displayedRecord = record && reviewSummary ? {
    ...record,
    reviews: reviewSummary.reviews,
    average_rating: reviewSummary.averageRating,
    reviews_count: reviewSummary.total,
  } : record;

  return (
    <AnimatePresence>
      {open && record && (
      <motion.div
        className="fixed inset-0 z-[240] flex items-stretch justify-center overflow-hidden bg-slate-950/70 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
      <motion.div
        className="flex h-[100dvh] max-h-[100dvh] w-full min-h-0 flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl dark:bg-slate-900"
        initial={{ opacity: 0, y: 24, scale: 0.992 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.996 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800 md:px-7">
          <span className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-3 text-xs font-bold ${profileMeta.tone}`}><ProfileTypeIcon className="h-4 w-4" />{profileMeta.label}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 md:p-7">
          <ProfileView
            role={profileRole(kind)}
            lang={lang}
            profileRecord={displayedRecord}
            profileKind={kind}
            action={authorizationAction || reviewAction}
          />
        </div>
      </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
