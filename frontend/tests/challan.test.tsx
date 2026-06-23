// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/hooks/usePageEntry', function() { return { usePageEntry: function() { return { current: null } } } })
jest.mock('@gsap/react', function() { return { useGSAP: jest.fn() } })
jest.mock('@/lib/gsap', function() { return { gsap: { from: jest.fn(), to: jest.fn(), fromTo: jest.fn(), set: jest.fn() } } })
jest.mock('@/components/dashboard/TopSearch', function() { return function() { return null } })
jest.mock('@/components/dashboard/SystemHeader', function() { return function() { return null } })
jest.mock('@/lib/store', function() {
  var state = {
    challanState: { violation: '183', vehicle: '4W', jurisdiction: 'Tamil Nadu (TN)', isRepeat: false },
    setChallanState: jest.fn(),
    garageVehicles: [],
    lastSyncedGarage: null,
    riskAnalysis: { estimatedLiability: null, riskScore: null, riskLevel: null, predictedViolationsCount: null },
    setGarageVehicles: jest.fn(),
    setLastSyncedGarage: jest.fn(),
    setRiskAnalysis: jest.fn()
  }
  return { useAppStore: Object.assign(function(sel) { return typeof sel === 'function' ? sel(state) : state }, { getState: function() { return state }, setState: jest.fn(), subscribe: jest.fn() }) }
})
jest.mock('swr', function() { return { __esModule: true, default: function() { return { data: null, isLoading: false, error: null, mutate: jest.fn() } } } })
jest.mock('@/lib/api', function() { return { calculateChallan: jest.fn(), syncGarage: jest.fn(), predictFineLiability: jest.fn(), draftDisputeAppeal: jest.fn() } })
jest.mock('@/lib/challan-metadata', function() { return { loadChallanMetadata: jest.fn() } })
jest.mock('zustand/react/shallow', function() { return { useShallow: function(fn) { return fn } } })
jest.mock('@/lib/analytics', function() { return { track: { challanCalculated: jest.fn(), chatbotQueried: jest.fn() } } })
jest.mock('@/hooks/useSwipe', function() { return { useSwipe: function() { return { onTouchStart: jest.fn(), onTouchEnd: jest.fn() } } } })
jest.mock('react-i18next', function() { return { useTranslation: function() { return { t: function(k, fb) { return typeof fb === 'string' ? fb : k } } } } })
jest.mock('lucide-react', function() { return new Proxy({}, { get: function() { return function() { return null } } }) })

var React = require('react')
var { render } = require('@testing-library/react')
var ChallanPage = require('../app/challan/page').default

describe('Challan Page', function() {
  it('renders Estimation Terminal heading', function() {
    var { getByText } = render(React.createElement(ChallanPage))
    expect(getByText('Estimation Terminal')).toBeTruthy()
  })
})
