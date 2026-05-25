import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
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

  it('hasCamera state becomes true after camera starts', async () => {
    renderPotholeDetector();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /initiate ai scan/i })).toBeEnabled();
    });
  });

  it('scanning toggle changes button text immediately', async () => {
    renderPotholeDetector();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /initiate ai scan/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /initiate ai scan/i }));

    expect(screen.getByRole('button', { name: /processing sensor grid/i })).toBeDisabled();
  });

  it('shows camera-unavailable state when getUserMedia rejects', async () => {
    getUserMediaMock.mockRejectedValue(new Error('Permission denied'));
    renderPotholeDetector();
    await act(async () => {});
    expect(screen.getByText(/active sensor required/i)).toBeInTheDocument();
  });

  it('stops camera tracks on unmount', async () => {
    const { unmount } = renderPotholeDetector();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /initiate ai scan/i })).toBeEnabled();
    });
    unmount();
    expect(mockTrack.stop).toHaveBeenCalledTimes(1);
  });
});
