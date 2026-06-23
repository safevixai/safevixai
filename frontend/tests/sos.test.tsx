// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/hooks/usePageEntry', function() { return { usePageEntry: function() { return { current: null } } } })
jest.mock('@/lib/store', function() {
  return {
    useAppStore: Object.assign(
      function(sel) {
        var state = { userProfile: { name: 'Test', bloodGroup: 'O+' }, soundsEnabled: true }
        return typeof sel === 'function' ? sel(state) : state
      },
      { getState: function() { return {} }, setState: jest.fn(), subscribe: jest.fn() }
    )
  }
})
jest.mock('next/navigation', function() { return { useRouter: function() { return { push: jest.fn(), back: jest.fn() } }, useSearchParams: function() { return new URLSearchParams() } } })
jest.mock('next/image', function() { return function() { return null } })
jest.mock('zustand/react/shallow', function() { return { useShallow: function(fn) { return fn } } })
jest.mock('@/lib/api', function() { return { triggerSos: jest.fn().mockResolvedValue({}) } })
jest.mock('@/lib/offline-sos-queue', function() { return { enqueueSOS: jest.fn().mockResolvedValue(undefined) } })
jest.mock('@/lib/sos-share', function() { return { generateSosWhatsAppLink: jest.fn().mockResolvedValue(''), generateSosSmsLink: jest.fn().mockReturnValue('') } })
jest.mock('@/lib/live-tracking', function() { return { startFamilyTracking: jest.fn().mockResolvedValue({ tracking_url: '', session_id: '' }), beginLocationBroadcast: jest.fn().mockReturnValue(function() {}), notifyContactsViaWhatsApp: jest.fn() } })
jest.mock('@/components/dashboard/TopSearch', function() { return function() { return null } })
jest.mock('@/components/dashboard/SystemHeader', function() { return function() { return null } })
jest.mock('@/lib/haptics', function() { return { haptics: { medium: jest.fn(), sos: jest.fn() } } })
jest.mock('@/lib/sounds', function() { return { sounds: { sosSent: jest.fn() } } })
jest.mock('@/lib/analytics', function() { return { track: { trackingShared: jest.fn() } } })
jest.mock('lucide-react', function() { return new Proxy({}, { get: function() { return function() { return null } } }) })

import { render, screen } from '@testing-library/react'
import React from 'react'
import Page from '../app/sos/page'

describe('SOSPage', function() {
  it('renders Emergency SOS Terminal heading', function() {
    render(React.createElement(Page))
    expect(screen.getByText('Emergency SOS Terminal')).toBeTruthy()
  })
})
