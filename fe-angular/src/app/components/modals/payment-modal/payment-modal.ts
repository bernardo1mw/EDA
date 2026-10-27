import { Component, Input, input, Output, EventEmitter, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { Order } from '../../../models/order.model';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './payment-modal.html',
  styleUrl: './payment-modal.css',
})
export class PaymentModalComponent {
  isOpen = input(false);
  @Input() order!: Order;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  isLoading = signal(false);
  error = signal<string | null>(null);
  isSuccess = signal(false);

  constructor(private apiService: ApiService) {
    effect(() => {
      if (this.isOpen() && this.order) {
        this.processPayment();
      } else {
        this.reset();
      }
    });
  }

  processPayment() {
    this.isLoading.set(true);
    this.error.set(null);
    this.isSuccess.set(false);

    this.apiService.createPaymentIntent(this.order.id, this.order.total_amount, 'card').subscribe({
      next: (result) => {
        // Demo-only: Stripe test payment method
        this.apiService.confirmPayment(result.payment_intent_id, 'pm_card_visa', this.order.id).subscribe({
          next: () => {
            this.isLoading.set(false);
            this.isSuccess.set(true);
          },
          error: (err: Error) => {
            this.error.set(err.message || 'Erro ao confirmar pagamento');
            this.isLoading.set(false);
          },
        });
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Erro ao criar payment intent');
        this.isLoading.set(false);
      },
    });
  }

  onClose() {
    this.close.emit();
    this.reset();
  }

  onSuccess() {
    this.success.emit();
    this.close.emit();
    this.reset();
  }

  reset() {
    this.error.set(null);
    this.isSuccess.set(false);
    this.isLoading.set(false);
  }
}
