import { PaymentEventDto } from '../models/payment-event.dto';

export interface IEventPublisher {
  publishPaymentEvent(event: PaymentEventDto): Promise<void>;
}

