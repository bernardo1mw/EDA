import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />)
    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    const spinnerEl = status.querySelector('.h-8.w-8')
    expect(spinnerEl).toBeInTheDocument()
  })

  it('renders with custom text', () => {
    render(<LoadingSpinner text="Loading orders..." />)
    const elements = screen.getAllByText('Loading orders...')
    expect(elements.length).toBeGreaterThan(0)
  })

  it('renders sm size', () => {
    render(<LoadingSpinner size="sm" />)
    const status = screen.getByRole('status')
    const spinnerEl = status.querySelector('.h-4.w-4')
    expect(spinnerEl).toBeInTheDocument()
  })

  it('renders lg size', () => {
    render(<LoadingSpinner size="lg" />)
    const status = screen.getByRole('status')
    const spinnerEl = status.querySelector('.h-12.w-12')
    expect(spinnerEl).toBeInTheDocument()
  })
})
