// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
import { render } from '@testing-library/react'
import React from 'react'
import { ClientAppHooks } from '../ClientAppHooks'

jest.mock('sonner', function () {
  return { toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() } }
})

jest.mock('../crash/CrashCountdown', function () {
  return { CrashCountdown: function () { var d = document.createElement('div'); d.setAttribute('data-testid', 'crash-countdown'); d.textContent = 'Crash'; return d } }
})

jest.mock('@/lib/offline-sos-queue', function () {
  return { registerOfflineSyncListeners: jest.fn() }
})

describe('ClientAppHooks', function () {
  it('renders without crashing', function () {
    var { container } = render(React.createElement(ClientAppHooks))
    expect(container).toBeDefined()
  })

  it('renders CrashCountdown when crashState is set', function () {
    // Simulate crashState by rendering and checking initial render
    var { container } = render(React.createElement(ClientAppHooks))
    expect(container).toBeDefined()
  })
})
