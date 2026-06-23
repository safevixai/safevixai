// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../lib/client-logger', () => ({
  logClientError: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

// Mock useRef so the component gets a valid video element for camera setup
var mockVideoElement = document.createElement('video');
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useRef: jest.fn(() => ({ current: mockVideoElement })),
  };
});

var mockTrack = { stop: jest.fn() };
var mockStream = { getTracks: () => [mockTrack] };
var getUserMediaMock: jest.Mock;

beforeEach(function() {
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
  var PotholeDetector = require('../PotholeDetector').default;
  return render(<PotholeDetector />);
}

describe('PotholeDetector', function() {
  it('starts camera on mount', function() {
    renderPotholeDetector();
    expect(getUserMediaMock).toHaveBeenCalledWith(
      expect.objectContaining({ video: { facingMode: 'environment' } })
    );
  });

  it('hasCamera state becomes true after camera starts', async function() {
    renderPotholeDetector();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /initiate ai scan/i })).toBeEnabled();
    });
  });

  it('scanning toggle changes button text immediately', async function() {
    renderPotholeDetector();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /initiate ai scan/i })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /initiate ai scan/i }));
    expect(screen.getByRole('button', { name: /processing sensor grid/i })).toBeDisabled();
  });

  it('shows camera-unavailable state when getUserMedia rejects', async function() {
    getUserMediaMock.mockRejectedValue(new Error('Permission denied'));
    renderPotholeDetector();
    await act(async () => {});
    expect(screen.getByText(/active sensor required/i)).toBeInTheDocument();
  });

  it('stops camera tracks on unmount', async function() {
    var { unmount } = renderPotholeDetector();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /initiate ai scan/i })).toBeEnabled();
    });
    unmount();
    expect(mockTrack.stop).toHaveBeenCalledTimes(1);
  });
});



