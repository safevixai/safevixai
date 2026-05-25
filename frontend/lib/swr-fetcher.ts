import useSWR, { SWRConfiguration, BareFetcher } from 'swr';
import { client } from './api';

type FetcherArgs = [url: string] | [url: string, params: Record<string, unknown>];

export const fetcher: BareFetcher<unknown, FetcherArgs> = (url: string, params?: Record<string, unknown>) =>
  client.get(url, { params }).then((r) => r.data);

export const fetcherNoCache: BareFetcher<unknown, FetcherArgs> = (url: string, params?: Record<string, unknown>) =>
  client.get(url, { params, headers: { 'Cache-Control': 'no-cache' } }).then((r) => r.data);

const BASE_CONFIG: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 30_000,
  errorRetryCount: 2,
};

export function useEmergencyServices(
  lat: number | null,
  lon: number | null,
  radius = 5000,
  categories?: string,
  limit = 20,
) {
  const key: FetcherArgs | null =
    lat != null && lon != null
      ? ['/api/v1/emergency/nearby', { lat, lon, radius, categories, limit }]
      : null;
  return useSWR(key, fetcher, {
    ...BASE_CONFIG,
    dedupingInterval: 60_000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });
}

export function useEmergencyNumbers() {
  return useSWR('/api/v1/emergency/numbers', fetcher, {
    ...BASE_CONFIG,
    dedupingInterval: 300_000,
  });
}

export function useFetchSos(lat: number | null, lon: number | null) {
  const key: FetcherArgs | null =
    lat != null && lon != null ? ['/api/v1/emergency/sos', { lat, lon }] : null;
  return useSWR(key, fetcher, { ...BASE_CONFIG, dedupingInterval: 120_000 });
}

export function useRoadwatchFeed(lat: number | null, lon: number | null, radius = 5000) {
  const key: FetcherArgs | null =
    lat != null && lon != null ? ['/api/v1/roadwatch/feed', { lat, lon, radius }] : null;
  return useSWR(key, fetcher, { ...BASE_CONFIG, dedupingInterval: 120_000 });
}

export function useChallanCalculation(vehicleClass: string | null, violationCode: string | null, state: string | null) {
  const key: FetcherArgs | null =
    vehicleClass && violationCode && state
      ? ['/api/v1/challan/calculate', { vehicle_class: vehicleClass, violation_code: violationCode, state }]
      : null;
  return useSWR(key, fetcher, { ...BASE_CONFIG, dedupingInterval: 300_000 });
}

export function useUserProfile(userId: string | null) {
  return useSWR(userId ? `/api/v1/user/${userId}` : null, fetcher, {
    ...BASE_CONFIG,
    dedupingInterval: 60_000,
  });
}

export { SWRConfig } from 'swr';
