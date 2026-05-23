import { useAppStore } from '../store';

describe('app store persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      isAuthenticated: false,
      operatorName: '',
      mapStatus: 'loading',
      mapProvider: null,
      mapError: null,
      mapSearchTarget: null,
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
      },
    });
  });

  it('keeps operator name in memory only', () => {
    useAppStore.getState().setAuth('Operator');

    const persisted = JSON.parse(localStorage.getItem('svai-storage') ?? '{}');

    expect(useAppStore.getState().operatorName).toBe('Operator');
    expect(persisted.state?.operatorName).toBeUndefined();
    expect(persisted.state?.isAuthenticated).toBeUndefined();
  });

  it('persists non-sensitive emergency profile fields', () => {
    useAppStore.getState().setUserProfile({
      name: 'Demo User',
      bloodGroup: 'O+',
      emergencyContact: '+919999999999',
      vehicleNumber: 'TN01AB1234',
    });

    const persisted = JSON.parse(localStorage.getItem('svai-storage') ?? '{}');

    // userProfile is intentionally excluded from localStorage (stored in IndexedDB for privacy)
    expect(persisted.state?.userProfile).toBeUndefined();
    expect(useAppStore.getState().userProfile).toEqual(
      expect.objectContaining({
        name: 'Demo User',
        bloodGroup: 'O+',
        emergencyContact: '+919999999999',
        vehicleNumber: 'TN01AB1234',
      })
    );
  });

  it('keeps transient map state out of persisted storage', () => {
    useAppStore.getState().setMapState({
      mapStatus: 'ready',
      mapProvider: 'maptiler-vector',
      mapError: null,
    });
    useAppStore.getState().setMapSearchTarget({
      lat: 13.0827,
      lon: 80.2707,
      label: 'Chennai',
      timestamp: 123,
    });

    const persisted = JSON.parse(localStorage.getItem('svai-storage') ?? '{}');

    expect(useAppStore.getState().mapProvider).toBe('maptiler-vector');
    expect(useAppStore.getState().mapSearchTarget?.label).toBe('Chennai');
    expect(persisted.state?.mapStatus).toBeUndefined();
    expect(persisted.state?.mapProvider).toBeUndefined();
    expect(persisted.state?.mapSearchTarget).toBeUndefined();
  });
});
