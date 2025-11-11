import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';
import { ProductsComponent } from './components/products/products/products';
import { CustomersComponent } from './components/customers/customers/customers';
import { OrderDetailComponent } from './components/orders/order-detail/order-detail';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'products', component: ProductsComponent },
  { path: 'customers', component: CustomersComponent },
  { path: 'orders/:id', component: OrderDetailComponent },
  { path: '**', redirectTo: '' }
];
