// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/components/ui/TerminalHeader', function() { return { TerminalHeader: function() { return null } } })
jest.mock('@/components/guide/MunicipalityCard', function() { return function() { return null } })
jest.mock('@/lib/api', function() { return { fetchMunicipalities: jest.fn().mockResolvedValue({ municipalities: [] }), fetchNearbyMunicipalities: jest.fn().mockResolvedValue([]) } })
jest.mock('react-i18next', function() { return { useTranslation: function() { return { t: function(k, fb) { return typeof fb === 'string' ? fb : k } } } } })
jest.mock('lucide-react', function() { return new Proxy({}, { get: function() { return function() { return null } } }) })

import { render, screen } from '@testing-library/react'
import React from 'react'
import Page from '../app/guide/page'

describe('GuidePage', function() {
  it('renders Municipality Guide sr-only heading', function() {
    render(React.createElement(Page))
    expect(screen.getByText('Municipality Guide')).toBeTruthy()
  })
})
