import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../lib/client-logger', () => ({
  logClientError: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const mockTrack = { stop: jest.fn() };
const mockStream = { getTracks: () => [mockTrack] };
let getUserMediaMock: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockTrack.stop.mockReset();

  getUserMediaMock = jest.fn().mockResolvedValue(mockStream);
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: getUserMediaMock },
    configurable: true,
    writable: true,
  });
});

function renderPotholeDetector() {
  const PotholeDetector = require('../PotholeDetector').default;
  return render(<PotholeDetector />);
}

describe('PotholeDetector', () => {
  it('starts camera on mount', async () => {
    renderPotholeDetector();
    expect(getUserMediaMock).toHaveBeenCalledWith(
      expect.objectContaining({ video: { facingMode: 'environment' } })
    );
  });

  it('shows video element when camera is available', async () => {
    renderPotholeDetector();
    await act(async () => {});
    expect(screen.getByRole('button', { name: /initiate ai scan/i })).toBeInTheDocument();
  });

  it('shows camera-unavailable state when getUserMedia rejects', async () => {
    getUserMediaMock.mockRejectedValue(new Error('Permission denied'));
    renderPotholeDetector();
    await act(async () => {});
    expect(screen.getByText(/active sensor required/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /initiate ai scan/i })).toBeDisabled();
  });

  it('disables scan button while scanning', async () => {
    jest.useFakeTimers();
    renderPotholeDetector();
    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: /initiate ai scan/i }));

    expect(screen.getByRole('button', { name: /processing sensor grid/i })).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    jest.useRealTimers();
  });

  it('stops camera tracks on unmount', async () => {
    const { unmount } = renderPotholeDetector();
    await act(async () => {});
    unmount();
    expect(mockTrack.stop).toHaveBeenCalledTimes(1);
  });
});
