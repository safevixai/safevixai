// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
import { render, screen } from '@testing-library/react'
import React from 'react'
import InstallPrompt from '../InstallPrompt'

describe('InstallPrompt', function () {
  it('returns null when not prompted', function () {
    var container = render(React.createElement(InstallPrompt, null))
    // Component returns null initially since no beforeinstallprompt event fired
    expect(container.container.innerHTML).toBe('')
  })

  it('registers event listeners on mount', function () {
    var addEventListener = jest.spyOn(window, 'addEventListener')
    render(React.createElement(InstallPrompt, null))
    expect(addEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    expect(addEventListener).toHaveBeenCalledWith('appinstalled', expect.any(Function))
    addEventListener.mockRestore()
  })
})
