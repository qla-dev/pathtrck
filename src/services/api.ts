import { Role } from '../types';

export type ApiEnvelope<T> = {
  message: string;
  data: T;
  meta?: { current_page?: number; page_no?: number; last_page?: number; per_page?: number; limit?: number; total?: number; email_sent?: boolean; has_more?: boolean; unlimited?: boolean };
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
export type SocialAuthResult = ApiLoginResult | { needs_registration: true; email?: string; name?: string };
export type ListParams = Record<string, string | number | boolean | undefined>;

export const AI_DISPATCH_SUBJECT_PREFIX = 'AI Dispatch — ';

export type ScanImage = { base64: string; mimeType?: string; filename?: string };
export type HsCodeMatch = {
  code: string;
  description: string;
  confidence: number;
  headingCode?: string;
  headingName?: string;
  chapterCode?: string;
  chapterName?: string;
  version?: string;
};
export type LoadPartyMatch = {
  role: string;
  name: string;
  taxNumber: string;
  city: string;
  countryCode: string;
};
export type LoadScanResult = {
  isDocument: boolean;
  sender?: LoadPartyMatch;
  receiver?: LoadPartyMatch;
  customerCandidates?: LoadPartyMatch[];
  consigneeName: string;
  consigneeTaxNumber: string;
  consigneeCity: string;
  consigneeCountryCode: string;
  consignee: Record<string, unknown> | null;
  title: string;
  transportType: string;
  cargoType: string;
  goodsType: string;
  hsSearchTerms: string;
  hsCodes: HsCodeMatch[];
  weightKg: number;
  pallets: number;
  bodyType: string;
  lengthM: number;
  widthM: number;
  heightM: number;
  volumeM3: number;
  vehicleType: string;
  loadingEquipment: string;
  characteristics: string;
  specialRequirements: string[];
  transportMode: string;
  deliveryProof: string;
  requiresTracking: boolean;
  pickupCity: string;
  pickupPostalCode: string;
  pickupCountryCode: string;
  pickupAddress: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  pickupDate: string;
  pickupDateTo: string;
  pickupTimeFrom: string;
  pickupTimeTo: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  deliveryCountryCode: string;
  deliveryAddress: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  deliveryDate: string;
  deliveryDateTo: string;
  deliveryTimeFrom: string;
  deliveryTimeTo: string;
  currency: string;
  budget: number;
  priceTerms: string;
  declaredValue: number;
  declaredValueCurrency: string;
  incoterm: string;
  paymentDueDays: number;
  temperatureMin: number | null;
  temperatureMax: number | null;
  requiresAdr: boolean;
  requiresTailLift: boolean;
  tollRoadsIncluded: boolean;
  ferryIncluded: boolean;
  cmrRequired: boolean;
  palletExchangeRequired: boolean;
  customsRequired: boolean;
  insuranceRequired: boolean;
  certificationRequired: boolean;
  inspectionServicesRequired: boolean;
  isUrgent: boolean;
  contactName: string;
  contactPhone: string;
  contactMobile: string;
  contactFax: string;
  contactEmail: string;
  bookingReference: string;
  notes: string;
  customFields: { label: string; value: string }[];
  confidence: number;
  warnings: string[];
};

export type BulkLoadRow = {
  title: string;
  cargoType: string;
  goodsType: string;
  hsSearchTerms: string;
  hsCodes: HsCodeMatch[];
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
  local: 'https://freightbook.ai/endpoints/api',
  production: 'https://freightbook.ai/endpoints/api',
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

// Chat attachment files require the Bearer token (they're not publicly reachable), so a plain
// <a href> can't authenticate the request - fetch the bytes ourselves and hand the browser a blob:
// URL instead, either in a freshly-opened tab (inline types) or via a synthetic download click.
const fetchAttachmentBlob = async (path: string, name: string): Promise<Blob> => {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}/message-attachments/${path}?name=${encodeURIComponent(name)}`, {
    credentials: 'omit', headers,
  });
  if (!response.ok) throw new ApiError(`The file could not be loaded (${response.status}).`, response.status);
  return response.blob();
};

const openMessageAttachment = async (path: string, name: string, inline: boolean): Promise<void> => {
  if (!inline) {
    const blob = await fetchAttachmentBlob(path, name);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    return;
  }

  const popup = window.open('', '_blank');
  if (!popup) throw new ApiError('Allow pop-ups to open this file.', 0);
  popup.document.write('<!doctype html><title>Loading…</title><p style="font-family:sans-serif;padding:24px">Loading file…</p>');

  try {
    const blob = await fetchAttachmentBlob(path, name);
    popup.location.href = URL.createObjectURL(blob);
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
    google: async (accessToken: string, role?: string) => {
      const response = await request<SocialAuthResult>('/auth/google', { method: 'POST', body: JSON.stringify({ access_token: accessToken, role }) });
      if ('token' in response.data) setToken(response.data.token);
      return response.data;
    },
    apple: async (identityToken: string, fullName?: string, role?: string) => {
      const response = await request<SocialAuthResult>('/auth/apple', { method: 'POST', body: JSON.stringify({ identity_token: identityToken, full_name: fullName, role }) });
      if ('token' in response.data) setToken(response.data.token);
      return response.data;
    },
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
    trackingStatusCounts: async (params: ListParams = {}) => {
      const query = queryString(params);
      return request<Record<string, unknown>[]>(query ? `/loads/tracking-status-counts?${query}` : '/loads/tracking-status-counts');
    },
    publicList: () => request<Record<string, unknown>[]>('/public-loads'),
    updateStatus: (id: number | string, status: string) => request<Record<string, unknown>>(`/loads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
    book: (id: number | string, options?: { companyId?: number; driverUserId?: number }) => request<Record<string, unknown>>(`/loads/${id}/book`, {
      method: 'POST',
      body: JSON.stringify({ company_id: options?.companyId, driver_user_id: options?.driverUserId }),
    }),
    scan: (images: ScanImage[], current?: LoadScanResult, conversationId?: number) => request<LoadScanResult>('/load-scans', {
      method: 'POST',
      body: JSON.stringify({ images, current, conversation_id: conversationId }),
    }),
    scanBulk: (images: ScanImage[]) => request<BulkLoadScanResult>('/load-scans/bulk', {
      method: 'POST',
      body: JSON.stringify({ images }),
    }),
    scanText: (description: string, current?: LoadScanResult, conversationId?: number, pendingStep?: string | null) => request<LoadScanResult>('/load-scans/text', {
      method: 'POST',
      body: JSON.stringify({ description, current, conversation_id: conversationId, pending_step: pendingStep }),
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
  hsCodes: {
    search: (query: string, limit = 8) => request<HsCodeMatch[]>(`/hs-codes?${queryString({ query, limit })}`),
    bulk: (codes: string[]) => request<HsCodeMatch[]>('/hs-codes/bulk', { method: 'POST', body: JSON.stringify({ codes }) }),
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
  paymentInvoice: (paymentId: number | string) =>
    openDocument(`/payments/${paymentId}/invoice`),
  routes: resourceApi<Record<string, unknown>>('routes'),
  trackingEvents: resourceApi<Record<string, unknown>>('tracking-events'),
  conversations: resourceApi<Record<string, unknown>>('conversations'),
  messages: resourceApi<Record<string, unknown>>('messages'),
  loadDrafts: resourceApi<Record<string, unknown>>('load-drafts'),
  warehouses: resourceApi<Record<string, unknown>>('warehouses'),
  warehouse: {
    overview: () => request<Record<string, unknown>>('/warehouse/overview'),
  },
  aiCallLogs: {
    ...resourceApi<Record<string, unknown>>('ai-call-logs'),
    // Master-only: permanently deletes a conversation's ai_call_logs rows AND the conversation
    // itself. Separate from api.conversations.remove, which is a normal (soft) delete that never
    // touches the audit trail.
    purgeConversation: async (conversationId: number | string) =>
      (await request<null>(`/ai-call-logs/conversation/${conversationId}`, { method: 'DELETE' })).data,
  },
  messageAttachments: {
    upload: async (conversationId: number, file: File) => {
      const form = new FormData();
      form.append('conversation_id', String(conversationId));
      form.append('file', file);
      return request<{ path: string; name: string; type: string; size: number }>('/message-attachments', {
        method: 'POST',
        body: form,
      });
    },
    open: openMessageAttachment,
  },
  dispatchChat: {
    reply: async (conversationId: number, lang?: string) => (await request<Record<string, unknown>>('/dispatch-chat', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, lang }),
    })).data,
    answerStep: async (conversationId: number, step: string, value: string | null, displayText: string, skip: boolean, lang: string) =>
      (await request<Record<string, unknown>>('/lena-guided-answer', {
        method: 'POST',
        body: JSON.stringify({ conversation_id: conversationId, step, value, display_text: displayText, skip, lang }),
      })).data,
  },
  notes: resourceApi<Record<string, unknown>>('load-notes'),
  documents: resourceApi<Record<string, unknown>>('documents'),
  invoices: resourceApi<Record<string, unknown>>('invoices'),
  invoiceItems: resourceApi<Record<string, unknown>>('invoice-items'),
  emailTemplates: resourceApi<Record<string, unknown>>('email-templates'),
  emailCampaigns: resourceApi<Record<string, unknown>>('email-campaigns'),
  usage: {
    mine: () => request<Record<string, unknown>>('/my-usage'),
  },
  subscriptionPackages: {
    ...resourceApi<Record<string, unknown>>('subscription-packages'),
    publicList: () => request<Record<string, unknown>[]>('/public-subscription-packages'),
  },
  subscriptions: {
    mine: () => request<Record<string, unknown> | null>('/my-subscription'),
    select: (subscriptionPackageId: number) =>
      request<Record<string, unknown>>('/my-subscription', { method: 'POST', body: JSON.stringify({ subscription_package_id: subscriptionPackageId }) }),
    assign: (userId: number | string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/user-subscriptions/${userId}`, { method: 'POST', body: JSON.stringify(data) }),
    list: () => request<Record<string, unknown>[]>('/user-subscriptions'),
    remove: (id: number | string) => request<null>(`/user-subscriptions/${id}`, { method: 'DELETE' }),
  },
  payments: {
    list: () => request<Record<string, unknown>[]>('/payments'),
    checkout: (payload: { amount: number } | { subscription_package_id: number }) =>
      request<Record<string, unknown>>('/payments', { method: 'POST', body: JSON.stringify(payload) }),
  },
};
