// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@gsap/react', () => {
  var cleanups = [] as Function[]
  return {
    __cleanups: cleanups,
    useGSAP: function(cb: Function, _opts: any) {
      var cleanup = cb()
      if (typeof cleanup === 'function') cleanups.push(cleanup)
    },
  }
})

jest.mock('@/lib/gsap', () => ({
  ScrollTrigger: { refresh: jest.fn() },
}))

import { renderHook } from '@testing-library/react'

describe('useGSAPAnimation', function() {
  it('calls the animation function with the ref element', function() {
    var animation = jest.fn()
    var ref = { current: document.createElement('div') }
    jest.useFakeTimers()
    renderHook(() => require('../useGSAPAnimation').useGSAPAnimation({ ref, animation }))
    jest.runAllTimers()
    expect(animation).toHaveBeenCalledWith(ref.current)
  })

  it('calls ScrollTrigger.refresh after animation', function() {
    var animation = jest.fn()
    var ref = { current: document.createElement('div') }
    var ScrollTrigger = require('@/lib/gsap').ScrollTrigger
    jest.useFakeTimers()
    renderHook(() => require('../useGSAPAnimation').useGSAPAnimation({ ref, animation }))
    jest.runAllTimers()
    expect(ScrollTrigger.refresh).toHaveBeenCalled()
  })

  it('does not call animation when ref.current is null', function() {
    var animation = jest.fn()
    var ref = { current: null }
    jest.useFakeTimers()
    renderHook(() => require('../useGSAPAnimation').useGSAPAnimation({ ref, animation }))
    jest.runAllTimers()
    expect(animation).not.toHaveBeenCalled()
  })

  it('respects the delay parameter', function() {
    var animation = jest.fn()
    var ref = { current: document.createElement('div') }
    jest.useFakeTimers()
    renderHook(() => require('../useGSAPAnimation').useGSAPAnimation({ ref, animation, delay: 500 }))
    expect(animation).not.toHaveBeenCalled()
    jest.advanceTimersByTime(500)
    expect(animation).toHaveBeenCalled()
  })
})

