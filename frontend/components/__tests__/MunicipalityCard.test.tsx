// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MunicipalityCard } from '../guide/MunicipalityCard'

describe('MunicipalityCard', function () {
  it('renders municipality name', function () {
    var muni = { slug: 'chennai', name: 'Chennai', shortName: 'Chennai', city: 'Chennai', stateCode: 'TN', municipalityType: 'Corporation', wardCount: 200, population: 12000000, helplinePhone: '1913', centroidLat: 13.08, centroidLon: 80.27, distanceKm: 0 }
    render(React.createElement(MunicipalityCard, { municipality: muni }))
    expect(screen.getByText('Chennai')).toBeInTheDocument()
  })

  it('renders with helpline', function () {
    var muni = { slug: 'mumbai', name: 'Mumbai', shortName: 'Mumbai', city: 'Mumbai', stateCode: 'MH', municipalityType: 'Corporation', wardCount: 0, population: null, helplinePhone: '1916', centroidLat: 19.07, centroidLon: 72.87, distanceKm: null }
    render(React.createElement(MunicipalityCard, { municipality: muni }))
    expect(screen.getByText('1916')).toBeInTheDocument()
  })
})
