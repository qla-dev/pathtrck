import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { mapLoadToPackage } from '../lib/loadDetails';
import type { Language, Package } from '../types';

type Position = { point: [number, number]; updatedAt: string; lastKnown: boolean };
type TrackingState = { key: string; position: Position | null; loading: boolean; failed: boolean };

export const useConnectedTransportTracking = (pkg: Package, lang: Language, enabled: boolean) => {
  const mode = pkg.transportType || 'road';
  const taskKey = mode === 'air' ? 'flight_details' : 'vessel_and_voyage';
  const value = String(pkg.operationalChecklist?.find((item) => item.key === taskKey)?.action_value || '');
  let identifier = '';
  try {
    const saved = JSON.parse(value);
    if (saved?.matched === true) {
      const candidate = String(mode === 'air' ? saved.hex : saved.mmsi);
      if ((mode === 'air' ? /^[a-f0-9]{6}$/i : /^\d{9}$/).test(candidate)) identifier = candidate.toLowerCase();
    }
  } catch { /* Unmatched text cannot identify a transport to track. */ }
  const active = enabled && pkg.status === 'In delivery' && mode !== 'warehouse';
  const key = `${pkg.id}:${mode}:${identifier}:${pkg.vehicleId || ''}:${active}`;
  const [state, setState] = useState<TrackingState>({ key: '', position: null, loading: false, failed: false });

  useEffect(() => {
    if (!active || !pkg.id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const valid = (lat: unknown, lon: unknown) => lat != null && lon != null
      && Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))
      && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lon)) <= 180;
    const poll = async () => {
      setState((previous) => ({ key, position: previous.key === key ? previous.position : null, loading: true, failed: false }));
      try {
        let position: Position | null = null;
        if (mode === 'air' && identifier) {
          const response = await api.aircraft.list({ south: -90, west: -180, north: 90, east: 180, search: identifier });
          const aircraft = response.data.find((row) => row.hex.toLowerCase() === identifier);
          if (aircraft && aircraft.position_source !== 'registry' && valid(aircraft.lat, aircraft.lon)) {
            position = {
              point: [Number(aircraft.lat), Number(aircraft.lon)],
              updatedAt: aircraft.seen_at ? new Date(aircraft.seen_at * 1000).toISOString()
                : aircraft.position_source === 'last_seen' ? '' : new Date(Date.now() - (aircraft.seen || 0) * 1000).toISOString(),
              lastKnown: aircraft.position_source === 'last_seen',
            };
          }
        } else if (mode === 'sea' && identifier) {
          const response = await api.vessels.search(identifier);
          const vessel = response.data.find((row) => String(row.mmsi) === identifier);
          if (vessel && valid(vessel.lat, vessel.lon)) {
            position = { point: [Number(vessel.lat), Number(vessel.lon)], updatedAt: vessel.updated_at || '', lastKnown: false };
          }
        } else if (mode !== 'air' && mode !== 'sea') {
          const response = await api.loads.get(pkg.id);
          const refreshed = mapLoadToPackage(response.data, lang);
          if (refreshed.status === 'In delivery' && refreshed.hasCurrentLocation) {
            position = { point: refreshed.currentLocation, updatedAt: refreshed.trackingUpdatedAt || '', lastKnown: false };
          }
        }
        if (!cancelled) setState({ key, position, loading: false, failed: !position });
      } catch {
        if (!cancelled) setState((previous) => ({ key, position: previous.key === key && previous.position ? { ...previous.position, lastKnown: true } : null, loading: false, failed: true }));
      } finally {
        if (!cancelled) timer = setTimeout(() => void poll(), 10000);
      }
    };
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key, active, pkg.id, mode, identifier, lang]);

  const current = state.key === key ? state : null;
  const position = current?.position;
  const stale = Boolean(position && (position.lastKnown || !position.updatedAt || Date.now() - new Date(position.updatedAt).getTime() > 5 * 60000));
  const trackedPackage = active ? {
    ...pkg,
    hasCurrentLocation: Boolean(position),
    currentLocation: position?.point || pkg.currentLocation,
    trackingUpdatedAt: position?.updatedAt || '',
  } : pkg;
  return { trackedPackage, active, loading: active && (!current || current.loading), unavailable: active && Boolean(current?.failed), stale };
};
