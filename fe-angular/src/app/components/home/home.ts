import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { firstValueFrom, interval, Subscription } from 'rxjs';
import { takeWhile, switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Order, OrderStatus } from '../../models/order.model';
import { Customer } from '../../models/customer.model';
import { OrderCardComponent } from '../orders/order-card/order-card';
import { OrderModalComponent } from '../modals/order-modal/order-modal';
import { PaginationComponent } from '../pagination/pagination';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const PAGE_SIZE = 20;

interface OrdersByCustomer {
  customer: Customer | null;
  orders: Order[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    OrderCardComponent,
    OrderModalComponent,
    PaginationComponent,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  orders = signal<Order[]>([]);
  customers = signal<Customer[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  isOrderModalOpen = signal(false);
  page = signal(1);
  readonly PAGE_SIZE = PAGE_SIZE;

  private pollingSubscription: Subscription | null = null;

  estimatedTotal = computed(() => {
    const orders = this.orders();
    const page = this.page();
    return orders.length < PAGE_SIZE
      ? (page - 1) * PAGE_SIZE + orders.length
      : page * PAGE_SIZE + 1;
  });

  ordersByCustomer = computed(() => {
    const grouped: Record<string, OrdersByCustomer> = {};
    const ordersList = this.orders();
    const customersList = this.customers();

    ordersList.forEach((order) => {
      const customerId = order.customer_id;
      if (!grouped[customerId]) {
        const customer = customersList.find((c) => c.id === customerId);
        grouped[customerId] = {
          customer: customer || null,
          orders: [],
        };
      }
      grouped[customerId].orders.push(order);
    });

    return grouped;
  });

  ordersByCustomerEntries = computed(() => {
    return Object.entries(this.ordersByCustomer());
  });

  ordersByCustomerKeys = computed(() => {
    return Object.keys(this.ordersByCustomer());
  });

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.pollingSubscription?.unsubscribe();
  }

  loadData() {
    this.isLoading.set(true);
    this.error.set(null);

    const offset = (this.page() - 1) * PAGE_SIZE;

    Promise.all([
      firstValueFrom(this.apiService.listAllOrders(PAGE_SIZE, offset)),
      firstValueFrom(this.apiService.listCustomers(1000, 0))
    ]).then(
      ([orders, customers]) => {
        this.orders.set(orders || []);
        this.customers.set(customers || []);
        this.isLoading.set(false);
      },
      (error) => {
        this.error.set(error.message || 'Erro ao carregar dados');
        this.isLoading.set(false);
      }
    );
  }

  handlePaymentSuccess() {
    this.startPolling();
  }

  handleOrderCreated() {
    this.page.set(1);
    this.loadData();
  }

  private startPolling() {
    this.pollingSubscription?.unsubscribe();
    const offset = (this.page() - 1) * PAGE_SIZE;
    this.pollingSubscription = interval(3000).pipe(
      takeWhile(() =>
        this.orders().some(
          (o) => o.status === OrderStatus.PENDING || o.status === OrderStatus.PROCESSING
        )
      ),
      switchMap(() => this.apiService.listAllOrders(PAGE_SIZE, offset))
    ).subscribe((orders) => this.orders.set(orders ?? []));
  }

  onPageChange(page: number) {
    this.page.set(page);
    this.loadData();
  }

  openOrderModal() {
    this.isOrderModalOpen.set(true);
  }

  closeOrderModal() {
    this.isOrderModalOpen.set(false);
  }
}
