import { Component, Input, Output, EventEmitter, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { Order } from '../../../models/order.model';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './payment-modal.html',
  styleUrl: './payment-modal.css',
})
export class PaymentModalComponent {
  @Input() isOpen = signal(false);
  @Input() order!: Order;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  isLoading = signal(false);
  error = signal<string | null>(null);
  clientSecret = signal<string | null>(null);
  paymentIntentId = signal<string | null>(null);

  constructor(private apiService: ApiService) {
    effect(() => {
      if (this.isOpen() && this.order) {
        this.createPaymentIntent();
      } else {
        this.reset();
      }
    });
  }

  createPaymentIntent() {
    this.isLoading.set(true);
    this.apiService.createPaymentIntent(
      this.order.id,
      this.order.total_amount,
      'card'
    ).subscribe({
      next: (result) => {
        this.clientSecret.set(result.clientSecret);
        this.paymentIntentId.set(result.paymentIntentId);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.error.set(error.message || 'Erro ao criar payment intent');
        this.isLoading.set(false);
      }
    });
  }

  onClose() {
    this.close.emit();
    this.reset();
  }

  reset() {
    this.clientSecret.set(null);
    this.paymentIntentId.set(null);
    this.error.set(null);
  }
}
