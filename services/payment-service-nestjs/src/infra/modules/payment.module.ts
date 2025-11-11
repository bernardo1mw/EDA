import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RepositoryModule } from './repository.module';
import { PaymentController } from '@/infra/controllers/payment.controller';
import { PaymentMessageHandler } from '@/infra/controllers/payment-message-handler.controller';
import { paymentProviders } from '@/infra/providers/payment.providers';
import { RawRmqConsumer } from '@/infra/messaging/raw-rmq-consumer';
import { StripeService } from '@/infra/stripe/stripe.service';
import appConfig from '@/core/config';

@Module({
  imports: [
    RepositoryModule,
    ConfigModule.forRoot({
      load: [appConfig],
    }),
  ],
  controllers: [PaymentController, PaymentMessageHandler],
  providers: [...paymentProviders, RawRmqConsumer, StripeService],
  exports: [...paymentProviders, RawRmqConsumer],
})
export class PaymentModule {}
