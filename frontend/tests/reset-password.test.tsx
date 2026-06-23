// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/hooks/usePageEntry', function() { return { usePageEntry: function() { return { current: null } } } })
jest.mock('@/lib/store', function() {
  var state = { isAuthenticated: false, setAuth: jest.fn(), setUserProfile: jest.fn() }
  return { useAppStore: Object.assign(function(sel) { return typeof sel === 'function' ? sel(state) : state }, { getState: function() { return state }, setState: jest.fn(), subscribe: jest.fn() }) }
})
jest.mock('@/lib/supabase-auth', function() { return { getSupabaseBrowserClient: function() { return null } } })
jest.mock('@/lib/public-env', function() { return { PUBLIC_API_BASE_URL: 'http://localhost:8000' } })
jest.mock('next/navigation', function() { return { useRouter: function() { return { push: jest.fn(), back: jest.fn(), replace: jest.fn() } } } })
jest.mock('next/link', function() { return function({ children, ...rest }) { var React = require('react'); return React.createElement('a', rest, children) } })
jest.mock('zustand/react/shallow', function() { return { useShallow: function(fn) { return fn } } })
jest.mock('@/components/ui/Logo', function() { return { Logo: function() { return null } } })
jest.mock('lucide-react', function() { return new Proxy({}, { get: function() { return function() { return null } } }) })

var React = require('react')
var { render } = require('@testing-library/react')
var ResetPasswordPage = require('../app/reset-password/page').default

describe('Reset Password Page', function() {
  it('renders Set New Password text', function() {
    var { getByText } = render(React.createElement(ResetPasswordPage))
    expect(getByText('Set New Password')).toBeTruthy()
  })
})
