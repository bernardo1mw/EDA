import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { OrderCardComponent } from './order-card';
import { PaymentModalComponent } from '../../modals/payment-modal/payment-modal';
import { Order, OrderStatus } from '../../../models/order.model';

@Component({ selector: 'app-payment-modal', template: '', standalone: true })
class MockPaymentModalComponent {
  @Input() isOpen: unknown;
  @Input() order: unknown;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();
}

const baseOrder: Order = {
  id: 'abc12345-0000-0000-0000-000000000000',
  customer_id: 'customer-001',
  product_id: 'product-001',
  quantity: 2,
  total_amount: 199.99,
  status: OrderStatus.PENDING,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

describe('OrderCardComponent', () => {
  let fixture: ComponentFixture<OrderCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderCardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
      ],
    })
      .overrideComponent(OrderCardComponent, {
        remove: { imports: [PaymentModalComponent] },
        add: { imports: [MockPaymentModalComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(OrderCardComponent);
    fixture.componentInstance.order = baseOrder;
    fixture.detectChanges();
  });

  it('renders order ID in heading', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).toContain('abc12345');
  });

  it('renders order status badge', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).toContain('PENDING');
  });

  it('shows payment button for PENDING_PAYMENT status', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    const button = compiled.querySelector('button[mat-raised-button]');
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain('Pagar com Stripe');
  });

  it('hides payment button for COMPLETED status', () => {
    fixture.componentInstance.order = { ...baseOrder, status: OrderStatus.COMPLETED };
    fixture.detectChanges();
    const compiled: HTMLElement = fixture.nativeElement;
    const button = compiled.querySelector('button[mat-raised-button]');
    expect(button).toBeNull();
  });

  it('displays formatted currency for total amount', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    // formatCurrency uses pt-BR locale; check the numeric portion
    expect(compiled.textContent).toContain('199');
  });
});
