/**
 * MapLibre Canvas — Public API
 * Barrel export for clean imports from other components.
 */

export { MapLibreCanvas } from './MapLibreCanvas';

// Types
export type {
  MapLibreFacility,
  MapLibreIssue,
  MapLibreCurrentLocation,
  MapLibreRoutePoint,
  MapLibreRoute,
  MapStyleCandidate,
  MapLibreCanvasProps,
} from './map-types';

// Utilities (for direct use by other components)
export { iconForType } from './map-utils';

// Styles (for DashboardMapBootstrap or direct style switching)
export { buildStyleCandidates } from './map-styles';
