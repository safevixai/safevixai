// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/lib/gsap', function() {
  return { gsap: { fromTo: jest.fn(function() { return {} }), to: jest.fn() }, default: { fromTo: jest.fn(), to: jest.fn() } }
})
jest.mock('@gsap/react', function() {
  return { useGSAP: function() {} }
})
jest.mock('cmdk', function() {
  return {
    Command: function Command(props) {
      var React = require('react')
      return React.createElement('div', { 'data-testid': 'cmdk-root' }, props.children)
    },
    CommandInput: function() { return null },
    CommandList: function() { return null },
    CommandEmpty: function() { return null },
    CommandGroup: function() { return null },
    CommandItem: function() { return null },
  }
})

jest.mock('next/navigation', function() {
  return { useRouter: function() { return { push: jest.fn() } }, usePathname: function() { return '/' }, useSearchParams: function() { return new URLSearchParams() } }
})

import { render } from '@testing-library/react'
import React from 'react'
import { CommandPalette } from '../search/CommandPalette'

describe('CommandPalette', function() {
  it('returns null when not open', function() {
    var container = render(React.createElement(CommandPalette))
    expect(container.container.innerHTML).toBe('')
  })
})
