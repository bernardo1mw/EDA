import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { Order, OrderStatus } from '../../../models/order.model';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { formatCurrency, formatDate } from '../../../utils/format.util';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export class OrderDetailComponent implements OnInit {
  order = signal<Order | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  readonly OrderStatus = OrderStatus;
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;

  statusColors: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    [OrderStatus.PROCESSING]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    [OrderStatus.COMPLETED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    [OrderStatus.FAILED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    [OrderStatus.CANCELLED]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };

  statusLabels: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'Pendente',
    [OrderStatus.PROCESSING]: 'Processando',
    [OrderStatus.COMPLETED]: 'Completado',
    [OrderStatus.FAILED]: 'Falhou',
    [OrderStatus.CANCELLED]: 'Cancelado',
  };

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadOrder(id);
    } else {
      this.error.set('ID do pedido não encontrado');
      this.isLoading.set(false);
    }
  }

  loadOrder(id: string) {
    this.isLoading.set(true);
    this.error.set(null);
    this.apiService.getOrderById(id).subscribe({
      next: (order: Order) => {
        this.order.set(order);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Erro ao carregar pedido');
        this.isLoading.set(false);
      },
    });
  }
}
