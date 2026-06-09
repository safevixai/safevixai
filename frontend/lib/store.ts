import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { saveUserProfileToIndexedDB, loadUserProfileFromIndexedDB } from './profile-storage';
import { markHydrated } from './use-hydrated';

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
  id: string;
  name: string;
  phone: string;
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-' | 'Unknown' | '';
  vehicleNumber: string;
  emergencyContact: string; // backwards compatibility
  emergencyContacts: { name: string; phone: string; relation: string }[];
  medicalConditions: string;
  preferredLanguage: string;
  photo?: string;
  subtitle?: string;
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
  serverWarming: boolean;
  setServerWarming: (v: boolean) => void;

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

  // Settings
  speedAlert: boolean;
  setSpeedAlert: (v: boolean) => void;
  hazardNotifs: boolean;
  setHazardNotifs: (v: boolean) => void;
  locationTracking: boolean;
  setLocationTracking: (v: boolean) => void;
  sosVibration: boolean;
  setSosVibration: (v: boolean) => void;
  autoOffline: boolean;
  setAutoOffline: (v: boolean) => void;
  analyticsOptIn: boolean;
  setAnalyticsOptIn: (v: boolean) => void;
  navApp: 'google' | 'waze' | 'apple';
  setNavApp: (v: 'google' | 'waze' | 'apple') => void;

  // Profile hydration gate
  profileHydrated: boolean;
  setProfileHydrated: (v: boolean) => void;

  // Auth
  isAuthenticated: boolean;
  operatorName: string;
  authToken: string | null;
  setAuth: (name: string, token?: string) => void;
  clearAuth: () => void;
  setAuthToken: (token: string | null) => void;

  // Garage and Telemetry (Enterprise Specs)
  garageVehicles: any[];
  lastSyncedGarage: number | null;
  riskAnalysis: {
    riskScore: number | null;
    riskLevel: 'low' | 'medium' | 'high' | null;
    estimatedLiability: number | null;
    predictedViolationsCount: number | null;
    recommendations: string[];
  };
  setGarageVehicles: (v: any[]) => void;
  setLastSyncedGarage: (t: number | null) => void;
  setRiskAnalysis: (analysis: any) => void;
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
      serverWarming: false,
      setServerWarming: (v) => set({ serverWarming: v }),

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
        id: '',
        name: '',
        phone: '',
        bloodGroup: '',
        vehicleNumber: '',
        emergencyContact: '',
        emergencyContacts: [],
        medicalConditions: '',
        preferredLanguage: 'en',
        photo: '',
        subtitle: '',
      },
      setUserProfile: (p) => set((s) => {
        const userProfile = { ...s.userProfile, ...p };
        void saveUserProfileToIndexedDB(userProfile);
        return { userProfile };
      }),

      // Driving Score
      drivingScore: null,
      setDrivingScore: (s) => set({ drivingScore: s }),

      // Crash Detection
      crashDetectionEnabled: false,
      setCrashDetectionEnabled: async (v) => {
        if (v) {
          try {
            const { requestCrashPermission } = await import('./crash-detection');
            const granted = await requestCrashPermission();
            if (!granted) {
              const { toast } = await import('sonner');
              toast.error('Motion permission denied. Cannot enable crash detection.', {
                position: 'top-center',
              });
              set({ crashDetectionEnabled: false });
              return;
            }
          } catch (e) {
            console.error('Failed to request motion permission:', e);
            set({ crashDetectionEnabled: false });
            return;
          }
        }
        set({ crashDetectionEnabled: v });
      },

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

      // Settings Default State & Actions
      speedAlert: false,
      setSpeedAlert: (v) => set({ speedAlert: v }),
      hazardNotifs: true,
      setHazardNotifs: (v) => set({ hazardNotifs: v }),
      locationTracking: true,
      setLocationTracking: (v) => set({ locationTracking: v }),
      sosVibration: true,
      setSosVibration: (v) => set({ sosVibration: v }),
      autoOffline: true,
      setAutoOffline: (v) => set({ autoOffline: v }),
      analyticsOptIn: false,
      setAnalyticsOptIn: (v) => set({ analyticsOptIn: v }),
      navApp: 'google',
      setNavApp: (v) => set({ navApp: v }),

      // Profile hydration gate
      profileHydrated: false,
      setProfileHydrated: (v) => set({ profileHydrated: v }),

      // Auth
      isAuthenticated: false,
      operatorName: '',
      authToken: null,
      setAuth: (name, token) => set({ isAuthenticated: true, operatorName: name, authToken: token || null }),
      clearAuth: () => set({ isAuthenticated: false, operatorName: '', authToken: null }),
      setAuthToken: (token) => set({ authToken: token }),

      // Garage and Telemetry (Enterprise Specs)
      garageVehicles: [],
      lastSyncedGarage: null,
      riskAnalysis: {
        riskScore: null,
        riskLevel: null,
        estimatedLiability: null,
        predictedViolationsCount: null,
        recommendations: [],
      },
      setGarageVehicles: (v) => set({ garageVehicles: v }),
      setLastSyncedGarage: (t) => set({ lastSyncedGarage: t }),
      setRiskAnalysis: (analysis) => set({ riskAnalysis: analysis }),
    }),
    {
      name: 'svai-storage',
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<AppState> | undefined;
        if (state && 'userProfile' in state) {
          delete state.userProfile;
        }
        return { ...currentState, ...state };
      },
      onRehydrateStorage: () => {
        return (state, error) => {
          markHydrated();
          if (!error) {
            loadUserProfileFromIndexedDB().then((profile) => {
              if (profile) {
                useAppStore.getState().setUserProfile(profile);
              }
              useAppStore.getState().setProfileHydrated(true);
            });
          }
        };
      },
      partialize: (state) => ({
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
        speedAlert: state.speedAlert,
        hazardNotifs: state.hazardNotifs,
        locationTracking: state.locationTracking,
        sosVibration: state.sosVibration,
        autoOffline: state.autoOffline,
        analyticsOptIn: state.analyticsOptIn,
        navApp: state.navApp,
        isAuthenticated: state.isAuthenticated,
        operatorName: state.operatorName,
      }),
    }
  )
);

// P1-07: Granular selectors (audit H9)
// Components should use these instead of the full `useAppStore()` to prevent
// unnecessary re-renders when unrelated state slices change.

// GPS
export const useGpsLocation = () => useAppStore((s) => s.gpsLocation);
export const useGpsError = () => useAppStore((s) => s.gpsError);
export const useSetGpsLocation = () => useAppStore((s) => s.setGpsLocation);
export const useSetGpsError = () => useAppStore((s) => s.setGpsError);

// Services
export const useNearbyServices = () => useAppStore((s) => s.nearbyServices);
export const useServiceRadius = () => useAppStore((s) => s.serviceRadius);
export const useServiceCategory = () => useAppStore((s) => s.serviceCategory);
export const useServiceSearchMeta = () => useAppStore((s) => s.serviceSearchMeta);
export const useNearbyRoadIssues = () => useAppStore((s) => s.nearbyRoadIssues);
export const useRoadIssueSearchMeta = () => useAppStore((s) => s.roadIssueSearchMeta);

  // AI / Connectivity
  export const useAiMode = () => useAppStore((s) => s.aiMode);
  export const useModelLoadProgress = () => useAppStore((s) => s.modelLoadProgress);
  export const useConnectivity = () => useAppStore((s) => s.connectivity);
  export const useServerWarming = () => useAppStore((s) => s.serverWarming);

// Map layers
export const useShowHazardHeatmap = () => useAppStore((s) => s.showHazardHeatmap);
export const useShowSatellite = () => useAppStore((s) => s.showSatellite);
export const useShowTraffic = () => useAppStore((s) => s.showTraffic);
export const useShowSafeSpaces = () => useAppStore((s) => s.showSafeSpaces);
export const useShowEmergencyServices = () => useAppStore((s) => s.showEmergencyServices);
export const useMapStatus = () => useAppStore((s) => s.mapStatus);
export const useMapProvider = () => useAppStore((s) => s.mapProvider);
export const useMapError = () => useAppStore((s) => s.mapError);
export const useMapSearchTarget = () => useAppStore((s) => s.mapSearchTarget);

// User profile
export const useUserProfile = () => useAppStore((s) => s.userProfile);
export const useDrivingScore = () => useAppStore((s) => s.drivingScore);
export const useCrashDetectionEnabled = () => useAppStore((s) => s.crashDetectionEnabled);

// Settings
export const useSpeedAlert = () => useAppStore((s) => s.speedAlert);
export const useHazardNotifs = () => useAppStore((s) => s.hazardNotifs);
export const useLocationTracking = () => useAppStore((s) => s.locationTracking);
export const useSosVibration = () => useAppStore((s) => s.sosVibration);
export const useAutoOffline = () => useAppStore((s) => s.autoOffline);
export const useAnalyticsOptIn = () => useAppStore((s) => s.analyticsOptIn);
export const useNavApp = () => useAppStore((s) => s.navApp);

// UI
export const useIsDesktopSidebarCollapsed = () => useAppStore((s) => s.isDesktopSidebarCollapsed);
export const useIsThinSidebarEnabled = () => useAppStore((s) => s.isThinSidebarEnabled);
export const useSoundsEnabled = () => useAppStore((s) => s.soundsEnabled);
export const useChallanState = () => useAppStore((s) => s.challanState);

// Auth
export const useIsAuthenticated = () => useAppStore((s) => s.isAuthenticated);
export const useOperatorName = () => useAppStore((s) => s.operatorName);
export const useAuthToken = () => useAppStore((s) => s.authToken);
