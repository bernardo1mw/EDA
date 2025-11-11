import { Component, Input, Output, EventEmitter, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { OrderCreateRequest } from '../../../models/order.model';
import { Product } from '../../../models/product.model';
import { Customer } from '../../../models/customer.model';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-order-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './order-modal.html',
  styleUrl: './order-modal.css',
})
export class OrderModalComponent {
  @Input() isOpen = signal(false);
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  customers = signal<Customer[]>([]);
  products = signal<Product[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  formData: OrderCreateRequest = {
    customer_id: '',
    product_id: '',
    quantity: 1,
    total_amount: 0,
  };

  selectedProductId = signal<string>('');

  constructor(private apiService: ApiService) {
    effect(() => {
      if (this.isOpen()) {
        this.loadData();
      }
    });
  }

  loadData() {
    this.isLoading.set(true);
    Promise.all([
      this.apiService.listCustomers(1000, 0).toPromise(),
      this.apiService.listProducts(1000, 0).toPromise()
    ]).then(
      ([customers, products]) => {
        this.customers.set(customers || []);
        this.products.set(products || []);
        this.isLoading.set(false);
      },
      (error) => {
        this.error.set(error.message || 'Erro ao carregar dados');
        this.isLoading.set(false);
      }
    );
  }

  get selectedProduct(): Product | undefined {
    return this.products().find(p => p.id === this.selectedProductId());
  }

  updateTotal() {
    const product = this.selectedProduct;
    if (product && this.formData.quantity > 0) {
      this.formData.total_amount = product.price * this.formData.quantity;
    }
  }

  onSubmit() {
    if (!this.formData.customer_id || !this.formData.product_id || this.formData.quantity <= 0) {
      return;
    }

    const product = this.selectedProduct;
    if (product && product.stock_quantity !== undefined && product.stock_quantity < this.formData.quantity) {
      this.error.set('Estoque insuficiente');
      return;
    }

    this.isLoading.set(true);
    this.apiService.createOrder(this.formData).subscribe({
      next: () => {
        this.success.emit();
        this.close.emit();
        this.resetForm();
      },
      error: (error) => {
        this.error.set(error.message || 'Erro ao criar pedido');
        this.isLoading.set(false);
      }
    });
  }

  resetForm() {
    this.formData = {
      customer_id: '',
      product_id: '',
      quantity: 1,
      total_amount: 0,
    };
    this.selectedProductId.set('');
    this.error.set(null);
  }

  onClose() {
    this.close.emit();
    this.resetForm();
  }
}
