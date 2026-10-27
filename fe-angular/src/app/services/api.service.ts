import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Order, OrderCreateRequest } from '../models/order.model';
import { Customer, CustomerCreateRequest } from '../models/customer.model';
import { Product, ProductCreateRequest } from '../models/product.model';
import { PaymentIntentResponse, ConfirmPaymentResponse } from '../models/payment.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiBaseUrl = environment.apiUrl || 'http://localhost:8080';
  private paymentApiUrl = environment.paymentApiUrl || 'http://localhost:3001';

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = error.error?.detail || error.error?.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }

  // Orders
  createOrder(data: OrderCreateRequest): Observable<Order> {
    return this.http.post<Order>(`${this.apiBaseUrl}/orders/`, data).pipe(
      catchError(this.handleError)
    );
  }

  getOrderById(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiBaseUrl}/orders/${orderId}`).pipe(
      catchError(this.handleError)
    );
  }

  getOrdersByCustomer(customerId: string, limit: number = 100, offset: number = 0): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiBaseUrl}/orders/customer/${customerId}?limit=${limit}&offset=${offset}`).pipe(
      catchError(this.handleError)
    );
  }

  listAllOrders(limit: number = 100, offset: number = 0): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiBaseUrl}/orders/?limit=${limit}&offset=${offset}`).pipe(
      catchError(this.handleError)
    );
  }

  // Products
  createProduct(data: ProductCreateRequest): Observable<Product> {
    return this.http.post<Product>(`${this.apiBaseUrl}/products/`, data).pipe(
      catchError(this.handleError)
    );
  }

  listProducts(limit: number = 100, offset: number = 0): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiBaseUrl}/products/?limit=${limit}&offset=${offset}`).pipe(
      catchError(this.handleError)
    );
  }

  getProductById(productId: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiBaseUrl}/products/${productId}`).pipe(
      catchError(this.handleError)
    );
  }

  updateProduct(productId: string, data: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.apiBaseUrl}/products/${productId}`, data).pipe(
      catchError(this.handleError)
    );
  }

  // Customers
  createCustomer(data: CustomerCreateRequest): Observable<Customer> {
    return this.http.post<Customer>(`${this.apiBaseUrl}/customers/`, data).pipe(
      catchError(this.handleError)
    );
  }

  listCustomers(limit: number = 100, offset: number = 0): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.apiBaseUrl}/customers/?limit=${limit}&offset=${offset}`).pipe(
      catchError(this.handleError)
    );
  }

  getCustomerById(customerId: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.apiBaseUrl}/customers/${customerId}`).pipe(
      catchError(this.handleError)
    );
  }

  updateCustomer(customerId: string, data: Partial<Customer>): Observable<Customer> {
    return this.http.put<Customer>(`${this.apiBaseUrl}/customers/${customerId}`, data).pipe(
      catchError(this.handleError)
    );
  }

  // Payments
  createPaymentIntent(orderId: string, amount: number, paymentMethod: string = 'card'): Observable<PaymentIntentResponse> {
    return this.http.post<PaymentIntentResponse>(`${this.paymentApiUrl}/payments/process`, {
      order_id: orderId,
      amount,
      payment_method: paymentMethod
    }).pipe(
      catchError(this.handleError)
    );
  }

  confirmPayment(paymentIntentId: string, paymentMethodId: string, orderId: string, returnUrl?: string): Observable<ConfirmPaymentResponse> {
    const body: Record<string, string> = {
      payment_intent_id: paymentIntentId,
      payment_method_id: paymentMethodId,
      order_id: orderId
    };
    if (returnUrl) {
      body['return_url'] = returnUrl;
    }
    return this.http.post<ConfirmPaymentResponse>(`${this.paymentApiUrl}/payments/confirm`, body).pipe(
      catchError(this.handleError)
    );
  }
}
