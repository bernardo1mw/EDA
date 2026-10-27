import { Component, Input, input, Output, EventEmitter, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { Customer } from '../../../models/customer.model';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-customer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './customer-modal.html',
  styleUrl: './customer-modal.css',
})
export class CustomerModalComponent {
  isOpen = input(false);
  @Input() customer: Customer | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  isLoading = signal(false);
  error = signal<string | null>(null);
  errors = signal<Record<string, string>>({});
  formData = { name: '', email: '', phone: '', address: '' };

  constructor(private apiService: ApiService) {
    effect(() => {
      if (this.isOpen()) {
        this.resetForm();
      }
    });
  }

  resetForm() {
    if (this.customer) {
      this.formData = {
        name: this.customer.name,
        email: this.customer.email,
        phone: this.customer.phone || '',
        address: this.customer.address || '',
      };
    } else {
      this.formData = { name: '', email: '', phone: '', address: '' };
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
    if (!this.formData.email.trim()) {
      newErrors['email'] = 'Email é obrigatório';
    } else if (!this.formData.email.includes('@')) {
      newErrors['email'] = 'Email inválido';
    }
    if (Object.keys(newErrors).length > 0) {
      this.errors.set(newErrors);
      return;
    }

    this.isLoading.set(true);
    const data: { name: string; email: string; phone?: string; address?: string } = {
      name: this.formData.name.trim(),
      email: this.formData.email.trim(),
    };
    if (this.formData.phone.trim()) data.phone = this.formData.phone.trim();
    if (this.formData.address.trim()) data.address = this.formData.address.trim();

    const request$ = this.customer
      ? this.apiService.updateCustomer(this.customer.id, data)
      : this.apiService.createCustomer(data);

    request$.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.success.emit();
        this.close.emit();
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Erro ao salvar cliente');
        this.isLoading.set(false);
      },
    });
  }

  onClose() {
    this.close.emit();
    this.resetForm();
  }
}
