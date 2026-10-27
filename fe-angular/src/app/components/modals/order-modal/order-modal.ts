import { Component, input, Output, EventEmitter, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { OrderCreateRequest } from '../../../models/order.model';
import { Product } from '../../../models/product.model';
import { Customer } from '../../../models/customer.model';
import { MatDialogModule } from '@angular/material/dialog';
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
  isOpen = input(false);
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  customers = signal<Customer[]>([]);
  products = signal<Product[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  errors = signal<Record<string, string>>({});

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
    const newErrors: Record<string, string> = {};
    if (!this.formData.customer_id) {
      newErrors['customer_id'] = 'Selecione um cliente';
    }
    if (!this.formData.product_id) {
      newErrors['product_id'] = 'Selecione um produto';
    }
    if (this.formData.quantity <= 0) {
      newErrors['quantity'] = 'Quantidade deve ser maior que zero';
    }
    const product = this.selectedProduct;
    if (product && product.stock_quantity !== undefined && product.stock_quantity < this.formData.quantity) {
      newErrors['quantity'] = `Estoque insuficiente. Disponível: ${product.stock_quantity}`;
    }
    if (Object.keys(newErrors).length > 0) {
      this.errors.set(newErrors);
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
    this.errors.set({});
  }

  clearError(field: string) {
    this.errors.update(prev => ({ ...prev, [field]: '' }));
  }

  onClose() {
    this.close.emit();
    this.resetForm();
  }
}
