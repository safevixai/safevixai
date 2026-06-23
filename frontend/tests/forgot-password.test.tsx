// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/hooks/usePageEntry', function() { return { usePageEntry: function() { return { current: null } } } })
jest.mock('@/lib/store', function() {
  var state = { isAuthenticated: false, setAuth: jest.fn(), setUserProfile: jest.fn() }
  return { useAppStore: Object.assign(function(sel) { return typeof sel === 'function' ? sel(state) : state }, { getState: function() { return state }, setState: jest.fn(), subscribe: jest.fn() }) }
})
jest.mock('@/lib/supabase-auth', function() { return { getSupabaseBrowserClient: function() { return null } } })
jest.mock('@/lib/use-form-validation', function() { return { useFormValidation: function() { return { errors: {}, handleChange: jest.fn(), handleBlur: jest.fn(), handleSubmit: function() { return Promise.resolve(true) } } } } })
jest.mock('@/lib/validation-schemas', function() { return { RESET_RULES: {} } })
jest.mock('next/navigation', function() { return { useRouter: function() { return { push: jest.fn(), back: jest.fn(), replace: jest.fn() } } } })
jest.mock('next/link', function() { return function({ children, ...rest }) { var React = require('react'); return React.createElement('a', rest, children) } })
jest.mock('zustand/react/shallow', function() { return { useShallow: function(fn) { return fn } } })
jest.mock('@/components/ui/Logo', function() { return { Logo: function() { return null } } })
jest.mock('lucide-react', function() { return new Proxy({}, { get: function() { return function() { return null } } }) })

var React = require('react')
var { render } = require('@testing-library/react')
var ForgotPasswordPage = require('../app/forgot-password/page').default

describe('Forgot Password Page', function() {
  it('renders Password Recovery text', function() {
    var { getByText } = render(React.createElement(ForgotPasswordPage))
    expect(getByText('Password Recovery')).toBeTruthy()
  })
})
