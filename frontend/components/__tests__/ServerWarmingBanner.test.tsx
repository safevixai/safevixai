import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockStore = { serverWarming: true };

jest.mock('@/lib/store', () => ({
  useAppStore: (selector: any) => selector(mockStore),
  useServerWarming: () => mockStore.serverWarming,
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

jest.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="loader-icon" />,
}));

import { ServerWarmingBanner } from '../ui/ServerWarmingBanner';

describe('ServerWarmingBanner', () => {
  it('renders connecting message', () => {
    render(<ServerWarmingBanner />);
    expect(screen.getByText(/Connecting/)).toBeInTheDocument();
  });

  it('shows estimated wait time', () => {
    render(<ServerWarmingBanner />);
    expect(screen.getByText(/30 seconds/)).toBeInTheDocument();
  });

  it('has role status', () => {
    render(<ServerWarmingBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders spinner icon', () => {
    render(<ServerWarmingBanner />);
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  it('has warming styling classes', () => {
    const { container } = render(<ServerWarmingBanner />);
    expect(container.firstChild).toHaveClass('fixed');
    expect(container.firstChild).toHaveClass('rounded-full');
    expect(container.firstChild).toHaveClass('shadow-2xl');
  });

  it('does not render when serverWarming is false', () => {
    mockStore.serverWarming = false;
    const { container } = render(<ServerWarmingBanner />);
    expect(container.firstChild).toBeNull();
    mockStore.serverWarming = true;
  });
});
