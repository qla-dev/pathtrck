// The glyph registry for catalog options. Which icon an option gets is decided once, in the backend
// catalog (backend/resources/lena/schema.json's option_icons), so a body type or a transport type
// looks the same on a Post a load card, a LenaAI chat pill and on mobile. This file only maps those
// names onto the components this client draws them with.
import {
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, BadgeCheck, Banknote, Blinds, Box, Boxes,
  Building2, CalendarDays, CircleDot, CircleOff, Clock3, Coins, Container, DoorOpen, Droplet,
  FileText, Forklift, Gem, Globe, Handshake, HelpCircle, Landmark, Layers, Lock, MapPin, Maximize2,
  Package, Package2, PackageCheck, PackageOpen, PanelBottom, Pill, Plane, PlaneLanding, Radar,
  RotateCcw, Route, Ruler, ScanEye, ScanLine, ShieldAlert, ShieldCheck, Ship, Snowflake, Tags,
  ThermometerSnowflake, TrainFront, Truck, Umbrella, UserRound, UtensilsCrossed, Warehouse, Weight,
  Wine, Wrench, Zap, type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, BadgeCheck, Banknote, Blinds, Box, Boxes,
  Building2, CalendarDays, CircleOff, Clock3, Coins, Container, DoorOpen, Droplet, FileText,
  Forklift, Gem, Globe, Handshake, HelpCircle, Landmark, Layers, Lock, MapPin, Maximize2, Package,
  Package2, PackageCheck, PackageOpen, PanelBottom, Pill, Plane, PlaneLanding, Radar, RotateCcw,
  Route, Ruler, ScanEye, ScanLine, ShieldAlert, ShieldCheck, Ship, Snowflake, Tags,
  ThermometerSnowflake, TrainFront, Truck, Umbrella, UserRound, UtensilsCrossed, Warehouse, Weight,
  Wine, Wrench, Zap,
};

/** The icon an option is drawn with, or a neutral dot for a value the catalog has no glyph for. */
export const lenaIcon = (name: string | null | undefined, fallback: LucideIcon = CircleDot): LucideIcon =>
  (name ? ICONS[name] : undefined) ?? fallback;
