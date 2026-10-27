import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { Product } from '../../../models/product.model';
import { ProductModalComponent } from '../../modals/product-modal/product-modal';
import { PaginationComponent } from '../../pagination/pagination';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { formatCurrency } from '../../../utils/format.util';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ProductModalComponent, PaginationComponent, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class ProductsComponent implements OnInit {
  allProducts = signal<Product[]>([]);
  loading = signal(true);
  error = signal('');
  isModalOpen = signal(false);
  editingProduct = signal<Product | null>(null);
  page = signal(1);
  readonly PAGE_SIZE = PAGE_SIZE;

  products = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.allProducts().slice(start, start + PAGE_SIZE);
  });

  readonly formatCurrency = formatCurrency;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.loading.set(true);
    this.error.set('');
    this.apiService.listProducts(1000, 0).subscribe({
      next: (products) => {
        this.allProducts.set(products);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Erro ao carregar produtos');
        this.loading.set(false);
      },
    });
  }

  onPageChange(page: number) {
    this.page.set(page);
  }

  openAddModal() {
    this.editingProduct.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(product: Product) {
    this.editingProduct.set(product);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  handleSuccess() {
    this.loadProducts();
  }
}
