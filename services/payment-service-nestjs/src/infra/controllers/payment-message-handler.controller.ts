import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PaymentService } from '../../app/usecases/payment.service';
import { OrderCreatedEventDto } from './dtos/order-created-event.dto';
import { StructuredLogger } from '../../core/logging';

@Controller()
export class PaymentMessageHandler {
  private readonly logger = new StructuredLogger('PaymentMessageHandler');

  constructor(private readonly paymentService: PaymentService) {}

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() orderEvent: OrderCreatedEventDto): Promise<void> {
    this.logger.log(`Received order.created event: ${orderEvent.orderId}`);
    
    try {
      await this.paymentService.processOrderCreatedEvent(orderEvent);
    } catch (error) {
      this.logger.error(`Failed to handle order.created event: ${orderEvent.orderId}`, error.stack);
      throw error;
    }
  }
}
