// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('next/navigation', function() { return { useRouter: function() { return { push: jest.fn(), back: jest.fn() } }, useParams: function() { return { slug: 'test' } }, useSearchParams: function() { return new URLSearchParams() } } })
jest.mock('next/link', function() { return function({ children, ...rest }) { return React.createElement('a', rest, children) } })
jest.mock('@/components/guide/ContactChannels', function() { return { ContactChannels: function() { return null } } })
jest.mock('@/components/guide/LeadershipCard', function() { return { LeadershipCard: function() { return null } } })
jest.mock('@/lib/api', function() { return { client: { get: jest.fn().mockResolvedValue({ data: {} }), post: jest.fn().mockResolvedValue({ data: {} }) }, fetchMunicipalityBySlug: jest.fn().mockResolvedValue({ name: 'Test Municipality', slug: 'test', shortName: 'TM', city: 'Test City', stateCode: 'TN', municipalityType: 'municipality', wardCount: 10, population: 100000, helplinePhone: null, centroidLat: 0, centroidLon: 0, headquartersAddress: null, email: null, websiteUrl: null, whatsappNumber: null, appName: null, appUrl: null, grievancePortalUrl: null, mayorName: null, mayorPhotoUrl: null, commissionerName: null, commissionerPhone: null, areaSqkm: null, description: null, servicesOffered: null }) } })
jest.mock('lucide-react', function() { return new Proxy({}, { get: function() { return function() { return null } } }) })

import { render, screen } from '@testing-library/react'
import React from 'react'
import Page from '../app/guide/[slug]/page'

describe('MunicipalityDetailPage', function() {
  it('renders Back to Guide link text', async function() {
    render(React.createElement(Page))
    expect(await screen.findByText('Back to Guide')).toBeTruthy()
  })
})
