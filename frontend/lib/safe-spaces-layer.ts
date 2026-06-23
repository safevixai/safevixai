// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import type maplibregl from 'maplibre-gl';
import { PUBLIC_API_BASE_URL } from './public-env';

interface SafeSpace {
  name: string;
  type: string;
  lat: number;
  lon: number;
  phone?: string | null;
}

interface SafeSpacesResponse {
  places?: SafeSpace[];
  count?: number;
  radius_meters?: number;
  source?: string;
  warning?: string;
}

function buildSafeSpacesUrl(lat: number, lon: number) {
  const url = new URL('/api/v1/emergency/safe-spaces', PUBLIC_API_BASE_URL);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('radius', '1000');
  return url.toString();
}

function normalizeSafeSpaces(payload: SafeSpacesResponse | SafeSpace[]): SafeSpace[] {
  return Array.isArray(payload) ? payload : payload.places ?? [];
}

export async function addSafeSpacesLayer(
  map: maplibregl.Map,
  lat: number,
  lon: number
): Promise<void> {
  const res = await fetch(buildSafeSpacesUrl(lat, lon));
  if (!res.ok) {
    throw new Error(`Safe spaces request failed with ${res.status}`);
  }

  const spaces = normalizeSafeSpaces(await res.json());

  const features = spaces.map(s => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [s.lon, s.lat] },
    properties: { name: s.name, type: s.type, phone: s.phone ?? '' },
  }));

  if (map.getSource('safe-spaces')) {
    (map.getSource('safe-spaces') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features,
    });
    return;
  }

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const strokeColor = isDark ? '#1C2127' : '#F8FAFC';
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const textHaloColor = isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';

  map.addSource('safe-spaces', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
  });

  map.addLayer({
    id: 'safe-spaces-circles',
    type: 'circle',
    source: 'safe-spaces',
    paint: {
      'circle-radius': 8,
      'circle-color': [
        'match',
        ['get', 'type'],
        'restaurant', '#F59E0B',
        'cafe', '#F59E0B',
        'pharmacy', '#10B981',
        'hospital', '#EF4444',
        'police', '#3B82F6',
        '#8B5CF6', // default
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': strokeColor,
    },
  });

  map.addLayer({
    id: 'safe-spaces-labels',
    type: 'symbol',
    source: 'safe-spaces',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
      'text-size': 11,
      'text-offset': [0, 1.2],
      'text-anchor': 'top',
      'text-allow-overlap': false,
      'text-ignore-placement': false,
    },
    paint: {
      'text-color': textColor,
      'text-halo-color': textHaloColor,
      'text-halo-width': 1.5,
    },
  });
}
