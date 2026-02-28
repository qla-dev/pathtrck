import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Package as PackageIcon, 
  Settings, 
  Plus, 
  Search, 
  History, 
  Truck, 
  Map as MapIcon, 
  BarChart3, 
  Globe, 
  User, 
  ChevronDown,
  ChevronRight, 
  Menu, 
  X, 
  Moon, 
  Sun, 
  Bell, 
  ShieldCheck, 
  Camera,
  LayoutDashboard,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Types & Services
import { Role, Language, Package, Load, RouteLog } from './types';
import { MOCK_PACKAGES, MOCK_LOADS, MOCK_ROUTES } from './mockData';
import { getSmartStatusUpdate, getRouteInsights } from './services/geminiService';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fix Leaflet marker icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// --- Components ---

const PostLoadModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Plus className="text-primary w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold dark:text-white">Post New Load</h3>
              <p className="text-xs text-slate-500">Create a new logistics request for drivers</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Pickup Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="City, Country" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Delivery Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="City, Country" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Cargo Weight (kg)</label>
              <input type="number" placeholder="0.00" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Cargo Type</label>
              <select className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm appearance-none">
                <option>General Cargo</option>
                <option>Perishable</option>
                <option>Hazardous</option>
                <option>Fragile</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Additional Notes</label>
            <textarea placeholder="Special handling instructions..." className="w-full h-24 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary resize-none text-sm" />
          </div>
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={onClose}>Post Load</Button>
        </div>
      </motion.div>
    </div>
  );
};

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'outline', size?: 'sm' | 'md' | 'lg' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-dark shadow-md cursor-pointer',
      secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 cursor-pointer',
      ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer',
      outline: 'bg-transparent border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer'
    };
    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };
    return (
      <button
        ref={ref}
        className={cn('inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50', variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

const Card = ({ children, className, title, headerAction, ...props }: { children: React.ReactNode, className?: string, title?: string, headerAction?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden", className)} {...props}>
    {title && (
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {headerAction}
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

// --- Views ---

const languages: { id: Language, flag: string, label: string }[] = [
  { id: 'en', flag: '🇺🇸', label: 'English' },
  { id: 'bs', flag: '🇧🇦', label: 'Bosanski' },
  { id: 'de', flag: '🇩🇪', label: 'Deutsch' },
];

const translations = {
  en: {
    features: "Features",
    network: "Network",
    enterprise: "Enterprise",
    pricing: "Pricing",
    logIn: "Log In",
    getStarted: "Get Started",
    heroTitle: "MOVE FASTER THAN EVER.",
    heroSubtitle: "The world's most advanced platform for package tracking, fleet management, and real-time logistics optimization.",
    trackShipment: "Track Shipment",
    postLoad: "Post Load",
    trackingPlaceholder: "Enter tracking number (e.g. PT-123456)",
    trackButton: "Track Now",
    loadTitle: "Need to move cargo?",
    loadSubtitle: "Connect with our network of 50,000+ verified drivers across Europe and the US.",
    postLoadButton: "Post a Load",
    trustedBy: "Trusted by Industry Leaders.",
    accountSettings: "Account Settings",
    support: "Support",
    documentation: "Documentation",
    logOut: "Log Out",
    welcome: "Welcome back",
    dashboard: "Dashboard",
    tracking: "Tracking",
    myFleet: "My Fleet",
    history: "History",
    settings: "Settings",
    homeFeed: "Home Feed",
    trailer: "Trailer",
    tailLift: "Tail Lift",
    username: "Username",
    password: "Password",
    licensePlate: "License Plate",
    selectFuel: "Select Fuel",
    yes: "YES",
    no: "NO",
    continue: "Continue",
    back: "Back",
    completeSetup: "Complete Setup"
  },
  bs: {
    features: "Karakteristike",
    network: "Mreža",
    enterprise: "Preduzeće",
    pricing: "Cijene",
    logIn: "Prijava",
    getStarted: "Započni",
    heroTitle: "KREĆI SE BRŽE NEGO IKAD.",
    heroSubtitle: "Najnaprednija svjetska platforma za praćenje paketa, upravljanje flotom i optimizaciju logistike u stvarnom vremenu.",
    trackShipment: "Prati pošiljku",
    postLoad: "Objavi teret",
    trackingPlaceholder: "Unesite broj za praćenje (npr. PT-123456)",
    trackButton: "Prati odmah",
    loadTitle: "Trebate prevesti teret?",
    loadSubtitle: "Povežite se s našom mrežom od 50,000+ provjerenih vozača širom Evrope i SAD-a.",
    postLoadButton: "Objavi teret",
    trustedBy: "Povjerenje industrijskih lidera.",
    accountSettings: "Postavke računa",
    support: "Podrška",
    documentation: "Dokumentacija",
    logOut: "Odjava",
    welcome: "Dobrodošli nazad",
    dashboard: "Kontrolna tabla",
    tracking: "Praćenje",
    myFleet: "Moja flota",
    history: "Historija",
    settings: "Postavke",
    homeFeed: "Novosti",
    trailer: "Prikolica",
    tailLift: "Rampa",
    username: "Korisničko ime",
    password: "Lozinka",
    licensePlate: "Registarska oznaka",
    selectFuel: "Odaberi gorivo",
    yes: "DA",
    no: "NE",
    continue: "Nastavi",
    back: "Nazad",
    completeSetup: "Završi podešavanje"
  },
  de: {
    features: "Funktionen",
    network: "Netzwerk",
    enterprise: "Unternehmen",
    pricing: "Preise",
    logIn: "Anmelden",
    getStarted: "Loslegen",
    heroTitle: "SCHNELLER ALS JE ZUVOR.",
    heroSubtitle: "Die weltweit fortschrittlichste Plattform für Paketverfolgung, Flottenmanagement und Echtzeit-Logistikoptimierung.",
    trackShipment: "Sendung verfolgen",
    postLoad: "Ladung posten",
    trackingPlaceholder: "Sendungsnummer eingeben (z.B. PT-123456)",
    trackButton: "Jetzt verfolgen",
    loadTitle: "Müssen Sie Fracht bewegen?",
    loadSubtitle: "Verbinden Sie sich mit unserem Netzwerk von über 50.000 verifizierten Fahrern in ganz Europa und den USA.",
    postLoadButton: "Ladung posten",
    trustedBy: "Vertrauen von Branchenführern.",
    accountSettings: "Kontoeinstellungen",
    support: "Support",
    documentation: "Dokumentation",
    logOut: "Abmelden",
    welcome: "Willkommen zurück",
    dashboard: "Dashboard",
    tracking: "Sendungsverfolgung",
    myFleet: "Meine Flotte",
    history: "Verlauf",
    settings: "Einstellungen",
    homeFeed: "Home Feed",
    trailer: "Anhänger",
    tailLift: "Hebebühne",
    username: "Benutzername",
    password: "Passwort",
    licensePlate: "Kennzeichen",
    selectFuel: "Kraftstoff wählen",
    yes: "JA",
    no: "NEIN",
    continue: "Weiter",
    back: "Zurück",
    completeSetup: "Setup abschließen"
  }
};

const LandingPage = ({ 
  onStart, 
  isDark, 
  setIsDark, 
  lang, 
  setLang 
}: { 
  onStart: () => void, 
  isDark: boolean, 
  setIsDark: (v: boolean) => void, 
  lang: Language, 
  setLang: (l: Language) => void 
}) => {
  const [formType, setFormType] = useState<'track' | 'load'>('track');
  const SECTION_PADDING = "py-32";
  const t = translations[lang || 'en'];
  const partners = [
    "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/b/b3/DHL_Express_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/a/a2/FedEx_Express_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/b/b9/UPS_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/4/4b/United_States_Postal_Service_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/d/d5/DPD_logo.svg",
  ];

  const currentLang = languages.find(l => l.id === (lang || 'en')) || languages[0];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Truck className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-display font-bold tracking-tight text-slate-900 dark:text-white">PathTracker.ai</span>
          </div>
          <div className="hidden lg:flex items-center gap-10 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <a href="#features" className="hover:text-primary transition-colors">{t.features}</a>
            <a href="#network" className="hover:text-primary transition-colors">{t.network}</a>
            <a href="#enterprise" className="hover:text-primary transition-colors">{t.enterprise}</a>
            <a href="#pricing" className="hover:text-primary transition-colors">{t.pricing}</a>
          </div>
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                <span>{currentLang.flag}</span>
                <span className="hidden sm:inline">{currentLang.label}</span>
              </button>
              <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-[110]">
                {languages.map(l => (
                  <button 
                    key={l.id}
                    onClick={() => setLang(l.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-xl text-sm font-medium transition-all",
                      (lang || 'en') === l.id ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-primary transition-all cursor-pointer"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button className="hidden sm:block text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors cursor-pointer">{t.logIn}</button>
            <Button onClick={onStart} size="md" className="rounded-full px-6 cursor-pointer">{t.getStarted}</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Editorial Style */}
      <section className={cn("relative min-h-[calc(100vh-80px)] flex items-start", SECTION_PADDING)}>
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-start w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col justify-center pt-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-[0.2em] mb-8 w-fit">
              <Globe className="w-3 h-3" />
              Global Logistics Standard
            </div>
            <h1 className="text-6xl md:text-8xl font-display font-black text-slate-900 dark:text-white leading-[0.9] mb-8">
              {lang === 'bs' ? (
                <>KREĆI SE <br /> <span className="text-primary">BRŽE</span> <br /> NEGO IKAD.</>
              ) : lang === 'de' ? (
                <>SCHNELLER <br /> <span className="text-primary">ALS JE</span> <br /> ZUVOR.</>
              ) : (
                <>MOVE <br /> <span className="text-primary">FASTER</span> <br /> THAN EVER.</>
              )}
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-lg leading-relaxed">
              {t.heroSubtitle}
            </p>
            
            {/* Tracking Form - UPS Inspired */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 mb-10 max-w-xl w-full">
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6 w-fit">
                <button 
                  onClick={() => setFormType('track')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer",
                    formType === 'track' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  {t.trackShipment}
                </button>
                <button 
                  onClick={() => setFormType('load')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer",
                    formType === 'load' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  {t.postLoad}
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                {formType === 'track' ? <PackageIcon className="text-primary w-5 h-5" /> : <Plus className="text-primary w-5 h-5" />}
                <h3 className="font-bold dark:text-white">{formType === 'track' ? t.trackShipment : t.postLoad}</h3>
              </div>
              
              <AnimatePresence mode="wait">
                {formType === 'track' ? (
                  <motion.div 
                    key="track"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <textarea 
                      placeholder={t.trackingPlaceholder}
                      className="w-full h-24 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Numbers usually start with SWP-</p>
                      <Button onClick={onStart} size="lg" className="px-8 rounded-full">{t.trackButton} <ArrowRight className="w-4 h-4 ml-2" /></Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="load"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Pickup Location</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="text" placeholder="City, Country" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Delivery Destination</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="text" placeholder="City, Country" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Cargo Weight (kg)</label>
                        <input type="number" placeholder="0.00" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Cargo Type</label>
                        <select className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm appearance-none">
                          <option>General Cargo</option>
                          <option>Perishable</option>
                          <option>Hazardous</option>
                          <option>Fragile</option>
                        </select>
                      </div>
                    </div>
                    <Button onClick={onStart} size="lg" className="w-full rounded-full mt-2">{t.postLoadButton} <Plus className="w-4 h-4 ml-2" /></Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-950 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <p className="font-bold dark:text-white">12k+ Active Drivers</p>
                <p className="text-slate-500">Trusting PathTracker.ai daily</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative lg:sticky lg:top-32"
          >
            <div className="relative z-10 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] p-4 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] border border-slate-200 dark:border-slate-800">
              <div className="aspect-[4/3] rounded-[2rem] overflow-hidden relative group">
                {/* Google Satellite Map */}
                <MapContainer center={[43.8563, 18.4131]} zoom={15} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer 
                    url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                    subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                    attribution="&copy; Google Maps"
                  />
                  <Marker position={[43.8563, 18.4131]} />
                </MapContainer>
                
                {/* Map Chips - Screenshot Inspired */}
                <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-3">
                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 py-2 rounded-2xl shadow-xl border border-white/20 flex items-center gap-2 animate-bounce">
                    <Clock className="text-primary w-4 h-4" />
                    <span className="text-sm font-black text-slate-900 dark:text-white">24 min</span>
                  </div>
                </div>

                <div className="absolute bottom-8 left-8 right-8 z-[1000] flex flex-col gap-4">
                  <div className="flex gap-3">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 py-2 rounded-2xl shadow-xl border border-white/20 flex items-center gap-3 cursor-pointer hover:bg-primary hover:text-white transition-all group">
                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary">
                        <img src="https://picsum.photos/seed/driver/100/100" alt="Driver" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary group-hover:text-white" />
                        <span className="text-xs font-bold uppercase tracking-wider">Chat with Courier</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-2xl p-6 rounded-3xl border border-white/20 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 rounded-full bg-primary text-[10px] font-black uppercase tracking-widest text-white">Live Route</span>
                      <span className="text-xs font-bold text-white/70">ETA 12:45 PM</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                        <Truck className="text-primary w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">SWP-9921-X</p>
                        <p className="text-sm text-white/60">Approaching Sarajevo Hub</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative Blobs */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px] animate-pulse" />
          </motion.div>
        </div>
      </section>

      {/* Section 2: Trust Marquee */}
      <section className="py-12 border-y border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20 overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...partners, ...partners, ...partners].map((logo, i) => (
            <div key={i} className="flex items-center justify-center px-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
              <img src={logo} alt="Partner" className="h-8 md:h-10 w-auto" referrerPolicy="no-referrer" />
            </div>
          ))}
        </div>
        <div className="flex whitespace-nowrap animate-marquee mt-8" style={{ animationDirection: 'reverse' }}>
          {[...partners, ...partners, ...partners].reverse().map((logo, i) => (
            <div key={i} className="flex items-center justify-center px-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
              <img src={logo} alt="Partner" className="h-8 md:h-10 w-auto" referrerPolicy="no-referrer" />
            </div>
          ))}
        </div>
      </section>

      {/* Stats Row - Relocated */}
      <section className={cn("bg-white dark:bg-slate-950 relative overflow-hidden", SECTION_PADDING)}>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-4 gap-12 text-center">
            {[
              { label: "Packages Tracked", value: "2.4B+", sub: "Annually", icon: PackageIcon },
              { label: "Active Drivers", value: "850k+", sub: "Worldwide", icon: User },
              { label: "Countries Covered", value: "192", sub: "Global reach", icon: Globe },
              { label: "Uptime SLA", value: "99.99%", sub: "Enterprise grade", icon: ShieldCheck }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                  <stat.icon className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-primary uppercase tracking-[0.2em] mb-4">{stat.label}</p>
                <p className="text-5xl md:text-7xl font-display font-black text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">{stat.value}</p>
                <p className="text-slate-500 dark:text-slate-400 font-medium">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </section>

      {/* Section 3: Bento Features Grid */}
      <section id="features" className={cn("bg-slate-50 dark:bg-slate-900/50", SECTION_PADDING)}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 dark:text-white tracking-tight">Built for the <br /> <span className="text-primary">Modern Fleet.</span></h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg">Everything you need to manage global logistics at scale, from real-time tracking to AI-powered route optimization.</p>
          </div>
          
          <div className="grid md:grid-cols-12 gap-6 h-auto md:h-[900px]">
            {/* Main Feature */}
            <div className="md:col-span-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] p-12 flex flex-col justify-between border border-slate-100 dark:border-slate-800 group overflow-hidden relative shadow-sm hover:shadow-2xl transition-all duration-500">
              <div className="relative z-10">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                  <MapIcon className="text-white w-8 h-8" />
                </div>
                <h3 className="text-4xl font-bold mb-6 dark:text-white tracking-tight">Real-time Global Visibility</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md text-xl leading-relaxed">Track every package, vehicle, and asset in real-time with sub-meter precision across 180+ countries.</p>
                <div className="mt-8 flex gap-4">
                   <div className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-xs font-bold dark:text-white">99.9% Accuracy</span>
                   </div>
                   <div className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                     <Globe className="w-4 h-4 text-primary" />
                     <span className="text-xs font-bold dark:text-white">Global Coverage</span>
                   </div>
                </div>
              </div>
              <div className="mt-12 relative h-64 md:h-full -mb-12 -mr-12 translate-x-12 translate-y-12 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-1000">
                <img src="https://picsum.photos/seed/map/1200/800" alt="Map UI" className="rounded-tl-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800" referrerPolicy="no-referrer" />
              </div>
            </div>

            {/* Side Feature 1 */}
            <div className="md:col-span-4 bg-primary rounded-[2.5rem] p-12 flex flex-col justify-between text-white shadow-2xl shadow-primary/30 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-10 group-hover:rotate-12 transition-transform">
                  <MessageSquare className="text-white w-8 h-8" />
                </div>
                <h3 className="text-4xl font-bold mb-6 tracking-tight">AI-Powered Insights</h3>
                <p className="text-white/80 text-xl leading-relaxed">Powered by Gemini to provide smart status updates and predictive route optimization.</p>
              </div>
              <div className="relative z-10 mt-8 flex items-center gap-3 font-black text-sm uppercase tracking-[0.2em] group-hover:gap-5 transition-all">
                Learn More <ArrowRight className="w-5 h-5" />
              </div>
              {/* Decorative background element */}
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            </div>

            {/* Bottom Feature 1 */}
            <div className="md:col-span-4 bg-slate-900 rounded-[2.5rem] p-12 flex flex-col justify-between border border-slate-800 group hover:bg-slate-800 transition-colors duration-500">
              <div>
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-10 group-hover:bg-primary transition-all duration-500">
                  <ShieldCheck className="text-white w-8 h-8" />
                </div>
                <h3 className="text-4xl font-bold mb-6 text-white tracking-tight">Enterprise Security</h3>
                <p className="text-slate-400 text-xl leading-relaxed">Military-grade encryption and biometric driver verification for your most sensitive loads.</p>
              </div>
            </div>

            {/* Bottom Feature 2 */}
            <div className="md:col-span-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] p-12 flex items-center gap-12 border border-slate-100 dark:border-slate-800 overflow-hidden group shadow-sm hover:shadow-xl transition-all">
              <div className="flex-1">
                <h3 className="text-4xl font-bold mb-6 dark:text-white tracking-tight">Seamless Integration</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xl leading-relaxed">Connect with Amazon, DHL, FedEx, and 100+ other carriers out of the box.</p>
              </div>
              <div className="hidden lg:flex gap-6">
                <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl flex items-center justify-center p-6 hover:-translate-y-2 transition-transform duration-500">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" alt="Amazon" className="w-full" referrerPolicy="no-referrer" />
                </div>
                <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl flex items-center justify-center p-6 hover:-translate-y-2 transition-transform duration-500 delay-75">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/b/b3/DHL_Express_logo.svg" alt="DHL" className="w-full" referrerPolicy="no-referrer" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: How it Works - Vertical Timeline */}
      <section className={cn("bg-white dark:bg-slate-950", SECTION_PADDING)}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20">
            <div>
              <h2 className="text-4xl md:text-6xl font-display font-bold mb-8 dark:text-white leading-tight">How PathTracker.ai <br /> <span className="text-primary">Works.</span></h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg mb-12">We've simplified the complex world of global logistics into three simple steps.</p>
              <div className="space-y-12 relative">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
                {[
                  { step: "01", title: "Connect your Fleet", desc: "Integrate your existing vehicles or use our driver app to start tracking in minutes." },
                  { step: "02", title: "Optimize Routes", desc: "Our AI engine analyzes traffic, weather, and historical data to find the fastest paths." },
                  { step: "03", title: "Deliver with Confidence", desc: "Real-time updates and automated reporting keep your customers informed and happy." }
                ].map((s, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex gap-10 relative z-10"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-primary/20">
                      {s.step}
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold mb-2 dark:text-white">{s.title}</h4>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="sticky top-32">
                <img src="https://picsum.photos/seed/logistics/800/1000" alt="Logistics" className="rounded-[3rem] shadow-2xl" referrerPolicy="no-referrer" />
                <div className="absolute -bottom-10 -right-10 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-xs">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                    </div>
                    <p className="font-bold dark:text-white">Route Optimized</p>
                  </div>
                  <p className="text-xs text-slate-500">AI reduced delivery time by 24% for this route.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: The Experience / Dashboard Preview */}
      <section className={cn("bg-slate-900 overflow-hidden relative", SECTION_PADDING)}>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative order-2 lg:order-1">
               <motion.div 
                 initial={{ x: -100, opacity: 0 }}
                 whileInView={{ x: 0, opacity: 1 }}
                 transition={{ duration: 0.8 }}
                 className="bg-slate-800 rounded-[2.5rem] p-4 shadow-2xl border border-slate-700"
               >
                 <img src="https://picsum.photos/seed/dashboard/1000/800" alt="Dashboard" className="rounded-[2rem] shadow-2xl" referrerPolicy="no-referrer" />
               </motion.div>
               <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary rounded-full blur-[80px] opacity-30" />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-8 leading-tight">Control your entire <br /> <span className="text-primary">Operation.</span></h2>
              <div className="space-y-8">
                {[
                  { title: "Unified Dashboard", desc: "One screen to rule them all. Manage drivers, loads, and tracking in one place." },
                  { title: "Smart Notifications", desc: "Get alerted before delays happen with our predictive analytics engine." },
                  { title: "Automated Reporting", desc: "Generate complex logistics reports in seconds, not hours." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="text-primary w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">{item.title}</h4>
                      <p className="text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Pricing - Modern Cards */}
      <section id="pricing" className={cn("bg-white dark:bg-slate-950", SECTION_PADDING)}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 dark:text-white tracking-tight">Simple, Transparent <br /> <span className="text-primary">Pricing.</span></h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg">Choose the plan that fits your business needs. No hidden fees.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Starter", price: "€0", desc: "Perfect for individuals and small shops.", features: ["Up to 50 tracks/mo", "Basic AI updates", "Mobile App access", "Email support"] },
              { name: "Professional", price: "€49", desc: "Best for growing logistics companies.", features: ["Unlimited tracking", "Advanced AI Insights", "Route Optimization", "Priority support"], popular: true },
              { name: "Enterprise", price: "Custom", desc: "For global fleets and large enterprises.", features: ["Custom integrations", "Dedicated account manager", "SLA guarantees", "White-label options"] }
            ].map((plan, i) => (
              <div key={i} className={cn(
                "p-10 rounded-[2.5rem] border flex flex-col justify-between transition-all",
                plan.popular 
                  ? "border-primary bg-primary text-white shadow-2xl shadow-primary/30 scale-105 z-10" 
                  : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-primary/50"
              )}>
                <div>
                  {plan.popular && <span className="px-4 py-1 rounded-full bg-white text-primary text-[10px] font-black uppercase tracking-widest mb-6 inline-block">Most Popular</span>}
                  <h4 className="text-2xl font-bold mb-2">{plan.name}</h4>
                  <p className={cn("text-sm mb-8", plan.popular ? "text-white/70" : "text-slate-500")}>{plan.desc}</p>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-5xl font-black">{plan.price}</span>
                    {plan.price !== "Custom" && <span className="text-sm opacity-70">/month</span>}
                  </div>
                  <ul className="space-y-4">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-3 text-sm font-medium">
                        <CheckCircle2 className={cn("w-5 h-5", plan.popular ? "text-white" : "text-primary")} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant={plan.popular ? "secondary" : "primary"} className={cn("w-full mt-10 h-14 rounded-full font-bold", plan.popular ? "bg-white text-primary hover:bg-slate-100" : "")}>
                  {plan.price === "Custom" ? "Contact Sales" : "Get Started"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7: Testimonials - Wall of Love */}
      <section className={cn("bg-slate-50 dark:bg-slate-900/20", SECTION_PADDING)}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 dark:text-white tracking-tight">
              {t.trustedBy.split(' ').map((word, i) => (
                <React.Fragment key={i}>
                  {i === 2 ? <><br /> <span className="text-primary">{word}</span></> : word + ' '}
                </React.Fragment>
              ))}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Sarah Jenkins", role: "Logistics Director, TechCorp", text: "PathTracker.ai has completely transformed how we handle our last-mile deliveries. The AI insights are a game changer." },
              { name: "Marco Rossi", role: "Fleet Manager, EuroTrans", text: "The real-time visibility is the best we've ever seen. Our drivers love the intuitive mobile app." },
              { name: "Elena Petrova", role: "CEO, GlobalShip", text: "Scaling our operations across Europe was seamless with PathTracker.ai's multi-carrier integration." },
              { name: "David Chen", role: "Operations Lead, FastMove", text: "The automated reporting saves our team at least 15 hours a week. Highly recommended for any serious fleet." },
              { name: "Amira Al-Fayed", role: "Founder, DesertLogistics", text: "We needed a secure, enterprise-grade solution for our high-value loads. PathTracker.ai delivered exactly that." },
              { name: "Lukas Weber", role: "Supply Chain Manager, AlpineGoods", text: "The route optimization engine is incredibly accurate. We've seen a 20% reduction in fuel costs." }
            ].map((t, i) => (
              <Card key={i} className="p-8 hover:border-primary/50 transition-all">
                <div className="flex gap-1 text-amber-400 mb-6">
                  {[1,2,3,4,5].map(star => <Globe key={star} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <img src={`https://picsum.photos/seed/person${i}/100/100`} alt={t.name} referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: Final CTA */}
      <section className={cn("px-6", SECTION_PADDING)}>
        <div className="max-w-7xl mx-auto bg-primary rounded-[3rem] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-2xl shadow-primary/40">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-7xl font-display font-black mb-8">READY TO <br /> START MOVING?</h2>
            <p className="text-xl text-white/70 mb-12 max-w-xl mx-auto">Join thousands of companies optimizing their logistics with PathTracker.ai today.</p>
            <div className="flex flex-wrap justify-center gap-6">
              <Button onClick={onStart} variant="secondary" size="lg" className="px-12 h-16 rounded-full text-lg font-bold text-primary bg-white hover:bg-slate-100">Get Started Now</Button>
              <Button variant="outline" size="lg" className="px-12 h-16 rounded-full text-lg font-bold border-white text-white hover:bg-white/10">Contact Sales</Button>
            </div>
          </div>
          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        </div>
      </section>

      {/* Footer */}
      <footer className={cn("bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900", SECTION_PADDING)}>
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Truck className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-display font-bold tracking-tight text-slate-900 dark:text-white">PathTracker.ai</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">
              The next-generation logistics platform for the modern world. Built with precision, powered by AI.
            </p>
            <div className="flex gap-4">
              {/* Social icons placeholder */}
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center hover:bg-primary hover:text-white transition-all cursor-pointer">
                  <Globe className="w-5 h-5" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h5 className="font-bold mb-6 dark:text-white">Product</h5>
            <ul className="space-y-4 text-slate-500 dark:text-slate-400 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">Tracking</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Fleet Management</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">AI Insights</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API Docs</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-6 dark:text-white">Company</h5>
            <ul className="space-y-4 text-slate-500 dark:text-slate-400 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Press</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-slate-100 dark:border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-bold uppercase tracking-widest">
          <p>© 2026 SWIFTPATH LOGISTICS INC. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const Onboarding = ({ 
  lang: initialLang, 
  setLang: setGlobalLang, 
  onComplete 
}: { 
  lang: Language, 
  setLang: (l: Language) => void, 
  onComplete: (role: Role, lang: Language) => void 
}) => {
  const [step, setStep] = useState(2);
  const [role, setRole] = useState<Role>(null);
  const [lang, setLang] = useState<Language>(initialLang || 'en');
  const [driverData, setDriverData] = useState({ 
    name: '', 
    country: '', 
    username: '',
    password: '',
    idPhoto: null as string | null 
  });
  const [driverType, setDriverType] = useState<'private' | 'company' | null>(null);
  const [companyData, setCompanyData] = useState({ name: '', taxId: '', address: '' });
  const [carData, setCarData] = useState({ 
    make: '', 
    model: '', 
    year: '', 
    plate: '', 
    fuelType: '',
    hasTrailer: false,
    trailerCount: 0,
    hasTailLift: false,
    photo: null as string | null, 
    isDetecting: false 
  });

  const t = translations[lang || 'en'];

  const handleNext = () => {
    if (step === 1 && lang) setStep(2);
    else if (step === 2 && role) {
      if (role === 'user') onComplete(role, lang);
      else setStep(3);
    }
    else if (step === 3 && driverData.name && driverData.country && driverData.username && driverData.password && driverData.idPhoto) {
      setStep(5); // Go to Driver Type
    }
    else if (step === 5 && driverType) {
      if (driverType === 'company') setStep(6);
      else setStep(4);
    }
    else if (step === 6 && companyData.name && companyData.taxId) {
      setStep(4);
    }
    else if (step === 4 && carData.make && carData.model && carData.plate && carData.fuelType) {
      onComplete(role, lang);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <AnimatePresence mode="wait">
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <User className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold dark:text-white">Who are you?</h2>
                <p className="text-slate-500 text-sm mt-2">Select your role to personalize your experience</p>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={() => setRole('user')}
                  className={cn("w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left", role === 'user' ? "border-primary bg-primary/5" : "border-slate-100 dark:border-slate-800 hover:border-slate-200")}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <PackageIcon className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">I'm a Customer</p>
                    <p className="text-xs text-slate-500">I want to track packages & post loads</p>
                  </div>
                </button>
                <button 
                  onClick={() => setRole('driver')}
                  className={cn("w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left", role === 'driver' ? "border-primary bg-primary/5" : "border-slate-100 dark:border-slate-800 hover:border-slate-200")}
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Truck className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">I'm a Driver</p>
                    <p className="text-xs text-slate-500">I want to manage deliveries & loads</p>
                  </div>
                </button>
              </div>
              <Button onClick={handleNext} disabled={!role} className="w-full" size="lg">Continue</Button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold dark:text-white">Driver Verification</h2>
                <p className="text-slate-500 text-sm mt-2">We need a few more details to get you on the road</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t.username}</label>
                    <input 
                      type="text" 
                      placeholder="johndoe123"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                      value={driverData.username}
                      onChange={(e) => setDriverData({...driverData, username: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t.password}</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                      value={driverData.password}
                      onChange={(e) => setDriverData({...driverData, password: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="John Doe"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                    value={driverData.name}
                    onChange={(e) => setDriverData({...driverData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Country</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                    value={driverData.country}
                    onChange={(e) => setDriverData({...driverData, country: e.target.value})}
                  >
                    <option value="">Select Country</option>
                    <option value="BA">Bosnia and Herzegovina</option>
                    <option value="DE">Germany</option>
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">ID Verification</label>
                  <button 
                    onClick={() => setDriverData({...driverData, idPhoto: 'verified'})}
                    className={cn("w-full p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all", driverData.idPhoto ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" : "border-slate-200 dark:border-slate-800 hover:border-primary/50")}
                  >
                    {driverData.idPhoto ? (
                      <>
                        <CheckCircle2 className="text-emerald-500 w-8 h-8" />
                        <span className="text-sm font-bold text-emerald-600">ID Photo Uploaded</span>
                      </>
                    ) : (
                      <>
                        <Camera className="text-slate-400 w-8 h-8" />
                        <span className="text-sm font-bold text-slate-500">Upload Photo of ID</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <Button onClick={handleNext} disabled={!driverData.name || !driverData.country || !driverData.idPhoto} className="w-full" size="lg">Continue</Button>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div 
              key="step5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <Truck className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold dark:text-white">Driver Type</h2>
                <p className="text-slate-500 text-sm mt-2">Are you an independent driver or representing a company?</p>
              </div>
              <div className="space-y-3">
                <button 
                  disabled={driverData.country === 'BA'}
                  onClick={() => setDriverType('private')}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left", 
                    driverType === 'private' ? "border-primary bg-primary/5" : "border-slate-100 dark:border-slate-800 hover:border-slate-200",
                    driverData.country === 'BA' && "opacity-50 cursor-not-allowed grayscale"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <User className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">Private Driver</p>
                    <p className="text-xs text-slate-500">
                      {driverData.country === 'BA' ? "Not allowed in Bosnia" : "Independent contractor"}
                    </p>
                  </div>
                </button>
                <button 
                  onClick={() => setDriverType('company')}
                  className={cn("w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left", driverType === 'company' ? "border-primary bg-primary/5" : "border-slate-100 dark:border-slate-800 hover:border-slate-200")}
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Globe className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">Logistics Company</p>
                    <p className="text-xs text-slate-500">Registered business entity</p>
                  </div>
                </button>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">Back</Button>
                <Button onClick={handleNext} disabled={!driverType} className="flex-1" size="lg">Continue</Button>
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div 
              key="step6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold dark:text-white">Company Information</h2>
                <p className="text-slate-500 text-sm mt-2">Enter your registered business details</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Company Name</label>
                  <input 
                    type="text" 
                    placeholder="Swift Logistics Ltd"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                    value={companyData.name}
                    onChange={(e) => setCompanyData({...companyData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tax ID / VAT Number</label>
                  <input 
                    type="text" 
                    placeholder="EU123456789"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                    value={companyData.taxId}
                    onChange={(e) => setCompanyData({...companyData, taxId: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Business Address</label>
                  <textarea 
                    placeholder="123 Logistics Way, Berlin, Germany"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none h-24 resize-none"
                    value={companyData.address}
                    onChange={(e) => setCompanyData({...companyData, address: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(5)} className="flex-1">Back</Button>
                <Button onClick={handleNext} disabled={!companyData.name || !companyData.taxId} className="flex-1" size="lg">Continue</Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <Truck className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold dark:text-white">Vehicle Details</h2>
                <p className="text-slate-500 text-sm mt-2">Tell us about the vehicle you'll be driving</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Vehicle Photo</label>
                  <div className="relative">
                    <button 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e: any) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = async (re) => {
                              const base64 = re.target?.result as string;
                              setCarData(prev => ({...prev, photo: base64, isDetecting: true}));
                              try {
                                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                                const response = await ai.models.generateContent({
                                  model: 'gemini-3-flash-preview',
                                  contents: {
                                    parts: [
                                      { inlineData: { data: base64.split(',')[1], mimeType: file.type } },
                                      { text: 'Detect the car make, model, year, color, fuel type (Diesel, Gasoline, Electric, Hybrid), if it has a trailer, and if it has a tail lift (loading ramp at the back) from this image. Return the result in JSON format with keys: make, model, year, color, fuelType, hasTrailer (boolean), hasTailLift (boolean).' }
                                    ]
                                  },
                                  config: { responseMimeType: 'application/json' }
                                });
                                const result = JSON.parse(response.text);
                                setCarData(prev => ({
                                  ...prev,
                                  make: result.make || '',
                                  model: result.model || '',
                                  year: result.year || '',
                                  fuelType: result.fuelType || '',
                                  hasTrailer: result.hasTrailer || false,
                                  hasTailLift: result.hasTailLift || false,
                                  isDetecting: false
                                }));
                              } catch (err) {
                                console.error(err);
                                setCarData(prev => ({ ...prev, isDetecting: false }));
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      className={cn("w-full p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all", carData.photo ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" : "border-slate-200 dark:border-slate-800 hover:border-primary/50")}
                    >
                      {carData.isDetecting ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      ) : carData.photo ? (
                        <>
                          <CheckCircle2 className="text-emerald-500 w-8 h-8" />
                          <span className="text-sm font-bold text-emerald-600">Photo Uploaded</span>
                        </>
                      ) : (
                        <>
                          <Camera className="text-slate-400 w-8 h-8" />
                          <span className="text-sm font-bold text-slate-500">Take Photo to Detect AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Make</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Mercedes"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                      value={carData.make}
                      onChange={(e) => setCarData({...carData, make: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Model</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Sprinter"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                      value={carData.model}
                      onChange={(e) => setCarData({...carData, model: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Year</label>
                    <input 
                      type="text" 
                      placeholder="2024"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                      value={carData.year}
                      onChange={(e) => setCarData({...carData, year: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t.selectFuel}</label>
                    <select 
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                      value={carData.fuelType}
                      onChange={(e) => setCarData({...carData, fuelType: e.target.value})}
                    >
                      <option value="">{t.selectFuel}</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Gasoline">Gasoline</option>
                      <option value="Electric">Electric</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="LPG">LPG</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t.licensePlate}</label>
                  <input 
                    type="text" 
                    placeholder="ABC-1234"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                    value={carData.plate}
                    onChange={(e) => setCarData({...carData, plate: e.target.value})}
                  />
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-4">
                  {/* Trailer Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", carData.hasTrailer ? "bg-primary/10 text-primary" : "bg-slate-200 dark:bg-slate-700 text-slate-400")}>
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold dark:text-white">{t.trailer}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Does your vehicle have a trailer?</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setCarData({...carData, hasTrailer: !carData.hasTrailer})}
                      className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer", carData.hasTrailer ? "bg-primary text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500")}
                    >
                      {carData.hasTrailer ? t.yes : t.no}
                    </button>
                  </div>
                  {carData.hasTrailer && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-2 border-t border-slate-200 dark:border-slate-700"
                    >
                      <label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block">Number of Trailers</label>
                      <div className="flex gap-2">
                        {[1, 2, 3].map(num => (
                          <button
                            key={num}
                            onClick={() => setCarData({...carData, trailerCount: num})}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                              carData.trailerCount === num ? "bg-primary text-white" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500"
                            )}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Tail Lift Toggle */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", carData.hasTailLift ? "bg-primary/10 text-primary" : "bg-slate-200 dark:bg-slate-700 text-slate-400")}>
                        <ChevronDown className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold dark:text-white">{t.tailLift}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Does your vehicle have a tail lift?</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setCarData({...carData, hasTailLift: !carData.hasTailLift})}
                      className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer", carData.hasTailLift ? "bg-primary text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500")}
                    >
                      {carData.hasTailLift ? t.yes : t.no}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(driverType === 'company' ? 6 : 5)} className="flex-1 cursor-pointer">{t.back}</Button>
                <Button onClick={handleNext} disabled={!carData.make || !carData.model || !carData.plate || !carData.fuelType} className="flex-1 cursor-pointer" size="lg">{t.completeSetup}</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};

const Dashboard = ({ role }: { role: Role }) => {
  const [isPostLoadOpen, setIsPostLoadOpen] = useState(false);
  const stats = [
    { label: 'Active Packages', value: '12', icon: PackageIcon, color: 'text-blue-500' },
    { label: 'Delivered', value: '142', icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'In Transit', value: '8', icon: Truck, color: 'text-amber-500' },
    { label: 'Avg. Speed', value: '64 km/h', icon: BarChart3, color: 'text-purple-500' },
  ];

  const chartData = [
    { name: 'Mon', packages: 40, efficiency: 85 },
    { name: 'Tue', packages: 30, efficiency: 88 },
    { name: 'Wed', packages: 65, efficiency: 92 },
    { name: 'Thu', packages: 45, efficiency: 90 },
    { name: 'Fri', packages: 90, efficiency: 95 },
    { name: 'Sat', packages: 20, efficiency: 80 },
    { name: 'Sun', packages: 15, efficiency: 75 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">Dashboard Overview</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
          {role === 'user' ? (
            <Button size="sm" onClick={() => setIsPostLoadOpen(true)}><Plus className="w-4 h-4 mr-2" /> Post New Load</Button>
          ) : (
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> New Route</Button>
          )}
        </div>
      </div>

      <PostLoadModal isOpen={isPostLoadOpen} onClose={() => setIsPostLoadOpen(false)} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-slate-50 dark:bg-slate-800", s.color)}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className="text-xl font-bold dark:text-white">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Delivery Performance">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPkgs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00AEEF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00AEEF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="packages" stroke="#00AEEF" strokeWidth={3} fillOpacity={1} fill="url(#colorPkgs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Recent Activity">
          <div className="space-y-6 mt-4">
            {[
              { title: 'Package Delivered', time: '2 mins ago', desc: 'ER217960271BA marked as delivered in Sarajevo.' },
              { title: 'New Load Posted', time: '1 hour ago', desc: 'Electronics Pallets (1.2 Tons) available from Vienna.' },
              { title: 'Route Completed', time: '3 hours ago', desc: 'Driver John Doe completed route R1 (420 km).' },
              { title: 'System Update', time: '5 hours ago', desc: 'Smart tracking algorithms have been optimized.' }
            ].map((a, i) => (
              <div key={i} className="flex gap-4">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                  {i !== 3 && <div className="absolute top-4 left-1 w-px h-full bg-slate-200 dark:bg-slate-800" />}
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold dark:text-white">{a.title}</p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{a.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {role === 'user' && (
        <Card title="My Active Loads" className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Load ID</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Route</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cargo</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {MOCK_LOADS.slice(0, 3).map((load) => (
                  <tr key={load.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 text-sm font-bold dark:text-white">{load.id}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{load.pickup}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>{load.delivery}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-500">{load.cargoType} ({load.weight}kg)</td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        load.status === 'Available' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {load.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500">{load.eta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

const NetworkView = () => {
  const stats = [
    { label: 'Active Hubs', value: '142', icon: Globe, color: 'text-blue-500' },
    { label: 'Fleet Capacity', value: '4.2M Tons', icon: Truck, color: 'text-emerald-500' },
    { label: 'Global Reach', icon: MapIcon, value: '192 Countries', color: 'text-amber-500' },
    { label: 'Avg Delivery', value: '1.8 Days', icon: Clock, color: 'text-primary' }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-black dark:text-white">Global Network</h1>
          <p className="text-slate-500">Real-time overview of our logistics infrastructure</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" size="sm">Download Report</Button>
          <Button size="sm">Manage Hubs</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-2xl bg-slate-50 dark:bg-slate-800", s.color)}>
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-black dark:text-white">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden" title="Live Fleet Distribution">
          <div className="h-[500px] w-full mt-4 relative">
            <MapContainer center={[20, 0]} zoom={2} className="h-full w-full">
              <TileLayer 
                url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                attribution="&copy; Google Maps"
              />
              {[
                { pos: [40.7128, -74.0060], name: 'New York Hub' },
                { pos: [51.5074, -0.1278], name: 'London Hub' },
                { pos: [35.6895, 139.6917], name: 'Tokyo Hub' },
                { pos: [43.8563, 18.4131], name: 'Sarajevo Hub' },
                { pos: [-33.8688, 151.2093], name: 'Sydney Hub' }
              ].map((hub, i) => (
                <Marker key={i} position={hub.pos as [number, number]}>
                  <Popup>{hub.name}</Popup>
                </Marker>
              ))}
            </MapContainer>
            <div className="absolute top-4 right-4 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur p-4 rounded-2xl shadow-xl border border-white/20">
              <p className="text-xs font-bold uppercase tracking-wider mb-2">Live Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium">All systems operational</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Regional Performance">
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Europe', val: 94 },
                  { name: 'N. America', val: 88 },
                  { name: 'Asia', val: 91 },
                  { name: 'Africa', val: 76 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <Tooltip />
                  <Bar dataKey="val" fill="#00AEEF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Fleet Utilization">
             <div className="h-[200px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: 75, fill: '#00AEEF' },
                        { name: 'Maintenance', value: 15, fill: '#f59e0b' },
                        { name: 'Idle', value: 10, fill: '#ef4444' }
                      ]}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="flex justify-center gap-4 text-xs font-bold uppercase">
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /> Active</div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Maint.</div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Idle</div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const TrackingView = () => {
  const [selectedPackage, setSelectedPackage] = useState<Package>(MOCK_PACKAGES[0]);
  const [smartStatus, setSmartStatus] = useState<string>("");

  useEffect(() => {
    getSmartStatusUpdate(selectedPackage.status, selectedPackage.history[0].location).then(setSmartStatus);
  }, [selectedPackage]);

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      {/* Sidebar List */}
      <div className="lg:col-span-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search tracking number..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-2">
          {MOCK_PACKAGES.map(pkg => (
            <button 
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg)}
              className={cn(
                "w-full p-4 rounded-2xl border text-left transition-all",
                selectedPackage.id === pkg.id 
                  ? "border-primary bg-primary/5 shadow-sm" 
                  : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{pkg.carrier}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                  pkg.status === 'Delivered' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                )}>{pkg.status}</span>
              </div>
              <p className="font-bold dark:text-white">{pkg.trackingNumber}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                <MapPin className="w-3 h-3" />
                <span>{pkg.destination}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Tracking Content (Amazon Inspired) */}
      <div className="lg:col-span-8 space-y-6">
        <div className="amazon-card">
          <div className="amazon-header flex items-center justify-between">
            <div className="flex gap-8">
              <div>
                <p className="text-[10px] uppercase text-slate-500">Ordered on</p>
                <p className="font-bold">Feb 26, 2026</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500">Total</p>
                <p className="font-bold">€12.99</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500">Ship to</p>
                <p className="font-bold text-primary flex items-center gap-1 cursor-pointer">
                  John Doe <ChevronRight className="w-3 h-3" />
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase text-slate-500">Order # {selectedPackage.trackingNumber}</p>
              <div className="flex gap-4 mt-1 text-xs font-medium text-primary">
                <span className="cursor-pointer hover:underline">View order details</span>
                <span className="cursor-pointer hover:underline">Invoice</span>
              </div>
            </div>
          </div>
          <div className="amazon-body">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <h2 className="text-xl font-bold text-emerald-600 mb-4">
                  {selectedPackage.status === 'Delivered' ? 'Delivered Today' : 'Arriving by 8 PM'}
                </h2>
                <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full mb-8">
                  <div className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full" style={{ width: '75%' }} />
                  <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900" />
                  <div className="absolute top-1/2 -translate-y-1/2 left-[37.5%] w-4 h-4 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900" />
                  <div className="absolute top-1/2 -translate-y-1/2 left-[75%] w-4 h-4 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900" />
                  <div className="absolute top-1/2 -translate-y-1/2 right-0 w-4 h-4 bg-slate-300 dark:bg-slate-700 rounded-full border-4 border-white dark:border-slate-900" />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Ordered</span>
                  <span>Shipped</span>
                  <span>Out for delivery</span>
                  <span>Arriving</span>
                </div>

                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex gap-4">
                  <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                    <MessageSquare className="text-primary w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary uppercase">Smart Status (AI)</p>
                    <p className="text-sm dark:text-slate-200 italic">"{smartStatus}"</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Button className="w-full">Track Package</Button>
                <Button variant="outline" className="w-full">Return or replace items</Button>
                <Button variant="outline" className="w-full">Share tracking</Button>
                <Button variant="outline" className="w-full">Write a product review</Button>
              </div>
            </div>
          </div>
        </div>

        <Card title="Live Location">
          <div className="h-[400px] rounded-xl overflow-hidden relative">
             <MapContainer center={selectedPackage.currentLocation} zoom={13} className="h-full w-full">
                <TileLayer 
                  url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                  subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                  attribution="&copy; Google Maps"
                />
                <Marker position={selectedPackage.currentLocation}>
                  <Popup>
                    <div className="p-2">
                      <p className="font-bold">{selectedPackage.trackingNumber}</p>
                      <p className="text-xs text-slate-500">{selectedPackage.status}</p>
                    </div>
                  </Popup>
                </Marker>
             </MapContainer>
          </div>
        </Card>

        <Card title="Tracking History">
          <div className="space-y-6">
            {selectedPackage.history.map((h, i) => (
              <div key={i} className="flex gap-6">
                <div className="w-24 text-right">
                  <p className="text-xs font-bold dark:text-white">{h.date.split(',')[0]}</p>
                  <p className="text-[10px] text-slate-400 uppercase">{h.date.split(',')[1]}</p>
                </div>
                <div className="relative">
                  <div className={cn("w-3 h-3 rounded-full mt-1", i === 0 ? "bg-primary" : "bg-slate-300 dark:bg-slate-700")} />
                  {i !== selectedPackage.history.length - 1 && <div className="absolute top-4 left-1.5 w-px h-full bg-slate-200 dark:bg-slate-800" />}
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-white">{h.status}</p>
                  <p className="text-xs text-slate-500">{h.location}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const HomeFeed = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">Available Loads</h1>
        <div className="flex gap-2">
           <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
           <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Post Load</Button>
        </div>
      </div>

      <div className="space-y-4">
        {MOCK_LOADS.map(load => (
          <Card key={load.id} className="hover:border-primary/50 transition-all cursor-pointer group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Truck className="text-slate-500 group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-lg dark:text-white">{load.title}</h3>
                  <p className="text-sm text-slate-500">{load.author} • {load.date}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold dark:text-slate-300">
                  {load.weight}
                </div>
                <div className="text-xl font-black text-primary">
                  {load.price}
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium dark:text-slate-300">{load.pickup}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-medium dark:text-slate-300">{load.delivery}</span>
              </div>
              <div className="ml-auto">
                <Button size="sm" variant="ghost">View Details <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const HistoryView = () => {
  const [selectedRoute, setSelectedRoute] = useState<RouteLog>(MOCK_ROUTES[0]);
  const [insights, setInsights] = useState("");

  useEffect(() => {
    getRouteInsights(['Vienna', 'Prague', 'Berlin']).then(setInsights);
  }, [selectedRoute]);

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 space-y-4">
        <h2 className="text-xl font-bold dark:text-white">Route History</h2>
        <div className="space-y-2">
          {MOCK_ROUTES.map(route => (
            <button 
              key={route.id}
              onClick={() => setSelectedRoute(route)}
              className={cn(
                "w-full p-4 rounded-2xl border text-left transition-all",
                selectedRoute.id === route.id ? "border-primary bg-primary/5" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400">{route.date}</span>
                <span className="text-xs font-bold text-primary">{route.distance}</span>
              </div>
              <div className="flex items-center gap-4 text-sm font-bold dark:text-white">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {route.duration}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {route.stops} stops
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="lg:col-span-8 space-y-6">
        <Card title="Route Path">
          <div className="h-[400px] rounded-xl overflow-hidden relative">
            <MapContainer center={selectedRoute.path[0]} zoom={8} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Polyline positions={selectedRoute.path} color="#00AEEF" weight={4} />
              {selectedRoute.path.map((pos, i) => (
                <Marker key={i} position={pos}>
                  <Popup>Stop {i + 1}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </Card>
        <Card title="AI Route Insights">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <BarChart3 className="text-primary w-5 h-5" />
            </div>
            <div>
              <p className="text-sm dark:text-slate-200 leading-relaxed italic">"{insights}"</p>
              <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold">Generated by PathTracker.ai AI</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const FleetView = () => {
  const fleetData = [
    { name: 'Mon', fuel: 400, efficiency: 85 },
    { name: 'Tue', fuel: 300, efficiency: 88 },
    { name: 'Wed', fuel: 500, efficiency: 82 },
    { name: 'Thu', fuel: 280, efficiency: 91 },
    { name: 'Fri', fuel: 390, efficiency: 87 },
    { name: 'Sat', fuel: 200, efficiency: 94 },
    { name: 'Sun', fuel: 150, efficiency: 96 },
  ];

  const vehicles = [
    { id: 'V1', model: 'Mercedes Sprinter', plate: 'BA-123-XY', status: 'Active', fuel: '75%', fuelType: 'Diesel', trailer: 'No', tailLift: 'Yes', nextService: '12 May', location: [43.8563, 18.4131] },
    { id: 'V2', model: 'Volkswagen Crafter', plate: 'DE-992-AB', status: 'Maintenance', fuel: '20%', fuelType: 'Diesel', trailer: 'Yes (1)', tailLift: 'No', nextService: 'Tomorrow', location: [43.8463, 18.4031] },
    { id: 'V3', model: 'Iveco Daily', plate: 'UK-881-ZZ', status: 'Idle', fuel: '95%', fuelType: 'Electric', trailer: 'No', tailLift: 'Yes', nextService: '28 June', location: [43.8663, 18.4231] },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold dark:text-white">My Fleet</h1>
          <p className="text-slate-500">Manage and monitor your vehicle assets</p>
        </div>
        <Button className="rounded-full">
          <Plus className="w-4 h-4 mr-2" /> Add Vehicle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Vehicles', value: '12', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Active Now', value: '8', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'In Maintenance', value: '2', icon: Settings, color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'Avg Efficiency', value: '89%', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-100' },
        ].map((stat, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black dark:text-white">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Fuel Consumption & Efficiency" className="lg:col-span-2">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fleetData}>
                <defs>
                  <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00AEEF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00AEEF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="fuel" stroke="#00AEEF" fillOpacity={1} fill="url(#colorFuel)" />
                <Line type="monotone" dataKey="efficiency" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Maintenance Alerts">
          <div className="space-y-4">
            {vehicles.filter(v => v.status === 'Maintenance' || v.nextService === 'Tomorrow').map((v, i) => (
              <div key={i} className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 flex items-start gap-4">
                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                  <Settings className="text-amber-600 w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-white">{v.model}</p>
                  <p className="text-xs text-slate-500">Service due: <span className="font-bold text-amber-600">{v.nextService}</span></p>
                  <Button size="sm" variant="outline" className="mt-2 h-7 text-[10px] rounded-full">Schedule Now</Button>
                </div>
              </div>
            ))}
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-emerald-500 w-5 h-5" />
                <span className="text-sm font-medium dark:text-white">All other vehicles safe</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </Card>
      </div>

      <Card title="Vehicle Status & Live Tracking">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Vehicle</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">License Plate</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Fuel Type</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Trailer</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Tail Lift</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Status</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Fuel Level</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Next Service</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} className="border-b border-slate-50 dark:border-slate-900 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                        <Truck className="w-4 h-4 text-slate-500" />
                      </div>
                      <span className="text-sm font-bold dark:text-white">{v.model}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-500 font-mono">{v.plate}</td>
                  <td className="p-4 text-sm text-slate-500">{v.fuelType}</td>
                  <td className="p-4 text-sm text-slate-500">{v.trailer}</td>
                  <td className="p-4 text-sm text-slate-500">{v.tailLift}</td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                      v.status === 'Active' ? "bg-emerald-100 text-emerald-600" :
                      v.status === 'Maintenance' ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600"
                    )}>{v.status}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[60px]">
                        <div 
                          className={cn("h-full rounded-full", parseInt(v.fuel) < 30 ? "bg-red-500" : "bg-primary")} 
                          style={{ width: v.fuel }} 
                        />
                      </div>
                      <span className="text-xs font-bold dark:text-white">{v.fuel}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-500">{v.nextService}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors">
                        <MapIcon className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [isLanding, setIsLanding] = useState(true);
  const [role, setRole] = useState<Role>(null);
  const [lang, setLang] = useState<Language>('en');
  const [view, setView] = useState('dashboard');
  const [isDark, setIsDark] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDark]);

  if (isLanding) return (
    <LandingPage 
      onStart={() => setIsLanding(false)} 
      isDark={isDark} 
      setIsDark={setIsDark} 
      lang={lang} 
      setLang={setLang} 
    />
  );
  if (!role) return <Onboarding lang={lang} setLang={setLang} onComplete={(r, l) => { setRole(r); setLang(l); }} />;

  const t = translations[lang || 'en'];

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'tracking', label: t.tracking, icon: PackageIcon },
    { id: 'network', label: t.network, icon: Globe },
    { id: 'feed', label: t.homeFeed, icon: MessageSquare },
    ...(role === 'driver' ? [
      { id: 'fleet', label: t.myFleet, icon: Truck },
      { id: 'history', label: t.history, icon: History }
    ] : []),
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar (Desktop) */}
      <aside className={cn(
        "hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-50 sticky top-0 h-screen",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Truck className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">PathTracker.ai</span>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                view === item.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {isSidebarOpen && <span className="font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen relative">
        {/* Header (Mobile & Desktop) */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="md:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Truck className="text-white w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight dark:text-white">PathTracker.ai</span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm text-slate-500">{t.welcome}, <span className="font-bold text-slate-900 dark:text-white">John Doe</span></p>
          </div>
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                <span>{languages.find(l => l.id === (lang || 'en'))?.flag}</span>
              </button>
              <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-[110]">
                {languages.map(l => (
                  <button 
                    key={l.id}
                    onClick={() => setLang(l.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-xl text-sm font-medium transition-all cursor-pointer",
                      (lang || 'en') === l.id ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-primary transition-all cursor-pointer"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 cursor-pointer">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
            </button>
            
            {/* User Avatar Dropdown */}
            <div className="relative group">
              <button className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 hover:border-primary transition-all">
                <User className="w-5 h-5 text-primary" />
              </button>
              <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-[100]">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                  <p className="text-sm font-bold dark:text-white">John Doe</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{role === 'driver' ? 'Verified Driver' : 'Customer'}</p>
                </div>
                <button className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  <User className="w-4 h-4" />
                  {t.accountSettings}
                </button>
                <button className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  <Globe className="w-4 h-4" />
                  {t.support}
                </button>
                <button className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  <ShieldCheck className="w-4 h-4" />
                  {t.documentation}
                </button>
                <div className="h-px bg-slate-100 dark:border-slate-800 my-2" />
                <button 
                  onClick={() => { setIsLanding(true); setRole(null); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                >
                  <X className="w-4 h-4" />
                  {t.logOut}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="p-6 pb-24 md:pb-6 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'dashboard' && <Dashboard role={role} />}
              {view === 'tracking' && <TrackingView />}
              {view === 'network' && <NetworkView />}
              {view === 'fleet' && <FleetView />}
              {view === 'feed' && <HomeFeed />}
              {view === 'history' && <HistoryView />}
              {view === 'settings' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <h1 className="text-2xl font-bold dark:text-white">Settings</h1>
                  <Card className="p-0">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {[
                        { label: 'Profile Information', icon: User, desc: 'Update your name, email and avatar' },
                        { label: 'Notifications', icon: Bell, desc: 'Configure how you receive alerts' },
                        { label: 'Language & Region', icon: Globe, desc: 'English, Bosnian, Timezone' },
                        { label: 'Security', icon: ShieldCheck, desc: 'Password, 2FA, Session management' },
                        { label: 'Appearance', icon: Moon, desc: 'Dark mode, Theme colors' }
                      ].map((s, i) => (
                        <button key={i} className="w-full p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                              <s.icon className="w-5 h-5 text-slate-500" />
                            </div>
                            <div>
                              <p className="font-bold dark:text-white">{s.label}</p>
                              <p className="text-xs text-slate-500">{s.desc}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300" />
                        </button>
                      ))}
                    </div>
                  </Card>
                  <Button variant="outline" className="w-full text-red-500 border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10" onClick={() => setIsLanding(true)}>Logout</Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Nav (Mobile) */}
        <nav className="md:hidden fixed bottom-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 h-16 flex items-center justify-around z-50">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                view === item.id ? "text-primary" : "text-slate-400"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">{item.label.split(' ')[0]}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}
