// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/lib/api', function() {
  return {
    fetchNearbyServices: jest.fn(function() { return Promise.resolve({ services: [], count: 0, source: 'api' }) }),
    fetchRoadIssues: jest.fn(function() { return Promise.resolve({ issues: [], count: 0 }) }),
  }
})
jest.mock('@/lib/geolocation', function() {
  var mockLocation = { lat: 13.0827, lon: 80.2707, accuracy: 50 }
  return {
    useGeolocation: function() { return { location: mockLocation, error: null, refresh: jest.fn() } },
    getAddressFromGPS: jest.fn(function() { return Promise.resolve({ city: 'Chennai', state: 'Tamil Nadu', displayAddress: 'Chennai, TN' }) }),
  }
})

import { render } from '@testing-library/react'
import React from 'react'
import DashboardMapBootstrap from '../dashboard/DashboardMapBootstrap'

var mockSetFunctions = {
  setConnectivity: jest.fn(),
  setGpsLocation: jest.fn(),
  setNearbyServices: jest.fn(),
  setNearbyRoadIssues: jest.fn(),
  setServiceSearchMeta: jest.fn(),
  setRoadIssueSearchMeta: jest.fn(),
}

jest.mock('@/lib/store', function() {
  var actual = jest.requireActual('@/lib/store')
  return {
    ...actual,
    useAppStore: function(selector: any) {
      var state = {
        gpsLocation: null,
        mapSearchTarget: null,
        connectivity: 'online',
        serviceCategory: 'all',
        serviceRadius: 5000,
        ...mockSetFunctions,
      }
      return selector(state)
    },
  }
})

describe('DashboardMapBootstrap', function() {
  it('renders null (no DOM output)', async function() {
    var container = render(React.createElement(DashboardMapBootstrap))
    expect(container.container.innerHTML).toBe('')
  })
})
