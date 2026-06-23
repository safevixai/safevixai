// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('next/navigation', function() {
  return { useRouter: function() { return { push: jest.fn() } }, usePathname: function() { return '/profile' }, useSearchParams: function() { return new URLSearchParams() } }
})
jest.mock('next/link', function() {
  return function Link({ children }: { children: React.ReactNode }) { return children }
})
jest.mock('@/lib/gsap', function() {
  return { gsap: { fromTo: jest.fn(), to: jest.fn(), globalTimeline: { timeScale: jest.fn() }, killTweensOf: jest.fn() }, default: { fromTo: jest.fn(), to: jest.fn() } }
})
jest.mock('@gsap/react', function() { return { useGSAP: function() {} } })
jest.mock('@/lib/analytics', function() { return { track: jest.fn() } })
jest.mock('sonner', function() { return { toast: { error: jest.fn(), success: jest.fn() } } })
jest.mock('@/lib/guest-auth', function() {
  return { getOrCreateGuestId: function() { return 'guest-1' }, getGuestProfile: function() { return null }, updateGuestProfile: jest.fn(), isGuestMode: function() { return false } }
})

import { render, screen } from '@testing-library/react'
import React from 'react'
import ProfilePage from '../app/profile/page'
import { useAppStore } from '@/lib/store'

describe('Profile Page', function() {
  beforeEach(function() {
    useAppStore.setState({
      userProfile: { name: 'TestUser', bloodGroup: 'O+', vehicleNumber: 'TN01AB1234', emergencyContact: '+919876543210', emergencyContacts: [], medicalConditions: '', preferredLanguage: 'en', id: 'test-1', phone: '+911234567890' },
      crashDetectionEnabled: false,
      isAuthenticated: true,
    })
  })

  it('renders profile page sr-only heading', function() {
    render(React.createElement(ProfilePage))
    expect(screen.getByText('User Profile')).toBeTruthy()
  })

  it('renders main heading', function() {
    render(React.createElement(ProfilePage))
    expect(screen.getByText('Operator Identity Matrix')).toBeTruthy()
  })

  it('renders QR Emergency Card section', function() {
    var { container } = render(React.createElement(ProfilePage))
    expect(container.textContent).toContain('QR Emergency Card')
  })
})
