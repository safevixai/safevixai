// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
jest.mock('@gsap/react', function () { return { useGSAP: jest.fn() } })
jest.mock('next/navigation', function () { return { useRouter: function () { return { push: jest.fn() } } } })

import { render, screen } from '@testing-library/react'
import React from 'react'
import FloatingSidebarControls from '../dashboard/FloatingSidebarControls'

describe('FloatingSidebarControls', function () {
  it('renders without crashing', function () {
    var container = render(React.createElement(FloatingSidebarControls, null))
    expect(container.container.querySelector('.sos-rings')).toBeInTheDocument()
  })

  it('renders SOS button', function () {
    render(React.createElement(FloatingSidebarControls, null))
    expect(screen.getByText('SOS')).toBeInTheDocument()
  })
})
