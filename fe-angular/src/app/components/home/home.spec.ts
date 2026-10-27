import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { HomeComponent } from './home';
import { ApiService } from '../../services/api.service';
import { OrderCardComponent } from '../orders/order-card/order-card';
import { OrderModalComponent } from '../modals/order-modal/order-modal';
import { PaginationComponent } from '../pagination/pagination';
import { Order, OrderStatus } from '../../models/order.model';
import { Customer } from '../../models/customer.model';

@Component({ selector: 'app-order-card', template: '', standalone: true })
class MockOrderCardComponent {
  @Input() order: unknown;
  @Output() paymentSuccess = new EventEmitter<void>();
}

@Component({ selector: 'app-order-modal', template: '', standalone: true })
class MockOrderModalComponent {
  @Input() isOpen: unknown;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();
}

@Component({ selector: 'app-pagination', template: '', standalone: true })
class MockPaginationComponent {
  @Input() currentPage: unknown;
  @Input() totalItems: unknown;
  @Input() pageSize: unknown;
  @Output() pageChange = new EventEmitter<number>();
}

const mockOrders: Order[] = [
  {
    id: 'order-1',
    customer_id: 'cust-1',
    product_id: 'prod-1',
    quantity: 1,
    total_amount: 50,
    status: OrderStatus.PENDING,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'order-2',
    customer_id: 'cust-2',
    product_id: 'prod-2',
    quantity: 2,
    total_amount: 100,
    status: OrderStatus.COMPLETED,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const mockCustomers: Customer[] = [
  { id: 'cust-1', name: 'Alice', email: 'alice@example.com', created_at: '2024-01-01T00:00:00Z' },
  { id: 'cust-2', name: 'Bob', email: 'bob@example.com', created_at: '2024-01-01T00:00:00Z' },
];

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let mockApiService: { listAllOrders: jest.Mock; listCustomers: jest.Mock };

  beforeEach(async () => {
    mockApiService = {
      listAllOrders: jest.fn().mockReturnValue(of(mockOrders)),
      listCustomers: jest.fn().mockReturnValue(of(mockCustomers)),
    };

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        provideRouter([]),
        provideAnimationsAsync(),
      ],
    })
      .overrideComponent(HomeComponent, {
        remove: { imports: [OrderCardComponent, OrderModalComponent, PaginationComponent] },
        add: { imports: [MockOrderCardComponent, MockOrderModalComponent, MockPaginationComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
  });

  it('creates component', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads orders on init by calling api service', () => {
    fixture.detectChanges();
    // PAGE_SIZE = 20, page = 1 → offset = 0
    expect(mockApiService.listAllOrders).toHaveBeenCalledWith(20, 0);
    expect(mockApiService.listCustomers).toHaveBeenCalledWith(1000, 0);
  });

  it('groups orders by customer using computed signal', () => {
    // Set signals directly to test computed logic isolated from async timing
    fixture.componentInstance.orders.set(mockOrders);
    fixture.componentInstance.customers.set(mockCustomers);
    fixture.detectChanges();

    const grouped = fixture.componentInstance.ordersByCustomer();
    expect(Object.keys(grouped).length).toBe(2);
    expect(grouped['cust-1'].orders.length).toBe(1);
    expect(grouped['cust-2'].orders.length).toBe(1);
    expect(grouped['cust-1'].customer?.name).toBe('Alice');
  });

  it('shows loading state', () => {
    fixture.componentInstance.isLoading.set(true);
    fixture.detectChanges();
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.querySelector('mat-spinner')).not.toBeNull();
  });

  it('shows error state', () => {
    // detectChanges first so ngOnInit fires, then override signals
    fixture.detectChanges();
    fixture.componentInstance.error.set('Network error');
    fixture.componentInstance.isLoading.set(false);
    fixture.detectChanges();
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).toContain('Network error');
  });
});
