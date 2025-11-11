import { Provider } from '@nestjs/common';
import { ProcessPaymentUseCase } from '../../app/usecases/process-payment.use-case';
import { PaymentService } from '../../app/usecases/payment.service';

export const paymentProviders: Provider[] = [
  ProcessPaymentUseCase,
  PaymentService,
];
