/**
 * Locator — Shared Types, Utilities & Constants
 * Extracted from locator/page.tsx for clean modular architecture.
 */

import { NearbyService } from '@/lib/store';

export const FILTER_CHIPS = ['All', 'Hospital', 'Police', 'Fire', 'Mechanic', 'Towing'] as const;
export type Filter = typeof FILTER_CHIPS[number];

export type ServiceCardType =
  | 'Hospital'
  | 'Ambulance'
  | 'Pharmacy'
  | 'Police'
  | 'Fire'
  | 'Mechanic'
  | 'Towing';

export interface LocatorService {
  id: string;
  name: string;
  type: ServiceCardType;
  filterType: Exclude<Filter, 'All'>;
  distance: string;
  address: string;
  accentColor: string;
  coords: [number, number];
  phone?: string;
  category: NearbyService['category'];
}

export function formatDistance(distance: number) {
  return distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`;
}

export function formatCoverageRadius(distance: number) {
  return distance >= 1000 ? `${Math.round(distance / 1000)} km` : `${Math.round(distance)} m`;
}

export function buildNavigationHref(origin: [number, number], destination: [number, number]) {
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin[0]},${origin[1]}`,
    destination: `${destination[0]},${destination[1]}`,
    travelmode: 'driving',
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function formatDuration(seconds: number) {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

export function haversineMeters(from: [number, number], to: [number, number]) {
  const earthRadiusMeters = 6_371_000;
  const [fromLat, fromLon] = from;
  const [toLat, toLon] = to;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLon = ((toLon - fromLon) * Math.PI) / 180;
  const fromLatRad = (fromLat * Math.PI) / 180;
  const toLatRad = (toLat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(fromLatRad) * Math.cos(toLatRad) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(a)));
}

import { RouteOption } from '@/lib/api';

export function minimumRouteDeviationMeters(route: RouteOption, location: [number, number]) {
  if (!route.path.length) return Number.POSITIVE_INFINITY;
  return Math.min(
    ...route.path.map((point) => haversineMeters(location, [point.lat, point.lon]))
  );
}

export function mapService(service: NearbyService): LocatorService {
  switch (service.category) {
    case 'hospital':
      return { id: service.id, name: service.name, type: 'Hospital', filterType: 'Hospital', distance: formatDistance(service.distance), address: service.address ?? 'Address unavailable', accentColor: '#ef4444', coords: [service.lat, service.lon], phone: service.phone, category: service.category };
    case 'ambulance':
      return { id: service.id, name: service.name, type: 'Ambulance', filterType: 'Hospital', distance: formatDistance(service.distance), address: service.address ?? 'Address unavailable', accentColor: '#10b981', coords: [service.lat, service.lon], phone: service.phone, category: service.category };
    case 'pharmacy':
      return { id: service.id, name: service.name, type: 'Pharmacy', filterType: 'Hospital', distance: formatDistance(service.distance), address: service.address ?? 'Address unavailable', accentColor: '#06b6d4', coords: [service.lat, service.lon], phone: service.phone, category: service.category };
    case 'police':
      return { id: service.id, name: service.name, type: 'Police', filterType: 'Police', distance: formatDistance(service.distance), address: service.address ?? 'Address unavailable', accentColor: '#3b82f6', coords: [service.lat, service.lon], phone: service.phone, category: service.category };
    case 'fire':
      return { id: service.id, name: service.name, type: 'Fire', filterType: 'Fire', distance: formatDistance(service.distance), address: service.address ?? 'Address unavailable', accentColor: '#f97316', coords: [service.lat, service.lon], phone: service.phone, category: service.category };
    case 'towing':
      return { id: service.id, name: service.name, type: 'Towing', filterType: 'Towing', distance: formatDistance(service.distance), address: service.address ?? 'Address unavailable', accentColor: '#f59e0b', coords: [service.lat, service.lon], phone: service.phone, category: service.category };
    case 'puncture':
    case 'showroom':
    default:
      return { id: service.id, name: service.name, type: 'Mechanic', filterType: 'Mechanic', distance: formatDistance(service.distance), address: service.address ?? 'Address unavailable', accentColor: '#8b5cf6', coords: [service.lat, service.lon], phone: service.phone, category: service.category };
  }
}

export function fallbackNumber(type: Exclude<Filter, 'All'>) {
  switch (type) {
    case 'Hospital': return '108';
    case 'Police': return '100';
    case 'Fire': return '101';
    case 'Mechanic':
    case 'Towing':
    default: return '1033';
  }
}
