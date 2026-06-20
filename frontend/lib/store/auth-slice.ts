import type { StateCreator } from 'zustand';

export interface AuthSlice {
  isAuthenticated: boolean;
  operatorName: string;
  authToken: string | null;
  authRole: 'citizen' | 'officer' | 'admin' | 'super_admin';
  setAuth: (name: string, token?: string, role?: 'citizen' | 'officer' | 'admin' | 'super_admin') => void;
  clearAuth: () => void;
  setAuthToken: (token: string | null) => void;
  setAuthRole: (role: 'citizen' | 'officer' | 'admin' | 'super_admin') => void;
}

export const createAuthSlice: StateCreator<any, [], [], AuthSlice> = (set) => ({
  isAuthenticated: false,
  operatorName: '',
  authToken: null,
  authRole: 'citizen',
  setAuth: (name, token, role) => set({ isAuthenticated: true, operatorName: name, authToken: token || null, authRole: role || 'citizen' }),
  clearAuth: () => set({ isAuthenticated: false, operatorName: '', authToken: null, authRole: 'citizen' }),
  setAuthToken: (token) => set({ authToken: token }),
  setAuthRole: (role) => set({ authRole: role }),
});
