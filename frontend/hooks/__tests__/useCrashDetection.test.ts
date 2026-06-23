// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

var mockStartDetection = jest.fn()
var mockStopDetection = jest.fn()
var mockSimulateCrash = jest.fn()

jest.mock('@/lib/crash-detection', () => ({
  startCrashDetection: function() { return mockStartDetection.apply(null, arguments) },
  stopCrashDetection: function() { return mockStopDetection.apply(null, arguments) },
  simulateCrashDemo: mockSimulateCrash,
}))

import { renderHook, act } from '@testing-library/react'

beforeEach(function() {
  mockStartDetection.mockReset()
  mockStopDetection.mockReset()
  mockSimulateCrash.mockReset()
})

describe('useCrashDetection', function() {
  it('starts detection when enabled', function() {
    var onCrash = jest.fn()
    renderHook(() => require('../useCrashDetection').useCrashDetection({ onCrashDetected: onCrash, enabled: true }))
    expect(mockStartDetection).toHaveBeenCalledWith(expect.any(Function))
  })

  it('does not start detection when disabled', function() {
    var onCrash = jest.fn()
    renderHook(() => require('../useCrashDetection').useCrashDetection({ onCrashDetected: onCrash, enabled: false }))
    expect(mockStartDetection).not.toHaveBeenCalled()
  })

  it('stops detection on unmount', function() {
    var onCrash = jest.fn()
    var { unmount } = renderHook(() => require('../useCrashDetection').useCrashDetection({ onCrashDetected: onCrash, enabled: true }))
    unmount()
    expect(mockStopDetection).toHaveBeenCalledWith(expect.any(Function))
  })

  it('calls onCrashDetected callback when crash detected', function() {
    var onCrash = jest.fn()
    renderHook(() => require('../useCrashDetection').useCrashDetection({ onCrashDetected: onCrash, enabled: true }))
    var callback = mockStartDetection.mock.calls[0][0]
    callback(25)
    expect(onCrash).toHaveBeenCalledWith(25)
  })

  it('uses latest callback even after re-render (callbackRef pattern)', function() {
    var onCrash1 = jest.fn()
    var onCrash2 = jest.fn()
    var { rerender } = renderHook(
      function(props: { onCrash: Function }) { return require('../useCrashDetection').useCrashDetection({ onCrashDetected: props.onCrash, enabled: true }) },
      { initialProps: { onCrash: onCrash1 } }
    )
    rerender({ onCrash: onCrash2 })
    var callback = mockStartDetection.mock.calls[0][0]
    callback(30)
    expect(onCrash1).not.toHaveBeenCalled()
    expect(onCrash2).toHaveBeenCalledWith(30)
  })

  it('exposes simulateCrash function', function() {
    var onCrash = jest.fn()
    var { result } = renderHook(() => require('../useCrashDetection').useCrashDetection({ onCrashDetected: onCrash, enabled: true }))
    expect(result.current.simulateCrash).toBe(mockSimulateCrash)
  })
})


