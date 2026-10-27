import { Component, Input, input, Output, EventEmitter, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { Product } from '../../../models/product.model';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './product-modal.html',
  styleUrl: './product-modal.css',
})
export class ProductModalComponent {
  isOpen = input(false);
  @Input() product: Product | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  isLoading = signal(false);
  error = signal<string | null>(null);
  errors = signal<Record<string, string>>({});
  formData = { name: '', sku: '', price: 0, stock_quantity: 0, description: '' };

  constructor(private apiService: ApiService) {
    effect(() => {
      if (this.isOpen()) {
        this.resetForm();
      }
    });
  }

  resetForm() {
    if (this.product) {
      this.formData = {
        name: this.product.name,
        sku: this.product.sku || '',
        price: this.product.price,
        stock_quantity: this.product.stock_quantity ?? 0,
        description: this.product.description || '',
      };
    } else {
      this.formData = { name: '', sku: '', price: 0, stock_quantity: 0, description: '' };
    }
    this.error.set(null);
    this.errors.set({});
    this.isLoading.set(false);
  }

  clearError(field: string) {
    this.errors.update(prev => ({ ...prev, [field]: '' }));
  }

  onSubmit() {
    const newErrors: Record<string, string> = {};
    if (!this.formData.name.trim()) {
      newErrors['name'] = 'Nome é obrigatório';
    }
    if (this.formData.price <= 0) {
      newErrors['price'] = 'Preço deve ser maior que zero';
    }
    if (this.formData.stock_quantity < 0) {
      newErrors['stock_quantity'] = 'Estoque não pode ser negativo';
    }
    if (Object.keys(newErrors).length > 0) {
      this.errors.set(newErrors);
      return;
    }

    this.isLoading.set(true);
    const data: { name: string; price: number; stock_quantity: number; sku?: string; description?: string } = {
      name: this.formData.name.trim(),
      price: this.formData.price,
      stock_quantity: this.formData.stock_quantity,
    };
    if (this.formData.sku.trim()) data.sku = this.formData.sku.trim();
    if (this.formData.description.trim()) data.description = this.formData.description.trim();

    const request$ = this.product
      ? this.apiService.updateProduct(this.product.id, data)
      : this.apiService.createProduct(data);

    request$.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.success.emit();
        this.close.emit();
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Erro ao salvar produto');
        this.isLoading.set(false);
      },
    });
  }

  onClose() {
    this.close.emit();
    this.resetForm();
  }
}
