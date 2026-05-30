/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

describe('share link generators', () => {
  beforeEach(() => {
    jest.resetModules()
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_VERCEL_URL
  })

  it('generateEmergencyLink produces correct URL', () => {
    const { generateEmergencyLink } = require('@/lib/share')
    const url = generateEmergencyLink(13.0827, 80.2707)
    expect(url).toBe('http://localhost/locator?lat=13.082700&lon=80.270700&source=deeplink')
  })

  it('generateSOSLink produces correct URL', () => {
    const { generateSOSLink } = require('@/lib/share')
    const url = generateSOSLink(12.9716, 77.5946)
    expect(url).toBe('http://localhost/sos?lat=12.971600&lon=77.594600&mode=sos&source=deeplink')
  })

  it('generateTrackingLink produces correct URL', () => {
    const { generateTrackingLink } = require('@/lib/share')
    const url = generateTrackingLink('abc-123')
    expect(url).toBe('http://localhost/track/abc-123?source=deeplink')
  })

  it('generateEmergencyCardLink produces correct URL', () => {
    const { generateEmergencyCardLink } = require('@/lib/share')
    const url = generateEmergencyCardLink('user-456')
    expect(url).toBe('http://localhost/ec/user-456')
  })

  it('generateReportLink produces correct URL', () => {
    const { generateReportLink } = require('@/lib/share')
    const url = generateReportLink(13.0827, 80.2707)
    expect(url).toBe('http://localhost/report?lat=13.082700&lon=80.270700&source=deeplink')
  })
})
