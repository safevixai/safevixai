// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

if (typeof global.TextEncoder === 'undefined') {
  var util = require('util')
  global.TextEncoder = util.TextEncoder
}

jest.mock('@/lib/analytics', function() { return { track: { qrCardAction: jest.fn() } } })
jest.mock('qrcode.react', function() {
  var React = require('react')
  return {
    QRCodeSVG: function() {
      return React.createElement('div', { 'data-testid': 'qr-code' }, 'QR')
    },
    __esModule: true,
    default: { QRCodeSVG: function() { return React.createElement('div', null, 'QR') } },
  }
})

import { render, screen } from '@testing-library/react'
import React from 'react'
import QREmergencyCard from '../profile/QREmergencyCard'
import { useAppStore } from '@/lib/store'

describe('QREmergencyCard', function() {
  beforeEach(function() {
    useAppStore.setState({
      userProfile: {
        id: 'test-1',
        name: 'Test User',
        phone: '+911234567890',
        bloodGroup: 'O+',
        vehicleNumber: 'TN01AB1234',
        emergencyContact: '+919876543210',
        emergencyContacts: [],
        medicalConditions: '',
        preferredLanguage: 'en',
      },
    })
  })

  it('renders QR code section', function() {
    render(React.createElement(QREmergencyCard))
    expect(screen.getByText('QR Emergency Card')).toBeTruthy()
  })

  it('shows Card Ready badge when profile complete', function() {
    render(React.createElement(QREmergencyCard))
    expect(screen.getByText('Card Ready')).toBeTruthy()
  })

  it('renders preview button', function() {
    render(React.createElement(QREmergencyCard))
    expect(screen.getByText('Preview')).toBeTruthy()
  })

  it('renders share button', function() {
    render(React.createElement(QREmergencyCard))
    expect(screen.getByText('Share Card')).toBeTruthy()
  })
})
