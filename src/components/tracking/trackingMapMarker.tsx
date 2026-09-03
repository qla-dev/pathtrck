import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { Plane, Ship, Train, Truck } from 'lucide-react';

import { Package as PackageData } from '../../types';

const STATUS_MARKER_COLORS: Record<PackageData['status'], string> = {
  Posted: '#64748b', Booked: '#0ea5e9', Opened: '#06b6d4', Sent: '#3b82f6', 'In delivery': '#f59e0b',
  Received: '#8b5cf6', Finished: '#10b981', Pending: '#fb923c', Cancelled: '#f43f5e',
};

const TRANSPORT_MARKER_ICONS = { air: Plane, sea: Ship, rail: Train, road: Truck } as const;
const markerIconCache = new Map<string, L.DivIcon>();

export const trackingMarkerIcon = (transportType: string, status: PackageData['status']) => {
  const key = `${transportType}|${status}`;
  const cached = markerIconCache.get(key);
  if (cached) return cached;

  const color = STATUS_MARKER_COLORS[status] || '#64748b';
  const Icon = TRANSPORT_MARKER_ICONS[transportType as keyof typeof TRANSPORT_MARKER_ICONS] || Truck;
  const glyph = renderToStaticMarkup(<Icon width={16} height={16} color="#ffffff" strokeWidth={2.4} />);
  const icon = L.divIcon({
    className: 'tracking-map-marker',
    html: `<div style="position:relative;width:32px;height:38px;">
      <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:${color};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(15,23,42,0.45);">${glyph}</div>
      <div style="position:absolute;left:50%;top:29px;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid #fff;"></div>
    </div>`,
    iconSize: [32, 38],
    iconAnchor: [16, 38],
    popupAnchor: [0, -40],
  });
  markerIconCache.set(key, icon);
  return icon;
};
