// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import type { StateCreator } from 'zustand';

export interface SettingsSlice {
  soundsEnabled: boolean;
  speedAlert: boolean;
  hazardNotifs: boolean;
  locationTracking: boolean;
  sosVibration: boolean;
  autoOffline: boolean;
  analyticsOptIn: boolean;
  navApp: 'google' | 'waze' | 'apple';
  setSoundsEnabled: (v: boolean) => void;
  setSpeedAlert: (v: boolean) => void;
  setHazardNotifs: (v: boolean) => void;
  setLocationTracking: (v: boolean) => void;
  setSosVibration: (v: boolean) => void;
  setAutoOffline: (v: boolean) => void;
  setAnalyticsOptIn: (v: boolean) => void;
  setNavApp: (v: 'google' | 'waze' | 'apple') => void;
}

export const createSettingsSlice: StateCreator<any, [], [], SettingsSlice> = (set) => ({
  soundsEnabled: false,
  speedAlert: false,
  hazardNotifs: true,
  locationTracking: true,
  sosVibration: true,
  autoOffline: true,
  analyticsOptIn: false,
  navApp: 'google',
  setSoundsEnabled: (v) => set({ soundsEnabled: v }),
  setSpeedAlert: (v) => set({ speedAlert: v }),
  setHazardNotifs: (v) => set({ hazardNotifs: v }),
  setLocationTracking: (v) => set({ locationTracking: v }),
  setSosVibration: (v) => set({ sosVibration: v }),
  setAutoOffline: (v) => set({ autoOffline: v }),
  setAnalyticsOptIn: (v) => set({ analyticsOptIn: v }),
  setNavApp: (v) => set({ navApp: v }),
});
