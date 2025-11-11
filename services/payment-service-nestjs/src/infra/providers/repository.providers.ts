import { Provider } from '@nestjs/common';
import { PaymentRepositoryAdapter } from '../database/repository/payment.repository.adapter';
import { RabbitMQEventPublisher } from '../messaging/rabbitmq-event-publisher';

export const repositoryProviders: Provider[] = [
  PaymentRepositoryAdapter,
  {
    provide: 'IPaymentRepository',
    useClass: PaymentRepositoryAdapter,
  },
  {
    provide: 'IEventPublisher',
    useClass: RabbitMQEventPublisher,
  },
];
