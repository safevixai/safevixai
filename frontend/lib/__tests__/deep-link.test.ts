/**
 * @jest-environment jsdom
 */
import { describe, it, expect } from '@jest/globals'
import { parseDeepLink } from '@/lib/deep-link'

describe('parseDeepLink', () => {
  it('extracts lat/lon from URL', () => {
    const result = parseDeepLink('https://example.com/emergency?lat=13.08&lon=80.27')
    expect(result.lat).toBeCloseTo(13.08, 2)
    expect(result.lon).toBeCloseTo(80.27, 2)
    expect(result.hasLocation).toBe(true)
  })

  it('returns null lat/lon when params missing', () => {
    const result = parseDeepLink('https://example.com/')
    expect(result.lat).toBeNull()
    expect(result.lon).toBeNull()
    expect(result.hasLocation).toBe(false)
  })

  it('validates lat/lon out of range', () => {
    const result = parseDeepLink('https://example.com/?lat=100&lon=200')
    expect(result.lat).toBeNull()
    expect(result.lon).toBeNull()
    expect(result.hasLocation).toBe(false)
  })

  it('parses activation mode from URL', () => {
    const result = parseDeepLink('https://example.com/?mode=sos')
    expect(result.mode).toBe('sos')
  })

  it('rejects invalid mode', () => {
    const result = parseDeepLink('https://example.com/?mode=invalid')
    expect(result.mode).toBeNull()
  })

  it('parses source attribution', () => {
    const result = parseDeepLink('https://example.com/?source=qr')
    expect(result.source).toBe('qr')
  })

  it('rejects invalid source', () => {
    const result = parseDeepLink('https://example.com/?source=invalid')
    expect(result.source).toBeNull()
  })

  it('parses session ID', () => {
    const result = parseDeepLink('https://example.com/?session=abc-123-def')
    expect(result.sessionId).toBe('abc-123-def')
  })

  it('parses state and section for challan', () => {
    const result = parseDeepLink('https://example.com/?state=TN&section=MVA_185')
    expect(result.state).toBe('TN')
    expect(result.section).toBe('MVA_185')
  })

  it('handles relative URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
    const result = parseDeepLink('/emergency?lat=12.97&lon=77.59')
    expect(result.lat).toBeCloseTo(12.97, 2)
    expect(result.lon).toBeCloseTo(77.59, 2)
    delete process.env.NEXT_PUBLIC_APP_URL
  })
})
