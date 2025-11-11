import { Injectable, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { OrderCreatedEventDto } from '../../infra/controllers/dtos/order-created-event.dto';
import { PaymentEventDto } from '../../infra/controllers/dtos/payment-event.dto';
import { ProcessPaymentDto } from '../../infra/controllers/dtos/process-payment.dto';
import { PaymentEventEntity } from '../../domain/models/payment-event.entity';
import { IPaymentRepository } from '../../domain/contracts/payment-repository.interface';
import { IEventPublisher } from '../../domain/contracts/event-publisher.interface';
import { StructuredLogger } from '../../core/logging';
import { StripeService } from '../../infra/stripe/stripe.service';

@Injectable()
export class ProcessPaymentUseCase {
  private readonly logger = new StructuredLogger('ProcessPaymentUseCase');

  constructor(
    @Inject('IPaymentRepository')
    private readonly paymentRepository: IPaymentRepository,
    @Inject('IEventPublisher')
    private readonly eventPublisher: IEventPublisher,
    private readonly stripeService: StripeService,
  ) {}

  async execute(orderEvent: OrderCreatedEventDto): Promise<void> {
    this.logger.log(`Processing payment for order: ${orderEvent.orderId}`);

    try {
      // Process payment with Stripe
      const paymentIntent = await this.stripeService.createPaymentIntent(
        orderEvent.totalAmount,
        'usd',
        {
          order_id: orderEvent.orderId,
          customer_id: orderEvent.customerId || '',
          product_id: orderEvent.productId || '',
        },
      );

      // Map Stripe status to our payment status
      const paymentStatus = this.stripeService.mapStripeStatusToPaymentStatus(paymentIntent.status);
      
      const paymentId = paymentIntent.id;
      
      const paymentEvent: PaymentEventDto = {
        paymentId,
        orderId: orderEvent.orderId,
        amount: orderEvent.totalAmount,
        status: paymentStatus,
        processedAt: new Date().toISOString(),
        traceId: orderEvent.traceId,
        spanId: orderEvent.spanId,
      };

      // Save payment event to database
      const paymentEntity = this.mapDtoToEntity(paymentEvent);
      await this.paymentRepository.save(paymentEntity);

      // Publish payment event
      await this.eventPublisher.publishPaymentEvent(paymentEvent);

      this.logger.log(`Payment processed successfully - paymentId: ${paymentId}, orderId: ${orderEvent.orderId}, amount: ${orderEvent.totalAmount}, status: ${paymentStatus}`);

    } catch (error) {
      this.logger.error(`Failed to process payment for order: ${orderEvent.orderId}`, error.stack, 'ProcessPaymentUseCase');
      throw error;
    }
  }

  async processDirectPayment(paymentData: ProcessPaymentDto): Promise<{ clientSecret: string; paymentIntentId: string }> {
    this.logger.log(`Creating payment intent for order: ${paymentData.orderId}`);

    try {
      // Create payment intent with Stripe (not confirmed yet)
      const paymentIntent = await this.stripeService.createPaymentIntent(
        paymentData.amount,
        'usd',
        {
          order_id: paymentData.orderId,
        },
      );

      this.logger.log(`Payment intent created - paymentIntentId: ${paymentIntent.id}, orderId: ${paymentData.orderId}, amount: ${paymentData.amount}`);

      // Return client_secret for frontend to use with Stripe Elements
      return {
        clientSecret: paymentIntent.client_secret || '',
        paymentIntentId: paymentIntent.id,
      };

    } catch (error) {
      this.logger.error(`Failed to create payment intent for order: ${paymentData.orderId}`, error.stack, 'ProcessPaymentUseCase');
      throw error;
    }
  }

  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string,
    orderId: string,
    returnUrl?: string,
  ): Promise<PaymentEventDto> {
    this.logger.log(`Confirming payment - paymentIntentId: ${paymentIntentId}, orderId: ${orderId}`);

    try {
      // Confirm payment intent with payment method from frontend
      const confirmParams: any = {
        payment_method: paymentMethodId,
      };

      // Add return_url if provided (required for redirect-based payment methods like 3D Secure)
      if (returnUrl) {
        confirmParams.return_url = returnUrl;
      }

      const confirmedPaymentIntent = await this.stripeService.confirmPaymentIntent(
        paymentIntentId,
        confirmParams,
      );

      // Get payment intent details to get amount
      const paymentIntent = await this.stripeService.retrievePaymentIntent(paymentIntentId);
      const amount = paymentIntent.amount / 100; // Convert from cents to dollars

      // Map Stripe status to our payment status
      const paymentStatus = this.stripeService.mapStripeStatusToPaymentStatus(confirmedPaymentIntent.status);
      
      const paymentEvent: PaymentEventDto = {
        paymentId: confirmedPaymentIntent.id,
        orderId: orderId,
        amount: amount,
        status: paymentStatus,
        processedAt: new Date().toISOString(),
      };

      // Save payment event to database
      const paymentEntity = this.mapDtoToEntity(paymentEvent);
      await this.paymentRepository.save(paymentEntity);

      // Publish payment event only if authorized
      if (paymentStatus === 'authorized') {
        await this.eventPublisher.publishPaymentEvent(paymentEvent);
      }

      this.logger.log(`Payment confirmed successfully - paymentId: ${confirmedPaymentIntent.id}, orderId: ${orderId}, amount: ${amount}, status: ${paymentStatus}`);

      return paymentEvent;

    } catch (error) {
      this.logger.error(`Failed to confirm payment - paymentIntentId: ${paymentIntentId}`, error.stack, 'ProcessPaymentUseCase');
      throw error;
    }
  }


  private mapDtoToEntity(dto: PaymentEventDto): PaymentEventEntity {
    const entity = new PaymentEventEntity();
    entity.paymentId = dto.paymentId;
    entity.orderId = dto.orderId;
    entity.amount = dto.amount;
    entity.status = dto.status;
    entity.traceId = dto.traceId;
    entity.spanId = dto.spanId;
    entity.processedAt = new Date(dto.processedAt);
    return entity;
  }
}
