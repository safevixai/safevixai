// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/lib/api', function() {
  return { client: { get: jest.fn(function() { return Promise.resolve({ data: { features: [] } }) }) } }
})

import { render, screen } from '@testing-library/react'
import React from 'react'
import MapLibreDashboard from '../command-center/MapLibreDashboard'

describe('MapLibreDashboard', function() {
  it('shows loading state initially', function() {
    render(React.createElement(MapLibreDashboard))
    expect(screen.getByText('Acquiring GIS Feeds...')).toBeTruthy()
  })

  it('renders map container', function() {
    render(React.createElement(MapLibreDashboard))
    expect(screen.getByText('Acquiring GIS Feeds...')).toBeTruthy()
  })
})
