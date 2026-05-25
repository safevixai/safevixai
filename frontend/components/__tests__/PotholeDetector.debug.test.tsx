import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../lib/client-logger', () => ({ logClientError: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const mockTrack = { stop: jest.fn() };
const mockStream = { getTracks: () => [mockTrack] };

beforeEach(() => {
  jest.clearAllMocks();
  mockTrack.stop.mockReset();
  const getUserMediaMock = jest.fn().mockResolvedValue(mockStream);
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: getUserMediaMock },
    configurable: true,
    writable: true,
  });
});

it('debug: promise resolves', async () => {
  const stream = await (navigator.mediaDevices as any).getUserMedia({ video: true });
  expect(stream).toBe(mockStream);
});

it('debug: renders and checks hasCamera', async () => {
  const PotholeDetector = require('../PotholeDetector').default;
  render(<PotholeDetector />);
  
  // Check that getUserMedia was called
  const getUserMediaMock = (navigator.mediaDevices as any).getUserMedia;
  expect(getUserMediaMock).toHaveBeenCalled();
  
  // Check the stream was resolved
  const result = await getUserMediaMock.mock.results[0].value;
  expect(result).toBe(mockStream);
  
  // Now flush React
  await act(async () => {});
  
  // Check DOM
  const btn = screen.queryByRole('button', { name: /initiate ai scan/i });
  console.log('Button disabled attr:', btn?.getAttribute('disabled'));
  console.log('Button exists:', !!btn);
  screen.debug();
});
