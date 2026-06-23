// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('maplibre-gl', function () {
  var mockMarker = {
    setLngLat: jest.fn().mockImplementation(function () { return mockMarker }),
    addTo: jest.fn().mockImplementation(function () { return mockMarker }),
    on: jest.fn().mockImplementation(function () { return mockMarker }),
    getLngLat: jest.fn().mockReturnValue({ lat: 13, lng: 80 }),
    remove: jest.fn(),
  }
  return {
    Map: jest.fn(function () { return {
      addControl: jest.fn(),
      remove: jest.fn(),
      flyTo: jest.fn(),
      on: jest.fn(),
    } }),
    Marker: jest.fn(function () { return mockMarker }),
    NavigationControl: jest.fn(),
  }
})

jest.mock('react-i18next', function () { return { useTranslation: function () { return { t: function (k: string, fallback?: string) { return typeof fallback === 'string' ? fallback : k } } } } })

var mockFetch = jest.fn()
global.fetch = mockFetch

describe('LocationPickerInner', function () {
  beforeEach(function () {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true, json: async function () { return { locality: 'Chennai', city: 'Chennai', principalSubdivision: 'Tamil Nadu' } } })
  })

  it('renders map container and address display', async function () {
    var LocationPickerInner = (await import('../report/LocationPickerInner')).default
    var onLocationChange = jest.fn()
    render(React.createElement(LocationPickerInner, { lat: 13, lon: 80, onLocationChange: onLocationChange, className: 'test-class' }))
    expect(screen.getByText('Drag the pin to adjust location')).toBeInTheDocument()
  })

  it('renders with zero coordinates and shows detecting', async function () {
    var LocationPickerInner = (await import('../report/LocationPickerInner')).default
    var onLocationChange = jest.fn()
    render(React.createElement(LocationPickerInner, { lat: 0, lon: 0, onLocationChange: onLocationChange }))
    expect(screen.getByText('Detecting location...')).toBeInTheDocument()
    expect(screen.getByText('Drag the pin to adjust location')).toBeInTheDocument()
  })

  it('displays geocoded address with non-zero coords', async function () {
    var LocationPickerInner = (await import('../report/LocationPickerInner')).default
    var onLocationChange = jest.fn()
    render(React.createElement(LocationPickerInner, { lat: 13, lon: 80, onLocationChange: onLocationChange }))
    await screen.findByText('Chennai, Chennai, Tamil Nadu')
  })
})
