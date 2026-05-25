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

describe('OfflineBanner', () => {
  it('renders offline indicator message', () => {
    render(<OfflineBanner />);
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
  });

  it('shows that emergency features still work', () => {
    render(<OfflineBanner />);
    expect(screen.getByText(/Emergency locator/)).toBeInTheDocument();
    expect(screen.getByText(/First Aid/)).toBeInTheDocument();
    expect(screen.getByText(/SOS/)).toBeInTheDocument();
  });

  it('has role alert', () => {
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has aria-live assertive', () => {
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('renders offline icon', () => {
    render(<OfflineBanner />);
    expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
  });

  it('shows correct styling for offline state', () => {
    const { container } = render(<OfflineBanner />);
    const banner = container.firstChild as HTMLElement;
    expect(banner.className).toContain('fixed');
    expect(banner.className).toContain('z-[999]');
    expect(banner.className).toContain('bg-brand');
  });
});
