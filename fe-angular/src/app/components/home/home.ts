import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Order } from '../../models/order.model';
import { Customer } from '../../models/customer.model';
import { OrderCardComponent } from '../orders/order-card/order-card';
import { OrderModalComponent } from '../modals/order-modal/order-modal';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  orders = signal<Order[]>([]);
  customers = signal<Customer[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  isOrderModalOpen = signal(false);

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

  loadData() {
    this.isLoading.set(true);
    this.error.set(null);

    Promise.all([
      this.apiService.listAllOrders(1000, 0).toPromise(),
      this.apiService.listCustomers(1000, 0).toPromise()
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
    // Aguardar um pouco para o backend processar o pagamento
    setTimeout(() => {
      this.loadData();
      // Se o status ainda não foi atualizado, tentar novamente após mais alguns segundos
      setTimeout(() => {
        this.loadData();
      }, 3000);
    }, 2000);
  }

  handleOrderCreated() {
    this.loadData();
  }

  openOrderModal() {
    this.isOrderModalOpen.set(true);
  }

  closeOrderModal() {
    this.isOrderModalOpen.set(false);
  }
}
