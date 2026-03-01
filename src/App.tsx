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
  Sparkles,
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

const ROUTE_MODELS_BY_VEHICLE: Record<string, string[]> = {
  "Cargo Van": ["Mercedes Sprinter", "Ford Transit", "Renault Master"],
  "Box Truck": ["MAN TGL 12.250", "Volvo FL 250", "DAF LF 260"],
  "Reefer Truck": ["Scania R450", "DAF XF 480", "Volvo FH 500"],
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
  const [routeVehicle, setRouteVehicle] = useState<keyof typeof ROUTE_MODELS_BY_VEHICLE>("Cargo Van");
  const [routeModel, setRouteModel] = useState("Mercedes Sprinter");
  const [routeMaxLoad, setRouteMaxLoad] = useState(1800);
  const [routePriority, setRoutePriority] = useState<'fastest' | 'balanced' | 'eco'>('balanced');
  const [selectedWaypoint, setSelectedWaypoint] = useState<FeatureRouteStop['id']>('zagreb');
  const [messageIndex, setMessageIndex] = useState(0);
  const [typedMessage, setTypedMessage] = useState('');
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
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

  const activeLang = (lang || 'en') as Exclude<Language, null>;
  const currentLang = languages.find(l => l.id === (lang || 'en')) || languages[0];
  const titleMessages = HERO_MAIN_TITLE_MESSAGES[activeLang] || HERO_MAIN_TITLE_MESSAGES.en;
  const landingLoads = useMemo(() => {
    const loads = MOCK_LOADS.length > 0 ? MOCK_LOADS : [];
    return loads;
  }, []);
  const loopingLandingLoads = useMemo(
    () => [...landingLoads, ...landingLoads],
    [landingLoads]
  );
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
  const routeModelOptions = useMemo(() => ROUTE_MODELS_BY_VEHICLE[routeVehicle], [routeVehicle]);
  const routeEstimate = useMemo(() => {
    const baseDistance = 1391;
    const baseHours = routePriority === 'fastest' ? 20 : routePriority === 'eco' ? 23 : 21;
    const baseFuel = routePriority === 'fastest' ? 470 : routePriority === 'eco' ? 410 : 440;
    const baseCost = routePriority === 'fastest' ? 1490 : routePriority === 'eco' ? 1360 : 1425;
    const loadFactor = routeMaxLoad / 2500;
    const etaHours = Math.round(baseHours + loadFactor * 2);
    const fuelLiters = Math.round(baseFuel + loadFactor * 20);
    const totalCost = Math.round(baseCost + loadFactor * 80);
    return {
      distance: baseDistance,
      eta: `${etaHours}h`,
      fuel: `${fuelLiters} L`,
      cost: `€${totalCost}`,
    };
  }, [routePriority, routeMaxLoad]);
  const routePriorityLabel = routePriority === 'fastest' ? 'Fast' : routePriority === 'eco' ? 'Eco' : 'Smart';
  const trackerTimeline = [
    {
      time: '06:40',
      title: 'Departed Zagreb Hub',
      note: 'Driver check-in confirmed',
      icon: CheckCircle2,
      iconClass: 'text-emerald-500 bg-emerald-500/12'
    },
    {
      time: '11:10',
      title: 'Stop 1: Munich Relay',
      note: 'Cargo scan and handoff checkpoint',
      icon: MapPin,
      iconClass: 'text-amber-500 bg-amber-500/12'
    },
    {
      time: '15:45',
      title: 'Stop 2: Cologne Relay',
      note: 'Driver rest and route recalibration',
      icon: Clock,
      iconClass: 'text-sky-500 bg-sky-500/12'
    },
    {
      time: 'Tomorrow 07:20',
      title: 'Arrival: Amsterdam DC',
      note: 'Dock and unloading slot confirmed',
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
    if (!routeModelOptions.includes(routeModel)) {
      setRouteModel(routeModelOptions[0]);
    }
  }, [routeModelOptions, routeModel]);

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
              <button
                aria-label="Language switcher"
                title={currentLang.label}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-primary transition-all cursor-pointer"
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
                      "w-full flex items-center gap-3 p-2 rounded-xl text-sm font-medium transition-all",
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
              Global Logistics Standard
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-display text-slate-900 dark:text-white leading-[0.9] mb-8 h-[2.7em] overflow-hidden">
              <span className="font-normal">{typedBeforeKeyword}</span>
              <span className="text-primary font-black">{typedKeyword}</span>
              <span className="font-normal">{typedAfterKeyword}</span>
              <span className="inline-block ml-2 text-primary animate-pulse">|</span>
            </h1>
            <div className="mb-10 max-w-xl">
              <p className="text-xl font-bold text-slate-900 dark:text-white mb-4 leading-relaxed">
                Preuzmi aplikaciju
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="h-12 px-5 rounded-2xl bg-black text-white inline-flex items-center gap-3 font-semibold text-sm shadow-lg shadow-black/25 cursor-pointer hover:bg-slate-900 transition-colors">
                  <span className="text-base leading-none" aria-hidden="true"></span>
                  <span>Download on Appstore</span>
                </button>
                <button className="h-12 px-5 rounded-2xl bg-black text-white inline-flex items-center gap-3 font-semibold text-sm shadow-lg shadow-black/25 cursor-pointer hover:bg-slate-900 transition-colors">
                  <span className="text-sm leading-none" aria-hidden="true">▶</span>
                  <span>Download on Playstore</span>
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

            <div className="mt-2 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-xl w-full overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Available Loads</h4>
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">{landingLoads.length} Live</span>
              </div>
              <div className="h-64 overflow-hidden relative">
                <div className="p-4 space-y-3 animate-load-scroll">
                  {loopingLandingLoads.map((load, index) => (
                    <div key={`${load.id}-${index}`} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{load.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{load.cargoType} • {load.weight} kg • {load.date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-primary">{load.price}</p>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          load.status === 'Available' ? "text-emerald-500" : load.status === 'Assigned' ? "text-amber-500" : "text-slate-400"
                        )}>
                          {load.status}
                        </span>
                      </div>
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
                        <span className="text-xs font-bold uppercase tracking-wider">Route Confirmed</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-2xl p-6 rounded-3xl border border-white/20 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 rounded-full bg-primary text-[10px] font-black uppercase tracking-widest text-white">Live Route</span>
                      <span className="text-xs font-bold text-white/70">ETA Mar 3, 14:20</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                        <Truck className="text-primary w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">HAM-SJJ-214</p>
                        <p className="text-sm text-white/60">1,545 km | Hamburg Port → Sarajevo Hub</p>
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
      <section id="features" className={cn("scroll-mt-28 bg-slate-50 dark:bg-slate-900/50", SECTION_PADDING)}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 dark:text-white tracking-tight">Built for the <br /> <span className="text-primary">Modern Fleet.</span></h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg">Everything you need to manage global logistics at scale, from real-time tracking to AI-powered route optimization.</p>
          </div>
          
          <div className="grid md:grid-cols-12 gap-6">
            {/* Main Feature */}
            <div className="md:col-span-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] p-12 flex border border-slate-100 dark:border-slate-800 group overflow-hidden relative shadow-sm hover:shadow-2xl transition-all duration-500">
              <div className="relative z-10 flex flex-1 flex-col">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                  <MapIcon className="text-white w-8 h-8" />
                </div>
                <h3 className="text-4xl font-bold mb-6 dark:text-white tracking-tight">Real-time Global Visibility</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md text-xl leading-relaxed">Track every package, vehicle, and asset in real-time with sub-meter precision across 180+ countries.</p>
                <div className="mt-auto pt-8 flex gap-4">
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
            </div>

            {/* Side Feature 1 */}
            <div className="md:col-span-4 bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-black text-primary inline-flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    Live Tracker
                  </p>
                  <p className="text-2xl font-black dark:text-white">ZAG-AMS-881</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider">In Transit</span>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 mb-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>Zagreb Hub</span>
                  <span>Amsterdam DC</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full w-[44%] bg-primary rounded-full" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs font-bold">
                  <span className="text-primary">612 km completed</span>
                  <span className="text-slate-500">779 km left</span>
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
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-primary mb-3">Route Timeline</p>
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
                    Route Stops
                  </p>
                  <h3 className="text-2xl font-bold dark:text-white tracking-tight">Waypoint Planner</h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">4 Markers</span>
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
            <div className="md:col-span-8 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all">
              <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary inline-flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Route Calculator
                      </p>
                      <p className="text-2xl font-black dark:text-white">Optimize for vehicle and load preferences</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">AI Score 97</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Vehicle</label>
                      <select
                        value={routeVehicle}
                        onChange={(e) => setRouteVehicle(e.target.value as keyof typeof ROUTE_MODELS_BY_VEHICLE)}
                        className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        {Object.keys(ROUTE_MODELS_BY_VEHICLE).map((vehicle) => (
                          <option key={vehicle} value={vehicle}>{vehicle}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Model</label>
                      <select
                        value={routeModel}
                        onChange={(e) => setRouteModel(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        {routeModelOptions.map((model) => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Max Load</label>
                      <div className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center gap-3">
                        <input
                          type="range"
                          min={400}
                          max={2500}
                          step={50}
                          value={routeMaxLoad}
                          onChange={(e) => setRouteMaxLoad(Number(e.target.value))}
                          className="w-full accent-primary cursor-pointer"
                        />
                        <span className="text-xs font-black text-primary whitespace-nowrap">{routeMaxLoad} kg</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Priority</label>
                      <div className="h-11 grid grid-cols-3 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900">
                        {[
                          { id: 'fastest', label: 'Fast' },
                          { id: 'balanced', label: 'Smart' },
                          { id: 'eco', label: 'Eco' },
                        ].map((option) => (
                          <button
                            key={option.id}
                            onClick={() => setRoutePriority(option.id as 'fastest' | 'balanced' | 'eco')}
                            className={cn(
                              "text-[11px] font-black transition-colors cursor-pointer",
                              routePriority === option.id
                                ? "bg-primary text-white"
                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 flex flex-col items-center justify-center text-center">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] uppercase text-slate-500">Distance</p>
                      <p className="text-2xl leading-none font-black dark:text-white mt-1">{routeEstimate.distance} km</p>
                    </div>
                    <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 flex flex-col items-center justify-center text-center">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                        <Clock className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] uppercase text-slate-500">ETA</p>
                      <p className="text-2xl leading-none font-black dark:text-white mt-1">{routeEstimate.eta}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 flex flex-col items-center justify-center text-center">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                        <Truck className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] uppercase text-slate-500">Fuel</p>
                      <p className="text-2xl leading-none font-black dark:text-white mt-1">{routeEstimate.fuel}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 flex flex-col items-center justify-center text-center">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] uppercase text-slate-500">Projected Cost</p>
                      <p className="text-2xl leading-none font-black dark:text-white mt-1">{routeEstimate.cost}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">AI Recommendation</p>
                    <p className="text-sm font-bold dark:text-white mb-1">Zagreb → Munich → Frankfurt → Cologne → Amsterdam</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Best fit for {routeModel}, {routeMaxLoad} kg load, {routePriorityLabel} priority.
                    </p>
                  </div>
                </div>

                <div className="xl:w-56 rounded-3xl bg-primary text-white p-6 flex flex-col justify-between shadow-xl shadow-primary/25">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-white/80 mb-2">AI Confidence</p>
                    <p className="text-4xl font-black mb-4">98%</p>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Traffic Prediction</span>
                          <span>High</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/20 overflow-hidden"><div className="h-full w-[88%] bg-white rounded-full" /></div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Fuel Efficiency</span>
                          <span>Optimized</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/20 overflow-hidden"><div className="h-full w-[81%] bg-white rounded-full" /></div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>ETA Stability</span>
                          <span>Strong</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/20 overflow-hidden"><div className="h-full w-[86%] bg-white rounded-full" /></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 text-xs text-white/80">
                    Recalculates every 3 min using live road events and fleet constraints.
                  </div>
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
      <section id="pricing" className={cn("scroll-mt-28 bg-white dark:bg-slate-950", SECTION_PADDING)}>
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
                  className={cn("w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer", role === 'user' ? "border-primary bg-primary/5" : "border-slate-100 dark:border-slate-800 hover:border-slate-200")}
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
                  className={cn("w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer", role === 'driver' ? "border-primary bg-primary/5" : "border-slate-100 dark:border-slate-800 hover:border-slate-200")}
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
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
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
                    className={cn("w-full p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer", driverData.idPhoto ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" : "border-slate-200 dark:border-slate-800 hover:border-primary/50")}
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
                    "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer", 
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
                  className={cn("w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer", driverType === 'company' ? "border-primary bg-primary/5" : "border-slate-100 dark:border-slate-800 hover:border-slate-200")}
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
                      className={cn("w-full p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer", carData.photo ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" : "border-slate-200 dark:border-slate-800 hover:border-primary/50")}
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
  const currentLang = languages.find(l => l.id === (lang || 'en')) || languages[0];

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
            onClick={() => setIsDark(!isDark)}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
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
              <button
                aria-label="Language switcher"
                title={currentLang.label}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-primary transition-all cursor-pointer"
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
