// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import { render, act } from '@testing-library/react'
import React from 'react'

beforeEach(function() {
  document.body.innerHTML = ''
})

afterEach(function() {
  jest.restoreAllMocks()
})

function TestCase() {
  var ref = require('../usePageEntry').usePageEntry()
  return React.createElement('div', { ref, 'data-testid': 'container' },
    React.createElement('div', { 'data-testid': 'child' }, 'A'),
    React.createElement('div', { 'data-testid': 'child2' }, 'B'),
  )
}

describe('usePageEntry', function() {
  it('sets children visible immediately as SSR fallback', function() {
    jest.useFakeTimers()
    render(React.createElement(TestCase))
    var children = document.querySelectorAll('[data-testid^="child"]')
    children.forEach(function(child) {
      expect((child as HTMLElement).style.opacity).toBe('1')
      expect((child as HTMLElement).style.transform).toBe('translateY(0)')
    })
  })

  it('handles null container ref gracefully', function() {
    function NullCase() {
      var ref = require('../usePageEntry').usePageEntry()
      ref.current = null
      return React.createElement('div', { ref })
    }
    expect(function() { render(React.createElement(NullCase)) }).not.toThrow()
  })
})


