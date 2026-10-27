import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.html',
})
export class PaginationComponent {
  @Input() set currentPage(value: number) { this._currentPage.set(value); }
  @Input() set totalItems(value: number) { this._totalItems.set(value); }
  @Input() set pageSize(value: number) { this._pageSize.set(value); }
  @Output() pageChange = new EventEmitter<number>();

  _currentPage = signal(1);
  _totalItems = signal(0);
  _pageSize = signal(20);

  totalPages = computed(() => Math.ceil(this._totalItems() / this._pageSize()));
  hasPrev = computed(() => this._currentPage() > 1);
  hasNext = computed(() => this._currentPage() < this.totalPages());

  prev() {
    if (this.hasPrev()) {
      this.pageChange.emit(this._currentPage() - 1);
    }
  }

  next() {
    if (this.hasNext()) {
      this.pageChange.emit(this._currentPage() + 1);
    }
  }
}
