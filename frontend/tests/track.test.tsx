// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/lib/live-tracking', function() { return { subscribeToTracking: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }) } })
jest.mock('@/lib/supabase-auth', function() { return { getSupabaseBrowserClient: function() { return { channel: jest.fn().mockReturnThis(), on: jest.fn().mockReturnThis(), subscribe: jest.fn() } } } })
jest.mock('@/lib/gsap', function() { return { gsap: { to: jest.fn(), fromTo: jest.fn(), timeline: function() { return { to: jest.fn(), fromTo: jest.fn() } } } } })
jest.mock('@gsap/react', function() { return { useGSAP: function() {} } })
jest.mock('next/dynamic', function() { return function() { return function() { return null } } })
jest.mock('next/navigation', function() { return { useRouter: function() { return { push: jest.fn(), back: jest.fn() } }, useSearchParams: function() { return new URLSearchParams() }, useParams: function() { return {} } } })
jest.mock('lucide-react', function() { return new Proxy({}, { get: function() { return function() { return null } } }) })

import { render, screen } from '@testing-library/react'
import React from 'react'
import FamilyTrackingPage from '../app/track/[session_id]/page'

describe('FamilyTrackingPage', function() {
  it('renders session ended when no token present', function() {
    // Use pre-resolved thenable with status: 'fulfilled' so React 19 use() returns synchronously
    var preResolved = { then: function() {}, status: 'fulfilled', value: { session_id: 'test-session' } }
    render(React.createElement(FamilyTrackingPage, { params: preResolved }))
    expect(screen.getByText('Session Ended')).toBeTruthy()
  })
})
