// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import { create } from 'zustand'
import { createSettingsSlice } from '../settings-slice'
import type { SettingsSlice } from '../settings-slice'

describe('SettingsSlice', function() {
  function createTestStore() {
    return create<SettingsSlice>()(function(set, get, api) {
      return createSettingsSlice(set, get, api)
    })
  }

  it('has default values', function() {
    var store = createTestStore()
    var state = store.getState()
    expect(state.soundsEnabled).toBe(false)
    expect(state.speedAlert).toBe(false)
    expect(state.hazardNotifs).toBe(true)
    expect(state.locationTracking).toBe(true)
    expect(state.sosVibration).toBe(true)
    expect(state.autoOffline).toBe(true)
    expect(state.analyticsOptIn).toBe(false)
    expect(state.navApp).toBe('google')
  })

  it('toggles soundsEnabled', function() {
    var store = createTestStore()
    store.getState().setSoundsEnabled(true)
    expect(store.getState().soundsEnabled).toBe(true)
    store.getState().setSoundsEnabled(false)
    expect(store.getState().soundsEnabled).toBe(false)
  })

  it('toggles speedAlert', function() {
    var store = createTestStore()
    store.getState().setSpeedAlert(true)
    expect(store.getState().speedAlert).toBe(true)
  })

  it('toggles hazardNotifs', function() {
    var store = createTestStore()
    store.getState().setHazardNotifs(false)
    expect(store.getState().hazardNotifs).toBe(false)
  })

  it('toggles locationTracking', function() {
    var store = createTestStore()
    store.getState().setLocationTracking(false)
    expect(store.getState().locationTracking).toBe(false)
  })

  it('toggles sosVibration', function() {
    var store = createTestStore()
    store.getState().setSosVibration(false)
    expect(store.getState().sosVibration).toBe(false)
  })

  it('toggles autoOffline', function() {
    var store = createTestStore()
    store.getState().setAutoOffline(false)
    expect(store.getState().autoOffline).toBe(false)
  })

  it('toggles analyticsOptIn', function() {
    var store = createTestStore()
    store.getState().setAnalyticsOptIn(true)
    expect(store.getState().analyticsOptIn).toBe(true)
  })

  it('sets navApp to waze', function() {
    var store = createTestStore()
    store.getState().setNavApp('waze')
    expect(store.getState().navApp).toBe('waze')
  })

  it('sets navApp to apple', function() {
    var store = createTestStore()
    store.getState().setNavApp('apple')
    expect(store.getState().navApp).toBe('apple')
  })

  it('sets all settings in sequence', function() {
    var store = createTestStore()
    store.getState().setSoundsEnabled(true)
    store.getState().setSpeedAlert(true)
    store.getState().setHazardNotifs(false)
    store.getState().setLocationTracking(false)
    store.getState().setSosVibration(false)
    store.getState().setAutoOffline(false)
    store.getState().setAnalyticsOptIn(true)
    store.getState().setNavApp('waze')
    var s = store.getState()
    expect(s.soundsEnabled).toBe(true)
    expect(s.speedAlert).toBe(true)
    expect(s.hazardNotifs).toBe(false)
    expect(s.locationTracking).toBe(false)
    expect(s.sosVibration).toBe(false)
    expect(s.autoOffline).toBe(false)
    expect(s.analyticsOptIn).toBe(true)
    expect(s.navApp).toBe('waze')
  })
})
