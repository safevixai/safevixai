// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/lib/gsap', function() {
  return {
    gsap: { fromTo: jest.fn(), to: jest.fn(), killTweensOf: jest.fn() },
    ScrollTrigger: { getAll: jest.fn(function() { return [] }), refresh: jest.fn() },
    default: { fromTo: jest.fn(), to: jest.fn() },
  }
})

jest.mock('next/navigation', function() {
  return { usePathname: function() { return '/' } }
})

import { render, screen } from '@testing-library/react'
import React from 'react'
import { GSAPProvider } from '../providers/GSAPProvider'

beforeAll(function() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: function() {
      return { matches: false, addEventListener: function() {}, removeEventListener: function() {}, media: '' }
    },
  })
})

describe('GSAPProvider', function() {
  it('renders children', function() {
    render(React.createElement(GSAPProvider, null, React.createElement('div', { 'data-testid': 'child' }, 'Hello')))
    expect(screen.getByTestId('child')).toBeTruthy()
  })
})
