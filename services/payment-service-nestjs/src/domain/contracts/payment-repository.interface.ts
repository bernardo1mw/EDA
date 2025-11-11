import { PaymentEventEntity } from '../models/payment-event.entity';

export interface IPaymentRepository {
  save(paymentEvent: PaymentEventEntity): Promise<PaymentEventEntity>;
  findById(id: string): Promise<PaymentEventEntity | null>;
  findAll(): Promise<PaymentEventEntity[]>;
  findByOrderId(orderId: string): Promise<PaymentEventEntity[]>;
}

