import type { StateCreator } from 'zustand';
import { saveUserProfileToIndexedDB } from '@/lib/profile-storage';

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
  distance: number;
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
  emergencyContact: string;
  emergencyContacts: { name: string; phone: string; relation: string }[];
  medicalConditions: string;
  preferredLanguage: string;
  photo?: string;
  subtitle?: string;
}

export type AiMode = 'online' | 'offline' | 'loading';
export type ConnectivityState = 'online' | 'cached' | 'offline' | 'ai-offline';

export interface ChallanState {
  violation: string;
  vehicle: string;
  jurisdiction: string;
  isRepeat: boolean;
}

export interface RiskAnalysis {
  riskScore: number | null;
  riskLevel: 'low' | 'medium' | 'high' | null;
  estimatedLiability: number | null;
  predictedViolationsCount: number | null;
  recommendations: string[];
}

export interface DataSlice {
  gpsLocation: GpsLocation | null;
  gpsError: string | null;
  nearbyServices: NearbyService[];
  serviceSearchMeta: ServiceSearchMeta;
  serviceRadius: number;
  serviceCategory: 'all' | NearbyService['category'];
  nearbyRoadIssues: NearbyRoadIssue[];
  roadIssueSearchMeta: RoadIssueSearchMeta;
  aiMode: AiMode;
  modelLoadProgress: number;
  serverWarming: boolean;
  connectivity: ConnectivityState;
  userProfile: UserProfile;
  drivingScore: number | null;
  crashDetectionEnabled: boolean;
  challanState: ChallanState;
  profileHydrated: boolean;
  garageVehicles: any[];
  lastSyncedGarage: number | null;
  riskAnalysis: RiskAnalysis;
  setGpsLocation: (loc: GpsLocation) => void;
  setGpsError: (err: string | null) => void;
  setNearbyServices: (services: NearbyService[]) => void;
  setServiceSearchMeta: (meta: ServiceSearchMeta) => void;
  setServiceRadius: (r: number) => void;
  setServiceCategory: (c: 'all' | NearbyService['category']) => void;
  setNearbyRoadIssues: (issues: NearbyRoadIssue[]) => void;
  setRoadIssueSearchMeta: (meta: RoadIssueSearchMeta) => void;
  setAiMode: (m: AiMode) => void;
  setModelLoadProgress: (p: number) => void;
  setServerWarming: (v: boolean) => void;
  setConnectivity: (c: ConnectivityState) => void;
  setUserProfile: (p: Partial<UserProfile>) => void;
  setDrivingScore: (s: number) => void;
  setCrashDetectionEnabled: (v: boolean) => void;
  setChallanState: (state: Partial<ChallanState>) => void;
  setProfileHydrated: (v: boolean) => void;
  setGarageVehicles: (v: any[]) => void;
  setLastSyncedGarage: (t: number | null) => void;
  setRiskAnalysis: (analysis: any) => void;
}

export const createDataSlice: StateCreator<any, [], [], DataSlice> = (set) => ({
  gpsLocation: null,
  gpsError: null,
  setGpsLocation: (loc) => set({ gpsLocation: loc, gpsError: null }),
  setGpsError: (err) => set({ gpsError: err }),
  nearbyServices: [],
  serviceSearchMeta: { count: 0, radiusUsed: 0, requestedRadius: 0, source: 'api' },
  serviceRadius: 5000,
  serviceCategory: 'all',
  setNearbyServices: (services) => set({ nearbyServices: services }),
  setServiceSearchMeta: (meta) => set({ serviceSearchMeta: meta }),
  setServiceRadius: (r) => set({ serviceRadius: r }),
  setServiceCategory: (c) => set({ serviceCategory: c }),
  nearbyRoadIssues: [],
  roadIssueSearchMeta: { count: 0, radiusUsed: 0 },
  setNearbyRoadIssues: (issues) => set({ nearbyRoadIssues: issues }),
  setRoadIssueSearchMeta: (meta) => set({ roadIssueSearchMeta: meta }),
  aiMode: 'online',
  modelLoadProgress: 0,
  setAiMode: (m) => set({ aiMode: m }),
  setModelLoadProgress: (p) => set({ modelLoadProgress: p }),
  serverWarming: false,
  setServerWarming: (v) => set({ serverWarming: v }),
  connectivity: 'online',
  setConnectivity: (c) => set({ connectivity: c }),
  userProfile: {
    id: '', name: '', phone: '', bloodGroup: '', vehicleNumber: '',
    emergencyContact: '', emergencyContacts: [], medicalConditions: '',
    preferredLanguage: 'en', photo: '', subtitle: '',
  },
  setUserProfile: (p) => set((s: any) => {
    const userProfile = { ...s.userProfile, ...p };
    void saveUserProfileToIndexedDB(userProfile);
    return { userProfile };
  }),
  drivingScore: null,
  setDrivingScore: (s) => set({ drivingScore: s }),
  crashDetectionEnabled: false,
  setCrashDetectionEnabled: async (v) => {
    if (v) {
      try {
        const { requestCrashPermission } = await import('@/lib/crash-detection');
        const granted = await requestCrashPermission();
        if (!granted) {
          const { toast } = await import('sonner');
          toast.error('Motion permission denied. Cannot enable crash detection.', { position: 'top-center' });
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
  challanState: { violation: 'dui', vehicle: '4w', jurisdiction: 'Tamil Nadu (TN)', isRepeat: false },
  setChallanState: (state) => set((s: any) => ({ challanState: { ...s.challanState, ...state } })),
  profileHydrated: false,
  setProfileHydrated: (v) => set({ profileHydrated: v }),
  garageVehicles: [],
  lastSyncedGarage: null,
  setGarageVehicles: (v) => set({ garageVehicles: v }),
  setLastSyncedGarage: (t) => set({ lastSyncedGarage: t }),
  riskAnalysis: { riskScore: null, riskLevel: null, estimatedLiability: null, predictedViolationsCount: null, recommendations: [] },
  setRiskAnalysis: (analysis) => set({ riskAnalysis: analysis }),
});
