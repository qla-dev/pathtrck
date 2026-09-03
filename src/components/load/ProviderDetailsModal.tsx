import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Building2, FileText, MapPin, ShieldCheck, Star, Truck, UserRound, X } from 'lucide-react';

import type { Language } from '../../types';

type ProviderDetailsModalProps = {
  open: boolean;
  lang: Language;
  offer: Record<string, unknown> | null;
  onClose: () => void;
};

const COPY = {
  en: {
    title: 'Provider details', verified: 'Verified provider', unverified: 'Verification pending',
    location: 'Location', rating: 'Rating', fleet: 'Fleet', vehicles: 'vehicles',
    equipment: 'Offered equipment', about: 'About provider', noDescription: 'No provider description available.',
    privateContacts: 'Contact details become available after the booking is confirmed.', independent: 'Independent provider', close: 'Close provider details',
  },
  bs: {
    title: 'Detalji providera', verified: 'Verifikovan provider', unverified: 'Verifikacija na čekanju',
    location: 'Lokacija', rating: 'Ocjena', fleet: 'Vozni park', vehicles: 'vozila',
    equipment: 'Ponuđena oprema', about: 'O provideru', noDescription: 'Opis providera nije dostupan.',
    privateContacts: 'Kontaktni podaci postaju dostupni nakon potvrđenog bookinga.', independent: 'Samostalni provider', close: 'Zatvori detalje providera',
  },
  de: {
    title: 'Anbieterdetails', verified: 'Verifizierter Anbieter', unverified: 'Verifizierung ausstehend',
    location: 'Standort', rating: 'Bewertung', fleet: 'Fuhrpark', vehicles: 'Fahrzeuge',
    equipment: 'Angebotene Ausrüstung', about: 'Über den Anbieter', noDescription: 'Keine Anbieterbeschreibung verfügbar.',
    privateContacts: 'Kontaktdaten werden nach Bestätigung der Buchung sichtbar.', independent: 'Unabhängiger Anbieter', close: 'Anbieterdetails schließen',
  },
} as const;

export const ProviderDetailsModal = ({ open, lang, offer, onClose }: ProviderDetailsModalProps) => {
  const text = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  const company = (offer?.company || {}) as Record<string, unknown>;
  const creator = (offer?.creator || {}) as Record<string, unknown>;
  const driver = (offer?.driver || {}) as Record<string, unknown>;
  const isCompany = Boolean(company.id);
  const name = String(company.name || creator.name || driver.name || text.independent);
  const location = [company.city, company.country_code || creator.country_code].filter(Boolean).join(', ') || '—';
  const rating = Number(company.average_rating || driver.rating || 0);
  const reviewCount = Number(company.reviews_count || driver.reviews_count || 0);
  const vehicleCount = Number(company.vehicles_count || 0);
  const logo = String(company.logo_url || creator.avatar_url || driver.avatar_url || '');
  const equipment = String(offer?.equipment_type || ((offer?.vehicle || {}) as Record<string, unknown>).vehicle_type || '—');
  const verified = Boolean(company.verified_at || driver.verified_at);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  return createPortal(
    <AnimatePresence>
      {open && offer && (
        <motion.div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="provider-details-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.div
            className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800 md:px-7">
              <div className="flex items-center gap-2 text-primary">
                {isCompany ? <Building2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                <h2 id="provider-details-title" className="font-black">{text.title}</h2>
              </div>
              <button type="button" onClick={onClose} aria-label={text.close} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:text-primary dark:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="overflow-y-auto p-5 md:p-7">
              <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/50 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-3xl font-black text-primary dark:border-slate-700 dark:bg-slate-900">
                  {logo ? <img src={logo} alt="" className="h-full w-full object-contain p-2" /> : name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{name}</h3>
                  <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${verified ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    <ShieldCheck className="h-4 w-4" />{verified ? text.verified : text.unverified}
                  </div>
                </div>
              </section>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Detail icon={MapPin} label={text.location} value={location} />
                <Detail icon={Star} label={text.rating} value={rating > 0 ? `${rating.toFixed(1)} (${reviewCount})` : '—'} />
                <Detail icon={Truck} label={text.fleet} value={vehicleCount > 0 ? `${vehicleCount} ${text.vehicles}` : '—'} />
                <Detail icon={Truck} label={text.equipment} value={equipment} />
              </div>

              <section className="mt-4 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <h4 className="flex items-center gap-2 font-black text-slate-900 dark:text-white"><FileText className="h-4 w-4 text-primary" />{text.about}</h4>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">{String(company.description || text.noDescription)}</p>
              </section>

              <p className="mt-4 rounded-xl bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">{text.privateContacts}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

const Detail = ({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400"><Icon className="h-4 w-4 text-primary" />{label}</div>
    <p className="mt-2 truncate text-sm font-bold text-slate-900 dark:text-white">{value}</p>
  </div>
);
