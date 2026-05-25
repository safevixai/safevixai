import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/store', () => ({
  useAppStore: (selector: any) => {
    const state = {
      setSystemSidebarOpen: jest.fn(),
      isAuthenticated: false,
      operatorName: '',
    };
    return selector(state);
  },
}));

jest.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: jest.fn() }),
}));

describe('SystemHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header with branding', async () => {
    const SystemHeader = (await import('../dashboard/SystemHeader')).default;
    render(<SystemHeader />);
    const header = document.querySelector('header');
    expect(header).toBeInTheDocument();
  });

  it('contains SafeVixAI title by default', async () => {
    const SystemHeader = (await import('../dashboard/SystemHeader')).default;
    render(<SystemHeader />);
    expect(screen.getByText('SafeVixAI')).toBeInTheDocument();
  });

  it('shows Sentinel Active status indicator', async () => {
    const SystemHeader = (await import('../dashboard/SystemHeader')).default;
    render(<SystemHeader />);
    expect(screen.getByText('Sentinel Active')).toBeInTheDocument();
  });

  it('renders search form with placeholder', async () => {
    const SystemHeader = (await import('../dashboard/SystemHeader')).default;
    render(<SystemHeader />);
    expect(screen.getByPlaceholderText('Ask Maps or Search System')).toBeInTheDocument();
  });

  it('renders back button when showBack is true', async () => {
    const SystemHeader = (await import('../dashboard/SystemHeader')).default;
    render(<SystemHeader />);
    expect(screen.getByLabelText('Go back')).toBeInTheDocument();
  });

  it('does not render back button when showBack is false', async () => {
    const SystemHeader = (await import('../dashboard/SystemHeader')).default;
    render(<SystemHeader showBack={false} />);
    expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();
  });

  it('renders custom title when provided', async () => {
    const SystemHeader = (await import('../dashboard/SystemHeader')).default;
    render(<SystemHeader title="Emergency Dashboard" />);
    expect(screen.getByText('Emergency Dashboard')).toBeInTheDocument();
  });

  it('shows Online/Offline toggle buttons', async () => {
    const SystemHeader = (await import('../dashboard/SystemHeader')).default;
    render(<SystemHeader />);
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('shows Secure badge', async () => {
    const SystemHeader = (await import('../dashboard/SystemHeader')).default;
    render(<SystemHeader />);
    expect(screen.getByText('Secure')).toBeInTheDocument();
  });
});
