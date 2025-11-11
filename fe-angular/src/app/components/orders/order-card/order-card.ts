import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Order, OrderStatus } from '../../../models/order.model';
import { PaymentModalComponent } from '../../modals/payment-modal/payment-modal';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-order-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PaymentModalComponent,
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './order-card.html',
  styleUrl: './order-card.css'
})
export class OrderCardComponent {
  @Input() order!: Order;
  @Output() paymentSuccess = new EventEmitter<void>();

  isPaymentModalOpen = signal(false);

  readonly OrderStatus = OrderStatus;

  statusColors: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    [OrderStatus.PROCESSING]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    [OrderStatus.COMPLETED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    [OrderStatus.FAILED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    [OrderStatus.CANCELLED]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  handlePaymentClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.order.status !== OrderStatus.PENDING) {
      return;
    }

    this.isPaymentModalOpen.set(true);
  }

  handlePaymentSuccess() {
    this.isPaymentModalOpen.set(false);
    this.paymentSuccess.emit();
  }
}
