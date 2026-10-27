import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { Customer } from '../../../models/customer.model';
import { CustomerModalComponent } from '../../modals/customer-modal/customer-modal';
import { PaginationComponent } from '../../pagination/pagination';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, CustomerModalComponent, PaginationComponent, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './customers.html',
  styleUrl: './customers.css',
})
export class CustomersComponent implements OnInit {
  allCustomers = signal<Customer[]>([]);
  loading = signal(true);
  error = signal('');
  isModalOpen = signal(false);
  editingCustomer = signal<Customer | null>(null);
  page = signal(1);
  readonly PAGE_SIZE = PAGE_SIZE;

  customers = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.allCustomers().slice(start, start + PAGE_SIZE);
  });

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.loading.set(true);
    this.error.set('');
    this.apiService.listCustomers(1000, 0).subscribe({
      next: (customers) => {
        this.allCustomers.set(customers);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Erro ao carregar clientes');
        this.loading.set(false);
      },
    });
  }

  onPageChange(page: number) {
    this.page.set(page);
  }

  openAddModal() {
    this.editingCustomer.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(customer: Customer) {
    this.editingCustomer.set(customer);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  handleSuccess() {
    this.loadCustomers();
  }
}
