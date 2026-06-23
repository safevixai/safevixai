// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
import React from 'react'

var mockPosthogInit = jest.fn()
var mockPosthog = { init: mockPosthogInit, capture: jest.fn() }
var mockPostHogProvider = function MockPostHogProvider(_a) { var children = _a.children; return children }

jest.mock('posthog-js', function () { return { __esModule: true, default: mockPosthog } })
jest.mock('posthog-js/react', function () { return { __esModule: true, PostHogProvider: mockPostHogProvider } })

import { render, screen } from '@testing-library/react'
import { AnalyticsProvider } from '../analytics-provider'

var originalEnv = process.env

beforeEach(function () {
  process.env = { ...originalEnv }
  localStorage.clear()
})

afterEach(function () {
  process.env = originalEnv
})

describe('AnalyticsProvider', function () {
  it('renders children when render', function () {
    render(React.createElement(AnalyticsProvider, null, React.createElement('div', { 'data-testid': 'child' }, 'Hello')))
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renders children without PostHog when no key', function () {
    render(React.createElement(AnalyticsProvider, null, React.createElement('div', { 'data-testid': 'child' }, 'Hello')))
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})
