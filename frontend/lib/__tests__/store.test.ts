import { useAppStore } from '../store';

describe('app store persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      isAuthenticated: false,
      authToken: null,
      operatorName: '',
      mapStatus: 'loading',
      mapProvider: null,
      mapError: null,
      mapSearchTarget: null,
      userProfile: {
        bloodGroup: '',
        vehicleNumber: '',
        emergencyContact: '',
        name: '',
      },
    });
  });

  it('keeps bearer tokens in memory only', () => {
    useAppStore.getState().setAuth('secret-token', 'Operator');

    const persisted = JSON.parse(localStorage.getItem('svai-storage') ?? '{}');

    expect(useAppStore.getState().authToken).toBe('secret-token');
    expect(persisted.state?.authToken).toBeUndefined();
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

    expect(persisted.state.userProfile).toEqual(
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
