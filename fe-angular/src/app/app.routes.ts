import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./components/home/home').then(m => m.HomeComponent) },
  { path: 'products', loadComponent: () => import('./components/products/products/products').then(m => m.ProductsComponent) },
  { path: 'customers', loadComponent: () => import('./components/customers/customers/customers').then(m => m.CustomersComponent) },
  { path: 'orders/:id', loadComponent: () => import('./components/orders/order-detail/order-detail').then(m => m.OrderDetailComponent) },
  { path: '**', redirectTo: '' }
];
