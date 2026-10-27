import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorDisplay } from '../ErrorDisplay'

describe('ErrorDisplay', () => {
  it('renders error message', () => {
    render(<ErrorDisplay message="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders retry button and handles click', () => {
    const handleRetry = vi.fn()
    render(<ErrorDisplay message="Error occurred" onRetry={handleRetry} />)
    const button = screen.getByRole('button', { name: /Tentar Novamente/ })
    fireEvent.click(button)
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('renders compact variant', () => {
    render(<ErrorDisplay message="Compact error" variant="compact" />)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(screen.getByText('Compact error')).toBeInTheDocument()
  })

  it('renders without retry button when onRetry is not provided', () => {
    render(<ErrorDisplay message="Error" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
