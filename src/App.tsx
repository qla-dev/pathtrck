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
  MessageSquare,
  Boxes,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Coins,
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

// Types & Services
import { Role, Language, Load } from './types';
import { MOCK_PACKAGES, MOCK_LOADS, MOCK_ROUTES } from './mockData';
import { ui, trLoadStatus, trPackageStatus, trFuelType } from './i18n';
import { cn } from './lib/cn';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { LoadItem } from './components/load/LoadItem';
import { Dashboard } from './components/views/Dashboard';
import { NetworkView } from './components/views/NetworkView';
import { TrackingView } from './components/views/TrackingView';
import { HomeFeed } from './components/views/HomeFeed';
import { HistoryView } from './components/views/HistoryView';
import { FleetView } from './components/views/FleetView';
import { MessagesView } from './components/views/MessagesView';
import { ProfileView } from './components/views/ProfileView';
import { AutomationsView } from './components/views/AutomationsView';
import { SettingsView } from './components/views/SettingsView';
import { SetupProcess } from './components/auth/SetupProcess';
import { LoginProcess } from './components/auth/LoginProcess';
import { AiRouteCalculatorCard } from './components/ai_automattions/AiRouteCalculatorCard';

// Fix Leaflet marker icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// --- Components ---

type MoleculeNode = {
  id: string;
  x: number;
  y: number;
  radius: number;
  delay: number;
};

const HERO_MOLECULE_NODES: MoleculeNode[] = [
  { id: 'n1', x: 8, y: 26, radius: 0.55, delay: 0.0 },
  { id: 'n2', x: 18, y: 18, radius: 0.75, delay: 0.4 },
  { id: 'n3', x: 31, y: 25, radius: 0.85, delay: 0.9 },
  { id: 'n4', x: 45, y: 17, radius: 0.65, delay: 1.4 },
  { id: 'n5', x: 59, y: 24, radius: 0.95, delay: 0.7 },
  { id: 'n6', x: 73, y: 17, radius: 0.6, delay: 1.1 },
  { id: 'n7', x: 87, y: 27, radius: 0.75, delay: 0.5 },
  { id: 'n8', x: 19, y: 54, radius: 0.7, delay: 1.8 },
  { id: 'n9', x: 35, y: 46, radius: 1.1, delay: 1.3 },
  { id: 'n10', x: 51, y: 56, radius: 0.8, delay: 0.2 },
  { id: 'n11', x: 67, y: 47, radius: 1.0, delay: 1.6 },
  { id: 'n12', x: 82, y: 59, radius: 0.65, delay: 0.1 },
  { id: 'n13', x: 26, y: 79, radius: 0.6, delay: 0.8 },
  { id: 'n14', x: 43, y: 83, radius: 0.9, delay: 1.9 },
  { id: 'n15', x: 61, y: 76, radius: 0.7, delay: 1.0 },
  { id: 'n16', x: 78, y: 85, radius: 0.8, delay: 1.5 },
];

const HERO_MOLECULE_EDGES: Array<[string, string]> = [
  ['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4'], ['n4', 'n5'], ['n5', 'n6'], ['n6', 'n7'],
  ['n2', 'n8'], ['n3', 'n9'], ['n5', 'n10'], ['n6', 'n11'], ['n7', 'n12'],
  ['n8', 'n9'], ['n9', 'n10'], ['n10', 'n11'], ['n11', 'n12'],
  ['n8', 'n13'], ['n9', 'n14'], ['n10', 'n14'], ['n10', 'n15'], ['n11', 'n15'], ['n12', 'n16'],
  ['n13', 'n14'], ['n14', 'n15'], ['n15', 'n16'],
  ['n3', 'n8'], ['n4', 'n9'], ['n5', 'n11'], ['n9', 'n13'], ['n11', 'n16']
];

type ConnectionNode = {
  id: string;
  x: number;
  y: number;
  radius: number;
  delay: number;
};

const HERO_CONNECTION_NODES: ConnectionNode[] = [
  { id: 'sar', x: 27, y: 40, radius: 1.05, delay: 0.0 },
  { id: 'vie', x: 37, y: 26, radius: 0.8, delay: 0.5 },
  { id: 'bud', x: 45, y: 30, radius: 0.75, delay: 1.0 },
  { id: 'zag', x: 19, y: 34, radius: 0.7, delay: 1.3 },
  { id: 'par', x: 10, y: 22, radius: 0.8, delay: 1.7 },
  { id: 'ams', x: 17, y: 14, radius: 0.7, delay: 0.2 },
  { id: 'ber', x: 27, y: 16, radius: 0.75, delay: 0.8 },
  { id: 'ist', x: 57, y: 44, radius: 0.85, delay: 1.1 },
  { id: 'ath', x: 58, y: 59, radius: 0.75, delay: 1.6 },
  { id: 'dub', x: 68, y: 36, radius: 0.8, delay: 0.6 },
  { id: 'nyc', x: 82, y: 27, radius: 1.0, delay: 0.3 },
  { id: 'chi', x: 90, y: 24, radius: 0.75, delay: 1.2 },
  { id: 'mia', x: 93, y: 41, radius: 0.7, delay: 1.9 },
];

const HERO_CONNECTION_EDGES: Array<[string, string]> = [
  ['sar', 'vie'], ['sar', 'bud'], ['sar', 'zag'], ['sar', 'ist'], ['sar', 'dub'],
  ['vie', 'bud'], ['vie', 'ber'], ['ber', 'ams'], ['ams', 'par'], ['zag', 'par'],
  ['bud', 'ist'], ['ist', 'ath'], ['ist', 'dub'], ['dub', 'nyc'], ['nyc', 'chi'],
  ['nyc', 'mia'], ['chi', 'mia'], ['ber', 'nyc']
];

const HERO_ROUTE_START: [number, number] = [53.5511, 9.9937]; // Hamburg
const HERO_ROUTE_END: [number, number] = [43.8563, 18.4131]; // Sarajevo
const HERO_ROUTE_POINTS: [number, number][] = [HERO_ROUTE_START, HERO_ROUTE_END];

type FeatureRouteStop = {
  id: 'zagreb' | 'munich' | 'cologne' | 'amsterdam';
  label: string;
  position: [number, number];
};

const FEATURE_ROUTE_START: [number, number] = [45.815, 15.9819]; // Zagreb
const FEATURE_ROUTE_END: [number, number] = [52.3676, 4.9041]; // Amsterdam
const FEATURE_ROUTE_STOP_1: [number, number] = [48.1351, 11.582]; // Munich
const FEATURE_ROUTE_STOP_2: [number, number] = [50.9375, 6.9603]; // Cologne
const FEATURE_ROUTE_STOPS: FeatureRouteStop[] = [
  { id: 'zagreb', label: 'Zagreb Hub', position: FEATURE_ROUTE_START },
  { id: 'munich', label: 'Munich Stop', position: FEATURE_ROUTE_STOP_1 },
  { id: 'cologne', label: 'Cologne Stop', position: FEATURE_ROUTE_STOP_2 },
  { id: 'amsterdam', label: 'Amsterdam DC', position: FEATURE_ROUTE_END },
];
const FEATURE_ROUTE_POINTS_WITH_STOPS: [number, number][] = [
  ...FEATURE_ROUTE_STOPS.map((stop) => stop.position),
];

const getWaypointMarkerIcon = (selected: boolean) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${selected ? 18 : 14}px;height:${selected ? 18 : 14}px;border-radius:9999px;background:${selected ? '#00AEEF' : '#64748B'};border:2px solid #ffffff;box-shadow:0 0 0 ${selected ? 4 : 0}px ${selected ? 'rgba(0,174,239,0.30)' : 'transparent'};"></div>`,
    iconSize: [selected ? 18 : 14, selected ? 18 : 14],
    iconAnchor: [selected ? 9 : 7, selected ? 9 : 7],
  });

const HeroRouteFitBounds = ({
  points,
  paddingTopLeft = [36, 32],
  paddingBottomRight = [36, 192],
  maxZoom = 4,
}: {
  points: [number, number][];
  paddingTopLeft?: [number, number];
  paddingBottomRight?: [number, number];
  maxZoom?: number;
}) => {
  const map = useMap();

  useEffect(() => {
    const applyBounds = () => {
      map.invalidateSize(false);
      map.fitBounds(points, {
        paddingTopLeft,
        paddingBottomRight,
        maxZoom,
        animate: false,
      });
    };

    const t1 = setTimeout(applyBounds, 0);
    const t2 = setTimeout(applyBounds, 140);
    window.addEventListener('resize', applyBounds);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', applyBounds);
    };
  }, [map, points, paddingTopLeft, paddingBottomRight, maxZoom]);

  return null;
};

const HeroMoleculeBackground = () => {
  const nodeMap = useMemo(
    () => new Map(HERO_MOLECULE_NODES.map((node) => [node.id, node])),
    []
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(56,189,248,0.16),transparent_38%),radial-gradient(circle_at_86%_24%,rgba(14,165,233,0.14),transparent_42%),radial-gradient(circle_at_58%_84%,rgba(59,130,246,0.12),transparent_48%)] dark:bg-[radial-gradient(circle_at_15%_20%,rgba(14,165,233,0.22),transparent_40%),radial-gradient(circle_at_86%_24%,rgba(34,211,238,0.16),transparent_44%),radial-gradient(circle_at_58%_84%,rgba(30,64,175,0.28),transparent_52%)]" />
      <motion.div
        className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-cyan-300/20 blur-[100px] dark:bg-cyan-500/20"
        animate={{ x: [0, 30, -12, 0], y: [0, 18, -10, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-blue-300/20 blur-[120px] dark:bg-blue-600/25"
        animate={{ x: [0, -28, 14, 0], y: [0, -18, 12, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full text-sky-500/35 dark:text-cyan-300/40"
      >
        <motion.g
          animate={{ x: [0, 1.5, -1, 0], y: [0, -1.2, 0.8, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        >
          {HERO_MOLECULE_EDGES.map(([fromId, toId], index) => {
            const from = nodeMap.get(fromId);
            const to = nodeMap.get(toId);

            if (!from || !to) return null;

            return (
              <motion.line
                key={`${fromId}-${toId}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="currentColor"
                strokeWidth={0.22}
                strokeLinecap="round"
                initial={{ pathLength: 0.35, opacity: 0.15 }}
                animate={{ pathLength: [0.35, 1, 0.35], opacity: [0.15, 0.55, 0.15] }}
                transition={{
                  duration: 7 + (index % 5),
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: index * 0.15,
                }}
              />
            );
          })}

          {HERO_MOLECULE_NODES.map((node) => (
            <React.Fragment key={node.id}>
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.radius}
                fill="currentColor"
                initial={{ opacity: 0.25 }}
                animate={{
                  r: [node.radius * 0.85, node.radius * 1.35, node.radius * 0.85],
                  opacity: [0.25, 0.95, 0.25],
                }}
                transition={{
                  duration: 3.8 + node.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: node.delay,
                }}
              />
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.radius * 2}
                fill="none"
                stroke="currentColor"
                strokeWidth={0.08}
                animate={{
                  r: [node.radius * 1.5, node.radius * 3.1, node.radius * 1.5],
                  opacity: [0.04, 0.3, 0.04],
                }}
                transition={{
                  duration: 4.8 + node.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: node.delay * 0.5,
                }}
              />
            </React.Fragment>
          ))}
        </motion.g>
      </svg>
    </div>
  );
};

const HeroConnectionVisual = () => {
  const nodeMap = useMemo(
    () => new Map(HERO_CONNECTION_NODES.map((node) => [node.id, node])),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_14%,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(59,130,246,0.16),transparent_36%),linear-gradient(145deg,rgba(241,245,249,0.45),rgba(224,242,254,0.2)_40%,rgba(186,230,253,0.14))] dark:bg-[radial-gradient(circle_at_12%_14%,rgba(34,211,238,0.22),transparent_36%),radial-gradient(circle_at_84%_18%,rgba(56,189,248,0.2),transparent_38%),linear-gradient(145deg,rgba(15,23,42,0.6),rgba(15,23,42,0.45)_45%,rgba(30,41,59,0.38))]" />
      <div className="absolute inset-0 opacity-28 dark:opacity-18" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
      <svg
        viewBox="0 0 100 75"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full text-sky-500/55 dark:text-cyan-300/65"
      >
        <motion.g
          animate={{ x: [0, 1.2, -0.6, 0], y: [0, -1, 0.7, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        >
          {HERO_CONNECTION_EDGES.map(([fromId, toId], index) => {
            const from = nodeMap.get(fromId);
            const to = nodeMap.get(toId);

            if (!from || !to) return null;

            return (
              <motion.line
                key={`${fromId}-${toId}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth={0.26}
                initial={{ pathLength: 0.2, opacity: 0.18 }}
                animate={{ pathLength: [0.2, 1, 0.2], opacity: [0.18, 0.6, 0.18] }}
                transition={{
                  duration: 6 + (index % 4),
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: index * 0.2,
                }}
              />
            );
          })}

          {HERO_CONNECTION_NODES.map((node) => (
            <React.Fragment key={node.id}>
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.radius}
                fill="currentColor"
                animate={{
                  opacity: [0.4, 1, 0.4],
                  r: [node.radius * 0.9, node.radius * 1.2, node.radius * 0.9],
                }}
                transition={{
                  duration: 3.2 + node.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: node.delay,
                }}
              />
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.radius * 2.2}
                fill="none"
                stroke="currentColor"
                strokeWidth={0.08}
                animate={{
                  r: [node.radius * 1.6, node.radius * 3.2, node.radius * 1.6],
                  opacity: [0.06, 0.35, 0.06],
                }}
                transition={{
                  duration: 4.6 + node.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: node.delay * 0.4,
                }}
              />
            </React.Fragment>
          ))}
        </motion.g>
      </svg>
    </div>
  );
};

// --- Views ---

const languages: { id: Language, flag: string, label: string }[] = [
  { id: 'en', flag: '🇺🇸', label: 'English' },
  { id: 'bs', flag: '🇧🇦', label: 'Bosanski' },
  { id: 'de', flag: '🇩🇪', label: 'Deutsch' },
];

const flagCodeByLanguage: Record<Exclude<Language, null>, string> = {
  en: 'us',
  bs: 'ba',
  de: 'de',
};

const getFlagUrl = (language: Language, width = 20) => {
  const code = flagCodeByLanguage[(language || 'en') as Exclude<Language, null>];
  return `https://flagcdn.com/w${width}/${code}.png`;
};

type HeroTypedMessage = {
  text: string;
  keyword: string;
};

const HERO_MAIN_TITLE_MESSAGES: Record<Exclude<Language, null>, HeroTypedMessage[]> = {
  en: [
    { text: "Connecting drivers faster.", keyword: "drivers" },
    { text: "Matching loads quickly.", keyword: "loads" },
    { text: "Routing fleets better.", keyword: "fleets" },
    { text: "Tracking every mile.", keyword: "mile" },
    { text: "Linking cities live.", keyword: "cities" },
    { text: "Syncing teams daily.", keyword: "teams" },
    { text: "Moving goods on time.", keyword: "goods" },
    { text: "Uniting carriers fast.", keyword: "carriers" },
    { text: "Powering delivery flow.", keyword: "delivery" },
    { text: "Keeping logistics ready.", keyword: "logistics" }
  ],
  bs: [
    { text: "Povezujemo vozače brže.", keyword: "vozače" },
    { text: "Spajamo terete odmah.", keyword: "terete" },
    { text: "Usmjeravamo flote bolje.", keyword: "flote" },
    { text: "Pratimo svaki kilometar.", keyword: "kilometar" },
    { text: "Povezujemo gradove uživo.", keyword: "gradove" },
    { text: "Sinhronizujemo timove dnevno.", keyword: "timove" },
    { text: "Pomjeramo robu na vrijeme.", keyword: "robu" },
    { text: "Ujedinjujemo prevoznike brzo.", keyword: "prevoznike" },
    { text: "Pogonimo isporuke brže.", keyword: "isporuke" },
    { text: "Održavamo logistiku spremnom.", keyword: "logistiku" }
  ],
  de: [
    { text: "Wir verbinden Fahrer schneller.", keyword: "Fahrer" },
    { text: "Wir matchen Ladungen sofort.", keyword: "Ladungen" },
    { text: "Wir steuern Flotten besser.", keyword: "Flotten" },
    { text: "Wir tracken jeden Kilometer.", keyword: "Kilometer" },
    { text: "Wir vernetzen Städte live.", keyword: "Städte" },
    { text: "Wir synchronisieren Teams täglich.", keyword: "Teams" },
    { text: "Wir bewegen Waren pünktlich.", keyword: "Waren" },
    { text: "Wir vereinen Speditionen schnell.", keyword: "Speditionen" },
    { text: "Wir stärken Liefernetze.", keyword: "Liefernetze" },
    { text: "Wir halten Logistik bereit.", keyword: "Logistik" }
  ],
};

const translations = {
  en: {
    features: "Features",
    network: "Network",
    enterprise: "Enterprise",
    pricing: "Pricing",
    logIn: "Log In",
    getStarted: "Get Started",
    heroTitle: "Connecting drivers faster.",
    heroSubtitle: "Connecting drivers faster.",
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
    messages: "Messages",
    history: "History",
    settings: "Settings",
    homeFeed: "Loads Feed",
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
    heroTitle: "Kreći se brže nego ikad.",
    heroSubtitle: "Povezujemo vozače brže.",
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
    messages: "Poruke",
    history: "Historija",
    settings: "Postavke",
    homeFeed: "Feed tereta",
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
    heroTitle: "Schneller als je zuvor.",
    heroSubtitle: "Fahrer schneller verbinden.",
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
    messages: "Nachrichten",
    history: "Verlauf",
    settings: "Einstellungen",
    homeFeed: "Ladungs-Feed",
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
  onLogin,
  isDark, 
  setIsDark, 
  lang, 
  setLang 
}: { 
  onStart: () => void, 
  onLogin: () => void,
  isDark: boolean, 
  setIsDark: (v: boolean) => void, 
  lang: Language, 
  setLang: (l: Language) => void 
}) => {
  const [formType, setFormType] = useState<'track' | 'load'>('track');
  const [selectedWaypoint, setSelectedWaypoint] = useState<FeatureRouteStop['id']>('zagreb');
  const [messageIndex, setMessageIndex] = useState(0);
  const [typedMessage, setTypedMessage] = useState('');
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const SECTION_PADDING = "py-32";
  const t = translations[lang || 'en'];
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const partners = [
    "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/b/b3/DHL_Express_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/a/a2/FedEx_Express_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/b/b9/UPS_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/4/4b/United_States_Postal_Service_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/d/d5/DPD_logo.svg",
  ];

  const activeLang = (lang || 'en') as Exclude<Language, null>;
  const currentLang = languages.find(l => l.id === (lang || 'en')) || languages[0];
  const titleMessages = HERO_MAIN_TITLE_MESSAGES[activeLang] || HERO_MAIN_TITLE_MESSAGES.en;
  const landingLoads = useMemo(() => {
    const loads = MOCK_LOADS.length > 0 ? MOCK_LOADS : [];
    return loads;
  }, []);
  const activeMessageConfig = titleMessages[messageIndex % titleMessages.length];
  const activeKeyword = activeMessageConfig?.keyword ?? '';
  const activeMessageText = activeMessageConfig?.text ?? '';
  const activeKeywordStart = activeKeyword ? activeMessageText.indexOf(activeKeyword) : -1;

  const typedBeforeKeyword = activeKeywordStart >= 0
    ? typedMessage.slice(0, Math.min(typedMessage.length, activeKeywordStart))
    : typedMessage;
  const typedKeyword = activeKeywordStart >= 0 && typedMessage.length > activeKeywordStart
    ? typedMessage.slice(
        activeKeywordStart,
        Math.min(typedMessage.length, activeKeywordStart + activeKeyword.length)
      )
    : '';
  const typedAfterKeyword = activeKeywordStart >= 0
    ? typedMessage.slice(Math.min(typedMessage.length, activeKeywordStart + activeKeyword.length))
    : '';
  const trackerTimeline = [
    {
      time: '06:40',
      title: lang === 'bs' ? 'Polazak iz Zagreb Huba' : lang === 'de' ? 'Abfahrt aus Zagreb Hub' : 'Departed Zagreb Hub',
      note: lang === 'bs' ? 'Potvrđena prijava vozača' : lang === 'de' ? 'Fahrer-Check-in bestätigt' : 'Driver check-in confirmed',
      icon: CheckCircle2,
      iconClass: 'text-emerald-500 bg-emerald-500/12'
    },
    {
      time: '11:10',
      title: lang === 'bs' ? 'Stajanje 1: Minhen' : lang === 'de' ? 'Stopp 1: München' : 'Stop 1: Munich Relay',
      note: lang === 'bs' ? 'Sken tereta i kontrola predaje' : lang === 'de' ? 'Fracht-Scan und Übergabekontrolle' : 'Cargo scan and handoff checkpoint',
      icon: MapPin,
      iconClass: 'text-amber-500 bg-amber-500/12'
    },
    {
      time: '15:45',
      title: lang === 'bs' ? 'Stajanje 2: Keln' : lang === 'de' ? 'Stopp 2: Köln' : 'Stop 2: Cologne Relay',
      note: lang === 'bs' ? 'Odmor vozača i recalculacija rute' : lang === 'de' ? 'Fahrerpause und Routen-Neuberechnung' : 'Driver rest and route recalibration',
      icon: Clock,
      iconClass: 'text-sky-500 bg-sky-500/12'
    },
    {
      time: 'Tomorrow 07:20',
      title: lang === 'bs' ? 'Dolazak: Amsterdam DC' : lang === 'de' ? 'Ankunft: Amsterdam DC' : 'Arrival: Amsterdam DC',
      note: lang === 'bs' ? 'Potvrđen termin istovara' : lang === 'de' ? 'Andock- und Entladefenster bestätigt' : 'Dock and unloading slot confirmed',
      icon: Truck,
      iconClass: 'text-violet-500 bg-violet-500/12'
    },
  ];

  useEffect(() => {
    setMessageIndex(0);
    setTypedMessage('');
    setIsDeletingMessage(false);
  }, [activeLang]);

  useEffect(() => {
    const safeIndex = messageIndex % titleMessages.length;
    const activeMessage = titleMessages[safeIndex]?.text;
    if (!activeMessage) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    if (!isDeletingMessage && typedMessage === activeMessage) {
      timeoutId = setTimeout(() => setIsDeletingMessage(true), 1400);
    } else if (isDeletingMessage && typedMessage.length === 0) {
      timeoutId = setTimeout(() => {
        setIsDeletingMessage(false);
        setMessageIndex((prev) => (prev + 1) % titleMessages.length);
      }, 260);
    } else {
      const speed = isDeletingMessage ? 32 : 56;
      timeoutId = setTimeout(() => {
        setTypedMessage((prev) =>
          isDeletingMessage
            ? prev.slice(0, Math.max(0, prev.length - 1))
            : activeMessage.slice(0, prev.length + 1)
        );
      }, speed);
    }

    return () => clearTimeout(timeoutId);
  }, [typedMessage, isDeletingMessage, messageIndex, titleMessages]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <PackageIcon className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-display font-bold tracking-tight text-slate-900 dark:text-white">CARGO.AI</span>
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
              <button
                aria-label="Language switcher"
                title={currentLang.label}
                className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary hover:scale-105 transition-all cursor-pointer flex items-center justify-center"
              >
                <img
                  src={getFlagUrl(currentLang.id)}
                  srcSet={`${getFlagUrl(currentLang.id, 40)} 2x`}
                  alt={`${currentLang.label} flag`}
                  className="h-5 w-5 rounded-full object-cover"
                  loading="lazy"
                />
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
                    <img
                      src={getFlagUrl(l.id)}
                      srcSet={`${getFlagUrl(l.id, 40)} 2x`}
                      alt={`${l.label} flag`}
                      className="h-[15px] w-5 rounded-[2px] object-cover"
                      loading="lazy"
                    />
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <button 
              onClick={() => setIsDark(!isDark)}
              className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-primary transition-all cursor-pointer flex items-center justify-center"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button onClick={onLogin} className="hidden sm:block text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors cursor-pointer">{t.logIn}</button>
            <Button onClick={onStart} size="md" className="rounded-full px-6 cursor-pointer">{t.getStarted}</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Editorial Style */}
      <section className={cn("relative min-h-[calc(100vh-80px)] flex items-start", SECTION_PADDING)}>
        <HeroMoleculeBackground />
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-start w-full relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col justify-center pt-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-[0.2em] mb-8 w-fit">
              <Globe className="w-3 h-3" />
              {u('landing.globalStandard', 'Global Logistics Standard')}
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-display text-slate-900 dark:text-white leading-[0.9] mb-8 h-[2.7em] overflow-hidden">
              <span>{typedBeforeKeyword}</span>
              <span className="text-primary">{typedKeyword}</span>
              <span>{typedAfterKeyword}</span>
              <span className="inline-block ml-2 text-primary animate-pulse">|</span>
            </h1>
            <div className="mb-10 max-w-xl">
              <p className="text-xl font-bold text-slate-900 dark:text-white mb-4 leading-relaxed">
                {u('landing.downloadApp', 'Download the app')}
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="h-12 px-5 rounded-2xl bg-black text-white inline-flex items-center gap-3 font-semibold text-sm shadow-lg shadow-black/25 cursor-pointer hover:bg-slate-900 transition-colors">
                  <span className="text-base leading-none" aria-hidden="true"></span>
                  <span>{u('landing.downloadAppstore', 'Download on App Store')}</span>
                </button>
                <button className="h-12 px-5 rounded-2xl bg-black text-white inline-flex items-center gap-3 font-semibold text-sm shadow-lg shadow-black/25 cursor-pointer hover:bg-slate-900 transition-colors">
                  <span className="text-sm leading-none" aria-hidden="true">▶</span>
                  <span>{u('landing.downloadPlaystore', 'Download on Play Store')}</span>
                </button>
              </div>
            </div>
            
            {/* Tracking Form - UPS Inspired */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 mb-6 max-w-xl w-full">
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
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{u('landing.trackHint', 'Numbers usually start with SWP-')}</p>
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
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{ui(lang, 'postLoadModal.pickup', 'Pickup Location')}</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="text" placeholder={ui(lang, 'postLoadModal.cityCountry', 'City, Country')} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{ui(lang, 'postLoadModal.delivery', 'Delivery Destination')}</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="text" placeholder={ui(lang, 'postLoadModal.cityCountry', 'City, Country')} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{ui(lang, 'postLoadModal.weight', 'Cargo Weight (kg)')}</label>
                        <input type="number" placeholder="0.00" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{ui(lang, 'postLoadModal.type', 'Cargo Type')}</label>
                        <select className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm appearance-none">
                          <option>{ui(lang, 'postLoadModal.generalCargo', 'General Cargo')}</option>
                          <option>{ui(lang, 'postLoadModal.perishable', 'Perishable')}</option>
                          <option>{ui(lang, 'postLoadModal.hazardous', 'Hazardous')}</option>
                          <option>{ui(lang, 'postLoadModal.fragile', 'Fragile')}</option>
                        </select>
                      </div>
                    </div>
                    <Button onClick={onStart} size="lg" className="w-full rounded-full mt-2">{t.postLoadButton} <Plus className="w-4 h-4 ml-2" /></Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-2 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-xl w-full overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">{u('landing.availableLoads', 'Available Loads')}</h4>
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">{landingLoads.length} {lang === 'bs' ? 'uživo' : lang === 'de' ? 'live' : 'live'}</span>
              </div>
              <div className="h-64 overflow-hidden relative">
                <div className="p-4 animate-load-scroll">
                  {[0, 1].map((loopIndex) => (
                    <div key={loopIndex} className="space-y-3">
                      {landingLoads.map((load, index) => (
                        <LoadItem
                          key={`${loopIndex}-${load.id}-${index}`}
                          layout="list"
                          load={load}
                          hideSource
                          statusLabel={trLoadStatus(lang, load.status)}
                          viewDetailsLabel={u('common.viewDetails', 'View Details')}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-8">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-950 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <p className="font-bold dark:text-white">{u('landing.activeDrivers', '12k+ Active Drivers')}</p>
                <p className="text-slate-500">{u('landing.trustingDaily', 'Trusting CARGO.AI daily')}</p>
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
                {/* Hero Route Map */}
                <MapContainer
                  center={[48.8, 14]}
                  zoom={5}
                  dragging={false}
                  scrollWheelZoom={false}
                  doubleClickZoom={false}
                  zoomControl={false}
                  attributionControl={false}
                  className="h-full w-full grayscale-[0.05] contrast-110 brightness-95 dark:brightness-75"
                >
                  <HeroRouteFitBounds points={HERO_ROUTE_POINTS} />
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                    subdomains={['a', 'b', 'c', 'd']}
                  />
                  <Polyline positions={HERO_ROUTE_POINTS} pathOptions={{ color: '#00AEEF', weight: 5, opacity: 0.85 }} />
                  <Marker position={HERO_ROUTE_START}>
                    <Popup>Hamburg, DE</Popup>
                  </Marker>
                  <Marker position={HERO_ROUTE_END}>
                    <Popup>Sarajevo, BA</Popup>
                  </Marker>
                </MapContainer>
                
                {/* Map Chips - Screenshot Inspired */}
                <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-3">
	                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 py-2 rounded-2xl shadow-xl border border-white/20 flex items-center gap-2 animate-bounce">
	                    <Clock className="text-primary w-4 h-4" />
	                    <span className="text-sm font-black text-slate-900 dark:text-white">Hamburg → Sarajevo</span>
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
	                        <span className="text-xs font-bold uppercase tracking-wider">{lang === 'bs' ? 'Ruta potvrđena' : lang === 'de' ? 'Route bestätigt' : 'Route Confirmed'}</span>
	                      </div>
	                    </div>
	                  </div>
	                  
	                  <div className="bg-white/80 dark:bg-white/10 backdrop-blur-2xl p-6 rounded-3xl border border-white/30 dark:border-white/20 shadow-2xl">
	                    <div className="flex items-center justify-between mb-4">
	                      <span className="px-3 py-1 rounded-full bg-primary text-[10px] font-black uppercase tracking-widest text-white">{lang === 'bs' ? 'Ruta uživo' : lang === 'de' ? 'Live-Route' : 'Live Route'}</span>
	                      <span className="text-xs font-bold text-slate-700 dark:text-white/70">{lang === 'bs' ? 'ETA 3. mart, 14:20' : lang === 'de' ? 'ETA 3. März, 14:20' : 'ETA Mar 3, 14:20'}</span>
	                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                        <Truck className="text-primary w-6 h-6" />
                      </div>
	                      <div>
	                        <p className="text-lg font-bold text-slate-900 dark:text-white">HAM-SJJ-214</p>
	                        <p className="text-sm text-slate-700 dark:text-white/60">{lang === 'bs' ? '1,545 km | Luka Hamburg -> Sarajevo Hub' : lang === 'de' ? '1,545 km | Hafen Hamburg -> Sarajevo Hub' : '1,545 km | Hamburg Port -> Sarajevo Hub'}</p>
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
      <section id="network" className={cn("scroll-mt-28 bg-white dark:bg-slate-950 relative overflow-hidden", SECTION_PADDING)}>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-4 gap-12 text-center">
            {[
              { label: u('landing.stats.packagesTracked', 'Packages Tracked'), value: "2.4B+", sub: u('landing.stats.annually', 'Annually'), icon: PackageIcon },
              { label: u('landing.stats.activeDrivers', 'Active Drivers'), value: "850k+", sub: u('landing.stats.worldwide', 'Worldwide'), icon: User },
              { label: u('landing.stats.countriesCovered', 'Countries Covered'), value: "192", sub: u('landing.stats.globalReach', 'Global reach'), icon: Globe },
              { label: u('landing.stats.uptimeSla', 'Uptime SLA'), value: "99.99%", sub: u('landing.stats.enterpriseGrade', 'Enterprise grade'), icon: ShieldCheck }
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
      <section id="features" className={cn("scroll-mt-28 bg-slate-50 dark:bg-slate-900/50", SECTION_PADDING)}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 dark:text-white tracking-tight">
              {lang === 'bs' ? 'Napravljeno za' : lang === 'de' ? 'Gebaut für die' : 'Built for the'} <br /> <span className="text-primary">{lang === 'bs' ? 'modernu flotu.' : lang === 'de' ? 'moderne Flotte.' : 'Modern Fleet.'}</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg">
              {lang === 'bs'
                ? 'Sve što ti treba za upravljanje globalnom logistikom u velikom obimu, od praćenja u realnom vremenu do AI optimizacije ruta.'
                : lang === 'de'
                  ? 'Alles, was Sie zur Steuerung globaler Logistik im großen Maßstab benötigen - von Echtzeit-Tracking bis zu KI-Routenoptimierung.'
                  : 'Everything you need to manage global logistics at scale, from real-time tracking to AI-powered route optimization.'}
            </p>
          </div>
          
          <div className="grid md:grid-cols-12 gap-6">
            {/* Main Feature */}
            <div className="md:col-span-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] p-12 flex border border-slate-100 dark:border-slate-800 group overflow-hidden relative shadow-sm hover:shadow-2xl transition-all duration-500">
              <div className="relative z-10 flex flex-1 flex-col">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                  <MapIcon className="text-white w-8 h-8" />
                </div>
                <h3 className="text-4xl font-bold mb-6 dark:text-white tracking-tight">
                  {lang === 'bs' ? 'Globalna vidljivost u realnom vremenu' : lang === 'de' ? 'Globale Echtzeit-Transparenz' : 'Real-time Global Visibility'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md text-xl leading-relaxed">
                  {lang === 'bs'
                    ? 'Prati svaki paket, vozilo i sredstvo u realnom vremenu sa preciznošću manjom od metra u 180+ država.'
                    : lang === 'de'
                      ? 'Verfolgen Sie jedes Paket, Fahrzeug und Asset in Echtzeit mit submeter-genauer Präzision in über 180 Ländern.'
                      : 'Track every package, vehicle, and asset in real-time with sub-meter precision across 180+ countries.'}
                </p>
                <div className="mt-auto pt-8 flex gap-4">
                   <div className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-xs font-bold dark:text-white">99.9% Accuracy</span>
                   </div>
                   <div className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                     <Globe className="w-4 h-4 text-primary" />
                     <span className="text-xs font-bold dark:text-white">{lang === 'bs' ? 'Globalna pokrivenost' : lang === 'de' ? 'Globale Abdeckung' : 'Global Coverage'}</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Side Feature 1 */}
            <div className="md:col-span-4 bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-black text-primary inline-flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    {u('landing.liveTracker', 'Live Tracker')}
                  </p>
                  <p className="text-2xl font-black dark:text-white">ZAG-AMS-881</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider">{trPackageStatus(lang, 'In Transit')}</span>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 mb-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>{lang === 'bs' ? 'Zagreb Hub' : lang === 'de' ? 'Zagreb Hub' : 'Zagreb Hub'}</span>
                  <span>{lang === 'bs' ? 'Amsterdam DC' : lang === 'de' ? 'Amsterdam DC' : 'Amsterdam DC'}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full w-[44%] bg-primary rounded-full" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs font-bold">
                  <span className="text-primary">{lang === 'bs' ? '612 km završeno' : lang === 'de' ? '612 km abgeschlossen' : '612 km completed'}</span>
                  <span className="text-slate-500">{lang === 'bs' ? '779 km preostalo' : lang === 'de' ? '779 km übrig' : '779 km left'}</span>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                <MapContainer
                  center={[50.2, 10.4]}
                  zoom={5}
                  dragging={false}
                  scrollWheelZoom={false}
                  doubleClickZoom={false}
                  zoomControl={false}
                  attributionControl={false}
                  className="h-60 w-full grayscale-[0.03] dark:brightness-75"
                >
                  <HeroRouteFitBounds points={FEATURE_ROUTE_POINTS_WITH_STOPS} />
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                    subdomains={['a', 'b', 'c', 'd']}
                  />
                  <Polyline positions={FEATURE_ROUTE_POINTS_WITH_STOPS} pathOptions={{ color: '#00AEEF', weight: 4, opacity: 0.9 }} />
                  <Marker position={FEATURE_ROUTE_START} />
                  <Marker position={FEATURE_ROUTE_STOP_1} />
                  <Marker position={FEATURE_ROUTE_STOP_2} />
                  <Marker position={FEATURE_ROUTE_END} />
                </MapContainer>
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-black uppercase tracking-wider z-[1000]">
                  Zagreb → Amsterdam
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-primary mb-3">{u('landing.routeTimeline', 'Route Timeline')}</p>
                <div className="space-y-3">
                  {trackerTimeline.map((event, index) => (
                    <div key={`${event.time}-${index}`} className="flex items-start gap-3">
                      <div className={cn("mt-0.5 w-6 h-6 rounded-lg shrink-0 flex items-center justify-center", event.iconClass)}>
                        <event.icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold dark:text-white truncate">{event.title}</p>
                          <span className="text-[10px] font-semibold text-slate-500 shrink-0">{event.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{event.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Feature 1 */}
            <div className="md:col-span-4 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] p-8 flex flex-col justify-between border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {u('landing.routeStops', 'Route Stops')}
                  </p>
                  <h3 className="text-2xl font-bold dark:text-white tracking-tight">{u('landing.waypointPlanner', 'Waypoint Planner')}</h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">{lang === 'bs' ? '4 markera' : lang === 'de' ? '4 Marker' : '4 Markers'}</span>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                <MapContainer
                  center={[50.2, 10.4]}
                  zoom={5}
                  dragging={false}
                  scrollWheelZoom={false}
                  doubleClickZoom={false}
                  zoomControl={false}
                  attributionControl={false}
                  className="h-56 min-h-[14rem] w-full grayscale-[0.03] dark:brightness-75"
                >
                  <HeroRouteFitBounds
                    points={FEATURE_ROUTE_POINTS_WITH_STOPS}
                    paddingTopLeft={[20, 20]}
                    paddingBottomRight={[20, 20]}
                    maxZoom={5}
                  />
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Polyline positions={FEATURE_ROUTE_POINTS_WITH_STOPS} pathOptions={{ color: '#00AEEF', weight: 4, opacity: 0.9 }} />
                  {FEATURE_ROUTE_STOPS.map((stop) => (
                    <Marker
                      key={stop.id}
                      position={stop.position}
                      icon={getWaypointMarkerIcon(selectedWaypoint === stop.id)}
                    />
                  ))}
                </MapContainer>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {FEATURE_ROUTE_STOPS.map((stop) => (
                  <button
                    key={stop.id}
                    onClick={() => setSelectedWaypoint(stop.id)}
                    className={cn(
                      "h-9 rounded-xl border px-3 flex items-center gap-2 transition-colors cursor-pointer",
                      selectedWaypoint === stop.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:border-primary/50"
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-bold truncate">{stop.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Feature 2 */}
            <AiRouteCalculatorCard lang={lang} className="md:col-span-8" />
          </div>
        </div>
      </section>

      {/* Section 4: How it Works - Vertical Timeline */}
      <section className={cn("bg-white dark:bg-slate-950", SECTION_PADDING)}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20">
            <div>
              <h2 className="text-4xl md:text-6xl font-display font-bold mb-8 dark:text-white leading-tight">
                {lang === 'bs' ? 'Kako CARGO.AI' : lang === 'de' ? 'So funktioniert' : 'How CARGO.AI'} <br /> <span className="text-primary">{lang === 'bs' ? 'radi.' : lang === 'de' ? 'CARGO.AI.' : 'Works.'}</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg mb-12">
                {lang === 'bs'
                  ? 'Pojednostavili smo složeni svijet globalne logistike u tri jednostavna koraka.'
                  : lang === 'de'
                    ? 'Wir haben die komplexe Welt der globalen Logistik auf drei einfache Schritte reduziert.'
                    : "We've simplified the complex world of global logistics into three simple steps."}
              </p>
              <div className="space-y-12 relative">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
                {[
                  {
                    step: "01",
                    title: lang === 'bs' ? 'Poveži svoju flotu' : lang === 'de' ? 'Flotte verbinden' : 'Connect your Fleet',
                    desc: lang === 'bs'
                      ? 'Poveži postojeća vozila ili koristi našu aplikaciju vozača i kreni za nekoliko minuta.'
                      : lang === 'de'
                        ? 'Integrieren Sie bestehende Fahrzeuge oder starten Sie in Minuten mit unserer Fahrer-App.'
                        : 'Integrate your existing vehicles or use our driver app to start tracking in minutes.'
                  },
                  {
                    step: "02",
                    title: lang === 'bs' ? 'Optimizuj rute' : lang === 'de' ? 'Routen optimieren' : 'Optimize Routes',
                    desc: lang === 'bs'
                      ? 'Naš AI analizira saobraćaj, vrijeme i historijske podatke kako bi našao najbrže putanje.'
                      : lang === 'de'
                        ? 'Unsere KI analysiert Verkehr, Wetter und historische Daten für die schnellsten Routen.'
                        : 'Our AI engine analyzes traffic, weather, and historical data to find the fastest paths.'
                  },
                  {
                    step: "03",
                    title: lang === 'bs' ? 'Isporuči sigurno' : lang === 'de' ? 'Sicher liefern' : 'Deliver with Confidence',
                    desc: lang === 'bs'
                      ? 'Ažuriranja u realnom vremenu i automatski izvještaji drže korisnike stalno informisanim.'
                      : lang === 'de'
                        ? 'Echtzeit-Updates und automatisierte Berichte halten Ihre Kunden jederzeit informiert.'
                        : 'Real-time updates and automated reporting keep your customers informed and happy.'
                  }
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
                    <p className="font-bold dark:text-white">{lang === 'bs' ? 'Ruta optimizovana' : lang === 'de' ? 'Route optimiert' : 'Route Optimized'}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {lang === 'bs'
                      ? 'AI je smanjio vrijeme isporuke za 24% na ovoj ruti.'
                      : lang === 'de'
                        ? 'KI hat die Lieferzeit auf dieser Route um 24% reduziert.'
                        : 'AI reduced delivery time by 24% for this route.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: The Experience / Dashboard Preview */}
      <section id="enterprise" className={cn("scroll-mt-28 bg-slate-900 overflow-hidden relative", SECTION_PADDING)}>
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
              <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-8 leading-tight">
                {lang === 'bs' ? 'Upravljaj cijelom' : lang === 'de' ? 'Steuern Sie Ihre gesamte' : 'Control your entire'} <br /> <span className="text-primary">{lang === 'bs' ? 'operacijom.' : lang === 'de' ? 'Operation.' : 'Operation.'}</span>
              </h2>
              <div className="space-y-8">
                {[
                  {
                    title: lang === 'bs' ? 'Jedinstveni dashboard' : lang === 'de' ? 'Einheitliches Dashboard' : 'Unified Dashboard',
                    desc: lang === 'bs'
                      ? 'Jedan ekran za sve. Upravljaj vozačima, teretima i praćenjem na jednom mjestu.'
                      : lang === 'de'
                        ? 'Ein Bildschirm für alles: Fahrer, Ladungen und Tracking zentral verwalten.'
                        : 'One screen to rule them all. Manage drivers, loads, and tracking in one place.'
                  },
                  {
                    title: lang === 'bs' ? 'Pametna obavještenja' : lang === 'de' ? 'Intelligente Benachrichtigungen' : 'Smart Notifications',
                    desc: lang === 'bs'
                      ? 'Dobij upozorenje prije kašnjenja uz naš prediktivni analitički sistem.'
                      : lang === 'de'
                        ? 'Sie werden vor Verzögerungen gewarnt - dank prädiktiver Analysen.'
                        : 'Get alerted before delays happen with our predictive analytics engine.'
                  },
                  {
                    title: lang === 'bs' ? 'Automatizovano izvještavanje' : lang === 'de' ? 'Automatisiertes Reporting' : 'Automated Reporting',
                    desc: lang === 'bs'
                      ? 'Generiši složene logističke izvještaje za sekunde, ne sate.'
                      : lang === 'de'
                        ? 'Erstellen Sie komplexe Logistikberichte in Sekunden statt Stunden.'
                        : 'Generate complex logistics reports in seconds, not hours.'
                  }
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
      <section id="pricing" className={cn("scroll-mt-28 bg-white dark:bg-slate-950", SECTION_PADDING)}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 dark:text-white tracking-tight">
              {lang === 'bs' ? 'Jednostavne, transparentne' : lang === 'de' ? 'Einfaches, transparentes' : 'Simple, Transparent'} <br /> <span className="text-primary">{lang === 'bs' ? 'cijene.' : lang === 'de' ? 'Pricing.' : 'Pricing.'}</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg">
              {lang === 'bs'
                ? 'Izaberi plan koji odgovara tvom poslovanju. Bez skrivenih troškova.'
                : lang === 'de'
                  ? 'Wählen Sie den Plan, der zu Ihrem Geschäft passt. Keine versteckten Gebühren.'
                  : 'Choose the plan that fits your business needs. No hidden fees.'}
            </p>
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
                  {plan.popular && <span className="px-4 py-1 rounded-full bg-white text-primary text-[10px] font-black uppercase tracking-widest mb-6 inline-block">{lang === 'bs' ? 'Najpopularniji' : lang === 'de' ? 'Am beliebtesten' : 'Most Popular'}</span>}
                  <h4 className="text-2xl font-bold mb-2">{plan.name}</h4>
                  <p className={cn("text-sm mb-8", plan.popular ? "text-white/70" : "text-slate-500")}>{plan.desc}</p>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-5xl font-black">{plan.price}</span>
                    {plan.price !== "Custom" && <span className="text-sm opacity-70">{lang === 'bs' ? '/mjesec' : lang === 'de' ? '/Monat' : '/month'}</span>}
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
                  {plan.price === "Custom"
                    ? (lang === 'bs' ? 'Kontakt prodaja' : lang === 'de' ? 'Vertrieb kontaktieren' : 'Contact Sales')
                    : (lang === 'bs' ? 'Započni' : lang === 'de' ? 'Loslegen' : 'Get Started')}
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
              { name: "Sarah Jenkins", role: "Logistics Director, TechCorp", text: "CARGO.AI has completely transformed how we handle our last-mile deliveries. The AI insights are a game changer." },
              { name: "Marco Rossi", role: "Fleet Manager, EuroTrans", text: "The real-time visibility is the best we've ever seen. Our drivers love the intuitive mobile app." },
              { name: "Elena Petrova", role: "CEO, GlobalShip", text: "Scaling our operations across Europe was seamless with CARGO.AI's multi-carrier integration." },
              { name: "David Chen", role: "Operations Lead, FastMove", text: "The automated reporting saves our team at least 15 hours a week. Highly recommended for any serious fleet." },
              { name: "Amira Al-Fayed", role: "Founder, DesertLogistics", text: "We needed a secure, enterprise-grade solution for our high-value loads. CARGO.AI delivered exactly that." },
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
            <h2 className="text-4xl md:text-7xl font-display font-black mb-8">
              {lang === 'bs' ? 'SPREMNI DA' : lang === 'de' ? 'BEREIT ZU' : 'READY TO'} <br /> {lang === 'bs' ? 'KRENETE?' : lang === 'de' ? 'STARTEN?' : 'START MOVING?'}
            </h2>
            <p className="text-xl text-white/70 mb-12 max-w-xl mx-auto">
              {lang === 'bs'
                ? 'Pridruži se hiljadama kompanija koje optimizuju logistiku uz CARGO.AI.'
                : lang === 'de'
                  ? 'Tausende Unternehmen optimieren bereits ihre Logistik mit CARGO.AI.'
                  : 'Join thousands of companies optimizing their logistics with CARGO.AI today.'}
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Button onClick={onStart} variant="secondary" size="lg" className="px-12 h-16 rounded-full text-lg font-bold text-primary bg-white hover:bg-slate-100">{u('common.getStartedNow', 'Get Started Now')}</Button>
              <Button variant="outline" size="lg" className="px-12 h-16 rounded-full text-lg font-bold border-white text-white hover:bg-white/10">{u('common.contactSales', 'Contact Sales')}</Button>
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
              <span className="text-2xl font-display font-bold tracking-tight text-slate-900 dark:text-white">CARGO.AI</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">
              {lang === 'bs'
                ? 'Logistička platforma nove generacije za moderan svijet. Precizna i pokretana AI-jem.'
                : lang === 'de'
                  ? 'Die Logistikplattform der nächsten Generation für die moderne Welt. Präzise und KI-gestützt.'
                  : 'The next-generation logistics platform for the modern world. Built with precision, powered by AI.'}
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
            <h5 className="font-bold mb-6 dark:text-white">{lang === 'bs' ? 'Proizvod' : lang === 'de' ? 'Produkt' : 'Product'}</h5>
            <ul className="space-y-4 text-slate-500 dark:text-slate-400 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">{t.tracking}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{lang === 'bs' ? 'Upravljanje flotom' : lang === 'de' ? 'Flottenmanagement' : 'Fleet Management'}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{lang === 'bs' ? 'AI uvidi' : lang === 'de' ? 'KI-Einblicke' : 'AI Insights'}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{lang === 'bs' ? 'API dokumentacija' : lang === 'de' ? 'API-Dokumentation' : 'API Docs'}</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-6 dark:text-white">{lang === 'bs' ? 'Kompanija' : lang === 'de' ? 'Unternehmen' : 'Company'}</h5>
            <ul className="space-y-4 text-slate-500 dark:text-slate-400 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">{lang === 'bs' ? 'O nama' : lang === 'de' ? 'Über uns' : 'About Us'}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{lang === 'bs' ? 'Karijere' : lang === 'de' ? 'Karriere' : 'Careers'}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{lang === 'bs' ? 'Mediji' : lang === 'de' ? 'Presse' : 'Press'}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{lang === 'bs' ? 'Kontakt' : lang === 'de' ? 'Kontakt' : 'Contact'}</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-slate-100 dark:border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-bold uppercase tracking-widest">
          <p>{lang === 'bs' ? '© 2026 SWIFTPATH LOGISTICS INC. SVA PRAVA ZADRŽANA.' : lang === 'de' ? '© 2026 SWIFTPATH LOGISTICS INC. ALLE RECHTE VORBEHALTEN.' : '© 2026 SWIFTPATH LOGISTICS INC. ALL RIGHTS RESERVED.'}</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-primary transition-colors">{lang === 'bs' ? 'Politika privatnosti' : lang === 'de' ? 'Datenschutz' : 'Privacy Policy'}</a>
            <a href="#" className="hover:text-primary transition-colors">{lang === 'bs' ? 'Uslovi korištenja' : lang === 'de' ? 'Nutzungsbedingungen' : 'Terms of Service'}</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const Onboarding = ({ 
  mode,
  lang: initialLang, 
  setLang: setGlobalLang, 
  onComplete,
  onClose,
  onSwitchToSetup
}: { 
  mode: 'setup' | 'login',
  lang: Language, 
  setLang: (l: Language) => void, 
  onComplete: (role: Role, lang: Language) => void,
  onClose?: () => void,
  onSwitchToSetup?: () => void
}) => {
  const [step, setStep] = useState(mode === 'login' ? 1 : 2);
  const [role, setRole] = useState<Role>(null);
  const [lang, setLang] = useState<Language>(initialLang || 'en');
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
    role: null as Role
  });
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
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  useEffect(() => {
    setStep(mode === 'login' ? 1 : 2);
  }, [mode]);

  useEffect(() => {
    const handleEscClose = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleEscClose);
    return () => window.removeEventListener('keydown', handleEscClose);
  }, [onClose]);

  const handleLogin = () => {
    if (!loginData.username || !loginData.password || !loginData.role) return;
    onComplete(loginData.role, lang);
  };

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

  const isSetupMode = mode !== 'login';
  const canProceedSetup =
    step === 2 ? Boolean(role) :
    step === 3 ? Boolean(driverData.name && driverData.country && driverData.username && driverData.password && driverData.idPhoto) :
    step === 5 ? Boolean(driverType) :
    step === 6 ? Boolean(companyData.name && companyData.taxId) :
    step === 4 ? Boolean(carData.make && carData.model && carData.plate && carData.fuelType) :
    false;
  const canProceedLogin = Boolean(loginData.username && loginData.password && loginData.role);
  const setupPrimaryLabel = step === 4 ? t.completeSetup : u('common.continue', 'Continue');
  const handleSetupBack = () => {
    if (step === 2) onClose?.();
    else if (step === 3) setStep(2);
    else if (step === 5) setStep(3);
    else if (step === 6) setStep(5);
    else if (step === 4) setStep(driverType === 'company' ? 6 : 5);
  };
  const setupLongStepClass = "space-y-6 h-[calc(100vh-16rem)] overflow-y-auto -mr-6 pr-6 pb-2 [scrollbar-gutter:stable]";
  const setupHeaderClass = "text-center sticky top-0 z-10 bg-white dark:bg-slate-900 pb-4 pt-1";

  if (mode === 'login') {
    return (
      <LoginProcess
        lang={lang}
        labels={{
          logIn: t.logIn,
          getStarted: t.getStarted,
          username: t.username,
          password: t.password,
        }}
        onComplete={onComplete}
        onClose={onClose}
        onGetStarted={onSwitchToSetup}
      />
    );
  }

  if (isSetupMode) {
    return (
      <SetupProcess
        lang={lang}
        labels={{
          username: t.username,
          password: t.password,
          selectFuel: t.selectFuel,
          licensePlate: t.licensePlate,
          completeSetup: t.completeSetup,
        }}
        onComplete={onComplete}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      className={cn(
        "bg-slate-50 dark:bg-slate-950 flex justify-center p-4 pb-28",
        isSetupMode ? "h-screen overflow-hidden items-start pt-6" : "min-h-screen items-center"
      )}
    >
      <Card className="max-w-md w-full">
        <div className="pb-2">
          <AnimatePresence mode="wait">
          {mode === 'login' && step === 1 && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <User className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold dark:text-white">{t.logIn}</h2>
                <p className="text-slate-500 text-sm mt-2">
                  {lang === 'bs'
                    ? 'Prijavite se i odmah uđite u aplikaciju.'
                    : lang === 'de'
                      ? 'Melden Sie sich an und betreten Sie die App sofort.'
                      : 'Sign in and enter the app immediately.'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t.username}</label>
                  <input
                    type="text"
                    placeholder="johndoe123"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                    value={loginData.username}
                    onChange={(e) => setLoginData((prev) => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t.password}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                    value={loginData.password}
                    onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setLoginData((prev) => ({ ...prev, role: 'user' }))}
                    className={cn(
                      "h-11 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer",
                      loginData.role === 'user'
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-slate-100 dark:border-slate-800 text-slate-500"
                    )}
                  >
                    {u('onboarding.customerTitle', "I'm a Customer")}
                  </button>
                  <button
                    onClick={() => setLoginData((prev) => ({ ...prev, role: 'driver' }))}
                    className={cn(
                      "h-11 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer",
                      loginData.role === 'driver'
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-slate-100 dark:border-slate-800 text-slate-500"
                    )}
                  >
                    {u('onboarding.driverTitle', "I'm a Driver")}
                  </button>
                </div>
              </div>

            </motion.div>
          )}

          {mode !== 'login' && step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <User className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold dark:text-white">{u('onboarding.whoAreYou', 'Who are you?')}</h2>
                <p className="text-slate-500 text-sm mt-2">{u('onboarding.roleSubtitle', 'Select your role to personalize your experience')}</p>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={() => setRole('user')}
                  className={cn("w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer", role === 'user' ? "border-primary bg-primary/5" : "border-slate-100 dark:border-slate-800 hover:border-primary")}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <PackageIcon className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">{u('onboarding.customerTitle', "I'm a Customer")}</p>
                    <p className="text-xs text-slate-500">{u('onboarding.customerDesc', 'I want to track packages and post loads')}</p>
                  </div>
                </button>
                <button 
                  onClick={() => setRole('driver')}
                  className={cn("w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer", role === 'driver' ? "border-primary bg-primary/5" : "border-slate-100 dark:border-slate-800 hover:border-primary")}
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Truck className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">{u('onboarding.driverTitle', "I'm a Driver")}</p>
                    <p className="text-xs text-slate-500">{u('onboarding.driverDesc', 'I want to manage deliveries and loads')}</p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {mode !== 'login' && step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={setupLongStepClass}
            >
              <div className={setupHeaderClass}>
                <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold dark:text-white">{u('onboarding.driverVerification', 'Driver Verification')}</h2>
                <p className="text-slate-500 text-sm mt-2">{u('onboarding.driverVerificationDesc', 'We need a few more details to get you on the road')}</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t.username}</label>
                    <input 
                      type="text" 
                      placeholder="johndoe123"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                      value={driverData.username}
                      onChange={(e) => setDriverData({...driverData, username: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t.password}</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                      value={driverData.password}
                      onChange={(e) => setDriverData({...driverData, password: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{u('onboarding.fullName', 'Full Name')}</label>
                  <input 
                    type="text" 
                    placeholder="John Doe"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors cursor-pointer"
                    value={driverData.name}
                    onChange={(e) => setDriverData({...driverData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{u('onboarding.country', 'Country')}</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                    value={driverData.country}
                    onChange={(e) => setDriverData({...driverData, country: e.target.value})}
                  >
                    <option value="">{u('onboarding.selectCountry', 'Select Country')}</option>
                    <option value="BA">{u('onboarding.bosnia', 'Bosnia and Herzegovina')}</option>
                    <option value="DE">{lang === 'bs' ? 'Njemačka' : lang === 'de' ? 'Deutschland' : 'Germany'}</option>
                    <option value="US">{lang === 'bs' ? 'Sjedinjene Američke Države' : lang === 'de' ? 'Vereinigte Staaten' : 'United States'}</option>
                    <option value="UK">{lang === 'bs' ? 'Ujedinjeno Kraljevstvo' : lang === 'de' ? 'Vereinigtes Königreich' : 'United Kingdom'}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{u('onboarding.idVerification', 'ID Verification')}</label>
                  <button 
                    onClick={() => setDriverData({...driverData, idPhoto: 'verified'})}
                    className={cn("w-full p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer", driverData.idPhoto ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" : "border-slate-200 dark:border-slate-800 hover:border-primary/50")}
                  >
                    {driverData.idPhoto ? (
                      <>
                        <CheckCircle2 className="text-emerald-500 w-8 h-8" />
                        <span className="text-sm font-bold text-emerald-600">{u('onboarding.idUploaded', 'ID Photo Uploaded')}</span>
                      </>
                    ) : (
                      <>
                        <Camera className="text-slate-400 w-8 h-8" />
                        <span className="text-sm font-bold text-slate-500">{u('onboarding.idUpload', 'Upload Photo of ID')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {mode !== 'login' && step === 5 && (
            <motion.div 
              key="step5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <Truck className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold dark:text-white">{lang === 'bs' ? 'Tip vozača' : lang === 'de' ? 'Fahrertyp' : 'Driver Type'}</h2>
                <p className="text-slate-500 text-sm mt-2">{lang === 'bs' ? 'Jeste li samostalni vozač ili predstavljate firmu?' : lang === 'de' ? 'Sind Sie ein selbstständiger Fahrer oder vertreten Sie ein Unternehmen?' : 'Are you an independent driver or representing a company?'}</p>
              </div>
              <div className="space-y-3">
                <button 
                  disabled={driverData.country === 'BA'}
                  onClick={() => setDriverType('private')}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer", 
                    driverType === 'private' ? "border-primary bg-primary/5" : "border-slate-100 dark:border-slate-800 hover:border-primary",
                    driverData.country === 'BA' && "opacity-50 cursor-not-allowed grayscale"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <User className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">{lang === 'bs' ? 'Privatni vozač' : lang === 'de' ? 'Privatfahrer' : 'Private Driver'}</p>
                    <p className="text-xs text-slate-500">
                      {driverData.country === 'BA'
                        ? (lang === 'bs' ? 'Nije dozvoljeno u BiH' : lang === 'de' ? 'In Bosnien nicht erlaubt' : 'Not allowed in Bosnia')
                        : (lang === 'bs' ? 'Samostalni izvođač' : lang === 'de' ? 'Selbstständiger Auftragnehmer' : 'Independent contractor')}
                    </p>
                  </div>
                </button>
                <button 
                  onClick={() => setDriverType('company')}
                  className={cn("w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer", driverType === 'company' ? "border-primary bg-primary/5" : "border-slate-100 dark:border-slate-800 hover:border-primary")}
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Globe className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">{lang === 'bs' ? 'Logistička kompanija' : lang === 'de' ? 'Logistikunternehmen' : 'Logistics Company'}</p>
                    <p className="text-xs text-slate-500">{lang === 'bs' ? 'Registrovano pravno lice' : lang === 'de' ? 'Registrierte Geschäftseinheit' : 'Registered business entity'}</p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {mode !== 'login' && step === 6 && (
            <motion.div 
              key="step6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={setupLongStepClass}
            >
              <div className={setupHeaderClass}>
                <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold dark:text-white">{lang === 'bs' ? 'Podaci o kompaniji' : lang === 'de' ? 'Unternehmensinformationen' : 'Company Information'}</h2>
                <p className="text-slate-500 text-sm mt-2">{lang === 'bs' ? 'Unesite registrovane poslovne podatke' : lang === 'de' ? 'Geben Sie Ihre registrierten Geschäftsdaten ein' : 'Enter your registered business details'}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{lang === 'bs' ? 'Naziv kompanije' : lang === 'de' ? 'Firmenname' : 'Company Name'}</label>
                  <input 
                    type="text" 
                    placeholder="Swift Logistics Ltd"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                    value={companyData.name}
                    onChange={(e) => setCompanyData({...companyData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{lang === 'bs' ? 'Porezni broj / PDV broj' : lang === 'de' ? 'Steuernummer / USt-IdNr.' : 'Tax ID / VAT Number'}</label>
                  <input 
                    type="text" 
                    placeholder="EU123456789"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                    value={companyData.taxId}
                    onChange={(e) => setCompanyData({...companyData, taxId: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{lang === 'bs' ? 'Poslovna adresa' : lang === 'de' ? 'Geschäftsadresse' : 'Business Address'}</label>
                  <textarea 
                    placeholder="123 Logistics Way, Berlin, Germany"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors h-24 resize-none"
                    value={companyData.address}
                    onChange={(e) => setCompanyData({...companyData, address: e.target.value})}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {mode !== 'login' && step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={setupLongStepClass}
            >
              <div className={setupHeaderClass}>
                <Truck className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold dark:text-white">{lang === 'bs' ? 'Podaci o vozilu' : lang === 'de' ? 'Fahrzeugdetails' : 'Vehicle Details'}</h2>
                <p className="text-slate-500 text-sm mt-2">{lang === 'bs' ? 'Recite nam više o vozilu koje ćete voziti' : lang === 'de' ? 'Erzählen Sie uns mehr über das Fahrzeug, das Sie fahren' : "Tell us about the vehicle you'll be driving"}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{lang === 'bs' ? 'Fotografija vozila' : lang === 'de' ? 'Fahrzeugfoto' : 'Vehicle Photo'}</label>
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
                      className={cn("w-full p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer", carData.photo ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" : "border-slate-200 dark:border-slate-800 hover:border-primary/50")}
                    >
                      {carData.isDetecting ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      ) : carData.photo ? (
                        <>
                          <CheckCircle2 className="text-emerald-500 w-8 h-8" />
                          <span className="text-sm font-bold text-emerald-600">{lang === 'bs' ? 'Fotografija postavljena' : lang === 'de' ? 'Foto hochgeladen' : 'Photo Uploaded'}</span>
                        </>
                      ) : (
                        <>
                          <Camera className="text-slate-400 w-8 h-8" />
                          <span className="text-sm font-bold text-slate-500">{lang === 'bs' ? 'Fotografiši za AI detekciju' : lang === 'de' ? 'Foto für KI-Erkennung aufnehmen' : 'Take Photo to Detect AI'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{lang === 'bs' ? 'Marka' : lang === 'de' ? 'Marke' : 'Make'}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Mercedes"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                      value={carData.make}
                      onChange={(e) => setCarData({...carData, make: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{lang === 'bs' ? 'Model' : lang === 'de' ? 'Modell' : 'Model'}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Sprinter"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                      value={carData.model}
                      onChange={(e) => setCarData({...carData, model: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{lang === 'bs' ? 'Godina' : lang === 'de' ? 'Baujahr' : 'Year'}</label>
                    <input 
                      type="text" 
                      placeholder="2024"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                      value={carData.year}
                      onChange={(e) => setCarData({...carData, year: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t.selectFuel}</label>
                    <select 
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors cursor-pointer"
                      value={carData.fuelType}
                      onChange={(e) => setCarData({...carData, fuelType: e.target.value})}
                    >
                      <option value="">{t.selectFuel}</option>
                      <option value="Diesel">{trFuelType(lang, 'Diesel')}</option>
                      <option value="Gasoline">{trFuelType(lang, 'Gasoline')}</option>
                      <option value="Electric">{trFuelType(lang, 'Electric')}</option>
                      <option value="Hybrid">{trFuelType(lang, 'Hybrid')}</option>
                      <option value="LPG">LPG</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t.licensePlate}</label>
                  <input 
                    type="text" 
                    placeholder="ABC-1234"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
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
                        <p className="text-[10px] text-slate-500 uppercase">{lang === 'bs' ? 'Da li vozilo ima prikolicu?' : lang === 'de' ? 'Hat Ihr Fahrzeug einen Anhänger?' : 'Does your vehicle have a trailer?'}</p>
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
                      <label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block">{lang === 'bs' ? 'Broj prikolica' : lang === 'de' ? 'Anzahl Anhänger' : 'Number of Trailers'}</label>
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
                        <p className="text-[10px] text-slate-500 uppercase">{lang === 'bs' ? 'Da li vozilo ima utovarnu rampu?' : lang === 'de' ? 'Hat Ihr Fahrzeug eine Hebebühne?' : 'Does your vehicle have a tail lift?'}</p>
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
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </Card>

      {isSetupMode && (
        <button
          onClick={() => onClose?.()}
          aria-label={lang === 'bs' ? 'Zatvori setup' : lang === 'de' ? 'Setup schliessen' : 'Close setup'}
          className="fixed top-4 right-4 z-[150] h-10 w-10 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-primary shadow-lg flex items-center justify-center cursor-pointer transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {(isSetupMode || mode === 'login') && (
        <div className="fixed bottom-0 left-0 right-0 z-[140] px-4 pb-4">
          <div className="max-w-md w-full mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl p-3">
            <div className="flex gap-3">
              {isSetupMode ? (
                <>
                  <Button variant="outline" onClick={handleSetupBack} className="flex-1 cursor-pointer" size="lg">
                    {u('common.back', 'Back')}
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!canProceedSetup}
                    className="flex-1 cursor-pointer"
                    size="lg"
                  >
                    {setupPrimaryLabel}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleLogin}
                  disabled={!canProceedLogin}
                  className="w-full cursor-pointer"
                  size="lg"
                >
                  {t.logIn}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [isLanding, setIsLanding] = useState(true);
  const [authMode, setAuthMode] = useState<'setup' | 'login'>('setup');
  const [role, setRole] = useState<Role>(null);
  const [lang, setLang] = useState<Language>('en');
  const [view, setView] = useState('tracking');
  const [isDark, setIsDark] = useState(true);
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

  useEffect(() => {
    if (role === 'user' && view === 'feed') {
      setView('tracking');
    }
  }, [role, view]);

  if (isLanding) return (
    <LandingPage 
      onStart={() => { setAuthMode('setup'); setIsLanding(false); }}
      onLogin={() => { setAuthMode('login'); setIsLanding(false); }}
      isDark={isDark} 
      setIsDark={setIsDark} 
      lang={lang} 
      setLang={setLang} 
    />
  );
  if (!role) return (
    <Onboarding
      mode={authMode}
      lang={lang}
      setLang={setLang}
      onComplete={(r, l) => { setRole(r); setLang(l); setView(r === 'driver' ? 'feed' : 'tracking'); }}
      onSwitchToSetup={() => setAuthMode('setup')}
      onClose={() => {
        setIsLanding(true);
        setRole(null);
        setAuthMode('setup');
      }}
    />
  );

  const t = translations[lang || 'en'];
  const currentLang = languages.find(l => l.id === (lang || 'en')) || languages[0];
  const analyticsLabel = 'Analytics';
  const tokenBalance = role === 'driver' ? 36 : 24;
  const tokenLabel = lang === 'bs' ? 'tokena' : lang === 'de' ? 'Tokens' : 'tokens';
  const roleLicenseLabel = role === 'driver'
    ? (lang === 'bs' ? 'Vozacka licenca' : lang === 'de' ? 'Fahrerlizenz' : 'Driver License')
    : (lang === 'bs' ? 'Licenca kupca' : lang === 'de' ? 'Kundenlizenz' : 'Customer License');
  const roleLicenseStatus = role === 'driver'
    ? (lang === 'bs' ? 'Verifikovana' : lang === 'de' ? 'Verifiziert' : 'Verified')
    : (lang === 'bs' ? 'Aktivna' : lang === 'de' ? 'Aktiv' : 'Active');

  const navItems = [
    ...(role === 'driver' ? [{ id: 'feed', label: t.homeFeed, icon: Boxes }] : []),
    { id: 'tracking', label: t.tracking, icon: PackageIcon },
    ...(role === 'driver' ? [
      { id: 'fleet', label: t.myFleet, icon: Truck },
      { id: 'automations', label: ui(lang, 'common.automations', 'AI Automations'), icon: Sparkles },
      { id: 'history', label: t.history, icon: History },
    ] : []),
    ...(role !== 'driver' ? [{ id: 'automations', label: ui(lang, 'common.automations', 'AI Automations'), icon: Sparkles }] : []),
    { id: 'dashboard', label: analyticsLabel, icon: BarChart3 },
    { id: 'network', label: t.network, icon: Globe },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className={cn(
        "hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-50 sticky top-0 h-screen",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <PackageIcon className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">CARGO.AI</span>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer",
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
            onClick={() => setView('profile')}
            className="w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer bg-primary text-white shadow-lg shadow-primary/20"
          >
            <User className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium">{ui(lang, 'common.myProfile', 'Moj profil')}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen relative overflow-hidden">
        {/* Header (Mobile & Desktop) */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="md:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <PackageIcon className="text-white w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight dark:text-white">CARGO.AI</span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <p className="text-sm text-slate-500">
              {t.welcome}, <span className="font-bold text-slate-900 dark:text-white">John Doe</span>
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border",
                role === 'driver'
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              )}
            >
              {role === 'driver' ? <Truck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              {roleLicenseLabel} • {roleLicenseStatus}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-10 px-3 rounded-full bg-slate-100 dark:bg-slate-800 text-primary inline-flex items-center gap-2 text-xs font-bold">
              <Coins className="w-4 h-4" />
              <span>{tokenBalance} {tokenLabel}</span>
            </div>

            {/* Language Switcher */}
            <div className="relative group">
              <button
                aria-label="Language switcher"
                title={currentLang.label}
                className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary hover:scale-105 transition-all cursor-pointer flex items-center justify-center"
              >
                <img
                  src={getFlagUrl(currentLang.id)}
                  srcSet={`${getFlagUrl(currentLang.id, 40)} 2x`}
                  alt={`${currentLang.label} flag`}
                  className="h-5 w-5 rounded-full object-cover"
                  loading="lazy"
                />
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
                    <img
                      src={getFlagUrl(l.id)}
                      srcSet={`${getFlagUrl(l.id, 40)} 2x`}
                      alt={`${l.label} flag`}
                      className="h-[15px] w-5 rounded-[2px] object-cover"
                      loading="lazy"
                    />
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <button 
              onClick={() => setIsDark(!isDark)}
              className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary hover:scale-105 transition-all cursor-pointer flex items-center justify-center"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setView('messages')}
              className={cn(
                "relative h-10 w-10 rounded-full transition-all cursor-pointer flex items-center justify-center",
                view === 'messages'
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary hover:scale-105"
              )}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
            </button>

            <button className="relative h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary hover:scale-105 transition-all cursor-pointer flex items-center justify-center">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
            </button>
            
            {/* User Avatar Dropdown */}
            <div className="relative group">
              <button className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary hover:scale-105 transition-all cursor-pointer flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </button>
              <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-[100]">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                  <p className="text-sm font-bold dark:text-white">John Doe</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{role === 'driver' ? ui(lang, 'common.verifiedDriver', 'Verified Driver') : ui(lang, 'common.customer', 'Customer')}</p>
                </div>
                <button
                  onClick={() => setView('profile')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
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
                  onClick={() => { setIsLanding(true); setRole(null); setAuthMode('setup'); }}
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
        <div
          className={cn(
            "flex-1 min-h-0 p-6 pb-24 md:pb-6 max-w-7xl mx-auto w-full",
            view === 'messages' ? "overflow-hidden" : "overflow-y-auto"
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              className={cn(view === 'messages' && "h-full")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
	              {view === 'dashboard' && <Dashboard role={role} lang={lang} />}
	              {view === 'tracking' && <TrackingView lang={lang} />}
	              {view === 'feed' && <HomeFeed lang={lang} />}
	              {view === 'messages' && <MessagesView lang={lang} />}
	              {view === 'network' && <NetworkView lang={lang} />}
	              {view === 'automations' && <AutomationsView lang={lang} />}
	              {view === 'fleet' && <FleetView lang={lang} />}
	              {view === 'history' && <HistoryView lang={lang} />}
	              {view === 'profile' && <ProfileView role={role} lang={lang} />}
	              {view === 'settings' && (
                  <SettingsView
                    role={role}
                    lang={lang}
                    onLogout={() => {
                      setIsLanding(true);
                      setRole(null);
                      setAuthMode('setup');
                    }}
                  />
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
                "flex flex-col items-center gap-1 transition-all cursor-pointer",
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

