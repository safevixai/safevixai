/**
 * MapLibreCanvas — Geometry & DOM Helpers
 * Pure utility functions for building GeoJSON, markers, popups, accuracy circles.
 */

import type { MapLibreFacility, PolygonFeature } from './map-types';

// ═══════════════════════════════════════════
// LAYER ID CONSTANTS
// ═══════════════════════════════════════════

export const ACCURACY_SOURCE_ID = 'svai-current-location-accuracy';
export const ACCURACY_FILL_LAYER_ID = 'svai-current-location-accuracy-fill';
export const ACCURACY_LINE_LAYER_ID = 'svai-current-location-accuracy-line';
export const ROUTE_SOURCE_ID = 'svai-active-route';
export const ROUTE_ALT_CASING_LAYER_ID = 'svai-alt-route-casing';
export const ROUTE_ALT_LINE_LAYER_ID = 'svai-alt-route-line';
export const ROUTE_CASING_LAYER_ID = 'svai-active-route-casing';
export const ROUTE_LINE_LAYER_ID = 'svai-active-route-line';
export const FACILITY_SOURCE_ID = 'svai-facilities';
export const FACILITY_CLUSTER_LAYER_ID = 'svai-facility-clusters';
export const FACILITY_CLUSTER_COUNT_LAYER_ID = 'svai-facility-cluster-count';
export const FACILITY_UNCLUSTERED_LAYER_ID = 'svai-facility-points';
export const FACILITY_SELECTED_LAYER_ID = 'svai-facility-selected';
export const HEATMAP_SOURCE_ID = 'svai-heatmap-source';
export const HEATMAP_LAYER_ID = 'svai-heatmap-layer';

// ═══════════════════════════════════════════
// ICON RESOLVER
// ═══════════════════════════════════════════

export function iconForType(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes('hospital')) return '🏥';
  if (normalized.includes('ambulance')) return '🚑';
  if (normalized.includes('pharmacy')) return '💊';
  if (normalized.includes('police')) return '👮';
  if (normalized.includes('fire')) return '🚒';
  if (normalized.includes('tow')) return '🪝';
  if (normalized.includes('mechanic')) return '🔧';
  return '📍';
}

// ═══════════════════════════════════════════
// GEOJSON BUILDERS
// ═══════════════════════════════════════════

export function buildFacilityCollection(
  facilities: MapLibreFacility[],
  selectedFacilityId: string | null
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: facilities
      .filter((facility) => facility.coords && facility.coords.length >= 2)
      .map((facility) => ({
        type: 'Feature',
        properties: {
          id: facility.id,
          name: facility.name,
          type: facility.type,
          accentColor: facility.accentColor,
          icon: facility.icon || iconForType(facility.type),
          distance: facility.distance ?? '',
          address: facility.address ?? '',
          phone: facility.phone ?? '',
          selected: facility.id === selectedFacilityId ? 1 : 0,
        },
        geometry: {
          type: 'Point',
          coordinates: [facility.coords![1], facility.coords![0]],
        },
      })),
  };
}

export function buildAccuracyFeature(lat: number, lon: number, accuracyMeters: number): PolygonFeature {
  const steps = 48;
  const earthRadiusMeters = 6_378_137;
  const angularDistance = accuracyMeters / earthRadiusMeters;
  const latRad = (lat * Math.PI) / 180;
  const cosLat = Math.max(Math.cos(latRad), 0.00001);

  const coordinates = Array.from({ length: steps + 1 }, (_, index) => {
    const bearing = (index / steps) * Math.PI * 2;
    const latOffset = angularDistance * Math.cos(bearing);
    const lonOffset = (angularDistance * Math.sin(bearing)) / cosLat;

    return [lon + (lonOffset * 180) / Math.PI, lat + (latOffset * 180) / Math.PI];
  });

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  };
}

// ═══════════════════════════════════════════
// DOM ELEMENT BUILDERS (Markers, Popups)
// ═══════════════════════════════════════════

export function buildMarkerElement({
  color,
  icon,
  kind = 'standard',
  selected = false,
}: {
  color: string;
  icon: string;
  kind?: 'standard' | 'issue' | 'current';
  selected?: boolean;
}) {
  const marker = document.createElement('div');
  const shell = document.createElement('div');
  const glyph = document.createElement('span');

  marker.style.transform = 'translate(-50%, -50%)';
  marker.style.display = 'flex';
  marker.style.alignItems = 'center';
  marker.style.justifyContent = 'center';

  shell.style.width = kind === 'current' ? '24px' : '38px';
  shell.style.height = kind === 'current' ? '24px' : '38px';
  shell.style.borderRadius = '999px';
  shell.style.display = 'flex';
  shell.style.alignItems = 'center';
  shell.style.justifyContent = 'center';
  shell.style.background = kind === 'current' ? color : 'rgba(7, 19, 37, 0.92)';
  shell.style.border =
    kind === 'current' ? '3px solid rgba(255,255,255,0.92)' : `2px solid ${color}`;
  shell.style.boxShadow =
    kind === 'current'
      ? '0 0 0 8px rgba(37, 99, 235, 0.16), 0 10px 24px rgba(2, 6, 23, 0.25)'
      : `0 12px 28px rgba(2, 6, 23, 0.28), 0 0 0 6px color-mix(in srgb, ${color} 18%, transparent)`;
  if (selected && kind !== 'current') {
    shell.style.transform = 'scale(1.08)';
    shell.style.boxShadow = `0 16px 34px rgba(2, 6, 23, 0.34), 0 0 0 8px color-mix(in srgb, ${color} 24%, transparent)`;
  }

  glyph.textContent = kind === 'current' ? '🎯' : icon;
  glyph.style.fontSize = kind === 'current' ? '14px' : kind === 'issue' ? '18px' : '20px';
  glyph.style.fontWeight = '700';
  glyph.style.lineHeight = '1';
  glyph.style.color = kind === 'current' ? '#ffffff' : color;
  glyph.style.userSelect = 'none';

  shell.appendChild(glyph);
  marker.appendChild(shell);
  return marker;
}

export function buildPopupContent(title: string, overline?: string, details: string[] = []) {
  const wrapper = document.createElement('div');
  const heading = document.createElement('div');

  wrapper.style.minWidth = '220px';
  wrapper.style.maxWidth = '220px';
  wrapper.style.fontFamily = 'var(--font-space), monospace';
  wrapper.style.color = 'var(--text-1)';

  heading.textContent = title;
  heading.style.fontWeight = '800';
  heading.style.fontSize = '14px';
  heading.style.letterSpacing = '-0.02em';
  heading.style.whiteSpace = 'nowrap';
  heading.style.overflow = 'hidden';
  heading.style.textOverflow = 'ellipsis';
  heading.style.color = 'var(--text-1)';
  wrapper.appendChild(heading);

  if (overline) {
    const label = document.createElement('div');
    label.textContent = overline;
    label.style.marginTop = '4px';
    label.style.fontSize = '11px';
    label.style.fontWeight = '700';
    label.style.color = 'var(--text-3)';
    wrapper.appendChild(label);
  }

  details.filter(Boolean).forEach((detail, index) => {
    const row = document.createElement('div');
    row.textContent = detail;
    row.style.marginTop = index === 0 ? '10px' : '6px';
    row.style.fontSize = '12px';
    row.style.lineHeight = '1.45';
    row.style.color = 'var(--text-2)';
    row.style.whiteSpace = 'nowrap';
    row.style.overflow = 'hidden';
    row.style.textOverflow = 'ellipsis';
    wrapper.appendChild(row);
  });

  return wrapper;
}
