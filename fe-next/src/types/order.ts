export enum OrderStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export interface Order {
  id: string;
  customer_id: string;
  product_id: string;
  quantity: number;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderCreateRequest {
  customer_id: string;
  product_id: string;
  quantity: number;
  total_amount: number;
}

export interface PaymentEvent {
  id: string;
  payment_id: string;
  order_id: string;
  amount: number;
  status: string;
  processed_at: string;
  created_at: string;
}

