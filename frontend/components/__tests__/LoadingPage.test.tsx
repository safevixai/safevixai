import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingPage } from '../ui/LoadingPage';

describe('LoadingPage', () => {
  it('renders default variant', () => {
    render(<LoadingPage />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading page');
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders chat variant', () => {
    render(<LoadingPage variant="chat" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading messages');
  });

  it('renders map variant', () => {
    render(<LoadingPage variant="map" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading map');
  });

  it('renders form variant', () => {
    render(<LoadingPage variant="form" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading form');
  });

  it('renders grid variant', () => {
    render(<LoadingPage variant="grid" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading dashboard');
  });

  it('renders emergency variant', () => {
    render(<LoadingPage variant="emergency" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading emergency');
  });

  it('renders sos variant', () => {
    render(<LoadingPage variant="sos" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading SOS');
  });

  it('uses custom iconBg', () => {
    const { container } = render(<LoadingPage variant="map" iconBg="bg-red-500" />);
    const iconEls = container.querySelectorAll('.bg-red-500');
    expect(iconEls.length).toBe(1);
  });

  it('defaults iconBg to bg-brand-dim', () => {
    const { container } = render(<LoadingPage variant="map" />);
    const iconEls = container.querySelectorAll('.bg-brand-dim');
    expect(iconEls.length).toBe(1);
  });

  it('renders skeleton elements for default variant', () => {
    const { container } = render(<LoadingPage />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders skeleton elements for chat variant', () => {
    const { container } = render(<LoadingPage variant="chat" />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders skeleton elements for sos variant', () => {
    const { container } = render(<LoadingPage variant="sos" />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
