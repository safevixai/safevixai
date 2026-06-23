// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/lib/store', () => ({
  useAppStore: (selector: any) =>
    selector({
      gpsError: null,
      gpsLocation: null,
      serviceCategory: 'all',
      setMapSearchTarget: jest.fn(),
      setServiceCategory: jest.fn(),
      setSystemSidebarOpen: jest.fn(),
      isDesktopSidebarCollapsed: false,
      setDesktopSidebarCollapsed: jest.fn(),
      isThinSidebarEnabled: false,
    }),
}));

jest.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: jest.fn() }),
}));

var mockDebouncedFn = Object.assign(jest.fn(), { cancel: jest.fn() });
jest.mock('use-debounce', () => ({
  useDebouncedCallback: () => mockDebouncedFn,
}));

jest.mock('@/lib/geocoding', () => ({
  searchPlaces: jest.fn().mockResolvedValue([]),
  GeocodingResult: {},
}));

jest.mock('@/lib/location-utils', () => ({
  formatAccuracyLabel: jest.fn(() => null),
  formatLocationLabel: jest.fn(() => 'Use My Location'),
  isApproximateLocation: jest.fn(() => false),
}));

describe('TopSearch', function() {
  beforeEach(function() {
    jest.clearAllMocks();
  });

  it('renders search input field', async function() {
    var TopSearch = (await import('../dashboard/TopSearch')).default;
    render(<TopSearch />);
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('has expected placeholder text', async function() {
    var TopSearch = (await import('../dashboard/TopSearch')).default;
    render(<TopSearch />);
    var input = screen.getByPlaceholderText('Ask Maps or Search');
    expect(input).toBeInTheDocument();
  });

  it('fires onChange when typing', async function() {
    var TopSearch = (await import('../dashboard/TopSearch')).default;
    render(<TopSearch />);
    var input = screen.getByPlaceholderText('Ask Maps or Search');
    fireEvent.change(input, { target: { value: 'hospital' } });
    expect(input).toHaveValue('hospital');
  });

  it('has search input with aria-label', async function() {
    var TopSearch = (await import('../dashboard/TopSearch')).default;
    render(<TopSearch />);
    expect(screen.getByLabelText('Search input')).toBeInTheDocument();
  });

  it('has voice search button', async function() {
    var TopSearch = (await import('../dashboard/TopSearch')).default;
    render(<TopSearch />);
    expect(screen.getByLabelText('Voice search')).toBeInTheDocument();
  });
});



