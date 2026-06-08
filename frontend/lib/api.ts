import axios from 'axios';
import { toast } from 'sonner';
import { getAddressFromGPS } from './reverse-geocode';
import { PUBLIC_API_BASE_URL, PUBLIC_CHATBOT_BASE_URL } from './public-env';
import { useAppStore } from './store';
import { calculateOfflineChallan } from './duckdb-challan';

const BASE_URL = PUBLIC_API_BASE_URL;

// Chatbot service runs on a separate port/service
const CHATBOT_URL = PUBLIC_CHATBOT_BASE_URL;

// In-memory CSRF token (httponly cookie is not readable from JS)
let _csrfToken: string | null = null;

/** Fetch CSRF token from the dedicated endpoint (sets httponly cookie + returns token in body) */
export async function fetchCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/csrf-token`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    _csrfToken = data.csrf_token ?? null;
    return _csrfToken;
  } catch {
    return null;
  }
}

/** Override the in-memory CSRF token (e.g. after SSR hydration) */
export function setCsrfToken(token: string | null) {
  _csrfToken = token;
}

export const client = axios.create({
  baseURL: BASE_URL,
  timeout: 8_000,
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  if (_csrfToken) {
    config.headers['X-CSRF-Token'] = _csrfToken;
  }
  const token = useAppStore.getState().authToken;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  const preferredLang = useAppStore.getState().userProfile.preferredLanguage || 'en';
  config.headers['Accept-Language'] = preferredLang;
  return config;
});

function _addWarmingInterceptors(axiosInstance: ReturnType<typeof axios.create>) {
  axiosInstance.interceptors.request.use((config) => {
    const timer = setTimeout(() => {
      useAppStore.getState().setServerWarming(true);
    }, 5000);
    (config as any)._warmingTimer = timer;
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => {
      const timer = (response.config as any)._warmingTimer;
      if (timer) clearTimeout(timer);
      useAppStore.getState().setServerWarming(false);
      return response;
    },
    (error) => {
      const timer = error.config?._warmingTimer;
      if (timer) clearTimeout(timer);
      useAppStore.getState().setServerWarming(false);
      return Promise.reject(error);
    }
  );
}

_addWarmingInterceptors(client);

// S20/F9: Exponential-backoff retry interceptor (up to 3 retries, 1s/2s/4s delays).
// Retries on network errors and 5xx server errors; never retries 4xx (client fault).
function _withRetry(axiosInstance: ReturnType<typeof axios.create>, maxRetries = 3) {
  axiosInstance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const config = error.config as (typeof error.config) & { _retryCount?: number };
      if (!config) return Promise.reject(error);

      config._retryCount = (config._retryCount ?? 0);
      const isNetworkError = !error.response;
      const isServerError = error.response?.status >= 500;
      if (config._retryCount >= maxRetries || (!isNetworkError && !isServerError)) {
        return Promise.reject(error);
      }
      config._retryCount += 1;
      const delayMs = 1_000 * 2 ** (config._retryCount - 1); // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return axiosInstance(config);
    }
  );
}
_withRetry(client);

const chatbotClient = axios.create({
  baseURL: CHATBOT_URL,
  timeout: 15_000, // LLM responses can take longer
  withCredentials: true,
});

chatbotClient.interceptors.request.use((config) => {
  if (_csrfToken) {
    config.headers['X-CSRF-Token'] = _csrfToken;
  }
  const token = useAppStore.getState().authToken;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  const preferredLang = useAppStore.getState().userProfile.preferredLanguage || 'en';
  config.headers['Accept-Language'] = preferredLang;
  return config;
});
_withRetry(chatbotClient);
_addWarmingInterceptors(chatbotClient);

// ── Shared API error extraction ──
export interface ApiErrorDetail {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export function extractApiError(err: unknown): ApiErrorDetail {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data as Record<string, unknown> | undefined;
    const detail = typeof data?.detail === 'string'
      ? data.detail
      : Array.isArray(data?.detail)
        ? (data.detail as Array<{ msg?: string; loc?: string[] }>).map(d => d.msg).filter(Boolean).join('; ')
        : undefined;
    return {
      message: detail || err.message || 'Something went wrong',
      code: data?.error_code as string | undefined,
      status,
      details: data,
    };
  }
  if (err instanceof Error) return { message: err.message || 'An unexpected error occurred' };
  return { message: 'An unexpected error occurred' };
}

// ── Global response error interceptor: toast on 5xx / network errors ──
let _retryingToastId: string | number | null = null;

function _addGlobalErrorToastInterceptor(axiosInstance: ReturnType<typeof axios.create>) {
  axiosInstance.interceptors.response.use(
    (res) => res,
    (error) => {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const isNetworkError = !error.response;
        // Only toast for server or network errors (not 4xx which are user errors)
        if (isNetworkError) {
          toast.error('Network error — check your connection', { id: 'api-network-error', duration: 4000 });
        } else if (status && status >= 500) {
          const { message } = extractApiError(error);
          toast.error(message.length > 80 ? message.slice(0, 80) + '…' : message, { duration: 4000 });
        }
      }
      return Promise.reject(error);
    }
  );
}

_addGlobalErrorToastInterceptor(client);
_addGlobalErrorToastInterceptor(chatbotClient);

// ── Retrying indicator interceptor ──
let _retryCountGlobal = 0;

function _addRetryIndicatorInterceptor(axiosInstance: ReturnType<typeof axios.create>) {
  axiosInstance.interceptors.response.use(
    (res) => {
      if (_retryingToastId) { toast.dismiss(_retryingToastId); _retryingToastId = null; _retryCountGlobal = 0; }
      return res;
    },
    (error) => {
      const config = error.config as (typeof error.config) & { _retryCount?: number };
      if (config?._retryCount && config._retryCount > 0 && !_retryingToastId) {
        _retryingToastId = toast.info(`Retrying... (attempt ${config._retryCount}/3)`, {
          duration: 4000,
          id: 'retrying-indicator',
        });
      }
      return Promise.reject(error);
    }
  );
}

_addRetryIndicatorInterceptor(client);
_addRetryIndicatorInterceptor(chatbotClient);

export type EmergencyServiceCategory =
  | 'hospital'
  | 'police'
  | 'ambulance'
  | 'fire'
  | 'towing'
  | 'pharmacy'
  | 'puncture'
  | 'showroom';

export type RoadIssueStatus =
  | 'open'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

export type RouteProfile = 'driving-car' | 'cycling-regular' | 'foot-walking';

export interface EmergencyService {
  id: string;
  name: string;
  category: EmergencyServiceCategory | string;
  subCategory?: string | null;
  phone?: string | null;
  phoneEmergency?: string | null;
  lat: number;
  lon: number;
  distanceMeters: number;
  hasTrauma: boolean;
  hasIcu: boolean;
  is24Hr: boolean;
  address?: string | null;
  source: string;
}

export interface EmergencyResponse {
  services: EmergencyService[];
  count: number;
  radiusUsed: number;
  source: string;
}

export interface SosResponse extends EmergencyResponse {
  numbers: Record<
    string,
    {
      service: string;
      coverage: string;
      notes?: string | null;
    }
  >;
}

export interface NearbyServicesParams {
  lat: number;
  lon: number;
  radius?: number;
  categories?: EmergencyServiceCategory | EmergencyServiceCategory[] | string | string[];
  limit?: number;
  signal?: AbortSignal;
}

export interface EmergencyNumbersResponse {
  numbers: Record<
    string,
    {
      service: string;
      coverage: string;
      notes?: string | null;
    }
  >;
}

export interface GeocodeResult {
  displayName: string;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  countryCode?: string | null;
  postcode?: string | null;
  lat?: number | null;
  lon?: number | null;
}

export interface GeocodeSearchResponse {
  results: GeocodeResult[];
}

export interface ReverseGeocodeResponse extends GeocodeResult {}

export interface RoadIssue {
  uuid: string;
  issueType: string;
  severity: number;
  description?: string | null;
  lat: number;
  lon: number;
  locationAddress?: string | null;
  roadName?: string | null;
  roadType?: string | null;
  roadNumber?: string | null;
  authorityName?: string | null;
  status: RoadIssueStatus;
  createdAt: string;
  distanceMeters: number;
}

export interface RoadIssuesResponse {
  issues: RoadIssue[];
  count: number;
  radiusUsed: number;
}

export interface AuthorityPreviewResponse {
  roadType: string;
  roadTypeCode: string;
  roadName?: string | null;
  roadNumber?: string | null;
  authorityName: string;
  helpline: string;
  complaintPortal: string;
  escalationPath: string;
  execEngineer?: string | null;
  execEngineerPhone?: string | null;
  contractorName?: string | null;
  budgetSanctioned?: number | null;
  budgetSpent?: number | null;
  lastRelayedDate?: string | null;
  nextMaintenance?: string | null;
  dataSourceUrl?: string | null;
  source: string;
}

export interface RoadInfrastructureResponse {
  roadType: string;
  roadTypeCode: string;
  roadName?: string | null;
  roadNumber?: string | null;
  contractorName?: string | null;
  execEngineer?: string | null;
  execEngineerPhone?: string | null;
  budgetSanctioned?: number | null;
  budgetSpent?: number | null;
  lastRelayedDate?: string | null;
  nextMaintenance?: string | null;
  dataSourceUrl?: string | null;
  source: string;
}

export interface ReportPayload {
  lat: number;
  lon: number;
  severity: number;
  description?: string;
  type?: string;
  issue_type?: string;
  photo?: File | Blob | null;
  citizen_phone?: string;
}

export interface RoadReportResponse {
  uuid: string;
  complaintRef?: string | null;
  authorityName: string;
  authorityPhone: string;
  complaintPortal: string;
  roadType: string;
  roadTypeCode: string;
  roadNumber?: string | null;
  roadName?: string | null;
  execEngineer?: string | null;
  execEngineerPhone?: string | null;
  contractorName?: string | null;
  lastRelayedDate?: string | null;
  nextMaintenance?: string | null;
  budgetSanctioned?: number | null;
  budgetSpent?: number | null;
  photoUrl?: string | null;
  status: RoadIssueStatus;

  // Enterprise extensions
  category?: string | null;
  subCategory?: string | null;
  wardId?: string | null;
  wardName?: string | null;
  slaDeadline?: string | null;
  duplicateOfUuid?: string | null;
}

export interface RoutePoint {
  lat: number;
  lon: number;
  label?: string | null;
}

export interface RouteBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface RouteInstruction {
  index: number;
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  streetName?: string | null;
  instructionType?: number | null;
  exitNumber?: number | null;
}

export interface RouteOption {
  routeId: string;
  label: string;
  distanceMeters: number;
  durationSeconds: number;
  path: RoutePoint[];
  bounds: RouteBounds;
  steps: RouteInstruction[];
}

export interface RoutePreviewResponse {
  provider: string;
  profile: RouteProfile | string;
  distanceMeters: number;
  durationSeconds: number;
  path: RoutePoint[];
  bounds: RouteBounds;
  origin: RoutePoint;
  destination: RoutePoint;
  steps: RouteInstruction[];
  routes: RouteOption[];
  selectedRouteId: string;
  rerouteThresholdMeters: number;
  warnings: string[];
}

function csvParam(value?: string | string[]) {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value.join(',') : value;
}

function normalizeEmergencyService(item: {
  id: string;
  name: string;
  category: string;
  sub_category?: string | null;
  phone?: string | null;
  phone_emergency?: string | null;
  lat: number;
  lon: number;
  distance_meters: number;
  has_trauma?: boolean;
  has_icu?: boolean;
  is_24hr?: boolean;
  address?: string | null;
  source?: string;
}): EmergencyService {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    subCategory: item.sub_category ?? null,
    phone: item.phone ?? null,
    phoneEmergency: item.phone_emergency ?? null,
    lat: item.lat,
    lon: item.lon,
    distanceMeters: item.distance_meters,
    hasTrauma: Boolean(item.has_trauma),
    hasIcu: Boolean(item.has_icu),
    is24Hr: item.is_24hr ?? true,
    address: item.address ?? null,
    source: item.source ?? 'api',
  };
}

function normalizeEmergencyResponse(data: {
  services?: Array<Parameters<typeof normalizeEmergencyService>[0]>;
  count?: number;
  radius_used?: number;
  source?: string;
}): EmergencyResponse {
  const services = (data.services ?? []).map(normalizeEmergencyService);

  return {
    services,
    count: data.count ?? services.length,
    radiusUsed: data.radius_used ?? 0,
    source: data.source ?? 'api',
  };
}

function normalizeGeocodeResult(result: {
  display_name: string;
  city?: string | null;
  state?: string | null;
  state_code?: string | null;
  country_code?: string | null;
  postcode?: string | null;
  lat?: number | null;
  lon?: number | null;
}): GeocodeResult {
  return {
    displayName: result.display_name,
    city: result.city ?? null,
    state: result.state ?? null,
    stateCode: result.state_code ?? null,
    countryCode: result.country_code ?? null,
    postcode: result.postcode ?? null,
    lat: result.lat ?? null,
    lon: result.lon ?? null,
  };
}

function normalizeRoadIssue(issue: {
  uuid: string;
  issue_type: string;
  severity: number;
  description?: string | null;
  lat: number;
  lon: number;
  location_address?: string | null;
  road_name?: string | null;
  road_type?: string | null;
  road_number?: string | null;
  authority_name?: string | null;
  status: RoadIssueStatus;
  created_at: string;
  distance_meters: number;
}): RoadIssue {
  return {
    uuid: issue.uuid,
    issueType: issue.issue_type,
    severity: issue.severity,
    description: issue.description ?? null,
    lat: issue.lat,
    lon: issue.lon,
    locationAddress: issue.location_address ?? null,
    roadName: issue.road_name ?? null,
    roadType: issue.road_type ?? null,
    roadNumber: issue.road_number ?? null,
    authorityName: issue.authority_name ?? null,
    status: issue.status,
    createdAt: issue.created_at,
    distanceMeters: issue.distance_meters,
  };
}

function normalizeAuthorityPreview(data: {
  road_type: string;
  road_type_code: string;
  road_name?: string | null;
  road_number?: string | null;
  authority_name: string;
  helpline: string;
  complaint_portal: string;
  escalation_path: string;
  exec_engineer?: string | null;
  exec_engineer_phone?: string | null;
  contractor_name?: string | null;
  budget_sanctioned?: number | null;
  budget_spent?: number | null;
  last_relayed_date?: string | null;
  next_maintenance?: string | null;
  data_source_url?: string | null;
  source: string;
}): AuthorityPreviewResponse {
  return {
    roadType: data.road_type,
    roadTypeCode: data.road_type_code,
    roadName: data.road_name ?? null,
    roadNumber: data.road_number ?? null,
    authorityName: data.authority_name,
    helpline: data.helpline,
    complaintPortal: data.complaint_portal,
    escalationPath: data.escalation_path,
    execEngineer: data.exec_engineer ?? null,
    execEngineerPhone: data.exec_engineer_phone ?? null,
    contractorName: data.contractor_name ?? null,
    budgetSanctioned: data.budget_sanctioned ?? null,
    budgetSpent: data.budget_spent ?? null,
    lastRelayedDate: data.last_relayed_date ?? null,
    nextMaintenance: data.next_maintenance ?? null,
    dataSourceUrl: data.data_source_url ?? null,
    source: data.source,
  };
}

function normalizeInfrastructure(data: {
  road_type: string;
  road_type_code: string;
  road_name?: string | null;
  road_number?: string | null;
  contractor_name?: string | null;
  exec_engineer?: string | null;
  exec_engineer_phone?: string | null;
  budget_sanctioned?: number | null;
  budget_spent?: number | null;
  last_relayed_date?: string | null;
  next_maintenance?: string | null;
  data_source_url?: string | null;
  source: string;
}): RoadInfrastructureResponse {
  return {
    roadType: data.road_type,
    roadTypeCode: data.road_type_code,
    roadName: data.road_name ?? null,
    roadNumber: data.road_number ?? null,
    contractorName: data.contractor_name ?? null,
    execEngineer: data.exec_engineer ?? null,
    execEngineerPhone: data.exec_engineer_phone ?? null,
    budgetSanctioned: data.budget_sanctioned ?? null,
    budgetSpent: data.budget_spent ?? null,
    lastRelayedDate: data.last_relayed_date ?? null,
    nextMaintenance: data.next_maintenance ?? null,
    dataSourceUrl: data.data_source_url ?? null,
    source: data.source,
  };
}

function normalizeRoadReport(data: {
  uuid: string;
  complaint_ref?: string | null;
  authority_name: string;
  authority_phone: string;
  complaint_portal: string;
  road_type: string;
  road_type_code: string;
  road_number?: string | null;
  road_name?: string | null;
  exec_engineer?: string | null;
  exec_engineer_phone?: string | null;
  contractor_name?: string | null;
  last_relayed_date?: string | null;
  next_maintenance?: string | null;
  budget_sanctioned?: number | null;
  budget_spent?: number | null;
  photo_url?: string | null;
  status: RoadIssueStatus;

  category?: string | null;
  sub_category?: string | null;
  ward_id?: string | null;
  ward_name?: string | null;
  sla_deadline?: string | null;
  duplicate_of_uuid?: string | null;
}): RoadReportResponse {
  return {
    uuid: data.uuid,
    complaintRef: data.complaint_ref ?? null,
    authorityName: data.authority_name,
    authorityPhone: data.authority_phone,
    complaintPortal: data.complaint_portal,
    roadType: data.road_type,
    roadTypeCode: data.road_type_code,
    roadNumber: data.road_number ?? null,
    roadName: data.road_name ?? null,
    execEngineer: data.exec_engineer ?? null,
    execEngineerPhone: data.exec_engineer_phone ?? null,
    contractorName: data.contractor_name ?? null,
    lastRelayedDate: data.last_relayed_date ?? null,
    nextMaintenance: data.next_maintenance ?? null,
    budgetSanctioned: data.budget_sanctioned ?? null,
    budgetSpent: data.budget_spent ?? null,
    photoUrl: data.photo_url ?? null,
    status: data.status,

    category: data.category ?? null,
    subCategory: data.sub_category ?? null,
    wardId: data.ward_id ?? null,
    wardName: data.ward_name ?? null,
    slaDeadline: data.sla_deadline ?? null,
    duplicateOfUuid: data.duplicate_of_uuid ?? null,
  };
}

function normalizeRoutePoint(point: {
  lat: number;
  lon: number;
  label?: string | null;
}): RoutePoint {
  return {
    lat: point.lat,
    lon: point.lon,
    label: point.label ?? null,
  };
}

function normalizeRouteInstruction(step: {
  index: number;
  instruction: string;
  distance_meters: number;
  duration_seconds: number;
  street_name?: string | null;
  instruction_type?: number | null;
  exit_number?: number | null;
}): RouteInstruction {
  return {
    index: step.index,
    instruction: step.instruction,
    distanceMeters: step.distance_meters,
    durationSeconds: step.duration_seconds,
    streetName: step.street_name ?? null,
    instructionType: step.instruction_type ?? null,
    exitNumber: step.exit_number ?? null,
  };
}

function normalizeRouteOption(route: {
  route_id: string;
  label: string;
  distance_meters: number;
  duration_seconds: number;
  path: Array<{ lat: number; lon: number; label?: string | null }>;
  bounds: RouteBounds;
  steps?: Array<{
    index: number;
    instruction: string;
    distance_meters: number;
    duration_seconds: number;
    street_name?: string | null;
    instruction_type?: number | null;
    exit_number?: number | null;
  }>;
}): RouteOption {
  return {
    routeId: route.route_id,
    label: route.label,
    distanceMeters: route.distance_meters,
    durationSeconds: route.duration_seconds,
    path: (route.path ?? []).map(normalizeRoutePoint),
    bounds: route.bounds,
    steps: (route.steps ?? []).map(normalizeRouteInstruction),
  };
}

function normalizeRoutePreview(data: {
  provider: string;
  profile: RouteProfile | string;
  distance_meters: number;
  duration_seconds: number;
  path: Array<{ lat: number; lon: number; label?: string | null }>;
  bounds: RouteBounds;
  origin: { lat: number; lon: number; label?: string | null };
  destination: { lat: number; lon: number; label?: string | null };
  steps?: Array<{
    index: number;
    instruction: string;
    distance_meters: number;
    duration_seconds: number;
    street_name?: string | null;
    instruction_type?: number | null;
    exit_number?: number | null;
  }>;
  routes?: Array<{
    route_id: string;
    label: string;
    distance_meters: number;
    duration_seconds: number;
    path: Array<{ lat: number; lon: number; label?: string | null }>;
    bounds: RouteBounds;
    steps?: Array<{
      index: number;
      instruction: string;
      distance_meters: number;
      duration_seconds: number;
      street_name?: string | null;
      instruction_type?: number | null;
      exit_number?: number | null;
    }>;
  }>;
  selected_route_id?: string;
  reroute_threshold_meters?: number;
  warnings?: string[];
}): RoutePreviewResponse {
  const routes = (data.routes ?? []).map(normalizeRouteOption);
  return {
    provider: data.provider,
    profile: data.profile,
    distanceMeters: data.distance_meters,
    durationSeconds: data.duration_seconds,
    path: (data.path ?? []).map(normalizeRoutePoint),
    bounds: data.bounds,
    origin: normalizeRoutePoint(data.origin),
    destination: normalizeRoutePoint(data.destination),
    steps: (data.steps ?? []).map(normalizeRouteInstruction),
    routes,
    selectedRouteId: data.selected_route_id ?? routes[0]?.routeId ?? 'route-1',
    rerouteThresholdMeters: data.reroute_threshold_meters ?? 75,
    warnings: data.warnings ?? [],
  };
}

// Emergency
export async function fetchNearbyServices(params: NearbyServicesParams): Promise<EmergencyResponse> {
  const { data } = await client.get('/api/v1/emergency/nearby', {
    params: {
      lat: params.lat,
      lon: params.lon,
      radius: params.radius,
      categories: csvParam(params.categories),
      limit: params.limit,
    },
    signal: params.signal,
  });

  return normalizeEmergencyResponse(data);
}

export async function fetchSosPayload(params: {
  lat: number;
  lon: number;
}): Promise<SosResponse> {
  const { data } = await client.get('/api/v1/emergency/sos', { params });
  return {
    ...normalizeEmergencyResponse(data),
    numbers: data.numbers ?? {},
  };
}

export async function triggerSos(params: {
  lat: number;
  lon: number;
}): Promise<SosResponse> {
  const { data } = await client.post('/api/v1/emergency/sos', null, { params });
  return {
    ...normalizeEmergencyResponse(data),
    numbers: data.numbers ?? {},
  };
}

export async function fetchEmergencyNumbers(): Promise<EmergencyNumbersResponse> {
  const { data } = await client.get('/api/v1/emergency/numbers');
  return data;
}

// Geocode
export async function reverseGeocode(params: {
  lat: number;
  lon: number;
}): Promise<ReverseGeocodeResponse> {
  // Use BigDataCloud purely on the frontend to avoid backend load
  const result = await getAddressFromGPS(params.lat, params.lon);
  if (!result) {
    return { displayName: 'Unknown Location', lat: params.lat, lon: params.lon };
  }
  return {
    displayName: result.displayAddress,
    city: result.city,
    state: result.state,
    lat: params.lat,
    lon: params.lon,
  };
}

export async function searchGeocode(q: string): Promise<GeocodeSearchResponse> {
  const { data } = await client.get('/api/v1/geocode/search', { params: { q } });
  return {
    results: (data.results ?? []).map(normalizeGeocodeResult),
  };
}

// RoadWatch
export async function fetchRoadIssues(params: {
  lat: number;
  lon: number;
  radius?: number;
  limit?: number;
  statuses?: RoadIssueStatus | RoadIssueStatus[] | string | string[];
  signal?: AbortSignal;
}): Promise<RoadIssuesResponse> {
  const { data } = await client.get('/api/v1/roads/issues', {
    params: {
      lat: params.lat,
      lon: params.lon,
      radius: params.radius,
      limit: params.limit,
      statuses: csvParam(params.statuses),
    },
    signal: params.signal,
  });

  const issues = (data.issues ?? []).map(normalizeRoadIssue);

  return {
    issues,
    count: data.count ?? issues.length,
    radiusUsed: data.radius_used ?? 0,
  };
}

export async function fetchAuthorityPreview(params: {
  lat: number;
  lon: number;
}): Promise<AuthorityPreviewResponse> {
  const { data } = await client.get('/api/v1/roads/authority', { params });
  return normalizeAuthorityPreview(data);
}

export async function fetchRoadInfrastructure(params: {
  lat: number;
  lon: number;
}): Promise<RoadInfrastructureResponse> {
  const { data } = await client.get('/api/v1/roads/infrastructure', { params });
  return normalizeInfrastructure(data);
}

export async function submitReport(payload: ReportPayload): Promise<RoadReportResponse> {
  const issueType = payload.issue_type ?? payload.type;
  if (!issueType) {
    throw new Error('submitReport requires either "issue_type" or "type".');
  }

  const formData = new FormData();
  formData.append('lat', String(payload.lat));
  formData.append('lon', String(payload.lon));
  formData.append('issue_type', issueType);
  formData.append('severity', String(payload.severity));

  if (payload.description?.trim()) {
    formData.append('description', payload.description.trim());
  }

  if (payload.photo) {
    formData.append('photo', payload.photo);
  }

  if (payload.citizen_phone) {
    formData.append('citizen_phone', payload.citizen_phone);
  }

  const { data } = await client.post('/api/v1/roads/report', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return normalizeRoadReport(data);
}

// Routing
export async function fetchRoutePreview(params: {
  originLat: number;
  originLon: number;
  destinationLat: number;
  destinationLon: number;
  profile?: RouteProfile;
  alternatives?: number;
}): Promise<RoutePreviewResponse> {
  const { data } = await client.get('/api/v1/routing/preview', {
    params: {
      origin_lat: params.originLat,
      origin_lon: params.originLon,
      destination_lat: params.destinationLat,
      destination_lon: params.destinationLon,
      profile: params.profile ?? 'driving-car',
      alternatives: params.alternatives ?? 2,
    },
  });

  return normalizeRoutePreview(data);
}

// Chat
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  lat?: number;
  lon?: number;
}

export interface ChatResponse {
  response: string;
  intent?: string;
  sources?: string[];
  session_id: string;
}

export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  const { data } = await chatbotClient.post('/api/v1/chat/', req);
  return data;
}

// Challan
export interface ChallanQuery {
  violation_code: string;
  vehicle_class: string;
  state_code: string;
  is_repeat: boolean;
}

export interface ChallanResult {
  violation_code: string;
  vehicle_class: string;
  state_code: string;
  base_fine: number;
  repeat_fine: number | null;
  amount_due: number;
  section: string;
  description: string;
  state_override?: string;
  source?: string;
}

export async function calculateChallan(query: ChallanQuery): Promise<ChallanResult> {
  try {
    const { data } = await client.post('/api/v1/challan/calculate', query);
    return { ...data, source: data.source || 'online' };
  } catch (error) {
    console.warn('SafeVixAI: API challan calculation failed, falling back to local offline DB:', error);
    try {
      const offlineResult = await calculateOfflineChallan(
        query.violation_code,
        query.vehicle_class,
        query.is_repeat,
        query.state_code
      );
      return {
        violation_code: query.violation_code,
        vehicle_class: query.vehicle_class,
        state_code: query.state_code,
        base_fine: offlineResult.base_fine,
        repeat_fine: offlineResult.repeat_fine,
        amount_due: query.is_repeat && offlineResult.repeat_fine ? offlineResult.repeat_fine : offlineResult.base_fine,
        section: offlineResult.section,
        description: offlineResult.description,
        source: 'offline',
      };
    } catch (fallbackError) {
      console.error('SafeVixAI: Offline challan fallback also failed:', fallbackError);
      throw error;
    }
  }
}

// ─── Civic Intelligence – Municipality Guide ────────────────────────────

export interface Municipality {
  slug: string;
  name: string;
  shortName: string;
  city: string;
  stateCode: string;
  municipalityType: string;
  wardCount: number | null;
  population: number | null;
  helplinePhone: string | null;
  centroidLat: number;
  centroidLon: number;
  distanceKm?: number | null;
}

export interface MunicipalityDetail extends Municipality {
  headquartersAddress: string | null;
  email: string | null;
  websiteUrl: string | null;
  whatsappNumber: string | null;
  appName: string | null;
  appUrl: string | null;
  grievancePortalUrl: string | null;
  mayorName: string | null;
  mayorPhotoUrl: string | null;
  commissionerName: string | null;
  commissionerPhone: string | null;
  areaSqkm: number | null;
  description: string | null;
  servicesOffered: string[] | null;
}

export interface MunicipalitiesResponse {
  municipalities: Municipality[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RawMunicipality {
  slug?: string;
  name?: string;
  short_name?: string;
  shortName?: string;
  city?: string;
  state_code?: string;
  stateCode?: string;
  municipality_type?: string;
  municipalityType?: string;
  ward_count?: number | null;
  wardCount?: number | null;
  population?: number | null;
  helpline_phone?: string | null;
  helplinePhone?: string | null;
  centroid_lat?: number;
  centroidLat?: number;
  centroid_lon?: number;
  centroidLon?: number;
  distance_km?: number | null;
  distanceKm?: number | null;
  headquarters_address?: string | null;
  email?: string | null;
  website_url?: string | null;
  whatsapp_number?: string | null;
  app_name?: string | null;
  app_url?: string | null;
  grievance_portal_url?: string | null;
  mayor_name?: string | null;
  mayor_photo_url?: string | null;
  commissioner_name?: string | null;
  commissioner_phone?: string | null;
  area_sqkm?: number | null;
  description?: string | null;
  services_offered?: string[] | null;
}

function normalizeMunicipality(d: RawMunicipality): Municipality {
  return {
    slug: d.slug ?? '',
    name: d.name ?? '',
    shortName: d.short_name ?? d.shortName ?? '',
    city: d.city ?? '',
    stateCode: d.state_code ?? d.stateCode ?? '',
    municipalityType: d.municipality_type ?? d.municipalityType ?? '',
    wardCount: d.ward_count ?? d.wardCount ?? null,
    population: d.population ?? null,
    helplinePhone: d.helpline_phone ?? d.helplinePhone ?? null,
    centroidLat: d.centroid_lat ?? d.centroidLat ?? 0,
    centroidLon: d.centroid_lon ?? d.centroidLon ?? 0,
    distanceKm: d.distance_km ?? d.distanceKm ?? null,
  };
}

function normalizeMunicipalityDetail(d: RawMunicipality): MunicipalityDetail {
  return {
    ...normalizeMunicipality(d),
    headquartersAddress: d.headquarters_address ?? null,
    email: d.email ?? null,
    websiteUrl: d.website_url ?? null,
    whatsappNumber: d.whatsapp_number ?? null,
    appName: d.app_name ?? null,
    appUrl: d.app_url ?? null,
    grievancePortalUrl: d.grievance_portal_url ?? null,
    mayorName: d.mayor_name ?? null,
    mayorPhotoUrl: d.mayor_photo_url ?? null,
    commissionerName: d.commissioner_name ?? null,
    commissionerPhone: d.commissioner_phone ?? null,
    areaSqkm: d.area_sqkm ?? null,
    description: d.description ?? null,
    servicesOffered: d.services_offered ?? null,
  };
}

export async function fetchMunicipalities(params?: {
  q?: string;
  stateCode?: string;
  municipalityType?: string;
  page?: number;
  pageSize?: number;
}): Promise<MunicipalitiesResponse> {
  const { data } = await client.get('/api/v1/civic/municipalities', {
    params: {
      q: params?.q,
      state_code: params?.stateCode,
      municipality_type: params?.municipalityType,
      page: params?.page ?? 1,
      page_size: params?.pageSize ?? 50,
    },
  });
  return {
    municipalities: (data.municipalities ?? data.items ?? []).map(normalizeMunicipality),
    total: data.total ?? 0,
    page: data.page ?? 1,
    pageSize: data.page_size ?? 50,
  };
}

export async function fetchMunicipalityBySlug(slug: string): Promise<MunicipalityDetail> {
  const { data } = await client.get(`/api/v1/civic/municipalities/${slug}`);
  return normalizeMunicipalityDetail(data);
}

export async function fetchNearbyMunicipalities(
  lat: number,
  lon: number,
  limit?: number,
): Promise<Municipality[]> {
  const { data } = await client.get('/api/v1/civic/municipalities/nearby', {
    params: { lat, lon, limit: limit ?? 10 },
  });
  return (data.municipalities ?? data ?? []).map(normalizeMunicipality);
}

// ─── Enterprise Civic Intelligence Workflow Systems ───────────────────

export async function authorityAcceptComplaint(uuid: string): Promise<Record<string, unknown>> {
  const { data } = await client.post(`/api/v1/authority/complaints/${uuid}/accept`);
  return data;
}

export async function authorityRejectComplaint(uuid: string, reason: string): Promise<Record<string, unknown>> {
  const { data } = await client.post(`/api/v1/authority/complaints/${uuid}/reject`, { reason });
  return data;
}

export async function citizenConfirmResolution(ref: string, rating?: number, notes?: string): Promise<Record<string, unknown>> {
  const { data } = await client.post(`/api/v1/citizen/complaints/${ref}/confirm`, { rating, notes });
  return data;
}

export async function citizenRejectResolution(ref: string, reason: string): Promise<Record<string, unknown>> {
  const { data } = await client.post(`/api/v1/citizen/complaints/${ref}/reject`, { reason });
  return data;
}

export async function fetchPublicWardRankings(): Promise<Record<string, unknown>[]> {
  const { data } = await client.get('/api/v1/public/ward-rankings');
  return data;
}

export async function fetchPublicStats(): Promise<Record<string, unknown>> {
  const { data } = await client.get('/api/v1/public/stats');
  return data;
}

export async function fieldStartWork(uuid: string, lat: number, lon: number): Promise<Record<string, unknown>> {
  const { data } = await client.post(`/api/v1/field/complaints/${uuid}/start-work`, { lat, lon });
  return data;
}

export async function fieldUploadEvidence(uuid: string, formData: FormData): Promise<Record<string, unknown>> {
  const { data } = await client.post(`/api/v1/field/complaints/${uuid}/upload-evidence`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function fieldCompleteWork(
  uuid: string,
  afterPhotoUrl: string | null,
  notes: string | null,
  lat: number,
  lon: number
): Promise<Record<string, unknown>> {
  const { data } = await client.post(`/api/v1/field/complaints/${uuid}/complete`, {
    after_photo_url: afterPhotoUrl,
    notes,
    lat,
    lon
  });
  return data;
}


// ─── Enterprise Garage, Prediction & Dispute Assistant ───────────────

export interface VehicleGarageItem {
  id: string;
  vehicle_number: string;
  owner_name: string;
  vehicle_make: string;
  vehicle_model: string;
  rc_status: string;
  insurance_expiry?: string | null;
  puc_expiry?: string | null;
  created_at: string;
}

export interface GarageSyncResponse {
  vehicles: VehicleGarageItem[];
  sync_status: string;
  last_synced_at: string;
}

export interface FinePredictionRequest {
  vehicle_number: string;
  state_code: string;
  telemetry: {
    speeding_events: number;
    harsh_braking_events: number;
    night_driving_minutes: number;
    total_km_driven: number;
  };
}

export interface FinePredictionResponse {
  predicted_violations_count: number;
  estimated_annual_liability: number;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface DisputeDraftRequest {
  challan_ref: string;
  violation_code: string;
  fine_amount: number;
  mitigating_factors: string;
}

export interface DisputeDraftResponse {
  dispute_ref: string;
  appeal_letter: string;
  cited_mva_sections: string[];
  confidence_score: number;
  instructions: string[];
}

export async function syncGarage(vehicleNumber?: string): Promise<GarageSyncResponse> {
  const { data } = await client.post('/api/v1/garage/sync', null, {
    params: vehicleNumber ? { vehicle_number: vehicleNumber } : undefined,
  });
  return data;
}

export async function predictFineLiability(req: FinePredictionRequest): Promise<FinePredictionResponse> {
  const { data } = await client.post('/api/v1/challan/predict', req);
  return data;
}

export async function draftDisputeAppeal(req: DisputeDraftRequest): Promise<DisputeDraftResponse> {
  const { data } = await client.post('/api/v1/challan/dispute', req);
  return data;
}
