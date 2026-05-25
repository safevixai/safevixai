import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../lib/store', () => ({
  useAppStore: jest.fn(() => ({
    userProfile: { name: 'Test User', phone: '+911234567890' },
    gpsLocation: { lat: 13.0827, lon: 80.2707 },
    soundsEnabled: false,
  })),
}));

jest.mock('../../lib/sos-share', () => ({
  generateSosWhatsAppLink: jest.fn(() => Promise.resolve('https://wa.me/911234567890')),
  generateSosSmsLink: jest.fn(() => Promise.resolve('sms:+911234567890')),
}));

jest.mock('../../lib/haptics', () => ({
  haptics: { sos: jest.fn(), heavy: jest.fn() },
}));

jest.mock('../../lib/sounds', () => ({
  sounds: { sosSent: jest.fn() },
}));

describe('SOSButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.open = jest.fn(() => ({ opener: null })) as jest.Mock;
  });

  it('renders SOS button with pulse animation', async () => {
    const { SOSButton } = await import('../SOSButton');
    render(<SOSButton />);
    const button = screen.getByLabelText('Emergency SOS');
    expect(button).toBeInTheDocument();
  });

  it('shows SOS badge text', async () => {
    const { SOSButton } = await import('../SOSButton');
    render(<SOSButton />);
    expect(screen.getByText('SOS')).toBeInTheDocument();
  });

  it('opens confirmation panel on click', async () => {
    const { SOSButton } = await import('../SOSButton');
    render(<SOSButton />);
    fireEvent.click(screen.getByLabelText('Emergency SOS'));
    expect(screen.getByText('Confirm SOS Trigger')).toBeInTheDocument();
    expect(screen.getByText('Send WhatsApp SOS')).toBeInTheDocument();
    expect(screen.getByText('Standard SMS Alert')).toBeInTheDocument();
  });

  it('shows Cancel button after expanding', async () => {
    const { SOSButton } = await import('../SOSButton');
    render(<SOSButton />);
    fireEvent.click(screen.getByLabelText('Emergency SOS'));
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('displays GPS coordinates in confirmation panel', async () => {
    const { SOSButton } = await import('../SOSButton');
    render(<SOSButton />);
    fireEvent.click(screen.getByLabelText('Emergency SOS'));
    expect(screen.getByText('13.0827, 80.2707')).toBeInTheDocument();
  });

  it('has accessible labels', async () => {
    const { SOSButton } = await import('../SOSButton');
    render(<SOSButton />);
    expect(screen.getByLabelText('Emergency SOS')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Emergency SOS'));
    expect(screen.getByLabelText('Cancel emergency SOS')).toBeTruthy();
  });

  it('closes panel when Cancel is clicked', async () => {
    const { SOSButton } = await import('../SOSButton');
    render(<SOSButton />);
    fireEvent.click(screen.getByLabelText('Emergency SOS'));
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Confirm SOS Trigger')).not.toBeInTheDocument();
  });
});
