import { Role } from '../types';

export type ApiEnvelope<T> = {
  message: string;
  data: T;
  meta?: { current_page?: number; last_page?: number; per_page?: number; total?: number };
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

const API_BACKENDS = {
  local: '/api',
  production: 'https://cargo.qla.dev/endpoints/api',
} as const;

const configuredBackend = String(import.meta.env.VITE_API_BACKEND || 'local').toLowerCase();
const API_BASE_URL = (API_BACKENDS[configuredBackend as keyof typeof API_BACKENDS] || API_BACKENDS.local)
  .replace(/\/+$/, '');
const TOKEN_STORAGE_KEY = 'smartfreight_api_token';

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
    credentials: 'include', ...options, headers,
  });
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload) {
    if (response.status === 401) setToken(null);
    throw new ApiError(payload?.message || `API request failed (${response.status}).`, response.status, payload?.errors || {});
  }
  return payload;
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
    login: async (login: string, password: string) => {
      const response = await request<ApiLoginResult>('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) });
      setToken(response.data.token);
      return response.data;
    },
    me: async () => (await request<ApiUser>('/auth/me')).data,
    logout: async () => { try { await request<null>('/auth/logout', { method: 'POST' }); } finally { setToken(null); } },
  },
  roles: resourceApi<Record<string, unknown>>('roles'),
  users: resourceApi<Record<string, unknown>>('users'),
  companies: resourceApi<Record<string, unknown>>('companies'),
  companyMemberships: resourceApi<Record<string, unknown>>('company-memberships'),
  companyInvitations: resourceApi<Record<string, unknown>>('company-invitations'),
  drivers: resourceApi<Record<string, unknown>>('driver-profiles'),
  vehicles: resourceApi<Record<string, unknown>>('vehicles'),
  fleetAccess: resourceApi<Record<string, unknown>>('fleet-access'),
  loads: resourceApi<Record<string, unknown>>('loads'),
  offers: resourceApi<Record<string, unknown>>('offers'),
  shipments: resourceApi<Record<string, unknown>>('shipments'),
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
