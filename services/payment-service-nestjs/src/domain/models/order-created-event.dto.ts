export interface OrderCreatedEventData {
  orderId: string;
  customerId: string;
  productId: string;
  quantity: number;
  totalAmount: number;
  createdAt: string;
  traceId?: string;
  spanId?: string;
}
