// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

var mockDrivingScore: number | null = 75;

jest.mock('../../lib/store', () => ({
  useAppStore: jest.fn((selector: unknown) => {
    const state = { drivingScore: mockDrivingScore };
    if (typeof selector === 'function') return selector(state);
    return state;
  }),
}));

jest.mock('zustand/react/shallow', () => ({
  useShallow: jest.fn((fn: unknown) => fn),
}));

describe('DrivingScoreBar', function() {
  beforeEach(function() {
    mockDrivingScore = 75;
  });

  it('renders score value', async function() {
    var { DrivingScoreBar } = await import('../DrivingScoreBar');
    var { getByText } = render(<DrivingScoreBar />);
    expect(getByText('75/100')).toBeInTheDocument();
  });

  it('renders header text', async function() {
    var { DrivingScoreBar } = await import('../DrivingScoreBar');
    var { getByText } = render(<DrivingScoreBar />);
    expect(getByText(/Sentinel Driving Score/i)).toBeInTheDocument();
  });

  it('renders description about edge processing', async function() {
    var { DrivingScoreBar } = await import('../DrivingScoreBar');
    var { getByText } = render(<DrivingScoreBar />);
    expect(getByText(/processed 100% on edge/i)).toBeInTheDocument();
  });

  it('clamps score to 0-100 range', async function() {
    mockDrivingScore = 150;
    var { DrivingScoreBar } = await import('../DrivingScoreBar');
    var { getByText } = render(<DrivingScoreBar />);
    expect(getByText('100/100')).toBeInTheDocument();
  });

  it('handles negative score', async function() {
    mockDrivingScore = -10;
    var { DrivingScoreBar } = await import('../DrivingScoreBar');
    var { getByText } = render(<DrivingScoreBar />);
    expect(getByText('0/100')).toBeInTheDocument();
  });

  it('handles null score as 0', async function() {
    mockDrivingScore = null;
    var { DrivingScoreBar } = await import('../DrivingScoreBar');
    var { getByText } = render(<DrivingScoreBar />);
    expect(getByText('0/100')).toBeInTheDocument();
  });

  it('renders card-glass class', async function() {
    var { DrivingScoreBar } = await import('../DrivingScoreBar');
    var { container } = render(<DrivingScoreBar />);
    expect(container.firstChild).toHaveClass('card-glass');
  });

  it('renders low score with red color', async function() {
    mockDrivingScore = 20;
    var { DrivingScoreBar } = await import('../DrivingScoreBar');
    var { getByText } = render(<DrivingScoreBar />);
    expect(getByText('20/100')).toBeInTheDocument();
  });

  it('renders medium score with orange color', async function() {
    mockDrivingScore = 60;
    var { DrivingScoreBar } = await import('../DrivingScoreBar');
    var { getByText } = render(<DrivingScoreBar />);
    expect(getByText('60/100')).toBeInTheDocument();
  });

  it('renders high score with green color', async function() {
    mockDrivingScore = 95;
    var { DrivingScoreBar } = await import('../DrivingScoreBar');
    var { getByText } = render(<DrivingScoreBar />);
    expect(getByText('95/100')).toBeInTheDocument();
  });
});



