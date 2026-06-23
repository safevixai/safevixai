// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('next/navigation', function() {
  return { useRouter: function() { return { push: jest.fn() } }, usePathname: function() { return '/settings' }, useSearchParams: function() { return new URLSearchParams() } }
})
jest.mock('next/link', function() {
  return function Link({ children }: { children: React.ReactNode }) { return children }
})
jest.mock('@/lib/gsap', function() {
  return { gsap: { fromTo: jest.fn(), to: jest.fn(), globalTimeline: { timeScale: jest.fn() }, killTweensOf: jest.fn() }, default: { fromTo: jest.fn(), to: jest.fn() } }
})
jest.mock('@gsap/react', function() { return { useGSAP: function() {} } })
jest.mock('@/lib/navigation-launch', function() { return { setPreferredNavApp: jest.fn() } })
jest.mock('posthog-js', function() { return { opt_out_capturing: jest.fn(), opt_in_capturing: jest.fn() } })
jest.mock('@/lib/analytics-provider', function() { return { ANALYTICS_CONSENT_KEY: 'analytics_consent' } })

import { render, screen } from '@testing-library/react'
import React from 'react'
import SettingsPage from '../app/settings/page'
import { useAppStore } from '@/lib/store'

describe('Settings Page', function() {
  beforeEach(function() {
    useAppStore.setState({
      soundsEnabled: true,
      speedAlert: true,
      hazardNotifs: true,
      locationTracking: false,
      sosVibration: true,
      crashDetectionEnabled: false,
      showSatellite: false,
      showTraffic: false,
      showSafeSpaces: true,
      showHazardHeatmap: false,
      showEmergencyServices: true,
      aiMode: 'online',
      userProfile: { name: 'TestUser', bloodGroup: 'O+', vehicleNumber: 'TN01AB1234', emergencyContact: '+919876543210', emergencyContacts: [], medicalConditions: '', preferredLanguage: 'en', id: 'test-1', phone: '+911234567890' },
    })
  })

  it('renders settings page heading', function() {
    render(React.createElement(SettingsPage))
    var headings = screen.getAllByText(/Settings/)
    expect(headings.length).toBeGreaterThan(0)
  })

  it('renders Sentinel Active status', function() {
    render(React.createElement(SettingsPage))
    expect(screen.getByText('Sentinel Active')).toBeTruthy()
  })
})
