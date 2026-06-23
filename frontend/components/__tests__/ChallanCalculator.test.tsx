// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
import { render, screen } from '@testing-library/react'
import React from 'react'
import ChallanCalculator from '../ChallanCalculator'

// Required mocks for ChallanCalculator dependencies
jest.mock('@/lib/api', function () {
  return { calculateChallan: jest.fn().mockResolvedValue({ section: '185', description: 'Drunk Driving', amount_due: 10000, source: 'online' }) }
})

jest.mock('@/lib/client-logger', function () {
  return { logClientError: jest.fn() }
})

jest.mock('@/lib/analytics', function () {
  return { track: { challanCalculated: jest.fn() } }
})

jest.mock('@/lib/haptics', function () {
  return { haptics: { light: jest.fn() } }
})

jest.mock('@/lib/intl-formatters', function () {
  return { formatCurrency: jest.fn(function (v: number) { return '₹' + v.toLocaleString() }) }
})

jest.mock('@gsap/react', function () {
  return { useGSAP: jest.fn(function (cb: any, _deps: any) { if (typeof cb === 'function') cb() }) }
})

describe('ChallanCalculator', function () {
  it('renders the calculator form', function () {
    var { container } = render(React.createElement(ChallanCalculator))
    expect(container).toBeDefined()
    // Check for key UI elements
    expect(screen.getByText(/Violation Protocol|01\. Violation/)).toBeDefined()
  })

  it('renders violation selection grid', function () {
    render(React.createElement(ChallanCalculator))
    var buttons = screen.getAllByRole('radio')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders state jurisdiction selector', function () {
    render(React.createElement(ChallanCalculator))
    var selects = screen.getAllByRole('combobox')
    expect(selects.length).toBeGreaterThan(0)
  })
})
