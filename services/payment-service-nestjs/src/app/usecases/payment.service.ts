import { Injectable, Inject } from '@nestjs/common';
import { ProcessPaymentUseCase } from './process-payment.use-case';
import { OrderCreatedEventDto } from '../../infra/controllers/dtos/order-created-event.dto';
import { PaymentEventEntity } from '../../domain/models/payment-event.entity';
import { IPaymentRepository } from '../../domain/contracts/payment-repository.interface';
import { StructuredLogger } from '../../core/logging';

@Injectable()
export class PaymentService {
  private readonly logger = new StructuredLogger('PaymentService');

  constructor(
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    @Inject('IPaymentRepository')
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async processOrderCreatedEvent(orderEvent: OrderCreatedEventDto): Promise<void> {
    this.logger.log(`Received order created event: ${orderEvent.orderId}`);
    
    try {
      await this.processPaymentUseCase.execute(orderEvent);
    } catch (error) {
      this.logger.error(`Failed to process order created event: ${orderEvent.orderId}`, error.stack);
      throw error;
    }
  }

  async findAll(): Promise<PaymentEventEntity[]> {
    this.logger.log('Getting all payments');
    return this.paymentRepository.findAll();
  }

  async findById(id: string): Promise<PaymentEventEntity | null> {
    this.logger.log(`Getting payment with id: ${id}`);
    return this.paymentRepository.findById(id);
  }
}

