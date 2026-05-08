import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Page from '../app/page'

// Mock the next/link component
jest.mock('next/link', () => {
  return ({ children }: { children: React.ReactNode }) => {
    return children
  }
})

describe('Home Page structural verification', () => {
  it('renders the SafeVixAI app shell', () => {
    render(<Page />)
    expect(screen.getByPlaceholderText(/Ask Maps or Search/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Enable Location/i).length).toBeGreaterThan(0)
  })

  it('renders the emergency protocol surface', () => {
    render(<Page />)
    expect(screen.getByText(/Emergency Protocols/i)).toBeInTheDocument()
    expect(screen.getAllByTitle(/Geolocation not supported/i).length).toBeGreaterThan(0)
  })
})
