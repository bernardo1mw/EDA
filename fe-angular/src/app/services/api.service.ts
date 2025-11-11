import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

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
  createOrder(data: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/orders/`, data).pipe(
      catchError(this.handleError)
    );
  }

  getOrderById(orderId: string): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/orders/${orderId}`).pipe(
      catchError(this.handleError)
    );
  }

  getOrdersByCustomer(customerId: string, limit: number = 100, offset: number = 0): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBaseUrl}/orders/customer/${customerId}?limit=${limit}&offset=${offset}`).pipe(
      catchError(this.handleError)
    );
  }

  listAllOrders(limit: number = 100, offset: number = 0): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBaseUrl}/orders/?limit=${limit}&offset=${offset}`).pipe(
      catchError(this.handleError)
    );
  }

  // Products
  createProduct(data: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/products/`, data).pipe(
      catchError(this.handleError)
    );
  }

  listProducts(limit: number = 100, offset: number = 0): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBaseUrl}/products/?limit=${limit}&offset=${offset}`).pipe(
      catchError(this.handleError)
    );
  }

  getProductById(productId: string): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/products/${productId}`).pipe(
      catchError(this.handleError)
    );
  }

  updateProduct(productId: string, data: any): Observable<any> {
    return this.http.put(`${this.apiBaseUrl}/products/${productId}`, data).pipe(
      catchError(this.handleError)
    );
  }

  // Customers
  createCustomer(data: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/customers/`, data).pipe(
      catchError(this.handleError)
    );
  }

  listCustomers(limit: number = 100, offset: number = 0): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBaseUrl}/customers/?limit=${limit}&offset=${offset}`).pipe(
      catchError(this.handleError)
    );
  }

  getCustomerById(customerId: string): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/customers/${customerId}`).pipe(
      catchError(this.handleError)
    );
  }

  updateCustomer(customerId: string, data: any): Observable<any> {
    return this.http.put(`${this.apiBaseUrl}/customers/${customerId}`, data).pipe(
      catchError(this.handleError)
    );
  }

  // Payments
  createPaymentIntent(orderId: string, amount: number, paymentMethod: string = 'card'): Observable<any> {
    return this.http.post(`${this.paymentApiUrl}/payments/process`, {
      orderId,
      amount,
      paymentMethod
    }).pipe(
      catchError(this.handleError)
    );
  }

  confirmPayment(paymentIntentId: string, paymentMethodId: string, orderId: string, returnUrl?: string): Observable<any> {
    const body: any = {
      paymentIntentId,
      paymentMethodId,
      orderId
    };
    if (returnUrl) {
      body.returnUrl = returnUrl;
    }
    return this.http.post(`${this.paymentApiUrl}/payments/confirm`, body).pipe(
      catchError(this.handleError)
    );
  }
}

