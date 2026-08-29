import React, { useState, useEffect, useMemo, useRef } from "react";
import { GoogleGenAI } from "@google/genai";
import {
  Package as PackageIcon,
  Settings,
  Plus,
  Search,
  Truck,
  Map as MapIcon,
  BarChart3,
  Globe,
  User,
  ChevronDown,
  ChevronRight,
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
  Coins,
  Clock,
  MapPin,
  ExternalLink,
  Filter,
  NotebookPen,
  Building2,
  Banknote,
  Users,
  Crown,
  Mail,
  UserRound,
  PanelLeftClose,
  BrainCircuit,
  Database,
  Sparkles,
  RefreshCw,
  ScanSearch,
  Gem,
  History,
  Zap,
  Factory,
  Warehouse,
  ContactRound,
  Smartphone,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useScrollDownReveal } from "./hooks/useScrollDownReveal";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
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
  Bar,
} from "recharts";

// Types & Services
import { Role, Language, Load, SubscriptionPackage } from "./types";
import { ApiUser, api } from "./services/api";
import { MOCK_PACKAGES, MOCK_ROUTES } from "./mockData";
import {
  ui,
  trLoadStatus,
  trPackageStatus,
  trFuelType,
  trGoodsType,
  trPaymentTerms,
} from "./i18n";
import { cn } from "./lib/cn";
import { SUPPORTED_CURRENCIES } from "./lib/currency";
import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";
import { LoadItem } from "./components/load/LoadItem";
import {
  TrackingView,
  type TrackingLayoutMode,
} from "./components/views/TrackingView";
import { HomeFeed, FeedSortMode } from "./components/views/HomeFeed";
import { FleetView } from "./components/views/FleetView";
import { FilterLoadsProps } from "./components/load/FilterLoads";
import { GLOBAL_OFFERS } from "./components/frights/globalOffers";
import { MessagesView } from "./components/views/MessagesView";
import { MapView } from "./components/views/MapView";
import { ProfileView } from "./components/views/ProfileView";
import { AutomationsView } from "./components/views/AutomationsView";
import { PostLoadModal } from "./components/modals/PostLoadModal";
import { LoadDetailsModal } from "./components/tracking/LoadDetailsModal";
import { LoadDetailsPrebook } from "./components/load/LoadDetailsPrebook";
import { LenaAI } from "./components/lena/LenaAI";
import { ScanFieldPatch } from "./components/modals/scanFieldRows";
import { LenaCanvasMode } from "./lib/lenaLoadCanvas";
import { LoadNotesView } from "./components/views/LoadNotesView";
import { CompanyWorkspaceView } from "./components/views/CompanyWorkspaceView";
import { WarehouseOverviewView } from "./components/views/WarehouseOverviewView";
import { WarehousesView } from "./components/views/WarehousesView";
import { AdminWarehouseCompaniesView } from "./components/views/AdminWarehouseCompaniesView";
import { CompanyTeamView } from "./components/views/CompanyTeamView";
import { FinanceView } from "./components/views/FinanceView";
import { AdminOverviewView } from "./components/views/AdminOverviewView";
import { AdminCompaniesView } from "./components/views/AdminCompaniesView";
import { AdminCustomersView } from "./components/views/AdminCustomersView";
import { AdminDriversView } from "./components/views/AdminDriversView";
import { AiStatsView } from "./components/views/AiStatsView";
import { EmailStudioView } from "./components/views/EmailStudioView";
import { PricingView } from "./components/views/PricingView";
import { UsageView } from "./components/views/UsageView";
import { PaymentHistoryView } from "./components/views/PaymentHistoryView";
import { TariffsHsView } from "./components/views/TariffsHsView";
import { PaymentModal } from "./components/modals/PaymentModal";
import { BrandWordmark, FreightbookMark } from "./components/ui/BrandWordmark";
import { PricingPlanCard } from "./components/pricing/PricingPlanCard";
import { SetupProcess } from "./components/auth/SetupProcess";
import { LoginProcess } from "./components/auth/LoginProcess";
import { AiRouteCalculatorCard } from "./components/ai_automattions/AiRouteCalculatorCard";
import { LenaScenarioSections } from "./components/landing/LenaScenarioSections";

const LANGUAGE_STORAGE_KEY = "pathtrck.language";
const SIDEBAR_STORAGE_KEY = "freightbook.sidebar";

const SUPPORTED_LANGUAGES: Exclude<Language, null>[] = ["en", "bs", "de"];

const isSupportedLanguage = (
  value: string | null,
): value is Exclude<Language, null> =>
  Boolean(
    value && SUPPORTED_LANGUAGES.includes(value as Exclude<Language, null>),
  );

const getInitialLanguage = (): Exclude<Language, null> => {
  if (typeof window === "undefined") return "en";

  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get("lang");
  if (isSupportedLanguage(urlLang)) return urlLang;

  const storedLang = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isSupportedLanguage(storedLang)) return storedLang;

  return "en";
};

// Fix Leaflet marker icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
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
  { id: "n1", x: 8, y: 26, radius: 0.55, delay: 0.0 },
  { id: "n2", x: 18, y: 18, radius: 0.75, delay: 0.4 },
  { id: "n3", x: 31, y: 25, radius: 0.85, delay: 0.9 },
  { id: "n4", x: 45, y: 17, radius: 0.65, delay: 1.4 },
  { id: "n5", x: 59, y: 24, radius: 0.95, delay: 0.7 },
  { id: "n6", x: 73, y: 17, radius: 0.6, delay: 1.1 },
  { id: "n7", x: 87, y: 27, radius: 0.75, delay: 0.5 },
  { id: "n8", x: 19, y: 54, radius: 0.7, delay: 1.8 },
  { id: "n9", x: 35, y: 46, radius: 1.1, delay: 1.3 },
  { id: "n10", x: 51, y: 56, radius: 0.8, delay: 0.2 },
  { id: "n11", x: 67, y: 47, radius: 1.0, delay: 1.6 },
  { id: "n12", x: 82, y: 59, radius: 0.65, delay: 0.1 },
  { id: "n13", x: 26, y: 79, radius: 0.6, delay: 0.8 },
  { id: "n14", x: 43, y: 83, radius: 0.9, delay: 1.9 },
  { id: "n15", x: 61, y: 76, radius: 0.7, delay: 1.0 },
  { id: "n16", x: 78, y: 85, radius: 0.8, delay: 1.5 },
];

const HERO_MOLECULE_EDGES: Array<[string, string]> = [
  ["n1", "n2"],
  ["n2", "n3"],
  ["n3", "n4"],
  ["n4", "n5"],
  ["n5", "n6"],
  ["n6", "n7"],
  ["n2", "n8"],
  ["n3", "n9"],
  ["n5", "n10"],
  ["n6", "n11"],
  ["n7", "n12"],
  ["n8", "n9"],
  ["n9", "n10"],
  ["n10", "n11"],
  ["n11", "n12"],
  ["n8", "n13"],
  ["n9", "n14"],
  ["n10", "n14"],
  ["n10", "n15"],
  ["n11", "n15"],
  ["n12", "n16"],
  ["n13", "n14"],
  ["n14", "n15"],
  ["n15", "n16"],
  ["n3", "n8"],
  ["n4", "n9"],
  ["n5", "n11"],
  ["n9", "n13"],
  ["n11", "n16"],
];

type ConnectionNode = {
  id: string;
  x: number;
  y: number;
  radius: number;
  delay: number;
};

const HERO_CONNECTION_NODES: ConnectionNode[] = [
  { id: "sar", x: 27, y: 40, radius: 1.05, delay: 0.0 },
  { id: "vie", x: 37, y: 26, radius: 0.8, delay: 0.5 },
  { id: "bud", x: 45, y: 30, radius: 0.75, delay: 1.0 },
  { id: "zag", x: 19, y: 34, radius: 0.7, delay: 1.3 },
  { id: "par", x: 10, y: 22, radius: 0.8, delay: 1.7 },
  { id: "ams", x: 17, y: 14, radius: 0.7, delay: 0.2 },
  { id: "ber", x: 27, y: 16, radius: 0.75, delay: 0.8 },
  { id: "ist", x: 57, y: 44, radius: 0.85, delay: 1.1 },
  { id: "ath", x: 58, y: 59, radius: 0.75, delay: 1.6 },
  { id: "dub", x: 68, y: 36, radius: 0.8, delay: 0.6 },
  { id: "nyc", x: 82, y: 27, radius: 1.0, delay: 0.3 },
  { id: "chi", x: 90, y: 24, radius: 0.75, delay: 1.2 },
  { id: "mia", x: 93, y: 41, radius: 0.7, delay: 1.9 },
];

const HERO_CONNECTION_EDGES: Array<[string, string]> = [
  ["sar", "vie"],
  ["sar", "bud"],
  ["sar", "zag"],
  ["sar", "ist"],
  ["sar", "dub"],
  ["vie", "bud"],
  ["vie", "ber"],
  ["ber", "ams"],
  ["ams", "par"],
  ["zag", "par"],
  ["bud", "ist"],
  ["ist", "ath"],
  ["ist", "dub"],
  ["dub", "nyc"],
  ["nyc", "chi"],
  ["nyc", "mia"],
  ["chi", "mia"],
  ["ber", "nyc"],
];

const HERO_ROUTE_START: [number, number] = [53.5511, 9.9937]; // Hamburg
const HERO_ROUTE_END: [number, number] = [43.8563, 18.4131]; // Sarajevo
const HERO_ROUTE_POINTS: [number, number][] = [
  HERO_ROUTE_START,
  HERO_ROUTE_END,
];

type FeatureRouteStop = {
  id: "zagreb" | "munich" | "cologne" | "amsterdam";
  label: string;
  position: [number, number];
};

const FEATURE_ROUTE_START: [number, number] = [45.815, 15.9819]; // Zagreb
const FEATURE_ROUTE_END: [number, number] = [52.3676, 4.9041]; // Amsterdam
const FEATURE_ROUTE_STOP_1: [number, number] = [48.1351, 11.582]; // Munich
const FEATURE_ROUTE_STOP_2: [number, number] = [50.9375, 6.9603]; // Cologne
const FEATURE_ROUTE_STOPS: FeatureRouteStop[] = [
  { id: "zagreb", label: "Zagreb Hub", position: FEATURE_ROUTE_START },
  { id: "munich", label: "Munich Stop", position: FEATURE_ROUTE_STOP_1 },
  { id: "cologne", label: "Cologne Stop", position: FEATURE_ROUTE_STOP_2 },
  { id: "amsterdam", label: "Amsterdam DC", position: FEATURE_ROUTE_END },
];
const FEATURE_ROUTE_POINTS_WITH_STOPS: [number, number][] = [
  ...FEATURE_ROUTE_STOPS.map((stop) => stop.position),
];

const getWaypointMarkerIcon = (selected: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="width:${selected ? 18 : 14}px;height:${selected ? 18 : 14}px;border-radius:9999px;background:${selected ? "#00AEEF" : "#64748B"};border:2px solid #ffffff;box-shadow:0 0 0 ${selected ? 4 : 0}px ${selected ? "rgba(0,174,239,0.30)" : "transparent"};"></div>`,
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
    window.addEventListener("resize", applyBounds);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", applyBounds);
    };
  }, [map, points, paddingTopLeft, paddingBottomRight, maxZoom]);

  return null;
};

const HeroMoleculeBackground = () => {
  const nodeMap = useMemo(
    () => new Map(HERO_MOLECULE_NODES.map((node) => [node.id, node])),
    [],
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(56,189,248,0.16),transparent_38%),radial-gradient(circle_at_86%_24%,rgba(14,165,233,0.14),transparent_42%),radial-gradient(circle_at_58%_84%,rgba(59,130,246,0.12),transparent_48%)] dark:bg-[radial-gradient(circle_at_15%_20%,rgba(14,165,233,0.22),transparent_40%),radial-gradient(circle_at_86%_24%,rgba(34,211,238,0.16),transparent_44%),radial-gradient(circle_at_58%_84%,rgba(30,64,175,0.28),transparent_52%)]" />
      <div className="absolute inset-y-0 left-0 w-1/2 opacity-70 [background-image:radial-gradient(rgb(14_165_233/0.35)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_right,black,transparent)] [-webkit-mask-image:linear-gradient(to_right,black,transparent)] dark:opacity-35" />
      <motion.div
        className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-[100px] dark:bg-cyan-500/20"
        animate={{ x: [0, 8, -4, 0], y: [0, 6, -4, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-blue-300/20 blur-[120px] dark:bg-blue-600/25"
        animate={{ x: [0, -28, 14, 0], y: [0, -18, 12, 0] }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.6,
        }}
      />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full text-sky-500/35 dark:text-cyan-300/40"
      >
        <motion.g
          animate={{ x: [0, 1.5, -1, 0], y: [0, -1.2, 0.8, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
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
                animate={{
                  pathLength: [0.35, 1, 0.35],
                  opacity: [0.15, 0.55, 0.15],
                }}
                transition={{
                  duration: 7 + (index % 5),
                  repeat: Infinity,
                  ease: "easeInOut",
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
                  r: [
                    node.radius * 0.85,
                    node.radius * 1.35,
                    node.radius * 0.85,
                  ],
                  opacity: [0.25, 0.95, 0.25],
                }}
                transition={{
                  duration: 3.8 + node.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
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
                  ease: "easeInOut",
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
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_14%,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(59,130,246,0.16),transparent_36%),linear-gradient(145deg,rgba(241,245,249,0.45),rgba(224,242,254,0.2)_40%,rgba(186,230,253,0.14))] dark:bg-[radial-gradient(circle_at_12%_14%,rgba(34,211,238,0.22),transparent_36%),radial-gradient(circle_at_84%_18%,rgba(56,189,248,0.2),transparent_38%),linear-gradient(145deg,rgba(15,23,42,0.6),rgba(15,23,42,0.45)_45%,rgba(30,41,59,0.38))]" />
      <div
        className="absolute inset-0 opacity-28 dark:opacity-18"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <svg
        viewBox="0 0 100 75"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full text-sky-500/55 dark:text-cyan-300/65"
      >
        <motion.g
          animate={{ x: [0, 1.2, -0.6, 0], y: [0, -1, 0.7, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
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
                animate={{
                  pathLength: [0.2, 1, 0.2],
                  opacity: [0.18, 0.6, 0.18],
                }}
                transition={{
                  duration: 6 + (index % 4),
                  repeat: Infinity,
                  ease: "easeInOut",
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
                  ease: "easeInOut",
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
                  ease: "easeInOut",
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

const allLanguages: { id: Language; flag: string; label: string }[] = [
  { id: "en", flag: "🇺🇸", label: "English" },
  { id: "bs", flag: "🇧🇦", label: "Bosanski" },
  { id: "de", flag: "🇩🇪", label: "Deutsch" },
  { id: "pl", flag: "🇵🇱", label: "Polski" },
  { id: "ro", flag: "🇷🇴", label: "Romana" },
  { id: "nl", flag: "🇳🇱", label: "Nederlands" },
  { id: "fr", flag: "🇫🇷", label: "Francais" },
  { id: "it", flag: "🇮🇹", label: "Italiano" },
  { id: "zh", flag: "🇨🇳", label: "中文" },
  { id: "es", flag: "🇪🇸", label: "Espanol" },
  { id: "sr", flag: "🇷🇸", label: "Srpski" },
  { id: "sv", flag: "🇸🇪", label: "Svenska" },
  { id: "ar", flag: "🇸🇦", label: "العربية" },
  { id: "pt", flag: "🇵🇹", label: "Portugues" },
];

const languages = allLanguages.filter(
  (language) =>
    language.id === "en" || language.id === "bs" || language.id === "de",
);

const flagCodeByLanguage: Record<Exclude<Language, null>, string> = {
  en: "us",
  bs: "ba",
  de: "de",
  pl: "pl",
  ro: "ro",
  nl: "nl",
  fr: "fr",
  it: "it",
  zh: "cn",
  es: "es",
  sr: "rs",
  sv: "se",
  ar: "sa",
  pt: "pt",
};

const getFlagUrl = (language: Language, width = 20) => {
  const code =
    flagCodeByLanguage[(language || "en") as Exclude<Language, null>];
  return `https://flagcdn.com/w${width}/${code}.png`;
};

type HeroTypedMessage = {
  text: string;
  keyword: string;
};

const HERO_MAIN_TITLE_MESSAGES: Record<
  Exclude<Language, null>,
  HeroTypedMessage[]
> = {
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
    { text: "Keeping logistics ready.", keyword: "logistics" },
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
    { text: "Održavamo logistiku spremnom.", keyword: "logistiku" },
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
    { text: "Wir halten Logistik bereit.", keyword: "Logistik" },
  ],
  pl: [
    { text: "Szybciej laczymy kierowcow.", keyword: "kierowcow" },
    { text: "Lepiej dopasowujemy ladunki.", keyword: "ladunki" },
    { text: "Skuteczniej prowadzimy floty.", keyword: "floty" },
    { text: "Sledzimy kazdy kilometr.", keyword: "kilometr" },
  ],
  ro: [
    { text: "Conectam soferii mai rapid.", keyword: "soferii" },
    { text: "Potrivim marfurile instant.", keyword: "marfurile" },
    { text: "Optimizam flotele mai bine.", keyword: "flotele" },
    { text: "Urmarim fiecare kilometru.", keyword: "kilometru" },
  ],
  nl: [
    { text: "We verbinden chauffeurs sneller.", keyword: "chauffeurs" },
    { text: "We matchen ladingen direct.", keyword: "ladingen" },
    { text: "We sturen vloten slimmer.", keyword: "vloten" },
    { text: "We volgen elke kilometer.", keyword: "kilometer" },
  ],
  fr: [
    {
      text: "Nous connectons les chauffeurs plus vite.",
      keyword: "chauffeurs",
    },
    {
      text: "Nous associons les chargements rapidement.",
      keyword: "chargements",
    },
    { text: "Nous pilotons mieux les flottes.", keyword: "flottes" },
    { text: "Nous suivons chaque kilometre.", keyword: "kilometre" },
  ],
  it: [
    { text: "Colleghiamo gli autisti piu velocemente.", keyword: "autisti" },
    { text: "Abbiniamo i carichi subito.", keyword: "carichi" },
    { text: "Gestiamo meglio le flotte.", keyword: "flotte" },
    { text: "Tracciamo ogni chilometro.", keyword: "chilometro" },
  ],
  zh: [
    { text: "更快连接司机。", keyword: "司机" },
    { text: "更快匹配货运。", keyword: "货运" },
    { text: "更好调度车队。", keyword: "车队" },
    { text: "追踪每一公里。", keyword: "公里" },
  ],
  es: [
    { text: "Conectamos conductores mas rapido.", keyword: "conductores" },
    { text: "Emparejamos cargas al instante.", keyword: "cargas" },
    { text: "Optimizamos flotas mejor.", keyword: "flotas" },
    { text: "Seguimos cada kilometro.", keyword: "kilometro" },
  ],
  sr: [
    { text: "Povezujemo vozace brze.", keyword: "vozace" },
    { text: "Spajamo terete odmah.", keyword: "terete" },
    { text: "Usmeravamo flote bolje.", keyword: "flote" },
    { text: "Pratimo svaki kilometar.", keyword: "kilometar" },
  ],
  sv: [
    { text: "Vi kopplar chaufforer snabbare.", keyword: "chaufforer" },
    { text: "Vi matchar laster direkt.", keyword: "laster" },
    { text: "Vi styr flottor battre.", keyword: "flottor" },
    { text: "Vi foljer varje kilometer.", keyword: "kilometer" },
  ],
  ar: [
    { text: "نربط السائقين بشكل أسرع.", keyword: "السائقين" },
    { text: "نطابق الشحنات فوراً.", keyword: "الشحنات" },
    { text: "ندير الأساطيل بشكل أفضل.", keyword: "الأساطيل" },
    { text: "نتابع كل كيلومتر.", keyword: "كيلومتر" },
  ],
  pt: [
    { text: "Conectamos motoristas mais rapido.", keyword: "motoristas" },
    { text: "Combinamos cargas na hora.", keyword: "cargas" },
    { text: "Otimizamos frotas melhor.", keyword: "frotas" },
    { text: "Rastreamos cada quilometro.", keyword: "quilometro" },
  ],
};

const makeLandingTranslation = (overrides: Record<string, string>) => ({
  ...{
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
    loadSubtitle:
      "Connect with our network of 50,000+ verified drivers across Europe and the US.",
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
    homeFeed: "Freight Exchange",
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
    completeSetup: "Complete Setup",
  },
  ...overrides,
});

const translations: Record<Exclude<Language, null>, Record<string, string>> = {
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
    loadSubtitle:
      "Connect with our network of 50,000+ verified drivers across Europe and the US.",
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
    homeFeed: "Freight Exchange",
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
    completeSetup: "Complete Setup",
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
    loadSubtitle:
      "Povežite se s našom mrežom od 50,000+ provjerenih vozača širom Evrope i SAD-a.",
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
    homeFeed: "Berza tereta",
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
    completeSetup: "Završi podešavanje",
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
    loadSubtitle:
      "Verbinden Sie sich mit unserem Netzwerk von über 50.000 verifizierten Fahrern in ganz Europa und den USA.",
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
    homeFeed: "Frachtbörse",
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
    completeSetup: "Setup abschließen",
  },
  pl: makeLandingTranslation({
    features: "Funkcje",
    network: "Siec",
    enterprise: "Enterprise",
    pricing: "Cennik",
    logIn: "Zaloguj",
    getStarted: "Zacznij",
    heroTitle: "Szybciej laczymy kierowcow.",
    heroSubtitle: "Szybciej laczymy kierowcow.",
    trackShipment: "Sledz przesylke",
    postLoad: "Dodaj ladunek",
    trackingPlaceholder: "Wpisz numer sledzenia (np. PT-123456)",
    trackButton: "Sledz teraz",
    loadTitle: "Musisz przewiezc ladunek?",
    loadSubtitle:
      "Polacz sie z nasza siecia ponad 50 000 zweryfikowanych kierowcow w Europie i USA.",
    postLoadButton: "Dodaj ladunek",
    trustedBy: "Zaufanie liderow branzy.",
    welcome: "Witamy ponownie",
    dashboard: "Panel",
    tracking: "Sledzenie",
    myFleet: "Moja flota",
    messages: "Wiadomosci",
    history: "Historia",
    settings: "Ustawienia",
    homeFeed: "Giełda transportowa",
    accountSettings: "Ustawienia konta",
    support: "Wsparcie",
    documentation: "Dokumentacja",
    logOut: "Wyloguj",
  }),
  ro: makeLandingTranslation({
    features: "Functionalitati",
    network: "Retea",
    pricing: "Preturi",
    logIn: "Autentificare",
    getStarted: "Incepe",
    heroTitle: "Conectam soferii mai rapid.",
    heroSubtitle: "Conectam soferii mai rapid.",
    trackShipment: "Urmareste expedierea",
    postLoad: "Publica marfa",
    trackingPlaceholder: "Introdu numarul de urmarire (ex. PT-123456)",
    trackButton: "Urmareste acum",
    loadTitle: "Trebuie sa muti marfa?",
    loadSubtitle:
      "Conecteaza-te cu reteaua noastra de peste 50.000 de soferi verificati din Europa si SUA.",
    postLoadButton: "Publica marfa",
    trustedBy: "De incredere pentru liderii din industrie.",
    welcome: "Bine ai revenit",
    dashboard: "Panou",
    tracking: "Urmarire",
    myFleet: "Flota mea",
    messages: "Mesaje",
    history: "Istoric",
    settings: "Setari",
    homeFeed: "Bursa de mărfuri",
    accountSettings: "Setari cont",
    support: "Suport",
    documentation: "Documentatie",
    logOut: "Deconectare",
  }),
  nl: makeLandingTranslation({
    features: "Functies",
    network: "Netwerk",
    pricing: "Prijzen",
    logIn: "Inloggen",
    getStarted: "Start nu",
    heroTitle: "We verbinden chauffeurs sneller.",
    heroSubtitle: "We verbinden chauffeurs sneller.",
    trackShipment: "Zending volgen",
    postLoad: "Lading plaatsen",
    trackingPlaceholder: "Voer trackingnummer in (bijv. PT-123456)",
    trackButton: "Nu volgen",
    loadTitle: "Moet je vracht verplaatsen?",
    loadSubtitle:
      "Verbind met ons netwerk van 50.000+ geverifieerde chauffeurs in Europa en de VS.",
    postLoadButton: "Plaats lading",
    trustedBy: "Vertrouwd door marktleiders.",
    welcome: "Welkom terug",
    dashboard: "Dashboard",
    tracking: "Tracking",
    myFleet: "Mijn vloot",
    messages: "Berichten",
    history: "Geschiedenis",
    settings: "Instellingen",
    homeFeed: "Vrachtbeurs",
    accountSettings: "Accountinstellingen",
    support: "Ondersteuning",
    documentation: "Documentatie",
    logOut: "Uitloggen",
  }),
  fr: makeLandingTranslation({
    features: "Fonctionnalites",
    network: "Reseau",
    pricing: "Tarifs",
    logIn: "Connexion",
    getStarted: "Commencer",
    heroTitle: "Nous connectons les chauffeurs plus vite.",
    heroSubtitle: "Nous connectons les chauffeurs plus vite.",
    trackShipment: "Suivre l envoi",
    postLoad: "Publier un chargement",
    trackingPlaceholder: "Entrez le numero de suivi (ex. PT-123456)",
    trackButton: "Suivre maintenant",
    loadTitle: "Besoin de transporter une cargaison ?",
    loadSubtitle:
      "Connectez-vous a notre reseau de plus de 50 000 chauffeurs verifies en Europe et aux Etats-Unis.",
    postLoadButton: "Publier un chargement",
    trustedBy: "Adopte par les leaders du secteur.",
    welcome: "Bon retour",
    dashboard: "Tableau de bord",
    tracking: "Suivi",
    myFleet: "Ma flotte",
    messages: "Messages",
    history: "Historique",
    settings: "Parametres",
    homeFeed: "Bourse de fret",
    accountSettings: "Parametres du compte",
    support: "Support",
    documentation: "Documentation",
    logOut: "Deconnexion",
  }),
  it: makeLandingTranslation({
    features: "Funzionalita",
    network: "Rete",
    pricing: "Prezzi",
    logIn: "Accedi",
    getStarted: "Inizia",
    heroTitle: "Colleghiamo gli autisti piu velocemente.",
    heroSubtitle: "Colleghiamo gli autisti piu velocemente.",
    trackShipment: "Traccia spedizione",
    postLoad: "Pubblica carico",
    trackingPlaceholder: "Inserisci numero di tracciamento (es. PT-123456)",
    trackButton: "Traccia ora",
    loadTitle: "Devi spostare un carico?",
    loadSubtitle:
      "Connettiti alla nostra rete di oltre 50.000 autisti verificati in Europa e negli USA.",
    postLoadButton: "Pubblica carico",
    trustedBy: "Scelto dai leader del settore.",
    welcome: "Bentornato",
    dashboard: "Dashboard",
    tracking: "Tracciamento",
    myFleet: "La mia flotta",
    messages: "Messaggi",
    history: "Cronologia",
    settings: "Impostazioni",
    homeFeed: "Borsa carichi",
    accountSettings: "Impostazioni account",
    support: "Supporto",
    documentation: "Documentazione",
    logOut: "Esci",
  }),
  zh: makeLandingTranslation({
    features: "功能",
    network: "网络",
    enterprise: "企业",
    pricing: "价格",
    logIn: "登录",
    getStarted: "开始使用",
    heroTitle: "更快连接司机。",
    heroSubtitle: "更快连接司机。",
    trackShipment: "追踪货运",
    postLoad: "发布货运",
    trackingPlaceholder: "输入追踪号（例如 PT-123456）",
    trackButton: "立即追踪",
    loadTitle: "需要运输货物？",
    loadSubtitle: "连接我们遍布欧洲和美国的 50,000+ 名已验证司机网络。",
    postLoadButton: "发布货运",
    trustedBy: "受到行业领导者信赖。",
    accountSettings: "账户设置",
    support: "支持",
    documentation: "文档",
    logOut: "退出",
    welcome: "欢迎回来",
    dashboard: "仪表板",
    tracking: "追踪",
    myFleet: "我的车队",
    messages: "消息",
    history: "历史",
    settings: "设置",
    homeFeed: "货运交易所",
    trailer: "拖车",
    tailLift: "尾板",
    username: "用户名",
    password: "密码",
    licensePlate: "车牌",
    selectFuel: "选择燃料",
    yes: "是",
    no: "否",
    continue: "继续",
    back: "返回",
    completeSetup: "完成设置",
  }),
  es: makeLandingTranslation({
    features: "Funciones",
    network: "Red",
    pricing: "Precios",
    logIn: "Iniciar sesion",
    getStarted: "Empezar",
    heroTitle: "Conectamos conductores mas rapido.",
    heroSubtitle: "Conectamos conductores mas rapido.",
    trackShipment: "Rastrear envio",
    postLoad: "Publicar carga",
    trackingPlaceholder: "Introduce el numero de seguimiento (ej. PT-123456)",
    trackButton: "Rastrear ahora",
    loadTitle: "Necesitas mover carga?",
    loadSubtitle:
      "Conectate con nuestra red de mas de 50.000 conductores verificados en Europa y EE. UU.",
    postLoadButton: "Publicar carga",
    trustedBy: "Con la confianza de lideres del sector.",
    welcome: "Bienvenido de nuevo",
    dashboard: "Panel",
    tracking: "Seguimiento",
    myFleet: "Mi flota",
    messages: "Mensajes",
    history: "Historial",
    settings: "Configuracion",
    homeFeed: "Bolsa de cargas",
    accountSettings: "Configuracion de la cuenta",
    support: "Soporte",
    documentation: "Documentacion",
    logOut: "Cerrar sesion",
  }),
  sr: makeLandingTranslation({
    features: "Funkcije",
    network: "Mreza",
    enterprise: "Preduzece",
    pricing: "Cene",
    logIn: "Prijava",
    getStarted: "Pocni",
    heroTitle: "Povezujemo vozace brze.",
    heroSubtitle: "Povezujemo vozace brze.",
    trackShipment: "Prati posiljku",
    postLoad: "Objavi teret",
    trackingPlaceholder: "Unesite broj za pracenje (npr. PT-123456)",
    trackButton: "Prati odmah",
    loadTitle: "Treba da prevezete teret?",
    loadSubtitle:
      "Povezite se sa nasom mrezom od 50.000+ verifikovanih vozaca sirom Evrope i SAD.",
    postLoadButton: "Objavi teret",
    trustedBy: "Poverenje lidera industrije.",
    welcome: "Dobrodosli nazad",
    dashboard: "Kontrolna tabla",
    tracking: "Pracenje",
    myFleet: "Moja flota",
    messages: "Poruke",
    history: "Istorija",
    settings: "Podesavanja",
    homeFeed: "Berza tereta",
    accountSettings: "Podesavanja naloga",
    support: "Podrska",
    documentation: "Dokumentacija",
    logOut: "Odjava",
  }),
  sv: makeLandingTranslation({
    features: "Funktioner",
    network: "Natverk",
    pricing: "Priser",
    logIn: "Logga in",
    getStarted: "Kom igang",
    heroTitle: "Vi kopplar chaufforer snabbare.",
    heroSubtitle: "Vi kopplar chaufforer snabbare.",
    trackShipment: "Spar forsandelse",
    postLoad: "Publicera last",
    trackingPlaceholder: "Ange sparningsnummer (t.ex. PT-123456)",
    trackButton: "Spar nu",
    loadTitle: "Behov av att flytta gods?",
    loadSubtitle:
      "Anslut till vart natverk med 50 000+ verifierade chaufforer i Europa och USA.",
    postLoadButton: "Publicera last",
    trustedBy: "Betrodd av branschledare.",
    welcome: "Valkommen tillbaka",
    dashboard: "Oversikt",
    tracking: "Sparning",
    myFleet: "Min flotta",
    messages: "Meddelanden",
    history: "Historik",
    settings: "Installningar",
    homeFeed: "Fraktbörs",
    accountSettings: "Kontoinstallningar",
    support: "Support",
    documentation: "Dokumentation",
    logOut: "Logga ut",
  }),
  ar: makeLandingTranslation({
    features: "الميزات",
    network: "الشبكة",
    enterprise: "المؤسسات",
    pricing: "الاسعار",
    logIn: "تسجيل الدخول",
    getStarted: "ابدأ",
    heroTitle: "نربط السائقين بشكل أسرع.",
    heroSubtitle: "نربط السائقين بشكل أسرع.",
    trackShipment: "تتبع الشحنة",
    postLoad: "نشر حمولة",
    trackingPlaceholder: "أدخل رقم التتبع (مثال PT-123456)",
    trackButton: "تتبع الآن",
    loadTitle: "هل تحتاج إلى نقل حمولة؟",
    loadSubtitle:
      "اتصل بشبكتنا التي تضم أكثر من 50,000 سائق موثق في أوروبا والولايات المتحدة.",
    postLoadButton: "نشر حمولة",
    trustedBy: "موثوق من قادة القطاع.",
    accountSettings: "إعدادات الحساب",
    support: "الدعم",
    documentation: "الوثائق",
    logOut: "تسجيل الخروج",
    welcome: "أهلا بعودتك",
    dashboard: "لوحة التحكم",
    tracking: "التتبع",
    myFleet: "أسطولي",
    messages: "الرسائل",
    history: "السجل",
    settings: "الإعدادات",
    homeFeed: "بورصة الشحن",
    trailer: "مقطورة",
    tailLift: "رافعة خلفية",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    licensePlate: "رقم اللوحة",
    selectFuel: "اختر الوقود",
    yes: "نعم",
    no: "لا",
    continue: "متابعة",
    back: "رجوع",
    completeSetup: "اكمال الاعداد",
  }),
  pt: makeLandingTranslation({
    features: "Recursos",
    network: "Rede",
    pricing: "Precos",
    logIn: "Entrar",
    getStarted: "Comecar",
    heroTitle: "Conectamos motoristas mais rapido.",
    heroSubtitle: "Conectamos motoristas mais rapido.",
    trackShipment: "Rastrear envio",
    postLoad: "Publicar carga",
    trackingPlaceholder: "Digite o numero de rastreio (ex. PT-123456)",
    trackButton: "Rastrear agora",
    loadTitle: "Precisa mover carga?",
    loadSubtitle:
      "Conecte-se a nossa rede de mais de 50.000 motoristas verificados na Europa e nos EUA.",
    postLoadButton: "Publicar carga",
    trustedBy: "Confiado por lideres do setor.",
    welcome: "Bem-vindo de volta",
    dashboard: "Painel",
    tracking: "Rastreamento",
    myFleet: "Minha frota",
    messages: "Mensagens",
    history: "Historico",
    settings: "Configuracoes",
    homeFeed: "Bolsa de cargas",
    accountSettings: "Configuracoes da conta",
    support: "Suporte",
    documentation: "Documentacao",
    logOut: "Sair",
  }),
};

const myCargoLabels: Record<Exclude<Language, null>, string> = {
  en: "My Cargo",
  bs: "Moj teret",
  de: "Meine Fracht",
  pl: "Mój ładunek",
  ro: "Marfa mea",
  nl: "Mijn vracht",
  fr: "Mon fret",
  it: "Il mio carico",
  zh: "我的货物",
  es: "Mi carga",
  sr: "Moj teret",
  sv: "Min frakt",
  ar: "شحنتي",
  pt: "Minha carga",
};

const StatCard = ({
  label,
  value,
  sub,
  icon: Icon,
  delay,
  live = false,
  liveLabel = "Live",
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  delay: number;
  live?: boolean;
  liveLabel?: string;
}) => {
  const { ref, controls } = useScrollDownReveal(
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0 },
    0.3,
  );
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={controls}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-3xl bg-white/80 px-6 py-8 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 dark:bg-slate-950/70 dark:hover:shadow-black/20"
    >
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
          <Icon className="h-5 w-5" />
        </div>
        {live && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {liveLabel}
          </span>
        )}
      </div>
      <p className="mb-3 min-h-10 text-xs font-black uppercase leading-5 tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        aria-live={live ? "polite" : undefined}
        className="mb-2 font-display text-5xl font-black tracking-[-0.045em] text-slate-950 transition-colors group-hover:text-primary dark:text-white"
      >
        {value}
      </p>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {sub}
      </p>
    </motion.div>
  );
};

type LandingModule = {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  points: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }>;
};

const LandingModuleCard = ({
  module,
  index,
}: {
  module: LandingModule;
  index: number;
}) => {
  const { ref, controls } = useScrollDownReveal(
    { opacity: 0, y: 24, scale: 0.98 },
    { opacity: 1, y: 0, scale: 1 },
    0.2,
  );

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={controls}
      transition={{ duration: 0.55, delay: (index % 3) * 0.1, ease: "easeOut" }}
      className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950"
    >
      <div
        className={cn(
          "mb-4 flex h-11 w-11 items-center justify-center rounded-xl",
          module.tone,
        )}
      >
        <module.icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-black text-slate-900 dark:text-white">
        {module.name}
      </h3>
      <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500 dark:text-slate-400">
        {module.description}
      </p>
      <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        {module.points.map((point) => (
          <li
            key={point.label}
            className="flex min-h-5 items-center gap-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300"
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                module.tone,
              )}
            >
              <point.icon className="h-3 w-3" />
            </span>
            {point.label}
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

const LenaCapabilityCard = ({
  capability,
  index,
}: {
  capability: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    cardClass: string;
    iconClass: string;
  };
  index: number;
}) => {
  const { ref, controls } = useScrollDownReveal(
    { opacity: 0, y: 24, scale: 0.98 },
    { opacity: 1, y: 0, scale: 1 },
    0.2,
  );

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={controls}
      transition={{ duration: 0.55, delay: index * 0.1, ease: "easeOut" }}
      className={cn("rounded-2xl border p-5", capability.cardClass)}
    >
      <div
        className={cn(
          "mb-3 flex h-10 w-10 items-center justify-center rounded-xl",
          capability.iconClass,
        )}
      >
        <capability.icon className="h-5 w-5" />
      </div>
      <h3 className="font-black text-slate-900 dark:text-white">
        {capability.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
        {capability.description}
      </p>
    </motion.div>
  );
};

const LenaDataFlowReveal = ({ children }: { children: React.ReactNode }) => {
  const { ref, controls } = useScrollDownReveal(
    { opacity: 0, y: 28 },
    { opacity: 1, y: 0 },
    0.2,
  );

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={controls}
      transition={{ duration: 0.75, ease: "easeOut" }}
      className="relative mt-8"
    >
      {children}
    </motion.div>
  );
};

const LandingPage = ({
  onStart,
  onLogin,
  isDark,
  setIsDark,
  lang,
  setLang,
  scrollTarget,
  onScrolled,
}: {
  onStart: () => void;
  onLogin: () => void;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  lang: Language;
  setLang: (l: Language) => void;
  scrollTarget?: string | null;
  onScrolled?: () => void;
}) => {
  const [formType, setFormType] = useState<"track" | "load">("track");
  const [selectedWaypoint, setSelectedWaypoint] =
    useState<FeatureRouteStop["id"]>("zagreb");
  const [messageIndex, setMessageIndex] = useState(0);
  const [typedMessage, setTypedMessage] = useState("");
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [landingLoads, setLandingLoads] = useState<Load[]>([]);
  const [landingPackages, setLandingPackages] = useState<SubscriptionPackage[]>(
    [],
  );
  const [landingModuleCounts, setLandingModuleCounts] = useState<{
    recipients: number;
    tariff_codes: number;
  } | null>(null);
  const SECTION_PADDING = "py-20 sm:py-24 lg:py-32";
  const t = translations[lang || "en"];
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const activeLang = (lang || "en") as Exclude<Language, null>;
  const currentLang =
    languages.find((l) => l.id === (lang || "en")) || languages[0];
  const statsLocale = activeLang === "bs" ? "bs-BA" : activeLang === "de" ? "de-DE" : "en-US";
  const formatLandingCount = (value?: number) =>
    typeof value === "number" ? new Intl.NumberFormat(statsLocale).format(value) : "—";
  const titleMessages =
    HERO_MAIN_TITLE_MESSAGES[activeLang] || HERO_MAIN_TITLE_MESSAGES.en;
  // The modules a signed-in account meets in the sidebar. Names come from the same label sources
  // the app itself renders (translations / nav keys), so the landing page can never advertise a
  // module under a name that does not exist once you are inside.
  const appModules = [
    {
      name: t.homeFeed,
      description: u(
        "landing.modules.exchange",
        "Post loads and bid on freight across road, sea, air and rail.",
      ),
      icon: Boxes,
      tone: "bg-primary/10 text-primary",
      points: [
        {
          icon: Plus,
          label: u(
            "landing.modules.exchange.1",
            "Post road, sea, air and rail loads",
          ),
        },
        {
          icon: Coins,
          label: u(
            "landing.modules.exchange.2",
            "Collect and compare carrier offers",
          ),
        },
        {
          icon: Filter,
          label: u(
            "landing.modules.exchange.3",
            "Filter by route, price and cargo type",
          ),
        },
        {
          icon: CheckCircle2,
          label: u(
            "landing.modules.exchange.4",
            "Send instant booking requests",
          ),
        },
        {
          icon: MessageSquare,
          label: u("landing.modules.exchange.5", "Message carriers directly"),
        },
        {
          icon: History,
          label: u(
            "landing.modules.exchange.6",
            "Review offer and booking history",
          ),
        },
      ],
    },
    {
      name: myCargoLabels[activeLang],
      description: u(
        "landing.modules.tracking",
        "Follow every shipment from pickup to proof of delivery.",
      ),
      icon: PackageIcon,
      tone: "bg-violet-500/10 text-violet-500",
      points: [
        {
          icon: MapPin,
          label: u(
            "landing.modules.tracking.1",
            "Pickup and delivery windows per stop",
          ),
        },
        {
          icon: Clock,
          label: u(
            "landing.modules.tracking.2",
            "Live status and estimated arrival",
          ),
        },
        {
          icon: CheckCircle2,
          label: u(
            "landing.modules.tracking.3",
            "Proof of delivery on the load",
          ),
        },
        {
          icon: NotebookPen,
          label: u(
            "landing.modules.tracking.4",
            "Cargo references and documents",
          ),
        },
        {
          icon: Bell,
          label: u("landing.modules.tracking.5", "Exception and delay updates"),
        },
        {
          icon: Users,
          label: u("landing.modules.tracking.6", "Shared delivery milestones"),
        },
      ],
    },
    {
      name: u("nav.warehouse", "Warehouse"),
      description: u(
        "landing.modules.warehouse",
        "Storage capacity, dock schedule and occupancy per facility.",
      ),
      icon: Warehouse,
      tone: "bg-orange-500/10 text-orange-500",
      points: [
        {
          icon: Boxes,
          label: u(
            "landing.modules.warehouse.1",
            "Capacity and occupancy per facility",
          ),
        },
        {
          icon: History,
          label: u(
            "landing.modules.warehouse.2",
            "Inbound and outbound dock schedule",
          ),
        },
        {
          icon: ShieldCheck,
          label: u(
            "landing.modules.warehouse.3",
            "Storage types and certifications",
          ),
        },
        {
          icon: Clock,
          label: u("landing.modules.warehouse.4", "Dock booking coordination"),
        },
        {
          icon: RefreshCw,
          label: u("landing.modules.warehouse.5", "Inventory movement history"),
        },
        {
          icon: CheckCircle2,
          label: u(
            "landing.modules.warehouse.6",
            "Facility verification status",
          ),
        },
      ],
    },
    {
      name: t.myFleet,
      description: u(
        "landing.modules.fleet",
        "Vehicles, drivers and registry coverage in one register.",
      ),
      icon: Truck,
      tone: "bg-emerald-500/10 text-emerald-500",
      points: [
        {
          icon: Truck,
          label: u(
            "landing.modules.fleet.1",
            "Vehicles, trailers and capacities",
          ),
        },
        {
          icon: UserRound,
          label: u(
            "landing.modules.fleet.2",
            "Assigned drivers and availability",
          ),
        },
        {
          icon: Settings,
          label: u(
            "landing.modules.fleet.3",
            "Maintenance and registry coverage",
          ),
        },
        {
          icon: NotebookPen,
          label: u(
            "landing.modules.fleet.4",
            "Vehicle documents and expiry dates",
          ),
        },
        {
          icon: Mail,
          label: u("landing.modules.fleet.5", "Driver contact details"),
        },
        {
          icon: CheckCircle2,
          label: u("landing.modules.fleet.6", "Fleet readiness at a glance"),
        },
      ],
    },
    {
      name: u("documents.navLabel", "Documents"),
      description: u(
        "landing.modules.documents",
        "Load paperwork and dispatch notes tied to every load.",
      ),
      icon: NotebookPen,
      tone: "bg-sky-500/10 text-sky-500",
      points: [
        {
          icon: ScanSearch,
          label: u("landing.modules.documents.1", "Scan and attach paperwork"),
        },
        {
          icon: PackageIcon,
          label: u(
            "landing.modules.documents.2",
            "Filed against the right load",
          ),
        },
        {
          icon: History,
          label: u(
            "landing.modules.documents.3",
            "Searchable archive and notes",
          ),
        },
        {
          icon: CheckCircle2,
          label: u(
            "landing.modules.documents.4",
            "Upload status and file preview",
          ),
        },
        {
          icon: Users,
          label: u("landing.modules.documents.5", "Shared team access"),
        },
        {
          icon: ExternalLink,
          label: u(
            "landing.modules.documents.6",
            "Downloadable shipment records",
          ),
        },
      ],
    },
    {
      name: u("common.analytics", "Analytics"),
      description: u(
        "landing.modules.analytics",
        "Volumes, costs and on-time performance over any period.",
      ),
      icon: BarChart3,
      tone: "bg-indigo-500/10 text-indigo-500",
      points: [
        {
          icon: Coins,
          label: u("landing.modules.analytics.1", "Cost and revenue per lane"),
        },
        {
          icon: Clock,
          label: u("landing.modules.analytics.2", "On-time performance"),
        },
        {
          icon: History,
          label: u("landing.modules.analytics.3", "Any period, broken down"),
        },
        {
          icon: BarChart3,
          label: u("landing.modules.analytics.4", "Shipment volume trends"),
        },
        {
          icon: Truck,
          label: u(
            "landing.modules.analytics.5",
            "Carrier performance insights",
          ),
        },
        {
          icon: ExternalLink,
          label: u("landing.modules.analytics.6", "Export-ready reports"),
        },
      ],
    },
    {
      name: u("nav.finance", "Finance"),
      description: u(
        "landing.modules.finance",
        "Invoices, overdue balances and carrier payout approvals.",
      ),
      icon: Banknote,
      tone: "bg-amber-500/10 text-amber-500",
      points: [
        {
          icon: Coins,
          label: u(
            "landing.modules.finance.1",
            "Invoices and overdue balances",
          ),
        },
        {
          icon: CheckCircle2,
          label: u("landing.modules.finance.2", "Carrier payout approvals"),
        },
        {
          icon: ExternalLink,
          label: u("landing.modules.finance.3", "Export financial records"),
        },
        {
          icon: Clock,
          label: u("landing.modules.finance.4", "Payment status per invoice"),
        },
        {
          icon: BarChart3,
          label: u("landing.modules.finance.5", "Revenue and cost overview"),
        },
        {
          icon: Building2,
          label: u("landing.modules.finance.6", "Finance records by company"),
        },
      ],
    },
    {
      name: u("nav.teamPermissions", "Team & Permissions"),
      description: u(
        "landing.modules.team",
        "Invite people, assign company roles, control what they reach.",
      ),
      icon: Users,
      tone: "bg-rose-500/10 text-rose-500",
      points: [
        {
          icon: Mail,
          label: u("landing.modules.team.1", "Invite teammates by email"),
        },
        {
          icon: ShieldCheck,
          label: u("landing.modules.team.2", "Roles decide what opens"),
        },
        {
          icon: UserRound,
          label: u(
            "landing.modules.team.3",
            "Driver, dispatcher, finance, admin",
          ),
        },
        {
          icon: CheckCircle2,
          label: u("landing.modules.team.4", "Invite and access status"),
        },
        {
          icon: Building2,
          label: u("landing.modules.team.5", "Company-based permissions"),
        },
        {
          icon: Settings,
          label: u("landing.modules.team.6", "Admin role management"),
        },
      ],
    },
    {
      name: u("nav.map", "Map"),
      description: u(
        "landing.modules.map",
        "Live vehicle positions, stops and route geometry on one map.",
      ),
      icon: MapIcon,
      tone: "bg-cyan-500/10 text-cyan-500",
      points: [
        {
          icon: MapPin,
          label: u("landing.modules.map.1", "Vehicle positions and stops"),
        },
        {
          icon: Globe,
          label: u("landing.modules.map.2", "Route geometry across Europe"),
        },
        {
          icon: RefreshCw,
          label: u("landing.modules.map.3", "Refreshed as trackers report"),
        },
        {
          icon: CheckCircle2,
          label: u("landing.modules.map.4", "Pickup and delivery markers"),
        },
        {
          icon: Search,
          label: u("landing.modules.map.5", "Search by location"),
        },
        {
          icon: PackageIcon,
          label: u("landing.modules.map.6", "Open shipment details"),
        },
      ],
    },
    {
      name: u("landing.modules.recipients.name", "Recipient database"),
      description: u(
        "landing.modules.recipients",
        "Save recipient details once and reuse them when creating new loads.",
      ),
      icon: ContactRound,
      tone: "bg-teal-500/10 text-teal-500",
      points: [
        {
          icon: Database,
          label: `${u("landing.modules.recipients.1", "Central recipient directory")}${landingModuleCounts ? ` · ${landingModuleCounts.recipients.toLocaleString()} ${u("landing.modules.recipients.count", "recipients")}` : ""}`,
        },
        {
          icon: Building2,
          label: u(
            "landing.modules.recipients.2",
            "Company, address and contact details",
          ),
        },
        {
          icon: Search,
          label: u(
            "landing.modules.recipients.3",
            "Search by name, tax number or city",
          ),
        },
        {
          icon: Plus,
          label: u(
            "landing.modules.recipients.4",
            "Reuse recipients on new loads",
          ),
        },
        {
          icon: CheckCircle2,
          label: u(
            "landing.modules.recipients.5",
            "Reduce duplicate data entry",
          ),
        },
        {
          icon: Users,
          label: u(
            "landing.modules.recipients.6",
            "Shared access for the whole company",
          ),
        },
      ],
    },
    {
      name: u("nav.tariffsHs", "Tariffs & HS codes"),
      description: u(
        "landing.modules.tariffs",
        "Browse and search the complete multilingual customs tariff hierarchy.",
      ),
      icon: ScanSearch,
      tone: "bg-fuchsia-500/10 text-fuchsia-500",
      points: [
        {
          icon: Search,
          label: `${u("landing.modules.tariffs.1", "Search by HS code or product name")}${landingModuleCounts ? ` · ${landingModuleCounts.tariff_codes.toLocaleString()} ${u("landing.modules.tariffs.count", "codes")}` : ""}`,
        },
        {
          icon: Boxes,
          label: u("landing.modules.tariffs.2", "Browse sections and chapters"),
        },
        {
          icon: History,
          label: u(
            "landing.modules.tariffs.3",
            "Follow the indented code hierarchy",
          ),
        },
        {
          icon: CheckCircle2,
          label: u(
            "landing.modules.tariffs.4",
            "Select precise 10-digit tariff codes",
          ),
        },
        {
          icon: Globe,
          label: u(
            "landing.modules.tariffs.5",
            "Bosnian, German and English descriptions",
          ),
        },
        {
          icon: ExternalLink,
          label: u(
            "landing.modules.tariffs.6",
            "Export and print catalog results",
          ),
        },
      ],
    },
    {
      name: u("landing.modules.mobile.name", "Mobile app"),
      description: u(
        "landing.modules.mobile",
        "Manage loads, tracking and conversations wherever the work takes you.",
      ),
      icon: Smartphone,
      tone: "bg-lime-500/10 text-lime-600 dark:text-lime-400",
      points: [
        {
          icon: Smartphone,
          label: u("landing.modules.mobile.1", "Native iOS and Android access"),
        },
        {
          icon: Boxes,
          label: u(
            "landing.modules.mobile.2",
            "Post and review loads on the go",
          ),
        },
        {
          icon: MapPin,
          label: u("landing.modules.mobile.3", "Follow shipment tracking live"),
        },
        {
          icon: MessageSquare,
          label: u(
            "landing.modules.mobile.4",
            "Keep conversations close at hand",
          ),
        },
        {
          icon: MapIcon,
          label: u("landing.modules.mobile.5", "High-end navigation"),
        },
        {
          icon: Smartphone,
          label: u(
            "landing.modules.mobile.6",
            "Apple CarPlay and Android Auto",
          ),
        },
      ],
    },
  ];
  useEffect(() => {
    let active = true;

    void api.loads
      .publicList()
      .then((response) => {
        if (active) setLandingLoads(response.data.map(mapDatabaseRecordToLoad));
      })
      .catch(() => {
        if (active) setLandingLoads([]);
      });

    void api.subscriptionPackages
      .publicList()
      .then((response) => {
        if (active)
          setLandingPackages(response.data as unknown as SubscriptionPackage[]);
      })
      .catch(() => {
        if (active) setLandingPackages([]);
      });

    void api.landing
      .moduleCounts()
      .then((response) => {
        if (active) setLandingModuleCounts(response.data);
      })
      .catch(() => {
        if (active) setLandingModuleCounts(null);
      });

    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!scrollTarget) return;
    const element = document.getElementById(scrollTarget);
    element?.scrollIntoView({ behavior: "smooth" });
    onScrolled?.();
  }, [scrollTarget, onScrolled]);
  const activeMessageConfig =
    titleMessages[messageIndex % titleMessages.length];
  const activeKeyword = activeMessageConfig?.keyword ?? "";
  const activeMessageText = activeMessageConfig?.text ?? "";
  const activeKeywordStart = activeKeyword
    ? activeMessageText.indexOf(activeKeyword)
    : -1;

  const typedBeforeKeyword =
    activeKeywordStart >= 0
      ? typedMessage.slice(0, Math.min(typedMessage.length, activeKeywordStart))
      : typedMessage;
  const typedKeyword =
    activeKeywordStart >= 0 && typedMessage.length > activeKeywordStart
      ? typedMessage.slice(
          activeKeywordStart,
          Math.min(
            typedMessage.length,
            activeKeywordStart + activeKeyword.length,
          ),
        )
      : "";
  const typedAfterKeyword =
    activeKeywordStart >= 0
      ? typedMessage.slice(
          Math.min(
            typedMessage.length,
            activeKeywordStart + activeKeyword.length,
          ),
        )
      : "";
  const trackerTimeline = [
    {
      time: "06:40",
      title: u("landing.timeline.departedTitle", "Departed Zagreb Hub"),
      note: u("landing.timeline.departedNote", "Driver check-in confirmed"),
      icon: CheckCircle2,
      iconClass: "text-emerald-500 bg-emerald-500/12",
    },
    {
      time: "11:10",
      title: u("landing.timeline.stop1Title", "Stop 1: Munich Relay"),
      note: u(
        "landing.timeline.stop1Note",
        "Cargo scan and handoff checkpoint",
      ),
      icon: MapPin,
      iconClass: "text-amber-500 bg-amber-500/12",
    },
    {
      time: "15:45",
      title: u("landing.timeline.stop2Title", "Stop 2: Cologne Relay"),
      note: u(
        "landing.timeline.stop2Note",
        "Driver rest and route recalibration",
      ),
      icon: Clock,
      iconClass: "text-sky-500 bg-sky-500/12",
    },
    {
      time: u("landing.timeline.arrivalTime", "Tomorrow 07:20"),
      title: u("landing.timeline.arrivalTitle", "Arrival: Amsterdam DC"),
      note: u(
        "landing.timeline.arrivalNote",
        "Dock and unloading slot confirmed",
      ),
      icon: Truck,
      iconClass: "text-violet-500 bg-violet-500/12",
    },
  ];
  const lenaCapabilities = [
    {
      icon: Database,
      title: u("landing.aiDispatcher.loadDataTitle", "Current load context"),
      description: u(
        "landing.aiDispatcher.loadDataDesc",
        "Reads the authorized load record again before every reply—status, route, dates, cargo, references, and commercial details.",
      ),
      cardClass:
        "border-sky-100 bg-sky-50/80 dark:border-sky-500/15 dark:bg-sky-500/5",
      iconClass: "bg-sky-500/10 text-sky-500",
    },
    {
      icon: CheckCircle2,
      title: u(
        "landing.aiDispatcher.bookingTitle",
        "Book from the conversation",
      ),
      description: u(
        "landing.aiDispatcher.bookingDesc",
        "When an open load fits, a clear booking request becomes an in-chat action—without losing the load context.",
      ),
      cardClass:
        "border-emerald-100 bg-emerald-50/80 dark:border-emerald-500/15 dark:bg-emerald-500/5",
      iconClass: "bg-emerald-500/10 text-emerald-500",
    },
    {
      icon: MapPin,
      title: u("landing.aiDispatcher.guidanceTitle", "Guidance along the way"),
      description: u(
        "landing.aiDispatcher.guidanceDesc",
        "Find the right Freightbook.ai workflow, ask logistics questions, or get a useful map search once the area is known.",
      ),
      cardClass:
        "border-violet-100 bg-violet-50/80 dark:border-violet-500/15 dark:bg-violet-500/5",
      iconClass: "bg-violet-500/10 text-violet-500",
    },
    {
      icon: MessageSquare,
      title: u("landing.aiDispatcher.historyTitle", "One continuous workspace"),
      description: u(
        "landing.aiDispatcher.historyDesc",
        "Draft concise updates, start a fresh chat when needed, and find previous LenaAI conversations in Messages.",
      ),
      cardClass:
        "border-amber-100 bg-amber-50/80 dark:border-amber-500/15 dark:bg-amber-500/5",
      iconClass: "bg-amber-500/10 text-amber-500",
    },
  ];
  const lenaLoadFacts = [
    u("landing.aiDispatcher.factStatus", "Status"),
    u("landing.aiDispatcher.factRoute", "Route"),
    u("landing.aiDispatcher.factCargo", "Cargo"),
    u("landing.aiDispatcher.factDates", "Dates"),
    u("landing.aiDispatcher.factReferences", "References"),
    u("landing.aiDispatcher.factCommercials", "Commercials"),
  ];

  useEffect(() => {
    setMessageIndex(0);
    setTypedMessage("");
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
            : activeMessage.slice(0, prev.length + 1),
        );
      }, speed);
    }

    return () => clearTimeout(timeoutId);
  }, [typedMessage, isDeletingMessage, messageIndex, titleMessages]);

  return (
    <div className="min-h-screen overflow-x-clip bg-white dark:bg-slate-950 font-sans selection:bg-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center">
            <BrandWordmark className="text-base sm:text-2xl" />
          </div>
          <div className="hidden lg:flex items-center gap-10 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <a
              href="#lena-ai"
              className="inline-flex items-center gap-2 text-slate-700 transition-colors hover:text-primary dark:text-slate-200"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              LenaAI
            </a>
            <a href="#modules" className="hover:text-primary transition-colors">
              {u("landing.modules.navLabel", "Modules")}
            </a>
            <a
              href="#features"
              className="hover:text-primary transition-colors"
            >
              {t.features}
            </a>
            <a href="#network" className="hover:text-primary transition-colors">
              {t.network}
            </a>
            <a
              href="#enterprise"
              className="hover:text-primary transition-colors"
            >
              {t.enterprise}
            </a>
            <a href="#pricing" className="hover:text-primary transition-colors">
              {t.pricing}
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Language Switcher */}
            <div className="relative group">
              <button
                aria-label="Language switcher"
                title={currentLang.label}
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary hover:scale-105 transition-all cursor-pointer flex items-center justify-center"
              >
                <img
                  src={getFlagUrl(currentLang.id)}
                  srcSet={`${getFlagUrl(currentLang.id, 40)} 2x`}
                  alt={`${currentLang.label} flag`}
                  className="h-4 w-4 sm:h-5 sm:w-5 rounded-full object-cover"
                  loading="lazy"
                />
              </button>
              <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-[110]">
                {languages.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLang(l.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-xl text-sm font-medium transition-all cursor-pointer",
                      (lang || "en") === l.id
                        ? "bg-primary/10 text-primary"
                        : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800",
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
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-primary transition-all cursor-pointer flex items-center justify-center"
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={onLogin}
              className="hidden sm:block text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors cursor-pointer"
            >
              {t.logIn}
            </button>
            <Button
              onClick={onStart}
              size="md"
              className="h-9 rounded-full px-3 text-xs sm:h-auto sm:px-6 sm:text-sm cursor-pointer"
            >
              {t.getStarted}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Editorial Style */}
      <section className="relative min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-80px)] flex items-start pt-24 pb-16 sm:py-24 lg:py-32">
        <HeroMoleculeBackground />
        <div className="max-w-7xl min-w-0 mx-auto px-4 sm:px-6 grid lg:grid-cols-[3fr_2fr] gap-8 lg:gap-16 items-start w-full relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex min-w-0 flex-col justify-center pt-1 sm:pt-6 lg:pt-10"
          >
            <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary sm:px-4 sm:text-xs sm:tracking-[0.2em] mb-5 sm:mb-8 w-fit">
              <Globe className="w-3 h-3" />
              {u("landing.globalStandard", "Global Logistics Standard")}
            </div>
            <h1 className="text-[clamp(2.25rem,10vw,3.5rem)] sm:text-6xl md:text-8xl font-display font-black text-slate-900 dark:text-white leading-[1.02] sm:leading-[0.9] mb-6 sm:mb-8 h-[3.1em] sm:h-[2.7em] overflow-hidden [overflow-wrap:anywhere]">
              <span>{typedBeforeKeyword}</span>
              <span className="text-primary">{typedKeyword}</span>
              <span>{typedAfterKeyword}</span>
              <span className="inline-block ml-2 text-primary animate-pulse">
                |
              </span>
            </h1>
            <div className="mb-8 sm:mb-10 max-w-xl">
              <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 leading-relaxed">
                {u("landing.downloadApp", "Download the app")}
              </p>
              <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <button className="h-11 min-w-0 w-full px-1.5 sm:h-12 sm:w-auto sm:px-5 rounded-2xl bg-black text-white inline-flex items-center justify-center gap-1.5 sm:gap-3 font-semibold text-[9px] min-[400px]:text-[10px] sm:text-sm whitespace-nowrap shadow-lg shadow-black/25 cursor-pointer hover:bg-slate-900 transition-colors">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/500px-Apple_logo_black.svg.png?_=20250629104141"
                    alt="Apple"
                    className="h-4 w-4 object-contain invert"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <span>
                    {u("landing.downloadAppstore", "Download on App Store")}
                  </span>
                </button>
                <button className="h-11 min-w-0 w-full px-1.5 sm:h-12 sm:w-auto sm:px-5 rounded-2xl bg-black text-white inline-flex items-center justify-center gap-1.5 sm:gap-3 font-semibold text-[9px] min-[400px]:text-[10px] sm:text-sm whitespace-nowrap shadow-lg shadow-black/25 cursor-pointer hover:bg-slate-900 transition-colors">
                  <span className="text-sm leading-none" aria-hidden="true">
                    ▶
                  </span>
                  <span>
                    {u("landing.downloadPlaystore", "Download on Google Play")}
                  </span>
                </button>
              </div>
            </div>

            {/* Tracking Form - UPS Inspired */}
            <div className="min-w-0 max-w-xl w-full overflow-hidden bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 mb-6">
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-5 sm:mb-6 w-full sm:w-fit">
                <button
                  onClick={() => setFormType("track")}
                  className={cn(
                    "px-2 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                    formType === "track"
                      ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                  )}
                >
                  {t.trackShipment}
                </button>
                <button
                  onClick={() => setFormType("load")}
                  className={cn(
                    "px-2 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                    formType === "load"
                      ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                  )}
                >
                  {t.postLoad}
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                {formType === "track" ? (
                  <PackageIcon className="text-primary w-5 h-5" />
                ) : (
                  <Plus className="text-primary w-5 h-5" />
                )}
                <h3 className="font-bold dark:text-white">
                  {formType === "track" ? t.trackShipment : t.postLoad}
                </h3>
              </div>

              <AnimatePresence mode="wait">
                {formType === "track" ? (
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
                    <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {u(
                          "landing.trackHint",
                          "Numbers usually start with SWP-",
                        )}
                      </p>
                      <Button
                        onClick={onStart}
                        size="lg"
                        className="w-full min-[420px]:w-auto px-5 sm:px-8 rounded-full"
                      >
                        {t.trackButton} <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                          {ui(lang, "postLoadModal.pickup", "Pickup Location")}
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder={ui(
                              lang,
                              "postLoadModal.cityCountry",
                              "City, Country",
                            )}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                          {ui(
                            lang,
                            "postLoadModal.delivery",
                            "Delivery Destination",
                          )}
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder={ui(
                              lang,
                              "postLoadModal.cityCountry",
                              "City, Country",
                            )}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                          {ui(
                            lang,
                            "postLoadModal.weight",
                            "Cargo Weight (kg)",
                          )}
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                          {ui(lang, "postLoadModal.type", "Cargo Type")}
                        </label>
                        <select className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm appearance-none">
                          <option>
                            {ui(
                              lang,
                              "postLoadModal.generalCargo",
                              "General Cargo",
                            )}
                          </option>
                          <option>
                            {ui(lang, "postLoadModal.perishable", "Perishable")}
                          </option>
                          <option>
                            {ui(lang, "postLoadModal.hazardous", "Hazardous")}
                          </option>
                          <option>
                            {ui(lang, "postLoadModal.fragile", "Fragile")}
                          </option>
                        </select>
                      </div>
                    </div>
                    <Button
                      onClick={onStart}
                      size="lg"
                      className="w-full rounded-full mt-2"
                    >
                      {t.postLoadButton} <Plus className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-2 min-w-0 max-w-xl w-full overflow-hidden bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {u("landing.availableLoads", "Available Loads")}
                </h4>
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                  {landingLoads.length} {u("landing.liveCount", "live")}
                </span>
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
                          lang={lang}
                          hideSource
                          onOpenSetup={onStart}
                          statusLabel={trLoadStatus(lang, load.status)}
                          viewDetailsLabel={u(
                            "common.viewDetails",
                            "View Details",
                          )}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative min-w-0 max-w-full lg:sticky lg:top-32"
          >
            <div className="relative z-10 max-w-full bg-slate-100 dark:bg-slate-900 rounded-[1.25rem] sm:rounded-[1.75rem] p-1.5 sm:p-2 border border-slate-200 dark:border-slate-800">
              <div className="aspect-[4/3] min-w-0 rounded-[1rem] sm:rounded-[1.4rem] overflow-hidden relative group">
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
                    subdomains={["a", "b", "c", "d"]}
                  />
                  <Polyline
                    positions={HERO_ROUTE_POINTS}
                    pathOptions={{ color: "#00AEEF", weight: 5, opacity: 0.85 }}
                  />
                  <Marker position={HERO_ROUTE_START}>
                    <Popup>Hamburg, DE</Popup>
                  </Marker>
                  <Marker position={HERO_ROUTE_END}>
                    <Popup>Sarajevo, BA</Popup>
                  </Marker>
                </MapContainer>

                {/* Map Chips - Screenshot Inspired */}
                <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-[1000] flex max-w-[calc(100%-1.5rem)] flex-col gap-3">
                  <div className="min-w-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-2.5 sm:px-4 py-2 rounded-2xl shadow-xl border border-white/20 flex items-center gap-2 animate-bounce">
                    <Clock className="text-primary w-4 h-4" />
                    <span className="truncate text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      Hamburg → Sarajevo
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-3 left-3 right-3 sm:bottom-8 sm:left-8 sm:right-8 z-[1000] flex min-w-0 flex-col gap-2 sm:gap-4">
                  <div className="flex gap-3">
                    <div className="min-w-0 max-w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur px-2.5 sm:px-4 py-2 rounded-2xl shadow-xl border border-white/20 flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-primary hover:text-white transition-all group">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full overflow-hidden border-2 border-primary">
                        <img
                          src="https://picsum.photos/seed/driver/100/100"
                          alt="Driver"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary group-hover:text-white" />
                        <span className="truncate text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                          {u("landing.routeConfirmed", "Route Confirmed")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 bg-white/80 dark:bg-white/10 backdrop-blur-2xl p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/30 dark:border-white/20">
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4">
                      <span className="px-3 py-1 rounded-full bg-primary text-[10px] font-black uppercase tracking-widest text-white">
                        {u("landing.liveRoute", "Live Route")}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-white/70">
                        {u("landing.etaMarch3", "ETA Mar 3, 14:20")}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                        <Truck className="text-primary w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                          HAM-SJJ-214
                        </p>
                        <p className="truncate text-xs sm:text-sm text-slate-700 dark:text-white/60">
                          {u(
                            "landing.heroRouteMeta",
                            "1,545 km | Hamburg Port -> Sarajevo Hub",
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative z-10 mt-4 flex items-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-black text-white shadow-lg shadow-primary/20">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {u("landing.routeConfirmed", "Route Confirmed")}
            </div>
            {/* Decorative Blobs */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px] animate-pulse" />
          </motion.div>
        </div>
      </section>

      {/* Section 2: Product modules */}
      <section
        id="modules"
        className={cn(
          "scroll-mt-20 border-y border-slate-100 bg-slate-50/60 dark:border-slate-900 dark:bg-slate-900/20",
          SECTION_PADDING,
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="w-full">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-primary sm:text-xs">
              <Boxes className="h-4 w-4" />
              {u("landing.modules.eyebrow", "One platform · every module")}
            </div>
            <h2 className="w-full text-4xl font-black leading-[1.02] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-7xl">
              {u(
                "landing.modules.title",
                "Every part of the operation, under one login.",
              )}
            </h2>
            <p className="mt-6 w-full text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-xl sm:leading-8">
              {u(
                "landing.modules.subtitle",
                "These are the modules the product ships with - the same names you find in the sidebar once you are inside. Your role decides which ones open.",
              )}
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {appModules.map((module, index) => (
              <LandingModuleCard
                key={module.name}
                module={module}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* AI Dispatcher */}
      <section
        id="lena-ai"
        className={cn(
          "scroll-mt-20 relative overflow-hidden bg-white dark:bg-slate-950",
          SECTION_PADDING,
        )}
      >
        <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px] dark:bg-primary/15" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65 }}
            className="min-w-0"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-primary sm:text-xs">
              <Sparkles className="h-4 w-4" />
              {u(
                "landing.aiDispatcher.eyebrow",
                "Meet LenaAI · your AI operations partner",
              )}
            </div>
            <h2 className="w-full text-4xl font-black leading-[1.02] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-7xl">
              {u(
                "landing.aiDispatcher.title",
                "Ask your freight operation. Act from the answer.",
              )}
            </h2>
            <p className="mt-6 w-full text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-xl sm:leading-8">
              {u(
                "landing.aiDispatcher.description",
                "LenaAI is artificial intelligence built to work as a digital freight dispatcher. It helps freight forwarders coordinate loads, routes, statuses, and bookings, while giving drivers fast, clear answers about the work ahead—all from the latest data they are authorized to see.",
              )}
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {lenaCapabilities.map((capability, index) => (
                <LenaCapabilityCard
                  key={capability.title}
                  capability={capability}
                  index={index}
                />
              ))}
            </div>
          </motion.div>

          <LenaDataFlowReveal>
            <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgb(14_165_233/0.28)_1px,transparent_1px)] [background-size:22px_22px] dark:opacity-20" />
            <div className="relative grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
              <div className="min-w-0 space-y-3">
                <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 dark:border-sky-500/15 dark:bg-sky-500/5">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-sky-500">
                    <ScanSearch className="h-4 w-4" />
                    {u("landing.aiDispatcher.app", "Freightbook.ai app")}
                  </div>
                  <p className="mt-3 font-black text-slate-900 dark:text-white">
                    {u("landing.aiDispatcher.loadLabel", "Load SF-2048")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Sarajevo → Vienna ·{" "}
                    {u(
                      "landing.aiDispatcher.loadMeta",
                      "Pharma · 11,200 kg · Ambient",
                    )}
                  </p>
                </div>
                <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4 dark:border-violet-500/15 dark:bg-violet-500/5">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-violet-500">
                    <Database className="h-4 w-4" />
                    {u(
                      "landing.aiDispatcher.database",
                      "Authorized operations database",
                    )}
                  </div>
                  <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">
                    {u(
                      "landing.aiDispatcher.signalCount",
                      "Current operational record",
                    )}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <span className="h-2 rounded-full bg-sky-400" />
                    <span className="h-2 rounded-full bg-violet-400" />
                    <span className="h-2 rounded-full bg-emerald-400" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center py-2 md:px-3 md:py-0">
                <div className="hidden h-px w-8 bg-linear-to-r from-primary/20 to-primary md:block" />
                <div className="flex flex-col items-center gap-2">
                  <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-white shadow-[0_0_55px_rgba(14,165,233,0.24)] dark:bg-slate-950">
                    <div className="absolute inset-2 animate-pulse rounded-full bg-primary/10" />
                    <BrainCircuit className="relative h-12 w-12 text-primary" />
                  </div>
                  <span className="text-xs font-black tracking-wider text-primary">
                    LenaAI
                  </span>
                </div>
                <div className="hidden h-px w-8 bg-linear-to-r from-primary to-violet-400/20 md:block" />
              </div>

              <div className="flex min-w-0 flex-col justify-center rounded-2xl border border-primary/20 bg-slate-50 p-5 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-primary">
                  <RefreshCw className="h-4 w-4 animate-spin [animation-duration:4s]" />
                  {u(
                    "landing.aiDispatcher.contextRefresh",
                    "LenaAI refreshes the load context",
                  )}
                </div>
                <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">
                  {u(
                    "landing.aiDispatcher.contextReady",
                    "Grounded answer ready",
                  )}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {lenaLoadFacts.map((fact) => (
                    <span
                      key={fact}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-950"
                    >
                      {fact}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {u(
                    "landing.aiDispatcher.loadContext",
                    "Current load context",
                  )}
                </div>
              </div>
            </div>
            <div className="mt-20 border-t border-slate-200 sm:mt-24 dark:border-slate-700" />
          </LenaDataFlowReveal>

          <LenaScenarioSections lang={activeLang} />

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.75 }}
            className="hidden"
          >
            <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgb(14_165_233/0.28)_1px,transparent_1px)] [background-size:22px_22px] dark:opacity-20" />
            <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span>
                  <span className="block">LenaAI</span>
                  <span className="block text-[10px] font-semibold text-slate-400">
                    {u(
                      "landing.aiDispatcher.aiCore",
                      "Freightbook.ai assistant",
                    )}
                  </span>
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                {u("landing.aiDispatcher.liveSync", "Authorized context ready")}
              </div>
            </div>

            <div className="relative mb-6 grid min-w-0 gap-4 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
              <div className="min-w-0 space-y-3">
                <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 dark:border-sky-500/15 dark:bg-sky-500/5">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-sky-500">
                    <ScanSearch className="h-4 w-4" />
                    {u("landing.aiDispatcher.app", "Freightbook.ai app")}
                  </div>
                  <p className="mt-3 font-black text-slate-900 dark:text-white">
                    {u("landing.aiDispatcher.loadLabel", "Load SF-2048")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Sarajevo → Vienna ·{" "}
                    {u(
                      "landing.aiDispatcher.loadMeta",
                      "Pharma · 11,200 kg · Ambient",
                    )}
                  </p>
                </div>
                <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4 dark:border-violet-500/15 dark:bg-violet-500/5">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-violet-500">
                    <Database className="h-4 w-4" />
                    {u(
                      "landing.aiDispatcher.database",
                      "Authorized operations database",
                    )}
                  </div>
                  <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">
                    {u(
                      "landing.aiDispatcher.signalCount",
                      "Current operational record",
                    )}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <span className="h-2 rounded-full bg-sky-400" />
                    <span className="h-2 rounded-full bg-violet-400" />
                    <span className="h-2 rounded-full bg-emerald-400" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center py-2 md:px-3 md:py-0">
                <div className="hidden h-px w-8 bg-linear-to-r from-primary/20 to-primary md:block" />
                <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-white shadow-[0_0_55px_rgba(14,165,233,0.24)] dark:bg-slate-950">
                  <div className="absolute inset-2 animate-pulse rounded-full bg-primary/10" />
                  <BrainCircuit className="relative h-12 w-12 text-primary" />
                </div>
                <div className="hidden h-px w-8 bg-linear-to-r from-primary to-violet-400/20 md:block" />
              </div>

              <div className="flex min-w-0 flex-col justify-center rounded-2xl border border-primary/20 bg-slate-50 p-5 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-primary">
                  <RefreshCw className="h-4 w-4 animate-spin [animation-duration:4s]" />
                  {u(
                    "landing.aiDispatcher.contextRefresh",
                    "LenaAI refreshes the load context",
                  )}
                </div>
                <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">
                  {u(
                    "landing.aiDispatcher.contextReady",
                    "Grounded answer ready",
                  )}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {lenaLoadFacts.map((fact) => (
                    <span
                      key={fact}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-950"
                    >
                      {fact}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {u(
                    "landing.aiDispatcher.loadContext",
                    "Current load context",
                  )}
                </div>
              </div>
            </div>

            <div className="relative rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-primary">
                    {u(
                      "landing.aiDispatcher.loadContext",
                      "Current load context",
                    )}
                  </p>
                  <p className="mt-1 font-black text-slate-900 dark:text-white">
                    {u("landing.aiDispatcher.loadLabel", "Load SF-2048")}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                  {u(
                    "landing.aiDispatcher.openBooking",
                    "Posted · Open for booking",
                  )}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
                  Sarajevo <ArrowRight className="mx-1 inline h-3 w-3" /> Vienna
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
                  {u(
                    "landing.aiDispatcher.loadMeta",
                    "Pharma · 11,200 kg · Ambient",
                  )}
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
                  Incoterms DAP
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm">
                  {u(
                    "landing.aiDispatcher.demoQuestion",
                    "Can I take this load?",
                  )}
                </div>
                <div className="w-fit max-w-[92%] rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {u(
                    "landing.aiDispatcher.demoAnswer",
                    "Yes. This load is posted and currently open for booking. Review the current details and confirm below.",
                  )}
                </div>
                <button
                  onClick={onStart}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
                >
                  <span>
                    <span className="block text-xs font-black text-primary">
                      {u(
                        "landing.aiDispatcher.bookingReady",
                        "Booking action ready",
                      )}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-500">
                      {u(
                        "landing.aiDispatcher.bookingReadyDesc",
                        "Continue with the same verified load context",
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-xl bg-primary px-4 py-2 text-xs font-black text-white">
                    {u("landing.aiDispatcher.bookAction", "Book this load")}
                  </span>
                </button>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="relative mt-4 flex items-start gap-3 rounded-2xl border border-violet-200 bg-linear-to-r from-violet-50 via-white to-sky-50 p-4 dark:border-violet-500/20 dark:from-violet-500/10 dark:via-slate-950 dark:to-sky-500/10"
            >
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
              <p className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                {u(
                  "landing.aiDispatcher.groundedNote",
                  "LenaAI answers from the user’s authorized context. It does not claim live GPS access or invent missing operational details.",
                )}
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Platform statistics */}
      <section
        id="network"
        className={cn(
          "relative scroll-mt-28 overflow-hidden border-y border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50",
          SECTION_PADDING,
        )}
      >
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="mb-14 max-w-4xl lg:mb-16">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-primary">
              <BarChart3 className="h-4 w-4" />
              {u("landing.stats.eyebrow", "Platform in numbers")}
            </div>
            <h2 className="font-display text-4xl font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-7xl dark:text-white">
              {u(
                "landing.stats.title",
                "Numbers behind smarter logistics",
              )}
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: u("landing.stats.packagesTracked", "Packages Tracked"),
                value: "2.4B+",
                sub: u("landing.stats.annually", "Annually"),
                icon: PackageIcon,
              },
              {
                label: u("landing.stats.recipients", "Recipients"),
                value: formatLandingCount(landingModuleCounts?.recipients),
                sub: u("landing.stats.recipientDatabase", "In the recipient database"),
                icon: ContactRound,
                live: true,
              },
              {
                label: u("landing.stats.countriesCovered", "Countries Covered"),
                value: "192",
                sub: u("landing.stats.globalReach", "Global reach"),
                icon: Globe,
              },
              {
                label: u("landing.stats.tariffCodes", "Tariff Codes"),
                value: formatLandingCount(landingModuleCounts?.tariff_codes),
                sub: u("landing.stats.searchableHsEntries", "Searchable HS entries"),
                icon: ScanSearch,
                live: true,
              },
            ].map((stat, i) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                sub={stat.sub}
                icon={stat.icon}
                delay={i * 0.1}
                live={stat.live}
                liveLabel={u("landing.stats.liveData", "Live data")}
              />
            ))}
          </div>
        </div>
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </section>

      {/* Section 3: Bento Features Grid */}
      <section
        id="features"
        className={cn(
          "scroll-mt-28 bg-white dark:bg-slate-950",
          SECTION_PADDING,
        )}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-display font-black mb-6 dark:text-white tracking-tight">
              {u("landing.builtFor", "Built for the")} <br />{" "}
              <span className="text-primary">
                {u("landing.modernFleet", "Modern Fleet.")}
              </span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg">
              {u(
                "landing.modernFleetDesc",
                "Everything you need to manage global logistics at scale, from real-time tracking to AI-powered route optimization.",
              )}
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-6">
            {/* Main Feature */}
            <div className="md:col-span-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] p-12 flex border border-slate-100 dark:border-slate-800 group overflow-hidden relative transition-all duration-500">
              <div className="relative z-10 flex flex-1 flex-col">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                  <MapIcon className="text-white w-8 h-8" />
                </div>
                <h3 className="text-4xl font-bold mb-6 dark:text-white tracking-tight">
                  {u(
                    "landing.realTimeGlobalVisibility",
                    "Real-time Global Visibility",
                  )}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md text-xl leading-relaxed">
                  {u(
                    "landing.realTimeGlobalVisibilityDesc",
                    "Track every package, vehicle, and asset in real-time with sub-meter precision across 180+ countries.",
                  )}
                </p>
                <div className="mt-auto pt-8 flex gap-4">
                  <div className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 min-w-2 min-h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold dark:text-white">
                      99.9% Accuracy
                    </span>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold dark:text-white">
                      {u("landing.globalCoverage", "Global Coverage")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Feature 1 */}
            <div className="md:col-span-4 bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-black text-primary inline-flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    {u("landing.liveTracker", "Live Tracker")}
                  </p>
                  <p className="text-2xl font-black dark:text-white">
                    ZAG-AMS-881
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
                  {trPackageStatus(lang, "In Transit")}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 mb-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>
                    {u("landing.routeProgress.startHub", "Zagreb Hub")}
                  </span>
                  <span>
                    {u("landing.routeProgress.endHub", "Amsterdam DC")}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full w-[44%] bg-primary rounded-full" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs font-bold">
                  <span className="text-primary">
                    {u("landing.routeProgress.completed", "612 km completed")}
                  </span>
                  <span className="text-slate-500">
                    {u("landing.routeProgress.left", "779 km left")}
                  </span>
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
                  <HeroRouteFitBounds
                    points={FEATURE_ROUTE_POINTS_WITH_STOPS}
                  />
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                    subdomains={["a", "b", "c", "d"]}
                  />
                  <Polyline
                    positions={FEATURE_ROUTE_POINTS_WITH_STOPS}
                    pathOptions={{ color: "#00AEEF", weight: 4, opacity: 0.9 }}
                  />
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
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-primary mb-3">
                  {u("landing.routeTimeline", "Route Timeline")}
                </p>
                <div className="space-y-3">
                  {trackerTimeline.map((event, index) => (
                    <div
                      key={`${event.time}-${index}`}
                      className="flex items-start gap-3"
                    >
                      <div
                        className={cn(
                          "mt-0.5 w-6 h-6 rounded-lg shrink-0 flex items-center justify-center",
                          event.iconClass,
                        )}
                      >
                        <event.icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold dark:text-white truncate">
                            {event.title}
                          </p>
                          <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                            {event.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {event.note}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Feature 1 */}
            <div className="md:col-span-4 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] p-8 flex flex-col justify-between border border-slate-100 dark:border-slate-800 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {u("landing.routeStops", "Route Stops")}
                  </p>
                  <h3 className="text-2xl font-bold dark:text-white tracking-tight">
                    {u("landing.waypointPlanner", "Waypoint Planner")}
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                  {u("landing.fourMarkers", "4 Markers")}
                </span>
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
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Polyline
                    positions={FEATURE_ROUTE_POINTS_WITH_STOPS}
                    pathOptions={{ color: "#00AEEF", weight: 4, opacity: 0.9 }}
                  />
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
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:border-primary/50",
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-bold truncate">
                      {stop.label}
                    </span>
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
      <section
        className={cn("bg-slate-50 dark:bg-slate-900/50", SECTION_PADDING)}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20">
            <div>
              <h2 className="text-4xl md:text-6xl font-display font-black mb-8 dark:text-white leading-tight">
                {u("landing.howItWorksTitle1", "How Smartfreight.ai")} <br />{" "}
                <span className="text-primary">
                  {u("landing.howItWorksTitle2", "Works.")}
                </span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg mb-12">
                {u(
                  "landing.howItWorksDesc",
                  "We've simplified the complex world of global logistics into three simple steps.",
                )}
              </p>
              <div className="space-y-12 relative">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
                {[
                  {
                    step: "01",
                    title: u(
                      "landing.steps.connectFleet.title",
                      "Connect your Fleet",
                    ),
                    desc: u(
                      "landing.steps.connectFleet.desc",
                      "Integrate your existing vehicles or use our driver app to start tracking in minutes.",
                    ),
                  },
                  {
                    step: "02",
                    title: u(
                      "landing.steps.optimizeRoutes.title",
                      "Optimize Routes",
                    ),
                    desc: u(
                      "landing.steps.optimizeRoutes.desc",
                      "Our AI engine analyzes traffic, weather, and historical data to find the fastest paths.",
                    ),
                  },
                  {
                    step: "03",
                    title: u(
                      "landing.steps.deliverConfidence.title",
                      "Deliver with Confidence",
                    ),
                    desc: u(
                      "landing.steps.deliverConfidence.desc",
                      "Real-time updates and automated reporting keep your customers informed and happy.",
                    ),
                  },
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
                      <h4 className="text-2xl font-bold mb-2 dark:text-white">
                        {s.title}
                      </h4>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="sticky top-32">
                <img
                  src="https://picsum.photos/seed/logistics/800/1000"
                  alt="Logistics"
                  className="rounded-[3rem] shadow-2xl"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-10 -right-10 bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-xs">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                    </div>
                    <p className="font-bold dark:text-white">
                      {u("landing.routeOptimized", "Route Optimized")}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {u(
                      "landing.routeOptimizedDesc",
                      "AI reduced delivery time by 24% for this route.",
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: The Experience / Dashboard Preview */}
      <section
        id="enterprise"
        className={cn(
          "scroll-mt-28 bg-white dark:bg-slate-950 overflow-hidden relative",
          SECTION_PADDING,
        )}
      >
        <div className="max-w-7xl mx-auto mx-4 sm:mx-6 xl:mx-auto rounded-[2.5rem] bg-slate-900 px-6 py-12 sm:p-12 lg:p-16 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative order-2 lg:order-1">
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="bg-slate-800 rounded-[2.5rem] p-4 border border-slate-700"
              >
                <img
                  src="https://picsum.photos/seed/dashboard/1000/800"
                  alt="Dashboard"
                  className="rounded-[2rem] shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary rounded-full blur-[80px] opacity-30" />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl md:text-6xl font-display font-black text-white mb-8 leading-tight">
                {u("landing.controlOperationTitle1", "Control your entire")}{" "}
                <br />{" "}
                <span className="text-primary">
                  {u("landing.controlOperationTitle2", "Operation.")}
                </span>
              </h2>
              <div className="space-y-8">
                {[
                  {
                    title: u(
                      "landing.enterprise.unifiedDashboard.title",
                      "Unified Dashboard",
                    ),
                    desc: u(
                      "landing.enterprise.unifiedDashboard.desc",
                      "One screen to rule them all. Manage drivers, loads, and tracking in one place.",
                    ),
                  },
                  {
                    title: u(
                      "landing.enterprise.smartNotifications.title",
                      "Smart Notifications",
                    ),
                    desc: u(
                      "landing.enterprise.smartNotifications.desc",
                      "Get alerted before delays happen with our predictive analytics engine.",
                    ),
                  },
                  {
                    title: u(
                      "landing.enterprise.automatedReporting.title",
                      "Automated Reporting",
                    ),
                    desc: u(
                      "landing.enterprise.automatedReporting.desc",
                      "Generate complex logistics reports in seconds, not hours.",
                    ),
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="text-primary w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">
                        {item.title}
                      </h4>
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
      <section
        id="pricing"
        className={cn(
          "scroll-mt-28 bg-slate-50 dark:bg-slate-900/50",
          SECTION_PADDING,
        )}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-display font-black mb-6 dark:text-white tracking-tight">
              {u("landing.pricingTitle1", "Simple, Transparent")} <br />{" "}
              <span className="text-primary">
                {u("landing.pricingTitle2", "Pricing.")}
              </span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg">
              {u(
                "landing.pricingDesc",
                "Choose the plan that fits your business needs. No hidden fees.",
              )}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {landingPackages
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((pkg) => (
                <PricingPlanCard
                  key={pkg.id}
                  pkg={pkg}
                  lang={lang}
                  onSelect={onStart}
                  onLearnMoreLenaAI={() =>
                    document
                      .getElementById("lena-ai")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  ctaLabel={u("landing.getStarted", "Get Started")}
                />
              ))}
          </div>
        </div>
      </section>

      {/* Section 7: Testimonials - Wall of Love */}
      <section className={cn("bg-white dark:bg-slate-950", SECTION_PADDING)}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-display font-black mb-6 dark:text-white tracking-tight">
              {t.trustedBy.split(" ").map((word, i) => (
                <React.Fragment key={i}>
                  {i === 2 ? (
                    <>
                      <br /> <span className="text-primary">{word}</span>
                    </>
                  ) : (
                    word + " "
                  )}
                </React.Fragment>
              ))}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah Jenkins",
                role: "Logistics Director, TechCorp",
                text: "Freightbook.ai has completely transformed how we handle our last-mile deliveries. The AI insights are a game changer.",
              },
              {
                name: "Marco Rossi",
                role: "Fleet Manager, EuroTrans",
                text: "The real-time visibility is the best we've ever seen. Our drivers love the intuitive mobile app.",
              },
              {
                name: "Elena Petrova",
                role: "CEO, GlobalShip",
                text: "Scaling our operations across Europe was seamless with Freightbook.ai's multi-carrier integration.",
              },
              {
                name: "David Chen",
                role: "Operations Lead, FastMove",
                text: "The automated reporting saves our team at least 15 hours a week. Highly recommended for any serious fleet.",
              },
              {
                name: "Amira Al-Fayed",
                role: "Founder, DesertLogistics",
                text: "We needed a secure, enterprise-grade solution for our high-value loads. Freightbook.ai delivered exactly that.",
              },
              {
                name: "Lukas Weber",
                role: "Supply Chain Manager, AlpineGoods",
                text: "The route optimization engine is incredibly accurate. We've seen a 20% reduction in fuel costs.",
              },
            ].map((t, i) => (
              <Card
                key={i}
                className="p-8 hover:border-primary/50 transition-all"
              >
                <div className="flex gap-1 text-amber-400 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Globe key={star} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed italic">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={`https://picsum.photos/seed/person${i}/100/100`}
                      alt={t.name}
                      referrerPolicy="no-referrer"
                    />
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
      <section
        className={cn("bg-slate-50 px-6 dark:bg-slate-900/50", SECTION_PADDING)}
      >
        <div className="max-w-7xl mx-auto bg-primary rounded-[3rem] p-12 md:p-24 text-center text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-7xl font-display font-black mb-8">
              {u("landing.readyTo", "READY TO")} <br />{" "}
              {u("landing.startMoving", "START MOVING?")}
            </h2>
            <p className="text-xl text-white/70 mb-12 max-w-xl mx-auto">
              {u(
                "landing.ctaDesc",
                "Join thousands of companies optimizing their logistics with Smartfreight.ai today.",
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Button
                onClick={onStart}
                variant="secondary"
                size="lg"
                className="px-12 h-16 rounded-full text-lg font-bold text-primary bg-white hover:bg-slate-100"
              >
                {u("common.getStartedNow", "Get Started Now")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-12 h-16 rounded-full text-lg font-bold border-white text-white hover:bg-white/10"
              >
                {u("common.contactSales", "Contact Sales")}
              </Button>
            </div>
          </div>
          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        </div>
      </section>

      {/* Footer */}
      <footer
        className={cn(
          "bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900",
          SECTION_PADDING,
        )}
      >
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center mb-8">
              <BrandWordmark className="text-2xl" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">
              {u(
                "footer.tagline",
                "The next-generation logistics platform for the modern world. Built with precision, powered by AI.",
              )}
            </p>
            <div className="flex gap-4">
              {/* Brand placeholders */}
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center hover:bg-primary hover:text-white transition-all cursor-pointer"
                >
                  <FreightbookMark className="h-5 w-5" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h5 className="font-bold mb-6 dark:text-white">
              {u("footer.product", "Product")}
            </h5>
            <ul className="space-y-4 text-slate-500 dark:text-slate-400 text-sm">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  {t.tracking}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  {u("footer.fleetManagement", "Fleet Management")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  {u("footer.aiInsights", "AI Insights")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  {u("footer.apiDocs", "API Docs")}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-6 dark:text-white">
              {u("footer.company", "Company")}
            </h5>
            <ul className="space-y-4 text-slate-500 dark:text-slate-400 text-sm">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  {u("footer.aboutUs", "About Us")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  {u("footer.careers", "Careers")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  {u("footer.press", "Press")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  {u("footer.contact", "Contact")}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-slate-100 dark:border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-bold uppercase tracking-widest">
          <p>
            {u(
              "footer.rights",
              "© 2026 SWIFTPATH LOGISTICS INC. ALL RIGHTS RESERVED.",
            )}
          </p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-primary transition-colors">
              {u("footer.privacyPolicy", "Privacy Policy")}
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              {u("footer.termsOfService", "Terms of Service")}
            </a>
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
  onSwitchToSetup,
}: {
  mode: "setup" | "login";
  lang: Language;
  setLang: (l: Language) => void;
  onComplete: (role: Role, lang: Language) => void;
  onClose?: () => void;
  onSwitchToSetup?: () => void;
}) => {
  const [step, setStep] = useState(mode === "login" ? 1 : 2);
  const [role, setRole] = useState<Role>(null);
  const [lang, setLang] = useState<Language>(initialLang || "en");
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
    role: null as Role,
  });
  const [driverData, setDriverData] = useState({
    name: "",
    country: "",
    username: "",
    password: "",
    idPhoto: null as string | null,
  });
  const [driverType, setDriverType] = useState<"private" | "company" | null>(
    null,
  );
  const [companyData, setCompanyData] = useState({
    name: "",
    taxId: "",
    address: "",
  });
  const [carData, setCarData] = useState({
    make: "",
    model: "",
    year: "",
    plate: "",
    fuelType: "",
    hasTrailer: false,
    trailerCount: 0,
    hasTailLift: false,
    photo: null as string | null,
    isDetecting: false,
  });

  const t = translations[lang || "en"];
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  useEffect(() => {
    setStep(mode === "login" ? 1 : 2);
  }, [mode]);

  useEffect(() => {
    setLang(initialLang || "en");
  }, [initialLang]);

  useEffect(() => {
    const handleEscClose = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleEscClose);
    return () => window.removeEventListener("keydown", handleEscClose);
  }, [onClose]);

  const handleLogin = () => {
    if (!loginData.username || !loginData.password || !loginData.role) return;
    onComplete(loginData.role, lang);
  };

  const handleNext = () => {
    if (step === 1 && lang) setStep(2);
    else if (step === 2 && role) {
      if (role === "user") onComplete(role, lang);
      else setStep(3);
    } else if (
      step === 3 &&
      driverData.name &&
      driverData.country &&
      driverData.username &&
      driverData.password &&
      driverData.idPhoto
    ) {
      setStep(5); // Go to Driver Type
    } else if (step === 5 && driverType) {
      if (driverType === "company") setStep(6);
      else setStep(4);
    } else if (step === 6 && companyData.name && companyData.taxId) {
      setStep(4);
    } else if (
      step === 4 &&
      carData.make &&
      carData.model &&
      carData.plate &&
      carData.fuelType
    ) {
      onComplete(role, lang);
    }
  };

  const isSetupMode = mode !== "login";
  const canProceedSetup =
    step === 2
      ? Boolean(role)
      : step === 3
        ? Boolean(
            driverData.name &&
            driverData.country &&
            driverData.username &&
            driverData.password &&
            driverData.idPhoto,
          )
        : step === 5
          ? Boolean(driverType)
          : step === 6
            ? Boolean(companyData.name && companyData.taxId)
            : step === 4
              ? Boolean(
                  carData.make &&
                  carData.model &&
                  carData.plate &&
                  carData.fuelType,
                )
              : false;
  const canProceedLogin = Boolean(
    loginData.username && loginData.password && loginData.role,
  );
  const setupPrimaryLabel =
    step === 4 ? t.completeSetup : u("common.continue", "Continue");
  const handleSetupBack = () => {
    if (step === 2) onClose?.();
    else if (step === 3) setStep(2);
    else if (step === 5) setStep(3);
    else if (step === 6) setStep(5);
    else if (step === 4) setStep(driverType === "company" ? 6 : 5);
  };
  const setupLongStepClass =
    "space-y-6 h-[calc(100vh-16rem)] overflow-y-auto -mr-6 pr-6 pb-2 [scrollbar-gutter:stable]";
  const setupHeaderClass =
    "text-center sticky top-0 z-10 bg-white dark:bg-slate-900 pb-4 pt-1";

  if (mode === "login") {
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
        isSetupMode
          ? "h-screen overflow-hidden items-start pt-6"
          : "min-h-screen items-center",
      )}
    >
      <Card className="max-w-md w-full">
        <div className="pb-2">
          <AnimatePresence mode="wait">
            {mode === "login" && step === 1 && (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <User className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-bold dark:text-white">
                    {t.logIn}
                  </h2>
                  <p className="text-slate-500 text-sm mt-2">
                    {u(
                      "login.signInDesc",
                      "Sign in and enter the app immediately.",
                    )}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      {t.username}
                    </label>
                    <input
                      type="text"
                      placeholder="johndoe123"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                      value={loginData.username}
                      onChange={(e) =>
                        setLoginData((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      {t.password}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        setLoginData((prev) => ({ ...prev, role: "user" }))
                      }
                      className={cn(
                        "h-11 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer",
                        loginData.role === "user"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-slate-100 dark:border-slate-800 text-slate-500",
                      )}
                    >
                      {u("onboarding.customerTitle", "I'm a Customer")}
                    </button>
                    <button
                      onClick={() =>
                        setLoginData((prev) => ({ ...prev, role: "driver" }))
                      }
                      className={cn(
                        "h-11 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer",
                        loginData.role === "driver"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-slate-100 dark:border-slate-800 text-slate-500",
                      )}
                    >
                      {u("onboarding.driverTitle", "I'm a Driver")}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {mode !== "login" && step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <User className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-bold dark:text-white">
                    {u("onboarding.whoAreYou", "Who are you?")}
                  </h2>
                  <p className="text-slate-500 text-sm mt-2">
                    {u(
                      "onboarding.roleSubtitle",
                      "Select your role to personalize your experience",
                    )}
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => setRole("user")}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer",
                      role === "user"
                        ? "border-primary bg-primary/5"
                        : "border-slate-100 dark:border-slate-800 hover:border-primary",
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <PackageIcon className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold dark:text-white">
                        {u("onboarding.customerTitle", "I'm a Customer")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {u(
                          "onboarding.customerDesc",
                          "I want to track packages and post loads",
                        )}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => setRole("driver")}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer",
                      role === "driver"
                        ? "border-primary bg-primary/5"
                        : "border-slate-100 dark:border-slate-800 hover:border-primary",
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Truck className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold dark:text-white">
                        {u("onboarding.driverTitle", "I'm a Driver")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {u(
                          "onboarding.driverDesc",
                          "I want to manage deliveries and loads",
                        )}
                      </p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {mode !== "login" && step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={setupLongStepClass}
              >
                <div className={setupHeaderClass}>
                  <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-bold dark:text-white">
                    {u("onboarding.driverVerification", "Driver Verification")}
                  </h2>
                  <p className="text-slate-500 text-sm mt-2">
                    {u(
                      "onboarding.driverVerificationDesc",
                      "We need a few more details to get you on the road",
                    )}
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        {t.username}
                      </label>
                      <input
                        type="text"
                        placeholder="johndoe123"
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                        value={driverData.username}
                        onChange={(e) =>
                          setDriverData({
                            ...driverData,
                            username: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        {t.password}
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                        value={driverData.password}
                        onChange={(e) =>
                          setDriverData({
                            ...driverData,
                            password: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      {u("onboarding.fullName", "Full Name")}
                    </label>
                    <input
                      type="text"
                      placeholder="Full name"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors cursor-pointer"
                      value={driverData.name}
                      onChange={(e) =>
                        setDriverData({ ...driverData, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      {u("onboarding.country", "Country")}
                    </label>
                    <select
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                      value={driverData.country}
                      onChange={(e) =>
                        setDriverData({
                          ...driverData,
                          country: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        {u("onboarding.selectCountry", "Select Country")}
                      </option>
                      <option value="BA">
                        {u("onboarding.bosnia", "Bosnia and Herzegovina")}
                      </option>
                      <option value="DE">
                        {u("countries.germany", "Germany")}
                      </option>
                      <option value="US">
                        {u("countries.unitedStates", "United States")}
                      </option>
                      <option value="UK">
                        {u("countries.unitedKingdom", "United Kingdom")}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      {u("onboarding.idVerification", "ID Verification")}
                    </label>
                    <button
                      onClick={() =>
                        setDriverData({ ...driverData, idPhoto: "verified" })
                      }
                      className={cn(
                        "w-full p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer",
                        driverData.idPhoto
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10"
                          : "border-slate-200 dark:border-slate-800 hover:border-primary/50",
                      )}
                    >
                      {driverData.idPhoto ? (
                        <>
                          <CheckCircle2 className="text-emerald-500 w-8 h-8" />
                          <span className="text-sm font-bold text-emerald-600">
                            {u("onboarding.idUploaded", "ID Photo Uploaded")}
                          </span>
                        </>
                      ) : (
                        <>
                          <Camera className="text-slate-400 w-8 h-8" />
                          <span className="text-sm font-bold text-slate-500">
                            {u("onboarding.idUpload", "Upload Photo of ID")}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {mode !== "login" && step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <Truck className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-bold dark:text-white">
                    {u("onboarding.driverTypeTitle", "Driver Type")}
                  </h2>
                  <p className="text-slate-500 text-sm mt-2">
                    {u(
                      "onboarding.driverTypeDesc",
                      "Are you an independent driver or representing a company?",
                    )}
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    disabled={driverData.country === "BA"}
                    onClick={() => setDriverType("private")}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer",
                      driverType === "private"
                        ? "border-primary bg-primary/5"
                        : "border-slate-100 dark:border-slate-800 hover:border-primary",
                      driverData.country === "BA" &&
                        "opacity-50 cursor-not-allowed grayscale",
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <User className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold dark:text-white">
                        {u("onboarding.privateDriver", "Private Driver")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {driverData.country === "BA"
                          ? u(
                              "onboarding.notAllowedBosnia",
                              "Not allowed in Bosnia",
                            )
                          : u(
                              "onboarding.independentContractor",
                              "Independent contractor",
                            )}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => setDriverType("company")}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer",
                      driverType === "company"
                        ? "border-primary bg-primary/5"
                        : "border-slate-100 dark:border-slate-800 hover:border-primary",
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Globe className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold dark:text-white">
                        {u("onboarding.logisticsCompany", "Logistics Company")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {u(
                          "onboarding.registeredBusinessEntity",
                          "Registered business entity",
                        )}
                      </p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {mode !== "login" && step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={setupLongStepClass}
              >
                <div className={setupHeaderClass}>
                  <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-bold dark:text-white">
                    {u("onboarding.companyInfo", "Company Information")}
                  </h2>
                  <p className="text-slate-500 text-sm mt-2">
                    {u(
                      "onboarding.companyInfoDesc",
                      "Enter your registered business details",
                    )}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      {u("onboarding.companyName", "Company Name")}
                    </label>
                    <input
                      type="text"
                      placeholder="Swift Logistics Ltd"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                      value={companyData.name}
                      onChange={(e) =>
                        setCompanyData({ ...companyData, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      {u("onboarding.taxId", "Tax ID / VAT Number")}
                    </label>
                    <input
                      type="text"
                      placeholder="EU123456789"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                      value={companyData.taxId}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          taxId: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      {u("onboarding.businessAddress", "Business Address")}
                    </label>
                    <textarea
                      placeholder="123 Logistics Way, Berlin, Germany"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors h-24 resize-none"
                      value={companyData.address}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          address: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {mode !== "login" && step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={setupLongStepClass}
              >
                <div className={setupHeaderClass}>
                  <Truck className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-bold dark:text-white">
                    {u("onboarding.vehicleDetails", "Vehicle Details")}
                  </h2>
                  <p className="text-slate-500 text-sm mt-2">
                    {u(
                      "onboarding.vehicleDetailsDesc",
                      "Tell us about the vehicle you'll be driving",
                    )}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      {u("onboarding.vehiclePhoto", "Vehicle Photo")}
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.onchange = async (e: any) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = async (re) => {
                                const base64 = re.target?.result as string;
                                setCarData((prev) => ({
                                  ...prev,
                                  photo: base64,
                                  isDetecting: true,
                                }));
                                try {
                                  const ai = new GoogleGenAI({
                                    apiKey: process.env.GEMINI_API_KEY,
                                  });
                                  const response =
                                    await ai.models.generateContent({
                                      model: "gemini-3-flash-preview",
                                      contents: {
                                        parts: [
                                          {
                                            inlineData: {
                                              data: base64.split(",")[1],
                                              mimeType: file.type,
                                            },
                                          },
                                          {
                                            text: "Detect the car make, model, year, color, fuel type (Diesel, Gasoline, Electric, Hybrid), if it has a trailer, and if it has a tail lift (loading ramp at the back) from this image. Return the result in JSON format with keys: make, model, year, color, fuelType, hasTrailer (boolean), hasTailLift (boolean).",
                                          },
                                        ],
                                      },
                                      config: {
                                        responseMimeType: "application/json",
                                      },
                                    });
                                  const result = JSON.parse(response.text);
                                  setCarData((prev) => ({
                                    ...prev,
                                    make: result.make || "",
                                    model: result.model || "",
                                    year: result.year || "",
                                    fuelType: result.fuelType || "",
                                    hasTrailer: result.hasTrailer || false,
                                    hasTailLift: result.hasTailLift || false,
                                    isDetecting: false,
                                  }));
                                } catch (err) {
                                  console.error(err);
                                  setCarData((prev) => ({
                                    ...prev,
                                    isDetecting: false,
                                  }));
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          };
                          input.click();
                        }}
                        className={cn(
                          "w-full p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer",
                          carData.photo
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10"
                            : "border-slate-200 dark:border-slate-800 hover:border-primary/50",
                        )}
                      >
                        {carData.isDetecting ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        ) : carData.photo ? (
                          <>
                            <CheckCircle2 className="text-emerald-500 w-8 h-8" />
                            <span className="text-sm font-bold text-emerald-600">
                              {u("onboarding.photoUploaded", "Photo Uploaded")}
                            </span>
                          </>
                        ) : (
                          <>
                            <Camera className="text-slate-400 w-8 h-8" />
                            <span className="text-sm font-bold text-slate-500">
                              {u(
                                "onboarding.takePhotoAi",
                                "Take Photo to Detect AI",
                              )}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        {u("onboarding.make", "Make")}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mercedes"
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                        value={carData.make}
                        onChange={(e) =>
                          setCarData({ ...carData, make: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        {u("onboarding.model", "Model")}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sprinter"
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                        value={carData.model}
                        onChange={(e) =>
                          setCarData({ ...carData, model: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        {u("onboarding.year", "Year")}
                      </label>
                      <input
                        type="text"
                        placeholder="2024"
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                        value={carData.year}
                        onChange={(e) =>
                          setCarData({ ...carData, year: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        {t.selectFuel}
                      </label>
                      <select
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors cursor-pointer"
                        value={carData.fuelType}
                        onChange={(e) =>
                          setCarData({ ...carData, fuelType: e.target.value })
                        }
                      >
                        <option value="">{t.selectFuel}</option>
                        <option value="Diesel">
                          {trFuelType(lang, "Diesel")}
                        </option>
                        <option value="Gasoline">
                          {trFuelType(lang, "Gasoline")}
                        </option>
                        <option value="Electric">
                          {trFuelType(lang, "Electric")}
                        </option>
                        <option value="Hybrid">
                          {trFuelType(lang, "Hybrid")}
                        </option>
                        <option value="LPG">LPG</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      {t.licensePlate}
                    </label>
                    <input
                      type="text"
                      placeholder="ABC-1234"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                      value={carData.plate}
                      onChange={(e) =>
                        setCarData({ ...carData, plate: e.target.value })
                      }
                    />
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-4">
                    {/* Trailer Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            carData.hasTrailer
                              ? "bg-primary/10 text-primary"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-400",
                          )}
                        >
                          <Truck className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold dark:text-white">
                            {t.trailer}
                          </p>
                          <p className="text-[10px] text-slate-500 uppercase">
                            {u(
                              "onboarding.hasTrailerQuestion",
                              "Does your vehicle have a trailer?",
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setCarData({
                            ...carData,
                            hasTrailer: !carData.hasTrailer,
                          })
                        }
                        className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                          carData.hasTrailer
                            ? "bg-primary text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-500",
                        )}
                      >
                        {carData.hasTrailer ? t.yes : t.no}
                      </button>
                    </div>
                    {carData.hasTrailer && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="pt-2 border-t border-slate-200 dark:border-slate-700"
                      >
                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block">
                          {u(
                            "onboarding.numberOfTrailers",
                            "Number of Trailers",
                          )}
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3].map((num) => (
                            <button
                              key={num}
                              onClick={() =>
                                setCarData({ ...carData, trailerCount: num })
                              }
                              className={cn(
                                "flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                carData.trailerCount === num
                                  ? "bg-primary text-white"
                                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500",
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
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            carData.hasTailLift
                              ? "bg-primary/10 text-primary"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-400",
                          )}
                        >
                          <ChevronDown className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold dark:text-white">
                            {t.tailLift}
                          </p>
                          <p className="text-[10px] text-slate-500 uppercase">
                            {u(
                              "onboarding.hasTailLiftQuestion",
                              "Does your vehicle have a tail lift?",
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setCarData({
                            ...carData,
                            hasTailLift: !carData.hasTailLift,
                          })
                        }
                        className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                          carData.hasTailLift
                            ? "bg-primary text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-500",
                        )}
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
          aria-label={u("onboarding.closeSetup", "Close setup")}
          className="fixed top-4 right-4 z-[150] h-10 w-10 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-primary shadow-lg flex items-center justify-center cursor-pointer transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {(isSetupMode || mode === "login") && (
        <div className="fixed bottom-0 left-0 right-0 z-[140] px-4 pb-4">
          <div className="max-w-md w-full mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl p-3">
            <div className="flex gap-3">
              {isSetupMode ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSetupBack}
                    className="flex-1 cursor-pointer"
                    size="lg"
                  >
                    {u("common.back", "Back")}
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

const FEED_LOAD_CITY_COORDINATES: Record<string, [number, number]> = {
  "Vienna, AT": [48.2082, 16.3738],
  "Prague, CZ": [50.0755, 14.4378],
  "Zagreb, HR": [45.815, 15.9819],
  "Berlin, DE": [52.52, 13.405],
  "Sarajevo, BA": [43.8563, 18.4131],
  "Banja Luka, BA": [44.7722, 17.191],
  "Shanghai, CN": [31.2304, 121.4737],
  "Odesa, UA": [46.4825, 30.7233],
  "Ningbo, CN": [29.8683, 121.544],
  "Hamburg, DE": [53.5511, 9.9937],
  "Shenzhen, CN": [22.5431, 114.0579],
  "Rotterdam, NL": [51.9244, 4.4777],
  "Qingdao, CN": [36.0671, 120.3826],
  "Gdansk, PL": [54.352, 18.6466],
};

const getFeedLoadCoord = (place: string): [number, number] => {
  if (FEED_LOAD_CITY_COORDINATES[place])
    return FEED_LOAD_CITY_COORDINATES[place];
  const city = place.split(",")[0]?.trim() || "";
  const match = Object.entries(FEED_LOAD_CITY_COORDINATES).find(([label]) =>
    label.startsWith(city),
  );
  return match ? match[1] : [48.1351, 11.582];
};

const parseLoadPriceValue = (price: string) => {
  const digits = price.replace(/[^0-9]/g, "");
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseLoadWeightValue = (weight: string) => {
  const digits = weight.replace(/[^0-9]/g, "");
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getLoadLengthValue = (load: Load) => load.length;
const getLoadWidthValue = (load: Load) => load.width;
const getLoadHeightValue = (load: Load) => load.height;
const getLoadTemperatureMinValue = (load: Load) => load.temperatureMin ?? 15;
const getLoadTemperatureMaxValue = (load: Load) => load.temperatureMax ?? 25;
const getLoadCargoValue = (load: Load) => load.cargoValue;

type FeedDataMode = "all" | "organic" | "global";

type ExchangeMode = "transport" | "storage";

const SERVER_FILTER_BOUNDS = {
  priceMin: 0,
  priceMax: 1_000_000,
  weightMin: 0,
  weightMax: 100_000,
  lengthMin: 0,
  lengthMax: 100,
  widthMin: 0,
  widthMax: 20,
  heightMin: 0,
  heightMax: 20,
  temperatureMin: -80,
  temperatureMax: 80,
  cargoValueMin: 0,
  cargoValueMax: 10_000_000,
  transitMin: 0,
  transitMax: 200,
  palletsMin: 0,
  palletsMax: 100_000,
  volumeMin: 0,
  volumeMax: 1_000_000,
};

const estimateLoadTransitDays = (pickup: string, delivery: string) => {
  const [lat1, lon1] = getFeedLoadCoord(pickup);
  const [lat2, lon2] = getFeedLoadCoord(delivery);
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = 6371 * c;
  return Math.max(1, Math.ceil(distanceKm / 700));
};

const getInitialSidebarState = (): boolean => {
  if (typeof window === "undefined") return true;

  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "collapsed";
};

const numericBounds = (
  values: Array<number | undefined>,
  fallback: [number, number],
) => {
  const present = values.filter(
    (value): value is number => value !== undefined && Number.isFinite(value),
  );
  if (present.length === 0) return fallback;
  const min = Math.min(...present);
  const max = Math.max(...present);
  return min === max
    ? ([Math.min(0, min), Math.max(fallback[1], max)] as const)
    : ([min, max] as const);
};

const buildFeedRangeBounds = (loads: Load[]) => {
  const sourceLoads = loads;
  if (sourceLoads.length === 0)
    return {
      priceMin: 0,
      priceMax: 0,
      weightMin: 0,
      weightMax: 0,
      lengthMin: 0,
      lengthMax: 0,
      widthMin: 0,
      widthMax: 0,
      heightMin: 0,
      heightMax: 0,
      temperatureMin: 0,
      temperatureMax: 0,
      cargoValueMin: 0,
      cargoValueMax: 0,
      transitMin: 0,
      transitMax: 0,
    };
  const prices = sourceLoads.map((load) => parseLoadPriceValue(load.price));
  const weights = sourceLoads.map((load) => parseLoadWeightValue(load.weight));
  const [lengthMin, lengthMax] = numericBounds(
    sourceLoads.map(getLoadLengthValue),
    [0, 32],
  );
  const [widthMin, widthMax] = numericBounds(
    sourceLoads.map(getLoadWidthValue),
    [0, 3],
  );
  const [heightMin, heightMax] = numericBounds(
    sourceLoads.map(getLoadHeightValue),
    [0, 4],
  );
  const temperatureMins = sourceLoads.map(getLoadTemperatureMinValue);
  const temperatureMaxs = sourceLoads.map(getLoadTemperatureMaxValue);
  const [cargoValueMin, cargoValueMax] = numericBounds(
    sourceLoads.map(getLoadCargoValue),
    [0, 250000],
  );
  const [transitMin, transitMax] = numericBounds(
    sourceLoads.map((load) => load.transitDays),
    [1, 30],
  );

  return {
    priceMin: Math.min(...prices),
    priceMax: Math.max(...prices),
    weightMin: Math.min(...weights),
    weightMax: Math.max(...weights),
    lengthMin,
    lengthMax,
    widthMin,
    widthMax,
    heightMin,
    heightMax,
    temperatureMin: Math.min(...temperatureMins),
    temperatureMax: Math.max(...temperatureMaxs),
    cargoValueMin,
    cargoValueMax,
    transitMin,
    transitMax,
  };
};

const mapGlobalOfferToLoad = (
  offer: (typeof GLOBAL_OFFERS)[number],
  index: number,
): Load => {
  const goodsTypes = [
    "High Value",
    "Fragile",
    "Heavy",
    "General",
    "Perishable",
  ];
  const paymentTerms: Array<Load["paymentTerms"]> = [
    "Negotiable",
    "In Advance",
    "On Delivery",
  ];
  const goodsType = goodsTypes[index % goodsTypes.length];
  const paymentTerm = paymentTerms[index % paymentTerms.length];
  const weight = String(6000 + index * 1700);

  return {
    id: `G-${offer.id}`,
    title: `${offer.carrier} Global Freight`,
    weight,
    price: `USD ${offer.priceUsd.toLocaleString("en-US")}`,
    length: 12.4 + (index % 3) * 0.6,
    width: 2.45,
    height: 2.6,
    temperatureMin: index % 4 === 0 ? -18 : 5,
    temperatureMax: index % 4 === 0 ? -12 : 25,
    adrClass: index % 5 === 0 ? "3" : "None",
    cargoValue: 45000 + index * 8500,
    isFragile: index % 3 === 0,
    urgency: index % 2 === 0 ? "Express" : "Standard",
    loadingMethods:
      index % 3 === 0
        ? ["Forklift", "Manual"]
        : index % 3 === 1
          ? ["Crane"]
          : ["Forklift"],
    transitDays: estimateLoadTransitDays(offer.origin, offer.destination),
    pickup: offer.origin,
    delivery: offer.destination,
    date: `March ${2 + index}, 2026`,
    author: offer.carrier,
    status: "Posted",
    cargoType: "Ocean Freight",
    goodsType,
    paymentTerms: paymentTerm,
    eta: `March ${2 + index}, ${String(10 + (index % 10)).padStart(2, "0")}:00`,
  };
};

const stopPosition = (
  stop?: Record<string, unknown>,
): [number, number] | undefined => {
  const latitude = Number(stop?.latitude);
  const longitude = Number(stop?.longitude);
  return Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    (latitude !== 0 || longitude !== 0)
    ? [latitude, longitude]
    : undefined;
};

const mapDatabaseRecordToLoad = (record: Record<string, unknown>): Load => {
  const stops = Array.isArray(record.stops)
    ? (record.stops as Array<Record<string, unknown>>)
    : [];
  const pickup = stops.find((stop) => stop.type === "pickup");
  const delivery = [...stops]
    .reverse()
    .find((stop) => stop.type === "delivery");
  const rawStatus = String(record.status || "pending").toLowerCase();
  const statusMap: Record<string, Load["status"]> = {
    posted: "Posted",
    opened: "Opened",
    sent: "Sent",
    in_delivery: "In delivery",
    received: "Received",
    finished: "Finished",
    pending: "Pending",
    cancelled: "Cancelled",
  };
  const status = statusMap[rawStatus] || "Pending";
  const terms = String(record.payment_terms || "negotiable").toLowerCase();
  const paymentTerms =
    terms === "in_advance"
      ? "In Advance"
      : terms === "on_delivery"
        ? "On Delivery"
        : terms === "deferred"
          ? "Deferred"
          : terms === "negotiable"
            ? "Negotiable"
            : terms
                .split("_")
                .filter(Boolean)
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(" ") || "—";
  const loadingMethods = Array.isArray(record.loading_methods)
    ? record.loading_methods.filter(
        (method): method is "Forklift" | "Crane" | "Manual" =>
          ["Forklift", "Crane", "Manual"].includes(String(method)),
      )
    : [];
  const pickupDate = Date.parse(String(pickup?.window_starts_at || ""));
  const deliveryDate = Date.parse(
    String(delivery?.window_ends_at || delivery?.window_starts_at || ""),
  );
  const transitDays =
    Number.isFinite(pickupDate) && Number.isFinite(deliveryDate)
      ? Math.max(1, Math.ceil((deliveryDate - pickupDate) / 86400000))
      : undefined;

  return {
    id: String(record.id),
    title: String(record.title || `Load ${record.public_id || record.id}`),
    weight: Number(record.weight_kg || 0).toLocaleString(),
    price: `${String(record.currency || "EUR")} ${Number(record.budget || 0).toLocaleString()}`,
    length: record.length_m == null ? undefined : Number(record.length_m),
    width: record.width_m == null ? undefined : Number(record.width_m),
    height: record.height_m == null ? undefined : Number(record.height_m),
    temperatureMin:
      record.temperature_min == null ? 15 : Number(record.temperature_min),
    temperatureMax:
      record.temperature_max == null ? 25 : Number(record.temperature_max),
    cargoValue:
      record.declared_value == null ? undefined : Number(record.declared_value),
    isFragile: Boolean(record.is_fragile),
    urgency: record.is_urgent ? "Express" : "Standard",
    loadingMethods,
    transitDays,
    pickup: [pickup?.city, pickup?.country_code].filter(Boolean).join(", "),
    delivery:
      [delivery?.city, delivery?.country_code].filter(Boolean).join(", ") ||
      [record.warehouse_city, record.warehouse_country_code]
        .filter(Boolean)
        .join(", "),
    pickupPosition: stopPosition(pickup),
    deliveryPosition: stopPosition(delivery),
    pickupAt: String(pickup?.window_starts_at || ""),
    date: String(record.published_at || record.created_at || ""),
    author: String(
      (record.company as { name?: string } | undefined)?.name ||
        (record.customer as { name?: string } | undefined)?.name ||
        "",
    ),
    status,
    cargoType: String(record.cargo_type || ""),
    goodsType: String(record.goods_type || ""),
    hsCodes: Array.isArray(record.hs_codes)
      ? (record.hs_codes as Array<{
          code: string;
          description: string;
          confidence?: number;
        }>)
      : [],
    paymentTerms,
    paymentDueDays:
      record.payment_due_days == null
        ? undefined
        : Number(record.payment_due_days),
    transportType:
      record.transport_type === "warehouse"
        ? "warehouse"
        : record.transport_type === "air"
          ? "air"
          : record.transport_type === "sea"
            ? "sea"
            : record.transport_type === "rail"
              ? "rail"
              : "road",
    forStorage: Boolean(record.for_storage),
    storageRadiusKm:
      record.warehouse_radius_km == null
        ? undefined
        : Number(record.warehouse_radius_km),
    storageType:
      record.storage_type == null ? undefined : String(record.storage_type),
    storageStartDate:
      record.storage_start_date == null
        ? undefined
        : String(record.storage_start_date),
    storageEndDate:
      record.storage_end_date == null
        ? undefined
        : String(record.storage_end_date),
    isStorageOngoing: Boolean(record.is_storage_ongoing),
    warehouseRequirements: [
      record.requires_customs_bonded ? "Customs bonded" : "",
      record.requires_racking ? "Racking" : "",
      record.insurance_required ? "Insurance" : "",
      record.requires_security ? "Security" : "",
    ].filter(Boolean),
    storageServices: Array.isArray(record.handling_requirements)
      ? record.handling_requirements.map(String)
      : [],
    storageRateUnit:
      record.rate_unit == null ? undefined : String(record.rate_unit),
    requiresFoodGrade: Boolean(record.requires_food_grade),
    eta: String(
      delivery?.window_starts_at ||
        delivery?.window_ends_at ||
        record.completed_at ||
        "",
    ),
    isNegotiable:
      record.is_negotiable == null ? true : Boolean(record.is_negotiable),
    budget: record.budget == null ? undefined : Number(record.budget),
    offers: Array.isArray(record.offers)
      ? (record.offers as Array<Record<string, unknown>>)
      : [],
    bookingReference:
      record.booking_reference == null
        ? undefined
        : String(record.booking_reference),
    incoterms: record.incoterms == null ? undefined : String(record.incoterms),
    insurance: record.insurance == null ? undefined : String(record.insurance),
    shipperName:
      record.shipper_name == null ? undefined : String(record.shipper_name),
    providerRating: Number(
      (record.company as { rating?: unknown; average_rating?: unknown } | undefined)?.rating
        ?? (record.company as { average_rating?: unknown } | undefined)?.average_rating
        ?? (record.assigned_driver as { driver?: { rating?: unknown } } | undefined)?.driver?.rating
        ?? 0,
    ),
    mediator: record.mediator == null ? undefined : String(record.mediator),
    publicId: record.public_id == null ? undefined : String(record.public_id),
    trackingNumber:
      String(
        (record.shipment as { tracking_number?: unknown } | undefined)
          ?.tracking_number || "",
      ) || undefined,
    volume: record.volume_m3 == null ? undefined : Number(record.volume_m3),
    pallets: record.pallets == null ? undefined : Number(record.pallets),
    truckType:
      record.vehicle_type == null ? undefined : String(record.vehicle_type),
    requiresAdr: Boolean(record.requires_adr),
    tollRoadsIncluded: Boolean(record.toll_roads_included),
    ferryIncluded: Boolean(record.ferry_included),
    cmrRequired: Boolean(record.cmr_required),
    palletExchangeRequired: Boolean(record.pallet_exchange_required),
    customsRequired: Boolean(record.customs_required),
    pickupWindowStart:
      pickup?.window_starts_at == null
        ? undefined
        : String(pickup.window_starts_at),
    pickupWindowEnd:
      pickup?.window_ends_at == null
        ? undefined
        : String(pickup.window_ends_at),
    deliveryWindowStart:
      delivery?.window_starts_at == null
        ? undefined
        : String(delivery.window_starts_at),
    deliveryWindowEnd:
      delivery?.window_ends_at == null
        ? undefined
        : String(delivery.window_ends_at),
  };
};

const getDefaultViewForRole = (
  role: Exclude<Role, null>,
  user?: ApiUser | null,
) =>
  role === "driver"
    ? "feed"
    : role === "company"
      ? user?.companies?.some((company) => Boolean(company.warehouse_first))
        ? "warehouse-overview"
        : "company"
      : role === "finance"
        ? "finance"
        : role === "warehouse"
          ? "warehouse-overview"
          : role === "superadmin" || role === "master"
            ? "admin"
            : "tracking";

export default function App() {
  const [isLanding, setIsLanding] = useState(true);
  const [landingScrollTarget, setLandingScrollTarget] = useState<string | null>(
    null,
  );
  const [isAuthRestoring, setIsAuthRestoring] = useState(true);
  const [authMode, setAuthMode] = useState<"setup" | "login">("setup");
  const [role, setRole] = useState<Role>(null);
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [databaseLoads, setDatabaseLoads] = useState<Load[]>([]);
  const [databaseLoadsLoaded, setDatabaseLoadsLoaded] = useState(false);
  const [lang, setLang] = useState<Language>(() => getInitialLanguage());
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [view, setView] = useState("tracking");
  const [trackingMapActive, setTrackingMapActive] = useState(false);
  const isTrackingMapActive =
    (view === "tracking" || view === "history") && trackingMapActive;
  // The sidebar "Map" entry is a shortcut into the tracking screen's map layout rather than its
  // own view, so navigation carries the layout it wants Tracking to open in.
  const [trackingLayoutRequest, setTrackingLayoutRequest] = useState<{
    mode: TrackingLayoutMode;
    nonce: number;
  } | null>(null);
  const navigateTo = (id: string) => {
    if (id === "map") {
      setTrackingLayoutRequest((prev) => ({
        mode: "map",
        nonce: (prev?.nonce ?? 0) + 1,
      }));
      setView("tracking");
      return;
    }
    if (id === "tracking") {
      setTrackingLayoutRequest((prev) => ({
        mode: "grid",
        nonce: (prev?.nonce ?? 0) + 1,
      }));
    }
    setView(id);
  };
  const isNavItemActive = (id: string) => {
    if (id === "map") return isTrackingMapActive;
    if (id === "tracking") return view === "tracking" && !isTrackingMapActive;
    return view === id;
  };
  const [checkoutPackageId, setCheckoutPackageId] = useState<number | null>(
    null,
  );
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pricingRefreshSignal, setPricingRefreshSignal] = useState(0);
  const viewContentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    viewContentRef.current?.scrollTo({ top: 0 });
  }, [view]);
  const [openLoadDetailsId, setOpenLoadDetailsId] = useState<string | null>(
    null,
  );
  const [bookingLoad, setBookingLoad] = useState<Load | null>(null);
  const handleBookLoad = async (loadId?: string) => {
    if (!loadId) return;
    const response = await api.loads.get(loadId);
    setBookingLoad(mapDatabaseRecordToLoad(response.data));
  };
  const [lenaAiOpen, setLenaAiOpen] = useState(false);
  const [lenaCanvasMode, setLenaCanvasMode] = useState<LenaCanvasMode | null>(
    null,
  );
  const [lenaLoadPrefill, setLenaLoadPrefill] = useState<ScanFieldPatch | null>(
    null,
  );
  const [lenaSourceConversationId, setLenaSourceConversationId] = useState<
    string | null
  >(null);
  const [lenaSourceDraftId, setLenaSourceDraftId] = useState<string | null>(
    null,
  );
  // Bumped whenever the standalone LenaAI overlay closes, so MessagesView (which stays mounted
  // underneath it the whole time) knows to refetch instead of showing whatever it had cached
  // before LenaAI possibly added messages elsewhere.
  const [messagesRefreshSignal, setMessagesRefreshSignal] = useState(0);
  // Bumped when the sidebar "LenaAI" button is clicked while already on Messages - there's
  // nowhere else for that click to navigate to, so it starts a new chat instead.
  const [messagesNewChatSignal, setMessagesNewChatSignal] = useState(0);
  // Set right after a first manual "Save as draft" creates its own LenaAI conversation, so
  // MessagesView opens that specific conversation instead of landing on the generic chat list.
  const [openMessagesConversationId, setOpenMessagesConversationId] = useState<
    string | null
  >(null);
  const [isDark, setIsDark] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    getInitialSidebarState(),
  );
  const [isPostLoadOpen, setIsPostLoadOpen] = useState(false);
  const [warehouseCreateSignal, setWarehouseCreateSignal] = useState(0);
  const [editLoadId, setEditLoadId] = useState<string | null>(null);
  const [loadRefreshKey, setLoadRefreshKey] = useState(0);
  const trackingCompanyIds = useMemo(
    () =>
      (currentUser?.companies || [])
        .map((company) => Number(company.id))
        .filter(Number.isFinite),
    [currentUser],
  );
  const [feedSortMode, setFeedSortMode] = useState<FeedSortMode>("price_asc");
  const [feedDataMode, setFeedDataMode] = useState<FeedDataMode>("organic");
  const [exchangeMode, setExchangeMode] = useState<ExchangeMode>("transport");
  const [feedFilterBarLoading, setFeedFilterBarLoading] = useState(false);
  const prevExchangeModeRef = useRef(exchangeMode);
  const exchangeModeTransitionTimerRef = useRef<number | null>(null);
  const [feedMyBidsOnly, setFeedMyBidsOnly] = useState(false);
  // Freight-exchange filter groups (Transport / Route / Cargo / Equipment / Date / Requirements /
  // Assignment). Kept as one object so adding a group does not mean threading another state pair.
  const EMPTY_EXCHANGE_FILTERS = {
    transportModes: [] as string[],
    route: {
      pickupCountry: "",
      pickupCity: "",
      deliveryCountry: "",
      deliveryCity: "",
    },
    cargoFlags: [] as string[],
    equipmentTypes: [] as string[],
    dates: {
      pickupDateFrom: "",
      pickupDateTo: "",
      deliveryDateFrom: "",
      deliveryDateTo: "",
    },
    currency: "",
    specialRequirements: [] as string[],
    assignment: [] as string[],
  };
  const [exchangeFilters, setExchangeFilters] = useState(
    EMPTY_EXCHANGE_FILTERS,
  );
  const toggleExchangeList = (
    key:
      | "transportModes"
      | "cargoFlags"
      | "equipmentTypes"
      | "specialRequirements"
      | "assignment",
    id: string,
  ) =>
    setExchangeFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(id)
        ? prev[key].filter((value) => value !== id)
        : [...prev[key], id],
    }));
  const globalFeedLoads = useMemo<Load[]>(
    () =>
      GLOBAL_OFFERS.map((offer, index) => mapGlobalOfferToLoad(offer, index)),
    [],
  );
  const organicFeedLoads = databaseLoads;
  const allFeedLoads = useMemo<Load[]>(
    () => [...organicFeedLoads, ...globalFeedLoads],
    [organicFeedLoads, globalFeedLoads],
  );
  const allFeedRangeBounds = useMemo(
    () => buildFeedRangeBounds(allFeedLoads),
    [allFeedLoads],
  );
  const organicFeedRangeBounds = useMemo(
    () => buildFeedRangeBounds(organicFeedLoads),
    [organicFeedLoads],
  );
  const globalFeedRangeBounds = useMemo(
    () => buildFeedRangeBounds(globalFeedLoads),
    [globalFeedLoads],
  );
  const activeFeedLoads = databaseLoads;
  const feedRangeBounds = SERVER_FILTER_BOUNDS;
  const [feedSelectedPriceMin, setFeedSelectedPriceMin] = useState(
    SERVER_FILTER_BOUNDS.priceMin,
  );
  const [feedSelectedPriceMax, setFeedSelectedPriceMax] = useState(
    SERVER_FILTER_BOUNDS.priceMax,
  );
  const [feedSelectedWeightMin, setFeedSelectedWeightMin] = useState(
    SERVER_FILTER_BOUNDS.weightMin,
  );
  const [feedSelectedWeightMax, setFeedSelectedWeightMax] = useState(
    SERVER_FILTER_BOUNDS.weightMax,
  );
  const [feedSelectedLengthMin, setFeedSelectedLengthMin] = useState(
    SERVER_FILTER_BOUNDS.lengthMin,
  );
  const [feedSelectedLengthMax, setFeedSelectedLengthMax] = useState(
    SERVER_FILTER_BOUNDS.lengthMax,
  );
  const [feedSelectedWidthMin, setFeedSelectedWidthMin] = useState(
    SERVER_FILTER_BOUNDS.widthMin,
  );
  const [feedSelectedWidthMax, setFeedSelectedWidthMax] = useState(
    SERVER_FILTER_BOUNDS.widthMax,
  );
  const [feedSelectedHeightMin, setFeedSelectedHeightMin] = useState(
    SERVER_FILTER_BOUNDS.heightMin,
  );
  const [feedSelectedHeightMax, setFeedSelectedHeightMax] = useState(
    SERVER_FILTER_BOUNDS.heightMax,
  );
  const [feedSelectedTemperatureMin, setFeedSelectedTemperatureMin] = useState(
    SERVER_FILTER_BOUNDS.temperatureMin,
  );
  const [feedSelectedTemperatureMax, setFeedSelectedTemperatureMax] = useState(
    SERVER_FILTER_BOUNDS.temperatureMax,
  );
  const [feedSelectedCargoValueMin, setFeedSelectedCargoValueMin] = useState(
    SERVER_FILTER_BOUNDS.cargoValueMin,
  );
  const [feedSelectedCargoValueMax, setFeedSelectedCargoValueMax] = useState(
    SERVER_FILTER_BOUNDS.cargoValueMax,
  );
  const [feedSelectedTransitMin, setFeedSelectedTransitMin] = useState(
    SERVER_FILTER_BOUNDS.transitMin,
  );
  const [feedSelectedTransitMax, setFeedSelectedTransitMax] = useState(
    SERVER_FILTER_BOUNDS.transitMax,
  );
  const [feedSelectedPalletsMin, setFeedSelectedPalletsMin] = useState(
    SERVER_FILTER_BOUNDS.palletsMin,
  );
  const [feedSelectedPalletsMax, setFeedSelectedPalletsMax] = useState(
    SERVER_FILTER_BOUNDS.palletsMax,
  );
  const [feedSelectedVolumeMin, setFeedSelectedVolumeMin] = useState(
    SERVER_FILTER_BOUNDS.volumeMin,
  );
  const [feedSelectedVolumeMax, setFeedSelectedVolumeMax] = useState(
    SERVER_FILTER_BOUNDS.volumeMax,
  );
  const [selectedStorageTypes, setSelectedStorageTypes] = useState<string[]>(
    [],
  );
  const [selectedStorageRequirements, setSelectedStorageRequirements] =
    useState<string[]>([]);
  const [storageStartFrom, setStorageStartFrom] = useState("");
  const [storageStartTo, setStorageStartTo] = useState("");
  const [selectedFeedGoodsTypes, setSelectedFeedGoodsTypes] = useState<
    string[]
  >([]);
  const [selectedFeedPriceTerms, setSelectedFeedPriceTerms] = useState<
    string[]
  >([]);
  const [selectedFeedPaymentTerms, setSelectedFeedPaymentTerms] = useState<
    string[]
  >([]);
  const [selectedFeedAdrClasses, setSelectedFeedAdrClasses] = useState<
    string[]
  >([]);
  const [selectedFeedSensitivity, setSelectedFeedSensitivity] = useState<
    string[]
  >([]);
  const [selectedFeedUrgency, setSelectedFeedUrgency] = useState<string[]>([]);
  const [selectedFeedLoadingMethods, setSelectedFeedLoadingMethods] = useState<
    string[]
  >([]);

  useEffect(() => {
    let active = true;

    if (!api.auth.hasSession()) {
      setIsAuthRestoring(false);
      return () => {
        active = false;
      };
    }

    void api.auth
      .me()
      .then((user) => {
        if (!active || !user.role?.name) return;
        const restoredRole = user.role.name;
        setCurrentUser(user);
        setRole(restoredRole);
        setView(getDefaultViewForRole(restoredRole, user));
        if (isSupportedLanguage(user.language)) setLang(user.language);
        setIsLanding(false);
      })
      .catch(() => {
        if (!active) return;
        setCurrentUser(null);
        setRole(null);
      })
      .finally(() => {
        if (active) setIsAuthRestoring(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const [feedStartLocation, setFeedStartLocation] = useState("");
  const [feedEndLocation, setFeedEndLocation] = useState("");
  const [feedTrackingSearch, setFeedTrackingSearch] = useState("");
  const clearFeedLocations = () => {
    setFeedStartLocation("");
    setFeedEndLocation("");
  };

  useEffect(() => {
    let requestActive = true;
    const exchangeModeChanged = prevExchangeModeRef.current !== exchangeMode;
    prevExchangeModeRef.current = exchangeMode;
    if (exchangeModeChanged) setFeedFilterBarLoading(true);
    if (!role) {
      setCurrentUser(null);
      setDatabaseLoads([]);
      setDatabaseLoadsLoaded(false);
      setFeedFilterBarLoading(false);
      return;
    }
    // Inner exchange filters use stale-while-refresh: keep the current rows mounted until the
    // filtered response arrives. Replacing them with result skeletons on every warehouse chip
    // toggle changes the content height and makes the entire page jump. Only a real exchange-mode
    // change swaps the result surface because transport rows must not remain under Warehouse.
    if (exchangeModeChanged) setDatabaseLoadsLoaded(false);
    void api.auth
      .me()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
    const timer = window.setTimeout(() => {
      const params: Record<string, string | number | boolean | undefined> = {
        per_page: 100,
        status: "posted",
        for_storage: exchangeMode === "storage",
        tracking_search: feedTrackingSearch || undefined,
        sort: feedSortMode,
        my_bids: feedMyBidsOnly || undefined,
        budget_min:
          feedSelectedPriceMin > feedRangeBounds.priceMin
            ? feedSelectedPriceMin
            : undefined,
        budget_max:
          feedSelectedPriceMax < feedRangeBounds.priceMax
            ? feedSelectedPriceMax
            : undefined,
        temperature_min:
          feedSelectedTemperatureMin > feedRangeBounds.temperatureMin
            ? feedSelectedTemperatureMin
            : undefined,
        temperature_max:
          feedSelectedTemperatureMax < feedRangeBounds.temperatureMax
            ? feedSelectedTemperatureMax
            : undefined,
        price_terms: selectedFeedPriceTerms.join(",") || undefined,
      };
      if (exchangeMode === "storage") {
        Object.assign(params, {
          warehouse_location: feedStartLocation || undefined,
          pallets_min:
            feedSelectedPalletsMin > feedRangeBounds.palletsMin
              ? feedSelectedPalletsMin
              : undefined,
          pallets_max:
            feedSelectedPalletsMax < feedRangeBounds.palletsMax
              ? feedSelectedPalletsMax
              : undefined,
          volume_min:
            feedSelectedVolumeMin > feedRangeBounds.volumeMin
              ? feedSelectedVolumeMin
              : undefined,
          volume_max:
            feedSelectedVolumeMax < feedRangeBounds.volumeMax
              ? feedSelectedVolumeMax
              : undefined,
          storage_types: selectedStorageTypes.join(",") || undefined,
          requirements: selectedStorageRequirements.join(",") || undefined,
          storage_start_from: storageStartFrom || undefined,
          storage_start_to: storageStartTo || undefined,
        });
      } else {
        Object.assign(params, {
          origin: feedStartLocation || undefined,
          destination: feedEndLocation || undefined,
          weight_min:
            feedSelectedWeightMin > feedRangeBounds.weightMin
              ? feedSelectedWeightMin
              : undefined,
          weight_max:
            feedSelectedWeightMax < feedRangeBounds.weightMax
              ? feedSelectedWeightMax
              : undefined,
          length_min:
            feedSelectedLengthMin > feedRangeBounds.lengthMin
              ? feedSelectedLengthMin
              : undefined,
          length_max:
            feedSelectedLengthMax < feedRangeBounds.lengthMax
              ? feedSelectedLengthMax
              : undefined,
          width_min:
            feedSelectedWidthMin > feedRangeBounds.widthMin
              ? feedSelectedWidthMin
              : undefined,
          width_max:
            feedSelectedWidthMax < feedRangeBounds.widthMax
              ? feedSelectedWidthMax
              : undefined,
          height_min:
            feedSelectedHeightMin > feedRangeBounds.heightMin
              ? feedSelectedHeightMin
              : undefined,
          height_max:
            feedSelectedHeightMax < feedRangeBounds.heightMax
              ? feedSelectedHeightMax
              : undefined,
          cargo_value_min:
            feedSelectedCargoValueMin > feedRangeBounds.cargoValueMin
              ? feedSelectedCargoValueMin
              : undefined,
          cargo_value_max:
            feedSelectedCargoValueMax < feedRangeBounds.cargoValueMax
              ? feedSelectedCargoValueMax
              : undefined,
          transit_days_min:
            feedSelectedTransitMin > feedRangeBounds.transitMin
              ? feedSelectedTransitMin
              : undefined,
          transit_days_max:
            feedSelectedTransitMax < feedRangeBounds.transitMax
              ? feedSelectedTransitMax
              : undefined,
          goods_types: selectedFeedGoodsTypes.join(",") || undefined,
          payment_terms:
            selectedFeedPaymentTerms
              .map((value) => value.toLowerCase().replaceAll(" ", "_"))
              .join(",") || undefined,
          adr_classes: selectedFeedAdrClasses.join(",") || undefined,
          sensitivity: selectedFeedSensitivity.join(",") || undefined,
          urgency: selectedFeedUrgency.join(",") || undefined,
          loading_methods: selectedFeedLoadingMethods.join(",") || undefined,
          transport_types:
            exchangeFilters.transportModes.join(",") || undefined,
          pickup_country: exchangeFilters.route.pickupCountry || undefined,
          pickup_city: exchangeFilters.route.pickupCity || undefined,
          delivery_country: exchangeFilters.route.deliveryCountry || undefined,
          delivery_city: exchangeFilters.route.deliveryCity || undefined,
          cargo_flags: exchangeFilters.cargoFlags.join(",") || undefined,
          equipment_types:
            exchangeFilters.equipmentTypes.join(",") || undefined,
          pickup_date_from: exchangeFilters.dates.pickupDateFrom || undefined,
          pickup_date_to: exchangeFilters.dates.pickupDateTo || undefined,
          delivery_date_from:
            exchangeFilters.dates.deliveryDateFrom || undefined,
          delivery_date_to: exchangeFilters.dates.deliveryDateTo || undefined,
          currencies: exchangeFilters.currency || undefined,
          requirements:
            exchangeFilters.specialRequirements.join(",") || undefined,
          assignment: exchangeFilters.assignment.join(",") || undefined,
          volume_min:
            feedSelectedVolumeMin > feedRangeBounds.volumeMin
              ? feedSelectedVolumeMin
              : undefined,
          volume_max:
            feedSelectedVolumeMax < feedRangeBounds.volumeMax
              ? feedSelectedVolumeMax
              : undefined,
        });
      }
      void api.loads
        .list(params)
        .then((response) => {
          if (requestActive)
            setDatabaseLoads(response.data.map(mapDatabaseRecordToLoad));
        })
        .catch(() => {
          if (requestActive) setDatabaseLoads([]);
        })
        .finally(() => {
          if (requestActive) {
            setDatabaseLoadsLoaded(true);
            setFeedFilterBarLoading(false);
          }
        });
    }, 250);
    return () => {
      requestActive = false;
      window.clearTimeout(timer);
    };
  }, [
    role,
    loadRefreshKey,
    exchangeMode,
    feedSortMode,
    feedMyBidsOnly,
    feedStartLocation,
    feedEndLocation,
    feedTrackingSearch,
    feedSelectedPriceMin,
    feedSelectedPriceMax,
    feedSelectedWeightMin,
    feedSelectedWeightMax,
    feedSelectedLengthMin,
    feedSelectedLengthMax,
    feedSelectedWidthMin,
    feedSelectedWidthMax,
    feedSelectedHeightMin,
    feedSelectedHeightMax,
    feedSelectedTemperatureMin,
    feedSelectedTemperatureMax,
    feedSelectedCargoValueMin,
    feedSelectedCargoValueMax,
    feedSelectedTransitMin,
    feedSelectedTransitMax,
    feedSelectedPalletsMin,
    feedSelectedPalletsMax,
    feedSelectedVolumeMin,
    feedSelectedVolumeMax,
    selectedFeedGoodsTypes,
    selectedFeedPriceTerms,
    selectedFeedPaymentTerms,
    selectedFeedAdrClasses,
    selectedFeedSensitivity,
    selectedFeedUrgency,
    selectedFeedLoadingMethods,
    selectedStorageTypes,
    selectedStorageRequirements,
    storageStartFrom,
    storageStartTo,
    exchangeFilters,
  ]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    if (!lang || typeof window === "undefined") return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }, [lang]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      isSidebarOpen ? "expanded" : "collapsed",
    );
  }, [isSidebarOpen]);

  useEffect(() => {
    if (role === "user" && view === "feed") {
      setView("tracking");
    }
  }, [role, view]);

  useEffect(() => {
    if (view === "frights") {
      setView("feed");
    }
  }, [view]);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setCurrentUser(null);
      setIsLanding(true);
      setRole(null);
      setAuthMode("setup");
    }
  };

  if (isAuthRestoring)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-bold">Loading</span>
        </div>
      </div>
    );

  if (isLanding)
    return (
      <LandingPage
        onStart={() => {
          setAuthMode("setup");
          setIsLanding(false);
        }}
        onLogin={() => {
          setAuthMode("login");
          setIsLanding(false);
        }}
        isDark={isDark}
        setIsDark={setIsDark}
        lang={lang}
        setLang={setLang}
        scrollTarget={landingScrollTarget}
        onScrolled={() => setLandingScrollTarget(null)}
      />
    );
  if (!role)
    return (
      <Onboarding
        mode={authMode}
        lang={lang}
        setLang={setLang}
        onComplete={(r, l) => {
          setLang(l);
          if (!r) {
            setRole(r);
            return;
          }

          // A company can be warehouse-first, which is only known from /auth/me. Keep the app shell
          // behind its loader until that record arrives so Company Overview never flashes first.
          setIsAuthRestoring(true);
          void api.auth.me()
            .then((user) => {
              const resolvedRole = user.role?.name || r;
              setCurrentUser(user);
              setRole(resolvedRole);
              setView(getDefaultViewForRole(resolvedRole, user));
            })
            .catch(() => {
              setRole(r);
              setView(getDefaultViewForRole(r));
            })
            .finally(() => setIsAuthRestoring(false));
        }}
        onSwitchToSetup={() => setAuthMode("setup")}
        onClose={() => {
          setIsLanding(true);
          setRole(null);
          setAuthMode("setup");
        }}
      />
    );

  const t = translations[lang || "en"];
  const currentLang =
    languages.find((l) => l.id === (lang || "en")) || languages[0];
  // 'master' sits above 'superadmin' - identical permissions everywhere, plus exclusive access to
  // the AI Stats screen (see the nav-items/view-render branches below). Kept as one flag so every
  // site that used to gate on 'superadmin' alone stays in sync.
  const isElevatedAdmin = role === "superadmin" || role === "master";
  const warehouseFirst = Boolean(
    currentUser?.companies?.some((company) =>
      Boolean(company.warehouse_first),
    ),
  );
  const isWarehouseCompany =
    role === "warehouse" || (role === "company" && warehouseFirst);
  const roleMeta =
    role === "driver"
      ? {
          label: u("common.driverLicense", "Driver License"),
          status: u("common.verified", "Verified"),
          icon: Truck,
          tone: "bg-primary/10 text-primary",
        }
      : isWarehouseCompany
        ? {
            label: u("common.warehouseCompany", "Warehouse Company"),
            status: u("common.admin", "Admin"),
            icon: Warehouse,
            tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
          }
        : role === "company"
        ? {
            label: u("common.logisticsCompany", "Logistics Company"),
            status: u("common.admin", "Admin"),
            icon: Building2,
            tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
          }
        : role === "finance"
          ? {
              label: u(
                "common.financeAdministration",
                "Finance & Administration",
              ),
              status: u("common.restrictedAccess", "Controlled Access"),
              icon: Banknote,
              tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            }
          : isElevatedAdmin
              ? {
                  label:
                    role === "master"
                      ? u("common.master", "Master")
                      : u("common.superadmin", "Superadmin"),
                  status: u("common.godMode", "God Mode"),
                  icon: Crown,
                  tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                }
              : {
                  label: u("common.customerLicense", "Customer License"),
                  status: u("common.active", "Active"),
                  icon: User,
                  tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                };
  const RoleStatusIcon = roleMeta.icon;
  const getGoodsChipTone = (value: string) =>
    value === "Flammable"
      ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
      : value === "Fragile"
        ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/30"
        : value === "High Value"
          ? "bg-violet-500/10 text-violet-500 border-violet-500/30"
          : "bg-slate-500/10 text-slate-500 border-slate-500/30";
  const getPaymentChipTone = (value: string) =>
    value === "In Advance"
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
      : value === "On Delivery"
        ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
        : "bg-blue-500/10 text-blue-500 border-blue-500/30";
  const feedGoodsTypeOptions = Array.from(
    new Set<string>(activeFeedLoads.map((load) => String(load.goodsType))),
  ).map((value) => ({
    id: value,
    label: trGoodsType(lang, value),
    toneClass: getGoodsChipTone(value),
  }));
  const feedPaymentTermOptions = Array.from(
    new Set<string>(activeFeedLoads.map((load) => String(load.paymentTerms))),
  ).map((value) => ({
    id: value,
    label: trPaymentTerms(lang, value),
    toneClass: getPaymentChipTone(value),
  }));
  const feedPriceTermOptions = [
    {
      id: "negotiable",
      label: u("postLoadModal.termsNegotiable", "Negotiable"),
      toneClass: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    },
    {
      id: "fixed",
      label: u("postLoadModal.termsFixed", "Fixed price"),
      toneClass: "bg-sky-500/10 text-sky-500 border-sky-500/30",
    },
  ];
  const feedAdrClassOptions = Array.from(
    new Set<string>(activeFeedLoads.map((load) => load.adrClass || "None")),
  ).map((value) => ({
    id: value,
    label:
      value === "None"
        ? u("feed.adr.none", "No ADR")
        : `${u("feed.adr.class", "ADR class")} ${value}`,
    toneClass:
      value === "None"
        ? "bg-slate-500/10 text-slate-500 border-slate-500/30"
        : "bg-rose-500/10 text-rose-500 border-rose-500/30",
  }));
  const feedSensitivityOptions = [
    {
      id: "fragile",
      label: u("feed.sensitivity.fragile", "Fragile"),
      toneClass: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
    },
  ];
  const feedUrgencyOptions = ["Standard", "Express"].map((value) => ({
    id: value,
    label:
      value === "Express"
        ? u("feed.urgency.express", "Express")
        : u("feed.urgency.standard", "Standard"),
    toneClass:
      value === "Express"
        ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  }));
  const feedLoadingMethodOptions = ["Forklift", "Crane", "Manual"].map(
    (value) => ({
      id: value,
      label:
        value === "Forklift"
          ? u("feed.loadingMethod.forklift", "Forklift")
          : value === "Crane"
            ? u("feed.loadingMethod.crane", "Crane")
            : u("feed.loadingMethod.manual", "Manual"),
      toneClass:
        value === "Crane"
          ? "bg-violet-500/10 text-violet-500 border-violet-500/30"
          : value === "Manual"
            ? "bg-sky-500/10 text-sky-500 border-sky-500/30"
            : "bg-primary/10 text-primary border-primary/30",
    }),
  );
  const clearFeedFilters = () => {
    clearFeedLocations();
    setFeedTrackingSearch("");
    setFeedSelectedPriceMin(feedRangeBounds.priceMin);
    setFeedSelectedPriceMax(feedRangeBounds.priceMax);
    setFeedSelectedWeightMin(feedRangeBounds.weightMin);
    setFeedSelectedWeightMax(feedRangeBounds.weightMax);
    setFeedSelectedLengthMin(feedRangeBounds.lengthMin);
    setFeedSelectedLengthMax(feedRangeBounds.lengthMax);
    setFeedSelectedWidthMin(feedRangeBounds.widthMin);
    setFeedSelectedWidthMax(feedRangeBounds.widthMax);
    setFeedSelectedHeightMin(feedRangeBounds.heightMin);
    setFeedSelectedHeightMax(feedRangeBounds.heightMax);
    setFeedSelectedTemperatureMin(feedRangeBounds.temperatureMin);
    setFeedSelectedTemperatureMax(feedRangeBounds.temperatureMax);
    setFeedSelectedCargoValueMin(feedRangeBounds.cargoValueMin);
    setFeedSelectedCargoValueMax(feedRangeBounds.cargoValueMax);
    setFeedSelectedTransitMin(feedRangeBounds.transitMin);
    setFeedSelectedTransitMax(feedRangeBounds.transitMax);
    setSelectedFeedGoodsTypes([]);
    setSelectedFeedPaymentTerms([]);
    setSelectedFeedAdrClasses([]);
    setSelectedFeedSensitivity([]);
    setSelectedFeedUrgency([]);
    setSelectedFeedLoadingMethods([]);
    setFeedSelectedPalletsMin(feedRangeBounds.palletsMin);
    setFeedSelectedPalletsMax(feedRangeBounds.palletsMax);
    setFeedSelectedVolumeMin(feedRangeBounds.volumeMin);
    setFeedSelectedVolumeMax(feedRangeBounds.volumeMax);
    setSelectedStorageTypes([]);
    setSelectedStorageRequirements([]);
    setStorageStartFrom("");
    setStorageStartTo("");
    setExchangeFilters(EMPTY_EXCHANGE_FILTERS);
  };
  const handleFeedDataModeChange = (nextModeId: string) => {
    const nextMode: FeedDataMode =
      nextModeId === "global"
        ? "global"
        : nextModeId === "all"
          ? "all"
          : "organic";
    if (nextMode === feedDataMode) return;

    const nextBounds =
      nextMode === "global"
        ? globalFeedRangeBounds
        : nextMode === "all"
          ? allFeedRangeBounds
          : organicFeedRangeBounds;
    setFeedDataMode(nextMode);
    clearFeedLocations();
    setFeedSelectedPriceMin(nextBounds.priceMin);
    setFeedSelectedPriceMax(nextBounds.priceMax);
    setFeedSelectedWeightMin(nextBounds.weightMin);
    setFeedSelectedWeightMax(nextBounds.weightMax);
    setFeedSelectedLengthMin(nextBounds.lengthMin);
    setFeedSelectedLengthMax(nextBounds.lengthMax);
    setFeedSelectedWidthMin(nextBounds.widthMin);
    setFeedSelectedWidthMax(nextBounds.widthMax);
    setFeedSelectedHeightMin(nextBounds.heightMin);
    setFeedSelectedHeightMax(nextBounds.heightMax);
    setFeedSelectedTemperatureMin(nextBounds.temperatureMin);
    setFeedSelectedTemperatureMax(nextBounds.temperatureMax);
    setFeedSelectedCargoValueMin(nextBounds.cargoValueMin);
    setFeedSelectedCargoValueMax(nextBounds.cargoValueMax);
    setFeedSelectedTransitMin(nextBounds.transitMin);
    setFeedSelectedTransitMax(nextBounds.transitMax);
    setSelectedFeedGoodsTypes([]);
    setSelectedFeedPaymentTerms([]);
    setSelectedFeedAdrClasses([]);
    setSelectedFeedSensitivity([]);
    setSelectedFeedUrgency([]);
    setSelectedFeedLoadingMethods([]);
  };
  const handleLoadSaved = (record: Record<string, unknown>) => {
    const savedLoad = mapDatabaseRecordToLoad(record);
    const nextLoads = [
      savedLoad,
      ...databaseLoads.filter((load) => load.id !== savedLoad.id),
    ];
    const nextBounds = buildFeedRangeBounds(nextLoads);

    setDatabaseLoads(nextLoads);
    setFeedDataMode("organic");
    setView("feed");
    clearFeedLocations();
    setFeedSelectedPriceMin(nextBounds.priceMin);
    setFeedSelectedPriceMax(nextBounds.priceMax);
    setFeedSelectedWeightMin(nextBounds.weightMin);
    setFeedSelectedWeightMax(nextBounds.weightMax);
    setFeedSelectedLengthMin(nextBounds.lengthMin);
    setFeedSelectedLengthMax(nextBounds.lengthMax);
    setFeedSelectedWidthMin(nextBounds.widthMin);
    setFeedSelectedWidthMax(nextBounds.widthMax);
    setFeedSelectedHeightMin(nextBounds.heightMin);
    setFeedSelectedHeightMax(nextBounds.heightMax);
    setFeedSelectedTemperatureMin(nextBounds.temperatureMin);
    setFeedSelectedTemperatureMax(nextBounds.temperatureMax);
    setFeedSelectedCargoValueMin(nextBounds.cargoValueMin);
    setFeedSelectedCargoValueMax(nextBounds.cargoValueMax);
    setFeedSelectedTransitMin(nextBounds.transitMin);
    setFeedSelectedTransitMax(nextBounds.transitMax);
    setSelectedFeedGoodsTypes([]);
    setSelectedFeedPaymentTerms([]);
    setSelectedFeedAdrClasses([]);
    setSelectedFeedSensitivity([]);
    setSelectedFeedUrgency([]);
    setSelectedFeedLoadingMethods([]);
    setLoadRefreshKey((current) => current + 1);
  };
  const feedFilterBarProps: FilterLoadsProps = {
    lang,
    variant: exchangeMode,
    exchange:
      exchangeMode === "transport"
        ? {
            transportModes: exchangeFilters.transportModes,
            onToggleTransportMode: (id) =>
              toggleExchangeList("transportModes", id),
            route: exchangeFilters.route,
            onRouteChange: (field, value) =>
              setExchangeFilters((prev) => ({
                ...prev,
                route: { ...prev.route, [field]: value },
              })),
            cargoFlags: exchangeFilters.cargoFlags,
            onToggleCargoFlag: (id) => toggleExchangeList("cargoFlags", id),
            equipmentTypes: exchangeFilters.equipmentTypes,
            onToggleEquipmentType: (id) =>
              toggleExchangeList("equipmentTypes", id),
            dates: exchangeFilters.dates,
            onDateChange: (field, value) =>
              setExchangeFilters((prev) => ({
                ...prev,
                dates: { ...prev.dates, [field]: value },
              })),
            currency: exchangeFilters.currency,
            currencyOptions: [...SUPPORTED_CURRENCIES],
            onCurrencyChange: (value) =>
              setExchangeFilters((prev) => ({ ...prev, currency: value })),
            specialRequirements: exchangeFilters.specialRequirements,
            onToggleSpecialRequirement: (id) =>
              toggleExchangeList("specialRequirements", id),
            assignment: exchangeFilters.assignment,
            onToggleAssignment: (id) => toggleExchangeList("assignment", id),
          }
        : undefined,
    startLocation: feedStartLocation,
    endLocation: feedEndLocation,
    trackingSearch: feedTrackingSearch,
    onTrackingSearchChange: setFeedTrackingSearch,
    onStartLocationChange: setFeedStartLocation,
    onEndLocationChange: setFeedEndLocation,
    onClear: clearFeedFilters,
    priceRange: {
      min: feedRangeBounds.priceMin,
      max: feedRangeBounds.priceMax,
      selectedMin: feedSelectedPriceMin,
      selectedMax: feedSelectedPriceMax,
      onChange: (nextMin, nextMax) => {
        setFeedSelectedPriceMin(nextMin);
        setFeedSelectedPriceMax(nextMax);
      },
      prefix:
        feedDataMode === "global"
          ? "USD "
          : feedDataMode === "organic"
            ? "EUR "
            : "",
      allowManualInput: true,
    },
    weightRange:
      exchangeMode === "transport"
        ? {
            min: feedRangeBounds.weightMin,
            max: feedRangeBounds.weightMax,
            selectedMin: feedSelectedWeightMin,
            selectedMax: feedSelectedWeightMax,
            onChange: (nextMin, nextMax) => {
              setFeedSelectedWeightMin(nextMin);
              setFeedSelectedWeightMax(nextMax);
            },
            suffix: " kg",
            step: 100,
          }
        : undefined,
    dimensionRanges:
      exchangeMode === "transport"
        ? {
            length: {
              min: feedRangeBounds.lengthMin,
              max: feedRangeBounds.lengthMax,
              selectedMin: feedSelectedLengthMin,
              selectedMax: feedSelectedLengthMax,
              onChange: (nextMin, nextMax) => {
                setFeedSelectedLengthMin(nextMin);
                setFeedSelectedLengthMax(nextMax);
              },
              suffix: " m",
              allowManualInput: true,
              step: 0.1,
            },
            width: {
              min: feedRangeBounds.widthMin,
              max: feedRangeBounds.widthMax,
              selectedMin: feedSelectedWidthMin,
              selectedMax: feedSelectedWidthMax,
              onChange: (nextMin, nextMax) => {
                setFeedSelectedWidthMin(nextMin);
                setFeedSelectedWidthMax(nextMax);
              },
              suffix: " m",
              allowManualInput: true,
              step: 0.05,
            },
            height: {
              min: feedRangeBounds.heightMin,
              max: feedRangeBounds.heightMax,
              selectedMin: feedSelectedHeightMin,
              selectedMax: feedSelectedHeightMax,
              onChange: (nextMin, nextMax) => {
                setFeedSelectedHeightMin(nextMin);
                setFeedSelectedHeightMax(nextMax);
              },
              suffix: " m",
              allowManualInput: true,
              step: 0.05,
            },
          }
        : undefined,
    temperatureRange: {
      min: feedRangeBounds.temperatureMin,
      max: feedRangeBounds.temperatureMax,
      selectedMin: feedSelectedTemperatureMin,
      selectedMax: feedSelectedTemperatureMax,
      onChange: (nextMin, nextMax) => {
        setFeedSelectedTemperatureMin(nextMin);
        setFeedSelectedTemperatureMax(nextMax);
      },
      suffix: " °C",
      allowManualInput: true,
    },
    cargoValueRange:
      exchangeMode === "transport"
        ? {
            min: feedRangeBounds.cargoValueMin,
            max: feedRangeBounds.cargoValueMax,
            selectedMin: feedSelectedCargoValueMin,
            selectedMax: feedSelectedCargoValueMax,
            onChange: (nextMin, nextMax) => {
              setFeedSelectedCargoValueMin(nextMin);
              setFeedSelectedCargoValueMax(nextMax);
            },
            prefix: "EUR ",
            allowManualInput: true,
            step: 1000,
          }
        : undefined,
    transitRange:
      exchangeMode === "transport"
        ? {
            min: feedRangeBounds.transitMin,
            max: feedRangeBounds.transitMax,
            selectedMin: feedSelectedTransitMin,
            selectedMax: feedSelectedTransitMax,
            onChange: (nextMin, nextMax) => {
              setFeedSelectedTransitMin(nextMin);
              setFeedSelectedTransitMax(nextMax);
            },
            suffix: ` ${u("common.days", "days")}`,
          }
        : undefined,
    goodsTypeOptions: exchangeMode === "transport" ? feedGoodsTypeOptions : [],
    priceTermOptions: feedPriceTermOptions,
    paymentTermOptions:
      exchangeMode === "transport" ? feedPaymentTermOptions : [],
    adrClassOptions: exchangeMode === "transport" ? feedAdrClassOptions : [],
    sensitivityOptions:
      exchangeMode === "transport" ? feedSensitivityOptions : [],
    urgencyOptions: exchangeMode === "transport" ? feedUrgencyOptions : [],
    loadingMethodOptions:
      exchangeMode === "transport" ? feedLoadingMethodOptions : [],
    palletRange:
      exchangeMode === "storage"
        ? {
            min: feedRangeBounds.palletsMin,
            max: feedRangeBounds.palletsMax,
            selectedMin: feedSelectedPalletsMin,
            selectedMax: feedSelectedPalletsMax,
            onChange: (min, max) => {
              setFeedSelectedPalletsMin(min);
              setFeedSelectedPalletsMax(max);
            },
            suffix: " pal.",
            step: 1,
            allowManualInput: true,
          }
        : undefined,
    volumeRange:
      exchangeMode === "storage"
        ? {
            min: feedRangeBounds.volumeMin,
            max: feedRangeBounds.volumeMax,
            selectedMin: feedSelectedVolumeMin,
            selectedMax: feedSelectedVolumeMax,
            onChange: (min, max) => {
              setFeedSelectedVolumeMin(min);
              setFeedSelectedVolumeMax(max);
            },
            suffix: " m³",
            step: 1,
            allowManualInput: true,
          }
        : undefined,
    storageTypeOptions: [
      "Ambient",
      "Chilled",
      "Frozen",
      "Bonded",
      "Outdoor",
    ].map((value) => ({
      id: value,
      label: value,
      toneClass: "bg-primary/10 text-primary border-primary/30",
    })),
    selectedStorageTypeIds: selectedStorageTypes,
    onToggleStorageType: (id) =>
      setSelectedStorageTypes((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id],
      ),
    requirementOptions: [
      {
        id: "customs_bonded",
        label: u("feed.storage.customsBonded", "Customs bonded"),
        toneClass: "bg-violet-500/10 text-violet-500 border-violet-500/30",
      },
      {
        id: "racking",
        label: u("feed.storage.racking", "Racking"),
        toneClass: "bg-sky-500/10 text-sky-500 border-sky-500/30",
      },
      {
        id: "insurance",
        label: u("feed.storage.insurance", "Insurance"),
        toneClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
      },
      {
        id: "security",
        label: u("feed.storage.security", "Security"),
        toneClass: "bg-amber-500/10 text-amber-500 border-amber-500/30",
      },
    ],
    selectedRequirementIds: selectedStorageRequirements,
    onToggleRequirement: (id) =>
      setSelectedStorageRequirements((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id],
      ),
    storageStartFrom,
    storageStartTo,
    onStorageStartFromChange: setStorageStartFrom,
    onStorageStartToChange: setStorageStartTo,
    selectedGoodsTypeIds: selectedFeedGoodsTypes,
    selectedPriceTermIds: selectedFeedPriceTerms,
    selectedPaymentTermIds: selectedFeedPaymentTerms,
    selectedAdrClassIds: selectedFeedAdrClasses,
    selectedSensitivityIds: selectedFeedSensitivity,
    selectedUrgencyIds: selectedFeedUrgency,
    selectedLoadingMethodIds: selectedFeedLoadingMethods,
    onToggleGoodsType: (id) => {
      setSelectedFeedGoodsTypes((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
    },
    onTogglePriceTerm: (id) => {
      setSelectedFeedPriceTerms((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
    },
    onTogglePaymentTerm: (id) => {
      setSelectedFeedPaymentTerms((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
    },
    onToggleAdrClass: (id) => {
      setSelectedFeedAdrClasses((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
    },
    onToggleSensitivity: (id) => {
      setSelectedFeedSensitivity((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
    },
    onToggleUrgency: (id) => {
      setSelectedFeedUrgency((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
    },
    onToggleLoadingMethod: (id) => {
      setSelectedFeedLoadingMethods((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
    },
  };

  const roleNavItems = isElevatedAdmin
    ? [
        {
          id: "admin",
          label: u("nav.commandCenter", "Command Center"),
          icon: Crown,
        },
        {
          id: "admin-customers",
          label: u("nav.allCustomers", "Customers"),
          icon: UserRound,
        },
        {
          id: "admin-companies",
          label: u("nav.allCompanies", "Logistics Companies"),
          icon: Building2,
        },
        {
          id: "admin-warehouse-companies",
          label: u("nav.allWarehouseCompanies", "Warehouse Companies"),
          icon: Factory,
        },
        {
          id: "admin-drivers",
          label: u("nav.allDrivers", "Drivers"),
          icon: Users,
        },
        { id: "feed", label: t.homeFeed, icon: Boxes },
        {
          id: "tracking",
          label: u("nav.globalTracking", "Global Tracking"),
          icon: PackageIcon,
        },
        {
          id: "warehouses",
          label: u("nav.warehouse", "Warehouse"),
          icon: Warehouse,
        },
        {
          id: "fleet",
          label: u("nav.globalFleet", "Global Fleet"),
          icon: Truck,
        },
        { id: "finance", label: u("nav.finance", "Finance"), icon: Banknote },
        {
          id: "email-studio",
          label: u("nav.emailStudio", "Email Studio"),
          icon: Mail,
        },
        {
          id: "notes",
          label: ui(lang, "documents.navLabel", "Documents"),
          icon: NotebookPen,
        },
      ]
    : role === "finance"
      ? [{ id: "finance", label: u("nav.finance", "Finance"), icon: Banknote }]
      : role === "company"
        ? [
            ...(warehouseFirst
              ? [
                  {
                    id: "warehouse-overview",
                    label: u("nav.myWarehouse", "My Warehouse"),
                    icon: Warehouse,
                  },
                  {
                    id: "company",
                    label: u("nav.companyOverview", "Company Overview"),
                    icon: Building2,
                  },
                ]
              : [
                  {
                    id: "company",
                    label: u("nav.companyOverview", "Company Overview"),
                    icon: Building2,
                  },
                  {
                    id: "warehouse-overview",
                    label: u("nav.myWarehouse", "My Warehouse"),
                    icon: Warehouse,
                  },
                ]),
            { id: "feed", label: t.homeFeed, icon: Boxes },
            {
              id: "tracking",
              label: myCargoLabels[lang || "en"],
              icon: PackageIcon,
            },
            { id: "fleet", label: t.myFleet, icon: Truck },
            {
              id: "company-team",
              label: u("nav.teamPermissions", "Team & Permissions"),
              icon: Users,
            },
            // A company keeps its own paperwork archive, so it reaches this page like a driver does.
            {
              id: "notes",
              label: ui(lang, "documents.navLabel", "Documents"),
              icon: NotebookPen,
            },
          ]
        : role === "warehouse"
          ? [
              {
                id: "warehouse-overview",
                label: u("nav.myWarehouse", "Moj Warehouse"),
                icon: Warehouse,
              },
              {
                id: "company",
                label: u("nav.companyOverview", "Company Overview"),
                icon: Building2,
              },
              { id: "feed", label: t.homeFeed, icon: Boxes },
              {
                id: "tracking",
                label: myCargoLabels[lang || "en"],
                icon: PackageIcon,
              },
              { id: "fleet", label: t.myFleet, icon: Truck },
              {
                id: "notes",
                label: ui(lang, "documents.navLabel", "Documents"),
                icon: NotebookPen,
              },
            ]
          : [
              ...(role === "driver"
                ? [{ id: "feed", label: t.homeFeed, icon: Boxes }]
                : []),
              {
                id: "tracking",
                label: myCargoLabels[lang || "en"],
                icon: PackageIcon,
              },
              {
                id: "warehouses",
                label: u("nav.warehouse", "Warehouse"),
                icon: Warehouse,
              },
              ...(role === "driver"
                ? [{ id: "fleet", label: t.myFleet, icon: Truck }]
                : []),
              ...(role === "driver"
                ? [
                    {
                      id: "notes",
                      label: ui(lang, "documents.navLabel", "Documents"),
                      icon: NotebookPen,
                    },
                  ]
                : []),
            ];
  const navItems = [
    ...roleNavItems,
    ...(roleNavItems.some((item) => item.id === "admin-customers")
      ? []
      : [
          {
            id: "admin-customers",
            label: u("nav.allCustomers", "Customers"),
            icon: UserRound,
          },
        ]),
    {
      id: "tariffs-hs",
      label: u("nav.tariffsHs", "Tariffs & HS"),
      icon: ScanSearch,
    },
  ];

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-50 sticky top-0 h-screen",
          isSidebarOpen ? "w-64" : "w-20",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            isSidebarOpen
              ? "justify-between py-4 pl-6 pr-3"
              : "justify-center p-4",
          )}
        >
          {isSidebarOpen && (
            <div className="flex items-center">
              <BrandWordmark className="text-xl" />
            </div>
          )}
          <button
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Open sidebar"}
            title={isSidebarOpen ? "Collapse sidebar" : "Open sidebar"}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="h-5 w-5 text-slate-400 transition-colors hover:text-primary dark:text-slate-500" />
            ) : (
              <FreightbookMark className="h-6 w-6 text-primary" />
            )}
          </button>
        </div>

        <nav
          className={cn(
            "mt-1 min-h-0 flex-1 space-y-1 px-4 pb-4",
            isSidebarOpen ? "overflow-y-auto" : "overflow-visible",
          )}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              aria-label={!isSidebarOpen ? item.label : undefined}
              onClick={() => navigateTo(item.id)}
              className={cn(
                "group relative w-full flex items-center rounded-xl py-2 transition-all cursor-pointer",
                isSidebarOpen ? "gap-3 px-3" : "justify-center px-0",
                isNavItemActive(item.id)
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {isSidebarOpen && (
                <span
                  title={item.label}
                  className="min-w-0 flex-1 truncate whitespace-nowrap text-left font-medium"
                >
                  {item.label}
                </span>
              )}
              {!isSidebarOpen && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-full top-1/2 z-[120] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100"
                >
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            aria-label={
              !isSidebarOpen ? ui(lang, "LenaAI", "LenaAI") : undefined
            }
            onClick={() => {
              if (view === "messages")
                setMessagesNewChatSignal((current) => current + 1);
              else setView("messages");
            }}
            className="group relative w-full flex items-center justify-center gap-3 rounded-xl bg-primary p-3 text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-dark cursor-pointer"
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            {isSidebarOpen && (
              <span className="font-medium">
                {ui(lang, "LenaAI", "LenaAI")}
              </span>
            )}
            {!isSidebarOpen && (
              <span
                role="tooltip"
                className="pointer-events-none absolute left-full top-1/2 z-[120] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100"
              >
                {ui(lang, "LenaAI", "LenaAI")}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen relative overflow-hidden">
        {/* Header (Mobile & Desktop) */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-[60]">
          <div className="md:hidden flex items-center">
            <BrandWordmark className="text-lg" />
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "hidden md:inline-flex h-10 px-3 rounded-full items-center gap-2 text-xs font-bold whitespace-nowrap",
                roleMeta.tone,
              )}
            >
              <RoleStatusIcon className="w-4 h-4" />
              {roleMeta.label} • {roleMeta.status}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {isWarehouseCompany ? (
              <button
                onClick={() => {
                  setView("warehouse-overview");
                  setWarehouseCreateSignal((current) => current + 1);
                }}
                className="h-10 px-4 rounded-full bg-primary text-white inline-flex items-center gap-2 text-xs font-bold hover:scale-[1.02] transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>{u("warehouses.create", "Add Warehouse")}</span>
              </button>
            ) : role === "user" ||
              role === "driver" ||
              role === "company" ||
              isElevatedAdmin ? (
              <button
                onClick={() => {
                  setLenaLoadPrefill(null);
                  setLenaSourceConversationId(null);
                  setLenaSourceDraftId(null);
                  setEditLoadId(null);
                  setIsPostLoadOpen(true);
                }}
                className="h-10 px-4 rounded-full bg-primary text-white inline-flex items-center gap-2 text-xs font-bold hover:scale-[1.02] transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>{u("common.postLoad", "Post Load")}</span>
              </button>
            ) : null}

            <button
              onClick={() => navigateTo("map")}
              title={u("nav.map", "Map")}
              className={cn(
                "h-10 w-10 rounded-full transition-all cursor-pointer flex items-center justify-center",
                isTrackingMapActive
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary hover:scale-105",
              )}
            >
              <MapIcon className="w-5 h-5" />
            </button>

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
                {languages.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLang(l.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-xl text-sm font-medium transition-all cursor-pointer",
                      (lang || "en") === l.id
                        ? "bg-primary/10 text-primary"
                        : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800",
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

            <button
              onClick={() => setView("pricing")}
              title={u("nav.pricing", "Pricing")}
              className={cn(
                "h-10 w-10 rounded-full transition-all cursor-pointer flex items-center justify-center",
                view === "pricing"
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary hover:scale-105",
              )}
            >
              <Gem className="w-5 h-5" />
            </button>

            {isElevatedAdmin && (
              <button
                onClick={() => setView("ai-stats")}
                title={u("nav.aiStats", "AI Stats")}
                className={cn(
                  "h-10 w-10 rounded-full transition-all cursor-pointer flex items-center justify-center",
                  view === "ai-stats"
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary hover:scale-105",
                )}
              >
                <Sparkles className="w-5 h-5" />
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary hover:scale-105 transition-all cursor-pointer flex items-center justify-center"
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={() => setView("messages")}
              className={cn(
                "relative h-10 w-10 rounded-full transition-all cursor-pointer flex items-center justify-center",
                view === "messages"
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary hover:scale-105",
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
                  <p className="text-sm font-bold dark:text-white">
                    {currentUser?.name || currentUser?.username || "—"}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {roleMeta.label}
                  </p>
                </div>
                <button
                  onClick={() => setView("profile")}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  {t.accountSettings}
                </button>
                <button
                  onClick={() => setView("usage")}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  {u("pricing.seeUsage", "See Usage")}
                </button>
                <button
                  onClick={() => setView("payment-history")}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  {u("payments.paymentHistory", "Payment History")}
                </button>
                <button
                  onClick={() => {
                    setCheckoutPackageId(null);
                    setPaymentModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  {u("payments.quickTopup", "Quick Top-up")}
                </button>
                <button
                  onClick={() => setView("pricing")}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <Gem className="w-4 h-4" />
                  {u("usage.upgradePlan", "Upgrade Plan")}
                </button>
                <button className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer">
                  <Globe className="w-4 h-4" />
                  {t.support}
                </button>
                <button className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer">
                  <ShieldCheck className="w-4 h-4" />
                  {t.documentation}
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                <button
                  onClick={() => void handleLogout()}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all cursor-pointer"
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
          ref={viewContentRef}
          className={cn(
            // No width cap: the cap used to be 1280px, which left ~512px of dead gutter each side
            // on a 2560px display (and ~950px on an ultrawide) while looking fine on a 1366px
            // laptop, so it only ever showed up on wider client machines.
            "flex-1 min-h-0 w-full max-w-none",
            view === "map" || isTrackingMapActive
              ? "p-0"
              : view === "warehouse-overview" || view === "warehouses"
                ? "p-4 pb-24 md:pb-4"
                : "p-6 pb-24 md:pb-6",
            view === "messages" || view === "map"
              ? "overflow-hidden"
              : "overflow-y-auto",
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              className={cn(
                (view === "messages" ||
                  view === "map" ||
                  isTrackingMapActive) &&
                  "h-full",
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {(view === "tracking" || view === "history") && (
                <TrackingView
                  lang={lang}
                  role={role}
                  userId={currentUser?.id}
                  companyIds={trackingCompanyIds}
                  onLayoutModeChange={(mode) =>
                    setTrackingMapActive(mode === "map")
                  }
                  requestedLayout={trackingLayoutRequest?.mode}
                  requestedLayoutNonce={trackingLayoutRequest?.nonce}
                />
              )}
              {view === "feed" && (
                <HomeFeed
                  lang={lang}
                  role={role}
                  userId={currentUser?.id}
                  dataMode={feedDataMode}
                  loads={activeFeedLoads}
                  loading={!databaseLoadsLoaded}
                  filterBarLoading={feedFilterBarLoading}
                  exchangeMode={exchangeMode}
                  onExchangeModeChange={(mode) => {
                    if (mode === exchangeMode) {
                      if (exchangeModeTransitionTimerRef.current !== null) {
                        window.clearTimeout(exchangeModeTransitionTimerRef.current);
                        exchangeModeTransitionTimerRef.current = null;
                        setFeedFilterBarLoading(false);
                      }
                      return;
                    }
                    if (exchangeModeTransitionTimerRef.current !== null) {
                      window.clearTimeout(exchangeModeTransitionTimerRef.current);
                    }
                    setFeedFilterBarLoading(true);
                    exchangeModeTransitionTimerRef.current = window.setTimeout(() => {
                      setExchangeMode(mode);
                      clearFeedFilters();
                      exchangeModeTransitionTimerRef.current = null;
                    }, 200);
                  }}
                  myBidsOnly={feedMyBidsOnly}
                  onMyBidsOnlyChange={setFeedMyBidsOnly}
                  sortMode={feedSortMode}
                  startLocation={feedStartLocation}
                  endLocation={feedEndLocation}
                  minPriceFilter={feedSelectedPriceMin}
                  maxPriceFilter={feedSelectedPriceMax}
                  minWeightFilter={feedSelectedWeightMin}
                  maxWeightFilter={feedSelectedWeightMax}
                  minLengthFilter={feedSelectedLengthMin}
                  maxLengthFilter={feedSelectedLengthMax}
                  isLengthFilterActive={
                    feedSelectedLengthMin > feedRangeBounds.lengthMin ||
                    feedSelectedLengthMax < feedRangeBounds.lengthMax
                  }
                  minWidthFilter={feedSelectedWidthMin}
                  maxWidthFilter={feedSelectedWidthMax}
                  isWidthFilterActive={
                    feedSelectedWidthMin > feedRangeBounds.widthMin ||
                    feedSelectedWidthMax < feedRangeBounds.widthMax
                  }
                  minHeightFilter={feedSelectedHeightMin}
                  maxHeightFilter={feedSelectedHeightMax}
                  isHeightFilterActive={
                    feedSelectedHeightMin > feedRangeBounds.heightMin ||
                    feedSelectedHeightMax < feedRangeBounds.heightMax
                  }
                  minTemperatureFilter={feedSelectedTemperatureMin}
                  maxTemperatureFilter={feedSelectedTemperatureMax}
                  minCargoValueFilter={feedSelectedCargoValueMin}
                  maxCargoValueFilter={feedSelectedCargoValueMax}
                  isCargoValueFilterActive={
                    feedSelectedCargoValueMin > feedRangeBounds.cargoValueMin ||
                    feedSelectedCargoValueMax < feedRangeBounds.cargoValueMax
                  }
                  minTransitDaysFilter={feedSelectedTransitMin}
                  maxTransitDaysFilter={feedSelectedTransitMax}
                  selectedGoodsTypes={selectedFeedGoodsTypes}
                  selectedPriceTerms={selectedFeedPriceTerms}
                  selectedPaymentTerms={selectedFeedPaymentTerms}
                  selectedAdrClasses={selectedFeedAdrClasses}
                  selectedSensitivity={selectedFeedSensitivity}
                  selectedUrgency={selectedFeedUrgency}
                  selectedLoadingMethods={selectedFeedLoadingMethods}
                  filterBar={feedFilterBarProps}
                  onSortModeChange={setFeedSortMode}
                  onEditLoad={(load) => {
                    setEditLoadId(load.id);
                    setIsPostLoadOpen(true);
                  }}
                  onLoadChanged={() =>
                    setLoadRefreshKey((current) => current + 1)
                  }
                />
              )}
              {view === "notes" && <LoadNotesView lang={lang} />}
              {view === "messages" && (
                <MessagesView
                  lang={lang}
                  onOpenLoad={(loadId) => setOpenLoadDetailsId(loadId)}
                  onBookLoad={handleBookLoad}
                  onApplyLoadPrefill={(patch, conversationId, draftId) => {
                    setLenaLoadPrefill(patch);
                    setLenaSourceConversationId(conversationId);
                    setLenaSourceDraftId(draftId ?? null);
                    setEditLoadId(null);
                    setIsPostLoadOpen(true);
                  }}
                  onBulkImported={() =>
                    setLoadRefreshKey((current) => current + 1)
                  }
                  refreshSignal={messagesRefreshSignal}
                  newChatSignal={messagesNewChatSignal}
                  openConversationId={openMessagesConversationId}
                  onConversationOpened={() =>
                    setOpenMessagesConversationId(null)
                  }
                />
              )}
              {view === "map" && <MapView lang={lang} />}
              {view === "admin" && <AdminOverviewView lang={lang} />}
              {view === "admin-customers" && (
                <AdminCustomersView
                  lang={lang}
                  role={role}
                  onOpenEmailStudio={() => setView("email-studio")}
                />
              )}
              {view === "admin-companies" && (
                <AdminCompaniesView
                  lang={lang}
                  role={role}
                  onOpenEmailStudio={() => setView("email-studio")}
                />
              )}
              {view === "admin-drivers" && <AdminDriversView lang={lang} role={role} />}
              {view === "admin-warehouse-companies" && (
                <AdminWarehouseCompaniesView
                  lang={lang}
                  role={role}
                  onOpenEmailStudio={() => setView("email-studio")}
                />
              )}
              {view === "ai-stats" && isElevatedAdmin && (
                <AiStatsView lang={lang} role={role} />
              )}
              {view === "email-studio" && <EmailStudioView lang={lang} />}
              {view === "company" && (
                <CompanyWorkspaceView
                  lang={lang}
                  onPostLoad={() => {
                    setLenaLoadPrefill(null);
                    setLenaSourceConversationId(null);
                    setLenaSourceDraftId(null);
                    setEditLoadId(null);
                    setIsPostLoadOpen(true);
                  }}
                />
              )}
              {view === "warehouse-overview" && (
                <WarehouseOverviewView
                  lang={lang}
                  createSignal={warehouseCreateSignal}
                  onCreateSignalHandled={() => setWarehouseCreateSignal(0)}
                />
              )}
              {view === "warehouses" &&
                (isElevatedAdmin ? (
                  <WarehouseOverviewView lang={lang} networkView />
                ) : (
                  <WarehousesView lang={lang} role={role} />
                ))}
              {view === "company-team" && <CompanyTeamView lang={lang} />}
              {view === "finance" && <FinanceView lang={lang} />}
              {view === "automations" && <AutomationsView lang={lang} />}
              {view === "fleet" && (
                <FleetView
                  lang={lang}
                  role={role}
                  userId={currentUser?.id}
                  companyIds={trackingCompanyIds}
                />
              )}
              {view === "pricing" && (
                <PricingView
                  lang={lang}
                  onOpenUsage={() => setView("usage")}
                  onLearnMoreLenaAI={() => {
                    setLandingScrollTarget("lena-ai");
                    setIsLanding(true);
                  }}
                  onOpenCheckout={(packageId) => {
                    setCheckoutPackageId(packageId ?? null);
                    setPaymentModalOpen(true);
                  }}
                  refreshSignal={pricingRefreshSignal}
                />
              )}
              {view === "usage" && (
                <UsageView
                  lang={lang}
                  role={role}
                  onTopUp={() => {
                    setCheckoutPackageId(null);
                    setPaymentModalOpen(true);
                  }}
                  onUpgrade={() => setView("pricing")}
                />
              )}
              {view === "payment-history" && <PaymentHistoryView lang={lang} />}
              {view === "tariffs-hs" && <TariffsHsView lang={lang} />}
              {view === "profile" && (
                <ProfileView
                  role={role}
                  lang={lang}
                  onUserUpdated={setCurrentUser}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        {openLoadDetailsId && (
          <LoadDetailsModal
            loadId={openLoadDetailsId}
            lang={lang}
            role={role}
            userId={currentUser?.id}
            companyIds={trackingCompanyIds}
            onClose={() => setOpenLoadDetailsId(null)}
          />
        )}
        <PaymentModal
          open={paymentModalOpen}
          lang={lang}
          packageId={checkoutPackageId}
          onClose={() => {
            setPaymentModalOpen(false);
            setCheckoutPackageId(null);
          }}
          onSuccess={() => setPricingRefreshSignal((current) => current + 1)}
        />
        <LoadDetailsPrebook
          open={Boolean(bookingLoad)}
          load={bookingLoad}
          lang={lang}
          role={role}
          userId={currentUser?.id}
          companyIds={trackingCompanyIds}
          onEdit={(load) => {
            setBookingLoad(null);
            setEditLoadId(load.id);
            setIsPostLoadOpen(true);
          }}
          onChanged={() => setLoadRefreshKey((current) => current + 1)}
          onClose={() => setBookingLoad(null)}
        />
        <LenaAI
          open={lenaAiOpen}
          onClose={() => {
            setLenaAiOpen(false);
            setLenaCanvasMode(null);
            setMessagesRefreshSignal((current) => current + 1);
          }}
          lang={lang}
          userId={currentUser?.id}
          companyIds={trackingCompanyIds}
          initialCanvasMode={lenaCanvasMode}
          onApplyLoadPrefill={(patch, conversationId, draftId) => {
            setLenaLoadPrefill(patch);
            setLenaSourceConversationId(conversationId);
            setLenaSourceDraftId(draftId ?? null);
            setLenaAiOpen(false);
            setLenaCanvasMode(null);
            setEditLoadId(null);
            setIsPostLoadOpen(true);
          }}
          onBulkImported={() => setLoadRefreshKey((current) => current + 1)}
          onOpenLoad={(loadId) => {
            setLenaAiOpen(false);
            setOpenLoadDetailsId(loadId);
          }}
          onBookLoad={async (loadId) => {
            setLenaAiOpen(false);
            await handleBookLoad(loadId);
          }}
        />
        <PostLoadModal
          isOpen={isPostLoadOpen}
          editLoadId={editLoadId}
          initialPrefill={lenaLoadPrefill}
          sourceConversationId={lenaSourceConversationId}
          initialDraftId={lenaSourceDraftId}
          onDraftConversationCreated={(conversationId) => {
            setOpenMessagesConversationId(conversationId);
            setView("messages");
            setIsPostLoadOpen(false);
            setEditLoadId(null);
            setLenaLoadPrefill(null);
            setLenaSourceConversationId(null);
            setLenaSourceDraftId(null);
            setMessagesRefreshSignal((current) => current + 1);
          }}
          onOpenLenaAI={() => {
            // PostLoadModal stays open (mounted) behind LenaAI instead of being closed - LenaAI
            // now renders at a higher z-index (300) so it visually covers it, and closing LenaAI
            // reveals PostLoadModal again in its exact previous state instead of falling back to
            // the app underneath.
            setLenaCanvasMode("new_load");
            setLenaAiOpen(true);
          }}
          onClose={() => {
            setIsPostLoadOpen(false);
            setEditLoadId(null);
            setLenaLoadPrefill(null);
            setLenaSourceConversationId(null);
            setLenaSourceDraftId(null);
          }}
          onSaved={(load) => {
            setLenaLoadPrefill(null);
            setLenaSourceConversationId(null);
            setLenaSourceDraftId(null);
            handleLoadSaved(load);
          }}
          lang={lang}
        />

        {/* Bottom Nav (Mobile) */}
        <nav className="md:hidden fixed bottom-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 h-16 flex items-center justify-start gap-6 overflow-x-auto z-50">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={cn(
                "flex shrink-0 flex-col items-center gap-1 transition-all cursor-pointer",
                isNavItemActive(item.id) ? "text-primary" : "text-slate-400",
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">
                {item.label.split(" ")[0]}
              </span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}
