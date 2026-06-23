// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/hooks/usePageEntry', function() { return { usePageEntry: function() { return { current: null } } } })
jest.mock('@/lib/api', function() { return { fetchNearbyServices: jest.fn().mockResolvedValue([]), submitReport: jest.fn().mockResolvedValue({}) } })
jest.mock('lucide-react', function() { return new Proxy({}, { get: function() { return function() { return null } } }) })

import { render, screen } from '@testing-library/react'
import React from 'react'
import BystanderModePage from '../app/bystander/page'

describe('BystanderModePage', function() {
  it('renders I Witnessed heading', function() {
    render(React.createElement(BystanderModePage))
    expect(screen.getByText('I Witnessed')).toBeTruthy()
  })
})
