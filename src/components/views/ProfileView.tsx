import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  AtSign,
  BadgeCheck,
  Boxes,
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
  Star,
  Truck,
  UserRound,
  Warehouse,
  X,
} from "lucide-react";

import type { Language, Role } from "../../types";
import { ApiUser, api } from "../../services/api";
import { useApiList } from "../../hooks/useApiList";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";
import { flatpickrI18n } from "../../i18n";

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
    customerProfile: "Customer profile",
    driverProfile: "Driver profile",
    warehouseProfile: "Warehouse profile",
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
    tabGeneral: "General",
    tabOrganization: "Organization",
    tabNetwork: "Network",
    tabReviews: "Reviews",
    noReviews: "No reviews yet",
    noReviewsHint: "Verified partner reviews will appear here.",
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
    customerProfile: "Profil korisnika",
    driverProfile: "Profil vozača",
    warehouseProfile: "Profil skladišta",
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
    tabGeneral: "Generalno",
    tabOrganization: "Organizacija",
    tabNetwork: "Mreža",
    tabReviews: "Recenzije",
    noReviews: "Još nema recenzija",
    noReviewsHint: "Ovdje će se prikazati potvrđene recenzije partnera.",
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
    customerProfile: "Kundenprofil",
    driverProfile: "Fahrerprofil",
    warehouseProfile: "Lagerprofil",
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
    tabGeneral: "Allgemein",
    tabOrganization: "Organisation",
    tabNetwork: "Netzwerk",
    tabReviews: "Bewertungen",
    noReviews: "Noch keine Bewertungen",
    noReviewsHint: "Verifizierte Partnerbewertungen werden hier angezeigt.",
    editHint:
      "Änderungen werden in Ihren echten Konto- und Unternehmensdaten gespeichert.",
    editRestricted:
      "Nur der Unternehmenseigentümer oder ein Administrator kann die Unternehmensidentität bearbeiten.",
    loadError: "Das Profil konnte nicht geladen werden.",
    saveError: "Das Profil konnte nicht gespeichert werden.",
  },
} as const;

const DETAIL_COPY = {
  en: {
    businessBilling: "Business & billing", accountRecord: "Account record", organization: "Organization", network: "Network", driverCredentials: "Driver credentials", facility: "Facility", capacity: "Capacity & operations", contact: "Contact", management: "Management",
    companyName: "Company name", customerType: "Customer type", billingEmail: "Billing email", billingAddress: "Billing address", city: "City", country: "Country", taxNumber: "Tax number", vatNumber: "VAT number", status: "Status", authorized: "Profile authorized", source: "Source", sourceId: "Source ID", created: "Created", updated: "Updated", owner: "Owner", plan: "Plan", slug: "Slug", fleet: "Fleet vehicles", members: "Team members", verified: "Verified", licenseNumber: "License number", licenseCountry: "License country", licenseExpires: "License expires", company: "Primary company", availability: "Availability", certifications: "Certifications", code: "Code", type: "Type", address: "Address", address2: "Address line 2", state: "State / province", postalCode: "Postal code", coordinates: "Coordinates", pallets: "Pallet capacity", volume: "Volume capacity", area: "Storage area", docks: "Dock doors", storageTypes: "Storage types", contactName: "Contact person", department: "Department", preferredContact: "Preferred contact", alternatePhone: "Alternate phone", manager: "Manager", operationalNotes: "Operational notes", capabilities: "Capabilities", equipment: "Equipment", technology: "Technology", compliance: "Compliance", standards: "Standards",
  },
  bs: {
    businessBilling: "Poslovni i obračunski podaci", accountRecord: "Podaci računa", organization: "Organizacija", network: "Mreža", driverCredentials: "Vozačka dokumentacija", facility: "Objekat", capacity: "Kapacitet i operacije", contact: "Kontakt", management: "Upravljanje",
    companyName: "Naziv kompanije", customerType: "Vrsta kupca", billingEmail: "E-mail za račune", billingAddress: "Adresa za račune", city: "Grad", country: "Država", taxNumber: "Porezni broj", vatNumber: "PDV broj", status: "Status", authorized: "Profil odobren", source: "Izvor", sourceId: "ID izvora", created: "Kreirano", updated: "Ažurirano", owner: "Vlasnik", plan: "Paket", slug: "Oznaka", fleet: "Vozila u floti", members: "Članovi tima", verified: "Verifikovano", licenseNumber: "Broj dozvole", licenseCountry: "Država dozvole", licenseExpires: "Dozvola važi do", company: "Primarna kompanija", availability: "Dostupnost", certifications: "Certifikati", code: "Šifra", type: "Vrsta", address: "Adresa", address2: "Dodatak adresi", state: "Regija / kanton", postalCode: "Poštanski broj", coordinates: "Koordinate", pallets: "Kapacitet paleta", volume: "Zapreminski kapacitet", area: "Skladišna površina", docks: "Utovarne rampe", storageTypes: "Vrste skladištenja", contactName: "Kontakt osoba", department: "Odjel", preferredContact: "Preferirani kontakt", alternatePhone: "Dodatni telefon", manager: "Upravitelj", operationalNotes: "Operativne napomene", capabilities: "Mogućnosti", equipment: "Oprema", technology: "Tehnologija", compliance: "Usklađenost", standards: "Standardi",
  },
  de: {
    businessBilling: "Geschäfts- und Rechnungsdaten", accountRecord: "Kontodatensatz", organization: "Organisation", network: "Netzwerk", driverCredentials: "Fahrerdokumente", facility: "Standort", capacity: "Kapazität und Betrieb", contact: "Kontakt", management: "Leitung",
    companyName: "Firmenname", customerType: "Kundentyp", billingEmail: "Rechnungs-E-Mail", billingAddress: "Rechnungsadresse", city: "Stadt", country: "Land", taxNumber: "Steuernummer", vatNumber: "USt-IdNr.", status: "Status", authorized: "Profil freigegeben", source: "Quelle", sourceId: "Quell-ID", created: "Erstellt", updated: "Aktualisiert", owner: "Inhaber", plan: "Paket", slug: "Kennung", fleet: "Flottenfahrzeuge", members: "Teammitglieder", verified: "Verifiziert", licenseNumber: "Führerscheinnummer", licenseCountry: "Ausstellungsland", licenseExpires: "Gültig bis", company: "Primärunternehmen", availability: "Verfügbarkeit", certifications: "Zertifikate", code: "Code", type: "Typ", address: "Adresse", address2: "Adresszusatz", state: "Bundesland / Region", postalCode: "Postleitzahl", coordinates: "Koordinaten", pallets: "Palettenkapazität", volume: "Volumenkapazität", area: "Lagerfläche", docks: "Laderampen", storageTypes: "Lagerarten", contactName: "Kontaktperson", department: "Abteilung", preferredContact: "Bevorzugter Kontakt", alternatePhone: "Weitere Telefonnummer", manager: "Leitung", operationalNotes: "Betriebshinweise", capabilities: "Fähigkeiten", equipment: "Ausrüstung", technology: "Technologie", compliance: "Konformität", standards: "Standards",
  },
} as const;

const value = (input: unknown) =>
  typeof input === "string" || typeof input === "number" ? String(input) : "";
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "FB";

export type ProfileRecordKind = "customer" | "company" | "warehouse" | "driver";
type ProfileTab = "general" | "organization" | "network" | "reviews";

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
  const detailText = DETAIL_COPY[lang === "bs" || lang === "de" ? lang : "en"];
  const profileLoadScope = useMemo<Record<string, number>>(() => {
    if (!profileRecord || !profileKind) return {};
    const linkedUser = (profileRecord.user || profileRecord.owner || {}) as Record<string, unknown>;
    if (profileKind === "customer") {
      return { profile_customer_id: Number(profileRecord.id) };
    }
    if (profileKind === "company") {
      return { profile_company_id: Number(profileRecord.id) };
    }
    if (profileKind === "driver") {
      const driverUserId = Number(profileRecord.user_id || linkedUser.id || 0);
      return driverUserId ? { profile_driver_user_id: driverUserId } : {};
    }
    return {};
  }, [profileKind, profileRecord]);
  const loadStatusCounts = useApiList(api.loads.profileStatusCounts, profileLoadScope);
  const [user, setUser] = useState<ApiUser | null>(() =>
    profileRecord && profileKind
      ? userFromRecord(profileRecord, profileKind)
      : null,
  );
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("general");
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
  const detailKind: ProfileRecordKind | null = profileKind || (effectiveRole === "driver" ? "driver" : effectiveRole === "warehouse" ? "warehouse" : effectiveRole === "company" || effectiveRole === "finance" ? "company" : effectiveRole === "user" ? "customer" : null);
  const profileType = detailKind === "company"
    ? { label: text.companyProfile, icon: Building2, tone: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" }
    : detailKind === "warehouse"
      ? { label: text.warehouseProfile, icon: Warehouse, tone: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300" }
      : detailKind === "driver"
        ? { label: text.driverProfile, icon: Truck, tone: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" }
        : detailKind === "customer"
          ? { label: text.customerProfile, icon: UserRound, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" }
          : { label: user?.role?.label || text.personalProfile, icon: UserRound, tone: "bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-200" };
  const ProfileTypeIcon = profileType.icon;
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
  const customer = (profileKind === "customer" ? profileRecord : user?.customer_profile || {}) as Record<string, unknown>;
  const driver = (profileKind === "driver" ? profileRecord : user?.driver || {}) as Record<string, unknown>;
  const detailRecord = (profileRecord || (detailKind === "customer" ? customer : detailKind === "driver" ? driver : company) || null) as Record<string, unknown> | null;
  const profileRating = Number(detailRecord?.rating ?? detailRecord?.average_rating ?? driver.rating ?? 0);
  const profileReviewCount = Number(detailRecord?.reviews_count ?? detailRecord?.review_count ?? detailRecord?.ratings_count ?? 0);
  const profileReviews = (Array.isArray(detailRecord?.reviews) ? detailRecord.reviews : []) as Array<Record<string, unknown>>;
  const displayedReviewCount = Math.max(profileReviewCount, profileReviews.length);
  const displayName = companyMode
    ? company?.name || user?.name || ""
    : user?.name || "";
  const imageUrl = companyMode
    ? company?.logo_url || ""
    : user?.avatar_url || "";
  const location = companyMode
    ? [company?.address, company?.city, company?.country_code].filter(Boolean).join(", ")
    : detailKind === "customer"
      ? [customer.billing_address, customer.city, customer.country_code || user?.country_code].filter(Boolean).join(", ")
      : user?.country_code || "";
  const contactEmail = companyMode
    ? company?.email || user?.email || ""
    : user?.email || "";
  const profileTaxNumber = value(detailRecord?.tax_number || company?.tax_number || customer.tax_number);
  const statusCount = (statuses: string[]) => loadStatusCounts.items.reduce(
    (sum, item) => statuses.includes(value(item.status).toLowerCase()) ? sum + Number(item.count || 0) : sum,
    0,
  );
  const totalLoads = loadStatusCounts.items.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const activeLoads = statusCount(["posted", "opened", "sent", "in_delivery", "received", "pending"]);
  const completedLoads = statusCount(["finished"]);

  const stats = useMemo(
    () => {
      if (detailKind === "company" && detailRecord) return [
        { label: detailText.fleet, number: String(Array.isArray(detailRecord.vehicles) ? detailRecord.vehicles.length : detailRecord.vehicles_count || 0), icon: Truck },
        { label: detailText.members, number: String(Array.isArray(detailRecord.users) ? detailRecord.users.length : detailRecord.users_count || 0), icon: UserRound },
        { label: detailText.plan, number: value(detailRecord.plan) || "—", icon: PackageCheck },
      ];
      if (detailKind === "warehouse" && detailRecord) return [
        { label: detailText.pallets, number: Number(detailRecord.total_capacity_pallets || 0).toLocaleString(), icon: Boxes },
        { label: detailText.area, number: `${Number(detailRecord.storage_area_sqm || 0).toLocaleString()} m²`, icon: Warehouse },
        { label: detailText.docks, number: String(detailRecord.dock_doors || 0), icon: PackageCheck },
      ];
      return effectiveRole === "driver"
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
          ];
    },
    [
      activeLoads,
      completedLoads,
      driver.completed_trips,
      driver.rating,
      effectiveRole,
      detailKind,
      detailRecord,
      detailText,
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

  const formatDate = (date?: string | null) => {
    if (!date) return text.noValue;
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return text.noValue;
    const month = flatpickrI18n(lang).months.longhand[parsed.getMonth()];
    return `${month} ${parsed.getFullYear()}`;
  };
  const formatFullDate = (dateValue: unknown) => {
    if (!dateValue) return text.noValue;
    const parsed = new Date(String(dateValue));
    if (Number.isNaN(parsed.getTime())) return text.noValue;
    const month = flatpickrI18n(lang).months.longhand[parsed.getMonth()];
    return lang === "en" ? `${month} ${parsed.getDate()}, ${parsed.getFullYear()}` : `${parsed.getDate()}. ${month} ${parsed.getFullYear()}`;
  };

  return (
    <div className="w-full">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div className="min-w-0 space-y-5">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative h-36 overflow-hidden bg-slate-900 sm:h-44">
          <img
            src="/profile-cover-logistics.png?v=2"
            alt=""
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/30 via-transparent to-slate-950/10" />
          <span className={cn("absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black shadow-sm backdrop-blur-sm", profileType.tone)}>
            <ProfileTypeIcon className="h-4 w-4" />
            {profileType.label}
          </span>
        </div>
        <div className="relative px-5 pb-6 sm:px-8">
          <div className="absolute -top-14 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 text-3xl font-black text-slate-800 shadow-lg dark:border-slate-900 dark:bg-slate-200 dark:text-slate-900 sm:-top-16 sm:h-32 sm:w-32">
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
            <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>{Number.isFinite(profileRating) ? profileRating.toFixed(1) : "0.0"}</span>
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-slate-500">({profileReviewCount.toLocaleString()})</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {location || text.locationMissing}
              </span>
              {contactEmail && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {contactEmail}
                </span>
              )}
              {profileTaxNumber && (
                <span className="inline-flex items-center gap-1.5">
                  <BriefcaseBusiness className="h-3.5 w-3.5" />
                  {profileTaxNumber}
                </span>
              )}
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

      {!editing && (
        <nav
          aria-label={text.companyProfile}
          className="flex w-full min-w-0 items-center gap-1 overflow-x-auto border-b border-slate-200 px-1 [-ms-overflow-style:none] [scrollbar-width:none] dark:border-slate-800 [&::-webkit-scrollbar]:hidden"
        >
          {([
            { id: "general" as const, label: text.tabGeneral, icon: UserRound },
            { id: "organization" as const, label: text.tabOrganization, icon: Building2 },
            { id: "network" as const, label: text.tabNetwork, icon: Globe2 },
            { id: "reviews" as const, label: text.tabReviews, icon: Star },
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 px-4 text-sm font-bold transition-colors",
                activeTab === tab.id
                  ? "text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
              )}
            >
              <tab.icon className={cn("h-4 w-4", tab.id === "reviews" && activeTab !== tab.id && "fill-amber-400 text-amber-400")} />
              {tab.label}
              {tab.id === "reviews" && displayedReviewCount > 0 && (
                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500 dark:bg-slate-800")}>{displayedReviewCount}</span>
              )}
            </button>
          ))}
        </nav>
      )}

      <AnimatePresence mode="wait" initial={false}>
      {editing && form ? (
        <motion.section
          key="edit-profile"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7"
        >
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
        </motion.section>
      ) : (

      <motion.div
        key={`profile-details-${activeTab}`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="min-w-0"
      >
        {activeTab === "general" && (
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
        )}

        {activeTab === "organization" && detailKind && detailRecord && (
          <ProfileRecordDetails section="organization" kind={detailKind} record={detailRecord} labels={detailText} empty={text.noValue} formatDate={formatFullDate} />
        )}

        {activeTab === "network" && detailKind && detailRecord && (
          <ProfileRecordDetails section="network" kind={detailKind} record={detailRecord} labels={detailText} empty={text.noValue} formatDate={formatFullDate} />
        )}

        {activeTab === "reviews" && (
          <div className="space-y-5">
            <section className="flex flex-wrap items-center gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-500/10">
                <Star className="h-8 w-8 fill-current" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <strong className="text-3xl font-black text-slate-950 dark:text-white">{Number.isFinite(profileRating) ? profileRating.toFixed(1) : "0.0"}</strong>
                  <span className="text-sm font-semibold text-slate-500">/ 5</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{displayedReviewCount.toLocaleString()} {text.tabReviews.toLowerCase()}</p>
              </div>
            </section>

            {profileReviews.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {profileReviews.map((review, index) => {
                  const reviewer = (review.reviewer || review.user || review.author || {}) as Record<string, unknown>;
                  const reviewerName = value(reviewer.name || review.reviewer_name || review.author_name) || text.noValue;
                  const reviewRating = Math.max(0, Math.min(5, Number(review.rating || review.score || 0)));
                  return (
                    <article key={value(review.id) || `${reviewerName}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{initials(reviewerName)}</div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950 dark:text-white">{reviewerName}</p>
                            <p className="text-xs text-slate-500">{formatFullDate(review.created_at || review.date)}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 text-sm font-black text-slate-900 dark:text-white"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{reviewRating.toFixed(1)}</div>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{value(review.comment || review.review || review.body || review.text) || text.noValue}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <section className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 text-center dark:border-slate-700 dark:bg-slate-900">
                <Star className="h-9 w-9 text-slate-300 dark:text-slate-600" />
                <h2 className="mt-4 font-black text-slate-950 dark:text-white">{text.noReviews}</h2>
                <p className="mt-1 text-sm text-slate-500">{text.noReviewsHint}</p>
              </section>
            )}
          </div>
        )}
      </motion.div>
      )}
      </AnimatePresence>
      </div>

      <aside className="min-w-0 self-start space-y-5 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-7.5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1 lg:[scrollbar-width:thin]">
        {action}
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

type DetailLabels = { [Key in keyof (typeof DETAIL_COPY)["en"]]: string };
type ProfileDetailRow = { label: string; value: unknown; icon: typeof Mail };

const displayProfileValue = (input: unknown, empty: string): string => {
  if (input === null || input === undefined || input === "") return empty;
  if (typeof input === "boolean") return input ? "Yes" : "No";
  if (Array.isArray(input)) {
    const values = input.map((item) => {
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return value(record.label || record.name || record.title || record.code || record.value || record.type);
      }
      return value(item);
    }).filter(Boolean);
    return values.length ? values.join(", ") : empty;
  }
  if (typeof input === "object") {
    const values = Object.entries(input as Record<string, unknown>)
      .filter(([, item]) => ["string", "number", "boolean"].includes(typeof item))
      .map(([key, item]) => `${key.replaceAll("_", " ")}: ${String(item)}`);
    return values.length ? values.join(" · ") : empty;
  }
  return String(input);
};

const ProfileRecordDetails = ({ section, kind, record, labels, empty, formatDate }: { section: "organization" | "network"; kind: ProfileRecordKind; record: Record<string, unknown>; labels: DetailLabels; empty: string; formatDate: (value: unknown) => string }) => {
  const owner = (record.owner || record.user || {}) as Record<string, unknown>;
  const primaryCompany = (record.primary_company || {}) as Record<string, unknown>;
  const sections: Array<{ title: string; icon: typeof Mail; rows: ProfileDetailRow[] }> = kind === "customer"
    ? [
        { title: labels.businessBilling, icon: Building2, rows: [
          { label: labels.companyName, value: record.company_name || record.name, icon: Building2 },
          { label: labels.customerType, value: record.customer_type, icon: UserRound },
          { label: labels.billingEmail, value: record.billing_email || record.email, icon: Mail },
          { label: labels.billingAddress, value: record.billing_address, icon: MapPin },
          { label: labels.city, value: record.city, icon: MapPin },
          { label: labels.country, value: record.country_code, icon: Globe2 },
          { label: labels.taxNumber, value: record.tax_number, icon: BriefcaseBusiness },
          { label: labels.vatNumber, value: record.vat_number, icon: BadgeCheck },
        ]},
        { title: labels.accountRecord, icon: ShieldCheck, rows: [
          { label: labels.status, value: record.status, icon: ShieldCheck },
          { label: labels.authorized, value: formatDate(record.profile_authorized_at), icon: BadgeCheck },
          { label: labels.source, value: record.source, icon: Globe2 },
          { label: labels.sourceId, value: record.source_id, icon: AtSign },
          { label: labels.created, value: formatDate(record.created_at), icon: CalendarDays },
          { label: labels.updated, value: formatDate(record.updated_at), icon: CalendarDays },
        ]},
      ]
    : kind === "company"
      ? [
          { title: labels.organization, icon: Building2, rows: [
            { label: labels.owner, value: owner.name, icon: UserRound },
            { label: labels.address, value: record.address, icon: MapPin },
            { label: labels.city, value: record.city, icon: MapPin },
            { label: labels.country, value: record.country_code, icon: Globe2 },
            { label: labels.taxNumber, value: record.tax_number, icon: BriefcaseBusiness },
            { label: labels.vatNumber, value: record.vat_number, icon: BadgeCheck },
            { label: labels.plan, value: record.plan, icon: PackageCheck },
            { label: labels.status, value: record.status, icon: ShieldCheck },
          ]},
          { title: labels.network, icon: Truck, rows: [
            { label: labels.fleet, value: Array.isArray(record.vehicles) ? record.vehicles.length : record.vehicles_count, icon: Truck },
            { label: labels.members, value: Array.isArray(record.users) ? record.users.length : record.users_count, icon: UserRound },
            { label: labels.slug, value: record.slug, icon: AtSign },
            { label: labels.verified, value: formatDate(record.verified_at), icon: BadgeCheck },
            { label: labels.created, value: formatDate(record.created_at), icon: CalendarDays },
            { label: labels.updated, value: formatDate(record.updated_at), icon: CalendarDays },
          ]},
        ]
      : kind === "driver"
        ? [
            { title: labels.driverCredentials, icon: Truck, rows: [
              { label: labels.licenseNumber, value: record.license_number, icon: BadgeCheck },
              { label: labels.licenseCountry, value: record.license_country_code, icon: Globe2 },
              { label: labels.licenseExpires, value: formatDate(record.license_expires_at), icon: CalendarDays },
              { label: labels.company, value: primaryCompany.name, icon: Building2 },
              { label: labels.availability, value: record.availability_status, icon: Activity },
              { label: labels.certifications, value: record.certifications, icon: ShieldCheck },
              { label: labels.authorized, value: formatDate(record.profile_authorized_at), icon: BadgeCheck },
              { label: labels.created, value: formatDate(record.created_at), icon: CalendarDays },
            ]},
          ]
        : [
            { title: labels.facility, icon: Warehouse, rows: [
              { label: labels.code, value: record.code, icon: AtSign },
              { label: labels.type, value: record.warehouse_type, icon: Warehouse },
              { label: labels.address, value: record.address, icon: MapPin },
              { label: labels.address2, value: record.address_line_2, icon: MapPin },
              { label: labels.city, value: record.city, icon: MapPin },
              { label: labels.state, value: record.state_province, icon: MapPin },
              { label: labels.postalCode, value: record.postal_code, icon: AtSign },
              { label: labels.country, value: record.country_code, icon: Globe2 },
              { label: labels.coordinates, value: record.latitude && record.longitude ? `${record.latitude}, ${record.longitude}` : null, icon: Globe2 },
              { label: labels.status, value: record.status, icon: ShieldCheck },
            ]},
            { title: labels.capacity, icon: Boxes, rows: [
              { label: labels.pallets, value: record.total_capacity_pallets, icon: Boxes },
              { label: labels.volume, value: record.total_capacity_cbm ? `${record.total_capacity_cbm} m³` : null, icon: Boxes },
              { label: labels.area, value: record.storage_area_sqm ? `${record.storage_area_sqm} m²` : null, icon: Warehouse },
              { label: labels.docks, value: record.dock_doors, icon: PackageCheck },
              { label: labels.storageTypes, value: record.storage_types, icon: Warehouse },
              { label: labels.certifications, value: record.certifications, icon: ShieldCheck },
              { label: labels.operationalNotes, value: record.operational_notes, icon: BriefcaseBusiness },
              { label: labels.capabilities, value: record.capabilities || record.handling_capabilities, icon: PackageCheck },
              { label: labels.equipment, value: record.equipment, icon: Truck },
              { label: labels.technology, value: record.technology, icon: Activity },
              { label: labels.compliance, value: record.compliance, icon: ShieldCheck },
              { label: labels.standards, value: record.standards, icon: BadgeCheck },
            ]},
            { title: labels.contact, icon: Mail, rows: [
              { label: labels.contactName, value: record.contact_name, icon: UserRound },
              { label: labels.billingEmail, value: record.contact_email || record.email, icon: Mail },
              { label: labels.department, value: record.department, icon: Building2 },
              { label: labels.preferredContact, value: record.preferred_contact_method, icon: Phone },
              { label: labels.alternatePhone, value: record.contact_alternate_phone || record.contact_phone || record.phone, icon: Phone },
            ]},
            { title: labels.management, icon: UserRound, rows: [
              { label: labels.manager, value: record.manager_name || owner.name, icon: UserRound },
              { label: labels.billingEmail, value: record.manager_email || owner.email, icon: Mail },
              { label: labels.alternatePhone, value: record.manager_phone || owner.phone, icon: Phone },
              { label: labels.plan, value: record.plan, icon: PackageCheck },
              { label: labels.verified, value: formatDate(record.verified_at), icon: BadgeCheck },
              { label: labels.updated, value: formatDate(record.updated_at), icon: CalendarDays },
            ]},
          ];

  const visibleSections = section === "network"
    ? kind === "warehouse"
      ? sections.slice(1, 2)
      : kind === "driver"
        ? sections
        : sections.slice(1)
    : kind === "warehouse"
      ? sections.filter((_, index) => index !== 1)
      : sections.slice(0, 1);

  return <div className={cn("grid gap-5", visibleSections.length > 1 && "xl:grid-cols-2")}>{visibleSections.map(({ title, icon: SectionIcon, rows }) => <section key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex items-center gap-2"><SectionIcon className="h-5 w-5 text-primary" /><h2 className="font-black text-slate-950 dark:text-white">{title}</h2></div><div className="grid gap-3 sm:grid-cols-2">{rows.map((row) => <Detail key={row.label} icon={row.icon} label={row.label} value={displayProfileValue(row.value, empty)} empty={empty} />)}</div></section>)}</div>;
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
