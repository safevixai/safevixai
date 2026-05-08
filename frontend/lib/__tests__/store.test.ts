import { useAppStore } from '../store';

describe('app store persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      isAuthenticated: false,
      authToken: null,
      operatorName: '',
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
});
