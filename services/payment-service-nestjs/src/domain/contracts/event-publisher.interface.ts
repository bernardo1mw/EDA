import { PaymentEventData } from '../models/payment-event.dto';

export interface IEventPublisher {
  publishPaymentEvent(event: PaymentEventData): Promise<void>;
}
