import { Role } from '../types';

export type ApiEnvelope<T> = {
  message: string;
  data: T;
  meta?: { current_page?: number; page_no?: number; last_page?: number; per_page?: number; limit?: number; total?: number; email_sent?: boolean; has_more?: boolean };
  errors?: Record<string, string[]>;
};

export type ApiUser = {
  id: number;
  role_id: number;
  name: string;
  email: string;
  username: string;
  language: string;
  is_active: boolean;
  role?: { id: number; name: Exclude<Role, null>; label: string };
  companies?: Array<Record<string, unknown>>;
};

export type ApiLoginResult = { token: string; token_type: 'Bearer'; user: ApiUser };
export type ListParams = Record<string, string | number | boolean | undefined>;

export type ScanImage = { base64: string; mimeType?: string };
export type LoadScanResult = {
  isDocument: boolean;
  title: string;
  cargoType: string;
  goodsType: string;
  weightKg: number;
  pallets: number;
  bodyType: string;
  pickupCity: string;
  pickupCountryCode: string;
  pickupDate: string;
  deliveryCity: string;
  deliveryCountryCode: string;
  deliveryDate: string;
  currency: string;
  budget: number;
  bookingReference: string;
  notes: string;
  confidence: number;
  warnings: string[];
};

export type BulkLoadRow = {
  title: string;
  cargoType: string;
  goodsType: string;
  weightKg: number;
  pallets: number;
  bodyType: string;
  pickupCity: string;
  pickupCountryCode: string;
  pickupDate: string;
  deliveryCity: string;
  deliveryCountryCode: string;
  deliveryDate: string;
  currency: string;
  budget: number;
  bookingReference: string;
  notes: string;
};
export type BulkLoadScanResult = { isDocument: boolean; rows: BulkLoadRow[]; warnings: string[] };

const API_BACKENDS = {
  local: 'https://cargo.qla.dev/endpoints/api',
  production: 'https://cargo.qla.dev/endpoints/api',
} as const;

const configuredBackend = String(import.meta.env.VITE_API_BACKEND || 'production').toLowerCase();
const API_BASE_URL = (API_BACKENDS[configuredBackend as keyof typeof API_BACKENDS] || API_BACKENDS.local)
  .replace(/\/+$/, '');
const TOKEN_STORAGE_KEY = 'freightbook_api_token';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly errors: Record<string, string[]> = {}) {
    super(message);
  }
}

const getToken = () => typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_STORAGE_KEY);
const setToken = (token: string | null) => {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> => {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    credentials: 'omit', ...options, headers,
  });
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload) {
    if (response.status === 401) setToken(null);
    throw new ApiError(payload?.message || `API request failed (${response.status}).`, response.status, payload?.errors || {});
  }
  return payload;
};

const openDocument = async (path: string): Promise<void> => {
  const popup = window.open('', '_blank');
  if (!popup) throw new ApiError('Allow pop-ups to open this document.', 0);

  popup.document.write('<!doctype html><title>Loading…</title><p style="font-family:sans-serif;padding:24px">Loading document…</p>');
  const headers = new Headers({ Accept: 'text/html' });
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  try {
    const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      credentials: 'omit', headers,
    });
    if (!response.ok) throw new ApiError(`Document could not be generated (${response.status}).`, response.status);
    const html = await response.text();
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  } catch (error) {
    popup.close();
    throw error;
  }
};

const queryString = (params: ListParams = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined) query.set(key, String(value)); });
  return query.toString();
};

export const resourceApi = <T extends Record<string, unknown>>(resource: string) => ({
  list: async (params: ListParams = {}) => {
    const query = queryString(params);
    return request<T[]>(query ? `/${resource}?${query}` : `/${resource}`);
  },
  get: async (id: number | string) => request<T>(`/${resource}/${id}`),
  create: async (data: Partial<T> | Record<string, unknown>) => request<T>(`/${resource}`, { method: 'POST', body: JSON.stringify(data) }),
  update: async (id: number | string, data: Partial<T> | Record<string, unknown>) => request<T>(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: async (id: number | string) => request<null>(`/${resource}/${id}`, { method: 'DELETE' }),
});

export const api = {
  health: () => request<{ status: string; timestamp: string }>('/health'),
  auth: {
    hasSession: () => Boolean(getToken()),
    login: async (login: string, password: string) => {
      const response = await request<ApiLoginResult>('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) });
      setToken(response.data.token);
      return response.data;
    },
    me: async () => (await request<ApiUser>('/auth/me')).data,
    updateProfile: async (data: Record<string, unknown>) => (await request<ApiUser>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) })).data,
    logout: async () => { try { await request<null>('/auth/logout', { method: 'POST' }); } finally { setToken(null); } },
  },
  roles: resourceApi<Record<string, unknown>>('roles'),
  users: {
    ...resourceApi<Record<string, unknown>>('users'),
  },
  customers: {
    ...resourceApi<Record<string, unknown>>('customers'),
    authorize: (id: number | string, email: string) => request<Record<string, unknown>>(`/customers/${id}/authorize`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  },
  customerOptions: (params: ListParams = {}) => {
    const query = queryString(params);
    return request<Record<string, unknown>[]>(query ? `/customer-options?${query}` : '/customer-options');
  },
  companies: {
    ...resourceApi<Record<string, unknown>>('companies'),
    onboard: (data: Record<string, unknown>) => request<Record<string, unknown>>('/companies/onboard', { method: 'POST', body: JSON.stringify(data) }),
  },
  companyMemberships: resourceApi<Record<string, unknown>>('company-memberships'),
  companyInvitations: resourceApi<Record<string, unknown>>('company-invitations'),
  drivers: resourceApi<Record<string, unknown>>('drivers'),
  vehicles: resourceApi<Record<string, unknown>>('vehicles'),
  fleetAccess: resourceApi<Record<string, unknown>>('fleet-access'),
  loads: {
    ...resourceApi<Record<string, unknown>>('loads'),
    updateStatus: (id: number | string, status: string) => request<Record<string, unknown>>(`/loads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
    scan: (images: ScanImage[]) => request<LoadScanResult>('/load-scans', {
      method: 'POST',
      body: JSON.stringify({ images }),
    }),
    scanBulk: (images: ScanImage[]) => request<BulkLoadScanResult>('/load-scans/bulk', {
      method: 'POST',
      body: JSON.stringify({ images }),
    }),
    scanText: (description: string) => request<LoadScanResult>('/load-scans/text', {
      method: 'POST',
      body: JSON.stringify({ description }),
    }),
    scanBulkText: (text: string) => request<BulkLoadScanResult>('/load-scans/bulk/text', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
    createBulk: (loads: Record<string, unknown>[]) => request<Record<string, unknown>[]>('/loads/bulk', {
      method: 'POST',
      body: JSON.stringify({ loads }),
    }),
  },
  loadStops: resourceApi<Record<string, unknown>>('load-stops'),
  offers: {
    ...resourceApi<Record<string, unknown>>('offers'),
    approve: (id: number | string, driverUserId?: number) => request<Record<string, unknown>>(`/offers/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(driverUserId ? { driver_user_id: driverUserId } : {}),
    }),
  },
  shipments: resourceApi<Record<string, unknown>>('shipments'),
  shipmentInvoice: (shipmentId: number | string, document: 'predracun' | 'a4-faktura') =>
    openDocument(`/shipments/${shipmentId}/invoice/${document}`),
  loadInvoice: (loadId: number | string, document: 'predracun' | 'a4-faktura') =>
    openDocument(`/loads/${loadId}/invoice/${document}`),
  routes: resourceApi<Record<string, unknown>>('routes'),
  trackingEvents: resourceApi<Record<string, unknown>>('tracking-events'),
  conversations: resourceApi<Record<string, unknown>>('conversations'),
  messages: resourceApi<Record<string, unknown>>('messages'),
  notes: resourceApi<Record<string, unknown>>('load-notes'),
  documents: resourceApi<Record<string, unknown>>('documents'),
  invoices: resourceApi<Record<string, unknown>>('invoices'),
  invoiceItems: resourceApi<Record<string, unknown>>('invoice-items'),
  emailTemplates: resourceApi<Record<string, unknown>>('email-templates'),
  emailCampaigns: resourceApi<Record<string, unknown>>('email-campaigns'),
};
