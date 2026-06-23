// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/hooks/usePageEntry', function() { return { usePageEntry: function() { return { current: null } } } })
jest.mock('next/link', function() { return function({ children, ...rest }) { var React = require('react'); return React.createElement('a', rest, children) } })
jest.mock('react-i18next', function() { return { useTranslation: function() { return { t: function(k, fb) { return typeof fb === 'string' ? fb : k } } } } })
jest.mock('@/components/dashboard/SystemHeader', function() { return function() { return null } })
jest.mock('lucide-react', function() { return new Proxy({}, { get: function() { return function() { return null } } }) })

var React = require('react')
var { render } = require('@testing-library/react')
var OfflinePage = require('../app/offline/page').default

describe('Offline Page', function() {
  it('renders Offline Mode text', function() {
    var { getByText } = render(React.createElement(OfflinePage))
    expect(getByText('Offline Mode')).toBeTruthy()
  })
})
