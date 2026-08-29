import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AtSign,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  PackageCheck,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";

import type { Language, Role } from "../../types";
import { ApiUser, api } from "../../services/api";
import { useApiList } from "../../hooks/useApiList";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";

type CompanyProfile = {
  id: number;
  owner_user_id?: number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  tax_number?: string | null;
  vat_number?: string | null;
  registration_number?: string | null;
  country_code?: string | null;
  city?: string | null;
  address?: string | null;
  website?: string | null;
  logo_url?: string | null;
  description?: string | null;
  status?: string | null;
  verified_at?: string | null;
  created_at?: string | null;
  pivot?: { company_role?: string; status?: string };
};

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  avatarUrl: string;
  headline: string;
  bio: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyCountryCode: string;
  companyCity: string;
  companyAddress: string;
  companyWebsite: string;
  companyLogoUrl: string;
  companyDescription: string;
  companyTaxNumber: string;
  companyVatNumber: string;
  companyRegistrationNumber: string;
};

const COPY = {
  en: {
    edit: "Edit profile",
    cancel: "Cancel",
    save: "Save changes",
    saving: "Saving",
    saved: "Profile saved",
    companyProfile: "Company profile",
    personalProfile: "Personal profile",
    active: "Active",
    locationMissing: "Add a location",
    headlineMissing: "Add a professional headline",
    about: "About",
    aboutMissing:
      "Add a short introduction so partners know who they are working with.",
    account: "Account owner",
    companyDetails: "Company details",
    professionalDetails: "Professional details",
    totalLoads: "Total loads",
    activeLoads: "Active loads",
    completedLoads: "Completed loads",
    rating: "Rating",
    completedTrips: "Completed trips",
    memberSince: "Member since",
    lastLogin: "Last login",
    username: "Username",
    role: "Role",
    status: "Status",
    fullName: "Full name",
    email: "Email",
    phone: "Phone",
    country: "Country code",
    avatar: "Avatar URL",
    headline: "Headline",
    bio: "About you",
    companyName: "Company name",
    website: "Website",
    logo: "Logo URL",
    city: "City",
    address: "Address",
    description: "Company description",
    taxNumber: "Tax number",
    vatNumber: "VAT number",
    registrationNumber: "Registration number",
    legalIdentity: "Legal identity",
    noValue: "Not provided",
    personalSection: "Personal account",
    companySection: "Company identity",
    editHint: "Changes are saved to your real account and company records.",
    editRestricted:
      "Only the company owner or an administrator can edit the company identity.",
    loadError: "The profile could not be loaded.",
    saveError: "The profile could not be saved.",
  },
  bs: {
    edit: "Uredi profil",
    cancel: "Odustani",
    save: "Sačuvaj izmjene",
    saving: "Čuvanje",
    saved: "Profil je sačuvan",
    companyProfile: "Profil kompanije",
    personalProfile: "Lični profil",
    active: "Aktivno",
    locationMissing: "Dodajte lokaciju",
    headlineMissing: "Dodajte profesionalni naslov",
    about: "O nama",
    aboutMissing: "Dodajte kratak opis kako bi partneri znali s kim sarađuju.",
    account: "Vlasnik računa",
    companyDetails: "Podaci kompanije",
    professionalDetails: "Profesionalni podaci",
    totalLoads: "Ukupno tereta",
    activeLoads: "Aktivni tereti",
    completedLoads: "Završeni tereti",
    rating: "Ocjena",
    completedTrips: "Završene vožnje",
    memberSince: "Član od",
    lastLogin: "Posljednja prijava",
    username: "Korisničko ime",
    role: "Uloga",
    status: "Status",
    fullName: "Ime i prezime",
    email: "E-mail",
    phone: "Telefon",
    country: "Kod države",
    avatar: "URL avatara",
    headline: "Profesionalni naslov",
    bio: "O vama",
    companyName: "Naziv kompanije",
    website: "Web-stranica",
    logo: "URL logotipa",
    city: "Grad",
    address: "Adresa",
    description: "Opis kompanije",
    taxNumber: "Porezni broj",
    vatNumber: "PDV broj",
    registrationNumber: "Registracijski broj",
    legalIdentity: "Pravni identitet",
    noValue: "Nije uneseno",
    personalSection: "Lični račun",
    companySection: "Identitet kompanije",
    editHint: "Izmjene se čuvaju u stvarnim podacima vašeg računa i kompanije.",
    editRestricted:
      "Samo vlasnik ili administrator može uređivati identitet kompanije.",
    loadError: "Profil nije moguće učitati.",
    saveError: "Profil nije moguće sačuvati.",
  },
  de: {
    edit: "Profil bearbeiten",
    cancel: "Abbrechen",
    save: "Änderungen speichern",
    saving: "Wird gespeichert",
    saved: "Profil gespeichert",
    companyProfile: "Unternehmensprofil",
    personalProfile: "Persönliches Profil",
    active: "Aktiv",
    locationMissing: "Standort hinzufügen",
    headlineMissing: "Berufliche Überschrift hinzufügen",
    about: "Über uns",
    aboutMissing:
      "Fügen Sie eine kurze Einführung hinzu, damit Partner wissen, mit wem sie zusammenarbeiten.",
    account: "Kontoinhaber",
    companyDetails: "Unternehmensdaten",
    professionalDetails: "Berufliche Angaben",
    totalLoads: "Ladungen gesamt",
    activeLoads: "Aktive Ladungen",
    completedLoads: "Abgeschlossene Ladungen",
    rating: "Bewertung",
    completedTrips: "Abgeschlossene Fahrten",
    memberSince: "Mitglied seit",
    lastLogin: "Letzte Anmeldung",
    username: "Benutzername",
    role: "Rolle",
    status: "Status",
    fullName: "Vollständiger Name",
    email: "E-Mail",
    phone: "Telefon",
    country: "Ländercode",
    avatar: "Avatar-URL",
    headline: "Überschrift",
    bio: "Über Sie",
    companyName: "Unternehmensname",
    website: "Webseite",
    logo: "Logo-URL",
    city: "Stadt",
    address: "Adresse",
    description: "Unternehmensbeschreibung",
    taxNumber: "Steuernummer",
    vatNumber: "USt-IdNr.",
    registrationNumber: "Registrierungsnummer",
    legalIdentity: "Rechtliche Identität",
    noValue: "Nicht angegeben",
    personalSection: "Persönliches Konto",
    companySection: "Unternehmensidentität",
    editHint:
      "Änderungen werden in Ihren echten Konto- und Unternehmensdaten gespeichert.",
    editRestricted:
      "Nur der Unternehmenseigentümer oder ein Administrator kann die Unternehmensidentität bearbeiten.",
    loadError: "Das Profil konnte nicht geladen werden.",
    saveError: "Das Profil konnte nicht gespeichert werden.",
  },
} as const;

const value = (input: unknown) =>
  typeof input === "string" || typeof input === "number" ? String(input) : "";
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "FB";

export type ProfileRecordKind = "customer" | "company" | "warehouse" | "driver";

const userFromRecord = (
  record: Record<string, unknown>,
  kind: ProfileRecordKind,
): ApiUser => {
  const linked = (
    kind === "company" || kind === "warehouse"
      ? record.owner
      : record.user || {}
  ) as Record<string, unknown>;
  const name = String(
    record.name ||
      record.company_name ||
      linked.name ||
      (kind === "driver"
        ? "Driver"
        : kind === "customer"
          ? "Customer"
          : "Company"),
  );
  const email = String(
    record.email || record.billing_email || linked.email || "",
  );
  return {
    ...linked,
    id: Number(linked.id || record.user_id || record.id || 0),
    role_id: Number(linked.role_id || 0),
    name,
    email,
    username: String(record.username || linked.username || ""),
    phone: String(record.phone || linked.phone || ""),
    language: String(record.language || linked.language || "en"),
    country_code: String(record.country_code || linked.country_code || ""),
    avatar_url: String(record.avatar_url || linked.avatar_url || ""),
    headline: String(
      record.headline || record.customer_type || linked.headline || "",
    ),
    bio: String(record.bio || record.description || linked.bio || ""),
    is_active: Boolean(record.is_active ?? linked.is_active ?? true),
    email_verified_at: String(linked.email_verified_at || ""),
    last_login_at: String(linked.last_login_at || ""),
    created_at: String(record.created_at || linked.created_at || ""),
    role: linked.role as ApiUser["role"],
    companies:
      kind === "company" || kind === "warehouse"
        ? [record]
        : (linked.companies as ApiUser["companies"]),
    driver: kind === "driver" ? record : (linked.driver as ApiUser["driver"]),
  };
};

const formFrom = (user: ApiUser, company?: CompanyProfile): ProfileForm => ({
  name: user.name || "",
  email: user.email || "",
  phone: user.phone || "",
  countryCode: user.country_code || "",
  avatarUrl: user.avatar_url || "",
  headline: user.headline || "",
  bio: user.bio || "",
  companyName: company?.name || "",
  companyEmail: company?.email || "",
  companyPhone: company?.phone || "",
  companyCountryCode: company?.country_code || "",
  companyCity: company?.city || "",
  companyAddress: company?.address || "",
  companyWebsite: company?.website || "",
  companyLogoUrl: company?.logo_url || "",
  companyDescription: company?.description || "",
  companyTaxNumber: company?.tax_number || "",
  companyVatNumber: company?.vat_number || "",
  companyRegistrationNumber: company?.registration_number || "",
});

export const ProfileView = ({
  role,
  lang,
  onUserUpdated,
  profileRecord,
  profileKind,
  action,
}: {
  role: Role;
  lang: Language;
  onUserUpdated?: (user: ApiUser) => void;
  profileRecord?: Record<string, unknown> | null;
  profileKind?: ProfileRecordKind;
  action?: ReactNode;
}) => {
  const text = COPY[lang === "bs" || lang === "de" ? lang : "en"];
  const loads = useApiList(api.loads.list, { per_page: 100 });
  const [user, setUser] = useState<ApiUser | null>(() =>
    profileRecord && profileKind
      ? userFromRecord(profileRecord, profileKind)
      : null,
  );
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(!(profileRecord && profileKind));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (profileRecord && profileKind) {
      setUser(userFromRecord(profileRecord, profileKind));
      setLoading(false);
      return undefined;
    }
    let active = true;
    api.auth
      .me()
      .then((record) => {
        if (active) setUser(record);
      })
      .catch(() => {
        if (active) setError(text.loadError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profileKind, profileRecord, text.loadError]);

  const effectiveRole: Role = profileKind === "driver" ? "driver" : profileKind === "warehouse" ? "warehouse" : profileKind === "company" ? "company" : profileKind === "customer" ? "user" : role;
  const company = (user?.companies?.[0] || undefined) as
    CompanyProfile | undefined;
  const companyMode = Boolean(
    company &&
    (effectiveRole === "company" ||
      effectiveRole === "finance" ||
      effectiveRole === "warehouse" ||
      profileKind === "company" ||
      profileKind === "warehouse"),
  );
  const canEditCompany = Boolean(
    company &&
    (Number(company.owner_user_id) === user?.id ||
      company.pivot?.company_role === "admin"),
  );
  const driver = (user?.driver || {}) as Record<string, unknown>;
  const displayName = companyMode
    ? company?.name || user?.name || ""
    : user?.name || "";
  const imageUrl = companyMode
    ? company?.logo_url || ""
    : user?.avatar_url || "";
  const headline = companyMode
    ? company?.description || ""
    : user?.headline || "";
  const location = companyMode
    ? [company?.city, company?.country_code].filter(Boolean).join(", ")
    : user?.country_code || "";
  const contactEmail = companyMode
    ? company?.email || user?.email || ""
    : user?.email || "";
  const totalLoads = profileRecord
    ? Number(profileRecord.loads_count || profileRecord.total_loads || 0)
    : loads.items.length;
  const activeLoads = loads.items.filter((item) =>
    ["posted", "sent", "in_delivery"].includes(
      value(item.status).toLowerCase(),
    ),
  ).length;
  const completedLoads = loads.items.filter(
    (item) => value(item.status).toLowerCase() === "finished",
  ).length;

  const stats = useMemo(
    () =>
      effectiveRole === "driver"
        ? [
            {
              label: text.completedTrips,
              number: value(driver.completed_trips) || String(completedLoads),
              icon: Truck,
            },
            {
              label: text.activeLoads,
              number: String(activeLoads),
              icon: Activity,
            },
            {
              label: text.rating,
              number: driver.rating
                ? `${Number(driver.rating).toFixed(2)} / 5`
                : "—",
              icon: ShieldCheck,
            },
          ]
        : [
            {
              label: text.totalLoads,
              number: String(totalLoads),
              icon: BriefcaseBusiness,
            },
            {
              label: text.activeLoads,
              number: String(activeLoads),
              icon: Activity,
            },
            {
              label: text.completedLoads,
              number: String(completedLoads),
              icon: PackageCheck,
            },
          ],
    [
      activeLoads,
      completedLoads,
      driver.completed_trips,
      driver.rating,
      effectiveRole,
      text,
      totalLoads,
    ],
  );

  const setField = (field: keyof ProfileForm, next: string) =>
    setForm((current) => (current ? { ...current, [field]: next } : current));
  const openEditor = () => {
    if (user) {
      setForm(formFrom(user, company));
      setNotice("");
      setError("");
      setEditing(true);
    }
  };

  const save = async () => {
    if (!user || !form || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        country_code: form.countryCode || null,
        avatar_url: form.avatarUrl || null,
        headline: form.headline || null,
        bio: form.bio || null,
      };
      if (companyMode && company && canEditCompany)
        payload.company = {
          id: company.id,
          name: form.companyName,
          email: form.companyEmail || null,
          phone: form.companyPhone || null,
          country_code: form.companyCountryCode,
          city: form.companyCity || null,
          address: form.companyAddress || null,
          website: form.companyWebsite || null,
          logo_url: form.companyLogoUrl || null,
          description: form.companyDescription || null,
          tax_number: form.companyTaxNumber || null,
          vat_number: form.companyVatNumber || null,
          registration_number: form.companyRegistrationNumber || null,
        };
      const updated = await api.auth.updateProfile(payload);
      setUser(updated);
      onUserUpdated?.(updated);
      setEditing(false);
      setNotice(text.saved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.saveError);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  if (!user)
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-600">
        {error || text.loadError}
      </div>
    );

  const dateLocale =
    lang === "bs" ? "bs-BA" : lang === "de" ? "de-DE" : "en-US";
  const formatDate = (date?: string | null) =>
    date
      ? new Date(date).toLocaleDateString(dateLocale, {
          year: "numeric",
          month: "long",
        })
      : text.noValue;

  return (
    <div className="w-full space-y-5">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative h-36 overflow-hidden bg-slate-900 sm:h-44">
          <img
            src="/profile-cover-logistics.png?v=2"
            alt=""
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/30 via-transparent to-slate-950/10" />
        </div>
        <div className="relative px-5 pb-6 sm:px-8">
          <div className="absolute -top-14 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-900 text-3xl font-black text-white shadow-lg dark:border-slate-900 sm:-top-16 sm:h-32 sm:w-32">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : companyMode ? (
              <Building2 className="h-12 w-12" />
            ) : (
              initials(displayName)
            )}
          </div>
          <div className="flex min-h-16 justify-end pt-4">
            {!profileRecord && (
              <Button
                variant="outline"
                size="sm"
                onClick={editing ? () => setEditing(false) : openEditor}
                className="cursor-pointer gap-2"
              >
                {editing ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Pencil className="h-4 w-4" />
                )}
                {editing ? text.cancel : text.edit}
              </Button>
            )}
          </div>
          <div className="mt-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
                {displayName}
              </h1>
              {(companyMode
                ? company?.verified_at
                : user.email_verified_at) && (
                <BadgeCheck className="h-5 w-5 fill-primary text-white dark:text-slate-900" />
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {headline || text.headlineMissing}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {location || text.locationMissing}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {contactEmail}
              </span>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary">
                {companyMode ? text.companyProfile : text.personalProfile}
              </span>
            </div>
          </div>
        </div>
      </div>

      {(notice || error) && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm font-semibold",
            error
              ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
          )}
        >
          {error || notice}
        </div>
      )}

      {action}

      {editing && form && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-950 dark:text-white">
                {text.edit}
              </h2>
              <p className="mt-1 text-xs text-slate-500">{text.editHint}</p>
            </div>
            <Button
              size="sm"
              disabled={saving}
              onClick={() => void save()}
              className="cursor-pointer gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? text.saving : text.save}
            </Button>
          </div>
          <h3 className="mb-3 mt-6 text-xs font-black uppercase tracking-wider text-primary">
            {text.personalSection}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={text.fullName}
              value={form.name}
              onChange={(next) => setField("name", next)}
            />
            <Field
              label={text.email}
              type="email"
              value={form.email}
              onChange={(next) => setField("email", next)}
            />
            <Field
              label={text.phone}
              value={form.phone}
              onChange={(next) => setField("phone", next)}
            />
            <Field
              label={text.country}
              value={form.countryCode}
              maxLength={2}
              onChange={(next) => setField("countryCode", next.toUpperCase())}
            />
            <Field
              label={text.avatar}
              value={form.avatarUrl}
              onChange={(next) => setField("avatarUrl", next)}
            />
            <Field
              label={text.headline}
              value={form.headline}
              onChange={(next) => setField("headline", next)}
            />
            <Field
              label={text.bio}
              value={form.bio}
              multiline
              className="md:col-span-2"
              onChange={(next) => setField("bio", next)}
            />
          </div>
          {companyMode && company && (
            <>
              <h3 className="mb-3 mt-7 text-xs font-black uppercase tracking-wider text-primary">
                {text.companySection}
              </h3>
              {!canEditCompany ? (
                <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  {text.editRestricted}
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label={text.companyName}
                    value={form.companyName}
                    onChange={(next) => setField("companyName", next)}
                  />
                  <Field
                    label={text.email}
                    type="email"
                    value={form.companyEmail}
                    onChange={(next) => setField("companyEmail", next)}
                  />
                  <Field
                    label={text.phone}
                    value={form.companyPhone}
                    onChange={(next) => setField("companyPhone", next)}
                  />
                  <Field
                    label={text.website}
                    value={form.companyWebsite}
                    onChange={(next) => setField("companyWebsite", next)}
                  />
                  <Field
                    label={text.logo}
                    value={form.companyLogoUrl}
                    onChange={(next) => setField("companyLogoUrl", next)}
                  />
                  <Field
                    label={text.country}
                    value={form.companyCountryCode}
                    maxLength={2}
                    onChange={(next) =>
                      setField("companyCountryCode", next.toUpperCase())
                    }
                  />
                  <Field
                    label={text.city}
                    value={form.companyCity}
                    onChange={(next) => setField("companyCity", next)}
                  />
                  <Field
                    label={text.address}
                    value={form.companyAddress}
                    onChange={(next) => setField("companyAddress", next)}
                  />
                  <Field
                    label={text.taxNumber}
                    value={form.companyTaxNumber}
                    onChange={(next) => setField("companyTaxNumber", next)}
                  />
                  <Field
                    label={text.vatNumber}
                    value={form.companyVatNumber}
                    onChange={(next) => setField("companyVatNumber", next)}
                  />
                  <Field
                    label={text.registrationNumber}
                    value={form.companyRegistrationNumber}
                    onChange={(next) =>
                      setField("companyRegistrationNumber", next)
                    }
                  />
                  <Field
                    label={text.description}
                    value={form.companyDescription}
                    multiline
                    className="md:col-span-2"
                    onChange={(next) => setField("companyDescription", next)}
                  />
                </div>
              )}
            </>
          )}
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-black text-slate-950 dark:text-white">
              {text.about}
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
              {(companyMode ? company?.description : user.bio) ||
                text.aboutMissing}
            </p>
          </section>
          <section className="grid gap-3 sm:grid-cols-3">
            {stats.map(({ label, number, icon: Icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                </div>
                <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
                  {number}
                </p>
              </div>
            ))}
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-black text-slate-950 dark:text-white">
              {companyMode ? text.companyDetails : text.professionalDetails}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {companyMode ? (
                <>
                  <Detail
                    icon={Globe2}
                    label={text.website}
                    value={company?.website}
                    empty={text.noValue}
                  />
                  <Detail
                    icon={Phone}
                    label={text.phone}
                    value={company?.phone}
                    empty={text.noValue}
                  />
                  <Detail
                    icon={MapPin}
                    label={text.address}
                    value={[
                      company?.address,
                      company?.city,
                      company?.country_code,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    empty={text.noValue}
                  />
                  <Detail
                    icon={CalendarDays}
                    label={text.memberSince}
                    value={formatDate(company?.created_at)}
                    empty={text.noValue}
                  />
                </>
              ) : (
                <>
                  <Detail
                    icon={AtSign}
                    label={text.username}
                    value={user.username}
                    empty={text.noValue}
                  />
                  <Detail
                    icon={Phone}
                    label={text.phone}
                    value={user.phone}
                    empty={text.noValue}
                  />
                  <Detail
                    icon={BriefcaseBusiness}
                    label={text.role}
                    value={user.role?.label}
                    empty={text.noValue}
                  />
                  <Detail
                    icon={CalendarDays}
                    label={text.memberSince}
                    value={formatDate(user.created_at)}
                    empty={text.noValue}
                  />
                </>
              )}
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-black text-slate-950 dark:text-white">
              {text.account}
            </h2>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-black text-primary">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(user.name)
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                  {user.name}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {user.role?.label}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <Detail
                icon={Mail}
                label={text.email}
                value={user.email}
                empty={text.noValue}
                compact
              />
              <Detail
                icon={CalendarDays}
                label={text.lastLogin}
                value={formatDate(user.last_login_at)}
                empty={text.noValue}
                compact
              />
              <Detail
                icon={ShieldCheck}
                label={text.status}
                value={user.is_active ? text.active : text.noValue}
                empty={text.noValue}
                compact
              />
            </div>
          </section>
          {companyMode && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-black text-slate-950 dark:text-white">
                {text.legalIdentity}
              </h2>
              <div className="mt-4 space-y-3">
                <Detail
                  icon={Building2}
                  label={text.taxNumber}
                  value={company?.tax_number}
                  empty={text.noValue}
                  compact
                />
                <Detail
                  icon={BadgeCheck}
                  label={text.vatNumber}
                  value={company?.vat_number}
                  empty={text.noValue}
                  compact
                />
                <Detail
                  icon={ShieldCheck}
                  label={text.registrationNumber}
                  value={company?.registration_number}
                  empty={text.noValue}
                  compact
                />
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );

};

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  multiline,
  maxLength,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  multiline?: boolean;
  maxLength?: number;
  className?: string;
}) => (
  <label className={cn("block", className)}>
    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
      {label}
    </span>
    {multiline ? (
      <textarea
        value={value}
        maxLength={3000}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    ) : (
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    )}
  </label>
);

const Detail = ({
  icon: Icon,
  label,
  value: detailValue,
  empty,
  compact,
}: {
  icon: typeof Mail;
  label: string;
  value?: string | null;
  empty: string;
  compact?: boolean;
}) => (
  <div
    className={cn(
      "flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-800",
      compact ? "p-3" : "p-4",
    )}
  >
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 break-words text-sm font-semibold text-slate-700 dark:text-slate-200">
        {detailValue || empty}
      </p>
    </div>
  </div>
);
