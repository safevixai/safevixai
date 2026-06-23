// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../lib/emergency-numbers', () => ({
  PRIMARY_EMERGENCY_BAR: [
    { id: 'police', service: '100', label: 'Police', color: 'var(--accent-blue)' },
    { id: 'ambulance', service: '102', label: 'Ambulance', color: 'var(--accent-red)' },
    { id: 'fire', service: '101', label: 'Fire', color: 'var(--accent-orange)' },
  ],
}));

jest.mock('../../lib/analytics', () => ({
  track: {
    emergencyCallMade: jest.fn(),
  },
}));

describe('EmergencyNumbers', function() {
  it('renders all emergency numbers', async function() {
    var { EmergencyNumbers } = await import('../EmergencyNumbers');
    var { getByText } = render(<EmergencyNumbers />);
    expect(getByText('100')).toBeInTheDocument();
    expect(getByText('102')).toBeInTheDocument();
    expect(getByText('101')).toBeInTheDocument();
  });

  it('renders labels for each number', async function() {
    var { EmergencyNumbers } = await import('../EmergencyNumbers');
    var { getByText } = render(<EmergencyNumbers />);
    expect(getByText('Police')).toBeInTheDocument();
    expect(getByText('Ambulance')).toBeInTheDocument();
    expect(getByText('Fire')).toBeInTheDocument();
  });

  it('has tel: links for each number', async function() {
    var { EmergencyNumbers } = await import('../EmergencyNumbers');
    var { container } = render(<EmergencyNumbers />);
    var links = container.querySelectorAll('a[href^="tel:"]');
    expect(links.length).toBe(3);
    expect(links[0]).toHaveAttribute('href', 'tel:100');
    expect(links[1]).toHaveAttribute('href', 'tel:102');
    expect(links[2]).toHaveAttribute('href', 'tel:101');
  });

  it('has navigation role and aria label', async function() {
    var { EmergencyNumbers } = await import('../EmergencyNumbers');
    var { getByRole } = render(<EmergencyNumbers />);
    var nav = getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Emergency phone numbers');
  });

  it('has accessible aria labels on links', async function() {
    var { EmergencyNumbers } = await import('../EmergencyNumbers');
    var { getByLabelText } = render(<EmergencyNumbers />);
    expect(getByLabelText('Call Police: 100')).toBeInTheDocument();
    expect(getByLabelText('Call Ambulance: 102')).toBeInTheDocument();
    expect(getByLabelText('Call Fire: 101')).toBeInTheDocument();
  });

  it('renders bar dividers between numbers', async function() {
    var { EmergencyNumbers } = await import('../EmergencyNumbers');
    var { container } = render(<EmergencyNumbers />);
    var dividers = container.querySelectorAll('.bar-divider');
    expect(dividers.length).toBe(2);
  });
});



