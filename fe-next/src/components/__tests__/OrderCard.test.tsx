import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrderCard } from '../OrderCard'
import { Order, OrderStatus } from '@/types/order'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/components/modals/PaymentModal', () => ({
  PaymentModal: () => null,
}))

const baseOrder: Order = {
  id: 'abc12345-0000-0000-0000-000000000000',
  customer_id: 'customer-001',
  product_id: 'product-001',
  quantity: 2,
  total_amount: 199.99,
  status: OrderStatus.PENDING,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('OrderCard', () => {
  it('renders order ID and status', () => {
    render(<OrderCard order={baseOrder} />, { wrapper: Wrapper })
    expect(screen.getByText(/abc12345/)).toBeInTheDocument()
    expect(screen.getByText('PENDING')).toBeInTheDocument()
  })

  it('renders order amount', () => {
    render(<OrderCard order={baseOrder} />, { wrapper: Wrapper })
    // formatCurrency uses pt-BR locale — just verify the numeric value appears
    expect(screen.getByText(/199/)).toBeInTheDocument()
  })

  it('shows payment button for PENDING orders', () => {
    render(<OrderCard order={baseOrder} />, { wrapper: Wrapper })
    expect(screen.getByRole('button', { name: /Pagar com Stripe/ })).toBeInTheDocument()
  })

  it('hides payment button for COMPLETED orders', () => {
    const completedOrder: Order = { ...baseOrder, status: OrderStatus.COMPLETED }
    render(<OrderCard order={completedOrder} />, { wrapper: Wrapper })
    expect(screen.queryByRole('button', { name: /Pagar com Stripe/ })).not.toBeInTheDocument()
  })

  it('displays correct status badge color for PENDING', () => {
    render(<OrderCard order={baseOrder} />, { wrapper: Wrapper })
    const badge = screen.getByText('PENDING')
    expect(badge).toHaveClass('bg-yellow-100')
  })

  it('displays correct status badge color for COMPLETED', () => {
    const completedOrder: Order = { ...baseOrder, status: OrderStatus.COMPLETED }
    render(<OrderCard order={completedOrder} />, { wrapper: Wrapper })
    const badge = screen.getByText('COMPLETED')
    expect(badge).toHaveClass('bg-green-100')
  })
})
