import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';

const BASE = 'http://localhost:8080';
const PAYMENT_BASE = 'http://localhost:3001';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listAllOrders calls correct URL', () => {
    service.listAllOrders(10, 0).subscribe();
    const req = httpMock.expectOne(`${BASE}/orders/?limit=10&offset=0`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getOrderById calls correct URL with ID', () => {
    const id = 'order-123';
    service.getOrderById(id).subscribe();
    const req = httpMock.expectOne(`${BASE}/orders/${id}`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('createOrder posts to correct URL', () => {
    const body = { customer_id: 'c1', product_id: 'p1', quantity: 1, total_amount: 10 };
    service.createOrder(body).subscribe();
    const req = httpMock.expectOne(`${BASE}/orders/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('listCustomers calls correct URL', () => {
    service.listCustomers(100, 0).subscribe();
    const req = httpMock.expectOne(`${BASE}/customers/?limit=100&offset=0`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getCustomerById calls correct URL', () => {
    const id = 'cust-456';
    service.getCustomerById(id).subscribe();
    const req = httpMock.expectOne(`${BASE}/customers/${id}`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('listProducts calls correct URL', () => {
    service.listProducts(50, 0).subscribe();
    const req = httpMock.expectOne(`${BASE}/products/?limit=50&offset=0`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getProductById calls correct URL', () => {
    const id = 'prod-789';
    service.getProductById(id).subscribe();
    const req = httpMock.expectOne(`${BASE}/products/${id}`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('createPaymentIntent posts to correct URL', () => {
    service.createPaymentIntent('ord-1', 100, 'card').subscribe();
    const req = httpMock.expectOne(`${PAYMENT_BASE}/payments/process`);
    expect(req.request.method).toBe('POST');
    req.flush({ clientSecret: 'secret', paymentIntentId: 'pi_1' });
  });
});
