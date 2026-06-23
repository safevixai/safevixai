// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('../app/first-aid/FirstAidClient', function() { return { FirstAidClient: function() { return null } } })
jest.mock('@/public/offline-data/first-aid.json', function() { return [] })

import { render } from '@testing-library/react'
import React from 'react'
import Page from '../app/first-aid/page'

describe('FirstAidPage', function() {
  it('renders without error', function() {
    var { container } = render(React.createElement(Page))
    expect(container).toBeTruthy()
  })
})
