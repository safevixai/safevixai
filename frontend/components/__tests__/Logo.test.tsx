// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import { render } from '@testing-library/react'
import React from 'react'
import { Logo } from '../ui/Logo'

describe('Logo', function() {
  it('renders SVG by default', function() {
    var { container } = render(React.createElement(Logo))
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders with custom size', function() {
    var { container } = render(React.createElement(Logo, { size: 80 }))
    var wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.width).toBe('80px')
    expect(wrapper.style.height).toBe('80px')
  })

  it('renders in online status', function() {
    var { container } = render(React.createElement(Logo, { status: 'online' }))
    expect(container.querySelector('svg')).toBeTruthy()
    expect(container.querySelector('[class*="group"]')).toBeTruthy()
  })

  it('renders in emergency status', function() {
    var { container } = render(React.createElement(Logo, { status: 'emergency' }))
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders in offline status without glow', function() {
    var { container } = render(React.createElement(Logo, { status: 'offline' }))
    expect(container.querySelector('svg')).toBeTruthy()
    var glow = container.querySelector('[class*="blur-xl"]')
    expect(glow).toBeNull()
  })

  it('does not add interactive class when interactive is false', function() {
    var { container } = render(React.createElement(Logo, { interactive: false }))
    var wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).not.toContain('group')
  })

  it('renders with custom className', function() {
    var { container } = render(React.createElement(Logo, { className: 'custom-class' }))
    var wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('custom-class')
  })
})
