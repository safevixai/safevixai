import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/hooks/useSplitTextEntry', () => ({
  useSplitTextEntry: () => ({ current: null }),
}));

import { TerminalHeader } from '../ui/TerminalHeader';

describe('TerminalHeader', () => {
  it('renders title', () => {
    render(<TerminalHeader title="SafeVix" />);
    expect(screen.getByText('SafeVix')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<TerminalHeader title="SafeVix" subtitle="Road Safety System" />);
    expect(screen.getByText('Road Safety System')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    render(<TerminalHeader title="SafeVix" />);
    expect(screen.queryByText('Road Safety System')).not.toBeInTheDocument();
  });

  it('shows Sentinel Active status by default', () => {
    render(<TerminalHeader title="SafeVix" />);
    expect(screen.getByText('Sentinel Active')).toBeInTheDocument();
  });

  it('shows Emergency Active when status is emergency', () => {
    render(<TerminalHeader title="SafeVix" status="emergency" />);
    expect(screen.getByText('Emergency Active')).toBeInTheDocument();
  });

  it('shows Offline status label', () => {
    render(<TerminalHeader title="SafeVix" status="offline" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders rightElement when provided', () => {
    render(<TerminalHeader title="SafeVix" rightElement={<span data-testid="right-el" />} />);
    expect(screen.getByTestId('right-el')).toBeInTheDocument();
  });

  it('has sv-terminal-header class', () => {
    const { container } = render(<TerminalHeader title="SafeVix" />);
    expect(container.firstChild).toHaveClass('sv-terminal-header');
  });

  it('shows terminal-styled branding', () => {
    render(<TerminalHeader title="SafeVix" />);
    const h1 = screen.getByText('SafeVix');
    expect(h1).toHaveClass('sv-terminal-overline');
  });
});
