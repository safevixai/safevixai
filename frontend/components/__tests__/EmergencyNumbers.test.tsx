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

describe('EmergencyNumbers', () => {
  it('renders all emergency numbers', async () => {
    const { EmergencyNumbers } = await import('../EmergencyNumbers');
    const { getByText } = render(<EmergencyNumbers />);
    expect(getByText('100')).toBeInTheDocument();
    expect(getByText('102')).toBeInTheDocument();
    expect(getByText('101')).toBeInTheDocument();
  });

  it('renders labels for each number', async () => {
    const { EmergencyNumbers } = await import('../EmergencyNumbers');
    const { getByText } = render(<EmergencyNumbers />);
    expect(getByText('Police')).toBeInTheDocument();
    expect(getByText('Ambulance')).toBeInTheDocument();
    expect(getByText('Fire')).toBeInTheDocument();
  });

  it('has tel: links for each number', async () => {
    const { EmergencyNumbers } = await import('../EmergencyNumbers');
    const { container } = render(<EmergencyNumbers />);
    const links = container.querySelectorAll('a[href^="tel:"]');
    expect(links.length).toBe(3);
    expect(links[0]).toHaveAttribute('href', 'tel:100');
    expect(links[1]).toHaveAttribute('href', 'tel:102');
    expect(links[2]).toHaveAttribute('href', 'tel:101');
  });

  it('has navigation role and aria label', async () => {
    const { EmergencyNumbers } = await import('../EmergencyNumbers');
    const { getByRole } = render(<EmergencyNumbers />);
    const nav = getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Emergency phone numbers');
  });

  it('has accessible aria labels on links', async () => {
    const { EmergencyNumbers } = await import('../EmergencyNumbers');
    const { getByLabelText } = render(<EmergencyNumbers />);
    expect(getByLabelText('Call Police: 100')).toBeInTheDocument();
    expect(getByLabelText('Call Ambulance: 102')).toBeInTheDocument();
    expect(getByLabelText('Call Fire: 101')).toBeInTheDocument();
  });

  it('renders bar dividers between numbers', async () => {
    const { EmergencyNumbers } = await import('../EmergencyNumbers');
    const { container } = render(<EmergencyNumbers />);
    const dividers = container.querySelectorAll('.bar-divider');
    expect(dividers.length).toBe(2);
  });
});
