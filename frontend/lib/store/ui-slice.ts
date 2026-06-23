// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import type { StateCreator } from 'zustand';
import type { AppState } from './types';

export interface UISlice {
  isSystemSidebarOpen: boolean;
  isDesktopSidebarCollapsed: boolean;
  isThinSidebarEnabled: boolean;
  setSystemSidebarOpen: (v: boolean) => void;
  setDesktopSidebarCollapsed: (v: boolean) => void;
  setThinSidebarEnabled: (v: boolean) => void;
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
  isSystemSidebarOpen: false,
  isDesktopSidebarCollapsed: false,
  isThinSidebarEnabled: true,
  setSystemSidebarOpen: (v) => set({ isSystemSidebarOpen: v }),
  setDesktopSidebarCollapsed: (v) => set({ isDesktopSidebarCollapsed: v }),
  setThinSidebarEnabled: (v) => set({ isThinSidebarEnabled: v }),
});
