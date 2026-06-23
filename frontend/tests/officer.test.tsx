// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/components/ui/TerminalHeader', function() { return { TerminalHeader: function() { return null } } })
jest.mock('@/components/ui/SurfaceCard', function() { return { SurfaceCard: function({ children }) { return children } } })
jest.mock('@/lib/api', function() { return { client: { get: jest.fn().mockResolvedValue({ data: {} }), post: jest.fn().mockResolvedValue({ data: {} }) } } })
jest.mock('@/lib/store', function() {
  return { useAppStore: Object.assign(function(sel) { var state = { userProfile: { name: 'Test Officer' }, isAuthenticated: true, clearAuth: jest.fn() }; return typeof sel === 'function' ? sel(state) : state }, { getState: function() { return { userProfile: { name: 'Test Officer' } } }, setState: jest.fn(), subscribe: jest.fn() }) }
})
jest.mock('next/navigation', function() { return { useRouter: function() { return { push: jest.fn(), back: jest.fn(), replace: jest.fn() } }, useSearchParams: function() { return new URLSearchParams() }, useParams: function() { return {} } } })
jest.mock('next/image', function() { return function(props) { return React.createElement('img', props) } })
jest.mock('zustand/react/shallow', function() { return { useShallow: function(fn) { return fn } } })
jest.mock('lucide-react', function() { return new Proxy({}, { get: function() { return function() { return null } } }) })

import { render, screen } from '@testing-library/react'
import React from 'react'
import OfficerFieldClient from '../app/officer/page'

describe('OfficerFieldClient', function() {
  it('renders Field Response Uplink heading', function() {
    render(React.createElement(OfficerFieldClient))
    expect(screen.getByText('Field Response Uplink')).toBeTruthy()
  })
})
