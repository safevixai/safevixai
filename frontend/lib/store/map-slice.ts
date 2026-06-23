// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import type { StateCreator } from 'zustand';

export type MapProvider = 'google-maps' | 'maptiler-vector' | 'maptiler-raster' | 'openfreemap' | null;
export type MapStatus = 'loading' | 'ready' | 'error';

export interface MapSearchTarget {
  lat: number;
  lon: number;
  label: string;
  city?: string;
  state?: string;
  timestamp: number;
}

export interface MapSlice {
  showHazardHeatmap: boolean;
  showSatellite: boolean;
  showTraffic: boolean;
  showSafeSpaces: boolean;
  showEmergencyServices: boolean;
  mapStatus: MapStatus;
  mapProvider: MapProvider;
  mapError: string | null;
  mapSearchTarget: MapSearchTarget | null;
  setShowHazardHeatmap: (v: boolean) => void;
  setShowSatellite: (v: boolean) => void;
  setShowTraffic: (v: boolean) => void;
  setShowSafeSpaces: (v: boolean) => void;
  setShowEmergencyServices: (v: boolean) => void;
  setMapState: (state: Partial<Pick<MapSlice, 'mapStatus' | 'mapProvider' | 'mapError'>>) => void;
  setMapSearchTarget: (target: MapSearchTarget | null) => void;
}

export const createMapSlice: StateCreator<any, [], [], MapSlice> = (set) => ({
  showHazardHeatmap: true,
  showSatellite: false,
  showTraffic: false,
  showSafeSpaces: false,
  showEmergencyServices: true,
  mapStatus: 'loading',
  mapProvider: null,
  mapError: null,
  mapSearchTarget: null,
  setShowHazardHeatmap: (v) => set({ showHazardHeatmap: v }),
  setShowSatellite: (v) => set({ showSatellite: v }),
  setShowTraffic: (v) => set({ showTraffic: v }),
  setShowSafeSpaces: (v) => set({ showSafeSpaces: v }),
  setShowEmergencyServices: (v) => set({ showEmergencyServices: v }),
  setMapState: (state) => set(state),
  setMapSearchTarget: (target) => set({ mapSearchTarget: target }),
});
