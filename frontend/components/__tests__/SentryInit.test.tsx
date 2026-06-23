// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import { render } from '@testing-library/react'
import React from 'react'
import { SentryInit } from '../providers/SentryInit'

describe('SentryInit', function() {
  it('renders nothing', function() {
    var { container } = render(React.createElement(SentryInit))
    expect(container.innerHTML).toBe('')
  })
})
