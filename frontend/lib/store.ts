import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GpsLocation {
  lat: number;
  lon: number;
  accuracy: number;
  timestamp: number;
  city?: string;
  state?: string;
  displayName?: string;
}

export interface NearbyService {
  id: string;
  name: string;
  category: 'hospital' | 'police' | 'ambulance' | 'fire' | 'towing' | 'pharmacy' | 'puncture' | 'showroom';
  lat: number;
  lon: number;
  distance: number; // metres
  phone?: string;
  address?: string;
  source: 'api' | 'offline';
}

export interface NearbyRoadIssue {
  uuid: string;
  issueType: string;
  severity: number;
  lat: number;
  lon: number;
  distance: number;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'rejected';
  description?: string;
  authorityName?: string;
  roadName?: string;
  roadType?: string;
  createdAt: string;
}

export interface ServiceSearchMeta {
  count: number;
  radiusUsed: number;
  requestedRadius: number;
  source: string;
}

export interface RoadIssueSearchMeta {
  count: number;
  radiusUsed: number;
}

export interface UserProfile {
  bloodGroup: string;
  vehicleNumber: string;
  emergencyContact: string;
  name: string;
}

export type AiMode = 'online' | 'offline' | 'loading';
export type ConnectivityState = 'online' | 'cached' | 'offline' | 'ai-offline';
export type MapStatus = 'loading' | 'ready' | 'error';
export type MapProvider = 'google-maps' | 'maptiler-vector' | 'maptiler-raster' | 'openfreemap' | null;

export interface MapSearchTarget {
  lat: number;
  lon: number;
  label: string;
  city?: string;
  state?: string;
  timestamp: number;
}

interface AppState {
  // GPS
  gpsLocation: GpsLocation | null;
  gpsError: string | null;
  setGpsLocation: (loc: GpsLocation) => void;
  setGpsError: (err: string | null) => void;

  // Services
  nearbyServices: NearbyService[];
  serviceSearchMeta: ServiceSearchMeta;
  serviceRadius: number; // metres
  serviceCategory: 'all' | NearbyService['category'];
  setNearbyServices: (services: NearbyService[]) => void;
  setServiceSearchMeta: (meta: ServiceSearchMeta) => void;
  setServiceRadius: (r: number) => void;
  setServiceCategory: (c: AppState['serviceCategory']) => void;
  nearbyRoadIssues: NearbyRoadIssue[];
  roadIssueSearchMeta: RoadIssueSearchMeta;
  setNearbyRoadIssues: (issues: NearbyRoadIssue[]) => void;
  setRoadIssueSearchMeta: (meta: RoadIssueSearchMeta) => void;

  // AI Mode
  aiMode: AiMode;
  modelLoadProgress: number; // 0-100
  setAiMode: (m: AiMode) => void;
  setModelLoadProgress: (p: number) => void;

  // Connectivity
  connectivity: ConnectivityState;
  setConnectivity: (c: ConnectivityState) => void;

  // Map
  showHazardHeatmap: boolean;
  setShowHazardHeatmap: (v: boolean) => void;
  showSatellite: boolean;
  setShowSatellite: (v: boolean) => void;
  showTraffic: boolean;
  setShowTraffic: (v: boolean) => void;
  showSafeSpaces: boolean;
  setShowSafeSpaces: (v: boolean) => void;
  showEmergencyServices: boolean;
  setShowEmergencyServices: (v: boolean) => void;
  mapStatus: MapStatus;
  mapProvider: MapProvider;
  mapError: string | null;
  setMapState: (state: Partial<Pick<AppState, 'mapStatus' | 'mapProvider' | 'mapError'>>) => void;
  mapSearchTarget: MapSearchTarget | null;
  setMapSearchTarget: (target: MapSearchTarget | null) => void;

  // User Profile (persisted)
  userProfile: UserProfile;
  setUserProfile: (p: Partial<UserProfile>) => void;

  // Driving Score
  drivingScore: number | null;
  setDrivingScore: (s: number) => void;

  // Crash detection
  crashDetectionEnabled: boolean;
  setCrashDetectionEnabled: (v: boolean) => void;

  // UI State
  isSystemSidebarOpen: boolean;
  setSystemSidebarOpen: (v: boolean) => void;
  isDesktopSidebarCollapsed: boolean;
  setDesktopSidebarCollapsed: (v: boolean) => void;
  isThinSidebarEnabled: boolean;
  setThinSidebarEnabled: (v: boolean) => void;

  // Sound & Haptics
  soundsEnabled: boolean;
  setSoundsEnabled: (v: boolean) => void;

  // Challan Calculator
  challanState: {
    violation: string;
    vehicle: string;
    jurisdiction: string;
    isRepeat: boolean;
  };
  setChallanState: (state: Partial<AppState['challanState']>) => void;

  // Auth
  isAuthenticated: boolean;
  authToken: string | null;
  operatorName: string;
  setAuth: (token: string, name: string) => void;
  clearAuth: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // GPS
      gpsLocation: null,
      gpsError: null,
      setGpsLocation: (loc) => set({ gpsLocation: loc, gpsError: null }),
      setGpsError: (err) => set({ gpsError: err }),

      // Services
      nearbyServices: [],
      serviceSearchMeta: {
        count: 0,
        radiusUsed: 0,
        requestedRadius: 0,
        source: 'api',
      },
      serviceRadius: 5000,
      serviceCategory: 'all',
      setNearbyServices: (services) => set({ nearbyServices: services }),
      setServiceSearchMeta: (meta) => set({ serviceSearchMeta: meta }),
      setServiceRadius: (r) => set({ serviceRadius: r }),
      setServiceCategory: (c) => set({ serviceCategory: c }),
      nearbyRoadIssues: [],
      roadIssueSearchMeta: {
        count: 0,
        radiusUsed: 0,
      },
      setNearbyRoadIssues: (issues) => set({ nearbyRoadIssues: issues }),
      setRoadIssueSearchMeta: (meta) => set({ roadIssueSearchMeta: meta }),

      // AI Mode
      aiMode: 'online',
      modelLoadProgress: 0,
      setAiMode: (m) => set({ aiMode: m }),
      setModelLoadProgress: (p) => set({ modelLoadProgress: p }),

      // Connectivity
      connectivity: 'online',
      setConnectivity: (c) => set({ connectivity: c }),

      // Map
      showHazardHeatmap: true,
      setShowHazardHeatmap: (v) => set({ showHazardHeatmap: v }),
      showSatellite: false,
      setShowSatellite: (v) => set({ showSatellite: v }),
      showTraffic: false,
      setShowTraffic: (v) => set({ showTraffic: v }),
      showSafeSpaces: false,
      setShowSafeSpaces: (v) => set({ showSafeSpaces: v }),
      showEmergencyServices: true,
      setShowEmergencyServices: (v) => set({ showEmergencyServices: v }),
      mapStatus: 'loading',
      mapProvider: null,
      mapError: null,
      setMapState: (state) => set(state),
      mapSearchTarget: null,
      setMapSearchTarget: (target) => set({ mapSearchTarget: target }),

      // User Profile
      userProfile: {
        bloodGroup: '',
        vehicleNumber: '',
        emergencyContact: '',
        name: '',
      },
      setUserProfile: (p) => set((s) => ({
        userProfile: { ...s.userProfile, ...p },
      })),

      // Driving Score
      drivingScore: null,
      setDrivingScore: (s) => set({ drivingScore: s }),

      // Crash Detection
      crashDetectionEnabled: false,
      setCrashDetectionEnabled: (v) => set({ crashDetectionEnabled: v }),

      // UI State
      isSystemSidebarOpen: false,
      setSystemSidebarOpen: (v) => set({ isSystemSidebarOpen: v }),
      isDesktopSidebarCollapsed: false,
      setDesktopSidebarCollapsed: (v) => set({ isDesktopSidebarCollapsed: v }),
      isThinSidebarEnabled: true,
      setThinSidebarEnabled: (v) => set({ isThinSidebarEnabled: v }),

      // Sound & Haptics
      soundsEnabled: false,
      setSoundsEnabled: (v) => set({ soundsEnabled: v }),

      // Challan Calculator
      challanState: {
        violation: 'dui',
        vehicle: '4w',
        jurisdiction: 'Tamil Nadu (TN)',
        isRepeat: false,
      },
      setChallanState: (state) => set((s) => ({ challanState: { ...s.challanState, ...state } })),

      // Auth
      isAuthenticated: false,
      authToken: null,
      operatorName: '',
      setAuth: (token, name) => set({ isAuthenticated: true, authToken: token, operatorName: name }),
      clearAuth: () => set({ isAuthenticated: false, authToken: null, operatorName: '' }),
    }),
    {
      name: 'svai-storage',
      // Auth tokens are intentionally kept in memory so XSS cannot replay a persisted bearer token.
      partialize: (state) => ({
        userProfile: state.userProfile,
        aiMode: state.aiMode,
        serviceCategory: state.serviceCategory,
        isDesktopSidebarCollapsed: state.isDesktopSidebarCollapsed,
        isThinSidebarEnabled: state.isThinSidebarEnabled,
        showHazardHeatmap: state.showHazardHeatmap,
        showSatellite: state.showSatellite,
        showTraffic: state.showTraffic,
        showSafeSpaces: state.showSafeSpaces,
        showEmergencyServices: state.showEmergencyServices,
        soundsEnabled: state.soundsEnabled,
      }),
    }
  )
);
