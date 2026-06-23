// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@gsap/react', () => {
  var React = require('react')
  return {
    useGSAP: function(cb: Function, opts: any) {
      React.useEffect(function() {
        var cleanup = cb()
        return typeof cleanup === 'function' ? cleanup : undefined
      }, [])
    },
  }
})

jest.mock('@/lib/gsap', () => {
  var mockGsap = {
    fromTo: jest.fn().mockReturnValue({ kill: jest.fn() }),
    registerPlugin: jest.fn(),
  }
  return { gsap: mockGsap }
})

import { render } from '@testing-library/react'
import React from 'react'

beforeEach(function() {
  document.body.innerHTML = ''
  window.matchMedia = jest.fn().mockImplementation(function(query: string) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }
  })
})

afterEach(function() {
  jest.restoreAllMocks()
  jest.isolateModules
})

function TestCase() {
  var ref = require('../useSplitTextEntry').useSplitTextEntry()
  return React.createElement('h1', { ref, 'data-testid': 'heading' }, 'Hello World')
}

describe('useSplitTextEntry', function() {
  it('returns a heading ref', function() {
    var result = require('@testing-library/react').renderHook(function() { return require('../useSplitTextEntry').useSplitTextEntry() }).result
    expect(result.current).toHaveProperty('current')
  })

  it('falls back to DOM split when SplitText is unavailable', function() {
    jest.useFakeTimers()
    render(React.createElement(TestCase))
    var gsap = require('@/lib/gsap').gsap
    expect(gsap.fromTo).toHaveBeenCalled()
  })
})


