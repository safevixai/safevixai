/**
 * MapLibreCanvas — Map Styles
 * Google Maps raster styles, MapTiler vector, OpenFreeMap fallback.
 */

const MAPTILER_PROXY = '/api/proxy/maptiler';
const OPENFREEMAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';

import type { MapStyleCandidate } from './map-types';

export function buildGoogleMapsRasterStyle(isDark: boolean) {
  // Use gl=IN to enforce correct Indian geopolitical boundaries
  const tileUrl = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en&gl=IN';
  return {
    version: 8,
    name: 'SafeVixAI Google Maps India Raster',
    sources: {
      'svai-google-raster': {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 22,
        attribution: '&copy; Google Maps',
      },
    },
    layers: [
      {
        id: 'svai-google-raster-background',
        type: 'background',
        paint: {
          'background-color': isDark ? '#050a14' : '#f0f4f8',
        },
      },
      {
        id: 'svai-google-raster-layer',
        type: 'raster',
        source: 'svai-google-raster',
        minzoom: 0,
        maxzoom: 22,
        paint: isDark
          ? {
              'raster-brightness-max': 0.8,
              'raster-saturation': -0.2,
            }
          : {},
      },
    ],
  };
}

export function buildGoogleMapsSatelliteStyle() {
  // lyrs=y is Hybrid (Satellite with labels and borders), gl=IN for borders
  const tileUrl = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=en&gl=IN';
  return {
    version: 8,
    name: 'SafeVixAI Google Maps Satellite',
    sources: {
      'svai-google-satellite': {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 22,
        attribution: '&copy; Google Maps',
      },
    },
    layers: [
      {
        id: 'svai-google-satellite-layer',
        type: 'raster',
        source: 'svai-google-satellite',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
}

export function buildStyleCandidates(
  resolvedTheme: string | undefined,
  showSatellite: boolean
): MapStyleCandidate[] {
  const lightStyle = process.env.NEXT_PUBLIC_MAPTILER_STYLE_LIGHT ?? 'streets-v2';
  const darkStyle = process.env.NEXT_PUBLIC_MAPTILER_STYLE_DARK ?? 'dataviz-dark';
  const styleId = resolvedTheme === 'dark' ? darkStyle : lightStyle;

  const mapTilerStyleUrl = `${MAPTILER_PROXY}/maps/${showSatellite ? 'hybrid' : styleId}/style.json`;

  return [
    {
      kind: 'google-maps',
      label: showSatellite ? 'Google Maps (Satellite)' : 'Google Maps (India)',
      style: showSatellite ? buildGoogleMapsSatelliteStyle() : buildGoogleMapsRasterStyle(resolvedTheme === 'dark'),
    },
    {
      kind: 'maptiler-vector',
      label: showSatellite ? 'MapTiler (Satellite)' : 'MapTiler Streets',
      style: mapTilerStyleUrl,
    } as MapStyleCandidate,
    {
      kind: 'openfreemap',
      label: 'OpenFreeMap Liberty',
      style: OPENFREEMAP_STYLE_URL,
    },
  ];
}
