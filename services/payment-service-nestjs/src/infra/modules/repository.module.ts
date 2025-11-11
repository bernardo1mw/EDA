import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEventEntity } from '../../domain/models/payment-event.entity';
import { OrderCreatedEventEntity } from '../../domain/models/order-created-event.entity';
import { repositoryProviders } from '@/infra/providers/repository.providers';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentEventEntity,
      OrderCreatedEventEntity,
    ]),
  ],
  providers: repositoryProviders,
  exports: repositoryProviders,
})
export class RepositoryModule {}
