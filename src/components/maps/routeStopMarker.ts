import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { divIcon } from 'leaflet';
import type { LucideIcon } from 'lucide-react';

/** Pickups are green and deliveries blue, the colours the two form columns already use. */
export const STOP_COLORS: Record<'pickup' | 'delivery', string> = {
  pickup: '#10b981',
  delivery: '#0ea5e9',
};

/**
 * A stop's place-type icon as a leaflet marker.
 *
 * Leaflet's divIcon takes HTML, not React, so the icon component is rendered to a static SVG string
 * once per marker - the same component the stop card and the route timeline draw, so a warehouse is
 * the same warehouse everywhere it appears.
 */
export const routeStopMarker = (kind: 'pickup' | 'delivery', icon: LucideIcon, size = 24) =>
  divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html:
      `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;` +
      `border-radius:9999px;border:2px solid #fff;background:${STOP_COLORS[kind]};color:#fff;` +
      `box-shadow:0 1px 5px rgba(15,23,42,.45)">` +
      renderToStaticMarkup(createElement(icon, {
        width: Math.round(size * 0.55),
        height: Math.round(size * 0.55),
        strokeWidth: 2.5,
        color: 'currentColor',
      })) +
      '</span>',
  });
