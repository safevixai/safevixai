// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('next/navigation', function() { return { useRouter: function() { return { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }, useSearchParams: function() { return new URLSearchParams() } } })
jest.mock('lucide-react', function() { return new Proxy({}, { get: function() { return function() { return null } } }) })

import { render } from '@testing-library/react'
import React from 'react'
import Page from '../app/share-receive/page'

describe('ShareReceivePage', function() {
  it('renders without error', function() {
    var { container } = render(React.createElement(Page))
    expect(container).toBeTruthy()
  })
})
