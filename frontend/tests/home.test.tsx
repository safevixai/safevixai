// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Page from '../app/page'

// Mock the next/link component
jest.mock('next/link', () => {
  return ({ children }: { children: React.ReactNode }) => {
    return children
  }
})

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

describe('Home Page structural verification', function() {
  it('renders the SafeVixAI app shell', function() {
    render(<Page />)
    expect(screen.getByPlaceholderText(/Ask Maps or Search/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Enable Location/i).length).toBeGreaterThan(0)
  })

  it('renders the emergency protocol surface', function() {
    render(<Page />)
    expect(screen.getByText(/Emergency Protocols/i)).toBeInTheDocument()
    expect(screen.getAllByTitle(/Geolocation not supported/i).length).toBeGreaterThan(0)
  })
})

