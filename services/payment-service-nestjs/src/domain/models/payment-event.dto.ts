import { PaymentStatus } from './payment-status.enum';

export interface PaymentEventData {
  paymentId: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  processedAt: string;
  traceId?: string;
  spanId?: string;
}
