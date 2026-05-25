import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockStore = {
  isDesktopSidebarCollapsed: false,
  isThinSidebarEnabled: false,
  setDesktopSidebarCollapsed: jest.fn(),
};

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

jest.mock('@/lib/store', () => ({
  useAppStore: (selector: any) => selector(mockStore),
}));

jest.mock('lucide-react', () => ({
  Menu: () => <span data-testid="menu-icon" />,
}));

jest.mock('@/components/AppSidebar', () => ({
  AppSidebar: () => <div data-testid="app-sidebar" />,
}));

jest.mock('@/components/dashboard/SystemSidebar', () => ({
  __esModule: true,
  default: () => <div data-testid="system-sidebar" />,
}));

jest.mock('@/components/dashboard/BottomNav', () => ({
  __esModule: true,
  default: () => <div data-testid="bottom-nav" />,
}));

jest.mock('@/components/RightSidebar', () => ({
  RightSidebar: () => <div data-testid="right-sidebar" />,
}));

jest.mock('@/components/NetworkMonitor', () => ({
  NetworkMonitor: () => <div data-testid="network-monitor" />,
}));

jest.mock('@/components/GlobalSOS', () => ({
  GlobalSOS: () => <div data-testid="global-sos" />,
}));

jest.mock('@/components/search/CommandPalette', () => ({
  CommandPalette: () => <div data-testid="command-palette" />,
}));

jest.mock('@/components/ui/KeyboardShortcutsHelp', () => ({
  KeyboardShortcutsHelp: () => <div data-testid="keyboard-shortcuts" />,
}));

jest.mock('@/components/ui/OfflineBanner', () => ({
  OfflineBanner: () => <div data-testid="offline-banner" />,
}));

jest.mock('@/components/ui/SystemStatusBar', () => ({
  SystemStatusBar: () => <div data-testid="system-status-bar" />,
}));

jest.mock('@/components/ui/ServerWarmingBanner', () => ({
  ServerWarmingBanner: () => <div data-testid="server-warming-banner" />,
}));

import { AppFrame } from '../ui/AppFrame';

describe('AppFrame', () => {
  it('renders children inside frame', () => {
    render(<AppFrame><span data-testid="child">content</span></AppFrame>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders text children', () => {
    render(<AppFrame>Hello World</AppFrame>);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('has global utility components', () => {
    render(<AppFrame>content</AppFrame>);
    expect(screen.getByTestId('network-monitor')).toBeInTheDocument();
    expect(screen.getByTestId('global-sos')).toBeInTheDocument();
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    expect(screen.getByTestId('keyboard-shortcuts')).toBeInTheDocument();
    expect(screen.getByTestId('system-status-bar')).toBeInTheDocument();
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    expect(screen.getByTestId('server-warming-banner')).toBeInTheDocument();
  });

  it('has sidebar and navigation components', () => {
    render(<AppFrame>content</AppFrame>);
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('system-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
    expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
  });

  it('has skip to main content link', () => {
    render(<AppFrame>content</AppFrame>);
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main');
  });

  it('has main content area with id main', () => {
    render(<AppFrame>content</AppFrame>);
    expect(document.getElementById('main')).toBeInTheDocument();
  });

  it('has correct wrapper structure', () => {
    const { container } = render(<AppFrame>content</AppFrame>);
    expect(container.firstChild).toHaveClass('flex');
    expect(container.firstChild).toHaveClass('min-h-dvh');
  });
});
