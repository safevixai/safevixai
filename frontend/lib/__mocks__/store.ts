// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
import type { AppState } from '@/lib/store/types'
import type { GpsLocation, UserProfile, AiMode, ConnectivityState, ChallanState } from '@/lib/store/data-slice'
import type { MapProvider, MapStatus } from '@/lib/store/map-slice'
import { useAppStore } from '@/lib/store'

const defaultUser: UserProfile = {
  id: 'test-user-1',
  name: 'Test User',
  phone: '+911234567890',
  bloodGroup: 'O+',
  vehicleNumber: 'TN01AB1234',
  emergencyContact: '+919876543210',
  emergencyContacts: [],
  medicalConditions: '',
  preferredLanguage: 'en',
}

const defaultLocation: GpsLocation = {
  lat: 13.0827,
  lon: 80.2707,
  accuracy: 50,
  timestamp: Date.now(),
  city: 'Chennai',
  state: 'Tamil Nadu',
}

const defaultStore: AppState = {
  // Auth
  isAuthenticated: false,
  isProfileHydrated: true,
  profileHydrated: true,
  operatorName: '',
  authToken: null,
  authRole: 'citizen',
  user: null,
  userProfile: defaultUser,
  guestId: 'test-guest-1',
  setUser: jest.fn(),
  setUserProfile: jest.fn(),
  setAuth: jest.fn(),
  setAuthToken: jest.fn(),
  setAuthRole: jest.fn(),
  clearAuth: jest.fn(),
  setIsAuthenticated: jest.fn(),
  setProfileHydrated: jest.fn(),
  setGuestId: jest.fn(),

  // Map
  mapProvider: 'maplibre' as MapProvider,
  mapStatus: 'idle' as MapStatus,
  mapSearchTarget: null,
  mapError: null,
  setMapProvider: jest.fn(),
  setMapStatus: jest.fn(),
  setMapSearchTarget: jest.fn(),
  setMapError: jest.fn(),
  clearSearchTarget: jest.fn(),

  // Settings
  aiMode: 'online' as AiMode,
  serviceCategory: 'hospital',
  isDesktopSidebarCollapsed: false,
  isThinSidebarEnabled: false,
  showHazardHeatmap: false,
  showSatellite: false,
  showTraffic: false,
  showSafeSpaces: true,
  showEmergencyServices: true,
  soundsEnabled: true,
  speedAlert: true,
  hazardNotifs: true,
  locationTracking: false,
  sosVibration: true,
  setAiMode: jest.fn(),
  setServiceCategory: jest.fn(),
  setDesktopSidebarCollapsed: jest.fn(),
  toggleThinSidebar: jest.fn(),
  toggleHazardHeatmap: jest.fn(),
  toggleSatellite: jest.fn(),
  toggleTraffic: jest.fn(),
  toggleSafeSpaces: jest.fn(),
  toggleEmergencyServices: jest.fn(),
  toggleSounds: jest.fn(),
  toggleSpeedAlert: jest.fn(),
  toggleHazardNotifs: jest.fn(),
  toggleLocationTracking: jest.fn(),
  toggleSOSVibration: jest.fn(),
  resetSettings: jest.fn(),

  // UI
  lastPage: '/',
  isLoading: false,
  isDesktopSidebarOpen: true,
  isMobileMenuOpen: false,
  activeModal: null,
  toastMessage: null,
  sidebarVariant: 'full',
  setLastPage: jest.fn(),
  setLoading: jest.fn(),
  setDesktopSidebarOpen: jest.fn(),
  setMobileMenuOpen: jest.fn(),
  openModal: jest.fn(),
  closeModal: jest.fn(),
  showToast: jest.fn(),
  hideToast: jest.fn(),
  setSidebarVariant: jest.fn(),

  // Data
  gpsLocation: defaultLocation,
  nearbyServices: [],
  nearbyRoadIssues: [],
  connectivityState: 'online' as ConnectivityState,
  challanState: { violation: '', vehicle: '', jurisdiction: '', isRepeat: false } as ChallanState,
  setGpsLocation: jest.fn(),
  setNearbyServices: jest.fn(),
  setNearbyRoadIssues: jest.fn(),
  setConnectivityState: jest.fn(),
  setChallanField: jest.fn(),
  resetChallan: jest.fn(),
}

export function createMockStore(overrides?: Partial<AppState>): AppState {
  return { ...defaultStore, ...overrides }
}

export function setMockStore(overrides?: Partial<AppState>): void {
  const state = createMockStore(overrides)
  useAppStore.setState(state)
}

export { defaultStore }
