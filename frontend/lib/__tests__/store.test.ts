// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import { useAppStore } from '../store';

describe('app store persistence', function() {
  beforeEach(function() {
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

  it('persists operator auth state across sessions', function() {
    useAppStore.getState().setAuth('Operator');

    var persisted = JSON.parse(localStorage.getItem('svai-storage') ?? '{}');

    expect(useAppStore.getState().operatorName).toBe('Operator');
    expect(persisted.state?.operatorName).toBe('Operator');
    expect(persisted.state?.isAuthenticated).toBe(true);
  });

  it('persists non-sensitive emergency profile fields', function() {
    useAppStore.getState().setUserProfile({
      name: 'Demo User',
      bloodGroup: 'O+',
      emergencyContact: '+919999999999',
      vehicleNumber: 'TN01AB1234',
    });

    var persisted = JSON.parse(localStorage.getItem('svai-storage') ?? '{}');

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

  it('keeps transient map state out of persisted storage', function() {
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

    var persisted = JSON.parse(localStorage.getItem('svai-storage') ?? '{}');

    expect(useAppStore.getState().mapProvider).toBe('maptiler-vector');
    expect(useAppStore.getState().mapSearchTarget?.label).toBe('Chennai');
    expect(persisted.state?.mapStatus).toBeUndefined();
    expect(persisted.state?.mapProvider).toBeUndefined();
    expect(persisted.state?.mapSearchTarget).toBeUndefined();
  });
});


