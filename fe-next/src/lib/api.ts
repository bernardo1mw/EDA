import { Order, OrderCreateRequest } from "@/types/order";
import { Customer, CustomerCreateRequest, CustomerUpdateRequest } from "@/types/customer";
import { Product, ProductCreateRequest, ProductUpdateRequest } from "@/types/product";
import { OrderMetrics } from "@/types/metrics";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const PAYMENT_API_URL =
  process.env.NEXT_PUBLIC_PAYMENT_API_URL ?? "http://localhost:3001";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Request failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId: string;
  status: string;
}

export const apiClient = {
  // Orders
  listAllOrders(limit: number, offset: number): Promise<Order[]> {
    return request<Order[]>(
      `${API_URL}/orders/?limit=${limit}&offset=${offset}`
    );
  },

  getOrderById(id: string): Promise<Order> {
    return request<Order>(`${API_URL}/orders/${id}`);
  },

  getOrdersByCustomer(
    customerId: string,
    limit: number,
    offset: number
  ): Promise<Order[]> {
    return request<Order[]>(
      `${API_URL}/orders/customer/${customerId}?limit=${limit}&offset=${offset}`
    );
  },

  createOrder(data: OrderCreateRequest): Promise<Order> {
    return request<Order>(`${API_URL}/orders/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Products
  listProducts(limit: number, offset: number): Promise<Product[]> {
    return request<Product[]>(
      `${API_URL}/products/?limit=${limit}&offset=${offset}`
    );
  },

  getProductById(id: string): Promise<Product> {
    return request<Product>(`${API_URL}/products/${id}`);
  },

  createProduct(data: ProductCreateRequest): Promise<Product> {
    return request<Product>(`${API_URL}/products/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateProduct(id: string, data: ProductUpdateRequest): Promise<Product> {
    return request<Product>(`${API_URL}/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Customers
  listCustomers(limit: number, offset: number): Promise<Customer[]> {
    return request<Customer[]>(
      `${API_URL}/customers/?limit=${limit}&offset=${offset}`
    );
  },

  getCustomerById(id: string): Promise<Customer> {
    return request<Customer>(`${API_URL}/customers/${id}`);
  },

  createCustomer(data: CustomerCreateRequest): Promise<Customer> {
    return request<Customer>(`${API_URL}/customers/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateCustomer(id: string, data: CustomerUpdateRequest): Promise<Customer> {
    return request<Customer>(`${API_URL}/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Metrics
  getDailyMetrics(date: string): Promise<OrderMetrics> {
    return request<OrderMetrics>(
      `${PAYMENT_API_URL}/metrics/daily/${date}`
    );
  },

  // Payments
  createPaymentIntent(
    orderId: string,
    amount: number,
    paymentMethod: string
  ): Promise<PaymentIntentResponse> {
    return request<PaymentIntentResponse>(`${PAYMENT_API_URL}/payments/process`, {
      method: "POST",
      body: JSON.stringify({
        order_id: orderId,
        amount,
        payment_method: paymentMethod,
      }),
    });
  },

  confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string,
    orderId: string,
    returnUrl?: string
  ): Promise<PaymentResult> {
    return request<PaymentResult>(`${PAYMENT_API_URL}/payments/confirm`, {
      method: "POST",
      body: JSON.stringify({
        payment_intent_id: paymentIntentId,
        payment_method_id: paymentMethodId,
        order_id: orderId,
        return_url: returnUrl,
      }),
    });
  },
};
