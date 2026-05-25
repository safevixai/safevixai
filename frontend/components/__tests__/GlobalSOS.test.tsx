import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockUsePathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>;
});

jest.mock('@/lib/haptics', () => ({
  haptics: { heavy: jest.fn(), light: jest.fn(), medium: jest.fn(), sos: jest.fn(), warning: jest.fn() },
}));

import { GlobalSOS } from '../GlobalSOS';

describe('GlobalSOS', () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
  });

  it('renders null on hidden route /sos', () => {
    mockUsePathname.mockReturnValue('/sos');
    const { container } = render(<GlobalSOS />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null on root / route', () => {
    mockUsePathname.mockReturnValue('/');
    const { container } = render(<GlobalSOS />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null on /emergency route', () => {
    mockUsePathname.mockReturnValue('/emergency');
    const { container } = render(<GlobalSOS />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null on /first-aid route', () => {
    mockUsePathname.mockReturnValue('/first-aid');
    const { container } = render(<GlobalSOS />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null on /report route', () => {
    mockUsePathname.mockReturnValue('/report');
    const { container } = render(<GlobalSOS />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null on /challan route', () => {
    mockUsePathname.mockReturnValue('/challan');
    const { container } = render(<GlobalSOS />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null on /profile route', () => {
    mockUsePathname.mockReturnValue('/profile');
    const { container } = render(<GlobalSOS />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null on /settings route', () => {
    mockUsePathname.mockReturnValue('/settings');
    const { container } = render(<GlobalSOS />);
    expect(container.firstChild).toBeNull();
  });

  it('renders SOS buttons on non-hidden route /assistant', () => {
    mockUsePathname.mockReturnValue('/assistant');
    render(<GlobalSOS />);
    const buttons = screen.getAllByLabelText('Emergency SOS');
    expect(buttons.length).toBe(2);
  });

  it('has aria-label "Emergency SOS" on buttons', () => {
    mockUsePathname.mockReturnValue('/assistant');
    render(<GlobalSOS />);
    const buttons = screen.getAllByLabelText('Emergency SOS');
    expect(buttons.length).toBe(2);
    buttons.forEach(btn => {
      expect(btn).toHaveAttribute('aria-label', 'Emergency SOS');
    });
  });

  it('links point to /sos', () => {
    mockUsePathname.mockReturnValue('/assistant');
    render(<GlobalSOS />);
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link).toHaveAttribute('href', '/sos');
    });
  });

  it('renders mobile variant with lg:hidden class', () => {
    mockUsePathname.mockReturnValue('/assistant');
    const { container } = render(<GlobalSOS />);
    const divs = container.querySelectorAll('div.fixed');
    expect(divs.length).toBe(2);
    expect(divs[0]).toHaveClass('lg:hidden');
  });

  it('renders desktop variant with hidden lg:block classes', () => {
    mockUsePathname.mockReturnValue('/assistant');
    const { container } = render(<GlobalSOS />);
    const divs = container.querySelectorAll('div.fixed');
    expect(divs.length).toBe(2);
    expect(divs[1]).toHaveClass('hidden');
    expect(divs[1]).toHaveClass('lg:block');
  });
});
