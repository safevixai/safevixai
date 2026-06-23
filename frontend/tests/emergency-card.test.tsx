// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('../app/emergency-card/[userId]/EmergencyCardClient', function() { return { EmergencyCardClient: function() { return null } } })

import { render } from '@testing-library/react'
import React from 'react'
import Page from '../app/emergency-card/[userId]/page'

describe('EmergencyCardPage', function() {
  it('renders without error', function() {
    render(React.createElement(Page, { params: Promise.resolve({ userId: 'test-user' }), searchParams: Promise.resolve({}) }))
  })
})