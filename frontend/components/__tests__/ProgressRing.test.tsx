// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
jest.mock('@gsap/react', function () { return { useGSAP: jest.fn() } })

import { render } from '@testing-library/react'
import React from 'react'
import { ProgressRing } from '../crash/ProgressRing'

describe('ProgressRing', function () {
  it('renders with default total', function () {
    var container = render(React.createElement(ProgressRing, { seconds: 15 }))
    expect(container.container.querySelector('svg')).toBeInTheDocument()
    expect(container.container.querySelector('[aria-label="15 seconds remaining"]')).toBeInTheDocument()
  })

  it('renders with 5 seconds', function () {
    render(React.createElement(ProgressRing, { seconds: 5 }))
    expect(document.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with 1 second', function () {
    render(React.createElement(ProgressRing, { seconds: 1, size: 64 }))
    expect(document.querySelector('svg')).toBeInTheDocument()
  })
})
