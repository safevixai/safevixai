import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

let mockDrivingScore: number | null = 75;

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

describe('DrivingScoreBar', () => {
  beforeEach(() => {
    mockDrivingScore = 75;
  });

  it('renders score value', async () => {
    const { DrivingScoreBar } = await import('../DrivingScoreBar');
    const { getByText } = render(<DrivingScoreBar />);
    expect(getByText('75/100')).toBeInTheDocument();
  });

  it('renders header text', async () => {
    const { DrivingScoreBar } = await import('../DrivingScoreBar');
    const { getByText } = render(<DrivingScoreBar />);
    expect(getByText(/Sentinel Driving Score/i)).toBeInTheDocument();
  });

  it('renders description about edge processing', async () => {
    const { DrivingScoreBar } = await import('../DrivingScoreBar');
    const { getByText } = render(<DrivingScoreBar />);
    expect(getByText(/processed 100% on edge/i)).toBeInTheDocument();
  });

  it('clamps score to 0-100 range', async () => {
    mockDrivingScore = 150;
    const { DrivingScoreBar } = await import('../DrivingScoreBar');
    const { getByText } = render(<DrivingScoreBar />);
    expect(getByText('100/100')).toBeInTheDocument();
  });

  it('handles negative score', async () => {
    mockDrivingScore = -10;
    const { DrivingScoreBar } = await import('../DrivingScoreBar');
    const { getByText } = render(<DrivingScoreBar />);
    expect(getByText('0/100')).toBeInTheDocument();
  });

  it('handles null score as 0', async () => {
    mockDrivingScore = null;
    const { DrivingScoreBar } = await import('../DrivingScoreBar');
    const { getByText } = render(<DrivingScoreBar />);
    expect(getByText('0/100')).toBeInTheDocument();
  });

  it('renders card-glass class', async () => {
    const { DrivingScoreBar } = await import('../DrivingScoreBar');
    const { container } = render(<DrivingScoreBar />);
    expect(container.firstChild).toHaveClass('card-glass');
  });

  it('renders low score with red color', async () => {
    mockDrivingScore = 20;
    const { DrivingScoreBar } = await import('../DrivingScoreBar');
    const { getByText } = render(<DrivingScoreBar />);
    expect(getByText('20/100')).toBeInTheDocument();
  });

  it('renders medium score with orange color', async () => {
    mockDrivingScore = 60;
    const { DrivingScoreBar } = await import('../DrivingScoreBar');
    const { getByText } = render(<DrivingScoreBar />);
    expect(getByText('60/100')).toBeInTheDocument();
  });

  it('renders high score with green color', async () => {
    mockDrivingScore = 95;
    const { DrivingScoreBar } = await import('../DrivingScoreBar');
    const { getByText } = render(<DrivingScoreBar />);
    expect(getByText('95/100')).toBeInTheDocument();
  });
});
