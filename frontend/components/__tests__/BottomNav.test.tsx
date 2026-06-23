// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
jest.mock('@gsap/react', function () { return { useGSAP: jest.fn() } })

import { render, screen } from '@testing-library/react'
import React from 'react'
import BottomNav from '../dashboard/BottomNav'

describe('BottomNav', function () {
  it('renders navigation items', function () {
    render(React.createElement(BottomNav, null))
    expect(screen.getByText('Map')).toBeInTheDocument()
    expect(screen.getByText('AI Chat')).toBeInTheDocument()
    expect(screen.getByText('Locator')).toBeInTheDocument()
  })

  it('renders with aria label', function () {
    render(React.createElement(BottomNav, null))
    expect(screen.getByLabelText('Main navigation')).toBeInTheDocument()
  })
})
