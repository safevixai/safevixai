// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/hooks/usePageEntry', function() { return { usePageEntry: function() { return { current: null } } } })
jest.mock('react-i18next', function() { return { useTranslation: function() { return { t: function(k, fb) { return typeof fb === 'string' ? fb : k } } } } })
jest.mock('../app/landing/hooks/useSmoothScroll', function() { return { useSmoothScroll: function() {} } })
jest.mock('../app/landing/hooks/useBackendPrewarm', function() { return { useBackendPrewarm: function() {} } })
jest.mock('../app/landing/components/LandingNavbar', function() { return function() { return null } })
jest.mock('../app/landing/components/HeroSection', function() { return function() { return null } })
jest.mock('../app/landing/components/CrisisSection', function() { return function() { return null } })
jest.mock('../app/landing/components/HowItWorks', function() { return function() { return null } })
jest.mock('../app/landing/components/CoreModules', function() { return function() { return null } })
jest.mock('../app/landing/components/CommandCenter', function() { return function() { return null } })
jest.mock('../app/landing/components/AIInfrastructure', function() { return function() { return null } })
jest.mock('../app/landing/components/NationalNetwork', function() { return function() { return null } })
jest.mock('../app/landing/components/TechStack', function() { return function() { return null } })
jest.mock('../app/landing/components/MissionSection', function() { return function() { return null } })
jest.mock('../app/landing/components/CTASection', function() { return function() { return null } })
jest.mock('../app/landing/components/LandingFooter', function() { return function() { return null } })

var React = require('react')
var { render } = require('@testing-library/react')
var LandingPage = require('../app/landing/page').default

describe('Landing Page', function() {
  it('renders sr-only heading SafeVixAI - Road Safety Platform', function() {
    var { getByText } = render(React.createElement(LandingPage))
    expect(getByText('SafeVixAI - Road Safety Platform')).toBeTruthy()
  })
})
