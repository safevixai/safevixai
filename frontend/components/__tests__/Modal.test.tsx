// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
jest.mock('@gsap/react', function () {
  return { useGSAP: jest.fn() }
})

import { render } from '@testing-library/react'
import React from 'react'
import { Modal } from '../ui/Modal'

describe('Modal', function () {
  it('returns null when not open', function () {
    var container = render(React.createElement(Modal, { open: false, onClose: jest.fn(), title: 'Test' }, null))
    expect(container.container.innerHTML).toBe('')
  })

  it('renders when open', function () {
    var container = render(React.createElement(Modal, { open: true, onClose: jest.fn(), title: 'Test Modal' }, React.createElement('p', null, 'Content')))
    expect(container.container.querySelector('[role="dialog"]')).toBeInTheDocument()
  })

  it('renders with footer', function () {
    var container = render(React.createElement(Modal, { open: true, onClose: jest.fn(), title: 'Test', footer: React.createElement('button', null, 'Confirm') }, null))
    expect(container.container.textContent).toContain('Confirm')
  })

  it('renders with different sizes', function () {
    var sm = render(React.createElement(Modal, { open: true, onClose: jest.fn(), title: 'SM', size: 'sm' }, null))
    var lg = render(React.createElement(Modal, { open: true, onClose: jest.fn(), title: 'LG', size: 'lg' }, null))
    expect(sm.container.querySelector('[role="dialog"]')).toBeInTheDocument()
    expect(lg.container.querySelector('[role="dialog"]')).toBeInTheDocument()
  })
})
