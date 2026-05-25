import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockUsePathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
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

describe('BottomNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 5 nav items', async () => {
    mockUsePathname.mockReturnValue('/');
    const BottomNav = (await import('../dashboard/BottomNav')).default;
    render(<BottomNav />);
    expect(screen.getByText('Map')).toBeInTheDocument();
    expect(screen.getByText('AI Chat')).toBeInTheDocument();
    expect(screen.getByText('Locator')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
    expect(screen.getByText('First Aid')).toBeInTheDocument();
  });

  it('highlights active item based on pathname', async () => {
    mockUsePathname.mockReturnValue('/assistant');
    const BottomNav = (await import('../dashboard/BottomNav')).default;
    render(<BottomNav />);
    const links = screen.getAllByRole('link');
    const activeLink = links.find(
      (link) => link.getAttribute('aria-current') === 'page'
    );
    expect(activeLink).toBeInTheDocument();
    expect(activeLink).toHaveAttribute('href', '/assistant');
  });

  it('defaults to Map when pathname does not match any item', async () => {
    mockUsePathname.mockReturnValue('/unknown');
    const BottomNav = (await import('../dashboard/BottomNav')).default;
    render(<BottomNav />);
    const links = screen.getAllByRole('link');
    const activeLink = links.find(
      (link) => link.getAttribute('aria-current') === 'page'
    );
    expect(activeLink).toHaveAttribute('href', '/');
  });

  it('each link has correct href', async () => {
    mockUsePathname.mockReturnValue('/');
    const BottomNav = (await import('../dashboard/BottomNav')).default;
    const { container } = render(<BottomNav />);
    const links = container.querySelectorAll('a');
    const expected = ['/', '/assistant', '/locator', '/report', '/first-aid'];
    links.forEach((link, i) => {
      expect(link.getAttribute('href')).toBe(expected[i]);
    });
  });

  it('sets aria-current on active link', async () => {
    mockUsePathname.mockReturnValue('/report');
    const BottomNav = (await import('../dashboard/BottomNav')).default;
    render(<BottomNav />);
    const reportLink = screen.getByText('Report').closest('a');
    expect(reportLink).toHaveAttribute('aria-current', 'page');
  });
});
