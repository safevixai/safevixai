/**
 * MapLibreCanvas — Types & Interfaces
 * Shared types used across the map rendering system.
 */

export interface MapLibreFacility {
  id: string;
  name: string;
  coords: [number, number] | null;
  type: string;
  accentColor: string;
  distance?: string;
  address?: string;
  phone?: string;
  icon?: string;
}

export interface MapLibreIssue {
  id: string;
  label: string;
  coords: [number, number];
  accentColor: string;
  icon?: string;
  overline?: string;
  description?: string;
  status?: string;
  roadName?: string;
  severity?: number;
}

export interface MapLibreCurrentLocation {
  lat: number;
  lon: number;
  accuracy?: number;
  title?: string;
  subtitle?: string;
}

export interface MapLibreRoutePoint {
  lat: number;
  lon: number;
}

export interface MapLibreRoute {
  routeId?: string;
  label?: string;
  path: MapLibreRoutePoint[];
  distanceMeters: number;
  durationSeconds: number;
}

export type MapStyleCandidate = {
  kind: 'google-maps' | 'maptiler-vector' | 'openfreemap';
  label: string;
  style: unknown;
};

export type PolygonFeature = {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
};

export interface MapLibreCanvasProps {
  center: [number, number];
  zoom?: number;
  facilities?: MapLibreFacility[];
  issues?: MapLibreIssue[];
  currentLocation?: MapLibreCurrentLocation | null;
  route?: MapLibreRoute | null;
  alternativeRoutes?: MapLibreRoute[];
  selectedFacilityId?: string | null;
  viewportMode?: 'center' | 'fit';
  navigationPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}
