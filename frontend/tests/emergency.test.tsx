// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/components/ThemeProvider', function() { return { useTheme: function() { return { theme: 'dark' } } } })
jest.mock('@/components/dashboard/TopSearch', function() { return function() { return null } })
jest.mock('@/components/dashboard/SystemHeader', function() { return function() { return null } })
jest.mock('@/lib/store', function() { return { useUserProfile: function() { return null } } })
jest.mock('@/lib/gsap', function() { return { gsap: { fromTo: jest.fn(), to: jest.fn(), set: jest.fn() } } })
jest.mock('@gsap/react', function() { return { useGSAP: function() {} } })
jest.mock('@/hooks/useSplitTextEntry', function() { return { useSplitTextEntry: function() { return null } } })
jest.mock('@/lib/public-env', function() { return { PUBLIC_API_BASE_URL: '', PUBLIC_CHATBOT_BASE_URL: '' } })
jest.mock('lucide-react', function() { return new Proxy({}, { get: function() { return function() { return null } } }) })
jest.mock('next/dynamic', function() { return function() { return function() { return null } } })

import { render, screen } from '@testing-library/react'
import React from 'react'
import Page from '../app/emergency/page'

describe('EmergencyProtocolsPage', function() {
  it('renders Protocol Terminal heading', function() {
    render(React.createElement(Page))
    expect(screen.getByText('Protocol Terminal')).toBeTruthy()
  })
})
