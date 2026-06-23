// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ConnectivityProvider } from '@/components/ConnectivityProvider'

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

jest.mock('@/lib/use-hydrated', () => ({
  __esModule: true,
  default: () => true,
  markHydrated: jest.fn(),
}))

jest.mock('@/hooks/usePageEntry', () => ({
  usePageEntry: () => ({ ref: { current: null }, entered: true }),
}))

function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ConnectivityProvider>
        {children}
      </ConnectivityProvider>
    </ThemeProvider>
  )
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllTheProviders, ...options })
}

export * from '@testing-library/react'
export { customRender as render }
export { AllTheProviders }
