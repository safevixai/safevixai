import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockUseAppStore = jest.fn();

jest.mock('@/lib/store', () => ({
  useAppStore: (selector: any) => mockUseAppStore(selector),
}));

import { ConnectivityBadge } from '../ConnectivityBadge';

describe('ConnectivityBadge', () => {
  beforeEach(() => {
    mockUseAppStore.mockReset();
  });

  it('renders online label', () => {
    mockUseAppStore.mockReturnValue('online');
    render(<ConnectivityBadge />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders cached label', () => {
    mockUseAppStore.mockReturnValue('cached');
    render(<ConnectivityBadge />);
    expect(screen.getByText('Cached')).toBeInTheDocument();
  });

  it('renders offline label', () => {
    mockUseAppStore.mockReturnValue('offline');
    render(<ConnectivityBadge />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders ai-offline label', () => {
    mockUseAppStore.mockReturnValue('ai-offline');
    render(<ConnectivityBadge />);
    expect(screen.getByText('AI Active')).toBeInTheDocument();
  });

  it('has role status', () => {
    mockUseAppStore.mockReturnValue('online');
    render(<ConnectivityBadge />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live polite', () => {
    mockUseAppStore.mockReturnValue('online');
    render(<ConnectivityBadge />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('has aria-label with connectivity state', () => {
    mockUseAppStore.mockReturnValue('offline');
    render(<ConnectivityBadge />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Connectivity: Offline');
  });

  it('applies correct color class for online', () => {
    mockUseAppStore.mockReturnValue('online');
    const { container } = render(<ConnectivityBadge />);
    expect(container.firstChild).toHaveClass('conn-online');
  });

  it('applies correct color class for cached', () => {
    mockUseAppStore.mockReturnValue('cached');
    const { container } = render(<ConnectivityBadge />);
    expect(container.firstChild).toHaveClass('conn-cached');
  });

  it('applies correct color class for offline', () => {
    mockUseAppStore.mockReturnValue('offline');
    const { container } = render(<ConnectivityBadge />);
    expect(container.firstChild).toHaveClass('conn-offline');
  });

  it('applies correct color class for ai-offline', () => {
    mockUseAppStore.mockReturnValue('ai-offline');
    const { container } = render(<ConnectivityBadge />);
    expect(container.firstChild).toHaveClass('conn-ai');
  });

  it('applies custom className', () => {
    mockUseAppStore.mockReturnValue('online');
    const { container } = render(<ConnectivityBadge className="my-class" />);
    expect(container.firstChild).toHaveClass('my-class');
  });

  it('has conn-badge class', () => {
    mockUseAppStore.mockReturnValue('online');
    const { container } = render(<ConnectivityBadge />);
    expect(container.firstChild).toHaveClass('conn-badge');
  });
});
