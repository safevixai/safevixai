// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/components/ui/TerminalHeader', function() { return { TerminalHeader: function() { return null } } })
jest.mock('@/components/ui/SurfaceCard', function() { return { SurfaceCard: function({ children }) { return children } } })
jest.mock('@/lib/api', function() { return { client: { get: jest.fn().mockResolvedValue({ data: {} }), post: jest.fn().mockResolvedValue({ data: {} }) } } })
jest.mock('next/navigation', function() { return { useRouter: function() { return { push: jest.fn(), back: jest.fn() } }, useSearchParams: function() { return new URLSearchParams() }, useParams: function() { return {} } } })
jest.mock('next/link', function() { return function({ children, ...rest }) { return React.createElement('a', rest, children) } })
jest.mock('next/image', function() { return function(props) { return React.createElement('img', props) } })
jest.mock('lucide-react', function() { return new Proxy({}, { get: function() { return function() { return null } } }) })

import { render, screen } from '@testing-library/react'
import React from 'react'
import TrackPage from '../app/report/track/page'

describe('TrackPage', function() {
  it('renders Complaint Tracker heading', function() {
    render(React.createElement(TrackPage))
    expect(screen.getByText('Complaint Tracker')).toBeTruthy()
  })
})
