// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('next/navigation', function() { return { useRouter: function() { return { push: jest.fn(), back: jest.fn() } }, useSearchParams: function() { return new URLSearchParams() } } })
jest.mock('@/components/ui/SurfaceCard', function() { return { SurfaceCard: function({ children }) { return children } } })
jest.mock('@/components/dashboard/SystemHeader', function() { return function() { return null } })
jest.mock('lucide-react', function() { return new Proxy({}, { get: function() { return function() { return null } } }) })

import { render, screen } from '@testing-library/react'
import React from 'react'
import Page from '../app/privacy/page'

describe('PrivacyPolicyPage', function() {
  it('renders Privacy Policy text', function() {
    render(React.createElement(Page))
    expect(screen.getByText('Privacy Policy')).toBeTruthy()
  })
})
