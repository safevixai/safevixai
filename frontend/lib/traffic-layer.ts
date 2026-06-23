// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import type maplibregl from 'maplibre-gl';

const PROXY_BASE = '/api/proxy/tomtom';

export function addTrafficLayer(map: maplibregl.Map): void {
  map.addSource('tomtom-traffic-flow', {
    type: 'raster',
    tiles: [
      `${PROXY_BASE}/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png`,
    ],
    tileSize: 256,
    attribution: 'TomTom Traffic',
  });

  map.addLayer({
    id: 'traffic-flow',
    type: 'raster',
    source: 'tomtom-traffic-flow',
    paint: { 'raster-opacity': 0.7 },
  });

  map.addSource('tomtom-incidents', {
    type: 'raster',
    tiles: [
      `${PROXY_BASE}/traffic/map/4/tile/incidents/s3/{z}/{x}/{y}.png`,
    ],
    tileSize: 256,
  });

  map.addLayer({
    id: 'traffic-incidents',
    type: 'raster',
    source: 'tomtom-incidents',
    paint: { 'raster-opacity': 0.9 },
  });
}

export function toggleTrafficLayer(map: maplibregl.Map, show: boolean): void {
  if (!map.getLayer('traffic-flow')) return;
  map.setLayoutProperty('traffic-flow', 'visibility', show ? 'visible' : 'none');
  map.setLayoutProperty('traffic-incidents', 'visibility', show ? 'visible' : 'none');
}
