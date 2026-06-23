// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => false,
}));

jest.mock('lucide-react', () => ({
  WifiOff: () => <span data-testid="wifi-off-icon" />,
}));

jest.mock('@gsap/react', () => ({
  useGSAP: () => null,
}));

jest.mock('@/lib/gsap', () => ({
  gsap: {
    fromTo: jest.fn(() => ({})),
    to: jest.fn(() => ({})),
  },
}));

import { OfflineBanner } from '../ui/OfflineBanner';

describe('OfflineBanner', function() {
  it('renders offline indicator message', function() {
    render(<OfflineBanner />);
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
  });

  it('shows that emergency features still work', function() {
    render(<OfflineBanner />);
    expect(screen.getByText(/Emergency locator/)).toBeInTheDocument();
    expect(screen.getByText(/First Aid/)).toBeInTheDocument();
    expect(screen.getByText(/SOS/)).toBeInTheDocument();
  });

  it('has role alert', function() {
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has aria-live assertive', function() {
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('renders offline icon', function() {
    render(<OfflineBanner />);
    expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
  });

  it('shows correct styling for offline state', function() {
    var { container } = render(<OfflineBanner />);
    var banner = container.firstChild as HTMLElement;
    expect(banner.className).toContain('fixed');
    expect(banner.className).toContain('z-[999]');
    expect(banner.className).toContain('bg-brand');
  });
});



