import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from '../EmptyState'

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No orders found" description="Create your first order" />)
    expect(screen.getByText('No orders found')).toBeInTheDocument()
    expect(screen.getByText('Create your first order')).toBeInTheDocument()
  })

  it('renders without description', () => {
    render(<EmptyState title="No orders found" />)
    expect(screen.getByText('No orders found')).toBeInTheDocument()
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument()
  })

  it('renders action button and handles click', () => {
    const handleClick = vi.fn()
    render(
      <EmptyState
        title="No orders"
        action={{ label: 'Create Order', onClick: handleClick }}
      />
    )
    const button = screen.getByRole('button', { name: 'Create Order' })
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    const { container } = render(<EmptyState title="No orders" className="my-custom-class" />)
    expect(container.firstChild).toHaveClass('my-custom-class')
  })
})
